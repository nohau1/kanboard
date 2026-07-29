import { useState, useEffect, useRef } from 'react';
import { ImageWithAuth } from './ImageWithAuth';
import { ImagePreview } from './ImagePreview';
import { AudioPlayer } from './AudioPlayer';

const STAGE_LABELS = {
  'todo': 'К выполнению',
  'in-progress': 'В работе',
  'testing': 'Тестирование',
  'done': 'Готово',
  'paid': 'Оплачено',
};

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
  const [blobUrls, setBlobUrls] = useState({});
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
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
      loadHistory(task.id);
    } else {
      setTitle('');
      setCustomerId(initialCustomer || customers[0]?.id || '');
      setStage(initialStage || stages[0]?.id || 'todo');
      setDueDate('');
      setCost('');
      setHours('');
      setDescription('');
      setAttachments([]);
      setHistory([]);
      setShowHistory(false);
    }
  }, [task, customers, stages, initialStage, initialCustomer]);

  useEffect(() => {
    if (task && pendingPaste.current) {
      const { file, name } = pendingPaste.current;
      pendingPaste.current = null;
      uploadFile(file, name);
    }
  }, [task]);

  useEffect(() => {
    return () => {
      Object.values(blobUrls).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  async function loadBlobUrl(attachment) {
    if (blobUrls[attachment.id]) return blobUrls[attachment.id];
    
    try {
      const res = await fetch(`/api/attachments/download/${attachment.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        setBlobUrls(prev => ({ ...prev, [attachment.id]: url }));
        return url;
      }
    } catch (err) {
      console.error('Failed to load blob:', err);
    }
    return null;
  }

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

  async function loadHistory(taskId) {
    try {
      const res = await fetch(`/api/tasks/${taskId}/history`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    }
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

  function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer?.files;
    if (!files || !task) return;
    for (const file of files) {
      uploadFile(file, file.name);
    }
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

  function isAudio(mimeType) {
    return mimeType?.startsWith('audio/') || /\.(mp3|wav|ogg|flac|m4a)$/i.test(mimeType || '');
  }

  function handleShare() {
    const url = window.location.origin + window.location.pathname + '#task/' + task.id;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <div className="modal modal-large" onMouseDown={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{task ? 'Редактировать задачу' : 'Новая задача'}</h2>
          {task && (
            <button type="button" className="btn-share" onClick={handleShare}>
              {copied ? 'Скопировано!' : 'Поделиться'}
            </button>
          )}
        </div>
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
              {task && (
                <button type="button" className="btn-history" onClick={() => setShowHistory(!showHistory)}>
                  {showHistory ? 'Скрыть историю' : 'История'}
                </button>
              )}
            </div>
          </div>
          {showHistory && history.length > 0 && (
            <div className="history-panel">
              {history.map(h => (
                <div key={h.id} className="history-item">
                  <span className="history-date">{new Date(h.created_at).toLocaleString('ru-RU')}</span>
                  <span className="history-user">{h.username || '—'}</span>
                  <span className="history-change">
                    {h.field === 'stage' && (
                      <>{STAGE_LABELS[h.old_value] || h.old_value} → {STAGE_LABELS[h.new_value] || h.new_value}</>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="form-group">
            <label>Срок исполнения</label>
            <div className="datetime-picker">
              <input
                type="date"
                value={dueDate ? dueDate.substring(0, 10) : ''}
                onChange={e => {
                  const d = e.target.value;
                  setDueDate(d ? d + 'T' + (dueDate ? dueDate.substring(11, 16) : '12:00') : '');
                }}
                style={{ flex: 1 }}
              />
              <div className="time-picker">
                <select
                  className="time-hour"
                  value={dueDate ? dueDate.substring(11, 13) : '12'}
                  onChange={e => {
                    const h = e.target.value;
                    const m = dueDate ? dueDate.substring(14, 16) : '00';
                    setDueDate((dueDate ? dueDate.substring(0, 10) : new Date().toISOString().substring(0, 10)) + 'T' + h + ':' + m);
                  }}
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={String(i).padStart(2, '0')}>{String(i).padStart(2, '0')}</option>
                  ))}
                </select>
                <span>:</span>
                <button
                  type="button"
                  className={'min-btn ' + (dueDate?.substring(14, 16) === '00' ? 'active' : '')}
                  onClick={() => {
                    if (dueDate) setDueDate(dueDate.substring(0, 14) + '00');
                  }}
                >00</button>
                <button
                  type="button"
                  className={'min-btn ' + (dueDate?.substring(14, 16) === '30' ? 'active' : '')}
                  onClick={() => {
                    if (dueDate) setDueDate(dueDate.substring(0, 14) + '30');
                  }}
                >30</button>
              </div>
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
              onDragOver={handleDragOver}
              onDrop={handleDrop}
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
              <div className="attachments-area" onDragOver={handleDragOver} onDrop={handleDrop}>
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
                          <ImageWithAuth
                            src={`/api/attachments/download/${att.id}?thumb=1`}
                            alt={att.original_name}
                            className="attachment-image"
                            onClick={() => setPreviewAttachment(att)}
                          />
                        ) : isAudio(att.mime_type) ? (
                          <AudioPlayer src={`/api/attachments/download/${att.id}`} />
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
      {previewAttachment && (
        <ImagePreview
          src={`/api/attachments/download/${previewAttachment.id}`}
          alt={previewAttachment.original_name}
          onClose={() => setPreviewAttachment(null)}
        />
      )}
    </div>
  );
}