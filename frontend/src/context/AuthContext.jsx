// AuthContext.jsx
// Contexto global de autenticación.
// Provee el estado del usuario y funciones de login/logout
// a todos los componentes sin necesidad de pasar props manualmente.

import { useState, useEffect, useCallback } from "react";
import { authService } from "../services/api";
import { AuthContext } from "./AuthContextValue";

// El hook useAuth vive en hooks/useAuth.js (ver AuthContextValue.js para el porqué)

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

  // ─── Onboarding completado ───
  // Avisa al backend y actualiza el usuario en memoria para que la UI
  // lo refleje sin tener que volver a pedir /auth/me.
  // useCallback: mantiene la misma referencia entre renders, así los
  // efectos que la usan no se vuelven a ejecutar sin necesidad.
  const completarOnboarding = useCallback(async () => {
    await authService.completarOnboarding();
    setUsuario((actual) =>
      actual ? { ...actual, onboarding_completado: true } : actual
    );
  }, []);

  // Valor que se comparte con todos los componentes hijos
  const value = {
    usuario,        // datos del usuario autenticado o null
    cargando,       // true mientras verifica la sesión inicial
    login,
    loginGoogle,
    register,
    logout,
    completarOnboarding,
    isAuthenticated: !!usuario  // true si hay usuario logueado
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
