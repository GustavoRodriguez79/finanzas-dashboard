// AuthContext.jsx
// Contexto global de autenticación.
// Provee el estado del usuario y funciones de login/logout
// a todos los componentes sin necesidad de pasar props manualmente.

import { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../services/api";

// Crea el contexto — valor inicial vacío
const AuthContext = createContext(null);

// ─── Provider ───
// Envuelve toda la app y provee el estado de autenticación
export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true); // true mientras verifica si hay sesión activa

  // Al montar el componente verifica si hay una sesión activa
  // Si hay token en localStorage intenta obtener los datos del usuario
  useEffect(() => {
    const verificarSesion = async () => {
      const token = localStorage.getItem("access_token");
      if (token) {
        try {
          const respuesta = await authService.getMe();
          setUsuario(respuesta.data);
        } catch {
          // Token inválido o expirado — limpia el storage
          localStorage.clear();
        }
      }
      setCargando(false);
    };
    verificarSesion();
  }, []);

  // ─── Login con email y contraseña ───
  const login = async (email, password) => {
    const respuesta = await authService.login({ email, password });
    const { access_token, refresh_token, usuario: userData } = respuesta.data;

    // Guarda los tokens en localStorage
    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    setUsuario(userData);
    return userData;
  };

  // ─── Login con Google OAuth ───
  const loginGoogle = async (googleToken) => {
    const respuesta = await authService.loginGoogle(googleToken);
    const { access_token, refresh_token, usuario: userData } = respuesta.data;

    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    setUsuario(userData);
    return userData;
  };

  // ─── Registro ───
  const register = async (nombre, email, password) => {
    const respuesta = await authService.register({ nombre, email, password });
    const { access_token, refresh_token, usuario: userData } = respuesta.data;

    localStorage.setItem("access_token", access_token);
    localStorage.setItem("refresh_token", refresh_token);
    setUsuario(userData);
    return userData;
  };

  // ─── Logout ───
  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem("refresh_token");
      if (refreshToken) {
        // Invalida el refresh token en el servidor
        await authService.logout(refreshToken);
      }
    } catch {
      // Si falla el logout del servidor igual limpiamos localmente
    } finally {
      localStorage.clear();
      setUsuario(null);
    }
  };

  // Valor que se comparte con todos los componentes hijos
  const value = {
    usuario,        // datos del usuario autenticado o null
    cargando,       // true mientras verifica la sesión inicial
    login,
    loginGoogle,
    register,
    logout,
    isAuthenticated: !!usuario  // true si hay usuario logueado
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook personalizado ───
// Permite usar el contexto fácilmente en cualquier componente:
// const { usuario, login, logout } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}