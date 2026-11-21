// pages/Asistente.jsx
// Página del Asistente IA — chat con contexto financiero del usuario.
// Solo visible para usuarios premium.

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import axios from 'axios'
import { AvatarIA, AvatarUser, IcoSend } from '../components/Iconos'

const API = import.meta.env.VITE_API_URL

const SUGERENCIAS = [
  '¿En qué categoría gasto más?',
  '¿Cómo va mi ahorro este mes?',
  '¿Estoy dentro de mis presupuestos?',
  'Dame un consejo para reducir gastos',
  '¿Cuál es mi balance actual?',
]

export default function Asistente() {
  const { usuario: user } = useAuth()
  const [mensajes, setMensajes] = useState([
    {
      rol: 'asistente',
      texto:
        '¡Hola! Soy tu asistente financiero personal. Puedo analizar tus ingresos, gastos y presupuestos para darte consejos personalizados. ¿En qué te puedo ayudar hoy?',
    },
  ])
  const [input, setInput] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mes, setMes] = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())
  const bottomRef = useRef(null)

  // Auto-scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes, cargando])

  const enviar = async (texto = input) => {
    const pregunta = texto.trim()
    if (!pregunta || cargando) return

    setMensajes((prev) => [...prev, { rol: 'usuario', texto: pregunta }])
    setInput('')
    setCargando(true)

    try {
      const token = localStorage.getItem('access_token')
      const { data } = await axios.post(
        `${API}/asistente/`,
        { pregunta, mes, anio },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      setMensajes((prev) => [...prev, { rol: 'asistente', texto: data.respuesta }])
    } catch (err) {
      const detalle =
        err.response?.data?.detail || 'No se pudo conectar con el asistente.'
      setMensajes((prev) => [
        ...prev,
        { rol: 'error', texto: detalle },
      ])
    } finally {
      setCargando(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  // Si no es premium, mostrar pantalla de upgrade
  if (user?.plan !== 'premium') {
    return (
      <div className="asistente-locked">
        <div className="locked-card">
          <h2>Asistente IA</h2>
          <p>
            El Asistente IA está disponible exclusivamente para usuarios{' '}
            <strong>Premium</strong>. Activá tu plan para acceder a consejos
            financieros personalizados.
          </p>
          <span className="premium-badge">Premium</span>
        </div>
      </div>
    )
  }

  return (
    <div className="asistente-page">
      {/* Header */}
      <div className="asistente-header">
        <div className="asistente-titulo">
          <div>
            <h2>Asistente IA</h2>
            <p>Analizando tus finanzas con IA</p>
          </div>
        </div>

        {/* Selector de período */}
        <div className="asistente-periodo">
          <select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
            {[
              'Enero','Febrero','Marzo','Abril','Mayo','Junio',
              'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
            ].map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select value={anio} onChange={(e) => setAnio(Number(e.target.value))}>
            {[2024, 2025, 2026, 2027].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Chat */}
      <div className="asistente-chat">
        {mensajes.map((m, i) => (
          <div key={i} className={`mensaje mensaje-${m.rol}`}>
            {m.rol === 'asistente' && <span className="avatar-ia"><AvatarIA /></span>}
            <div className={`burbuja burbuja-${m.rol}`}>
              {m.texto.split('\n').map((linea, j) => (
                <p key={j}>{linea}</p>
              ))}
            </div>
            {m.rol === 'usuario' && <span className="avatar-usuario"><AvatarUser /></span>}
          </div>
        ))}

        {cargando && (
          <div className="mensaje mensaje-asistente">
            <span className="avatar-ia"><AvatarIA /></span>
            <div className="burbuja burbuja-asistente burbuja-cargando">
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Sugerencias */}
      {mensajes.length <= 1 && (
        <div className="asistente-sugerencias">
          {SUGERENCIAS.map((s, i) => (
            <button key={i} onClick={() => enviar(s)} className="sugerencia-btn">
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="asistente-input-area">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Preguntame sobre tus finanzas... (Enter para enviar)"
          rows={2}
          maxLength={500}
          disabled={cargando}
        />
        <button
          onClick={() => enviar()}
          disabled={!input.trim() || cargando}
          className="btn-enviar"
        >
          <IcoSend />
        </button>
      </div>
      <p className="asistente-hint">
        {input.length}/500 · Enter para enviar · Shift+Enter nueva línea
      </p>
    </div>
  )
}