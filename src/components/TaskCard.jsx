import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
      </div>
      <div className="task-actions">
        <button className="btn-icon" onClick={handleEdit} title="Редактировать">✎</button>
        <button className="btn-icon btn-delete" onClick={handleDelete} title="Удалить">✕</button>
      </div>
    </div>
  );
}