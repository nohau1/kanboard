import { useState, useEffect } from 'react';

export function TaskModal({ task, customers, stages, initialStage, initialCustomer, onSave, onClose }) {
  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [stage, setStage] = useState('todo');
  const [dueDate, setDueDate] = useState('');
  const [cost, setCost] = useState('');
  const [hours, setHours] = useState('');

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setCustomerId(task.customer_id);
      setStage(task.stage);
      setDueDate(task.due_date ? task.due_date.replace(' ', 'T').substring(0, 16) : '');
      setCost(task.cost || '');
      setHours(task.hours || '');
    } else {
      setTitle('');
      setCustomerId(initialCustomer || customers[0]?.id || '');
      setStage(initialStage || stages[0]?.id || 'todo');
      setDueDate('');
      setCost('');
      setHours('');
    }
  }, [task, customers, stages, initialStage, initialCustomer]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    
    const formattedDueDate = dueDate ? dueDate.replace('T', ' ') + ':00' : null;
    
    onSave({
      title: title.trim(),
      customer_id: customerId,
      stage,
      due_date: formattedDueDate,
      cost: cost ? parseFloat(cost) : 0,
      hours: hours ? parseFloat(hours) : 0,
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
          <div className="form-group">
            <label>Срок исполнения</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Стоимость</label>
              <input
                type="number"
                step="0.01"
                value={cost}
                onChange={e => setCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="form-group">
              <label>Часы</label>
              <input
                type="number"
                step="0.5"
                value={hours}
                onChange={e => setHours(e.target.value)}
                placeholder="0"
              />
            </div>
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