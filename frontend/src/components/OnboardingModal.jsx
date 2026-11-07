// OnboardingModal.jsx
// Overlay de bienvenida con los 3 pasos para empezar a usar la app.
// Recibe todo el estado desde useOnboarding (la lógica vive en el hook).

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import "./OnboardingModal.css";

const PASOS = [
  {
    clave: "presupuesto",
    titulo: "Creá un presupuesto",
    detalle: "Definí un límite mensual y te avisamos al llegar al 80%.",
    boton: "Ir a Presupuesto",
    ruta: "/presupuesto",
  },
  {
    clave: "ingreso",
    titulo: "Registrá tu primer ingreso",
    detalle: "Tu sueldo, un freelance o lo que entre este mes.",
    boton: "Ir a Ingresos",
    ruta: "/ingresos",
  },
  {
    clave: "gasto",
    titulo: "Registrá tu primer gasto",
    detalle: "Empezá a ver tus patrones de consumo.",
    boton: "Ir a Gastos",
    ruta: "/gastos",
  },
];

function OnboardingModal({ onboarding }) {
  const navigate = useNavigate();
  const {
    pasos, completados, verificando, celebrando,
    error, posponer, cerrarCelebracion, reintentar,
  } = onboarding;

  // Confetti una sola vez cuando empieza la celebración.
  // disableForReducedMotion respeta a quienes desactivan las animaciones.
  useEffect(() => {
    if (!celebrando) return;
    confetti({
      particleCount: 160,
      spread: 90,
      origin: { y: 0.6 },
      disableForReducedMotion: true,
    });
  }, [celebrando]);

  const porcentaje = Math.round((completados / 3) * 100);

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true">
      <div className="onboarding-modal">
        {celebrando ? (
          <div className="onboarding-final">
            <span className="onboarding-final-icono">🎉</span>
            <h2>¡Tu dashboard está listo!</h2>
            <p>Ya tenés todo configurado. Ahora podés ver tus finanzas en un solo lugar.</p>
            <button className="onboarding-btn-primario" onClick={cerrarCelebracion}>
              Ir a mi dashboard
            </button>
          </div>
        ) : (
          <>
            <h2>¡Bienvenido! Configuremos tu cuenta</h2>
            <p className="onboarding-sub">3 pasos rápidos y tu dashboard cobra vida.</p>

            {/* Barra de progreso */}
            <div className="onboarding-progreso">
              <div
                className="onboarding-progreso-barra"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={3}
                aria-valuenow={completados}
              >
                <div
                  className="onboarding-progreso-relleno"
                  style={{ width: `${porcentaje}%` }}
                />
              </div>
              <span className="onboarding-progreso-texto">{completados}/3</span>
            </div>

            <ul className="onboarding-pasos">
              {PASOS.map((paso, i) => {
                const hecho = pasos[paso.clave];
                return (
                  <li key={paso.clave} className={hecho ? "paso hecho" : "paso"}>
                    <span className="paso-numero">{hecho ? "✓" : i + 1}</span>
                    <div className="paso-texto">
                      <strong>{paso.titulo}</strong>
                      <span>{paso.detalle}</span>
                    </div>
                    {!hecho && (
                      <button
                        className="onboarding-btn-primario"
                        onClick={() => navigate(paso.ruta)}
                        disabled={verificando}
                      >
                        {paso.boton}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>

            {error && (
              <div className="onboarding-error">
                {error}{" "}
                <button className="onboarding-link" onClick={reintentar}>
                  Reintentar
                </button>
              </div>
            )}

            <button className="onboarding-link" onClick={posponer}>
              Hacerlo después
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default OnboardingModal;
