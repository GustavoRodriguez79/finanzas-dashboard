# main.py
# Punto de entrada principal de la aplicación FastAPI.
# Inicializa la app, configura middlewares, eventos de ciclo de vida
# y registra todos los routers con sus prefijos correspondientes.

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from database import init_pool, close_pool
from routes import auth, gastos, ingresos, presupuesto, resumen
import logging

# Configuración del logger global
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s — %(name)s — %(levelname)s — %(message)s"
)
logger = logging.getLogger(__name__)


# ─── Ciclo de vida de la aplicación ───
# Reemplaza los eventos on_event deprecados de versiones anteriores
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Maneja el arranque y cierre de la app.
    Al iniciar: abre el pool de conexiones a PostgreSQL.
    Al cerrar: cierra todas las conexiones del pool limpiamente.
    """
    logger.info("Iniciando aplicación...")
    init_pool()         # Abre el pool de conexiones
    yield               # La app corre aquí
    logger.info("Cerrando aplicación...")
    close_pool()        # Cierra el pool al apagar


# ─── Inicialización de FastAPI ───
app = FastAPI(
    title="Finanzas Dashboard API",
    description="API REST para gestión de finanzas personales con autenticación JWT y Google OAuth.",
    version="1.0.0",
    lifespan=lifespan
)


# ─── CORS ───
# Permite que el frontend en Netlify se comunique con el backend en Render.
# En producción se reemplaza el wildcard por la URL real del frontend.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",        # Vite dev server local
        "http://127.0.0.1:5173",
        "https://finanzas-dashboard-gustavo.netlify.app"  # URL de producción en Netlify
    ],
    allow_credentials=True,            # Necesario para enviar cookies/headers de auth
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routers ───
# Cada módulo tiene su prefijo y tag para organizar el Swagger docs
app.include_router(auth.router,         prefix="/auth",         tags=["Autenticación"])
app.include_router(ingresos.router,     prefix="/ingresos",     tags=["Ingresos"])
app.include_router(gastos.router,       prefix="/gastos",       tags=["Gastos"])
app.include_router(presupuesto.router,  prefix="/presupuesto",  tags=["Presupuesto"])
app.include_router(resumen.router,      prefix="/resumen",      tags=["Resumen"])


# ─── Ruta raíz ───
@app.get("/", tags=["Health Check"])
def root():
    """
    Endpoint de verificación — confirma que la API está activa.
    Usado por Render para health checks automáticos.
    """
    return {
        "estado": "activo",
        "app": "Finanzas Dashboard API",
        "version": "1.0.0",
        "docs": "/docs"
    }