// GraficoBarras.jsx
// Gráfico de barras para comparar ingresos y gastos
// entre el mes actual y el mes anterior.

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

function GraficoBarras({ datos }) {
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

  // Formato personalizado del tooltip
  const CustomTooltip = ({ active, payload, label }) => {
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
          <p style={{ fontWeight: 700, marginBottom: 6 }}>{label}</p>
          {payload.map((entry, i) => (
            <p key={i} style={{ color: entry.color }}>
              {entry.name}: ${entry.value.toLocaleString("es-AR", {
                minimumFractionDigits: 2
              })}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Formatea los números en el eje Y
  const formatearEje = (valor) => {
    if (valor >= 1000000) return `$${(valor / 1000000).toFixed(1)}M`;
    if (valor >= 1000) return `$${(valor / 1000).toFixed(0)}K`;
    return `$${valor}`;
  };

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart
        data={datos}
        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
        barCategoryGap="30%"
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="var(--border)"
          vertical={false}
        />
        <XAxis
          dataKey="nombre"
          tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={formatearEje}
          tick={{ fill: "var(--text-secondary)", fontSize: 11 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          formatter={(value) => (
            <span style={{ color: "var(--text-secondary)", fontSize: "0.82rem" }}>
              {value}
            </span>
          )}
        />
        <Bar
          dataKey="ingresos"
          name="Ingresos"
          fill="#00E676"
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="gastos"
          name="Gastos"
          fill="#f87171"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export default GraficoBarras;