const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');
const { getQueueStats } = require('../services/queue');
const { getClientCount } = require('../services/websocket');

// Übersicht Statistiken
router.get('/', async (req, res) => {
  try {
    // Calls Stats
    const callsResult = await pool.query(`
      SELECT
        COUNT(*) as total_calls,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_calls,
        COUNT(*) FILTER (WHERE status IN ('initiated', 'ringing', 'in-progress')) as active_calls,
        COUNT(*) FILTER (WHERE outcome = 'interested') as interested,
        COUNT(*) FILTER (WHERE outcome = 'not_interested') as not_interested,
        COUNT(*) FILTER (WHERE outcome = 'callback') as callbacks,
        COUNT(*) FILTER (WHERE outcome = 'voicemail') as voicemails,
        AVG(duration) FILTER (WHERE duration > 0) as avg_duration
      FROM calls
    `);

    // Leads Stats
    const leadsResult = await pool.query(`
      SELECT
        COUNT(*) as total_leads,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_leads,
        COUNT(*) FILTER (WHERE status = 'interested') as interested_leads,
        COUNT(*) FILTER (WHERE status = 'not_interested') as not_interested_leads
      FROM leads
    `);

    // Campaigns Stats
    const campaignsResult = await pool.query(`
      SELECT
        COUNT(*) as total_campaigns,
        COUNT(*) FILTER (WHERE status = 'active') as active_campaigns
      FROM campaigns
    `);

    // Queue Stats
    const queueStats = await getQueueStats();

    // Heute Stats
    const todayResult = await pool.query(`
      SELECT
        COUNT(*) as calls_today,
        COUNT(*) FILTER (WHERE outcome = 'interested') as interested_today
      FROM calls
      WHERE DATE(created_at) = CURRENT_DATE
    `);

    res.json({
      calls: callsResult.rows[0],
      leads: leadsResult.rows[0],
      campaigns: campaignsResult.rows[0],
      queue: queueStats,
      today: todayResult.rows[0],
      websocketClients: getClientCount()
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Calls pro Tag (letzte 30 Tage)
router.get('/calls-per-day', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE outcome = 'interested') as interested,
        COUNT(*) FILTER (WHERE outcome = 'not_interested') as not_interested
      FROM calls
      WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Outcomes Verteilung
router.get('/outcomes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COALESCE(outcome, 'unknown') as outcome,
        COUNT(*) as count
      FROM calls
      WHERE outcome IS NOT NULL
      GROUP BY outcome
      ORDER BY count DESC
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Anrufdauer Verteilung
router.get('/duration-distribution', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        CASE
          WHEN duration < 30 THEN '< 30s'
          WHEN duration < 60 THEN '30s-1min'
          WHEN duration < 180 THEN '1-3min'
          WHEN duration < 300 THEN '3-5min'
          ELSE '> 5min'
        END as range,
        COUNT(*) as count
      FROM calls
      WHERE duration > 0
      GROUP BY range
      ORDER BY
        CASE range
          WHEN '< 30s' THEN 1
          WHEN '30s-1min' THEN 2
          WHEN '1-3min' THEN 3
          WHEN '3-5min' THEN 4
          ELSE 5
        END
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Campaign Performance
router.get('/campaign-performance', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.name,
        COUNT(DISTINCT l.id) as total_leads,
        COUNT(DISTINCT ca.id) as total_calls,
        COUNT(DISTINCT ca.id) FILTER (WHERE ca.outcome = 'interested') as interested,
        ROUND(
          COUNT(DISTINCT ca.id) FILTER (WHERE ca.outcome = 'interested')::numeric /
          NULLIF(COUNT(DISTINCT ca.id), 0) * 100, 2
        ) as conversion_rate
      FROM campaigns c
      LEFT JOIN leads l ON l.campaign_id = c.id
      LEFT JOIN calls ca ON ca.campaign_id = c.id
      GROUP BY c.id, c.name
      ORDER BY conversion_rate DESC NULLS LAST
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Stündliche Verteilung
router.get('/hourly-distribution', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        EXTRACT(HOUR FROM started_at) as hour,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE outcome = 'interested') as interested,
        ROUND(
          COUNT(*) FILTER (WHERE outcome = 'interested')::numeric /
          NULLIF(COUNT(*), 0) * 100, 2
        ) as conversion_rate
      FROM calls
      WHERE started_at IS NOT NULL
      GROUP BY hour
      ORDER BY hour
    `);

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
