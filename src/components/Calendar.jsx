import { useState, useMemo, useRef, useEffect } from 'react';

const DAY_START = 8;      // рабочий день начинается в 08:00
const DAY_END = 23;       // последний слот 23:30
const SLOT_MIN = 30;      // шаг 30 минут
const SLOT_H = 26;        // высота слота в px
const DAY_START_MIN = DAY_START * 60;

const SLOTS = [];
for (let h = DAY_START; h <= DAY_END; h++) {
  SLOTS.push({ hour: h, minute: 0 });
  SLOTS.push({ hour: h, minute: 30 });
}
const SLOT_COUNT = SLOTS.length;
const GRID_HEIGHT = SLOT_COUNT * SLOT_H;

const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function pad(n) {
  return String(n).padStart(2, '0');
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
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

function minutesToY(minutes) {
  return ((minutes - DAY_START_MIN) / SLOT_MIN) * SLOT_H;
}

function minutesToSlot(minutes) {
  return clamp(Math.round((minutes - DAY_START_MIN) / SLOT_MIN), 0, SLOT_COUNT - 1);
}

function durationMinutes(task) {
  const h = parseFloat(task.hours) || 0;
  return Math.max(SLOT_MIN, Math.round(h * 60));
}

export function Calendar({ tasks, customers, onEditTask, onAddTaskAt, onMoveTask, onResizeTask }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('week');
  const [drag, setDrag] = useState(null);
  const columnsRef = useRef(null);

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
      map[key].sort((a, b) => parseLocalDate(a.due_date) - parseLocalDate(b.due_date));
    });
    return map;
  }, [tasks]);

  const monthDates = useMemo(() => getMonthDates(currentDate), [currentDate]);
  const timeDays = view === 'day' ? [currentDate] : (view === 'week' ? getWeekDates(currentDate) : []);
  const colWidth = timeDays.length ? 100 / timeDays.length : 100;

  useEffect(() => {
    if (!drag) return;

    function slotFromY(clientY) {
      const rect = columnsRef.current.getBoundingClientRect();
      return clamp(Math.floor((clientY - rect.top) / SLOT_H), 0, SLOT_COUNT - 1);
    }
    function dayFromX(clientX) {
      const rect = columnsRef.current.getBoundingClientRect();
      return clamp(Math.floor((clientX - rect.left) / (rect.width / timeDays.length)), 0, timeDays.length - 1);
    }

    function handleMove(e) {
      if (drag.type === 'create') {
        const s = slotFromY(e.clientY);
        setDrag(d => ({ ...d, endSlot: s }));
      } else if (drag.type === 'resize') {
        const s = slotFromY(e.clientY);
        setDrag(d => ({ ...d, endSlot: Math.max(d.startSlot, s) }));
      } else if (drag.type === 'move') {
        const rect = columnsRef.current.getBoundingClientRect();
        const pointerSlot = clamp(Math.floor((e.clientY - rect.top) / SLOT_H), 0, SLOT_COUNT - 1);
        const newStartSlot = clamp(pointerSlot - drag.grabRow, 0, SLOT_COUNT - 1);
        const dayIdx = dayFromX(e.clientX);
        setDrag(d => ({ ...d, curDay: dayIdx, curStartSlot: newStartSlot, moved: true }));
      }
    }

    function handleUp() {
      const d = drag;
      if (d.type === 'create') {
        const s0 = Math.min(d.startSlot, d.endSlot);
        const s1 = Math.max(d.startSlot, d.endSlot);
        const date = timeDays[d.dayIndex];
        const str = slotToDateStr(date, s0);
        if (s0 === s1) {
          onAddTaskAt?.(str);
        } else {
          onAddTaskAt?.(str, ((s1 - s0 + 1) * SLOT_MIN) / 60);
        }
      } else if (d.type === 'resize') {
        const hours = ((d.endSlot - d.startSlot + 1) * SLOT_MIN) / 60;
        onResizeTask?.(d.taskId, hours);
      } else if (d.type === 'move') {
        if (d.moved && (d.curDay !== d.origDay || d.curStartSlot !== d.origStartSlot)) {
          onMoveTask?.(d.taskId, slotToDateStr(timeDays[d.curDay], d.curStartSlot));
        } else {
          onEditTask?.(d.task);
        }
      }
      setDrag(null);
    }

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [drag, timeDays, onAddTaskAt, onMoveTask, onResizeTask, onEditTask]);

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

  function slotToDateStr(date, slot) {
    const min = DAY_START_MIN + slot * SLOT_MIN;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(h)}:${pad(m)}:00`;
  }

  function handleColumnMouseDown(e, dayIndex) {
    if (e.button !== 0) return;
    const rect = columnsRef.current.getBoundingClientRect();
    const slot = clamp(Math.floor((e.clientY - rect.top) / SLOT_H), 0, SLOT_COUNT - 1);
    e.preventDefault();
    setDrag({ type: 'create', dayIndex, startSlot: slot, endSlot: slot });
  }

  function handleBlockMouseDown(e, task, dayIndex, startMin) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const rect = columnsRef.current.getBoundingClientRect();
    const grabY = e.clientY - rect.top - minutesToY(startMin);
    setDrag({
      type: 'move',
      task,
      taskId: task.id,
      origDay: dayIndex,
      origStartSlot: minutesToSlot(startMin),
      origStartMin: startMin,
      curDay: dayIndex,
      curStartSlot: minutesToSlot(startMin),
      grabY,
      grabRow: Math.floor(Math.max(0, grabY) / SLOT_H),
      moved: false,
    });
  }

  function handleResizeMouseDown(e, task, startMin) {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const startSlot = minutesToSlot(startMin);
    setDrag({
      type: 'resize',
      taskId: task.id,
      startSlot,
      endSlot: minutesToSlot(startMin + durationMinutes(task)),
    });
  }

  function renderBlock(task, dayIndex) {
    const start = parseLocalDate(task.due_date);
    const startMin = start.getHours() * 60 + start.getMinutes();
    let durMin = durationMinutes(task);
    if (drag && drag.type === 'resize' && drag.taskId === task.id) {
      durMin = Math.max(SLOT_MIN, (drag.endSlot - drag.startSlot + 1) * SLOT_MIN);
    }

    const top = Math.max(0, minutesToY(startMin));
    const bottom = clamp(minutesToY(startMin + durMin), 0, GRID_HEIGHT);
    const height = Math.max(SLOT_H, bottom - top) - 1;
    const cost = parseFloat(task.cost) || 0;
    const isDragging = drag && drag.type === 'move' && drag.taskId === task.id && drag.moved;

    return (
      <div
        key={task.id}
        className={`cal-block ${isDragging ? 'cal-block-moving' : ''}`}
        style={{ top, height, borderLeftColor: getStageColor(task.stage) }}
        onMouseDown={e => handleBlockMouseDown(e, task, dayIndex, startMin)}
        title={task.title}
      >
        <div className="cal-block-body">
          <span className="block-time">{formatTime(start)}</span>
          <span className="block-title">{task.title}</span>
          {cost > 0 && <span className="block-cost">{cost.toLocaleString('ru-RU')} ₽</span>}
        </div>
        <div
          className="cal-block-resize"
          onMouseDown={e => handleResizeMouseDown(e, task, startMin)}
          title="Растянуть"
        />
      </div>
    );
  }

  const monthTotal = getMonthTotals();
  const numWeeks = Math.ceil(monthDates.length / 7);

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
        <div className={`cal-time ${view} ${drag ? 'is-dragging' : ''}`}>
          <div className="cal-time-body">
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

            <div className="cal-time-grid">
              <div className="cal-gutter">
                {SLOTS.map((s, i) => (
                  <div className="cal-gutter-slot" key={i} style={{ height: SLOT_H }}>
                    {s.minute === 0 ? `${pad(s.hour)}:00` : ''}
                  </div>
                ))}
              </div>

              <div className="cal-columns" ref={columnsRef} style={{ height: GRID_HEIGHT }}>
                {timeDays.map((d, dayIndex) => (
                  <div
                    key={d.toDateString()}
                    className="cal-column"
                    onMouseDown={e => handleColumnMouseDown(e, dayIndex)}
                    style={{
                      backgroundImage: `repeating-linear-gradient(to bottom, #f0f0f0 0, #f0f0f0 1px, transparent 1px, transparent ${SLOT_H}px)`,
                      backgroundSize: `100% ${SLOT_H}px`,
                    }}
                  >
                    {(tasksByDate[d.toDateString()] || []).map(task => renderBlock(task, dayIndex))}
                  </div>
                ))}

                {drag && drag.type === 'create' && (
                  <div
                    className="cal-drag-preview create"
                    style={{
                      left: `${drag.dayIndex * colWidth}%`,
                      width: `${colWidth}%`,
                      top: Math.min(drag.startSlot, drag.endSlot) * SLOT_H,
                      height: (Math.abs(drag.endSlot - drag.startSlot) + 1) * SLOT_H,
                    }}
                  />
                )}

                {drag && drag.type === 'move' && drag.moved && (
                  <div
                    className="cal-drag-preview move"
                    style={{
                      left: `${drag.curDay * colWidth}%`,
                      width: `${colWidth}%`,
                      top: drag.curStartSlot * SLOT_H,
                      height: Math.max(SLOT_H, (durationMinutes(drag.task) / SLOT_MIN) * SLOT_H),
                    }}
                  />
                )}
              </div>
            </div>
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
