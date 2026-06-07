import { useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';

export function Column({ id, title, tasks, customers, onAddTask, onEditTask, onDeleteTask }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="column">
      <h2 className="column-title">
        {title}
        <button className="btn-add" onClick={() => onAddTask(id)} title="Добавить задачу">+</button>
      </h2>
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