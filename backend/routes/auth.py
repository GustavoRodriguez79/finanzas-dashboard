# routes/auth.py
# Endpoints de autenticación: registro, login, logout,
# renovación de token y login con Google OAuth.

from fastapi import APIRouter, HTTPException, status, Depends
from database import get_connection, release_connection
from schemas import (
    UsuarioRegister, UsuarioLogin, TokenResponse,
    UsuarioResponse, RefreshTokenRequest
)
from auth import (
    hash_password, verify_password,
    create_access_token, create_refresh_token,
    save_refresh_token, invalidate_refresh_token,
    verify_refresh_token_db, verify_google_token,
    get_current_user
)
import logging

logger = logging.getLogger(__name__)
router = APIRouter()


# ══════════════════════════════════════════
#  REGISTRO
# ══════════════════════════════════════════

@router.post("/register", status_code=201)
def register(datos: UsuarioRegister):
    """
    Registra un nuevo usuario con email y contraseña.
    Verifica que el email no esté en uso antes de crear el usuario.
    La contraseña se hashea con bcrypt — nunca se almacena en texto plano.
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Verifica si el email ya está registrado
        cursor.execute(
            "SELECT id FROM usuarios WHERE email = %s", (datos.email,)
        )
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="El email ya está registrado"
            )

        # Hashea la contraseña antes de guardar
        password_hash = hash_password(datos.password)

        # Inserta el nuevo usuario
        cursor.execute("""
            INSERT INTO usuarios (nombre, email, password_hash, proveedor)
            VALUES (%s, %s, %s, 'local')
            RETURNING id, nombre, email, avatar_url, proveedor, created_at
        """, (datos.nombre, datos.email, password_hash))

        row = cursor.fetchone()
        conn.commit()

        # Genera tokens para que el usuario quede logueado al registrarse
        access_token = create_access_token(row[0], row[2])
        refresh_token = create_refresh_token(row[0])
        save_refresh_token(row[0], refresh_token)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            usuario=UsuarioResponse(
                id=row[0],
                nombre=row[1],
                email=row[2],
                avatar_url=row[3],
                proveedor=row[4],
                created_at=str(row[5])
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error en registro: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  LOGIN
# ══════════════════════════════════════════

@router.post("/login", response_model=TokenResponse)
def login(datos: UsuarioLogin):
    """
    Autentica un usuario con email y contraseña.
    Retorna access token (30 min) y refresh token (7 días).
    """
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            SELECT id, nombre, email, password_hash, avatar_url, proveedor, activo, created_at
            FROM usuarios
            WHERE email = %s
        """, (datos.email,))
        row = cursor.fetchone()

        # Mensaje genérico — no revelamos si el email existe o no
        # Criterio de seguridad bancaria
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas"
            )

        # Verifica que sea usuario local, no de Google
        if row[5] == "google":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Esta cuenta usa Google. Iniciá sesión con Google."
            )

        # Verifica la contraseña
        if not verify_password(datos.password, row[3]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Credenciales incorrectas"
            )

        # Verifica que la cuenta esté activa
        if not row[6]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cuenta desactivada. Contactá soporte."
            )

        # Genera tokens
        access_token = create_access_token(row[0], row[2])
        refresh_token = create_refresh_token(row[0])
        save_refresh_token(row[0], refresh_token)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            usuario=UsuarioResponse(
                id=row[0],
                nombre=row[1],
                email=row[2],
                avatar_url=row[4],
                proveedor=row[5],
                created_at=str(row[7])
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error en login: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  LOGIN CON GOOGLE
# ══════════════════════════════════════════

@router.post("/google", response_model=TokenResponse)
async def login_google(payload: dict):
    """
    Autentica o registra un usuario usando Google OAuth.
    Si el usuario no existe lo crea automáticamente.
    Si ya existe lo autentica directamente.
    """
    google_token = payload.get("token")
    if not google_token:
        raise HTTPException(status_code=400, detail="Token de Google requerido")

    # Verifica el token con Google y obtiene los datos del usuario
    google_data = await verify_google_token(google_token)
    google_id = google_data.get("sub")
    email = google_data.get("email")
    nombre = google_data.get("name")
    avatar_url = google_data.get("picture")

    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Busca si el usuario ya existe por google_id o email
        cursor.execute("""
            SELECT id, nombre, email, avatar_url, proveedor, activo, created_at
            FROM usuarios
            WHERE google_id = %s OR email = %s
        """, (google_id, email))
        row = cursor.fetchone()

        if row:
            # Usuario existente — actualiza datos de Google por si cambiaron
            cursor.execute("""
                UPDATE usuarios
                SET google_id = %s, avatar_url = %s, proveedor = 'google'
                WHERE id = %s
            """, (google_id, avatar_url, row[0]))
            conn.commit()
            usuario_id = row[0]
            usuario_nombre = row[1]
            usuario_email = row[2]
            usuario_avatar = avatar_url
            usuario_created = str(row[6])
        else:
            # Usuario nuevo — lo registra automáticamente
            cursor.execute("""
                INSERT INTO usuarios (nombre, email, google_id, avatar_url, proveedor)
                VALUES (%s, %s, %s, %s, 'google')
                RETURNING id, created_at
            """, (nombre, email, google_id, avatar_url))
            new_row = cursor.fetchone()
            conn.commit()
            usuario_id = new_row[0]
            usuario_nombre = nombre
            usuario_email = email
            usuario_avatar = avatar_url
            usuario_created = str(new_row[1])

        # Genera tokens propios — el frontend los maneja igual que el login normal
        access_token = create_access_token(usuario_id, usuario_email)
        refresh_token = create_refresh_token(usuario_id)
        save_refresh_token(usuario_id, refresh_token)

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            usuario=UsuarioResponse(
                id=usuario_id,
                nombre=usuario_nombre,
                email=usuario_email,
                avatar_url=usuario_avatar,
                proveedor="google",
                created_at=usuario_created
            )
        )
    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        logger.error(f"Error en login Google: {e}")
        raise HTTPException(status_code=500, detail="Error interno del servidor")
    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  REFRESH TOKEN
