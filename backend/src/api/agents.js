const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');
const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const multer = require('multer');

// Upload-Ordner für Agent-Dateien
const AGENTS_DIR = path.join(__dirname, '../../agents');

// Sicherstellen dass der Ordner existiert
if (!fsSync.existsSync(AGENTS_DIR)) {
  fsSync.mkdirSync(AGENTS_DIR, { recursive: true });
}

// Multer Konfiguration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, AGENTS_DIR);
  },
  filename: (req, file, cb) => {
    // Eindeutiger Dateiname mit Timestamp
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    // Nur JS-Dateien erlauben
    if (file.mimetype === 'application/javascript' ||
        file.mimetype === 'text/javascript' ||
        file.originalname.endsWith('.js')) {
      cb(null, true);
    } else {
      cb(new Error('Nur JavaScript-Dateien (.js) erlaubt'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

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

// Agent erstellen mit Datei-Upload
router.post('/', upload.single('agentFile'), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name ist erforderlich' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Agent-Datei ist erforderlich' });
    }

    const codePath = req.file.path;

    const result = await pool.query(
      `INSERT INTO agents (name, description, code_path)
       VALUES ($1, $2, $3) RETURNING *`,
      [name, description, codePath]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    // Bei Fehler hochgeladene Datei löschen
    if (req.file) {
      try { await fs.unlink(req.file.path); } catch {}
    }
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

// Agent updaten mit optionalem Datei-Upload
router.put('/:id', upload.single('agentFile'), async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    let codePath = null;

    // Falls neue Datei hochgeladen wurde
    if (req.file) {
      codePath = req.file.path;

      // Alte Datei löschen
      const oldAgent = await pool.query('SELECT code_path FROM agents WHERE id = $1', [req.params.id]);
      if (oldAgent.rows.length > 0 && oldAgent.rows[0].code_path) {
        try { await fs.unlink(oldAgent.rows[0].code_path); } catch {}
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
      [name, description, codePath, isActive === 'true' || isActive === true, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent nicht gefunden' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    // Bei Fehler neue hochgeladene Datei löschen
    if (req.file) {
      try { await fs.unlink(req.file.path); } catch {}
    }
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

    // Agent-Daten holen für Datei-Löschung
    const agentData = await pool.query('SELECT code_path FROM agents WHERE id = $1', [agentId]);

    const result = await pool.query('DELETE FROM agents WHERE id = $1 RETURNING *', [agentId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Agent nicht gefunden' });
    }

    // Agent-Datei löschen
    if (agentData.rows.length > 0 && agentData.rows[0].code_path) {
      try { await fs.unlink(agentData.rows[0].code_path); } catch {}
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
