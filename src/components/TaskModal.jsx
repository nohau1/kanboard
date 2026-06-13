import { useState, useEffect, useRef } from 'react';

export function TaskModal({ task, customers, stages, initialStage, initialCustomer, onSave, onClose, onDelete }) {
  const [title, setTitle] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [stage, setStage] = useState('todo');
  const [dueDate, setDueDate] = useState('');
  const [cost, setCost] = useState('');
  const [hours, setHours] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loadingAttachments, setLoadingAttachments] = useState(false);
  const [pasteWarning, setPasteWarning] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const pendingPaste = useRef(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setCustomerId(task.customer_id);
      setStage(task.stage);
      setDueDate(task.due_date ? task.due_date.substring(0, 16) : '');
      setCost(task.cost || '');
      setHours(task.hours || '');
      setDescription(task.description || '');
      loadAttachments(task.id);
    } else {
      setTitle('');
      setCustomerId(initialCustomer || customers[0]?.id || '');
      setStage(initialStage || stages[0]?.id || 'todo');
      setDueDate('');
      setCost('');
      setHours('');
      setDescription('');
      setAttachments([]);
    }
  }, [task, customers, stages, initialStage, initialCustomer]);

  useEffect(() => {
    if (task && pendingPaste.current) {
      const { file, name } = pendingPaste.current;
      pendingPaste.current = null;
      uploadFile(file, name);
    }
  }, [task]);

  async function loadAttachments(taskId) {
    setLoadingAttachments(true);
    try {
      const res = await fetch(`/api/attachments/task/${taskId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAttachments(data);
      }
    } catch (err) {
      console.error('Failed to load attachments:', err);
    }
    setLoadingAttachments(false);
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          if (!task) {
            setPasteWarning(true);
            setTimeout(() => setPasteWarning(false), 3000);
            return;
          }
          uploadFile(file, `screenshot-${Date.now()}.png`);
        }
        return;
      }
    }
  }

  async function uploadFile(file, originalName) {
    if (!task) return;
    
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('task_id', task.id);

    try {
      const res = await fetch('/api/attachments/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        setAttachments(prev => [data, ...prev]);
      }
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  }

  function handleFileChange(e) {
    const files = e.target.files;
    if (!files || !task) return;

    for (const file of files) {
      uploadFile(file, file.name);
    }
    e.target.value = '';
  }

  async function handleDeleteAttachment(attachmentId) {
    if (!confirm('Удалить вложение?')) return;

    try {
      const res = await fetch(`/api/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      }
    } catch (err) {
      console.error('Delete attachment failed:', err);
    }
  }

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
      description: description.trim() || null,
    });
  }

  function handleDelete() {
    if (confirm('Удалить задачу "' + title + '"?')) {
      onDelete?.(task.id);
      onClose?.();
    }
  }

  function isImage(mimeType) {
    return mimeType?.startsWith('image/');
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal modal-large" onMouseDown={e => e.stopPropagation()}>
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
          <div className="form-row">
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
          </div>
          <div className="form-group">
            <label>Срок исполнения</label>
            <div className="datetime-picker">
              <input
                type="datetime-local"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && e.target.blur()}
              />
              <button
                type="button"
                className="btn-datetime-ok"
                onClick={() => document.activeElement.blur()}
                disabled={!dueDate}
              >
                OK
              </button>
            </div>
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
          <div className="form-group">
            <label>Описание</label>
            <textarea
              ref={textareaRef}
              value={description}
              onChange={e => setDescription(e.target.value)}
              onPaste={handlePaste}
              placeholder="Вставьте описание или изображение (Ctrl+V для скриншота из буфера обмена)"
              rows={5}
            />
            {pasteWarning && (
              <div className="paste-warning">Сначала сохраните задачу, потом вставляйте изображения</div>
            )}
          </div>

          {task && (
            <div className="form-group">
              <label>Вложения</label>
              <div className="attachments-area">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="btn-attach"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? 'Загрузка...' : 'Прикрепить файл'}
                </button>
                {loadingAttachments && <span className="attachments-loading">Загрузка...</span>}
                {attachments.length > 0 && (
                  <div className="attachments-list">
                    {attachments.map(att => (
                      <div key={att.id} className="attachment-item">
                        {isImage(att.mime_type) ? (
                          <img
                            src={`/api/attachments/download/${att.id}`}
                            alt={att.original_name}
                            className="attachment-image"
                            onClick={() => window.open(`/api/attachments/download/${att.id}`, '_blank')}
                          />
                        ) : (
                          <span
                            className="attachment-file"
                            onClick={() => window.open(`/api/attachments/download/${att.id}`, '_blank')}
                          >
                            {att.original_name}
                          </span>
                        )}
                        <button
                          type="button"
                          className="attachment-delete"
                          onClick={() => handleDeleteAttachment(att.id)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="modal-actions">
            {task && onDelete && (
              <button type="button" className="btn-delete-task" onClick={handleDelete}>
                Удалить
              </button>
            )}
            <div className="modal-actions-right">
              <button type="button" className="btn-cancel" onClick={onClose}>Отмена</button>
              <button type="submit" className="btn-save">Сохранить</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}