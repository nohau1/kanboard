import { useState, useEffect } from 'react';

export function TaskModal({ task, customers, stages, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [stage, setStage] = useState('todo');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setCustomerId(task.customer_id);
      setStage(task.stage);
    } else {
      setTitle('');
      setCustomerId(customers[0]?.id || '');
      setStage(stages[0]?.id || 'todo');
    }
  }, [task, customers, stages]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    
    onSave({
      title: title.trim(),
      customer_id: customerId,
      stage,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>{task ? 'Редактировать задачу' : 'Новая задача'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Название</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Заказчик</label>
            <select value={customerId} onChange={e => setCustomerId(e.target.value)}>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Стадия</label>
            <select value={stage} onChange={e => setStage(e.target.value)}>
              {stages.map(s => (
                <option key={s.id} value={s.id}>{s.title}</option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Отмена</button>
            <button type="submit" className="btn-save">Сохранить</button>
          </div>
        </form>
      </div>
    </div>
  );
}