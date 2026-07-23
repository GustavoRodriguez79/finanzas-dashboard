// Presupuesto.jsx
// Página para gestionar presupuestos mensuales por categoría.
// Muestra el estado de cada presupuesto con alertas visuales
// cuando el gasto supera el 80% del límite definido.

import { useState, useEffect } from "react";
import { presupuestoService } from "../services/api";
import "./Transacciones.css";
import "./Presupuesto.css";

const CATEGORIAS = [
  "Vivienda", "Alimentación", "Transporte", "Salud",
  "Educación", "Ropa", "Entretenimiento", "Finanzas",
  "Tecnología", "Varios"
];

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function Presupuesto() {
  const [presupuestos, setPresupuestos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState("");

  const hoy = new Date();
  const [filtroMes, setFiltroMes] = useState(hoy.getMonth() + 1);
  const [filtroAnio, setFiltroAnio] = useState(hoy.getFullYear());

  const [form, setForm] = useState({
    categoria: "Alimentación",
    monto_limite: "",
    mes: hoy.getMonth() + 1,
    anio: hoy.getFullYear()
  });

  useEffect(() => {
    cargarPresupuestos();
  }, [filtroMes, filtroAnio]);

  const cargarPresupuestos = async () => {
    setCargando(true);
    try {
      const respuesta = await presupuestoService.getAll({
        mes: filtroMes,
        anio: filtroAnio
      });
      setPresupuestos(respuesta.data);
    } catch {
      setError("Error al cargar presupuestos.");
    } finally {
      setCargando(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await presupuestoService.create({
        ...form,
        monto_limite: parseFloat(form.monto_limite),
        mes: parseInt(form.mes),
        anio: parseInt(form.anio)
      });
      setForm({
        categoria: "Alimentación",
        monto_limite: "",
        mes: hoy.getMonth() + 1,
        anio: hoy.getFullYear()
      });
      setMostrarForm(false);
      cargarPresupuestos();
    } catch {
      setError("Error al guardar el presupuesto.");
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm("¿Eliminar este presupuesto?")) return;
    try {
      await presupuestoService.delete(id);
      cargarPresupuestos();
    } catch {
      setError("Error al eliminar el presupuesto.");
    }
  };

  return (
    <div className="transacciones-page">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>🎯 Presupuesto</h1>
          <p className="page-subtitle">
            {MESES[filtroMes]} {filtroAnio} — Límites de gasto por categoría
          </p>
        </div>
        <button
          className="btn-nuevo"
          onClick={() => setMostrarForm(!mostrarForm)}
        >
          {mostrarForm ? "✕ Cancelar" : "+ Nuevo presupuesto"}
        </button>
      </div>

      {/* Filtros */}
      <div className="filtros-bar">
        <select
          value={filtroMes}
          onChange={(e) => setFiltroMes(Number(e.target.value))}
        >
          {MESES.slice(1).map((nombre, i) => (
            <option key={i + 1} value={i + 1}>{nombre}</option>
          ))}
        </select>
        <select
          value={filtroAnio}
          onChange={(e) => setFiltroAnio(Number(e.target.value))}
        >
          {[2024, 2025, 2026].map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Formulario */}
      {mostrarForm && (
        <div className="form-card">
          <h2>Nuevo presupuesto</h2>
          <form onSubmit={handleSubmit} className="transaccion-form">
            <div className="form-row">
              <div className="form-group">
                <label>Categoría *</label>
                <select
                  name="categoria"
                  value={form.categoria}
                  onChange={handleChange}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Límite mensual *</label>
                <input
                  type="number"
                  name="monto_limite"
                  value={form.monto_limite}
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
                <label>Mes *</label>
                <select name="mes" value={form.mes} onChange={handleChange}>
                  {MESES.slice(1).map((nombre, i) => (
                    <option key={i + 1} value={i + 1}>{nombre}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Año *</label>
                <select name="anio" value={form.anio} onChange={handleChange}>
                  {[2024, 2025, 2026].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="btn-guardar">
              Guardar presupuesto
            </button>
          </form>
        </div>
      )}

      {/* Grid de presupuestos */}
      {cargando ? (
        <div className="tabla-loading">Cargando...</div>
      ) : presupuestos.length === 0 ? (
        <div className="tabla-vacia">
          No hay presupuestos definidos para este período.
          <br />
          <small>Creá uno para empezar a controlar tus gastos.</small>
        </div>
      ) : (
        <div className="presupuesto-grid">
          {presupuestos.map((p) => (
            <div
              key={p.id}
              className={`presupuesto-card ${
                p.superado ? "superado" : p.alerta ? "advertencia" : "normal"
              }`}
            >
              <div className="presupuesto-header">
                <span className="presupuesto-categoria">{p.categoria}</span>
                <button
                  className="btn-eliminar"
                  onClick={() => handleEliminar(p.id)}
                >
                  ✕
                </button>
              </div>

              {/* Barra de progreso */}
              <div className="presupuesto-barra-container">
                <div
                  className="presupuesto-barra"
                  style={{ width: `${Math.min(p.porcentaje, 100)}%` }}
                />
              </div>

              <div className="presupuesto-info">
                <span className="presupuesto-porcentaje">
                  {p.porcentaje}%
                </span>
                <span className="presupuesto-montos">
                  ${p.gastado?.toLocaleString("es-AR", { minimumFractionDigits: 0 })} /
                  ${p.monto_limite?.toLocaleString("es-AR", { minimumFractionDigits: 0 })}
                </span>
              </div>

              {/* Alerta */}
              {p.alerta && (
                <div className="presupuesto-alerta">
                  {p.porcentaje >= 100
                    ? "⛔ Límite superado"
                    : "⚠️ Cerca del límite"}
                </div>
              )}

              <div className="presupuesto-disponible">
                Disponible: ${Math.max(p.monto_limite - p.gastado, 0)
                  .toLocaleString("es-AR", { minimumFractionDigits: 0 })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Presupuesto;