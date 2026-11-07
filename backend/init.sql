-- init.sql
-- Esquema completo de finanzas-dashboard (PostgreSQL).
-- Para Supabase: pegar y ejecutar en SQL Editor. Para local: pgAdmin o psql.
-- Es idempotente (IF NOT EXISTS): se puede ejecutar más de una vez sin errores.

-- Usuarios con soporte JWT y Google OAuth.
-- password_hash es NULL si se registró con Google; google_id es NULL si fue con email.
CREATE TABLE IF NOT EXISTS usuarios (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    google_id VARCHAR(255),
    avatar_url VARCHAR(500),
    proveedor VARCHAR(20) DEFAULT 'local',   -- 'local' o 'google'
    activo BOOLEAN DEFAULT TRUE,
    onboarding_completado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Migración para bases ya creadas: CREATE TABLE IF NOT EXISTS no agrega columnas
-- a una tabla existente. Después de correrla, marcar como completado a los
-- usuarios previos para que no vean el onboarding:
--   UPDATE usuarios SET onboarding_completado = TRUE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS onboarding_completado BOOLEAN DEFAULT FALSE;

-- Ingresos por categoría
CREATE TABLE IF NOT EXISTS ingresos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    descripcion VARCHAR(255),
    monto DECIMAL(12,2) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    fecha DATE NOT NULL,
    recurrente BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Gastos con anulación bancaria: nunca se borran, se marcan anulado = TRUE
-- para conservar el historial inmutable.
CREATE TABLE IF NOT EXISTS gastos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    descripcion VARCHAR(255),
    monto DECIMAL(12,2) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    subcategoria VARCHAR(100),
    fecha DATE NOT NULL,
    recurrente BOOLEAN DEFAULT FALSE,
    anulado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Presupuesto mensual por categoría.
-- El UNIQUE es requerido por el INSERT ... ON CONFLICT de routes/presupuesto.py.
CREATE TABLE IF NOT EXISTS presupuestos (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    categoria VARCHAR(100) NOT NULL,
    monto_limite DECIMAL(12,2) NOT NULL,
    mes INTEGER NOT NULL,
    anio INTEGER NOT NULL,
    UNIQUE(usuario_id, categoria, mes, anio)
);

-- Plantillas de gastos recurrentes (todavía sin endpoints en el backend).
CREATE TABLE IF NOT EXISTS gastos_recurrentes (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    descripcion VARCHAR(255) NOT NULL,
    monto DECIMAL(12,2) NOT NULL,
    categoria VARCHAR(100) NOT NULL,
    subcategoria VARCHAR(100),
    dia_del_mes INTEGER NOT NULL,
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Refresh tokens para renovar sesión sin volver a loguearse
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    expira_en TIMESTAMP NOT NULL,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ahorros en dólares: depósitos, retiros y ajustes.
-- A diferencia de gastos, se eliminan con DELETE real (decisión de producto).
-- "ajuste" suma igual que un depósito.
CREATE TABLE IF NOT EXISTS ahorros_usd (
    id SERIAL PRIMARY KEY,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('depósito', 'retiro', 'ajuste')),
    monto DECIMAL(14,2) NOT NULL CHECK (monto > 0),
    descripcion TEXT,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
