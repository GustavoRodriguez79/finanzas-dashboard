// anios.js
// Años para los selectores de período. Se calculan a partir del año actual
// para no tener que editar el código cada enero.

const anioActual = new Date().getFullYear();

// Los dos años anteriores y el actual: filtros de datos ya registrados
// (dashboard, ingresos, gastos y resumen anual).
export const ANIOS_HISTORICOS = [anioActual - 2, anioActual - 1, anioActual];

// Año anterior, actual y siguiente: los presupuestos se planifican hacia
// adelante (en diciembre se arma el de enero).
export const ANIOS_CON_PROXIMO = [anioActual - 1, anioActual, anioActual + 1];
