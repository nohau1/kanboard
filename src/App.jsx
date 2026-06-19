import { useState, useEffect, useRef } from 'react';
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
import { TaskModal } from './components/TaskModal';
import { Login } from './components/Login';
import { AdminPanel } from './components/AdminPanel';
import { DBTool } from './components/DBTool';
import { Calendar } from './components/Calendar';
import { FinanceBoard } from './components/FinanceBoard';
import { api } from './api';
import { stages } from './data';
import './App.css';

function generateId() {
  return 't' + Date.now();
}

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [tasks, setTasks] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [view, setView] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    if (hash === 'customers') return 'customers';
    if (hash === 'calendar') return 'calendar';
    if (hash === 'finances') return 'finances';
    if (hash.startsWith('task/')) return 'stages';
    return 'stages';
  });
  const [modal, setModal] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showDbtool, setShowDbtool] = useState(false);
  const [loading, setLoading] = useState(true);
  const hoverStageRef = useRef(null);
  const skipHashRef = useRef(false);
  const initialLoadRef = useRef(true);
  const tasksRef = useRef([]);
  tasksRef.current = tasks;

  useEffect(() => {
    if (!loading && tasks.length > 0 && initialLoadRef.current) {
      initialLoadRef.current = false;
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('task/')) {
        const taskId = hash.replace('task/', '');
        const t = tasks.find(t => t.id === taskId);
        if (t) setModal({ mode: 'edit', task: t });
      }
    }
  }, [loading, tasks]);

  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    function handleHashChange() {
      if (skipHashRef.current) {
        skipHashRef.current = false;
        return;
      }
      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('task/')) {
        const taskId = hash.replace('task/', '');
        const t = tasksRef.current.find(t => t.id === taskId);
        if (t) {
          setModal(prev => prev?.task?.id === taskId ? prev : { mode: 'edit', task: t });
          setView('stages');
          return;
        }
      }
      if (hash === 'customers') setView('customers');
      else if (hash === 'calendar') setView('calendar');
      else if (hash === 'finances') setView('finances');
      else setView('stages');
    }
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  async function loadData() {
    try {
      const [tasksData, customersData] = await Promise.all([
        api.tasks.list(),
        api.customers.list(),
      ]);
      setTasks(tasksData);
      setCustomers(customersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

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
    ? customers.find(c => c.id === activeTask.customer_id)
    : null;

  function handleDragOver(event) {
    const stagesList = ['todo', 'in-progress', 'testing', 'done'];
    const customerIds = customers.map(c => c.id);
    
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    const activeTask = tasks.find(t => t.id === activeId);
    if (!activeTask) return;

    const overTask = tasks.find(t => t.id === overId);
    let newStage;
    
    if (overTask) {
      newStage = overTask.stage;
    } else if (stagesList.includes(overId) || customerIds.includes(overId)) {
      newStage = overId;
    } else {
      return;
    }
    
    hoverStageRef.current = newStage;
  }

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  async function handleDragEnd(event) {
    const stagesList = ['todo', 'in-progress', 'testing', 'done'];
    const customerIds = customers.map(c => c.id);
    
    const { active, over } = event;
    setActiveId(null);

    const activeId = active.id;
    const originalTask = tasks.find(t => t.id === activeId);
    if (!originalTask) return;

    const originalStage = originalTask.stage;
    const targetStage = hoverStageRef.current || originalStage;
    hoverStageRef.current = null;

    const overId = over?.id;
    const overTask = overId ? tasks.find(t => t.id === overId) : null;
    const isOverDroppable = overId && (stagesList.includes(overId) || customerIds.includes(overId));

    if (originalStage === targetStage) {
      if (overTask && overId !== activeId) {
        const stageTasks = tasks.filter(t => t.stage === targetStage);
        const oldIndex = stageTasks.findIndex(t => t.id === activeId);
        const newIndex = stageTasks.findIndex(t => t.id === overId);

        if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
          const reordered = arrayMove(stageTasks, oldIndex, newIndex);
          setTasks(current => {
            const otherTasks = current.filter(t => t.stage !== targetStage);
            return [...otherTasks, ...reordered];
          });

          try {
            const updatedTasks = await api.tasks.reorder({
              taskId: activeId,
              overId: overId,
              stage: targetStage,
            });
            setTasks(updatedTasks);
          } catch (err) {
            console.error(err);
            loadData();
          }
        }
      }
      return;
    }

    try {
      const updatedTasks = await api.tasks.reorder({
        taskId: activeId,
        overId: overTask ? overId : null,
        stage: targetStage,
      });
      setTasks(updatedTasks);
    } catch (err) {
      console.error(err);
      loadData();
    }
  }

  function handleAddTask(containerId, mode = 'stage') {
    setModal({
      mode,
      containerId,
      task: null,
    });
  }

  function handleEditTask(task) {
    setModal({
      mode: 'edit',
      containerId: null,
      task,
    });
    skipHashRef.current = true;
    window.location.hash = 'task/' + task.id;
  }

  function handleCloseModal() {
    setModal(null);
    skipHashRef.current = true;
    const hash = window.location.hash.replace('#', '');
    if (hash.startsWith('task/')) {
      window.location.hash = view;
    }
  }

  async function handleDeleteTask(taskId) {
    try {
      await api.tasks.delete(taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSaveTask(data) {
    try {
      if (modal.mode === 'edit' && modal.task) {
        const updated = await api.tasks.update(modal.task.id, data);
        setTasks(tasks.map(t => t.id === updated.id ? updated : t));
      } else if (modal.mode === 'customer') {
        const created = await api.tasks.create({ ...data, customer_id: modal.containerId });
        setTasks([created, ...tasks]);
      } else {
        const created = await api.tasks.create(data);
        setTasks([created, ...tasks]);
      }
      setModal(null);
    } catch (err) {
      alert(err.message);
    }
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setTasks([]);
    setCustomers([]);
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  if (loading) {
    return <div className="loading">Загрузка...</div>;
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Канбан-доска</h1>
        <div className="header-actions">
          <div className="view-switcher">
            <button
              className={view === 'stages' ? 'active' : ''}
              onClick={() => {
                setView('stages');
                window.location.hash = 'stages';
              }}
            >
              По стадиям
            </button>
            <button
              className={view === 'customers' ? 'active' : ''}
              onClick={() => {
                setView('customers');
                window.location.hash = 'customers';
              }}
            >
              По заказчикам
            </button>
            <button
              className={view === 'calendar' ? 'active' : ''}
              onClick={() => {
                setView('calendar');
                window.location.hash = 'calendar';
              }}
            >
              Календарь
            </button>
            <button
              className={view === 'finances' ? 'active' : ''}
              onClick={() => {
                setView('finances');
                window.location.hash = 'finances';
              }}
            >
              Финансы
            </button>
          </div>
          <button className="btn-add-header" onClick={() => handleAddTask('todo', 'stage')}>
            + Новая задача
          </button>
          <div className="user-menu">
            <span className="username">{user.username}</span>
            {user.role === 'admin' && (
              <>
                <button className="btn-admin" onClick={() => setShowAdmin(true)}>Админ</button>
                <button className="btn-admin" onClick={() => setShowDbtool(true)}>БД</button>
              </>
            )}
            <button className="btn-logout" onClick={handleLogout}>Выход</button>
          </div>
        </div>
      </header>

      {view === 'calendar' ? (
          <Calendar
            tasks={tasks}
            customers={customers}
            onEditTask={handleEditTask}
          />
        ) : view === 'finances' ? (
          <FinanceBoard onEditTask={handleEditTask} customers={customers} />
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            {view === 'stages' ? (
              <KanbanBoard
                tasks={tasks}
                customers={customers}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            ) : (
              <CustomerKanbanBoard
                tasks={tasks}
                customers={customers}
                onAddTask={handleAddTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            )}

            <DragOverlay>
              {activeTask ? (
                <TaskCard task={activeTask} customerName={activeCustomer?.name || ''} />
              ) : null}
            </DragOverlay>
          </DndContext>
        )}

      {modal && (
        <TaskModal
          task={modal.task}
          customers={customers}
          stages={stages}
          initialStage={modal.mode === 'stage' ? modal.containerId : null}
          initialCustomer={modal.mode === 'customer' ? modal.containerId : null}
          onSave={handleSaveTask}
          onClose={handleCloseModal}
          onDelete={handleDeleteTask}
        />
      )}

      {showAdmin && <AdminPanel onClose={() => setShowAdmin(false)} onEditTask={handleEditTask} tasks={tasks} />}

      {showDbtool && <DBTool onClose={() => setShowDbtool(false)} />}
    </div>
  );
}