import { Column } from './Column';
import { stages } from '../data';

function formatCurrency(num) {
  return num ? num.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }) : '0 ₽';
}

export function KanbanBoard({ tasks, customers, onAddTask, onEditTask, onDeleteTask }) {
  return (
    <div className="board">
      {stages.map(stage => {
        const stageTasks = tasks.filter(t => t.stage === stage.id);
        const totalCost = stageTasks.reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
        const totalHours = stageTasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
        
        return (
          <Column
            key={stage.id}
            id={stage.id}
            title={stage.title}
            tasks={stageTasks}
            customers={customers}
            total={totalCost + ' ₽ | ' + totalHours + ' ч'}
            onAddTask={onAddTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        );
      })}
    </div>
  );
}