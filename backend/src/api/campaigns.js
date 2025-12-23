const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');
const { addCallToQueue, pauseQueue, resumeQueue } = require('../services/queue');
const { broadcast } = require('../services/websocket');
const cron = require('node-cron');

// Aktive Scheduler
const schedulers = new Map();

// Alle Campaigns
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT c.*,
        (SELECT COUNT(*) FROM leads WHERE campaign_id = c.id) as total_leads,
        (SELECT COUNT(*) FROM leads WHERE campaign_id = c.id AND status = 'pending') as pending_leads,
        (SELECT COUNT(*) FROM calls WHERE campaign_id = c.id AND status = 'completed') as completed_calls
      FROM campaigns c
      ORDER BY c.created_at DESC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Campaign erstellen
router.post('/', async (req, res) => {
  try {
    const { name, promptId, scheduleStart, scheduleEnd, scheduleDays, maxConcurrent } = req.body;

    const result = await pool.query(
      `INSERT INTO campaigns (name, prompt_id, schedule_start, schedule_end, schedule_days, max_concurrent)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, promptId, scheduleStart, scheduleEnd, scheduleDays, maxConcurrent || 1]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Campaign Details
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM campaigns WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign nicht gefunden' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Campaign updaten
router.put('/:id', async (req, res) => {
  try {
    const { name, promptId, scheduleStart, scheduleEnd, scheduleDays, maxConcurrent } = req.body;

    const result = await pool.query(
      `UPDATE campaigns SET
        name = COALESCE($1, name),
        prompt_id = COALESCE($2, prompt_id),
        schedule_start = COALESCE($3, schedule_start),
        schedule_end = COALESCE($4, schedule_end),
        schedule_days = COALESCE($5, schedule_days),
        max_concurrent = COALESCE($6, max_concurrent),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [name, promptId, scheduleStart, scheduleEnd, scheduleDays, maxConcurrent, req.params.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Campaign starten
router.post('/:id/start', async (req, res) => {
  try {
    const campaignId = req.params.id;

    // Campaign Status updaten
    await pool.query(
      'UPDATE campaigns SET status = $1 WHERE id = $2',
      ['active', campaignId]
    );

    // Campaign-Daten holen
    const campaignResult = await pool.query('SELECT * FROM campaigns WHERE id = $1', [campaignId]);
    const campaign = campaignResult.rows[0];

    // Scheduler starten wenn Zeitplan vorhanden
    if (campaign.schedule_start && campaign.schedule_end) {
      startScheduler(campaign);
    } else {
      // Sofort Calls zur Queue hinzufügen
      await queuePendingCalls(campaignId, campaign.max_concurrent);
    }

    broadcast({ type: 'campaign_started', data: { campaignId } });

    res.json({ success: true, message: 'Campaign gestartet' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Campaign pausieren
router.post('/:id/pause', async (req, res) => {
  try {
    const campaignId = req.params.id;

    await pool.query(
      'UPDATE campaigns SET status = $1 WHERE id = $2',
      ['paused', campaignId]
    );

    // Scheduler stoppen
    stopScheduler(campaignId);

    broadcast({ type: 'campaign_paused', data: { campaignId } });

    res.json({ success: true, message: 'Campaign pausiert' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Campaign stoppen
router.post('/:id/stop', async (req, res) => {
  try {
    const campaignId = req.params.id;

    await pool.query(
      'UPDATE campaigns SET status = $1 WHERE id = $2',
      ['stopped', campaignId]
    );

    stopScheduler(campaignId);

    broadcast({ type: 'campaign_stopped', data: { campaignId } });

    res.json({ success: true, message: 'Campaign gestoppt' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Leads einer Campaign
router.get('/:id/leads', async (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;

    let query = 'SELECT * FROM leads WHERE campaign_id = $1';
    const params = [req.params.id];

    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calls einer Campaign
router.get('/:id/calls', async (req, res) => {
  try {
    const { status, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT c.*, l.name as lead_name, l.phone as lead_phone
      FROM calls c
      LEFT JOIN leads l ON c.lead_id = l.id
      WHERE c.campaign_id = $1
    `;
    const params = [req.params.id];

    if (status) {
      query += ' AND c.status = $2';
      params.push(status);
    }

    query += ' ORDER BY c.created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper: Pending Calls zur Queue hinzufügen
async function queuePendingCalls(campaignId, limit = 5) {
  const result = await pool.query(
    `SELECT id FROM leads WHERE campaign_id = $1 AND status = 'pending' LIMIT $2`,
    [campaignId, limit]
  );

  for (const lead of result.rows) {
    await addCallToQueue(lead.id, campaignId);
  }

  return result.rows.length;
}

// Helper: Scheduler starten
function startScheduler(campaign) {
  const { id, schedule_start, schedule_end, schedule_days, max_concurrent } = campaign;

  // Bestehenden Scheduler stoppen
  stopScheduler(id);

  // Cron expression: Jede Minute prüfen
  const job = cron.schedule('* * * * *', async () => {
    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDay = now.getDay(); // 0 = Sonntag

    // Prüfen ob innerhalb Zeitfenster
    const days = schedule_days?.split(',').map(d => parseInt(d)) || [1, 2, 3, 4, 5];

    if (days.includes(currentDay) && currentTime >= schedule_start && currentTime <= schedule_end) {
      // Prüfen ob Campaign noch aktiv
      const result = await pool.query('SELECT status FROM campaigns WHERE id = $1', [id]);
      if (result.rows[0]?.status === 'active') {
        await queuePendingCalls(id, max_concurrent);
      }
    }
  });

  schedulers.set(id, job);
}

// Helper: Scheduler stoppen
function stopScheduler(campaignId) {
  const job = schedulers.get(campaignId);
  if (job) {
    job.stop();
    schedulers.delete(campaignId);
  }
}

module.exports = router;
