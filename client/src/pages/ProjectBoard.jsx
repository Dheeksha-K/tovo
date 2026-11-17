import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import TaskCard from '../components/TaskCard';

const COLUMNS = [
  { key: 'todo', label: 'To Do' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'done', label: 'Done' },
];

export default function ProjectBoard() {
  const { id } = useParams();

  const [project, setProject] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [error, setError] = useState('');

  // filters
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  // new task form
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [adding, setAdding] = useState(false);

  // Load the project once
  useEffect(() => {
    api
      .get(`/projects/${id}`)
      .then((res) => setProject(res.data.project))
      .catch(() => setNotFound(true));
  }, [id]);

  // Load tasks, and reload whenever a filter changes (small delay while typing)
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (priorityFilter) params.priority = priorityFilter;

      api
        .get(`/projects/${id}/tasks`, { params })
        .then((res) => {
          if (!cancelled) setTasks(res.data.tasks);
        })
        .catch(() => {
          if (!cancelled) setError('Could not load tasks');
        })
        .finally(() => {
          if (!cancelled) setLoadingTasks(false);
        });
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, search, priorityFilter]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    setAdding(true);
    try {
      const res = await api.post(`/projects/${id}/tasks`, {
        title,
        priority,
        due_date: dueDate || undefined,
      });
      setTasks([res.data.task, ...tasks]);
      setTitle('');
      setDueDate('');
      setPriority('medium');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not add the task');
    } finally {
      setAdding(false);
    }
  }

  async function handleUpdate(taskId, changes) {
    setError('');
    try {
      const res = await api.patch(`/tasks/${taskId}`, changes);
      setTasks(tasks.map((t) => (t.id === taskId ? res.data.task : t)));
    } catch (err) {
      setError(err.response?.data?.error || 'Could not update the task');
    }
  }

  async function handleDelete(taskId) {
    if (!window.confirm('Delete this task?')) return;
    setError('');
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch {
      setError('Could not delete the task');
    }
  }

  if (notFound) {
    return (
      <div className="page">
        <Topbar />
        <p>Project not found.</p>
        <Link to="/">Back to projects</Link>
      </div>
    );
  }

  return (
    <div className="page wide">
      <Topbar />

      <Link to="/" className="back">&larr; All projects</Link>
      <h2 className="project-title">{project ? project.name : 'Loading...'}</h2>
      {project?.description && <p className="muted">{project.description}</p>}

      <form className="task-form" onSubmit={handleAdd}>
        <input
          placeholder="New task title"
          value={title}
          maxLength={200}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        <button type="submit" disabled={adding}>
          {adding ? 'Adding...' : 'Add task'}
        </button>
      </form>

      <div className="filters">
        <input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
          <option value="">All priorities</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}

      {loadingTasks ? (
        <p className="muted">Loading tasks...</p>
      ) : (
        <div className="board">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.key);
            return (
              <div className="column" key={col.key}>
                <h3>
                  {col.label} <span className="count">{colTasks.length}</span>
                </h3>
                {colTasks.length === 0 && <p className="muted empty">No tasks</p>}
                {colTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}