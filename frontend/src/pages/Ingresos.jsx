// Ingresos.jsx
// Página para gestionar los ingresos del usuario.
// Permite listar, crear y eliminar ingresos con filtros por mes/año.

import { useState, useEffect } from "react";
import { ingresosService } from "../services/api";
import "./Transacciones.css";

const CATEGORIAS = ["Sueldo", "Freelance", "Inversiones", "Alquiler", "Otros"];

const MESES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function Ingresos() {
  const [ingresos, setIngresos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [error, setError] = useState("");

  // Filtros
  const hoy = new Date();
  const [filtroMes, setFiltroMes] = useState(hoy.getMonth() + 1);
  const [filtroAnio, setFiltroAnio] = useState(hoy.getFullYear());

  // Formulario
  const [form, setForm] = useState({
    descripcion: "",
    monto: "",
    categoria: "Sueldo",
    fecha: hoy.toISOString().split("T")[0],
    recurrente: false
  });

  useEffect(() => {
    cargarIngresos();
  }, [filtroMes, filtroAnio]);

  const cargarIngresos = async () => {
    setCargando(true);
    try {
      const respuesta = await ingresosService.getAll({
        mes: filtroMes,
        anio: filtroAnio
      });
      setIngresos(respuesta.data);
    } catch {
      setError("Error al cargar ingresos.");
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
      await ingresosService.create({
        ...form,
        monto: parseFloat(form.monto)
      });
      setForm({
        descripcion: "",
        monto: "",
        categoria: "Sueldo",
        fecha: hoy.toISOString().split("T")[0],
        recurrente: false
      });
      setMostrarForm(false);
      cargarIngresos();
    } catch {
      setError("Error al crear el ingreso.");
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm("¿Eliminár este ingreso?")) return;
    try {
      await ingresosService.delete(id);
      cargarIngresos();
    } catch {
      setError("Error al eliminar el ingreso.");
    }
  };

  const totalMes = ingresos.reduce((acc, i) => acc + i.monto, 0);

  return (
    <div className="transacciones-page">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1>💰 Ingresos</h1>
          <p className="page-subtitle">
            {MESES[filtroMes]} {filtroAnio} —{" "}
            <strong style={{ color: "var(--success)" }}>
              Total: ${totalMes.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
            </strong>
          </p>
        </div>
        <button
          className="btn-nuevo"
          onClick={() => setMostrarForm(!mostrarForm)}
        >
          {mostrarForm ? "✕ Cancelar" : "+ Nuevo ingreso"}
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
      </div>

      {/* Formulario nuevo ingreso */}
      {mostrarForm && (
        <div className="form-card">
          <h2>Nuevo ingreso</h2>
          <form onSubmit={handleSubmit} className="transaccion-form">
            <div className="form-row">
              <div className="form-group">
                <label>Descripción</label>
                <input
                  type="text"
                  name="descripcion"
                  value={form.descripcion}
                  onChange={handleChange}
                  placeholder="Ej: Sueldo mes de junio"
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
                <label>Fecha *</label>
                <input
                  type="date"
                  name="fecha"
                  value={form.fecha}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
            <div className="form-check">
              <input
                type="checkbox"
                id="recurrente"
                name="recurrente"
                checked={form.recurrente}
                onChange={handleChange}
              />
              <label htmlFor="recurrente">Ingreso recurrente mensual</label>
            </div>
            {error && <div className="form-error">{error}</div>}
            <button type="submit" className="btn-guardar">
              Guardar ingreso
            </button>
          </form>
        </div>
      )}

      {/* Lista de ingresos */}
      {cargando ? (
        <div className="tabla-loading">Cargando...</div>
      ) : ingresos.length === 0 ? (
        <div className="tabla-vacia">
          No hay ingresos registrados para este período.
        </div>
      ) : (
        <div className="tabla-container">
          <table className="tabla">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Descripción</th>
                <th>Categoría</th>
                <th>Recurrente</th>
                <th>Monto</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {ingresos.map((ingreso) => (
                <tr key={ingreso.id}>
                  <td>{ingreso.fecha}</td>
                  <td>{ingreso.descripcion || "-"}</td>
                  <td>
                    <span className="badge badge-ingreso">{ingreso.categoria}</span>
                  </td>
                  <td>{ingreso.recurrente ? "✅" : "-"}</td>
                  <td className="monto-positivo">
                    ${ingreso.monto.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <button
                      className="btn-eliminar"
                      onClick={() => handleEliminar(ingreso.id)}
                    >
                      Eliminar
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

export default Ingresos;