# ══════════════════════════════════════════

@router.post("/refresh")
def refresh_token(datos: RefreshTokenRequest):
    """
    Genera un nuevo access token usando el refresh token.
    Verifica que el refresh token sea válido y no haya expirado.
    """
    # Verifica que el refresh token existe en la DB y no expiró
    usuario_id = verify_refresh_token_db(datos.refresh_token)

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "SELECT email FROM usuarios WHERE id = %s", (usuario_id,)
        )
        row = cursor.fetchone()
        if not row:
            raise HTTPException(status_code=401, detail="Usuario no encontrado")

        # Genera nuevo access token
        new_access_token = create_access_token(usuario_id, row[0])
        return {"access_token": new_access_token, "token_type": "bearer"}

    finally:
        cursor.close()
        release_connection(conn)


# ══════════════════════════════════════════
#  LOGOUT
# ══════════════════════════════════════════

@router.post("/logout")
def logout(
    datos: RefreshTokenRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Cierra la sesión invalidando el refresh token en la base de datos.
    El access token expira solo en 30 minutos.
    Requiere estar autenticado.
    """
    invalidate_refresh_token(datos.refresh_token)
    return {"mensaje": "Sesión cerrada correctamente"}


# ══════════════════════════════════════════
#  PERFIL DEL USUARIO ACTUAL
# ══════════════════════════════════════════

@router.get("/me", response_model=UsuarioResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    """
    Retorna los datos del usuario autenticado.
    Útil para que el frontend muestre el perfil sin guardar datos sensibles.
    """
    return UsuarioResponse(
        id=current_user["id"],
        nombre=current_user["nombre"],
        email=current_user["email"],
        avatar_url=current_user.get("avatar_url"),
        proveedor=current_user["proveedor"],
        created_at=current_user["created_at"]
    )