const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');
const { isValidId } = require('../utils/helpers');

const router = express.Router();
router.use(auth); // every route below needs a valid token

// GET /api/projects : my projects, with a task count
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.id, p.name, p.description, p.created_at,
              COUNT(t.id)::int AS task_count
       FROM projects p
       LEFT JOIN tasks t ON t.project_id = p.id
       WHERE p.owner_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [req.userId]
    );
    res.json({ projects: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// POST /api/projects : create a project
router.post('/', async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    if (name.trim().length > 100) {
      return res.status(400).json({ error: 'Project name must be 100 characters or less' });
    }

    const result = await pool.query(
      `INSERT INTO projects (name, description, owner_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, description, created_at`,
      [name.trim(), description ? description.trim() : null, req.userId]
    );
    res.status(201).json({ project: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// GET /api/projects/:id : one project
router.get('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }
    const result = await pool.query(
      'SELECT id, name, description, created_at FROM projects WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ project: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// PATCH /api/projects/:id : rename or change description
router.patch('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }
    const { name, description } = req.body;

    if (name !== undefined && (!name.trim() || name.trim().length > 100)) {
      return res.status(400).json({ error: 'Name must be 1 to 100 characters' });
    }

    // COALESCE keeps the old value when a field isn't sent
    const result = await pool.query(
      `UPDATE projects
       SET name = COALESCE($1, name),
           description = COALESCE($2, description)
       WHERE id = $3 AND owner_id = $4
       RETURNING id, name, description, created_at`,
      [
        name !== undefined ? name.trim() : null,
        description !== undefined ? description.trim() : null,
        req.params.id,
        req.userId,
      ]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ project: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// DELETE /api/projects/:id : also deletes its tasks (ON DELETE CASCADE)
router.delete('/:id', async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ error: 'Invalid project id' });
    }
    const result = await pool.query(
      'DELETE FROM projects WHERE id = $1 AND owner_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json({ message: 'Project deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;