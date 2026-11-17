import { useState } from 'react';
import { formatDate, todayString } from '../utils/dates';

export default function TaskCard({ task, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);

  const overdue =
    task.due_date && task.status !== 'done' && task.due_date < todayString();

  async function saveTitle() {
    const clean = title.trim();
    if (!clean || clean === task.title) {
      setTitle(task.title);
      setEditing(false);
      return;
    }
    await onUpdate(task.id, { title: clean });
    setEditing(false);
  }

  return (
    <div className="task-card">
      {editing ? (
        <div className="edit-row">
          <input
            value={title}
            maxLength={200}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveTitle();
              if (e.key === 'Escape') {
                setTitle(task.title);
                setEditing(false);
              }
            }}
          />
          <button type="button" className="small" onClick={saveTitle}>Save</button>
        </div>
      ) : (
        <p className="task-title">{task.title}</p>
      )}

      <div className="task-meta">
        <span className={`badge ${task.priority}`}>{task.priority}</span>
        {task.due_date && (
          <span className={overdue ? 'due overdue' : 'due'}>
            {overdue ? 'Overdue: ' : 'Due '}
            {formatDate(task.due_date)}
          </span>
        )}
      </div>

      <div className="task-actions">
        <select
          value={task.status}
          onChange={(e) => onUpdate(task.id, { status: e.target.value })}
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="done">Done</option>
        </select>
        <button type="button" className="small ghost" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button type="button" className="small danger" onClick={() => onDelete(task.id)}>
          Delete
        </button>
      </div>
    </div>
  );
}