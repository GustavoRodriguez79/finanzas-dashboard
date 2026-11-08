// exportarPDF.js
// Genera y descarga el reporte de gastos en PDF desde el navegador (sin tocar el backend).
// jspdf y jspdf-autotable se cargan con import() dinámico: pesan bastante y solo
// los necesita quien exporta, así que no deben engordar el bundle inicial.

const NOMBRES_MES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

// Mismo formato que se ve en pantalla: miles con punto y siempre 2 decimales
function formatearMonto(valor) {
  return `$${Number(valor).toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
}

export async function exportarGastosPDF({ gastos, mes, anio, totalMes }) {
  const { jsPDF } = await import("jspdf");
  // En jspdf-autotable v5 importar el paquete ya no agrega doc.autoTable:
  // hay que llamar a la función autoTable(doc, opciones) directamente.
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF();

  // Encabezado
  doc.setFontSize(18);
  doc.setTextColor(40, 40, 40);
  doc.text("FinanzasApp — Reporte de Gastos", 14, 20);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`${NOMBRES_MES[mes - 1]} ${anio}`, 14, 28);
  doc.text(`Total: ${formatearMonto(totalMes)}`, 14, 35);

  // Tabla de gastos
  autoTable(doc, {
    startY: 42,
    head: [["Fecha", "Descripción", "Categoría", "Subcategoría", "Monto"]],
    body: gastos.map((g) => [
      g.fecha,
      g.descripcion || "-",
      g.categoria,
      g.subcategoria || "-",
      formatearMonto(g.monto)
    ]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [34, 197, 94] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    // El monto va alineado a la derecha para que los importes se lean en columna
    columnStyles: { 4: { halign: "right" } }
  });

  // Pie de página: se escribe al final porque recién ahí se sabe el total de páginas
  const totalPaginas = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Página ${i} de ${totalPaginas} — generado por FinanzasApp`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  doc.save(`reporte-finanzas-${String(mes).padStart(2, "0")}-${anio}.pdf`);
}
