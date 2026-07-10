// api.js
// Configuración central de Axios para comunicarse con la API de FastAPI.
// Maneja automáticamente: tokens JWT, refresh de sesión y errores globales.

import axios from "axios";

// URL base de la API — cambia según el entorno
const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// Instancia de Axios configurada con la URL base
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// ─── Interceptor de REQUEST ───
// Agrega el token JWT en cada request automáticamente
// El componente no necesita preocuparse por el token — lo maneja acá
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Interceptor de RESPONSE ───
// Si el servidor responde 401 (token expirado), intenta renovarlo
// automáticamente con el refresh token sin que el usuario note nada
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Si es 401 y no es un reintento — intenta renovar el token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) {
          // No hay refresh token — redirige al login
          localStorage.clear();
          window.location.href = "/login";
          return Promise.reject(error);
        }

        // Solicita un nuevo access token
        const respuesta = await axios.post(`${BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const nuevoToken = respuesta.data.access_token;
        localStorage.setItem("access_token", nuevoToken);

        // Reintenta el request original con el nuevo token
        originalRequest.headers.Authorization = `Bearer ${nuevoToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // El refresh token también expiró — redirige al login
        localStorage.clear();
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// ══════════════════════════════════════════
//  FUNCIONES DE AUTH
// ══════════════════════════════════════════

export const authService = {
  // Registro con email y contraseña
  register: (datos) => api.post("/auth/register", datos),

  // Login con email y contraseña
  login: (datos) => api.post("/auth/login", datos),

  // Login con Google OAuth
  loginGoogle: (token) => api.post("/auth/google", { token }),

  // Cerrar sesión
  logout: (refreshToken) =>
    api.post("/auth/logout", { refresh_token: refreshToken }),

  // Datos del usuario actual
  getMe: () => api.get("/auth/me"),
};

// ══════════════════════════════════════════
//  FUNCIONES DE INGRESOS
// ══════════════════════════════════════════

export const ingresosService = {
  // Obtener todos los ingresos con filtros opcionales
  getAll: (params) => api.get("/ingresos/", { params }),

  // Crear nuevo ingreso
  create: (datos) => api.post("/ingresos/", datos),

  // Actualizar ingreso
  update: (id, datos) => api.put(`/ingresos/${id}`, datos),

  // Eliminar ingreso
  delete: (id) => api.delete(`/ingresos/${id}`),
};

// ══════════════════════════════════════════
//  FUNCIONES DE GASTOS
// ══════════════════════════════════════════

export const gastosService = {
  // Obtener todos los gastos con filtros opcionales
  getAll: (params) => api.get("/gastos/", { params }),

  // Crear nuevo gasto
  create: (datos) => api.post("/gastos/", datos),

  // Actualizar gasto
  update: (id, datos) => api.put(`/gastos/${id}`, datos),

  // Anular gasto — nunca se elimina
  anular: (id) => api.delete(`/gastos/${id}`),
};

// ══════════════════════════════════════════
//  FUNCIONES DE PRESUPUESTO
// ══════════════════════════════════════════

export const presupuestoService = {
  // Obtener presupuestos del mes con estado de alertas
  getAll: (params) => api.get("/presupuesto/", { params }),

  // Crear o actualizar presupuesto
  create: (datos) => api.post("/presupuesto/", datos),

  // Eliminar presupuesto
  delete: (id) => api.delete(`/presupuesto/${id}`),
};

// ══════════════════════════════════════════
//  FUNCIONES DE RESUMEN
// ══════════════════════════════════════════

export const resumenService = {
  // Resumen del mes actual o indicado
  getMes: (params) => api.get("/resumen/mes", { params }),

  // Resumen anual
  getAnual: (params) => api.get("/resumen/anual", { params }),
};

export default api;