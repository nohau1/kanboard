import { useState, useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { KanbanBoard } from './components/KanbanBoard';
import { CustomerKanbanBoard } from './components/CustomerKanbanBoard';
import { TaskCard } from './components/TaskCard';
import { initialTasks, initialCustomers } from './data';

const STORAGE_KEY = 'kanban-data';

function loadData() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load data:', e);
  }
  return null;
}

function saveData(tasks, customers) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ tasks, customers }));
}

export default function App() {
  const savedData = loadData();
  const [tasks, setTasks] = useState(savedData?.tasks || initialTasks);
  const [customers] = useState(savedData?.customers || initialCustomers);
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState('stages');

  useEffect(() => {
    saveData(tasks, customers);
  }, [tasks, customers]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;
  const activeCustomer = activeTask
    ? customers.find(c => c.id === activeTask.customerId)
    : null;

  function findContainer(id) {
    if (tasks.find(t => t.id === id)) {
      return id;
    }
    return tasks.find(t => t.id === id)?.stage || id;
  }

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragOver(event) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (activeContainer === overContainer) return;

    setTasks(items => {
      const activeTask = items.find(t => t.id === activeId);
      if (!activeTask) return items;

      return items.map(item => {
        if (item.id === activeId) {
          return { ...item, stage: overContainer };
        }
        return item;
      });
    });
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (activeContainer === overContainer) {
      setTasks(items => {
        const containerItems = items.filter(t => t.stage === activeContainer);
        const oldIndex = containerItems.findIndex(t => t.id === activeId);
        const newIndex = containerItems.findIndex(t => t.id === overId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(containerItems, oldIndex, newIndex);
          return items.map(item => {
            const reorderedItem = reordered.find(r => r.id === item.id);
            return reorderedItem || item;
          });
        }
        return items;
      });
    }
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Канбан-доска</h1>
        <div className="view-switcher">
          <button
            className={view === 'stages' ? 'active' : ''}
            onClick={() => setView('stages')}
          >
            По стадиям
          </button>
          <button
            className={view === 'customers' ? 'active' : ''}
            onClick={() => setView('customers')}
          >
            По заказчикам
          </button>
        </div>
      </header>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        {view === 'stages' ? (
          <KanbanBoard tasks={tasks} customers={customers} />
        ) : (
          <CustomerKanbanBoard tasks={tasks} customers={customers} />
        )}

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} customerName={activeCustomer?.name || ''} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}