// exportarCSV.js
// Genera y descarga un archivo CSV desde el navegador (sin tocar el backend).

// Separador ";" y coma decimal: es lo que Excel con configuración regional
// es-AR espera. Con "," abriría todo en una sola columna.
const SEPARADOR = ";";

// Evita inyección de fórmulas: si un texto empieza con = + - @ Excel lo
// ejecutaría como fórmula. Con un apóstrofe al inicio queda como texto.
function sanitizar(valor) {
  const texto = String(valor ?? "");
  return /^[=+\-@]/.test(texto) ? `'${texto}` : texto;
}

// Encierra el campo entre comillas si contiene separador, comillas o saltos de línea.
function escapar(texto) {
  return /[";\n\r]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
}

export function descargarCSV(nombreArchivo, encabezados, filas) {
  const lineas = [encabezados, ...filas].map((fila) =>
    fila.map((celda) => escapar(sanitizar(celda))).join(SEPARADOR)
  );

  // El BOM UTF-8 (﻿) evita que Excel rompa tildes y la ñ.
  const blob = new Blob(["﻿" + lineas.join("\r\n")], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  enlace.click();
  URL.revokeObjectURL(url);
}
