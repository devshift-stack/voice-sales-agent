const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL ||
    `postgresql://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

async function initDatabase() {
  const client = await pool.connect();

  try {
    // Users Tabelle
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Campaigns Tabelle
    await client.query(`
      CREATE TABLE IF NOT EXISTS campaigns (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'paused',
        prompt_id INTEGER,
        schedule_start TIME,
        schedule_end TIME,
        schedule_days VARCHAR(50),
        max_concurrent INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Leads Tabelle (Sales-Listen)
    await client.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES campaigns(id),
        phone VARCHAR(50) NOT NULL,
        name VARCHAR(255),
        email VARCHAR(255),
        company VARCHAR(255),
        extra_data JSONB,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Calls Tabelle
    await client.query(`
      CREATE TABLE IF NOT EXISTS calls (
        id SERIAL PRIMARY KEY,
        lead_id INTEGER REFERENCES leads(id),
        campaign_id INTEGER REFERENCES campaigns(id),
        twilio_sid VARCHAR(255),
        status VARCHAR(50) DEFAULT 'queued',
        direction VARCHAR(20) DEFAULT 'outbound',
        duration INTEGER,
        recording_url TEXT,
        transcript TEXT,
        outcome VARCHAR(50),
        collected_data JSONB,
        ai_summary TEXT,
        started_at TIMESTAMP,
        ended_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Prompts Tabelle
    await client.query(`
      CREATE TABLE IF NOT EXISTS prompts (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        system_prompt TEXT NOT NULL,
        greeting TEXT,
        objection_handlers JSONB,
        closing_script TEXT,
        data_fields JSONB,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Call Transcripts (für Konversationsverlauf)
    await client.query(`
      CREATE TABLE IF NOT EXISTS call_messages (
        id SERIAL PRIMARY KEY,
        call_id INTEGER REFERENCES calls(id),
        role VARCHAR(20),
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Settings Tabelle (API Keys etc.)
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) UNIQUE,
        twilio_account_sid VARCHAR(255),
        twilio_auth_token VARCHAR(255),
        twilio_phone_number VARCHAR(50),
        elevenlabs_api_key VARCHAR(255),
        elevenlabs_voice_id VARCHAR(255),
        openai_api_key VARCHAR(255),
        openai_model VARCHAR(50) DEFAULT 'gpt-4',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indizes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads(campaign_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_calls_campaign ON calls(campaign_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status)`);

    console.log('✅ Datenbank-Schema erstellt');
  } finally {
    client.release();
  }
}

module.exports = { pool, initDatabase };
