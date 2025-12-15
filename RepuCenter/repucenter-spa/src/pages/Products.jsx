import { useEffect, useState } from 'react';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL;

export default function Products() {
  const [q, setQ] = useState('REP-1001');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async (term) => {
    try {
      setLoading(true);
      const res = await axios.get(`${API}/products`, {
        params: term ? { q: term } : {},
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setItems(res.data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(q); }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Productos</h1>

      <div className="flex gap-2 mb-6">
        <input
          className="flex-1 px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ej: REP-1001"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button
          onClick={() => fetchData(q)}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          Buscar
        </button>
      </div>

      {loading && <div className="text-gray-500 text-sm">Cargando…</div>}

      <div className="space-y-3">
        {items.map((p) => (
          <div key={p.sku} className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">{p.sku} — {p.name}</div>
                <div className="text-sm text-gray-600">
                  Stock total: <span className="font-medium text-gray-800">{p.total_stock}</span>
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {p.by_warehouse?.map(b => (
                    <span key={b.warehouse} className="mr-4">{b.warehouse}: {b.stock}</span>
                  ))}
                </div>
              </div>
              <a
                href={`/trace/${p.sku}`}
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm"
              >
                Ver trazabilidad
              </a>
            </div>
          </div>
        ))}
        {items.length === 0 && !loading && (
          <div className="text-gray-500 text-sm">Sin resultados.</div>
        )}
      </div>
    </div>
  );
}