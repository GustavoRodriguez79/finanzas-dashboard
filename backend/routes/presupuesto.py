# routes/presupuesto.py
# Endpoints para gestión de presupuestos mensuales por categoría.
# Incluye lógica de alertas cuando el gasto supera el 80% del límite.
# Todos los endpoints requieren JWT válido — Depends(get_current_user).

from fastapi import APIRouter, HTTPException, status, Depends, Header
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from database import get_connection, release_connection
from schemas import PresupuestoCreate, PresupuestoResponse
from auth import get_current_user
from datetime import date
import calendar
import logging
import os
import secrets

logger = logging.getLogger(__name__)
router = APIRouter()


def calcular_proyeccion(gastado: float, mes: int, anio: int) -> Optional[float]:
    """
    Proyecta el gasto de fin de mes: (gastado / días_transcurridos) * días_del_mes.
    Solo tiene sentido para el mes en curso: en meses pasados el gasto ya es
    definitivo y en los futuros no hay ritmo que extrapolar, así que devuelve None.
    Usa los días reales del mes (28-31), no una aproximación de 30.
    """
    hoy = date.today()
    if mes != hoy.month or anio != hoy.year:
        return None
    dias_del_mes = calendar.monthrange(anio, mes)[1]
    return round(gastado / hoy.day * dias_del_mes, 2)


# ══════════════════════════════════════════
#  OBTENER PRESUPUESTOS
# ══════════════════════════════════════════

