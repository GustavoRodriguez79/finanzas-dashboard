// useOnboarding.js
// Lógica del onboarding guiado de 3 pasos:
// crear un presupuesto, registrar un ingreso y registrar un gasto.
// Detecta qué pasos ya están hechos consultando la API, guarda el progreso
// en localStorage como respaldo y, al llegar a 3/3, avisa al backend.

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import {
  presupuestoService,
  ingresosService,
  gastosService,
} from "../services/api";

const PASOS_INICIALES = { presupuesto: false, ingreso: false, gasto: false };

// try/catch en todo acceso a storage: en modo privado puede estar bloqueado
function leerProgreso(clave) {
  try {
    const guardado = JSON.parse(localStorage.getItem(clave));
    return { ...PASOS_INICIALES, ...guardado };
  } catch {
    return PASOS_INICIALES;
  }
}

function guardarProgreso(clave, pasos) {
  try {
    localStorage.setItem(clave, JSON.stringify(pasos));
  } catch {
    /* sin storage: el progreso igual se recalcula desde la API */
  }
}

export function useOnboarding() {
  const { usuario, completarOnboarding } = useAuth();

  const usuarioId = usuario?.id;
  // Solo cuando el backend dice explícitamente false (no durante la carga)
  const activo = usuario?.onboarding_completado === false;

  const claveProgreso = `onboarding_progreso_${usuarioId}`;
  const clavePospuesto = `onboarding_pospuesto_${usuarioId}`;

  const [pasos, setPasos] = useState(() => leerProgreso(claveProgreso));
  const [verificando, setVerificando] = useState(true);
  const [celebrando, setCelebrando] = useState(false);
  const [error, setError] = useState("");
  const [pospuesto, setPospuesto] = useState(() => {
    try {
      return sessionStorage.getItem(clavePospuesto) === "true";
    } catch {
      return false;
    }
  });

  // Evita llamar dos veces al backend si el efecto se dispara de nuevo
  const finalizando = useRef(false);

  const completados = Object.values(pasos).filter(Boolean).length;

  // Consulta la API y marca los pasos que el usuario ya cumplió.
  // Un paso hecho nunca se desmarca (se mezcla con el progreso guardado).
  useEffect(() => {
    if (!activo) return;
    let cancelado = false;

    const verificar = async () => {
      const [presupuestos, ingresos, gastos] = await Promise.allSettled([
        presupuestoService.getAll(),
        ingresosService.getAll(),
        gastosService.getAll(),
      ]);
      if (cancelado) return;

      // Si una consulta falla no se marca el paso: se reintenta la próxima vez
      const tiene = (resultado) =>
        resultado.status === "fulfilled" && resultado.value.data.length > 0;

      setPasos((previos) => {
        const nuevos = {
          presupuesto: previos.presupuesto || tiene(presupuestos),
          ingreso: previos.ingreso || tiene(ingresos),
          gasto: previos.gasto || tiene(gastos),
        };
        guardarProgreso(claveProgreso, nuevos);
        return nuevos;
      });
      setVerificando(false);
    };

    verificar();
    return () => {
      cancelado = true;
    };
  }, [activo, claveProgreso]);

  // Avisa al backend y dispara la celebración
  const finalizar = useCallback(async () => {
    setError("");
    try {
      await completarOnboarding();
      setCelebrando(true);
    } catch {
      finalizando.current = false;
      setError("No pudimos guardar tu progreso. Probá de nuevo.");
    }
  }, [completarOnboarding]);

  // Al llegar a 3/3 completa el onboarding una sola vez
  useEffect(() => {
    if (activo && completados === 3 && !finalizando.current) {
      finalizando.current = true;
      finalizar();
    }
  }, [activo, completados, finalizar]);

  // "Hacerlo después": oculta el modal solo durante esta sesión del navegador
  const posponer = () => {
    try {
      sessionStorage.setItem(clavePospuesto, "true");
    } catch {
      /* si falla, se oculta igual hasta recargar */
    }
    setPospuesto(true);
  };

  const cerrarCelebracion = () => setCelebrando(false);

  return {
    visible: (activo && !pospuesto) || celebrando,
    pasos,
    completados,
    verificando,
    celebrando,
    error,
    posponer,
    cerrarCelebracion,
    reintentar: finalizar,
  };
}
