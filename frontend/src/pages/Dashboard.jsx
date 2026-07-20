// Dashboard.jsx
// Página principal del dashboard financiero.
// Muestra el resumen del mes: ingresos, gastos, balance,
// % ahorro, gráficos y alertas de presupuesto.

import { useState, useEffect } from "react";
import { resumenService } from "../services/api";
import { useAuth } from "../context/AuthContext";
import GraficoTorta from "../components/charts/GraficoTorta";
import GraficoBarras from "../components/charts/GraficoBarras";
import "./Dashboard.css";

function Dashboard() {
  const { usuario } = useAuth();
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Mes y año actual
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());

  const MESES = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  // Carga el resumen cuando cambia el mes o año
  useEffect(() => {
    cargarResumen();
  }, [mes, anio]);

  const cargarResumen = async () => {
    setCargando(true);
    setError("");
    try {
      const respuesta = await resumenService.getMes({ mes, anio });
      setResumen(respuesta.data);
    } catch {
      setError("Error al cargar el resumen. Verificá tu conexión.");
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button onClick={cargarResumen} className="btn-retry">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">

      {/* Header con saludo y selector de período */}
      <div className="dashboard-header">
        <div>
          <h1>Hola, {usuario?.nombre?.split(" ")[0]} 👋</h1>
          <p className="dashboard-subtitle">
            Resumen financiero de {MESES[mes]} {anio}
          </p>
        </div>
        <div className="periodo-selector">
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
          >
            {MESES.slice(1).map((nombre, i) => (
              <option key={i + 1} value={i + 1}>{nombre}</option>
            ))}
          </select>
          <select
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
          >
            {[2024, 2025, 2026].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards de métricas principales */}
      <div className="dashboard-cards">
        <div className="metric-card ingresos">
          <span className="metric-label">💰 Ingresos</span>
          <span className="metric-valor">
            ${resumen?.total_ingresos?.toLocaleString("es-AR", {
              minimumFractionDigits: 2
            })}
          </span>
        </div>
        <div className="metric-card gastos">
          <span className="metric-label">💸 Gastos</span>
          <span className="metric-valor">
            ${resumen?.total_gastos?.toLocaleString("es-AR", {
              minimumFractionDigits: 2
            })}
          </span>
        </div>
        <div className={`metric-card balance ${resumen?.balance >= 0 ? "positivo" : "negativo"}`}>
          <span className="metric-label">⚖️ Balance</span>
          <span className="metric-valor">
            ${resumen?.balance?.toLocaleString("es-AR", {
              minimumFractionDigits: 2
            })}
          </span>
        </div>
        <div className="metric-card ahorro">
          <span className="metric-label">🎯 Ahorro</span>
          <span className="metric-valor">
            {resumen?.porcentaje_ahorro}%
          </span>
        </div>
      </div>

      {/* Alertas de presupuesto */}
      {resumen?.alertas_presupuesto?.length > 0 && (
        <div className="dashboard-alertas">
          <h2>⚠️ Alertas de presupuesto</h2>
          <div className="alertas-grid">
            {resumen.alertas_presupuesto.map((alerta, i) => (
              <div
                key={i}
                className={`alerta-card ${alerta.superado ? "superado" : "advertencia"}`}
              >
                <span className="alerta-categoria">{alerta.categoria}</span>
                <span className="alerta-porcentaje">{alerta.porcentaje}%</span>
                <span className="alerta-detalle">
                  ${alerta.gastado.toLocaleString("es-AR")} de ${alerta.limite.toLocaleString("es-AR")}
                </span>
                <div className="alerta-barra">
                  <div
                    className="alerta-progreso"
                    style={{ width: `${Math.min(alerta.porcentaje, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="dashboard-graficos">
        <div className="grafico-card">
          <h2>Gastos por categoría</h2>
          <GraficoTorta
            datos={resumen?.gastos_por_categoria || []}
          />
        </div>
        <div className="grafico-card">
          <h2>Comparativa con mes anterior</h2>
          <GraficoBarras
            datos={[
              {
                nombre: "Mes anterior",
                ingresos: resumen?.comparativa?.ingresos_mes_anterior || 0,
                gastos: resumen?.comparativa?.gastos_mes_anterior || 0,
              },
              {
                nombre: MESES[mes],
                ingresos: resumen?.total_ingresos || 0,
                gastos: resumen?.total_gastos || 0,
              }
            ]}
          />
        </div>
      </div>

      {/* Proyección y categoría top */}
      <div className="dashboard-extra">
        <div className="extra-card">
          <span className="extra-label">📈 Proyección del mes</span>
          <span className="extra-valor">
            ${resumen?.proyeccion_gasto_mes?.toLocaleString("es-AR", {
              minimumFractionDigits: 2
            })}
          </span>
        </div>
        <div className="extra-card">
          <span className="extra-label">🏆 Categoría top</span>
          <span className="extra-valor">
            {resumen?.categoria_top?.categoria}
          </span>
          <span className="extra-sub">
            ${resumen?.categoria_top?.total?.toLocaleString("es-AR", {
              minimumFractionDigits: 2
            })}
          </span>
        </div>
      </div>

    </div>
  );
}

export default Dashboard;