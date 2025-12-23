const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');
const fs = require('fs').promises;
const path = require('path');

// Alle Agents abrufen
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT a.*,
        (SELECT COUNT(*) FROM campaigns WHERE agent_id = a.id) as campaign_count
      FROM agents a
      ORDER BY a.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agent erstellen
router.post('/', async (req, res) => {
  try {
    const { name, description, codePath } = req.body;

    if (!name || !codePath) {
      return res.status(400).json({ error: 'Name und Code-Pfad sind erforderlich' });
    }

    // Prüfen ob Datei existiert
    try {
      await fs.access(codePath);
    } catch {
      return res.status(400).json({ error: 'Datei nicht gefunden: ' + codePath });
    }

    const result = await pool.query(
      `INSERT INTO agents (name, description, code_path)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, description, codePath]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agent Details
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM agents WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent nicht gefunden' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agent Code lesen
router.get('/:id/code', async (req, res) => {
  try {
    const result = await pool.query('SELECT code_path FROM agents WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent nicht gefunden' });
    }

    const codePath = result.rows[0].code_path;

    try {
      const code = await fs.readFile(codePath, 'utf-8');
      res.json({ code, path: codePath });
    } catch {
      res.status(404).json({ error: 'Code-Datei nicht gefunden: ' + codePath });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agent updaten
router.put('/:id', async (req, res) => {
  try {
    const { name, description, codePath, isActive } = req.body;

    // Falls neuer Code-Pfad, prüfen ob Datei existiert
    if (codePath) {
      try {
        await fs.access(codePath);
      } catch {
        return res.status(400).json({ error: 'Datei nicht gefunden: ' + codePath });
      }
    }

    const result = await pool.query(
      `UPDATE agents SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        code_path = COALESCE($3, code_path),
        is_active = COALESCE($4, is_active),
        updated_at = NOW()
       WHERE id = $5 RETURNING *`,
      [name, description, codePath, isActive, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent nicht gefunden' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agent löschen
router.delete('/:id', async (req, res) => {
  try {
    const agentId = req.params.id;

    // Prüfen ob Agent in Campaigns verwendet wird
    const usageCheck = await pool.query(
      'SELECT COUNT(*) FROM campaigns WHERE agent_id = $1',
      [agentId]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({
        error: 'Agent wird noch in Campaigns verwendet',
        campaignCount: parseInt(usageCheck.rows[0].count)
      });
    }

    const result = await pool.query('DELETE FROM agents WHERE id = $1 RETURNING *', [agentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent nicht gefunden' });
    }

    res.json({ success: true, message: 'Agent gelöscht' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Agent aktivieren/deaktivieren
router.post('/:id/toggle', async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE agents SET
        is_active = NOT is_active,
        updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent nicht gefunden' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
