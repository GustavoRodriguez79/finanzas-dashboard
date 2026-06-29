# models.py
# Define la estructura de las tablas usando dataclasses simples.
# No usamos SQLAlchemy ORM — trabajamos con psycopg2 directo

from dataclasses import dataclass
from datetime import date, datetime
from typing import Optional

@dataclass
class Usuario:
    """
    Representa un usuario del sistema.
    proveedor puede ser 'local' (email/password) o 'google' (OAuth).
    """
    id: int
    nombre: str
    email: str
    password_hash: Optional[str]     # None si el usuario se registró con Google
    google_id: Optional[str]         # None si el usuario se registró con email
    avatar_url: Optional[str]
    proveedor: str                   # 'local' o 'google'
    activo: bool
    created_at: datetime

@dataclass
class Ingreso:
    """
    Representa un ingreso del usuario.
    recurrente=True indica que se repite mensualmente (ej: sueldo).
    """
    id: int
    usuario_id: int
    descripcion: Optional[str]
    monto: float
    categoria: str
    fecha: date
    recurrente: bool
    created_at: datetime

@dataclass
class Gasto:
    """
    Representa un gasto del usuario.
    anulado=True reemplaza al borrado — los registros nunca se eliminan.
    Criterio bancario: historial inmutable para auditoría.
    """
    id: int
    usuario_id: int
    descripcion: Optional[str]
    monto: float
    categoria: str
    subcategoria: Optional[str]
    fecha: date
    recurrente: bool
    anulado: bool                    # True = anulado, nunca se borra
    created_at: datetime

@dataclass
class Presupuesto:
    """
    Define el límite de gasto mensual por categoría.
    La combinación usuario_id + categoria + mes + anio es única.
    """
    id: int
    usuario_id: int
    categoria: str
    monto_limite: float
    mes: int                         # 1-12
    anio: int

@dataclass
class GastoRecurrente:
    """
    Plantilla de gasto que se repite mensualmente.
    Ejemplo: alquiler, servicios, cuotas.
    dia_del_mes indica el día en que se genera el gasto.
    """
    id: int
    usuario_id: int
    descripcion: str
    monto: float
    categoria: str
    subcategoria: Optional[str]
    dia_del_mes: int                 # 1-31
    activo: bool
    created_at: datetime

@dataclass
class RefreshToken:
    """
    Token de renovación de sesión.
    Permite generar nuevos access tokens sin que el usuario
    tenga que loguearse de nuevo cada 30 minutos.
    """
    id: int
    usuario_id: int
    token: str
    expira_en: datetime
    creado_en: datetime


# ─── Categorías válidas ───
# Constantes centralizadas para evitar inconsistencias entre
# frontend y backend al manejar categorías.

CATEGORIAS_GASTOS = [
    "Vivienda",
    "Alimentación",
    "Transporte",
    "Salud",
    "Educación",
    "Ropa",
    "Entretenimiento",
    "Finanzas",
    "Tecnología",
    "Varios"
]

CATEGORIAS_INGRESOS = [
    "Sueldo",
    "Freelance",
    "Inversiones",
    "Alquiler",
    "Otros"
]