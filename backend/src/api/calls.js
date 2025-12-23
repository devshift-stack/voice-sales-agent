const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');
const { endCall } = require('../services/twilio');

// Alle Calls
router.get('/', async (req, res) => {
  try {
    const { status, campaignId, limit = 50, offset = 0 } = req.query;

    let query = `
      SELECT c.*, l.name as lead_name, l.phone as lead_phone, cam.name as campaign_name
      FROM calls c
      LEFT JOIN leads l ON c.lead_id = l.id
      LEFT JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND c.status = $${params.length}`;
    }

    if (campaignId) {
      params.push(campaignId);
      query += ` AND c.campaign_id = $${params.length}`;
    }

    query += ' ORDER BY c.created_at DESC';

    params.push(limit);
    query += ` LIMIT $${params.length}`;

    params.push(offset);
    query += ` OFFSET $${params.length}`;

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Call Details
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, l.name as lead_name, l.phone as lead_phone, l.email as lead_email,
             cam.name as campaign_name
      FROM calls c
      LEFT JOIN leads l ON c.lead_id = l.id
      LEFT JOIN campaigns cam ON c.campaign_id = cam.id
      WHERE c.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call nicht gefunden' });
    }

    // Transkript laden
    const messagesResult = await pool.query(
      'SELECT * FROM call_messages WHERE call_id = $1 ORDER BY created_at',
      [req.params.id]
    );

    res.json({
      ...result.rows[0],
      messages: messagesResult.rows
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Call beenden
router.post('/:id/end', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT twilio_sid FROM calls WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Call nicht gefunden' });
    }

    const { twilio_sid } = result.rows[0];

    if (twilio_sid) {
      await endCall(twilio_sid);
    }

    await pool.query(
      `UPDATE calls SET status = 'cancelled', ended_at = NOW() WHERE id = $1`,
      [req.params.id]
    );

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Call Transkript
router.get('/:id/transcript', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM call_messages WHERE call_id = $1 ORDER BY created_at',
      [req.params.id]
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Aktive Calls (Live)
router.get('/active/list', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*, l.name as lead_name, l.phone as lead_phone
      FROM calls c
      LEFT JOIN leads l ON c.lead_id = l.id
      WHERE c.status IN ('initiated', 'ringing', 'in-progress')
      ORDER BY c.started_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
