// Gastos.jsx
// Página para gestionar los gastos del usuario.
// Los gastos se anulan en vez de eliminarse — criterio bancario.

import { useState, useEffect } from "react";
import { gastosService } from "../services/api";
import "./Transacciones.css";

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

  useEffect(() => {
    cargarGastos();
  }, [filtroMes, filtroAnio, filtroCategoria]);

  const cargarGastos = async () => {
    setCargando(true);
    try {
      const params = { mes: filtroMes, anio: filtroAnio };
      if (filtroCategoria) params.categoria = filtroCategoria;
      const respuesta = await gastosService.getAll(params);
      setGastos(respuesta.data);
    } catch {
      setError("Error al cargar gastos.");
    } finally {
      setCargando(false);
    }
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
      cargarGastos();
    } catch {
      setError("Error al crear el gasto.");
    }
  };

  const handleAnular = async (id) => {
    if (!confirm("¿Anular este gasto? El registro se mantendrá en el historial.")) return;
    try {
      await gastosService.anular(id);
      cargarGastos();
    } catch {
      setError("Error al anular el gasto.");
    }
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
        <select value={filtroMes} onChange={(e) => setFiltroMes(Number(e.target.value))}>
          {MESES.slice(1).map((nombre, i) => (
            <option key={i + 1} value={i + 1}>{nombre}</option>
          ))}
        </select>
        <select value={filtroAnio} onChange={(e) => setFiltroAnio(Number(e.target.value))}>
          {[2024, 2025, 2026].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
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
        <div className="tabla-vacia">
          No hay gastos registrados para este período.
        </div>
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
    </div>
  );
}

export default Gastos;