@router.get("/", response_model=list[PresupuestoResponse])
def obtener_presupuestos(
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Retorna los presupuestos del usuario con el estado actual de cada uno.
    Para cada categoría calcula: monto gastado, % usado y si hay alerta.
    Alerta se activa cuando el gasto supera el 80% del límite definido.
    Ejemplo: GET /presupuesto?mes=6&anio=2026
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Usa mes y año actuales si no se especifican
        from datetime import date
        hoy = date.today()
        mes = mes or hoy.month
        anio = anio or hoy.year

        # Obtiene presupuestos del período
        cursor.execute("""
            SELECT id, categoria, monto_limite, mes, anio
            FROM presupuestos
            WHERE usuario_id = %s AND mes = %s AND anio = %s
            ORDER BY categoria
        """, (current_user["id"], mes, anio))

        presupuestos = cursor.fetchall()
        resultado = []

        for p in presupuestos:
            # Para cada presupuesto calcula cuánto se gastó en esa categoría
            cursor.execute("""
                SELECT COALESCE(SUM(monto), 0)
                FROM gastos
                WHERE usuario_id = %s
                AND categoria = %s
                AND EXTRACT(MONTH FROM fecha) = %s
                AND EXTRACT(YEAR FROM fecha) = %s
                AND anulado = FALSE
            """, (current_user["id"], p[1], mes, anio))

            gastado = float(cursor.fetchone()[0])
            limite = float(p[2])

            # Calcula porcentaje y determina si hay alerta
            porcentaje = (gastado / limite * 100) if limite > 0 else 0
            alerta = porcentaje >= 80  # Alerta al 80% — criterio bancario preventivo

            resultado.append(PresupuestoResponse(
                id=p[0],
                categoria=p[1],
                monto_limite=limite,
                mes=p[3],
                anio=p[4],
                gastado=gastado,
                porcentaje=round(porcentaje, 1),
                alerta=alerta,
                superado=porcentaje >= 100,
                proyeccion=calcular_proyeccion(gastado, p[3], p[4])
            ))

        return resultado

    except Exception as e:
        logger.error(f"Error obteniendo presupuestos: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  CREAR O ACTUALIZAR PRESUPUESTO
# ══════════════════════════════════════════

@router.post("/", status_code=201, response_model=PresupuestoResponse)
def crear_presupuesto(
    presupuesto: PresupuestoCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Crea un presupuesto mensual para una categoría.
    Si ya existe un presupuesto para esa categoría/mes/año lo actualiza.
    Usa INSERT ... ON CONFLICT para manejar duplicados elegantemente.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # ON CONFLICT actualiza el límite si ya existe ese presupuesto
        cursor.execute("""
            INSERT INTO presupuestos (usuario_id, categoria, monto_limite, mes, anio)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (usuario_id, categoria, mes, anio)
            DO UPDATE SET monto_limite = EXCLUDED.monto_limite
            RETURNING id, categoria, monto_limite, mes, anio
        """, (
            current_user["id"],
            presupuesto.categoria,
            presupuesto.monto_limite,
            presupuesto.mes,
            presupuesto.anio
        ))

        row = cursor.fetchone()
        conn.commit()

        # Calcula el estado actual del presupuesto recién creado
        cursor.execute("""
            SELECT COALESCE(SUM(monto), 0)
            FROM gastos
            WHERE usuario_id = %s
            AND categoria = %s
            AND EXTRACT(MONTH FROM fecha) = %s
            AND EXTRACT(YEAR FROM fecha) = %s
            AND anulado = FALSE
        """, (current_user["id"], row[1], row[3], row[4]))

        gastado = float(cursor.fetchone()[0])
        limite = float(row[2])
        porcentaje = (gastado / limite * 100) if limite > 0 else 0
        alerta = porcentaje >= 80

        return PresupuestoResponse(
            id=row[0],
            categoria=row[1],
            monto_limite=limite,
            mes=row[3],
            anio=row[4],
            gastado=gastado,
            porcentaje=round(porcentaje, 1),
            alerta=alerta,
            superado=porcentaje >= 100,
            proyeccion=calcular_proyeccion(gastado, row[3], row[4])
        )
    except Exception as e:
        conn.rollback()
        logger.error(f"Error creando presupuesto: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  ALERTAS DE PRESUPUESTO
# ══════════════════════════════════════════

class AlertaPresupuesto(BaseModel):
    """Categoría cuyo gasto llegó al 80% o más de su límite mensual."""
    usuario_id: int          # n8n lo necesita para saber de quién es cada alerta
    email: str               # destinatario del aviso
    categoria: str
    monto_limite: float
    gasto_actual: float
    porcentaje: float
    alerta: bool = True      # siempre True: la lista ya viene filtrada al 80%
    superado: bool           # True si llegó al 100% (False = entre 80% y 99%)


# auto_error=False: si falta el header Authorization no responde 403 de inmediato,
# así se puede probar la API Key como alternativa.
bearer_opcional = HTTPBearer(auto_error=False)


def autenticar_alertas(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_opcional),
    x_api_key: Optional[str] = Header(default=None)
) -> Optional[dict]:
    """
    Autentica /alerta por JWT o por API Key (n8n).
    - Si viene Authorization: Bearer → valida el JWT y devuelve el usuario.
    - Si no, y viene X-API-Key válida → devuelve None (acceso a todos los usuarios).
    - En cualquier otro caso → 401.
    """
    if credentials:
        return get_current_user(credentials)

    clave_esperada = os.getenv("N8N_API_KEY")
    # Si la variable no está definida el modo API Key queda deshabilitado:
    # evita que un header vacío coincida con una clave vacía.
    # compare_digest en bytes: tiempo constante y no falla con caracteres no ASCII.
    if (
        clave_esperada
        and x_api_key
        and secrets.compare_digest(x_api_key.encode(), clave_esperada.encode())
    ):
        return None

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Autenticación requerida: token JWT o API Key válida",
        headers={"WWW-Authenticate": "Bearer"}
    )


# Se declara antes de DELETE /{presupuesto_id} para que no haya colisión de rutas
@router.get("/alerta", response_model=list[AlertaPresupuesto])
def obtener_alertas(
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    usuario: Optional[dict] = Depends(autenticar_alertas)
):
    """
    Retorna solo las categorías del período cuyo gasto real llegó al 80% o más
    de su límite, ordenadas de mayor a menor porcentaje.
    Con JWT devuelve las del usuario autenticado; con X-API-Key (n8n), las de
    todos los usuarios activos. Los gastos anulados no cuentan.
    Usa mes y año actuales si no se especifican.
    Ejemplo: GET /presupuesto/alerta?mes=6&anio=2026
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        hoy = date.today()
        mes = mes or hoy.month
        anio = anio or hoy.year

        params = [mes, anio]
        filtro_usuario = ""
        if usuario is not None:
            # Modo JWT: solo los presupuestos del usuario autenticado
            filtro_usuario = "AND p.usuario_id = %s"
            params.append(usuario["id"])

        # Una sola query: LEFT JOIN para no perder presupuestos sin gastos,
        # y HAVING para filtrar al 80% (no se puede usar WHERE sobre un SUM).
        # monto_limite > 0 evita dividir por cero al ordenar.
        # u.activo = TRUE: en modo n8n no se avisa a cuentas desactivadas.
        cursor.execute(f"""
            SELECT p.usuario_id, u.email, p.categoria, p.monto_limite,
                   COALESCE(SUM(g.monto), 0) AS gastado
            FROM presupuestos p
            JOIN usuarios u ON u.id = p.usuario_id
            LEFT JOIN gastos g ON
                g.usuario_id = p.usuario_id
                AND g.categoria = p.categoria
                AND EXTRACT(MONTH FROM g.fecha) = p.mes
                AND EXTRACT(YEAR FROM g.fecha) = p.anio
                AND g.anulado = FALSE
            WHERE p.mes = %s AND p.anio = %s AND u.activo = TRUE
                {filtro_usuario}
            GROUP BY p.usuario_id, u.email, p.categoria, p.monto_limite
            HAVING p.monto_limite > 0
               AND COALESCE(SUM(g.monto), 0) >= p.monto_limite * 0.8
            ORDER BY COALESCE(SUM(g.monto), 0) / p.monto_limite DESC
        """, params)

        resultado = []
        for usuario_id, email, categoria, limite, gastado in cursor.fetchall():
            limite = float(limite)
            gastado = float(gastado)
            porcentaje = gastado / limite * 100
            resultado.append(AlertaPresupuesto(
                usuario_id=usuario_id,
                email=email,
                categoria=categoria,
                monto_limite=limite,
                gasto_actual=gastado,
                porcentaje=round(porcentaje, 1),
                superado=porcentaje >= 100
            ))

        return resultado

    except Exception as e:
        logger.error(f"Error obteniendo alertas de presupuesto: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  ELIMINAR PRESUPUESTO
# ══════════════════════════════════════════

@router.delete("/{presupuesto_id}")
def eliminar_presupuesto(
    presupuesto_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Elimina un presupuesto mensual.
    Verifica que pertenezca al usuario autenticado.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            DELETE FROM presupuestos
            WHERE id = %s AND usuario_id = %s
        """, (presupuesto_id, current_user["id"]))

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Presupuesto no encontrado"
            )

        conn.commit()
        return {"mensaje": "Presupuesto eliminado correctamente"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error eliminando presupuesto: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)