const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { isValidId } = require('../utils/helpers');

const router = express.Router();

const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high'];

function isBadDate(value) {
  return value && Number.isNaN(Date.parse(value));
}

// Does this project belong to this user?
async function ownsProject(projectId, userId) {
  const r = await pool.query(
    'SELECT id FROM projects WHERE id = $1 AND owner_id = $2',
    [projectId, userId]
  );
  return r.rows.length > 0;
}

// Does this task sit inside one of this user's projects?
async function ownsTask(taskId, userId) {
  const r = await pool.query(
    `SELECT t.id FROM tasks t
     JOIN projects p ON p.id = t.project_id
     WHERE t.id = $1 AND p.owner_id = $2`,
    [taskId, userId]
  );
  return r.rows.length > 0;
}

// GET /api/projects/:projectId/tasks?status=todo&priority=high&search=report
router.get('/projects/:projectId/tasks', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!isValidId(projectId)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }
    if (!(await ownsProject(projectId, req.userId))) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { status, priority, search } = req.query;
    const conditions = ['project_id = $1'];
    const values = [projectId];

    if (status) {
      if (!STATUSES.includes(status)) {
        return res.status(400).json({ error: 'Invalid status filter' });
      }
      values.push(status);
      conditions.push(`status = $${values.length}`);
    }
    if (priority) {
      if (!PRIORITIES.includes(priority)) {
        return res.status(400).json({ error: 'Invalid priority filter' });
      }
      values.push(priority);
      conditions.push(`priority = $${values.length}`);
    }
    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(title ILIKE $${values.length} OR description ILIKE $${values.length})`);
    }

    const result = await pool.query(
      `SELECT * FROM tasks WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
      values
    );
    res.json({ tasks: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// POST /api/projects/:projectId/tasks
router.post('/projects/:projectId/tasks', auth, async (req, res) => {
  try {
    const { projectId } = req.params;
    if (!isValidId(projectId)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }
    if (!(await ownsProject(projectId, req.userId))) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { title, description, status = 'todo', priority = 'medium', due_date } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required' });
    }
    if (title.trim().length > 200) {
      return res.status(400).json({ error: 'Title must be 200 characters or less' });
    }
    if (!STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Status must be todo, in_progress or done' });
    }
    if (!PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Priority must be low, medium or high' });
    }
    if (isBadDate(due_date)) {
      return res.status(400).json({ error: 'Invalid due date' });
    }

    const result = await pool.query(
      `INSERT INTO tasks (project_id, title, description, status, priority, due_date, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        projectId,
        title.trim(),
        description ? description.trim() : null,
        status,
        priority,
        due_date || null,
        req.userId,
      ]
    );
    res.status(201).json({ task: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// PATCH /api/tasks/:id : change any of the fields below
router.patch('/tasks/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }
    if (!(await ownsTask(id, req.userId))) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const { title, status, priority, due_date } = req.body;

    if (title !== undefined && (!title.trim() || title.trim().length > 200)) {
      return res.status(400).json({ error: 'Title must be 1 to 200 characters' });
    }
    if (status !== undefined && !STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Status must be todo, in_progress or done' });
    }
    if (priority !== undefined && !PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: 'Priority must be low, medium or high' });
    }
    if (isBadDate(due_date)) {
      return res.status(400).json({ error: 'Invalid due date' });
    }

    // Only these columns can ever be updated (a safe whitelist)
    const allowed = ['title', 'description', 'status', 'priority', 'due_date'];
    const sets = [];
    const values = [];
    for (const field of allowed) {
      if (req.body[field] !== undefined) {
        let value = req.body[field];
        if (typeof value === 'string') value = value.trim();
        values.push(value === '' ? null : value);
        sets.push(`${field} = $${values.length}`);
      }
    }
    if (sets.length === 0) {
      return res.status(400).json({ error: 'Nothing to update' });
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE tasks SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );
    res.json({ task: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// DELETE /api/tasks/:id
router.delete('/tasks/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidId(id)) {
      return res.status(400).json({ error: 'Invalid task id' });
    }
    if (!(await ownsTask(id, req.userId))) {
      return res.status(404).json({ error: 'Task not found' });
    }
    await pool.query('DELETE FROM tasks WHERE id = $1', [id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;