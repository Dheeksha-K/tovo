import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import Topbar from '../components/Topbar';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  // Load my projects once, when the page opens
  useEffect(() => {
    api
      .get('/projects')
      .then((res) => setProjects(res.data.projects))
      .catch(() => setError('Could not load your projects'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const res = await api.post('/projects', { name, description });
      // Show the new project at the top without reloading
      setProjects([{ ...res.data.project, task_count: 0 }, ...projects]);
      setName('');
      setDescription('');
    } catch (err) {
      setError(err.response?.data?.error || 'Could not create the project');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id, projectName) {
    const sure = window.confirm(
      `Delete "${projectName}" and all its tasks? This cannot be undone.`
    );
    if (!sure) return;

    try {
      await api.delete(`/projects/${id}`);
      setProjects(projects.filter((p) => p.id !== id));
    } catch {
      setError('Could not delete the project');
    }
  }

  return (
    <div className="page">
      <Topbar />

      <form className="project-form" onSubmit={handleCreate}>
        <h3>New project</h3>
        <input
          placeholder="Project name"
          value={name}
          maxLength={100}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <textarea
          placeholder="Description (optional)"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button type="submit" disabled={creating}>
          {creating ? 'Creating...' : 'Create project'}
        </button>
      </form>

      {error && <p className="error">{error}</p>}

      <h2>Your projects</h2>

      {loading ? (
        <p className="muted">Loading...</p>
      ) : projects.length === 0 ? (
        <p className="muted">No projects yet. Create your first one above.</p>
      ) : (
        <div className="project-grid">
          {projects.map((p) => (
            <div className="project-card" key={p.id}>
              <Link to={`/projects/${p.id}`}>
                <h3>{p.name}</h3>
              </Link>
              <p className="muted">{p.description || 'No description'}</p>
              <div className="meta">
                <span className="muted">
                  {p.task_count} {p.task_count === 1 ? 'task' : 'tasks'}
                </span>
                <button
                  type="button"
                  className="small danger"
                  onClick={() => handleDelete(p.id, p.name)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}