// GraficoTorta.jsx
// Gráfico de torta para mostrar gastos por categoría.
// Usa Recharts — librería de gráficos para React.

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

// Colores para cada categoría
const COLORES = [
  "#00E676", "#38bdf8", "#fbbf24", "#f87171",
  "#a78bfa", "#34d399", "#fb923c", "#e879f9",
  "#22d3ee", "#4ade80"
];

function GraficoTorta({ datos }) {
  // Si no hay datos muestra un mensaje
  if (!datos || datos.length === 0) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: 250,
        color: "var(--text-secondary)",
        fontSize: "0.9rem"
      }}>
        Sin datos para mostrar
      </div>
    );
  }

  // Formatea los datos para Recharts
  const datosFormateados = datos.map((item) => ({
    name: item.categoria,
    value: item.total,
  }));

  // Formato personalizado del tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          background: "var(--card)",
          border: "1px solid var(--border)",
          borderRadius: 8,
          padding: "10px 14px",
          fontSize: "0.85rem",
          color: "var(--text)"
        }}>
          <p style={{ fontWeight: 700 }}>{payload[0].name}</p>
          <p style={{ color: "var(--primary)" }}>
            ${payload[0].value.toLocaleString("es-AR", {
              minimumFractionDigits: 2
            })}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie
          data={datosFormateados}
          cx="50%"
          cy="50%"
          innerRadius={60}   // Donut chart — más moderno que torta llena
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
        >
          {datosFormateados.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORES[index % COLORES.length]}
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
              {value}
            </span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default GraficoTorta;