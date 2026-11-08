// Gastos.jsx
// Página para gestionar los gastos del usuario.
// Los gastos se anulan en vez de eliminarse — criterio bancario.

import { useState, useEffect } from "react";
import { gastosService } from "../services/api";
import "./Transacciones.css";
import "./Gastos.css";
import EstadoVacio from "../components/EstadoVacio";
import { ANIOS_HISTORICOS } from "../utils/anios";
import { descargarCSV } from "../utils/exportarCSV";

const CATEGORIAS = [
  "Vivienda", "Alimentación", "Transporte", "Salud",
  "Educación", "Ropa", "Entretenimiento", "Finanzas",
  "Tecnología", "Varios"
];

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function Gastos() {
  const [gastos, setGastos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState("");
  const [mostrarModalPdf, setMostrarModalPdf] = useState(false);

  const hoy = new Date();
  const [filtroMes, setFiltroMes] = useState(hoy.getMonth() + 1);
  const [filtroAnio, setFiltroAnio] = useState(hoy.getFullYear());
  const [filtroCategoria, setFiltroCategoria] = useState("");

  const [form, setForm] = useState({
    descripcion: "",
    monto: "",
    categoria: "Alimentación",
    subcategoria: "",
    fecha: hoy.toISOString().split("T")[0],
    recurrente: false
  });

  // Contador para recargar la lista tras crear o anular un gasto, sin tocar los filtros
  const [recarga, setRecarga] = useState(0);

  // Carga los gastos cuando cambia algún filtro o se pide una recarga.
  // La función vive dentro del efecto (solo se usa acá). El loader lo activan
  // handleFiltro y recargarGastos: setear estado de forma síncrona dentro de un
  // efecto provoca renders en cascada. "cancelado" descarta respuestas de filtros
  // anteriores si el usuario los cambia antes de que llegue la respuesta.
  useEffect(() => {
    let cancelado = false;

    const cargarGastos = async () => {
      try {
        const params = { mes: filtroMes, anio: filtroAnio };
        if (filtroCategoria) params.categoria = filtroCategoria;
        const respuesta = await gastosService.getAll(params);
        if (!cancelado) setGastos(respuesta.data);
      } catch {
        if (!cancelado) setError("Error al cargar gastos.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargarGastos();
    return () => {
      cancelado = true;
    };
  }, [filtroMes, filtroAnio, filtroCategoria, recarga]);

  const recargarGastos = () => {
    setCargando(true);
    setRecarga((n) => n + 1);
  };

  // Cambio de filtro: muestra el loader y aplica el valor (convertir adapta el tipo)
  const handleFiltro = (setter, convertir = (v) => v) => (e) => {
    setCargando(true);
    setter(convertir(e.target.value));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === "checkbox" ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await gastosService.create({
        ...form,
        monto: parseFloat(form.monto)
      });
      setForm({
        descripcion: "",
        monto: "",
        categoria: "Alimentación",
        subcategoria: "",
        fecha: hoy.toISOString().split("T")[0],
        recurrente: false
      });
      setMostrarForm(false);
      recargarGastos();
    } catch {
      setError("Error al crear el gasto.");
    }
  };

  const handleAnular = async (id) => {
    if (!confirm("¿Anular este gasto? El registro se mantendrá en el historial.")) return;
    try {
      await gastosService.anular(id);
      recargarGastos();
    } catch {
      setError("Error al anular el gasto.");
    }
  };

  const handleExportarCSV = () => {
    const mes = String(filtroMes).padStart(2, "0");
    descargarCSV(
      `gastos-${mes}-${filtroAnio}.csv`,
      ["Fecha", "Descripción", "Categoría", "Subcategoría", "Monto"],
      gastos.map((g) => [
        g.fecha,
        g.descripcion || "",
        g.categoria,
        g.subcategoria || "",
        g.monto.toFixed(2).replace(".", ",")
      ])
    );
  };

  const totalMes = gastos.reduce((acc, g) => acc + g.monto, 0);

  return (
    <div className="transacciones-page">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>💸 Gastos</h1>
          <p className="page-subtitle">
            {MESES[filtroMes]} {filtroAnio} —{" "}
            <strong style={{ color: "var(--danger)" }}>
              Total: ${totalMes.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </strong>
          </p>
        </div>
        <button
          className="btn-nuevo"
          onClick={() => setMostrarForm(!mostrarForm)}
        >
          {mostrarForm ? "✕ Cancelar" : "+ Nuevo gasto"}
        </button>
      </div>

      {/* Filtros */}
      <div className="filtros-bar">
        <select value={filtroMes} onChange={handleFiltro(setFiltroMes, Number)}>
          {MESES.slice(1).map((nombre, i) => (
            <option key={i + 1} value={i + 1}>{nombre}</option>
          ))}
        </select>
        <select value={filtroAnio} onChange={handleFiltro(setFiltroAnio, Number)}>
          {ANIOS_HISTORICOS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          value={filtroCategoria}
          onChange={handleFiltro(setFiltroCategoria)}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          className="btn-exportar"
          onClick={handleExportarCSV}
          disabled={cargando || gastos.length === 0}
        >
          📥 Exportar CSV
        </button>
        <button className="gastos-btn-premium" onClick={() => setMostrarModalPdf(true)}>
          📄 Exportar PDF <span className="gastos-premium-chip">✨ Premium</span>
        </button>
      </div>

      {/* Formulario */}
      {mostrarForm && (
        <div className="form-card">
          <h2>Nuevo gasto</h2>
          <form onSubmit={handleSubmit} className="transaccion-form">
            <div className="form-row">
              <div className="form-group">
                <label>Descripción</label>
                <input
                  type="text"
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  placeholder="Ej: Supermercado"
                />
              </div>
              <div className="form-group">
                <label>Monto *</label>
                <input
                  type="number"
                  name="monto"
                  value={form.monto}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Categoría *</label>
                <select name="categoria" value={form.categoria} onChange={handleChange}>
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Subcategoría</label>
                <input
                  type="text"
                  name="subcategoria"
                  value={form.subcategoria}
                  onChange={handleChange}
                  placeholder="Ej: Verdulería"
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Fecha *</label>
                <input
                  type="date"
                  name="fecha"
                  value={form.fecha}
                  onChange={handleChange}
                  required
                />
              </div>
              <div className="form-group" style={{ justifyContent: "flex-end" }}>
                <div className="form-check">
                  <input
                    type="checkbox"
                    id="recurrente"
                    name="recurrente"
                    checked={form.recurrente}
                    onChange={handleChange}
                  />
                  <label htmlFor="recurrente">Gasto recurrente mensual</label>
                </div>
              </div>
            </div>
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="btn-guardar">
              Guardar gasto
            </button>
          </form>
        </div>
      )}

      {/* Tabla */}
      {cargando ? (
        <div className="tabla-loading">Cargando...</div>
      ) : gastos.length === 0 ? (
        // Con categoría filtrada el vacío puede ser solo del filtro, no de la
        // cuenta: ahí un "primer gasto" sería engañoso, mostramos algo neutral.
        filtroCategoria ? (
          <div className="tabla-vacia">
            No hay gastos en esta categoría para el período.
          </div>
        ) : (
          <EstadoVacio
            icono="📊"
            texto="Registrá tu primer gasto y empezá a ver tus patrones de consumo"
            textoBoton={mostrarForm ? undefined : "+ Nuevo gasto"}
            onClick={() => setMostrarForm(true)}
          />
        )
      ) : (
        <div className="tabla-container">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Subcategoría</th>
                <th>Monto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {gastos.map((gasto) => (
                <tr key={gasto.id}>
                  <td>{gasto.fecha}</td>
                  <td>{gasto.descripcion || "-"}</td>
                  <td>
                    <span className="badge badge-gasto">{gasto.categoria}</span>
                  </td>
                  <td>{gasto.subcategoria || "-"}</td>
                  <td className="monto-negativo">
                    ${gasto.monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <button
                      className="btn-eliminar"
                      onClick={() => handleAnular(gasto.id)}
                    >
                      Anular
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Premium: muestra qué traería el PDF, sin bloquear nada */}
      {mostrarModalPdf && (
        <div className="gastos-modal-overlay" onClick={() => setMostrarModalPdf(false)}>
          <div
            className="gastos-modal-premium"
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <button className="gastos-modal-cerrar" onClick={() => setMostrarModalPdf(false)} aria-label="Cerrar">✕</button>
            <div className="gastos-modal-icono">📄</div>
            <h3>Exportar reporte PDF</h3>
            <p>Con Premium podés exportar un reporte completo en PDF con tus gastos, gráficos y resumen mensual.</p>
            <div className="gastos-modal-preview">
              {/* aria-hidden: datos de ejemplo, no deben leerse como reales */}
              <div className="gastos-modal-preview-blur" aria-hidden="true">
                <p>Reporte Noviembre 2026</p>
                <p>Total gastos: $290.000</p>
                <p>Categoría principal: Educación</p>
              </div>
            </div>
            <button className="gastos-modal-cta" disabled>Próximamente</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default Gastos;