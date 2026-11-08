// Dashboard.jsx
// Página principal del dashboard financiero.
// Muestra el resumen del mes: ingresos, gastos, balance,
// % ahorro, progreso de presupuestos por categoría y gráficos.

import { useState, useEffect } from "react";
import { resumenService } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import GraficoTorta from "../components/charts/GraficoTorta";
import GraficoBarras from "../components/charts/GraficoBarras";
import OnboardingModal from "../components/OnboardingModal";
import { useOnboarding } from "../hooks/useOnboarding";
import { ANIOS_HISTORICOS } from "../utils/anios";
import "./Dashboard.css";

const MESES_CORTOS = [
  "", "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
];

// Color de la barra de presupuesto: verde hasta 60%, amarillo hasta 80%, rojo por encima
function colorProgreso(porcentaje) {
  if (porcentaje > 80) return "rojo";
  if (porcentaje > 60) return "amarillo";
  return "verde";
}

// Arma los datos del gráfico de los últimos 6 meses hasta el mes actual.
// mesesAnterior solo viene si el mes actual es menor a 6 (hay que completar
// la ventana con meses del año pasado). Se descartan los meses vacíos del
// principio para que un usuario nuevo no vea barras en cero; los ceros del
// medio se conservan para no deformar la línea de tiempo.
function ultimosSeisMeses(anioActual, mesActual, mesesActual, mesesAnterior) {
  const historial = [
    ...(mesesAnterior || []).map((m) => ({ ...m, anio: anioActual - 1 })),
    ...(mesesActual || [])
      .filter((m) => m.mes <= mesActual)
      .map((m) => ({ ...m, anio: anioActual })),
  ];

  const ventana = historial.slice(-6);
  const primeroConDatos = ventana.findIndex((m) => m.ingresos > 0 || m.gastos > 0);
  if (primeroConDatos === -1) return [];

  const conDatos = ventana.slice(primeroConDatos);
  // Si la ventana cruza de año, se agrega el año para no confundir "Dic" con "Ene"
  const cruzaAnio = conDatos.some((m) => m.anio !== anioActual);

  return conDatos.map((m) => ({
    nombre: cruzaAnio
      ? `${MESES_CORTOS[m.mes]} ${String(m.anio).slice(2)}`
      : MESES_CORTOS[m.mes],
    ingresos: m.ingresos,
    gastos: m.gastos,
  }));
}

