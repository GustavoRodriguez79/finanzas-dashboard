// components/Sidebar.jsx
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

// Las rutas coinciden con las de App.jsx (/dashboard y /resumen se mantienen).
// Transacciones queda fuera hasta que exista la página.
const NAV_ITEMS = [
  { to: "/dashboard", icon: "📊", label: "Dashboard" },
  { to: "/ingresos", icon: "💰", label: "Ingresos" },
  { to: "/gastos", icon: "💸", label: "Gastos" },
  { to: "/presupuesto", icon: "🎯", label: "Presupuesto" },
  { to: "/resumen", icon: "📈", label: "Resumen Anual" },
  { to: "/ahorros-usd", icon: "🇺🇸", label: "Ahorros USD" },
];

export default function Sidebar({ isOpen, onClose }) {
  const { usuario, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // logout es async: se espera a que termine para no navegar con la sesión a medio limpiar
  const handleLogout = async () => {
    await logout();
    navigate("/login");
    onClose();
  };

  const inicial = usuario?.nombre
    ? usuario.nombre.charAt(0).toUpperCase()
    : usuario?.email?.charAt(0).toUpperCase() || "?";

  return (
    <>
      <div
        className={`sidebar-overlay ${isOpen ? "open" : ""}`}
        onClick={onClose}
      />

      <aside className={`app-sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-text">💹 FinanzasApp</div>
          <div className="sidebar-logo-sub">Panel de control</div>
        </div>

        <nav className="sidebar-nav">
          <div className="sidebar-section-label">Menú principal</div>

          {NAV_ITEMS.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `sidebar-item ${isActive ? "active" : ""}`
              }
              onClick={onClose}
            >
              <span className="sidebar-icon">{icon}</span>
              <span className="sidebar-label">{label}</span>
            </NavLink>
          ))}

          <div className="sidebar-section-label" style={{ marginTop: "12px" }}>
            Apariencia
          </div>

          <div style={{ padding: "4px 8px" }}>
            <div
              className="theme-toggle"
              style={{
                width: "100%",
                justifyContent: "space-between",
                padding: "6px 12px",
              }}
            >
              <span
                style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}
              >
                {theme === "dark" ? "🌙 Oscuro" : "☀️ Claro"}
              </span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={theme === "light"}
                  onChange={toggleTheme}
                />
                <span className="toggle-slider" />
              </label>
            </div>
          </div>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-avatar">{inicial}</div>
            <div>
              <div className="sidebar-username">
                {usuario?.nombre || usuario?.email?.split("@")[0] || "Usuario"}
              </div>
              <div
                style={{ fontSize: "0.72rem", color: "var(--text-secondary)" }}
              >
                {usuario?.email}
              </div>
            </div>
          </div>
          <button
            className="sidebar-item"
            onClick={handleLogout}
            style={{ color: "var(--danger)" }}
          >
            <span className="sidebar-icon">🚪</span>
            <span className="sidebar-label">Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
