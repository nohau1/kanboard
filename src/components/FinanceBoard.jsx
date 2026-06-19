import { useState, useEffect } from 'react';
import { api } from '../api';

const STAGE_OPTIONS = [
  { id: 'testing', title: 'Тестирование' },
  { id: 'done', title: 'Готово' },
  { id: 'in-progress', title: 'В работе' },
  { id: 'todo', title: 'К выполнению' },
];

export function FinanceBoard({ onEditTask }) {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [inv, cust] = await Promise.all([
        api.invoices.list(),
        api.customers.list(),
      ]);
      setInvoices(inv);
      setCustomers(cust);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleCreate() {
    setEditingInvoice({ isNew: true, customer_id: '', stages: ['testing', 'done'], tasks: [] });
  }

  function handleEdit(invoice) {
    setEditingInvoice({ ...invoice, tasks: null });
  }

  async function handleOpenInvoice(invoice) {
    setEditingInvoice({ ...invoice, tasks: null });
    const tasks = await api.invoices.getTasks(invoice.id);
    setEditingInvoice(prev => prev && { ...prev, tasks });
  }

  async function handleFill() {
    if (!editingInvoice?.id) return;
    setSaving(true);
    try {
      const tasks = await api.invoices.fill(editingInvoice.id, {
        stages: editingInvoice.stages
      });
      setEditingInvoice(prev => prev && { ...prev, tasks });
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateInvoice() {
    if (!editingInvoice?.customer_id) {
      alert('Выберите заказчика');
      return;
    }
    setSaving(true);
    try {
      const created = await api.invoices.create({ customer_id: editingInvoice.customer_id });
      setEditingInvoice({ ...created, stages: ['testing', 'done'], tasks: [], isNew: true });
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleMarkPaid() {
    if (!editingInvoice?.id) return;
    if (!confirm('Отметить счёт как оплаченный? Все задачи в нём будут помечены оплаченными.')) return;
    setSaving(true);
    try {
      const updated = await api.invoices.update(editingInvoice.id, { status: 'paid' });
      setEditingInvoice(prev => prev && { ...prev, status: updated.status, paid_at: updated.paid_at });
      setInvoices(prev => prev.map(i => i.id === updated.id ? updated : i));
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteInvoice(id) {
    if (!confirm('Удалить счёт?')) return;
    try {
      await api.invoices.delete(id);
      setInvoices(prev => prev.filter(i => i.id !== id));
      setEditingInvoice(null);
    } catch (err) {
      alert(err.message);
    }
  }

  function handleCloseForm() {
    setEditingInvoice(null);
    loadData();
  }

  if (loading) return <div className="loading">Загрузка...</div>;

  return (
    <div className="finance-board">
      <div className="finance-header">
        <h2>Счета</h2>
        <button className="btn-add-header" onClick={handleCreate}>+ Новый счёт</button>
      </div>

      <table className="finance-table">
        <thead>
          <tr>
            <th>Счёт</th>
            <th>Заказчик</th>
            <th>Статус</th>
            <th>Создан</th>
            <th>Оплачен</th>
            <th>Действия</th>
          </tr>
        </thead>
        <tbody>
          {invoices.map(inv => (
            <tr key={inv.id} className={inv.status === 'paid' ? 'paid-row' : ''}>
              <td className="link" onClick={() => handleOpenInvoice(inv)}>Счёт #{inv.id}</td>
              <td>{inv.customer_name}</td>
              <td>{inv.status === 'paid' ? 'Оплачен' : 'Черновик'}</td>
              <td>{new Date(inv.created_at).toLocaleDateString('ru-RU')}</td>
              <td>{inv.paid_at ? new Date(inv.paid_at).toLocaleDateString('ru-RU') : '—'}</td>
              <td>
                <button className="btn-icon" onClick={() => handleOpenInvoice(inv)}>✎</button>
                <button className="btn-icon btn-delete" onClick={() => handleDeleteInvoice(inv.id)}>✕</button>
              </td>
            </tr>
          ))}
          {invoices.length === 0 && (
            <tr><td colSpan={6} style={{ textAlign: 'center', color: '#999' }}>Нет счетов</td></tr>
          )}
        </tbody>
      </table>

      {editingInvoice && (
        <div className="modal-overlay" onMouseDown={() => {}}>
          <div className="modal modal-large" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingInvoice.isNew ? (editingInvoice.id ? 'Новый счёт' : 'Новый счёт') : 'Счёт #' + editingInvoice.id}</h2>
              <button type="button" className="btn-cancel" onClick={handleCloseForm}>Закрыть</button>
            </div>

            {(!editingInvoice.id && editingInvoice.isNew) ? (
              <div className="form-group">
                <label>Заказчик</label>
                {customers.length === 0 ? (
                  <div style={{ color: '#999', padding: '8px 0' }}>Нет заказчиков. Сначала создайте заказчика в Админке.</div>
                ) : (
                  <>
                    <select value={editingInvoice.customer_id} onChange={e => setEditingInvoice(prev => ({ ...prev, customer_id: e.target.value }))}>
                      <option value="">Выберите...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button className="btn-save" onClick={handleCreateInvoice} disabled={saving} style={{ marginTop: 12 }}>
                      Создать счёт
                    </button>
                  </>
                )}
              </div>
            ) : editingInvoice.id && (
              <div>
                <div className="form-row" style={{ marginBottom: 16 }}>
                  <div className="form-group">
                    <label>Заказчик</label>
                    <div style={{ padding: '8px 0' }}>{editingInvoice.customer_name}</div>
                  </div>
                  <div className="form-group">
                    <label>Статус</label>
                    <div style={{ padding: '8px 0' }}>
                      {editingInvoice.status === 'paid' ? 'Оплачен' + (editingInvoice.paid_at ? ' ' + new Date(editingInvoice.paid_at).toLocaleDateString('ru-RU') : '') : 'Черновик'}
                    </div>
                  </div>
                </div>

                {editingInvoice.status !== 'paid' && (
                  <div className="form-row" style={{ marginBottom: 16, alignItems: 'flex-end' }}>
                    <div className="form-group">
                      <label>Стадии задач для счёта</label>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 0' }}>
                        {STAGE_OPTIONS.map(s => (
                          <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={editingInvoice.stages?.includes(s.id)}
                              onChange={() => {
                                setEditingInvoice(prev => ({
                                  ...prev,
                                  stages: prev.stages?.includes(s.id)
                                    ? prev.stages.filter(x => x !== s.id)
                                    : [...(prev.stages || []), s.id]
                                }));
                              }}
                            />
                            {s.title}
                          </label>
                        ))}
                      </div>
                    </div>
                    <button className="btn-save" onClick={handleFill} disabled={saving}>
                      {saving ? '...' : 'Заполнить'}
                    </button>
                  </div>
                )}

                {editingInvoice.tasks !== null && (
                  <div>
                    <table className="finance-table">
                      <thead>
                        <tr>
                          <th>Задача</th>
                          <th>Стадия</th>
                          <th>Стоимость</th>
                          <th>Часы</th>
                          <th>Оплачено</th>
                        </tr>
                      </thead>
                      <tbody>
                        {editingInvoice.tasks?.map(task => (
                          <tr key={task.id} className="task-row" onClick={() => onEditTask?.(task)}>
                            <td>{task.title}</td>
                            <td><span className={`stage-badge ${task.stage}`}>{task.stage}</span></td>
                            <td>{parseFloat(task.cost || 0).toLocaleString('ru-RU')} ₽</td>
                            <td>{parseFloat(task.hours || 0).toFixed(1)} ч</td>
                            <td>{task.paid ? 'Да' : 'Нет'}</td>
                          </tr>
                        ))}
                        {(!editingInvoice.tasks || editingInvoice.tasks.length === 0) && (
                          <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>Нет задач. Нажмите «Заполнить».</td></tr>
                        )}
                      </tbody>
                    </table>

                    {editingInvoice.tasks?.length > 0 && (
                      <div style={{ padding: '12px 0', fontWeight: 600, textAlign: 'right' }}>
                        Итого: {editingInvoice.tasks.reduce((s, t) => s + parseFloat(t.cost || 0), 0).toLocaleString('ru-RU')} ₽ |{' '}
                        {editingInvoice.tasks.reduce((s, t) => s + parseFloat(t.hours || 0), 0).toFixed(1)} ч
                      </div>
                    )}
                  </div>
                )}

                {editingInvoice.status !== 'paid' && (
                  <div className="modal-actions">
                    <button type="button" className="btn-delete-task" onClick={() => handleDeleteInvoice(editingInvoice.id)}>
                      Удалить счёт
                    </button>
                    <button type="button" className="btn-save" onClick={handleMarkPaid} disabled={saving}>
                      Отметить оплату
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}