import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function formatDueDate(dateStr) {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date - now;
  const isOverdue = diff < 0 && date.toDateString() !== now.toDateString();
  
  return {
    text: date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
    isOverdue,
  };
}

export function TaskCard({ task, customerName, onEdit, onDelete }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const dueDate = formatDueDate(task.due_date);

  function handleEdit(e) {
    e.stopPropagation();
    onEdit?.(task);
  }

  function handleDelete(e) {
    e.stopPropagation();
    if (confirm('Удалить задачу "' + task.title + '"?')) {
      onDelete?.(task.id);
    }
  }

  return (
    <div ref={setNodeRef} style={style} className="task-card" {...attributes} {...listeners}>
      <div className="task-content">
        <div className="task-title">{task.title}</div>
        <div className="task-customer">{customerName || task.customer_name}</div>
        {dueDate && (
          <div className={`task-due-date ${dueDate.isOverdue ? 'overdue' : ''}`}>
            📅 {dueDate.text}
          </div>
        )}
        {(task.cost > 0 || task.hours > 0) && (
          <div className="task-stats">
            {task.cost > 0 && <span>{parseFloat(task.cost).toLocaleString('ru-RU')} ₽</span>}
            {task.hours > 0 && <span>{parseFloat(task.hours).toFixed(1)} ч</span>}
          </div>
        )}
      </div>
      <div className="task-actions">
        <button className="btn-icon" onClick={handleEdit} title="Редактировать">✎</button>
        <button className="btn-icon btn-delete" onClick={handleDelete} title="Удалить">✕</button>
      </div>
    </div>
  );
}