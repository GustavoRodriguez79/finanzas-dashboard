// App.jsx
// Componente raíz de la aplicación.
// Configura el router, los proveedores (Google, tema y autenticación)
// y define todas las rutas públicas y privadas.
// El layout con Sidebar + Topbar se aplica solo a las páginas privadas.

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { useState } from "react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ThemeProvider } from "./context/ThemeContext";
import PrivateRoute from "./components/PrivateRoute";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";

// Páginas
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Ingresos from "./pages/Ingresos";
import Gastos from "./pages/Gastos";
import Presupuesto from "./pages/Presupuesto";
import ResumenAnual from "./pages/ResumenAnual";
import AhorrosUSD from "./pages/AhorrosUSD";
import Perfil from "./pages/Perfil";

// Google OAuth Client ID — se configura en .env
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "";

// Título que muestra la Topbar según la ruta actual
const PAGE_TITLES = {
  "/dashboard": "Dashboard",
  "/ingresos": "Ingresos",
  "/gastos": "Gastos",
  "/presupuesto": "Presupuesto",
  "/resumen": "Resumen Anual",
  "/ahorros-usd": "Ahorros USD 🇺🇸",
  "/perfil": "Perfil",
};

// Envuelve las páginas privadas con Sidebar + Topbar.
// Login y registro se muestran sin layout. Mientras se verifica la sesión
// (cargando) tampoco: en ese caso PrivateRoute muestra su propio loader.
function AppShell({ children }) {
  const { usuario, cargando } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const esPublica = ["/login", "/register"].includes(location.pathname);
  if (esPublica || cargando || !usuario) return children;

  const pageTitle = PAGE_TITLES[location.pathname] || "FinanzasApp";

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="app-content">
        <Topbar title={pageTitle} onMenuClick={() => setSidebarOpen(true)} />
        <main style={{ flex: 1 }}>{children}</main>
      </div>
    </div>
  );
}

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppShell>
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

                <Route
                  path="/ahorros-usd"
                  element={
                    <PrivateRoute>
                      <AhorrosUSD />
                    </PrivateRoute>
                  }
                />

                <Route
                  path="/perfil"
                  element={
                    <PrivateRoute>
                      <Perfil />
                    </PrivateRoute>
                  }
                />

                {/* Ruta 404 — redirige al dashboard */}
                <Route path="*" element={<Navigate to="/dashboard" replace />} />

              </Routes>
            </AppShell>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
