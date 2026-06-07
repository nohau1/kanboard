import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';

export function CustomerColumn({ customer, tasks }) {
  const { setNodeRef, isOver } = useDroppable({ id: customer.id });

  return (
    <div className="column customer-column">
      <h2 className="column-title">{customer.name}</h2>
      <div
        ref={setNodeRef}
        className={`column-content ${isOver ? 'is-over' : ''}`}
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              customerName={customer.name}
            />
          ))}
        </SortableContext>
      </div>
    </div>
  );
}