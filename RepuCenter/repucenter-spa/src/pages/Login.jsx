// src/pages/Login.jsx
import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://localhost:3000";
const api = axios.create({ baseURL: API });

function decodeRole(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return payload?.role || null;
  } catch {
    return null;
  }
}

export default function Login() {
  const [username, setUsername] = useState("jefe_bodega");
  const [password, setPassword] = useState("Secreta#2025");
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const { data } = await api.post("/auth/login", { username, password });
      const token = data?.token;
      if (!token) throw new Error("Token no recibido");

      localStorage.setItem("token", token);
      const role = decodeRole(token);
      if (role) localStorage.setItem("role", role);

      navigate("/products", { replace: true });
    } catch {
      setError("Credenciales inválidas o API caída");
    }
  };

  return (
    <div className="min-h-[calc(100vh-96px)] bg-gray-100 flex items-center justify-center">
      <div className="rc-card w-full max-w-md">
        <h2 className="text-center text-xl font-semibold mb-6">Iniciar Sesión</h2>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <div>
            <label className="rc-label" htmlFor="u">Usuario</label>
            <input id="u" className="rc-input" value={username} onChange={(e)=>setUsername(e.target.value)} />
          </div>
          <div>
            <label className="rc-label" htmlFor="p">Contraseña</label>
            <input id="p" className="rc-input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
          </div>
          <button className="rc-btn" type="submit">Entrar</button>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </form>
      </div>
    </div>
  );
}