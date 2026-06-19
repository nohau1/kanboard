import { useState, useEffect } from 'react';
import { api } from '../api';

const STAGE_OPTIONS = [
  { id: 'testing', title: 'Тестирование' },
  { id: 'done', title: 'Готово' },
  { id: 'in-progress', title: 'В работе' },
  { id: 'todo', title: 'К выполнению' },
];

export function FinanceBoard({ onEditTask, customers }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [invoiceTasks, setInvoiceTasks] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const inv = await api.invoices.list();
      setInvoices(inv);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleCreate() {
    setEditingInvoice({ isNew: true, customer_id: '', stages: ['testing', 'done'] });
    setInvoiceTasks([]);
    setSaved(false);
  }

  async function handleOpenInvoice(invoice) {
    setEditingInvoice({ ...invoice });
    try {
      const tasks = await api.invoices.getTasks(invoice.id);
      setInvoiceTasks(tasks);
    } catch (err) {
      console.error(err);
    }
    setSaved(true);
  }

  async function handleFill() {
    if (!editingInvoice?.id) return;
    setSaving(true);
    try {
      const tasks = await api.invoices.fill(editingInvoice.id, {
        stages: editingInvoice.stages
      });
      setInvoiceTasks(tasks);
      setSaved(false);
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
      setEditingInvoice({ ...created, stages: ['testing', 'done'] });
      setInvoiceTasks([]);
      setSaved(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!editingInvoice?.id) return;
    setSaving(true);
    try {
      const taskIds = invoiceTasks.map(t => t.id);
      await api.invoices.save(editingInvoice.id, { taskIds });
      setSaved(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleRemoveTask(taskId) {
    setInvoiceTasks(prev => prev.filter(t => t.id !== taskId));
    setSaved(false);
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

  async function handleUnmarkPaid() {
    if (!editingInvoice?.id) return;
    if (!confirm('Отменить оплату счёта? Все задачи будут помечены как неоплаченные.')) return;
    setSaving(true);
    try {
      const updated = await api.invoices.update(editingInvoice.id, { status: 'draft' });
      setEditingInvoice(prev => prev && { ...prev, status: updated.status, paid_at: null });
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
    setInvoiceTasks([]);
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
              <td>{inv.status === 'paid' ? 'Оплачен' : inv.status === 'draft' ? 'Черновик' : inv.status}</td>
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
          <div className="modal modal-xlarge" onMouseDown={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingInvoice.id ? 'Счёт #' + editingInvoice.id : 'Новый счёт'}</h2>
              <button type="button" className="btn-cancel" onClick={handleCloseForm}>Закрыть</button>
            </div>

            {!editingInvoice.id ? (
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
            ) : (
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
                      {!saved && editingInvoice.status !== 'paid' && <span style={{ color: '#faad14', marginLeft: 8, fontSize: 12 }}>не сохранён</span>}
                    </div>
                  </div>
                </div>

                {editingInvoice.status !== 'paid' && (
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 14, color: '#666' }}>Стадии задач для счёта</label>
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
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
                      <button className="btn-save" onClick={handleFill} disabled={saving} style={{ marginLeft: 'auto' }}>
                        {saving ? '...' : 'Заполнить'}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <table className="finance-table">
                    <thead>
                      <tr>
                        <th>Задача</th>
                        <th>Стадия</th>
                        <th>Часы</th>
                        <th>Стоимость</th>
                        <th style={{ width: 40 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceTasks.map(task => (
                        <tr key={task.id} className="task-row">
                          <td onClick={() => onEditTask?.(task)} style={{ cursor: 'pointer' }}>{task.title}</td>
                          <td><span className={`stage-badge ${task.stage}`}>{task.stage}</span></td>
                          <td>{parseFloat(task.hours || 0).toFixed(1)} ч</td>
                          <td>{parseFloat(task.cost || 0).toLocaleString('ru-RU')} ₽</td>
                          <td>
                            {editingInvoice.status !== 'paid' && (
                              <button className="btn-icon btn-delete" onClick={() => handleRemoveTask(task.id)}>✕</button>
                            )}
                          </td>
                        </tr>
                      ))}
                      {invoiceTasks.length === 0 && (
                        <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>Нет задач. Нажмите «Заполнить».</td></tr>
                      )}
                    </tbody>
                  </table>

                  {invoiceTasks.length > 0 && (
                    <div style={{ padding: '12px 0', fontWeight: 600, textAlign: 'right' }}>
                      Итого: {invoiceTasks.reduce((s, t) => s + parseFloat(t.hours || 0), 0).toFixed(1)} ч |{' '}
                      {invoiceTasks.reduce((s, t) => s + parseFloat(t.cost || 0), 0).toLocaleString('ru-RU')} ₽
                    </div>
                  )}
                </div>

                {editingInvoice.status !== 'paid' && (
                  <div className="modal-actions">
                    <button type="button" className="btn-delete-task" onClick={() => handleDeleteInvoice(editingInvoice.id)}>
                      Удалить счёт
                    </button>
                    <div className="modal-actions-right">
                      <button type="button" className="btn-save" onClick={handleSave} disabled={saving || saved}>
                        {saved ? 'Сохранено' : 'Сохранить'}
                      </button>
                      <button type="button" className="btn-save" onClick={handleMarkPaid} disabled={saving || !saved}>
                        Оплатить
                      </button>
                    </div>
                  </div>
                )}
                {editingInvoice.status === 'paid' && (
                  <div className="modal-actions">
                    <button type="button" className="btn-cancel" onClick={handleUnmarkPaid} disabled={saving}>
                      Отменить оплату
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