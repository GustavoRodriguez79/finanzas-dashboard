// Perfil.jsx
// Página de perfil: foto, nombre, email y proveedor de la cuenta, estadísticas
// de uso y un adelanto de la función Premium de alertas por email.

import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { authService } from "../services/api";
import "./Perfil.css";

// Días completos desde el registro. created_at llega en ISO 8601 desde el backend;
// el replace cubre el formato antiguo con espacio. Math.max evita negativos si el
// reloj del servidor va unas horas adelantado.
function diasDesde(fechaTexto) {
  const registro = new Date(String(fechaTexto).replace(" ", "T"));
  if (Number.isNaN(registro.getTime())) return null;
  const dias = Math.floor((new Date() - registro) / (1000 * 60 * 60 * 24));
  return Math.max(dias, 0);
}

function textoDias(dias) {
  if (dias === null) return "—";
  if (dias === 0) return "Registrado hoy";
  return `Registrado hace ${dias} ${dias === 1 ? "día" : "días"}`;
}

function Perfil() {
  const { usuario } = useAuth();
  const [stats, setStats] = useState(null);
  const [errorStats, setErrorStats] = useState(false);
  // Si la foto falla al cargar (p. ej. Google bloquea el hotlink) se muestra la inicial
  const [fotoFallida, setFotoFallida] = useState(false);

  useEffect(() => {
    let cancelado = false;

    const cargarEstadisticas = async () => {
      try {
        const respuesta = await authService.estadisticasUsuario();
        if (!cancelado) setStats(respuesta.data);
      } catch {
        if (!cancelado) setErrorStats(true);
      }
    };

    cargarEstadisticas();
    return () => {
      cancelado = true;
    };
  }, []);

  const inicial = usuario?.nombre
    ? usuario.nombre.charAt(0).toUpperCase()
    : usuario?.email?.charAt(0).toUpperCase() || "?";
  const esGoogle = usuario?.proveedor === "google";
  const mostrarFoto = usuario?.avatar_url && !fotoFallida;

  // Mientras cargan (o si fallan) las estadísticas se muestra un guion
  const valor = (n) => (stats ? n : "—");

  return (
    <div className="perfil-page">

      {/* Card superior: identidad */}
      <section className="perfil-card perfil-identidad">
        {mostrarFoto ? (
          <img
            src={usuario.avatar_url}
            alt={usuario.nombre}
            referrerPolicy="no-referrer"
            className="perfil-foto"
            onError={() => setFotoFallida(true)}
          />
        ) : (
          <div className="perfil-foto perfil-foto-inicial">{inicial}</div>
        )}
        <div className="perfil-datos">
          <h1 className="perfil-nombre">{usuario?.nombre}</h1>
          <p className="perfil-email">{usuario?.email}</p>
          <span className={`perfil-badge ${esGoogle ? "google" : "email"}`}>
            {esGoogle ? "Google" : "Email"}
          </span>
        </div>
      </section>

      {/* Estadísticas de uso */}
      <section className="perfil-stats">
        <div className="perfil-stat">
          <span className="perfil-stat-icono">📅</span>
          <span className="perfil-stat-valor">{textoDias(diasDesde(usuario?.created_at))}</span>
        </div>
        <div className="perfil-stat">
          <span className="perfil-stat-icono">💳</span>
          <span className="perfil-stat-valor">
            {valor(stats?.total_transacciones)} transacciones registradas
          </span>
        </div>
        <div className="perfil-stat">
          <span className="perfil-stat-icono">💰</span>
          <span className="perfil-stat-valor">
            {valor(stats?.total_ingresos)} ingresos · {valor(stats?.total_gastos)} gastos
          </span>
        </div>
      </section>
      {errorStats && (
        <p className="perfil-error">No pudimos cargar tus estadísticas. Probá de nuevo más tarde.</p>
      )}

      {/* Adelanto Premium: se muestra qué se obtendría, sin bloquear nada */}
      <section className="perfil-card perfil-premium">
        <div className="perfil-premium-header">
          <h2>📧 Alertas por email</h2>
          <span className="perfil-chip">✨ Premium</span>
        </div>
        <p className="perfil-premium-texto">
          Recibí un resumen mensual automático con tus gastos, ahorros y
          proyecciones directo en tu email.
        </p>
        <button className="perfil-btn-proximamente" disabled>
          Próximamente
        </button>
      </section>

    </div>
  );
}

export default Perfil;
