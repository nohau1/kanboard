import { useState, useMemo } from 'react';

const STAGE_TITLES = {
  'todo': 'К выполнению',
  'in-progress': 'В работе',
  'testing': 'Тестирование',
  'done': 'Готово',
};

function formatDate(date) {
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function formatTime(date) {
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function getWeekDates(date) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function getMonthDates(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  
  const start = new Date(firstDay);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  
  const dates = [];
  const endDate = new Date(lastDay);
  endDate.setDate(lastDay.getDate() + (7 - lastDay.getDay() === 7 ? 0 : 7 - lastDay.getDay()));
  
  const current = new Date(start);
  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

function parseLocalDate(dateStr) {
  if (!dateStr) return null;
  
  let date;
  const parts = String(dateStr).split(' ');
  if (parts.length >= 2) {
    const [year, month, day] = parts[0].split('-').map(Number);
    const [hours, minutes] = parts[1].split(':').map(Number);
    date = new Date(year, month - 1, day, hours || 0, minutes || 0);
  } else {
    date = new Date(dateStr);
  }
  
  return isNaN(date.getTime()) ? null : date;
}

export function Calendar({ tasks, customers, onEditTask }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week');

  const tasksByDate = useMemo(() => {
    const map = {};
    tasks.forEach(task => {
      if (!task.due_date) return;
      const date = parseLocalDate(task.due_date);
      if (!date || isNaN(date.getTime())) return;
      const key = date.toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(task);
    });
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => {
        const dateA = parseLocalDate(a.due_date);
        const dateB = parseLocalDate(b.due_date);
        return dateA - dateB;
      });
    });
    return map;
  }, [tasks]);

  function navigate(direction) {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  }

  function goToToday() {
    setCurrentDate(new Date());
  }

  function getTitle() {
    if (view === 'day') {
      return currentDate.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    } else if (view === 'week') {
      const dates = getWeekDates(currentDate);
      return `${formatDate(dates[0])} - ${formatDate(dates[6])}, ${dates[0].getFullYear()}`;
    } else {
      return currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    }
  }

  function getDates() {
    if (view === 'day') {
      return [currentDate];
    } else if (view === 'week') {
      return getWeekDates(currentDate);
    } else {
      return getMonthDates(currentDate);
    }
  }

  function isToday(date) {
    return isSameDay(date, new Date());
  }

  function isCurrentMonth(date) {
    return date.getMonth() === currentDate.getMonth();
  }

  function getStageColor(stage) {
    switch (stage) {
      case 'todo': return '#999';
      case 'in-progress': return '#1890ff';
      case 'testing': return '#faad14';
      case 'done': return '#52c41a';
      default: return '#999';
    }
  }

  const dates = getDates();

  return (
    <div className="calendar">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button onClick={() => navigate(-1)}>&lt;</button>
          <button onClick={goToToday}>Сегодня</button>
          <button onClick={() => navigate(1)}>&gt;</button>
        </div>
        <h2 className="calendar-title">{getTitle()}</h2>
        <div className="calendar-views">
          {['day', 'week', 'month'].map(v => (
            <button
              key={v}
              className={view === v ? 'active' : ''}
              onClick={() => setView(v)}
            >
              {v === 'day' ? 'День' : v === 'week' ? 'Неделя' : 'Месяц'}
            </button>
          ))}
        </div>
      </div>

      <div className={`calendar-grid ${view}`}>
        {view !== 'day' && (
          <div className="calendar-weekdays">
            {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, i) => (
              <div key={i} className="weekday">{day}</div>
            ))}
          </div>
        )}
        
        <div className="calendar-days">
          {dates.map((date, idx) => {
            const key = date.toDateString();
            const dayTasks = tasksByDate[key] || [];
            const dayCost = dayTasks.reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
            const dayHours = dayTasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
            const dayTotal = dayCost > 0 || dayHours > 0
              ? `${dayCost.toLocaleString('ru-RU')} ₽ | ${dayHours.toFixed(1)} ч`
              : '';
            
            return (
              <div
                key={key}
                className={`calendar-day ${isToday(date) ? 'today' : ''} ${view === 'month' && !isCurrentMonth(date) ? 'other-month' : ''}`}
              >
                {view !== 'day' && (
                  <div className="day-header">
                    <span className="day-number">{date.getDate()}</span>
                  </div>
                )}
                {dayTotal && view === 'month' && (
                  <div className="day-total">{dayTotal}</div>
                )}
                <div className="day-tasks">
                  {dayTasks.map(task => (
                    <div
                      key={task.id}
                      className="calendar-task"
                      style={{ borderLeftColor: getStageColor(task.stage) }}
                      onClick={() => onEditTask(task)}
                    >
                      {view !== 'month' && (
                        <span className="task-time">{formatTime(parseLocalDate(task.due_date))}</span>
                      )}
                      <span className="task-title">{task.title}</span>
                      {view !== 'month' && (
                        <span className="task-cost">{task.cost ? task.cost.toLocaleString('ru-RU') + ' ₽' : ''}</span>
                      )}
                      {view !== 'month' && (
                        <span className="task-customer">{task.customer_name}</span>
                      )}
                    </div>
                  ))}
                  {dayTasks.length === 0 && view === 'day' && (
                    <div className="no-tasks">Нет задач</div>
                  )}
                </div>
                {dayTotal && view !== 'month' && (
                  <div className="day-footer-total">{dayTotal}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}