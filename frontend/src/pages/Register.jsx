// Register.jsx
// Página de registro de nuevo usuario.
// Permite registro con email/contraseña o con Google OAuth.

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import "./Auth.css";

function Register() {
  const { register, loginGoogle } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    nombre: "",
    email: "",
    password: "",
    confirmar: ""
  });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    // Validación: contraseñas coinciden
    if (form.password !== form.confirmar) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    // Validación: mínimo 8 caracteres
    if (form.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setCargando(true);
    try {
      await register(form.nombre, form.email, form.password);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Error al registrarse. Intentá nuevamente."
      );
    } finally {
      setCargando(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await loginGoogle(credentialResponse.credential);
      navigate("/dashboard");
    } catch {
      setError("Error al registrarse con Google.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">

        {/* Header */}
        <div className="auth-header">
          <h1>💹 Finanzas</h1>
          <p>Creá tu cuenta gratuita</p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="nombre">Nombre completo</label>
            <input
              type="text"
              id="nombre"
              name="nombre"
              value={form.nombre}
              onChange={handleChange}
              placeholder="Gustavo Rodriguez"
              required
              autoComplete="name"
            />
          </div>

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
              placeholder="Mínimo 8 caracteres"
              required
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmar">Confirmar contraseña</label>
            <input
              type="password"
              id="confirmar"
              name="confirmar"
              value={form.confirmar}
              onChange={handleChange}
              placeholder="Repetí tu contraseña"
              required
              autoComplete="new-password"
            />
          </div>

          {/* Mensaje de error */}
          {error && <div className="auth-error">{error}</div>}

          <button
            type="submit"
            className="btn-primary"
            disabled={cargando}
          >
            {cargando ? "Creando cuenta..." : "Crear cuenta"}
          </button>
        </form>

        {/* Separador */}
        <div className="auth-divider">
          <span>o registrate con</span>
        </div>

        {/* Google OAuth */}
        <div className="auth-google">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError("Error al registrarse con Google.")}
            theme="filled_black"
            shape="rectangular"
            size="large"
            text="signup_with"
            locale="es"
          />
        </div>

        {/* Link a login */}
        <p className="auth-footer">
          ¿Ya tenés cuenta?{" "}
          <Link to="/login">Iniciá sesión</Link>
        </p>

      </div>
    </div>
  );
}

export default Register;