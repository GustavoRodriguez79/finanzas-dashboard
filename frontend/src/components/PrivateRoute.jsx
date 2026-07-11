// PrivateRoute.jsx
// Componente que protege las rutas privadas.
// Si el usuario no está autenticado lo redirige al login.
// Se usa en App.jsx envolviendo las rutas que requieren sesión.

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function PrivateRoute({ children }) {
  const { usuario, cargando } = useAuth();

  // Mientras verifica la sesión muestra un loader
  // Evita el flash de redirección al login en el primer render
  if (cargando) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "var(--bg)",
        color: "var(--primary)",
        fontSize: "1.2rem"
      }}>
        Cargando...
      </div>
    );
  }

  // Si no hay usuario redirige al login
  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  // Si hay usuario renderiza el componente hijo
  return children;
}

export default PrivateRoute;