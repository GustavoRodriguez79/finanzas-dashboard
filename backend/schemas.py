# schemas.py
# Define los schemas de validación usando Pydantic.
# Estos schemas validan los datos que entran y salen de la API
# antes de que lleguen a la base de datos.
# Separamos schemas de entrada (Create/Update) y salida (Response)
# para tener control preciso sobre qué datos se exponen.

from pydantic import BaseModel, EmailStr, field_validator
from datetime import date, datetime
from typing import Optional
from models import CATEGORIAS_GASTOS, CATEGORIAS_INGRESOS

# ══════════════════════════════════════════
#  AUTH
# ══════════════════════════════════════════

class UsuarioRegister(BaseModel):
    """Datos requeridos para registro con email y contraseña."""
    nombre: str
    email: EmailStr                  # Valida formato de email automáticamente
    password: str

    @field_validator("nombre")
    @classmethod
    def nombre_no_vacio(cls, v):
        if not v.strip():
            raise ValueError("El nombre no puede estar vacío")
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_segura(cls, v):
        # Criterio bancario: mínimo 8 caracteres
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        return v

class UsuarioLogin(BaseModel):
    """Datos para login con email y contraseña."""
    email: EmailStr
    password: str

class UsuarioResponse(BaseModel):
    """Datos del usuario que se devuelven en la respuesta — nunca el password."""
    id: int
    nombre: str
    email: str
    avatar_url: Optional[str]
    proveedor: str
    created_at: str

class TokenResponse(BaseModel):
    """Respuesta del endpoint de login con los tokens de acceso."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    usuario: UsuarioResponse

class RefreshTokenRequest(BaseModel):
    """Request para renovar el access token usando el refresh token."""
    refresh_token: str

# ══════════════════════════════════════════
#  INGRESOS
# ══════════════════════════════════════════

class IngresoCreate(BaseModel):
    """Datos para crear un ingreso nuevo."""
    descripcion: Optional[str] = None
    monto: float
    categoria: str
    fecha: date
    recurrente: bool = False

    @field_validator("monto")
    @classmethod
    def monto_positivo(cls, v):
        if v <= 0:
            raise ValueError("El monto debe ser mayor a cero")
        return v

    @field_validator("categoria")
    @classmethod
    def categoria_valida(cls, v):
        if v not in CATEGORIAS_INGRESOS:
            raise ValueError(f"Categoría inválida. Opciones: {CATEGORIAS_INGRESOS}")
        return v

class IngresoUpdate(BaseModel):
    """Todos los campos opcionales para actualización parcial."""
    descripcion: Optional[str] = None
    monto: Optional[float] = None
    categoria: Optional[str] = None
    fecha: Optional[date] = None
    recurrente: Optional[bool] = None

class IngresoResponse(BaseModel):
    """Datos del ingreso que se devuelven en la respuesta."""
    id: int
    usuario_id: int
    descripcion: Optional[str]
    monto: float
    categoria: str
    fecha: str
    recurrente: bool
    created_at: str

# ══════════════════════════════════════════
#  GASTOS
# ══════════════════════════════════════════

class GastoCreate(BaseModel):
    """Datos para crear un gasto nuevo."""
    descripcion: Optional[str] = None
    monto: float
    categoria: str
    subcategoria: Optional[str] = None
    fecha: date
    recurrente: bool = False

    @field_validator("monto")
    @classmethod
    def monto_positivo(cls, v):
        if v <= 0:
            raise ValueError("El monto debe ser mayor a cero")
        return v

    @field_validator("categoria")
    @classmethod
    def categoria_valida(cls, v):
        if v not in CATEGORIAS_GASTOS:
            raise ValueError(f"Categoría inválida. Opciones: {CATEGORIAS_GASTOS}")
        return v

class GastoUpdate(BaseModel):
    """Todos los campos opcionales para actualización parcial."""
    descripcion: Optional[str] = None
    monto: Optional[float] = None
    categoria: Optional[str] = None
    subcategoria: Optional[str] = None
    fecha: Optional[date] = None
    recurrente: Optional[bool] = None

class GastoResponse(BaseModel):
    """Datos del gasto que se devuelven en la respuesta."""
    id: int
    usuario_id: int
    descripcion: Optional[str]
    monto: float
    categoria: str
    subcategoria: Optional[str]
    fecha: str
    recurrente: bool
    anulado: bool
    created_at: str

# ══════════════════════════════════════════
#  PRESUPUESTO
# ══════════════════════════════════════════

class PresupuestoCreate(BaseModel):
    """Datos para definir un presupuesto mensual por categoría."""
    categoria: str
    monto_limite: float
    mes: int
    anio: int

    @field_validator("monto_limite")
    @classmethod
    def limite_positivo(cls, v):
        if v <= 0:
            raise ValueError("El límite debe ser mayor a cero")
        return v

    @field_validator("mes")
    @classmethod
    def mes_valido(cls, v):
        if not 1 <= v <= 12:
            raise ValueError("El mes debe estar entre 1 y 12")
        return v

    @field_validator("categoria")
    @classmethod
    def categoria_valida(cls, v):
        if v not in CATEGORIAS_GASTOS:
            raise ValueError(f"Categoría inválida. Opciones: {CATEGORIAS_GASTOS}")
        return v

class PresupuestoResponse(BaseModel):
    """Datos del presupuesto con información de alerta."""
    id: int
    categoria: str
    monto_limite: float
    mes: int
    anio: int
    gastado: Optional[float] = 0     # Cuánto se gastó en esa categoría
    porcentaje: Optional[float] = 0  # % del presupuesto usado
    alerta: Optional[bool] = False   # True si superó el 80% del límite

# ══════════════════════════════════════════
#  GASTOS RECURRENTES
# ══════════════════════════════════════════

class GastoRecurrenteCreate(BaseModel):
    """Datos para registrar un gasto recurrente mensual."""
    descripcion: str
    monto: float
    categoria: str
    subcategoria: Optional[str] = None
    dia_del_mes: int

    @field_validator("dia_del_mes")
    @classmethod
    def dia_valido(cls, v):
        if not 1 <= v <= 31:
            raise ValueError("El día debe estar entre 1 y 31")
        return v

    @field_validator("monto")
    @classmethod
    def monto_positivo(cls, v):
        if v <= 0:
            raise ValueError("El monto debe ser mayor a cero")
        return v

class GastoRecurrenteResponse(BaseModel):
    """Datos del gasto recurrente en la respuesta."""
    id: int
    descripcion: str
    monto: float
    categoria: str
    subcategoria: Optional[str]
    dia_del_mes: int
    activo: bool

# ══════════════════════════════════════════
#  RESUMEN / DASHBOARD
# ══════════════════════════════════════════

class ResumenMes(BaseModel):
    """Datos del resumen mensual para el dashboard."""
    mes: int
    anio: int
    total_ingresos: float
    total_gastos: float
    balance: float                   # ingresos - gastos
    porcentaje_ahorro: float         # (balance / ingresos) * 100
    categoria_top_gasto: str         # categoría con mayor gasto
    monto_categoria_top: float

class ResumenAnual(BaseModel):
    """Resumen de los 12 meses del año."""
    anio: int
    total_ingresos: float
    total_gastos: float
    balance_anual: float
    porcentaje_ahorro_anual: float
    meses: list                      # Lista de ResumenMes por cada mes