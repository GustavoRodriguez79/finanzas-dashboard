// App.jsx
// Componente raíz de la aplicación.
// Configura el router, el proveedor de autenticación
// y define todas las rutas públicas y privadas.

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Navbar from "./components/Navbar";

// Páginas
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Ingresos from "./pages/Ingresos";
import Gastos from "./pages/Gastos";
import Presupuesto from "./pages/Presupuesto";
import ResumenAnual from "./pages/ResumenAnual";

// Google OAuth Client ID — se configura en .env
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          {/* Navbar aparece en todas las páginas — se oculta sola en login/register */}
          <Navbar />
          <Routes>

            {/* Ruta raíz — redirige al dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Rutas públicas — accesibles sin login */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Rutas privadas — requieren autenticación */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/ingresos"
              element={
                <PrivateRoute>
                  <Ingresos />
                </PrivateRoute>
              }
            />
            <Route
              path="/gastos"
              element={
                <PrivateRoute>
                  <Gastos />
                </PrivateRoute>
              }
            />
            <Route
              path="/presupuesto"
              element={
                <PrivateRoute>
                  <Presupuesto />
                </PrivateRoute>
              }
            />
            <Route
              path="/resumen"
              element={
                <PrivateRoute>
                  <ResumenAnual />
                </PrivateRoute>
              }
            />

            {/* Ruta 404 — redirige al dashboard */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />

          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;