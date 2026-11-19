# routes/presupuesto.py
# Endpoints para gestión de presupuestos mensuales por categoría.
# Incluye lógica de alertas cuando el gasto supera el 80% del límite.
# Todos los endpoints requieren JWT válido — Depends(get_current_user).

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import Optional
from database import get_connection, release_connection
from schemas import PresupuestoCreate, PresupuestoResponse
from auth import get_current_user
from datetime import date
import calendar
import logging

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
    categoria: str
    monto_limite: float
    gasto_actual: float
    porcentaje: float
    alerta: bool = True      # siempre True: la lista ya viene filtrada al 80%
    superado: bool           # True si llegó al 100% (False = entre 80% y 99%)


# Se declara antes de DELETE /{presupuesto_id} para que no haya colisión de rutas
@router.get("/alerta", response_model=list[AlertaPresupuesto])
def obtener_alertas(
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Retorna solo las categorías del período cuyo gasto real llegó al 80% o más
    de su límite, ordenadas de mayor a menor porcentaje.
    Los gastos anulados no cuentan. Usa mes y año actuales si no se especifican.
    Ejemplo: GET /presupuesto/alerta?mes=6&anio=2026
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        hoy = date.today()
        mes = mes or hoy.month
        anio = anio or hoy.year

        # Una sola query: LEFT JOIN para no perder presupuestos sin gastos,
        # y HAVING para filtrar al 80% (no se puede usar WHERE sobre un SUM).
        # monto_limite > 0 evita dividir por cero al ordenar.
        cursor.execute("""
            SELECT p.categoria, p.monto_limite,
                   COALESCE(SUM(g.monto), 0) AS gastado
            FROM presupuestos p
            LEFT JOIN gastos g ON
                g.usuario_id = p.usuario_id
                AND g.categoria = p.categoria
                AND EXTRACT(MONTH FROM g.fecha) = p.mes
                AND EXTRACT(YEAR FROM g.fecha) = p.anio
                AND g.anulado = FALSE
            WHERE p.usuario_id = %s AND p.mes = %s AND p.anio = %s
            GROUP BY p.categoria, p.monto_limite
            HAVING p.monto_limite > 0
               AND COALESCE(SUM(g.monto), 0) >= p.monto_limite * 0.8
            ORDER BY COALESCE(SUM(g.monto), 0) / p.monto_limite DESC
        """, (current_user["id"], mes, anio))

        resultado = []
        for categoria, limite, gastado in cursor.fetchall():
            limite = float(limite)
            gastado = float(gastado)
            porcentaje = gastado / limite * 100
            resultado.append(AlertaPresupuesto(
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