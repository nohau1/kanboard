import { useState } from 'react';
import { CustomerColumn } from './CustomerColumn';

const STAGE_ORDER = { 'in-progress': 0, 'todo': 1, 'done': 2 };

export function CustomerKanbanBoard({ tasks, customers, onAddTask, onEditTask, onDeleteTask }) {
  const [stageFilter, setStageFilter] = useState(['in-progress', 'todo']);

  const filteredTasks = tasks.filter(t => stageFilter.includes(t.stage));
  
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const orderA = STAGE_ORDER[a.stage] ?? 99;
    const orderB = STAGE_ORDER[b.stage] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return (a.position || 0) - (b.position || 0);
  });

  return (
    <div className="customer-board">
      <div className="stage-filter">
        <span>Показывать:</span>
        {['todo', 'in-progress', 'done'].map(stage => (
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
            {stage === 'todo' ? 'К выполнению' : stage === 'in-progress' ? 'В работе' : 'Готово'}
          </label>
        ))}
      </div>
      <div className="board">
        {customers.map(customer => {
          const customerTasks = sortedTasks.filter(t => t.customer_id === customer.id);
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
    </div>
  );
}