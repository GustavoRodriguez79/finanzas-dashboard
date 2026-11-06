# routes/ahorros_usd.py
# Endpoints CRUD para los ahorros en dólares del usuario autenticado.
# Todos los endpoints requieren JWT válido — Depends(get_current_user).
# A diferencia de los gastos, los movimientos USD sí se eliminan con DELETE.

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import date
from database import get_connection, release_connection
from auth import get_current_user
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

TIPOS_VALIDOS = ["depósito", "retiro", "ajuste"]

# Columnas que devuelven todas las consultas, en este orden
COLUMNAS = "id, tipo, monto, descripcion, fecha, created_at"


# ══════════════════════════════════════════
#  SCHEMAS
# ══════════════════════════════════════════

class MovimientoUSDCreate(BaseModel):
    """Datos para crear o reemplazar un movimiento en USD."""
    tipo: str
    monto: float
    descripcion: Optional[str] = None
    fecha: Optional[date] = None  # si no viene, se usa la fecha de hoy

    @field_validator("tipo")
    @classmethod
    def tipo_valido(cls, v):
        if v not in TIPOS_VALIDOS:
            raise ValueError(f"Tipo inválido. Opciones: {TIPOS_VALIDOS}")
        return v

    @field_validator("monto")
    @classmethod
    def monto_positivo(cls, v):
        if v <= 0:
            raise ValueError("El monto debe ser mayor a cero")
        return v


class MovimientoUSDResponse(BaseModel):
    """Datos del movimiento que se devuelven en la respuesta."""
    id: int
    tipo: str
    monto: float
    descripcion: Optional[str]
    fecha: str
    created_at: str


class AhorrosUSDResponse(BaseModel):
    """Lista de movimientos del usuario más su balance."""
    movimientos: list[MovimientoUSDResponse]
    balance: float


# ══════════════════════════════════════════
#  FUNCIONES AUXILIARES
# ══════════════════════════════════════════

def _fila_a_movimiento(row) -> MovimientoUSDResponse:
    """Convierte una fila de la DB (en el orden de COLUMNAS) al schema de respuesta."""
    return MovimientoUSDResponse(
        id=row[0],
        tipo=row[1],
        monto=float(row[2]),
        descripcion=row[3],
        fecha=str(row[4]),
        created_at=str(row[5])
    )


def _calcular_balance(movimientos: list[MovimientoUSDResponse]) -> float:
    """Depósitos y ajustes suman; los retiros restan."""
    balance = 0.0
    for m in movimientos:
        if m.tipo == "retiro":
            balance -= m.monto
        else:
            balance += m.monto
    return round(balance, 2)


# ══════════════════════════════════════════
#  LISTAR MOVIMIENTOS
# ══════════════════════════════════════════

@router.get("", response_model=AhorrosUSDResponse)
def listar_ahorros(current_user: dict = Depends(get_current_user)):
    """Retorna todos los movimientos USD del usuario y su balance."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"""
            SELECT {COLUMNAS}
            FROM ahorros_usd
            WHERE usuario_id = %s
            ORDER BY fecha DESC, created_at DESC
        """, (current_user["id"],))

        movimientos = [_fila_a_movimiento(f) for f in cursor.fetchall()]
        return AhorrosUSDResponse(
            movimientos=movimientos,
            balance=_calcular_balance(movimientos)
        )
    except Exception as e:
        logger.error(f"Error obteniendo ahorros USD: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  CREAR MOVIMIENTO
# ══════════════════════════════════════════

@router.post("", status_code=201, response_model=MovimientoUSDResponse)
def crear_movimiento(
    movimiento: MovimientoUSDCreate,
    current_user: dict = Depends(get_current_user)
):
    """Registra un nuevo movimiento USD para el usuario autenticado."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"""
            INSERT INTO ahorros_usd (usuario_id, tipo, monto, descripcion, fecha)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING {COLUMNAS}
        """, (
            current_user["id"],
            movimiento.tipo,
            movimiento.monto,
            movimiento.descripcion,
            movimiento.fecha or date.today()
        ))

        row = cursor.fetchone()
        conn.commit()
        return _fila_a_movimiento(row)
    except Exception as e:
        conn.rollback()
        logger.error(f"Error creando movimiento USD: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  ACTUALIZAR MOVIMIENTO
# ══════════════════════════════════════════

@router.put("/{mov_id}", response_model=MovimientoUSDResponse)
def actualizar_movimiento(
    mov_id: int,
    movimiento: MovimientoUSDCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Reemplaza los datos de un movimiento existente.
    Verifica que el movimiento pertenezca al usuario autenticado.
    Es un reemplazo completo (no parcial): así descripcion=None permite borrarla.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"""
            UPDATE ahorros_usd
            SET tipo = %s, monto = %s, descripcion = %s, fecha = %s
            WHERE id = %s AND usuario_id = %s
            RETURNING {COLUMNAS}
        """, (
            movimiento.tipo,
            movimiento.monto,
            movimiento.descripcion,
            movimiento.fecha or date.today(),
            mov_id,
            current_user["id"]
        ))

        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Movimiento no encontrado"
            )

        conn.commit()
        return _fila_a_movimiento(row)
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error actualizando movimiento USD: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  ELIMINAR MOVIMIENTO
# ══════════════════════════════════════════

@router.delete("/{mov_id}", status_code=204)
def eliminar_movimiento(
    mov_id: int,
    current_user: dict = Depends(get_current_user)
):
    """Elimina un movimiento USD del usuario autenticado (DELETE real)."""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            DELETE FROM ahorros_usd
            WHERE id = %s AND usuario_id = %s
        """, (mov_id, current_user["id"]))

        if cursor.rowcount == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Movimiento no encontrado"
            )

        conn.commit()
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error eliminando movimiento USD: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)
