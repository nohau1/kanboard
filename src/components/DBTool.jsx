import { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || '';

async function fetchApi(url, options = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_URL}${url}`, {
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
  const [pkColumn, setPkColumn] = useState('id');
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('browse');
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

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
    setEditingCell(null);
    try {
      const [cols, rows] = await Promise.all([
        fetchApi(`/api/db/columns/${table}`),
        fetchApi(`/api/db/data/${table}`),
      ]);
      setColumns(cols);
      setData(rows);
      const pk = cols.find(c => c.Key === 'PRI');
      if (pk) setPkColumn(pk.Field);
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(rowIdx, colName) {
    const row = data[rowIdx];
    if (!row) return;
    const val = row[colName];
    setEditingCell({ rowIdx, colName });
    setEditValue(val === null ? '' : String(val));
  }

  function cancelEdit() {
    setEditingCell(null);
  }

  async function saveEdit() {
    if (!editingCell || !selectedTable) return;
    const { rowIdx, colName } = editingCell;
    const row = data[rowIdx];
    const pkVal = row[pkColumn];

    let newVal = editValue.trim();
    const sqlVal = newVal === '' ? 'NULL' : `'${newVal.replace(/'/g, "\\'")}'`;

    setSaving(true);
    try {
      await fetchApi('/api/db/query', {
        method: 'POST',
        body: JSON.stringify({
          sql: `UPDATE ${selectedTable} SET ${colName} = ${sqlVal} WHERE ${pkColumn} = '${String(pkVal).replace(/'/g, "\\'")}'`
        }),
      });

      setData(prev => prev.map((r, i) =>
        i === rowIdx ? { ...r, [colName]: newVal === '' ? null : editValue } : r
      ));
      setEditingCell(null);
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  }

  function handleCellKeyDown(e) {
    if (e.key === 'Enter') saveEdit();
    if (e.key === 'Escape') cancelEdit();
    if (e.key === 'Tab') {
      e.preventDefault();
      saveEdit();
      // move to next cell
      const { rowIdx, colName } = editingCell;
      const colIdx = columns.findIndex(c => c.Field === colName);
      if (colIdx < columns.length - 1) {
        setTimeout(() => startEdit(rowIdx, columns[colIdx + 1].Field), 50);
      }
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
          <div style={{ display: 'flex', gap: 16, flex: 1, overflow: 'hidden' }}>
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
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
              {selectedTable && (
                <div>
                  <h3 style={{ margin: '0 0 8px' }}>{selectedTable}</h3>
                  <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>
                    {columns.map(c => `${c.Field} (${c.Type})`).join(', ')}
                  </div>
                  <div style={{ fontSize: 11, color: '#999', marginBottom: 8 }}>
                    Клик по ячейке для редактирования. Enter — сохранить, Esc — отмена, Tab — далее.
                    {saving && ' Сохранение...'}
                  </div>
                  <div className="db-data-wrap">
                    <table className="db-table">
                      <thead>
                        <tr>
                          {columns.map(c => <th key={c.Field}>{c.Field}{c.Key === 'PRI' ? ' *' : ''}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {data.map((row, i) => (
                          <tr key={i}>
                            {columns.map(c => (
                              <td
                                key={c.Field}
                                className="db-cell"
                                onClick={() => startEdit(i, c.Field)}
                              >
                                {editingCell?.rowIdx === i && editingCell?.colName === c.Field ? (
                                  <input
                                    className="db-cell-input"
                                    value={editValue}
                                    onChange={e => setEditValue(e.target.value)}
                                    onBlur={saveEdit}
                                    onKeyDown={handleCellKeyDown}
                                    autoFocus
                                  />
                                ) : (
                                  row[c.Field] !== null ? String(row[c.Field]) : <i style={{ color: '#ccc' }}>NULL</i>
                                )}
                              </td>
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