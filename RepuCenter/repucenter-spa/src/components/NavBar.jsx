// src/components/NavBar.jsx
import { Link, useNavigate } from "react-router-dom";

export default function NavBar() {
  const navigate = useNavigate();
  const role = localStorage.getItem("role");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/login");
  };

  return (
    <nav className="sticky top-0 z-10 bg-black text-white shadow-md">
      <div className="rc-container h-12 flex items-center justify-between">
        <div className="flex gap-5 text-sm">
          <Link to="/products" className="hover:text-gray-300">Productos</Link>
          <Link to="/trace/REP-1001" className="hover:text-gray-300">Trazabilidad</Link>
          {role === "JEFE_BODEGA" && (
            <Link to="/movements" className="hover:text-gray-300">Movimientos</Link>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs">
          {role && <span className="opacity-80">({role})</span>}
          <button onClick={handleLogout} className="hover:text-gray-300">Salir</button>
        </div>
      </div>
    </nav>
  );
}