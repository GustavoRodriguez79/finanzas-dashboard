# database.py
# Módulo de conexión a PostgreSQL usando psycopg2.
# Implementa un pool de conexiones para mayor eficiencia y seguridad.

import psycopg2
from psycopg2 import pool
from dotenv import load_dotenv
import os
import logging

# Configuración del logger para registrar errores de conexión
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

# Pool de conexiones — reutiliza conexiones en vez de crear una nueva por request
# minconn=1: mínimo una conexión activa
# maxconn=10: máximo 10 conexiones simultáneas
connection_pool = None

def init_pool():
    """
    Inicializa el pool de conexiones al arrancar la app.
    Se llama una sola vez desde main.py en el evento startup.
    """
    global connection_pool
    try:
        connection_pool = psycopg2.pool.ThreadedConnectionPool(
            minconn=1,
            maxconn=10,
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD")
        )
        logger.info("Pool de conexiones iniciado correctamente")
    except Exception as e:
        logger.error(f"Error al iniciar el pool de conexiones: {e}")
        raise

def get_connection():
    """
    Obtiene una conexión disponible del pool.
    Debe liberarse con release_connection() al terminar.
    """
    if connection_pool is None:
        raise Exception("El pool de conexiones no fue inicializado")
    return connection_pool.getconn()

def release_connection(conn):
    """
    Devuelve la conexión al pool para que pueda reutilizarse.
    Siempre se llama en el bloque finally de cada endpoint.
    """
    if connection_pool and conn:
        connection_pool.putconn(conn)

def close_pool():
    """
    Cierra todas las conexiones del pool.
    Se llama desde main.py en el evento shutdown.
    """
    if connection_pool:
        connection_pool.closeall()
        logger.info("Pool de conexiones cerrado") 