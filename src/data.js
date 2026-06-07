export const initialCustomers = [
  { id: 'c1', name: 'ООО "Ромашка"' },
  { id: 'c2', name: 'ИП Сидоров' },
  { id: 'c3', name: 'АО "Мегакорп"' },
];

export const initialTasks = [
  { id: 't1', title: 'Дизайн главной страницы', stage: 'todo', customerId: 'c1' },
  { id: 't2', title: 'Настройка сервера', stage: 'todo', customerId: 'c2' },
  { id: 't3', title: 'Интеграция API', stage: 'in-progress', customerId: 'c1' },
  { id: 't4', title: 'Тестирование модуля', stage: 'in-progress', customerId: 'c3' },
  { id: 't5', title: 'Документация', stage: 'done', customerId: 'c2' },
  { id: 't6', title: 'Исправление багов', stage: 'done', customerId: 'c1' },
  { id: 't7', title: 'Оптимизация БД', stage: 'todo', customerId: 'c3' },
  { id: 't8', title: 'Деплой на prod', stage: 'in-progress', customerId: 'c2' },
];

export const stages = [
  { id: 'todo', title: 'К выполнению' },
  { id: 'in-progress', title: 'В работе' },
  { id: 'done', title: 'Готово' },
];
