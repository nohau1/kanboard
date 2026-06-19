import { useState } from 'react';
import { CustomerColumn } from './CustomerColumn';

const STAGE_ORDER = { 'in-progress': 0, 'testing': 1, 'todo': 2, 'done': 3 };

export function CustomerKanbanBoard({ tasks, customers, onAddTask, onEditTask, onDeleteTask }) {
  const [stageFilter, setStageFilter] = useState(['in-progress', 'testing', 'todo']);

  const filteredTasks = tasks.filter(t => stageFilter.includes(t.stage));
  
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const orderA = STAGE_ORDER[a.stage] ?? 99;
    const orderB = STAGE_ORDER[b.stage] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return (a.position || 0) - (b.position || 0);
  });

  const customersWithTasks = customers.filter(c => 
    sortedTasks.some(t => t.customer_id === c.id)
  );

  return (
    <div className="customer-board">
      <div className="stage-filter">
        <span>Показывать:</span>
        {['todo', 'in-progress', 'testing', 'done'].map(stage => (
          <label key={stage}>
            <input
              type="checkbox"
              checked={stageFilter.includes(stage)}
              onChange={() => {
                if (stageFilter.includes(stage)) {
                  setStageFilter(stageFilter.filter(s => s !== stage));
                } else {
                  setStageFilter([...stageFilter, stage]);
                }
              }}
            />
            {stage === 'todo' ? 'К выполнению' : stage === 'in-progress' ? 'В работе' : stage === 'testing' ? 'Тестирование' : 'Готово'}
          </label>
        ))}
      </div>
      <div className="board">
        {customersWithTasks.map(customer => {
          const customerTasks = sortedTasks.filter(t => t.customer_id === customer.id);
          const totalCost = customerTasks.reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
          const totalHours = customerTasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
          const total = (totalCost > 0 || totalHours > 0) ? totalCost.toLocaleString('ru-RU') + ' ₽ | ' + totalHours.toFixed(1) + ' ч' : '';
          
          return (
            <CustomerColumn
              key={customer.id}
              customer={customer}
              tasks={customerTasks}
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