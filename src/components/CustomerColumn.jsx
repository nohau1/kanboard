import { TaskCard } from './TaskCard';

const STAGE_TITLES = {
  'todo': 'К выполнению',
  'in-progress': 'В работе',
  'testing': 'Тестирование',
  'done': 'Готово',
  'paid': 'Оплачено',
};

export function CustomerColumn({ customer, tasks, total, onAddTask, onEditTask, onDeleteTask }) {
  return (
    <div className="column customer-column">
      <h2 className="column-title">
        {customer.name}
        &nbsp;<a href="#" className="link" onClick={(e) => { e.preventDefault(); onAddTask(customer.id, 'customer'); }} title="Добавить задачу">+</a>
      </h2>
      {total && <div className="column-total">{total}</div>}
      <div className="column-content">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            customerName={STAGE_TITLES[task.stage] || task.stage}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
          />
        ))}
      </div>
    </div>
  );
}