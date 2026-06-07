import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';

export function Column({ id, title, tasks, customers }) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="column">
      <h2 className="column-title">{title}</h2>
      <div
        ref={setNodeRef}
        className={`column-content ${isOver ? 'is-over' : ''}`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => {
            const customer = customers.find(c => c.id === task.customerId);
            return (
              <TaskCard
                key={task.id}
                task={task}
                customerName={customer?.name || 'Без заказчика'}
              />
            );
          })}
        </SortableContext>
      </div>
    </div>
  );
}