import { useState, useEffect } from 'react';
import { api } from '../api';
import './AdminPanel.css';

export function AdminPanel({ onClose, onEditTask, tasks }) {
  const [users, setUsers] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [tab, setTab] = useState('users');
  const [editingUser, setEditingUser] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [usersData, customersData] = await Promise.all([
        api.users.list(),
        api.customers.list(),
      ]);
      setUsers(usersData);
      setCustomers(customersData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveUser(data) {
    try {
      if (editingUser?.id) {
        const updated = await api.users.update(editingUser.id, data);
        setUsers(users.map(u => u.id === updated.id ? updated : u));
      } else {
        const created = await api.users.create(data);
        setUsers([created, ...users]);
      }
      setEditingUser(null);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteUser(id) {
    if (!confirm('Удалить пользователя?')) return;
    try {
      await api.users.delete(id);
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleSaveCustomer(data) {
    try {
      if (editingCustomer?.id) {
        const updated = await api.customers.update(editingCustomer.id, data);
        setCustomers(customers.map(c => c.id === updated.id ? updated : c));
      } else {
        const created = await api.customers.create(data);
        setCustomers([created, ...customers]);
      }
      setEditingCustomer(null);
    } catch (err) {
      alert(err.message);
    }
  }

  async function handleDeleteCustomer(id) {
    if (!confirm('Удалить заказчика и все его задачи?')) return;
    try {
      await api.customers.delete(id);
      setCustomers(customers.filter(c => c.id !== id));
      setTasks(tasks.filter(t => t.customer_id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  if (loading) return <div className="admin-loading">Загрузка...</div>;

  return (
    <div className="admin-overlay">
      <div className="admin-panel">
        <div className="admin-header">
          <h2>Админ-панель</h2>
          <button className="btn-close" onClick={onClose}>×</button>
        </div>
        
        <div className="admin-tabs">
          <button className={tab === 'users' ? 'active' : ''} onClick={() => setTab('users')}>
            Пользователи ({users.length})
          </button>
          <button className={tab === 'customers' ? 'active' : ''} onClick={() => setTab('customers')}>
            Заказчики ({customers.length})
          </button>
          <button className={tab === 'tasks' ? 'active' : ''} onClick={() => setTab('tasks')}>
            Задачи ({tasks.length})
          </button>
        </div>

        <div className="admin-content">
          {tab === 'users' && (
            <div className="tab-content">
              <button className="btn-add" onClick={() => setEditingUser({})}>+ Добавить пользователя</button>
              
              {editingUser !== null && (
                <UserForm 
                  user={editingUser} 
                  customers={customers}
                  onSave={handleSaveUser}
                  onCancel={() => setEditingUser(null)}
                />
              )}
              
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Логин</th>
                    <th>Роль</th>
                    <th>Заказчики</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id}>
                      <td>{user.username}</td>
                      <td>
                        <span className={`role-badge ${user.role}`}>{user.role}</span>
                      </td>
                      <td>
                        {user.customerIds?.map(id => {
                          const c = customers.find(c => c.id === id);
                          return c ? <span key={id} className="customer-tag">{c.name}</span> : null;
                        })}
                      </td>
                      <td>
                        <button className="btn-icon" onClick={() => setEditingUser(user)}>✎</button>
                        <button className="btn-icon btn-delete" onClick={() => handleDeleteUser(user.id)}>✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'customers' && (
            <div className="tab-content">
              <button className="btn-add" onClick={() => setEditingCustomer({})}>+ Добавить заказчика</button>
              
              {editingCustomer !== null && (
                <CustomerForm 
                  customer={editingCustomer}
                  onSave={handleSaveCustomer}
                  onCancel={() => setEditingCustomer(null)}
                />
              )}
              
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Задач</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map(customer => {
                    const taskCount = tasks.filter(t => t.customer_id === customer.id).length;
                    return (
                      <tr key={customer.id}>
                        <td>{customer.name}</td>
                        <td>{taskCount}</td>
                        <td>
                          <button className="btn-icon" onClick={() => setEditingCustomer(customer)}>✎</button>
                          <button className="btn-icon btn-delete" onClick={() => handleDeleteCustomer(customer.id)}>✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'tasks' && (
            <div className="tab-content">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Заказчик</th>
                    <th>Стадия</th>
                    <th>Срок</th>
                    <th>Стоимость</th>
                    <th>Часы</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task.id} className="task-row" onClick={() => onEditTask?.(task)}>
                      <td>{task.title}</td>
                      <td>{task.customer_name}</td>
                      <td>
                        <span className={`stage-badge ${task.stage}`}>{task.stage}</span>
                      </td>
                      <td>{task.due_date ? new Date(task.due_date).toLocaleDateString('ru-RU') : '—'}</td>
                      <td>{task.cost ? parseFloat(task.cost).toLocaleString('ru-RU') + ' ₽' : '—'}</td>
                      <td>{task.hours ? parseFloat(task.hours) + ' ч' : '—'}</td>
                      <td>
                        <button className="btn-icon" onClick={(e) => { e.stopPropagation(); onEditTask?.(task); }}>✎</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function UserForm({ user, customers, onSave, onCancel }) {
  const [username, setUsername] = useState(user?.username || '');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState(user?.role || 'user');
  const [selectedCustomers, setSelectedCustomers] = useState(user?.customerIds || []);

  function handleSubmit(e) {
    e.preventDefault();
    onSave({
      username,
      password: password || undefined,
      role,
      customerIds: selectedCustomers,
    });
  }

  function toggleCustomer(id) {
    setSelectedCustomers(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  }

  return (
    <form className="inline-form" onSubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Логин"
        value={username}
        onChange={e => setUsername(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder={user ? 'Новый пароль (оставьте пустым)' : 'Пароль'}
        value={password}
        onChange={e => setPassword(e.target.value)}
        required={!user}
      />
      <select value={role} onChange={e => setRole(e.target.value)}>
        <option value="user">Пользователь</option>
        <option value="admin">Администратор</option>
      </select>
      <div className="customer-checkboxes">
        {customers.map(c => (
          <label key={c.id}>
            <input
              type="checkbox"
              checked={selectedCustomers.includes(c.id)}
              onChange={() => toggleCustomer(c.id)}
            />
            {c.name}
          </label>
        ))}
      </div>
      <div className="form-actions">
        <button type="submit">Сохранить</button>
        <button type="button" className="btn-cancel" onClick={onCancel}>Отмена</button>
      </div>
    </form>
  );
}

function CustomerForm({ customer, onSave, onCancel }) {
  const [name, setName] = useState(customer?.name || '');
  const [inn, setInn] = useState(customer?.inn || '');
  const [legal_name, setLegalName] = useState(customer?.legal_name || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [phone, setPhone] = useState(customer?.phone || '');

  function handleSubmit(e) {
    e.preventDefault();
    onSave({ name, inn, legal_name, address, phone });
  }

  return (
    <form className="customer-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label>Название</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required />
      </div>
      <div className="form-group">
        <label>Юридическое название</label>
        <input type="text" value={legal_name} onChange={e => setLegalName(e.target.value)} />
      </div>
      <div className="form-row">
        <div className="form-group">
          <label>ИНН</label>
          <input type="text" value={inn} onChange={e => setInn(e.target.value)} />
        </div>
        <div className="form-group">
          <label>Телефон</label>
          <input type="text" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label>Адрес</label>
        <input type="text" value={address} onChange={e => setAddress(e.target.value)} />
      </div>
      <div className="form-actions">
        <button type="submit">Сохранить</button>
        <button type="button" className="btn-cancel" onClick={onCancel}>Отмена</button>
      </div>
    </form>
  );
}