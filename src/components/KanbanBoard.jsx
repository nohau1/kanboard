import { Column } from './Column';
import { stages } from '../data';

export function KanbanBoard({ tasks, customers, customerFilter, onCustomerFilterChange, onAddTask, onEditTask, onDeleteTask }) {
  const filteredTasks = customerFilter
    ? tasks.filter(t => t.customer_id === customerFilter)
    : tasks;

  return (
    <div className="stage-board">
      <div className="stage-filter">
        <span>Заказчик:</span>
        <select value={customerFilter} onChange={e => onCustomerFilterChange(e.target.value)}>
          <option value="">Все заказчики</option>
          {customers.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {customerFilter && (
          <button type="button" className="link" onClick={() => onCustomerFilterChange('')}>
            Сбросить
          </button>
        )}
      </div>
      <div className="board">
        {stages.map(stage => {
          const stageTasks = filteredTasks.filter(t => t.stage === stage.id);
          const totalCost = stageTasks.reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
          const totalHours = stageTasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
          const total = (totalCost > 0 || totalHours > 0) ? `${totalHours.toFixed(1)} ч | ${totalCost.toLocaleString('ru-RU')} ₽` : '';

          return (
            <Column
              key={stage.id}
              id={stage.id}
              title={stage.title}
              tasks={stageTasks}
              customers={customers}
              total={total}
              onAddTask={onAddTask}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
            />
          );
        })}
      </div>
    </div>
  );
}
