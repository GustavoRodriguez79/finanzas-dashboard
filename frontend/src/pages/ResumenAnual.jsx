// ResumenAnual.jsx
// Página de resumen financiero anual.
// Muestra el balance de los 12 meses, totales anuales
// y gastos por categoría — similar a la hoja "Resumen Anual" del Excel.

import { useState, useEffect } from "react";
import { resumenService } from "../services/api";
import GraficoBarras from "../components/charts/GraficoBarras";
import GraficoTorta from "../components/charts/GraficoTorta";
import "./ResumenAnual.css";

const MESES = [
  "", "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

function ResumenAnual() {
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [anio, setAnio] = useState(new Date().getFullYear());

  useEffect(() => {
    cargarResumen();
  }, [anio]);

  const cargarResumen = async () => {
    setCargando(true);
    setError("");
    try {
      const respuesta = await resumenService.getAnual({ anio });
      setResumen(respuesta.data);
    } catch {
      setError("Error al cargar el resumen anual.");
    } finally {
      setCargando(false);
    }
  };

  if (cargando) {
    return (
      <div className="resumen-loading">
        <div className="loading-spinner"></div>
        <p>Cargando resumen anual...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="resumen-error">
        <p>{error}</p>
        <button onClick={cargarResumen}>Reintentar</button>
      </div>
    );
  }

  // Formatea los datos de meses para el gráfico de barras
  const datosMeses = resumen?.meses?.map((m) => ({
    nombre: MESES[m.mes],
    ingresos: m.ingresos,
    gastos: m.gastos,
  })) || [];

  return (
    <div className="resumen-anual">

      {/* Header */}
      <div className="resumen-header">
        <div>
          <h1>📅 Resumen Anual</h1>
          <p className="resumen-subtitle">
            Balance financiero completo del año {anio}
          </p>
        </div>
        <select
          value={anio}
          onChange={(e) => setAnio(Number(e.target.value))}
          className="anio-selector"
        >
          {[2024, 2025, 2026].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Cards totales anuales */}
      <div className="resumen-totales">
        <div className="total-card ingresos">
          <span className="total-label">💰 Ingresos totales</span>
          <span className="total-valor">
            ${resumen?.total_ingresos?.toLocaleString("es-AR", {
              minimumFractionDigits: 2
            })}
          </span>
        </div>
        <div className="total-card gastos">
          <span className="total-label">💸 Gastos totales</span>
          <span className="total-valor">
            ${resumen?.total_gastos?.toLocaleString("es-AR", {
              minimumFractionDigits: 2
            })}
          </span>
        </div>
        <div className={`total-card balance ${resumen?.balance_anual >= 0 ? "positivo" : "negativo"}`}>
          <span className="total-label">⚖️ Balance anual</span>
          <span className="total-valor">
            ${resumen?.balance_anual?.toLocaleString("es-AR", {
              minimumFractionDigits: 2
            })}
          </span>
        </div>
        <div className="total-card ahorro">
          <span className="total-label">🎯 Ahorro anual</span>
          <span className="total-valor">
            {resumen?.porcentaje_ahorro_anual}%
          </span>
        </div>
      </div>

      {/* Mes más caro y más económico */}
      <div className="resumen-destacados">
        <div className="destacado-card caro">
          <span className="destacado-label">📈 Mes más caro</span>
          <span className="destacado-mes">
            {resumen?.mes_mas_caro
              ? MESES[resumen.mes_mas_caro.mes]
              : "Sin datos"}
          </span>
          {resumen?.mes_mas_caro && (
            <span className="destacado-monto">
              ${resumen.mes_mas_caro.gastos?.toLocaleString("es-AR", {
                minimumFractionDigits: 2
              })}
            </span>
          )}
        </div>
        <div className="destacado-card economico">
          <span className="destacado-label">📉 Mes más económico</span>
          <span className="destacado-mes">
            {resumen?.mes_mas_economico
              ? MESES[resumen.mes_mas_economico.mes]
              : "Sin datos"}
          </span>
          {resumen?.mes_mas_economico && (
            <span className="destacado-monto">
              ${resumen.mes_mas_economico.gastos?.toLocaleString("es-AR", {
                minimumFractionDigits: 2
              })}
            </span>
          )}
        </div>
      </div>

      {/* Gráfico de evolución mensual */}
      <div className="resumen-grafico-card">
        <h2>Evolución mensual — Ingresos vs Gastos</h2>
        <GraficoBarras datos={datosMeses} />
      </div>

      {/* Gráfico torta y tabla de categorías */}
      <div className="resumen-bottom">
        <div className="resumen-grafico-card">
          <h2>Gastos por categoría</h2>
          <GraficoTorta datos={resumen?.gastos_por_categoria || []} />
        </div>

        <div className="resumen-grafico-card">
          <h2>Detalle por categoría</h2>
          <div className="categorias-tabla">
            {resumen?.gastos_por_categoria?.map((cat, i) => (
              <div key={i} className="categoria-fila">
                <span className="categoria-nombre">{cat.categoria}</span>
                <span className="categoria-porcentaje">{cat.porcentaje}%</span>
                <span className="categoria-monto">
                  ${cat.total?.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabla mes a mes */}
      <div className="resumen-grafico-card">
        <h2>Detalle mes a mes</h2>
        <div className="meses-tabla-container">
          <table className="meses-tabla">
            <thead>
              <tr>
                <th>Mes</th>
                <th>Ingresos</th>
                <th>Gastos</th>
                <th>Balance</th>
                <th>% Ahorro</th>
              </tr>
            </thead>
            <tbody>
              {resumen?.meses?.map((m) => (
                <tr key={m.mes}>
                  <td>{MESES[m.mes]}</td>
                  <td className="monto-positivo">
                    ${m.ingresos?.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
                  </td>
                  <td className="monto-negativo">
                    ${m.gastos?.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
                  </td>
                  <td className={m.balance >= 0 ? "monto-positivo" : "monto-negativo"}>
                    ${m.balance?.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
                  </td>
                  <td style={{ color: "var(--warning)" }}>
                    {m.porcentaje_ahorro}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

export default ResumenAnual;