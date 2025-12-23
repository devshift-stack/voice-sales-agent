const { Queue, Worker } = require('bullmq');
const Redis = require('ioredis');
const { makeCall } = require('./twilio');
const { pool } = require('../utils/database');
const { broadcast } = require('./websocket');

let callQueue;
let connection;

async function initQueue() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  connection = new Redis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });

  callQueue = new Queue('calls', { connection });

  // Worker für Anrufe
  const worker = new Worker('calls', async (job) => {
    const { leadId, campaignId } = job.data;

    try {
      // Lead-Daten holen
      const leadResult = await pool.query(
        'SELECT * FROM leads WHERE id = $1',
        [leadId]
      );
      const lead = leadResult.rows[0];

      if (!lead) {
        throw new Error('Lead nicht gefunden');
      }

      // Anruf starten
      const call = await makeCall(lead.phone, campaignId, leadId);

      // Call in DB speichern
      await pool.query(
        `INSERT INTO calls (lead_id, campaign_id, twilio_sid, status, direction, started_at)
         VALUES ($1, $2, $3, 'initiated', 'outbound', NOW())`,
        [leadId, campaignId, call.sid]
      );

      // Lead Status updaten
      await pool.query(
        'UPDATE leads SET status = $1 WHERE id = $2',
        ['calling', leadId]
      );

      // Live Update
      broadcast({
        type: 'call_started',
        data: { leadId, campaignId, callSid: call.sid }
      });

      return { success: true, callSid: call.sid };

    } catch (error) {
      console.error('Call Job Error:', error);

      // Lead als failed markieren
      await pool.query(
        'UPDATE leads SET status = $1 WHERE id = $2',
        ['failed', leadId]
      );

      broadcast({
        type: 'call_failed',
        data: { leadId, error: error.message }
      });

      throw error;
    }
  }, {
    connection,
    concurrency: parseInt(process.env.MAX_CONCURRENT_CALLS) || 5
  });

  worker.on('completed', (job) => {
    console.log(`✅ Call Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`❌ Call Job ${job.id} failed:`, err.message);
  });
}

async function addCallToQueue(leadId, campaignId, priority = 0) {
  return callQueue.add('outbound-call', {
    leadId,
    campaignId
  }, {
    priority,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 60000 // 1 Minute warten bei Retry
    }
  });
}

async function getQueueStats() {
  const waiting = await callQueue.getWaitingCount();
  const active = await callQueue.getActiveCount();
  const completed = await callQueue.getCompletedCount();
  const failed = await callQueue.getFailedCount();

  return { waiting, active, completed, failed };
}

async function pauseQueue() {
  await callQueue.pause();
}

async function resumeQueue() {
  await callQueue.resume();
}

async function clearQueue() {
  await callQueue.drain();
}

module.exports = {
  initQueue,
  addCallToQueue,
  getQueueStats,
  pauseQueue,
  resumeQueue,
  clearQueue
};
