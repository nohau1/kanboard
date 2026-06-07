import { Column } from './Column';
import { stages } from '../data';

export function KanbanBoard({ tasks, customers, onAddTask, onEditTask, onDeleteTask }) {
  return (
    <div className="board">
      {stages.map(stage => {
        const stageTasks = tasks.filter(t => t.stage === stage.id);
        return (
          <Column
            key={stage.id}
            id={stage.id}
            title={stage.title}
            tasks={stageTasks}
            customers={customers}
            onAddTask={onAddTask}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
          />
        );
      })}
    </div>
  );
}