import { CustomerColumn } from './CustomerColumn';

export function CustomerKanbanBoard({ tasks, customers }) {
  return (
    <div className="board">
      {customers.map(customer => {
        const customerTasks = tasks.filter(t => t.customerId === customer.id);
        return (
          <CustomerColumn
            key={customer.id}
            customer={customer}
            tasks={customerTasks}
          />
        );
      })}
    </div>
  );
}