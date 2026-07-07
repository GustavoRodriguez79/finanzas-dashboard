# routes/presupuesto.py
# Endpoints para gestión de presupuestos mensuales por categoría.
# Incluye lógica de alertas cuando el gasto supera el 80% del límite.
# Todos los endpoints requieren JWT válido — Depends(get_current_user).

from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional
from database import get_connection, release_connection
from schemas import PresupuestoCreate, PresupuestoResponse
from auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


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
                alerta=alerta
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
            alerta=alerta
        )
    except Exception as e:
        conn.rollback()
        logger.error(f"Error creando presupuesto: {e}")
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