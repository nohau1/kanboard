import { useDroppable } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';

const STAGE_TITLES = {
  'todo': 'К выполнению',
  'in-progress': 'В работе',
  'testing': 'Тестирование',
  'done': 'Готово',
};

export function CustomerColumn({ customer, tasks, onAddTask, onEditTask, onDeleteTask }) {
  const { setNodeRef, isOver } = useDroppable({ id: customer.id });

  return (
    <div className="column customer-column">
      <h2 className="column-title">
        {customer.name}
        &nbsp;<a href="#" className="link" onClick={(e) => { e.preventDefault(); onAddTask(customer.id, 'customer'); }} title="Добавить задачу">+</a>
      </h2>
      <div
        ref={setNodeRef}
        id={customer.id}
        className={`column-content ${isOver ? 'is-over' : ''}`}
      >
        <SortableContext items={tasks.map(t => t.id)}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              customerName={STAGE_TITLES[task.stage] || task.stage}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="empty-drop-zone">Перетащите задачу сюда</div>
        )}
      </div>
    </div>
  );
}
