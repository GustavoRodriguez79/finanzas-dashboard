# auth.py
# Módulo central de autenticación.
# Maneja: hasheo de contraseñas, generación y validación de JWT,
# obtención del usuario actual desde el token, y Google OAuth.

from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from database import get_connection, release_connection
from dotenv import load_dotenv
import os
import logging

load_dotenv()

logger = logging.getLogger(__name__)

# ─── Configuración ───
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

# Contexto de bcrypt para hasheo de contraseñas
# bcrypt es el estándar de la industria — lento por diseño para dificultar ataques
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# Esquema de seguridad HTTP Bearer para extraer el token del header
# Authorization: Bearer <token>
bearer_scheme = HTTPBearer()


# ══════════════════════════════════════════
#  CONTRASEÑAS
# ══════════════════════════════════════════

def hash_password(password: str) -> str:
    """
    Genera el hash bcrypt de una contraseña.
    Nunca se almacena la contraseña en texto plano.
    """
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica si una contraseña coincide con su hash.
    Retorna True si coincide, False si no.
    """
    return pwd_context.verify(plain_password, hashed_password)


# ══════════════════════════════════════════
#  JWT — ACCESS TOKEN
# ══════════════════════════════════════════

def create_access_token(usuario_id: int, email: str) -> str:
    """
    Genera un JWT de acceso con expiración corta (30 minutos).
    Contiene: id del usuario, email y fecha de expiración.
    """
    expiracion = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(usuario_id),   # subject — id del usuario
        "email": email,
        "exp": expiracion,
        "type": "access"
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def create_refresh_token(usuario_id: int) -> str:
    """
    Genera un JWT de renovación con expiración larga (7 días).
    Se usa para obtener nuevos access tokens sin re-loguearse.
    """
    expiracion = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    payload = {
        "sub": str(usuario_id),
        "exp": expiracion,
        "type": "refresh"
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def verify_token(token: str) -> dict:
    """
    Valida y decodifica un JWT.
    Lanza HTTPException 401 si el token es inválido o expiró.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"}
        )


# ══════════════════════════════════════════
#  USUARIO ACTUAL — DEPENDENCIA FASTAPI
# ══════════════════════════════════════════

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)
):
    """
    Dependencia de FastAPI que extrae y valida el usuario del token JWT.
    Se inyecta en cada endpoint protegido con Depends(get_current_user).
    Retorna el usuario completo desde la base de datos.
    """
    token = credentials.credentials
    payload = verify_token(token)

    # Verifica que sea un access token, no un refresh token
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tipo de token inválido"
        )

    usuario_id = int(payload.get("sub"))

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT id, nombre, email, avatar_url, proveedor, activo, created_at
            FROM usuarios
            WHERE id = %s
        """, (usuario_id,))
        row = cursor.fetchone()

        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Usuario no encontrado"
            )

        if not row[5]:  # activo
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cuenta desactivada"
            )

        return {
            "id": row[0],
            "nombre": row[1],
            "email": row[2],
            "avatar_url": row[3],
            "proveedor": row[4],
            "activo": row[5],
            "created_at": str(row[6])
        }
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  REFRESH TOKEN — BASE DE DATOS
# ══════════════════════════════════════════

def save_refresh_token(usuario_id: int, token: str):
    """
    Guarda el refresh token en la base de datos.
    Permite invalidarlo manualmente en logout.
    """
    expiracion = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO refresh_tokens (usuario_id, token, expira_en)
            VALUES (%s, %s, %s)
        """, (usuario_id, token, expiracion))
        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"Error guardando refresh token: {e}")
        raise
    finally:
        cursor.close()
        release_connection(conn)

def invalidate_refresh_token(token: str):
    """
    Elimina el refresh token de la base de datos en el logout.
    Así el token no puede reutilizarse aunque no haya expirado.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM refresh_tokens WHERE token = %s", (token,)
        )
        conn.commit()
    finally:
        cursor.close()
        release_connection(conn)

def verify_refresh_token_db(token: str) -> int:
    """
    Verifica que el refresh token existe en DB y no expiró.
    Retorna el usuario_id si es válido.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT usuario_id FROM refresh_tokens
            WHERE token = %s AND expira_en > NOW()
        """, (token,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Refresh token inválido o expirado"
            )
        return row[0]
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  GOOGLE OAUTH
# ══════════════════════════════════════════

async def verify_google_token(token: str) -> dict:
    """
    Verifica el token de Google y retorna los datos del usuario.
    Usa el endpoint oficial de Google para validar el token.
    """
    import httpx
    async with httpx.AsyncClient() as client:
        respuesta = await client.get(
            "https://www.googleapis.com/oauth2/v3/userinfo",
            headers={"Authorization": f"Bearer {token}"}
        )
        if respuesta.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token de Google inválido"
            )
        return respuesta.json()
        # Retorna: email, name, picture, sub (google_id)