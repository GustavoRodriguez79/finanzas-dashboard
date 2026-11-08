// useAuth.js
// Hook para usar el contexto de autenticación en cualquier componente:
// const { usuario, login, logout } = useAuth();

import { useContext } from "react";
import { AuthContext } from "../context/AuthContextValue";

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return context;
}