function Dashboard() {
  const { usuario } = useAuth();
  // Se declara antes de los return anticipados para respetar el orden de hooks
  const onboarding = useOnboarding();
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // Visibilidad de los saldos, persistida en localStorage. Se declara antes de los
  // return anticipados para respetar el orden de hooks. try/catch por si el
  // storage está bloqueado (modo privado).
  const [saldoVisible, setSaldoVisible] = useState(() => {
    try {
      return localStorage.getItem("saldoVisible") !== "false";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("saldoVisible", String(saldoVisible));
    } catch {
      /* sin storage: el toggle funciona igual, solo no persiste */
    }
  }, [saldoVisible]);

  // Mes y año actual
  const hoy = new Date();
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anio, setAnio] = useState(hoy.getFullYear());

  const MESES = [
    "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  // Contador para forzar una recarga manual ("Reintentar") sin cambiar mes ni año
  const [recarga, setRecarga] = useState(0);

  // Carga el resumen cuando cambia el mes, el año o se pide una recarga.
  // La función vive dentro del efecto (solo se usa acá). El loader lo activan los
  // manejadores de abajo: setear estado de forma síncrona dentro de un efecto
  // provoca renders en cascada. "cancelado" descarta respuestas de un período
  // anterior si el usuario cambia de mes antes de que llegue la respuesta.
  useEffect(() => {
    let cancelado = false;

    const cargarResumen = async () => {
      try {
        const respuesta = await resumenService.getMes({ mes, anio });
        if (!cancelado) setResumen(respuesta.data);
      } catch {
        if (!cancelado) setError("Error al cargar el resumen. Verificá tu conexión.");
      } finally {
        if (!cancelado) setCargando(false);
      }
    };

    cargarResumen();
    return () => {
      cancelado = true;
    };
  }, [mes, anio, recarga]);

  // Cambio de período: muestra el loader y limpia el error antes de recargar
  const handlePeriodo = (setter) => (e) => {
    setCargando(true);
    setError("");
    setter(Number(e.target.value));
  };

  const reintentarResumen = () => {
    setCargando(true);
    setError("");
    setRecarga((n) => n + 1);
  };

  // Gráfico de los últimos 6 meses: independiente del selector de período,
  // se pide una sola vez al montar y no bloquea el resto del dashboard.
  const [ultimosMeses, setUltimosMeses] = useState({
    cargando: true,
    error: false,
    datos: [],
  });

  useEffect(() => {
    let cancelado = false;

    const cargarUltimosMeses = async () => {
      const ahora = new Date();
      const anioActual = ahora.getFullYear();
      const mesActual = ahora.getMonth() + 1;

      // De enero a mayo la ventana de 6 meses incluye meses del año anterior
      const [actual, anterior] = await Promise.allSettled([
        resumenService.getAnual({ anio: anioActual }),
        mesActual < 6
          ? resumenService.getAnual({ anio: anioActual - 1 })
          : Promise.resolve(null),
      ]);
      if (cancelado) return;

      // El año actual es obligatorio; si falla el anterior, se muestra lo que haya
      if (actual.status === "rejected") {
        setUltimosMeses({ cargando: false, error: true, datos: [] });
        return;
      }

      setUltimosMeses({
        cargando: false,
        error: false,
        datos: ultimosSeisMeses(
          anioActual,
          mesActual,
          actual.value.data.meses,
          anterior.status === "fulfilled" ? anterior.value?.data.meses : null
        ),
      });
    };

    cargarUltimosMeses();
    return () => {
      cancelado = true;
    };
  }, []);

  if (cargando) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Cargando dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button onClick={reintentarResumen} className="btn-retry">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="dashboard">

      {/* Onboarding guiado: solo aparece si el usuario no lo completó */}
      {onboarding.visible && <OnboardingModal onboarding={onboarding} />}

      {/* Header con saludo y selector de período */}
      <div className="dashboard-header">
        <div>
          <h1>Hola, {usuario?.nombre?.split(" ")[0]} 👋</h1>
          <p className="dashboard-subtitle">
            Resumen financiero de {MESES[mes]} {anio}
          </p>
        </div>
        <div className="periodo-selector">
          <button
            type="button"
            className="dash-eye-toggle"
            onClick={() => setSaldoVisible((v) => !v)}
            title={saldoVisible ? "Ocultar saldos" : "Mostrar saldos"}
            aria-label={saldoVisible ? "Ocultar saldos" : "Mostrar saldos"}
          >
            {saldoVisible ? "👁️" : "🙈"}
          </button>
          <select
            value={mes}
            onChange={handlePeriodo(setMes)}
          >
            {MESES.slice(1).map((nombre, i) => (
              <option key={i + 1} value={i + 1}>{nombre}</option>
            ))}
          </select>
          <select
            value={anio}
            onChange={handlePeriodo(setAnio)}
          >
            {ANIOS_HISTORICOS.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards de métricas principales */}
      <div className="dashboard-cards">
        <div className="metric-card ingresos" data-icon="💰">
          <span className="metric-label">💰 Ingresos</span>
          <span className="metric-valor">
            {saldoVisible
              ? `$${resumen?.total_ingresos?.toLocaleString("es-AR", {
                  minimumFractionDigits: 2
                })}`
              : "$ ••••••"}
          </span>
        </div>
        <div className="metric-card gastos" data-icon="💸">
          <span className="metric-label">💸 Gastos</span>
          <span className="metric-valor">
            {saldoVisible
              ? `$${resumen?.total_gastos?.toLocaleString("es-AR", {
                  minimumFractionDigits: 2
                })}`
              : "$ ••••••"}
          </span>
        </div>
        <div
          className={`metric-card balance ${resumen?.balance >= 0 ? "positivo" : "negativo"}`}
          data-icon="⚖️"
        >
          <span className="metric-label">⚖️ Balance</span>
          <span className="metric-valor">
            {saldoVisible
              ? `$${resumen?.balance?.toLocaleString("es-AR", {
                  minimumFractionDigits: 2
                })}`
              : "$ ••••••"}
          </span>
        </div>
        <div className="metric-card ahorro" data-icon="🎯">
          <span className="metric-label">🎯 Ahorro</span>
          <span className="metric-valor">
            {saldoVisible ? `${resumen?.porcentaje_ahorro}%` : "••••"}
          </span>
        </div>
      </div>

      {/* Progreso de TODAS las categorías con presupuesto en el mes */}
      {resumen?.presupuestos?.length > 0 && (
        <div className="dash-pres">
          <h2>🎯 Presupuesto del mes</h2>
          <div className="dash-pres-lista">
            {resumen.presupuestos.map((p) => {
              const color = colorProgreso(p.porcentaje);
              return (
                <div key={p.categoria} className="dash-pres-fila">
                  <div className="dash-pres-info">
                    <span className="dash-pres-categoria">{p.categoria}</span>
                    <span className="dash-pres-montos">
                      {saldoVisible
                        ? `$${p.gastado.toLocaleString("es-AR")} / $${p.limite.toLocaleString("es-AR")}`
                        : "$ •••••• / $ ••••••"}
                    </span>
                    <span className={`dash-pres-porcentaje ${color}`}>
                      {p.porcentaje}%
                    </span>
                  </div>
                  {/* La barra se corta en 100%, el texto muestra el porcentaje real */}
                  <div className="dash-pres-barra">
                    <div
                      className={`dash-pres-progreso ${color}`}
                      style={{ width: `${Math.min(p.porcentaje, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="dashboard-graficos">
        <div className="grafico-card">
          <h2>Gastos por categoría</h2>
          <GraficoTorta
            datos={resumen?.gastos_por_categoria || []}
          />
        </div>
        <div className="grafico-card">
          <h2>Últimos 6 meses</h2>
          {ultimosMeses.cargando ? (
            <div className="grafico-estado">Cargando...</div>
          ) : ultimosMeses.error ? (
            <div className="grafico-estado">No se pudo cargar el gráfico.</div>
          ) : (
            <GraficoBarras datos={ultimosMeses.datos} />
          )}
        </div>
      </div>

      {/* Proyección y categoría top */}
      <div className="dashboard-extra">
        <div className="extra-card">
          <span className="extra-label">📈 Proyección del mes</span>
          <span className="extra-valor">
            ${resumen?.proyeccion_gasto_mes?.toLocaleString("es-AR", {
              minimumFractionDigits: 2
            })}
          </span>
        </div>
        <div className="extra-card">
          <span className="extra-label">🏆 Categoría top</span>
          <span className="extra-valor">
            {resumen?.categoria_top?.categoria}
          </span>
          <span className="extra-sub">
            ${resumen?.categoria_top?.total?.toLocaleString("es-AR", {
              minimumFractionDigits: 2
            })}
          </span>
        </div>
      </div>

      {/* Adelanto Premium: preview borrosa de un insight de ejemplo, sin muro de pago */}
      <div className="dash-premium-insight">
        <div className="dash-premium-header">
          <span className="dash-premium-titulo">✨ Insight de la semana</span>
          <span className="dash-premium-chip">Premium</span>
        </div>
        {/* aria-hidden: es texto de ejemplo, no debe leerlo un lector de pantalla */}
        <div className="dash-premium-preview" aria-hidden="true">
          <p>Tu mayor gasto esta semana fue en <strong>Entretenimiento</strong>, un 34% más que la semana anterior. Considerá revisar ese presupuesto.</p>
          <p>Tus ingresos superaron tus gastos por 5 semanas consecutivas. ¡Vas muy bien!</p>
        </div>
      </div>

    </div>
  );
}

export default Dashboard;