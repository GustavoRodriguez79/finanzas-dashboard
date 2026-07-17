// Login.jsx
// Página de inicio de sesión.
// Permite login con email/contraseña o con Google OAuth.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import "./Auth.css";

function Login() {
  const { login, loginGoogle } = useAuth();
  const navigate = useNavigate();

  // Estado del formulario
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  // Actualiza el estado del formulario al escribir
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError(""); // Limpia el error al escribir
  };

  // Login con email y contraseña
  const handleSubmit = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError("");

    try {
      await login(form.email, form.password);
      navigate("/dashboard"); // Redirige al dashboard al loguearse
    } catch (err) {
      // Muestra el mensaje de error del servidor
      setError(
        err.response?.data?.detail || "Error al iniciar sesión. Intentá nuevamente."
      );
    } finally {
      setCargando(false);
    }
  };

  // Login con Google OAuth
  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await loginGoogle(credentialResponse.credential);
      navigate("/dashboard");
    } catch (err) {
      setError("Error al iniciar sesión con Google.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">

        {/* Header */}
        <div className="auth-header">
          <h1>💹 Finanzas</h1>
          <p>Iniciá sesión para continuar</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="tu@email.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <input
              type="password"
              id="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              required
              autoComplete="current-password"
            />
          </div>

          {/* Mensaje de error */}
          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="btn-primary"
            disabled={cargando}
          >
            {cargando ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>
        </form>

        {/* Separador */}
        <div className="auth-divider">
          <span>o continuá con</span>
        </div>

        {/* Google OAuth */}
        <div className="auth-google">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Error al iniciar sesión con Google.")}
            theme="filled_black"
            shape="rectangular"
            size="large"
            text="signin_with"
            locale="es"
          />
        </div>

        {/* Link a registro */}
        <p className="auth-footer">
          ¿No tenés cuenta?{" "}
          <Link to="/register">Registrate</Link>
        </p>

      </div>
    </div>
  );
}

export default Login;          