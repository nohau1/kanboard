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

function formatTotal(cost, hours) {
  if (cost > 0 || hours > 0) {
    return `${cost.toLocaleString('ru-RU')} ₽ | ${hours.toFixed(1)} ч`;
  }
  return '';
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

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const monthDates = useMemo(() => getMonthDates(currentDate), [currentDate]);

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
      return `${formatDate(weekDates[0])} - ${formatDate(weekDates[6])}, ${weekDates[0].getFullYear()}`;
    } else {
      return currentDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
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

  function getDayTotals(date) {
    const key = date.toDateString();
    const dayTasks = tasksByDate[key] || [];
    const cost = dayTasks.reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
    const hours = dayTasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
    return { cost, hours, tasks: dayTasks };
  }

  function getWeekTotals(weekStartIndex) {
    let totalCost = 0;
    let totalHours = 0;
    for (let i = 0; i < 7; i++) {
      const idx = weekStartIndex + i;
      if (monthDates[idx]) {
        const { cost, hours } = getDayTotals(monthDates[idx]);
        totalCost += cost;
        totalHours += hours;
      }
    }
    return { cost: totalCost, hours: totalHours };
  }

  function getMonthTotals() {
    let totalCost = 0;
    let totalHours = 0;
    monthDates.forEach(date => {
      if (isCurrentMonth(date)) {
        const { cost, hours } = getDayTotals(date);
        totalCost += cost;
        totalHours += hours;
      }
    });
    return { cost: totalCost, hours: totalHours };
  }

  function renderDayContent(date, dayTotal) {
    return (
      <>
        <div className="day-header">
          <span className="day-number">{date.getDate()}</span>
          {dayTotal.tasks.length > 0 && (
            <span className="day-inline-total">{formatTotal(dayTotal.cost, dayTotal.hours)}</span>
          )}
        </div>
        <div className="day-tasks">
          {dayTotal.tasks.map(task => (
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
                <span className="task-cost">{task.cost ? parseFloat(task.cost).toLocaleString('ru-RU') + ' ₽' : ''}</span>
              )}
              {view !== 'month' && (
                <span className="task-customer">{task.customer_name}</span>
              )}
            </div>
          ))}
        </div>
      </>
    );
  }

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
            {view === 'month' && <div className="weekday week-total-header">Итого</div>}
          </div>
        )}
        
        {view === 'day' && (
          <div className="calendar-day-view">
            {(() => {
              const dayTotal = getDayTotals(currentDate);
              return (
                <>
                  <div className="day-column">
                    {renderDayContent(currentDate, dayTotal)}
                    {dayTotal.tasks.length === 0 && (
                      <div className="no-tasks">Нет задач</div>
                    )}
                  </div>
                  <div className="day-total-column">
                    <div className="total-label">Итого за день</div>
                    <div className="total-value">
                      {formatTotal(dayTotal.cost, dayTotal.hours) || '—'}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {view === 'week' && (
          <div className="calendar-week-view">
            {weekDates.map((date, idx) => {
              const dayTotal = getDayTotals(date);
              return (
                <div
                  key={date.toDateString()}
                  className={`calendar-day ${isToday(date) ? 'today' : ''}`}
                >
                  {renderDayContent(date, dayTotal)}
                </div>
              );
            })}
            <div className="calendar-day week-total">
              <div className="total-label">Итого</div>
              <div className="week-total-value">
                {formatTotal(
                  weekDates.reduce((sum, d) => sum + getDayTotals(d).cost, 0),
                  weekDates.reduce((sum, d) => sum + getDayTotals(d).hours, 0)
                )}
              </div>
            </div>
          </div>
        )}

        {view === 'month' && (
          <>
            <div className="calendar-month-view">
              <div className="calendar-month-days">
                {monthDates.map((date, idx) => {
                  const dayTotal = getDayTotals(date);
                  return (
                    <div
                      key={date.toDateString()}
                      className={`calendar-day ${isToday(date) ? 'today' : ''} ${!isCurrentMonth(date) ? 'other-month' : ''}`}
                    >
                      {renderDayContent(date, dayTotal)}
                    </div>
                  );
                })}
              </div>
              <div className="calendar-month-week-totals">
                <div className="week-totals-header">Итого</div>
                {(() => {
                  const weekTotals = [];
                  for (let i = 0; i < monthDates.length; i += 7) {
                    const weekTotal = getWeekTotals(i);
                    weekTotals.push(weekTotal);
                  }
                  return weekTotals.map((wt, i) => (
                    <div key={i} className="week-total-cell">
                      {formatTotal(wt.cost, wt.hours)}
                    </div>
                  ));
                })()}
              </div>
            </div>
            <div className="calendar-month-totals">
              <div className="month-total-label">Итого за месяц</div>
              <div className="month-total-value">
                {formatTotal(getMonthTotals().cost, getMonthTotals().hours)}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}