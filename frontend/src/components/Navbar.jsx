// Navbar.jsx
// Barra de navegación principal del dashboard.
// Muestra el nombre del usuario, links de navegación y botón de logout.
// Se oculta en las páginas de login y registro.

import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";
import "./Navbar.css";

function Navbar() {
  const { usuario, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [menuAbierto, setMenuAbierto] = useState(false);

  // No muestra la navbar en login y registro
  if (!usuario) return null;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  // Links de navegación principal
  const links = [
    { path: "/dashboard", label: "📊 Dashboard" },
    { path: "/ingresos", label: "💰 Ingresos" },
    { path: "/gastos", label: "💸 Gastos" },
    { path: "/presupuesto", label: "🎯 Presupuesto" },
    { path: "/resumen", label: "📅 Resumen anual" },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/dashboard">💹 Finanzas</Link>
      </div>

      {/* Links de navegación — desktop */}
      <ul className="navbar-links">
        {links.map((link) => (
          <li key={link.path}>
            <Link
              to={link.path}
              className={location.pathname === link.path ? "active" : ""}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>

      {/* Usuario y logout */}
      <div className="navbar-user">
        {usuario.avatar_url && (
          <img
            src={usuario.avatar_url}
            alt="avatar"
            className="navbar-avatar"
          />
        )}
        <span className="navbar-nombre">{usuario.nombre}</span>
        <button className="btn-logout" onClick={handleLogout}>
          Salir
        </button>
      </div>

      {/* Botón hamburguesa — mobile */}
      <button
        className="navbar-hamburger"
        onClick={() => setMenuAbierto(!menuAbierto)}
      >
        ☰
      </button>

      {/* Menú mobile */}
      {menuAbierto && (
        <div className="navbar-mobile">
          {links.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={location.pathname === link.path ? "active" : ""}
              onClick={() => setMenuAbierto(false)}
            >
              {link.label}
            </Link>
          ))}
          <button className="btn-logout" onClick={handleLogout}>
            Salir
          </button>
        </div>
      )}
    </nav>
  );
}

export default Navbar;