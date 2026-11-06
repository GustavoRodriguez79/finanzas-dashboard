// components/Topbar.jsx
import { useTheme } from "../context/ThemeContext";

export default function Topbar({ title, onMenuClick }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="topbar">
      <button
        className="topbar-hamburger"
        onClick={onMenuClick}
        aria-label="Menú"
      >
        ☰
      </button>

      <span className="topbar-title">{title}</span>

      <div className="topbar-right">
        <div className="theme-toggle">
          <button
            className={`theme-btn ${theme === "dark" ? "active" : ""}`}
            onClick={() => theme !== "dark" && toggleTheme()}
            title="Tema oscuro"
          >
            🌙
          </button>
          <button
            className={`theme-btn ${theme === "light" ? "active" : ""}`}
            onClick={() => theme !== "light" && toggleTheme()}
            title="Tema claro"
          >
            ☀️
          </button>
        </div>
      </div>
    </header>
  );
}
