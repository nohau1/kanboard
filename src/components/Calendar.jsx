import { useState, useMemo } from 'react';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function pad(n) {
  return String(n).padStart(2, '0');
}

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
    const rounded = minutes >= 45 ? 0 : minutes >= 15 ? 30 : 0;
    date = new Date(year, month - 1, day, hours || 0, rounded);
  } else {
    date = new Date(dateStr);
  }

  return isNaN(date.getTime()) ? null : date;
}

function formatTotal(cost, hours) {
  if (cost > 0 || hours > 0) {
    return `${hours.toFixed(1)} ч | ${cost.toLocaleString('ru-RU')} ₽`;
  }
  return '';
}

export function Calendar({ tasks, customers, onEditTask, onAddTaskAt, onMoveTask }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week');
  const [dragOver, setDragOver] = useState(null);

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
      const dates = getWeekDates(currentDate);
      return `${formatDate(dates[0])} - ${formatDate(dates[6])}, ${dates[0].getFullYear()}`;
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
      case 'paid': return '#722ed1';
      default: return '#999';
    }
  }

  function getDayTotals(date) {
    const key = date.toDateString();
    const dayTasks = tasksByDate[key] || [];
    const cost = dayTasks.reduce((sum, t) => sum + (parseFloat(t.cost) || 0), 0);
    const hours = dayTasks.reduce((sum, t) => sum + (parseFloat(t.hours) || 0), 0);
    return { cost, hours };
  }

  function getMonthTotals() {
    let cost = 0;
    let hours = 0;
    monthDates.forEach(date => {
      if (isCurrentMonth(date)) {
        const { cost: c, hours: h } = getDayTotals(date);
        cost += c;
        hours += h;
      }
    });
    return { cost, hours };
  }

  function getWeekTotalsForMonth(weekIndex) {
    const startIdx = weekIndex * 7;
    let cost = 0;
    let hours = 0;
    for (let i = 0; i < 7; i++) {
      const idx = startIdx + i;
      if (monthDates[idx]) {
        const { cost: c, hours: h } = getDayTotals(monthDates[idx]);
        cost += c;
        hours += h;
      }
    }
    return { cost, hours };
  }

  function slotKey(date, hour) {
    return date.toDateString() + '-' + hour;
  }

  function toDateStr(date, hour) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(hour)}:00:00`;
  }

  function slotTasks(date, hour) {
    const list = tasksByDate[date.toDateString()] || [];
    return list.filter(t => {
      const d = parseLocalDate(t.due_date);
      return d && d.getHours() === hour;
    });
  }

  function handleDrop(e, date, hour) {
    e.preventDefault();
    setDragOver(null);
    const taskId = e.dataTransfer.getData('text/plain');
    if (taskId && onMoveTask) onMoveTask(taskId, toDateStr(date, hour));
  }

  function handleDragStart(e, task) {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function renderChip(task) {
    const cost = parseFloat(task.cost) || 0;
    return (
      <div
        key={task.id}
        className="cal-task-chip"
        style={{ borderLeftColor: getStageColor(task.stage) }}
        draggable
        onDragStart={e => handleDragStart(e, task)}
        onDragEnd={() => setDragOver(null)}
        onClick={e => { e.stopPropagation(); onEditTask(task); }}
        title={task.title}
      >
        <span className="chip-time">{formatTime(parseLocalDate(task.due_date))}</span>
        <span className="chip-title">{task.title}</span>
        {cost > 0 && <span className="chip-cost">{cost.toLocaleString('ru-RU')} ₽</span>}
      </div>
    );
  }

  const monthTotal = getMonthTotals();
  const numWeeks = Math.ceil(monthDates.length / 7);

  const timeDays = view === 'day' ? [currentDate] : getWeekDates(currentDate);
  const timeRangeTotal = timeDays.reduce((acc, d) => {
    const { cost, hours } = getDayTotals(d);
    return { cost: acc.cost + cost, hours: acc.hours + hours };
  }, { cost: 0, hours: 0 });

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

      {view === 'month' ? (
        <div className="calendar-grid month">
          <div className="calendar-weekdays">
            {WEEKDAYS.map((day, i) => (
              <div key={i} className="weekday">{day}</div>
            ))}
          </div>
          <div className="calendar-days">
            {monthDates.map((date) => {
              const key = date.toDateString();
              const dayTasks = tasksByDate[key] || [];
              const { cost: dayCost, hours: dayHours } = getDayTotals(date);
              const dayTotal = formatTotal(dayCost, dayHours);

              return (
                <div
                  key={key}
                  className={`calendar-day ${isToday(date) ? 'today' : ''} ${!isCurrentMonth(date) ? 'other-month' : ''}`}
                >
                  <div className="day-header">
                    <span className="day-number">{date.getDate()}</span>
                    {dayTotal && <span className="day-total-inline">{dayTotal}</span>}
                  </div>
                  <div className="day-tasks">
                    {dayTasks.map(task => (
                      <div
                        key={task.id}
                        className="calendar-task"
                        style={{ borderLeftColor: getStageColor(task.stage) }}
                        onClick={() => onEditTask(task)}
                      >
                        <span className="task-title">{task.title}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="calendar-month-summary">
            <div className="summary-row summary-month-total">
              <span>Итого за месяц:</span>
              <span>{formatTotal(monthTotal.cost, monthTotal.hours)}</span>
            </div>
            <div className="summary-weeks">
              {Array.from({ length: numWeeks }, (_, i) => {
                const wt = getWeekTotalsForMonth(i);
                return (
                  <div key={i} className="summary-row">
                    <span>Неделя {i + 1}:</span>
                    <span>{formatTotal(wt.cost, wt.hours)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className={`cal-time ${view}`}>
          <div className="cal-time-header">
            <div className="cal-gutter-header"></div>
            {timeDays.map(d => (
              <div
                key={d.toDateString()}
                className={`cal-day-head ${isToday(d) ? 'today' : ''}`}
              >
                <span className="cal-day-name">{WEEKDAYS[(d.getDay() + 6) % 7]}</span>
                <span className="cal-day-num">{d.getDate()}</span>
              </div>
            ))}
          </div>

          <div className="cal-time-body">
            {HOURS.map(hour => (
              <div className="cal-hour-row" key={hour}>
                <div className="cal-hour-label">{pad(hour)}:00</div>
                {timeDays.map(d => {
                  const cellTasks = slotTasks(d, hour);
                  return (
                    <div
                      key={d.toDateString()}
                      className={`cal-hour-cell ${dragOver === slotKey(d, hour) ? 'drag-over' : ''}`}
                      onClick={() => onAddTaskAt?.(toDateStr(d, hour))}
                      onDragOver={e => { e.preventDefault(); setDragOver(slotKey(d, hour)); }}
                      onDrop={e => handleDrop(e, d, hour)}
                    >
                      {cellTasks.map(renderChip)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="cal-time-total">
            {view === 'day' ? 'Итого за день: ' : 'Итого за неделю: '}
            {formatTotal(timeRangeTotal.cost, timeRangeTotal.hours) || '—'}
          </div>
        </div>
      )}
    </div>
  );
}
