import { CustomerColumn } from './CustomerColumn';

export function CustomerKanbanBoard({ tasks, customers, onAddTask, onEditTask, onDeleteTask }) {
  return (
    <div className="board">
      {customers.map(customer => {
        const customerTasks = tasks.filter(t => t.customer_id === customer.id);
        return (
          <CustomerColumn
            key={customer.id}
            customer={customer}
            tasks={customerTasks}
            onAddTask={onAddTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        );
      })}
    </div>
  );
}