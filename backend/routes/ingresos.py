# routes/ingresos.py
# Endpoints CRUD para gestión de ingresos del usuario autenticado.
# Todos los endpoints requieren JWT válido — Depends(get_current_user).

from fastapi import APIRouter, HTTPException, status, Depends
from typing import Optional
from database import get_connection, release_connection
from schemas import IngresoCreate, IngresoUpdate, IngresoResponse
from auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ══════════════════════════════════════════
#  OBTENER INGRESOS
# ══════════════════════════════════════════

@router.get("/", response_model=list[IngresoResponse])
def obtener_ingresos(
    mes: Optional[int] = None,
    anio: Optional[int] = None,
    categoria: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Retorna todos los ingresos del usuario autenticado.
    Soporta filtros opcionales por mes, año y categoría.
    Ejemplo: GET /ingresos?mes=6&anio=2026&categoria=Sueldo
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        query = """
            SELECT id, usuario_id, descripcion, monto, categoria,
                   fecha, recurrente, created_at
            FROM ingresos
            WHERE usuario_id = %s
        """
        params = [current_user["id"]]

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
            IngresoResponse(
                id=f[0],
                usuario_id=f[1],
                descripcion=f[2],
                monto=float(f[3]),
                categoria=f[4],
                fecha=str(f[5]),
                recurrente=f[6],
                created_at=str(f[7])
            ) for f in filas
        ]
    except Exception as e:
        logger.error(f"Error obteniendo ingresos: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  CREAR INGRESO
# ══════════════════════════════════════════

@router.post("/", status_code=201, response_model=IngresoResponse)
def crear_ingreso(
    ingreso: IngresoCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Registra un nuevo ingreso para el usuario autenticado.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO ingresos
                (usuario_id, descripcion, monto, categoria, fecha, recurrente)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, usuario_id, descripcion, monto, categoria,
                      fecha, recurrente, created_at
        """, (
            current_user["id"],
            ingreso.descripcion,
            ingreso.monto,
            ingreso.categoria,
            ingreso.fecha,
            ingreso.recurrente
        ))

        row = cursor.fetchone()
        conn.commit()

        return IngresoResponse(
            id=row[0],
            usuario_id=row[1],
            descripcion=row[2],
            monto=float(row[3]),
            categoria=row[4],
            fecha=str(row[5]),
            recurrente=row[6],
            created_at=str(row[7])
        )
    except Exception as e:
        conn.rollback()
        logger.error(f"Error creando ingreso: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  ACTUALIZAR INGRESO
# ══════════════════════════════════════════

@router.put("/{ingreso_id}", response_model=IngresoResponse)
def actualizar_ingreso(
    ingreso_id: int,
    ingreso: IngresoUpdate,
    current_user: dict = Depends(get_current_user)
):
    """
    Actualiza uno o más campos de un ingreso existente.
    Verifica que el ingreso pertenezca al usuario autenticado.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Verifica que el ingreso existe y pertenece al usuario
        cursor.execute("""
            SELECT id FROM ingresos
            WHERE id = %s AND usuario_id = %s
        """, (ingreso_id, current_user["id"]))

        if not cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ingreso no encontrado"
            )

        # Construye la query dinámicamente
        campos = []
        valores = []

        if ingreso.descripcion is not None:
            campos.append("descripcion = %s")
            valores.append(ingreso.descripcion)
        if ingreso.monto is not None:
            campos.append("monto = %s")
            valores.append(ingreso.monto)
        if ingreso.categoria is not None:
            campos.append("categoria = %s")
            valores.append(ingreso.categoria)
        if ingreso.fecha is not None:
            campos.append("fecha = %s")
            valores.append(ingreso.fecha)
        if ingreso.recurrente is not None:
            campos.append("recurrente = %s")
            valores.append(ingreso.recurrente)

        if not campos:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No se enviaron campos para actualizar"
            )

        valores.extend([ingreso_id, current_user["id"]])
        query = f"""
            UPDATE ingresos SET {', '.join(campos)}
            WHERE id = %s AND usuario_id = %s
            RETURNING id, usuario_id, descripcion, monto, categoria,
                      fecha, recurrente, created_at
        """
        cursor.execute(query, valores)
        row = cursor.fetchone()
        conn.commit()

        return IngresoResponse(
            id=row[0],
            usuario_id=row[1],
            descripcion=row[2],
            monto=float(row[3]),
            categoria=row[4],
            fecha=str(row[5]),
            recurrente=row[6],
            created_at=str(row[7])
        )
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error actualizando ingreso: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  ELIMINAR INGRESO
# ══════════════════════════════════════════

@router.delete("/{ingreso_id}")
def eliminar_ingreso(
    ingreso_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Elimina un ingreso del usuario autenticado.
    A diferencia de los gastos, los ingresos sí se pueden eliminar
    ya que no tienen impacto en el historial de auditoría bancaria.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            DELETE FROM ingresos
            WHERE id = %s AND usuario_id = %s
        """, (ingreso_id, current_user["id"]))

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Ingreso no encontrado"
            )

        conn.commit()
        return {"mensaje": "Ingreso eliminado correctamente"}

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error eliminando ingreso: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)