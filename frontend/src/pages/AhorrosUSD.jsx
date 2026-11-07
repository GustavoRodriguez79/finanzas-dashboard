// pages/AhorrosUSD.jsx
import { useState, useEffect } from "react";
import api from "../services/api";
import "./AhorrosUSD.css";

const TIPOS = ["depósito", "retiro", "ajuste"];

const TIPO_LABEL = {
  depósito: { icon: "➕", color: "var(--success)", label: "Depósito" },
  retiro: { icon: "➖", color: "var(--danger)", label: "Retiro" },
  ajuste: { icon: "🔄", color: "var(--warning)", label: "Ajuste" },
};

const fmtUSD = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    n ?? 0,
  );

const fmtFecha = (iso) => {
  if (!iso) return "";
  // "YYYY-MM-DD" a secas se interpreta como UTC y en Argentina (UTC-3) mostraría
  // el día anterior. Con la hora local se muestra la fecha correcta.
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export default function AhorrosUSD() {
  const [movimientos, setMovimientos] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todos");

  const [form, setForm] = useState({
    tipo: "depósito",
    monto: "",
    descripcion: "",
    fecha: new Date().toISOString().slice(0, 10),
  });

  // Visibilidad del balance, persistida en localStorage. try/catch porque el
  // acceso puede fallar (modo privado, storage bloqueado).
  const [saldoUSDVisible, setSaldoUSDVisible] = useState(() => {
    try {
      return localStorage.getItem("saldoUSDVisible") !== "false";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("saldoUSDVisible", String(saldoUSDVisible));
    } catch {
      /* sin storage: el toggle funciona igual, solo no persiste */
    }
  }, [saldoUSDVisible]);

  // Contador que dispara la recarga de datos (tras guardar o eliminar).
  const [recarga, setRecarga] = useState(0);
  const recargar = () => setRecarga((n) => n + 1);

  // La petición va dentro del efecto y los setState en callbacks (.then): la regla
  // react-hooks/set-state-in-effect no admite setState síncrono en el cuerpo del efecto.
  // loading arranca en true para la carga inicial; en las recargas la página se
  // actualiza en su lugar, sin reemplazarla por el spinner.
  useEffect(() => {
    api
      .get("/ahorros-usd")
      .then((res) => {
        setMovimientos(res.data.movimientos || []);
        setBalance(res.data.balance ?? 0);
        setError("");
      })
      .catch(() => {
        setError("No se pudo cargar los ahorros. Intentá de nuevo.");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [recarga]);

  const resetForm = () => {
    setForm({
      tipo: "depósito",
      monto: "",
      descripcion: "",
      fecha: new Date().toISOString().slice(0, 10),
    });
    setEditItem(null);
    setShowForm(false);
  };

  const abrirEditar = (mov) => {
    setForm({
      tipo: mov.tipo,
      monto: String(Math.abs(mov.monto)),
      descripcion: mov.descripcion || "",
      fecha: mov.fecha?.slice(0, 10) || new Date().toISOString().slice(0, 10),
    });
    setEditItem(mov);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.monto || isNaN(Number(form.monto)) || Number(form.monto) <= 0)
      return;
    setSubmitting(true);
    try {
      const payload = {
        tipo: form.tipo,
        monto: parseFloat(form.monto),
        descripcion: form.descripcion.trim() || null,
        fecha: form.fecha,
      };
      if (editItem) {
        await api.put(`/ahorros-usd/${editItem.id}`, payload);
      } else {
        await api.post("/ahorros-usd", payload);
      }
      resetForm();
      recargar();
    } catch {
      setError("Error al guardar. Verificá los datos.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/ahorros-usd/${id}`);
      setConfirmDelete(null);
      recargar();
    } catch {
      setError("Error al eliminar.");
    }
  };

  const movFiltrados =
    filtroTipo === "todos"
      ? movimientos
      : movimientos.filter((m) => m.tipo === filtroTipo);

  const totalDepositos = movimientos
    .filter((m) => m.tipo === "depósito")
    .reduce((s, m) => s + Number(m.monto), 0);
  const totalRetiros = movimientos
    .filter((m) => m.tipo === "retiro")
    .reduce((s, m) => s + Number(m.monto), 0);

  if (loading)
    return (
      <div className="usd-loading">
        <div className="loading-spinner" />
        <span>Cargando ahorros...</span>
      </div>
    );

  return (
    <div className="usd-page">
      <div className="usd-header">
        <div>
          <h1 className="usd-title">🇺🇸 Ahorros en USD</h1>
          <p className="usd-subtitle">
            Registrá y seguí tus ahorros en dólares
          </p>
        </div>
        <button
          className="usd-btn-primary"
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
        >
          + Nuevo movimiento
        </button>
      </div>

      {error && <div className="usd-error">{error}</div>}

      <div className="usd-balance-card">
        <div className="usd-balance-main">
          <div className="usd-balance-label">
            Balance actual
            <button
              type="button"
              className="usd-eye-toggle"
              onClick={() => setSaldoUSDVisible((v) => !v)}
              title={saldoUSDVisible ? "Ocultar saldo" : "Mostrar saldo"}
              aria-label={saldoUSDVisible ? "Ocultar saldo" : "Mostrar saldo"}
            >
              {saldoUSDVisible ? "👁️" : "🙈"}
            </button>
          </div>
          <div className={`usd-balance-valor ${balance < 0 ? "negativo" : ""}`}>
            {saldoUSDVisible ? fmtUSD(balance) : "U$S ••••••"}
          </div>
        </div>
        <div className="usd-balance-stats">
          <div className="usd-stat">
            <span className="usd-stat-icon" style={{ color: "var(--success)" }}>
              ↑
            </span>
            <div>
              <div className="usd-stat-label">Total depósitos</div>
              <div
                className="usd-stat-valor"
                style={{ color: "var(--success)" }}
              >
                {fmtUSD(totalDepositos)}
              </div>
            </div>
          </div>
          <div className="usd-stat">
            <span className="usd-stat-icon" style={{ color: "var(--danger)" }}>
              ↓
            </span>
            <div>
              <div className="usd-stat-label">Total retiros</div>
              <div
                className="usd-stat-valor"
                style={{ color: "var(--danger)" }}
              >
                {fmtUSD(totalRetiros)}
              </div>
            </div>
          </div>
          <div className="usd-stat">
            <span className="usd-stat-icon">📋</span>
            <div>
              <div className="usd-stat-label">Movimientos</div>
              <div className="usd-stat-valor">{movimientos.length}</div>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div
          className="usd-form-overlay"
          onClick={(e) => e.target === e.currentTarget && resetForm()}
        >
          <div className="usd-form-modal">
            <div className="usd-form-header">
              <h2>{editItem ? "Editar movimiento" : "Nuevo movimiento USD"}</h2>
              <button className="usd-form-close" onClick={resetForm}>
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="usd-form">
              <div className="usd-form-row">
                <div className="usd-form-group" style={{ gridColumn: "1 / -1" }}>
                  <label>Tipo *</label>
                  <div className="tipo-selector">
                    {TIPOS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`tipo-btn ${form.tipo === t ? "active" : ""}`}
                        style={
                          form.tipo === t
                            ? {
                                borderColor: TIPO_LABEL[t].color,
                                color: TIPO_LABEL[t].color,
                              }
                            : {}
                        }
                        onClick={() => setForm((f) => ({ ...f, tipo: t }))}
                      >
                        {TIPO_LABEL[t].icon} {TIPO_LABEL[t].label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="usd-form-row">
                <div className="usd-form-group">
                  <label>Monto (USD) *</label>
                  <div className="input-with-prefix">
                    <span className="input-prefix">$</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={form.monto}
                      onChange={(e) => {
                        // type="number" se comporta distinto según el navegador mobile;
                        // con texto controlamos nosotros: coma a punto y solo un decimal.
                        const valor = e.target.value.replace(",", ".");
                        if (/^\d*\.?\d*$/.test(valor)) {
                          setForm((f) => ({ ...f, monto: valor }));
                        }
                      }}
                      required
                    />
                  </div>
                </div>
                <div className="usd-form-group">
                  <label>Fecha</label>
                  <input
                    type="date"
                    value={form.fecha}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fecha: e.target.value }))
                    }
                  />
                </div>
              </div>
              <div className="usd-form-group">
                <label>Descripción</label>
                <input
                  type="text"
                  placeholder="Ej: ahorro mensual, billetera virtual..."
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, descripcion: e.target.value }))
                  }
                  maxLength={200}
                />
              </div>
              <div className="usd-form-actions">
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={resetForm}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="usd-btn-primary"
                  disabled={submitting}
                >
                  {submitting
                    ? "Guardando..."
                    : editItem
                      ? "Actualizar"
                      : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div
          className="usd-form-overlay"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="usd-confirm-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <h3>¿Eliminar movimiento?</h3>
            <p>Esta acción no se puede deshacer.</p>
            <div className="usd-form-actions">
              <button
                className="btn-cancel"
                onClick={() => setConfirmDelete(null)}
              >
                Cancelar
              </button>
              <button
                className="btn-danger"
                onClick={() => handleDelete(confirmDelete)}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="usd-filtros">
        <span className="usd-filtros-label">Filtrar:</span>
        {["todos", ...TIPOS].map((t) => (
          <button
            key={t}
            className={`filtro-btn ${filtroTipo === t ? "active" : ""}`}
            onClick={() => setFiltroTipo(t)}
          >
            {t === "todos" ? "Todos" : TIPO_LABEL[t].label}
          </button>
        ))}
      </div>

      {movFiltrados.length === 0 ? (
        <div className="usd-empty">
          <span style={{ fontSize: "2.5rem" }}>💵</span>
          <p>
            {filtroTipo === "todos"
              ? "¡Todavía no registraste movimientos. Empezá agregando tu primer ahorro!"
              : `Sin movimientos de tipo "${filtroTipo}".`}
          </p>
        </div>
      ) : (
        <div className="usd-list">
          {movFiltrados.map((mov) => {
            const info = TIPO_LABEL[mov.tipo] || TIPO_LABEL["ajuste"];
            return (
              <div key={mov.id} className="usd-mov-item">
                <div
                  className="usd-mov-icon"
                  style={{ background: `${info.color}18`, color: info.color }}
                >
                  {info.icon}
                </div>
                <div className="usd-mov-info">
                  <div className="usd-mov-tipo">{info.label}</div>
                  {mov.descripcion && (
                    <div className="usd-mov-desc">{mov.descripcion}</div>
                  )}
                  <div className="usd-mov-fecha">{fmtFecha(mov.fecha)}</div>
                </div>
                <div
                  className={`usd-mov-monto ${mov.tipo === "retiro" ? "negativo" : ""}`}
                >
                  {mov.tipo === "retiro" ? "-" : "+"}
                  {fmtUSD(mov.monto)}
                </div>
                <div className="usd-mov-actions">
                  <button
                    className="btn-icon"
                    title="Editar"
                    onClick={() => abrirEditar(mov)}
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon btn-icon-danger"
                    title="Eliminar"
                    onClick={() => setConfirmDelete(mov.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
