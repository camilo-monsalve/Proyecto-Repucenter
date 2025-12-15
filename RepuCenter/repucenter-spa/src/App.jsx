import { Routes, Route, Navigate } from 'react-router-dom'
import NavBar from './components/NavBar.jsx'

// Páginas
import LoginPage from './pages/Login.jsx'
import ProductsPage from './pages/Products.jsx'
import TracePage from './pages/Trace.jsx'
import MovementsPage from './pages/Movements.jsx'

// --- Guardas simples usando localStorage ---
function RequireAuth({ children }) {
  const token = localStorage.getItem('token')
  return token ? children : <Navigate to="/login" replace />
}

function RequireManager({ children }) {
  const role = (localStorage.getItem('role') || '').toUpperCase().trim()
  return role === 'JEFE_BODEGA' ? children : <Navigate to="/products" replace />
}

export default function App() {
  return (
    <>
      {/* NavBar ahora sí está DENTRO del Router, gracias a main.jsx */}
      <NavBar />

      <Routes>
        <Route path="/" element={<Navigate to="/products" replace />} />

        {/* Login libre */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protegidas */}
        <Route
          path="/products"
          element={
            <RequireAuth>
              <ProductsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/trace/:sku"
          element={
            <RequireAuth>
              <TracePage />
            </RequireAuth>
          }
        />

        {/* Sólo Jefe de Bodega */}
        <Route
          path="/movements"
          element={
            <RequireAuth>
              <RequireManager>
                <MovementsPage />
              </RequireManager>
            </RequireAuth>
          }
        />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/products" replace />} />
      </Routes>
    </>
  )
}