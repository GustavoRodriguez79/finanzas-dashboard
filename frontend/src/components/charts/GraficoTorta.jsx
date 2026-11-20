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

// Paleta categórica (variables de index.css: cambian solas con el tema). Son 6 colores
// validados; más categorías se agrupan en "Otras" en gris, nunca se inventa un color nuevo
const COLORES = [
  "var(--cat-1)", "var(--cat-2)", "var(--cat-3)",
  "var(--cat-4)", "var(--cat-5)", "var(--cat-6)"
];
const COLOR_OTRAS = "var(--fg-3)";

// Deja las categorías con más gasto y suma el resto en "Otras". Si el resto es una sola
// categoría conserva su nombre (llamarla "Otras" sería engañoso)
function agruparCategorias(items) {
  const ordenados = [...items].sort((a, b) => b.value - a.value);
  const principales = ordenados.slice(0, COLORES.length);
  const resto = ordenados.slice(COLORES.length);
  if (resto.length === 0) return principales;
  return [
    ...principales,
    {
      name: resto.length === 1 ? resto[0].name : "Otras",
      value: resto.reduce((suma, i) => suma + i.value, 0),
      detalle: resto.length > 1 ? resto.map((i) => i.name).join(", ") : null,
      esOtras: true,
    },
  ];
}

// Definido a nivel de módulo (no dentro de GraficoTorta): un componente creado
// dentro de otro se recrea en cada render y pierde su estado.
// Formato personalizado del tooltip
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: "var(--bg-2)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "10px 14px",
        fontSize: "0.85rem",
        color: "var(--text)"
      }}>
        <p style={{ fontWeight: 700 }}>{payload[0].name}</p>
        {/* El valor va en tinta de texto, no en el color de la serie */}
        <p style={{ fontFamily: '"Space Grotesk", sans-serif', fontVariantNumeric: "tabular-nums" }}>
          ${payload[0].value.toLocaleString("es-AR", {
            minimumFractionDigits: 2
          })}
        </p>
        {payload[0].payload.detalle && (
          <p style={{ color: "var(--fg-3)", fontSize: "0.75rem" }}>
            {payload[0].payload.detalle}
          </p>
        )}
      </div>
    );
  }
  return null;
};

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
  const datosFormateados = agruparCategorias(
    datos.map((item) => ({ name: item.categoria, value: item.total }))
  );

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
          stroke="var(--bg-2)"   // separación con el color de la superficie, no el blanco por defecto
          strokeWidth={2}
        >
          {datosFormateados.map((item, index) => (
            <Cell
              key={`cell-${index}`}
              fill={item.esOtras ? COLOR_OTRAS : COLORES[index]}
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