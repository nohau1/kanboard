import { useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';

export function Column({ id, title, tasks, customers, total, onAddTask, onEditTask, onDeleteTask }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="column">
      <h2 className="column-title">
        {title}
        &nbsp;<a href="#" className="link" onClick={(e) => { e.preventDefault(); onAddTask(id); }} title="Добавить задачу">+</a>
      </h2>
      {total && <div className="column-total">{total}</div>}
      <div
        ref={setNodeRef}
        id={id}
        className={`column-content ${isOver ? 'is-over' : ''}`}
      >
        <SortableContext items={tasks.map(t => t.id)}>
          {tasks.map(task => {
            const customer = customers.find(c => c.id === task.customer_id);
            return (
              <TaskCard
                key={task.id}
                task={task}
                customerName={customer?.name || task.customer_name || 'Без заказчика'}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
              />
            );
          })}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="empty-drop-zone">Перетащите задачу сюда</div>
        )}
      </div>
    </div>
  );
}
