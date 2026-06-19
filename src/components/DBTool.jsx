import { useState, useEffect } from 'react';

async function fetchApi(url, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`https://your-domain.com${url}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
  return res.json();
}

export function DBTool({ onClose }) {
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [columns, setColumns] = useState([]);
  const [data, setData] = useState([]);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('browse');

  useEffect(() => {
    loadTables();
  }, []);

  async function loadTables() {
    setLoading(true);
    try {
      const tables = await fetchApi('/api/db/tables');
      setTables(tables);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  async function selectTable(table) {
    setSelectedTable(table);
    setTab('browse');
    try {
      const [cols, rows] = await Promise.all([
        fetchApi(`/api/db/columns/${table}`),
        fetchApi(`/api/db/data/${table}`),
      ]);
      setColumns(cols);
      setData(rows);
    } catch (err) {
      setError(err.message);
    }
  }

  async function runQuery() {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetchApi('/api/db/query', {
        method: 'POST',
        body: JSON.stringify({ sql: query.trim() }),
      });
      if (res.error) {
        setError(res.error);
        setResult(null);
      } else {
        setResult(res.rows);
        setError('');
      }
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose} style={{ zIndex: 4000 }}>
      <div className="modal modal-dbtool" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>База данных</h2>
          <button className="btn-cancel" onClick={onClose}>Закрыть</button>
        </div>

        <div className="view-switcher" style={{ marginBottom: 16 }}>
          <button className={tab === 'browse' ? 'active' : ''} onClick={() => setTab('browse')}>Обзор</button>
          <button className={tab === 'query' ? 'active' : ''} onClick={() => setTab('query')}>Запрос</button>
        </div>

        {tab === 'browse' && (
          <div style={{ display: 'flex', gap: 16 }}>
            <div className="db-tables-list">
              {tables.map(t => (
                <div
                  key={t}
                  className={`db-table-item ${selectedTable === t ? 'selected' : ''}`}
                  onClick={() => selectTable(t)}
                >
                  {t}
                </div>
              ))}
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              {selectedTable && (
                <div>
                  <h3 style={{ margin: '0 0 8px' }}>{selectedTable}</h3>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
                    {columns.map(c => `${c.Field} (${c.Type})`).join(', ')}
                  </div>
                  <div className="db-data-wrap">
                    <table className="db-table">
                      <thead>
                        <tr>
                          {columns.map(c => <th key={c.Field}>{c.Field}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((row, i) => (
                          <tr key={i}>
                            {columns.map(c => (
                              <td key={c.Field}>{row[c.Field] !== null ? String(row[c.Field]) : <i style={{ color: '#ccc' }}>NULL</i>}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'query' && (
          <div>
            <textarea
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="SELECT * FROM tasks WHERE ..."
              rows={4}
              style={{ width: '100%', padding: 8, fontFamily: 'monospace', fontSize: 14, borderRadius: 6, border: '1px solid #d9d9d9' }}
              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) runQuery(); }}
            />
            <button className="btn-save" onClick={runQuery} disabled={loading || !query.trim()} style={{ marginTop: 8 }}>
              {loading ? '...' : 'Выполнить'}
            </button>
            <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>Ctrl+Enter</div>

            {error && <div style={{ color: '#ff4d4f', marginTop: 12 }}>{error}</div>}

            {result && (
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                  {Array.isArray(result) ? `${result.length} строк` : `${result} затронуто`}
                </div>
                <div className="db-data-wrap">
                  <table className="db-table">
                    <thead>
                      <tr>
                        {Array.isArray(result) && result.length > 0 && Object.keys(result[0]).map(k => <th key={k}>{k}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(result) && result.map((row, i) => (
                        <tr key={i}>
                          {Object.values(row).map((val, j) => (
                            <td key={j}>{val !== null ? String(val) : <i style={{ color: '#ccc' }}>NULL</i>}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}