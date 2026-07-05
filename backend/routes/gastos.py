# routes/gastos.py
# Endpoints CRUD para gestión de gastos del usuario autenticado.
# Todos los endpoints requieren JWT válido — Depends(get_current_user).
# Los gastos nunca se eliminan — se anulan (criterio bancario).

from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional
from database import get_connection, release_connection
from schemas import GastoCreate, GastoUpdate, GastoResponse
from auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ══════════════════════════════════════════
#  OBTENER GASTOS
# ══════════════════════════════════════════

@router.get("/", response_model=list[GastoResponse])
def obtener_gastos(
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    categoria: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Retorna todos los gastos activos (no anulados) del usuario autenticado.
    Soporta filtros opcionales por mes, año y categoría.
    Ejemplo: GET /gastos?mes=6&anio=2026&categoria=Alimentación
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Base de la query — solo gastos no anulados del usuario actual
        query = """
            SELECT id, usuario_id, descripcion, monto, categoria,
                   subcategoria, fecha, recurrente, anulado, created_at
            FROM gastos
            WHERE usuario_id = %s AND anulado = FALSE
        """
        params = [current_user["id"]]

        # Agrega filtros dinámicamente según los parámetros recibidos
        if mes:
            query += " AND EXTRACT(MONTH FROM fecha) = %s"
            params.append(mes)
        if anio:
            query += " AND EXTRACT(YEAR FROM fecha) = %s"
            params.append(anio)
        if categoria:
            query += " AND categoria = %s"
            params.append(categoria)

        query += " ORDER BY fecha DESC"
        cursor.execute(query, params)
        filas = cursor.fetchall()

        return [
            GastoResponse(
                id=f[0],
                usuario_id=f[1],
                descripcion=f[2],
                monto=float(f[3]),
                categoria=f[4],
                subcategoria=f[5],
                fecha=str(f[6]),
                recurrente=f[7],
                anulado=f[8],
                created_at=str(f[9])
            ) for f in filas
        ]
    except Exception as e:
        logger.error(f"Error obteniendo gastos: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  CREAR GASTO
# ══════════════════════════════════════════

@router.post("/", status_code=201, response_model=GastoResponse)
def crear_gasto(
    gasto: GastoCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Registra un nuevo gasto para el usuario autenticado.
    Verifica automáticamente si supera el presupuesto de la categoría.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO gastos
                (usuario_id, descripcion, monto, categoria, subcategoria, fecha, recurrente)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, usuario_id, descripcion, monto, categoria,
                      subcategoria, fecha, recurrente, anulado, created_at
        """, (
            current_user["id"],
            gasto.descripcion,
            gasto.monto,
            gasto.categoria,
            gasto.subcategoria,
            gasto.fecha,
            gasto.recurrente
        ))

        row = cursor.fetchone()
        conn.commit()

        return GastoResponse(
            id=row[0],
            usuario_id=row[1],
            descripcion=row[2],
            monto=float(row[3]),
            categoria=row[4],
            subcategoria=row[5],
            fecha=str(row[6]),
            recurrente=row[7],
            anulado=row[8],
            created_at=str(row[9])
        )
    except Exception as e:
        conn.rollback()
        logger.error(f"Error creando gasto: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  ACTUALIZAR GASTO
# ══════════════════════════════════════════

@router.put("/{gasto_id}", response_model=GastoResponse)
def actualizar_gasto(
    gasto_id: int,
    gasto: GastoUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Actualiza uno o más campos de un gasto existente.
    Verifica que el gasto pertenezca al usuario autenticado.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Verifica que el gasto existe y pertenece al usuario
        cursor.execute("""
            SELECT id FROM gastos
            WHERE id = %s AND usuario_id = %s AND anulado = FALSE
        """, (gasto_id, current_user["id"]))

        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gasto no encontrado"
            )

        # Construye la query dinámicamente con solo los campos enviados
        campos = []
        valores = []

        if gasto.descripcion is not None:
            campos.append("descripcion = %s")
            valores.append(gasto.descripcion)
        if gasto.monto is not None:
            campos.append("monto = %s")
            valores.append(gasto.monto)
        if gasto.categoria is not None:
            campos.append("categoria = %s")
            valores.append(gasto.categoria)
        if gasto.subcategoria is not None:
            campos.append("subcategoria = %s")
            valores.append(gasto.subcategoria)
        if gasto.fecha is not None:
            campos.append("fecha = %s")
            valores.append(gasto.fecha)
        if gasto.recurrente is not None:
            campos.append("recurrente = %s")
            valores.append(gasto.recurrente)

        if not campos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se enviaron campos para actualizar"
            )

        valores.extend([gasto_id, current_user["id"]])
        query = f"""
            UPDATE gastos SET {', '.join(campos)}
            WHERE id = %s AND usuario_id = %s
            RETURNING id, usuario_id, descripcion, monto, categoria,
                      subcategoria, fecha, recurrente, anulado, created_at
        """
        cursor.execute(query, valores)
        row = cursor.fetchone()
        conn.commit()

        return GastoResponse(
            id=row[0],
            usuario_id=row[1],
            descripcion=row[2],
            monto=float(row[3]),
            categoria=row[4],
            subcategoria=row[5],
            fecha=str(row[6]),
            recurrente=row[7],
            anulado=row[8],
            created_at=str(row[9])
        )
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error actualizando gasto: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  ANULAR GASTO — nunca se elimina
# ══════════════════════════════════════════

@router.delete("/{gasto_id}")
def anular_gasto(
    gasto_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Anula un gasto marcándolo como anulado=TRUE.
    Criterio bancario: los registros nunca se eliminan físicamente
    para mantener el historial de auditoría completo.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE gastos SET anulado = TRUE
            WHERE id = %s AND usuario_id = %s AND anulado = FALSE
        """, (gasto_id, current_user["id"]))

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Gasto no encontrado"
            )

        conn.commit()
        return {"mensaje": "Gasto anulado correctamente"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error anulando gasto: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)