const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');
const sipgate = require('../services/sipgate');

// Settings laden
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      // Default settings zurückgeben
      return res.json({
        telephony_provider: 'twilio',
        twilio_account_sid: '',
        twilio_auth_token: '',
        twilio_phone_number: '',
        sipgate_client_id: '',
        sipgate_client_secret: '',
        sipgate_phone_number: '',
        sipgate_device_id: 'p0',
        elevenlabs_api_key: '',
        elevenlabs_voice_id: '',
        openai_api_key: '',
        openai_model: 'gpt-4'
      });
    }

    // Sensible Daten maskieren für die Anzeige
    const settings = result.rows[0];
    res.json({
      telephony_provider: settings.telephony_provider || 'twilio',
      twilio_account_sid: settings.twilio_account_sid || '',
      twilio_auth_token: settings.twilio_auth_token ? '••••••••' : '',
      twilio_phone_number: settings.twilio_phone_number || '',
      sipgate_client_id: settings.sipgate_client_id || '',
      sipgate_client_secret: settings.sipgate_client_secret ? '••••••••' : '',
      sipgate_phone_number: settings.sipgate_phone_number || '',
      sipgate_device_id: settings.sipgate_device_id || 'p0',
      elevenlabs_api_key: settings.elevenlabs_api_key ? '••••••••' : '',
      elevenlabs_voice_id: settings.elevenlabs_voice_id || '',
      openai_api_key: settings.openai_api_key ? '••••••••' : '',
      openai_model: settings.openai_model || 'gpt-4'
    });
  } catch (error) {
    console.error('Settings GET Error:', error);
    res.status(500).json({ error: 'Fehler beim Laden der Einstellungen' });
  }
});

// Settings speichern
router.put('/', async (req, res) => {
  try {
    const {
      telephony_provider,
      twilio_account_sid,
      twilio_auth_token,
      twilio_phone_number,
      sipgate_client_id,
      sipgate_client_secret,
      sipgate_phone_number,
      sipgate_device_id,
      elevenlabs_api_key,
      elevenlabs_voice_id,
      openai_api_key,
      openai_model
    } = req.body;

    // Prüfen ob Settings existieren
    const existing = await pool.query(
      'SELECT id FROM settings WHERE user_id = $1',
      [req.user.id]
    );

    // Nur nicht-maskierte Werte aktualisieren
    const updates = {};
    if (telephony_provider) updates.telephony_provider = telephony_provider;
    if (twilio_account_sid) updates.twilio_account_sid = twilio_account_sid;
    if (twilio_auth_token && !twilio_auth_token.includes('••')) updates.twilio_auth_token = twilio_auth_token;
    if (twilio_phone_number) updates.twilio_phone_number = twilio_phone_number;
    if (sipgate_client_id) updates.sipgate_client_id = sipgate_client_id;
    if (sipgate_client_secret && !sipgate_client_secret.includes('••')) updates.sipgate_client_secret = sipgate_client_secret;
    if (sipgate_phone_number) updates.sipgate_phone_number = sipgate_phone_number;
    if (sipgate_device_id) updates.sipgate_device_id = sipgate_device_id;
    if (elevenlabs_api_key && !elevenlabs_api_key.includes('••')) updates.elevenlabs_api_key = elevenlabs_api_key;
    if (elevenlabs_voice_id) updates.elevenlabs_voice_id = elevenlabs_voice_id;
    if (openai_api_key && !openai_api_key.includes('••')) updates.openai_api_key = openai_api_key;
    if (openai_model) updates.openai_model = openai_model;

    if (existing.rows.length === 0) {
      // Insert
      await pool.query(
        `INSERT INTO settings (user_id, telephony_provider, twilio_account_sid, twilio_auth_token, twilio_phone_number,
         sipgate_client_id, sipgate_client_secret, sipgate_phone_number, sipgate_device_id,
         elevenlabs_api_key, elevenlabs_voice_id, openai_api_key, openai_model)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [
          req.user.id,
          updates.telephony_provider || 'twilio',
          updates.twilio_account_sid || '',
          updates.twilio_auth_token || '',
          updates.twilio_phone_number || '',
          updates.sipgate_client_id || '',
          updates.sipgate_client_secret || '',
          updates.sipgate_phone_number || '',
          updates.sipgate_device_id || 'p0',
          updates.elevenlabs_api_key || '',
          updates.elevenlabs_voice_id || '',
          updates.openai_api_key || '',
          updates.openai_model || 'gpt-4'
        ]
      );
    } else {
      // Update - nur geänderte Felder
      const setClauses = [];
      const values = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(updates)) {
        setClauses.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }

      if (setClauses.length > 0) {
        values.push(req.user.id);
        await pool.query(
          `UPDATE settings SET ${setClauses.join(', ')}, updated_at = NOW() WHERE user_id = $${paramIndex}`,
          values
        );
      }
    }

    // Environment Variables aktualisieren (für laufende Instanz)
    if (updates.telephony_provider) process.env.TELEPHONY_PROVIDER = updates.telephony_provider;
    if (updates.twilio_account_sid) process.env.TWILIO_ACCOUNT_SID = updates.twilio_account_sid;
    if (updates.twilio_auth_token) process.env.TWILIO_AUTH_TOKEN = updates.twilio_auth_token;
    if (updates.twilio_phone_number) process.env.TWILIO_PHONE_NUMBER = updates.twilio_phone_number;
    if (updates.sipgate_client_id) process.env.SIPGATE_CLIENT_ID = updates.sipgate_client_id;
    if (updates.sipgate_client_secret) {
      process.env.SIPGATE_CLIENT_SECRET = updates.sipgate_client_secret;
      sipgate.resetToken(); // Token zurücksetzen bei neuen Credentials
    }
    if (updates.sipgate_phone_number) process.env.SIPGATE_PHONE_NUMBER = updates.sipgate_phone_number;
    if (updates.sipgate_device_id) process.env.SIPGATE_DEVICE_ID = updates.sipgate_device_id;
    if (updates.elevenlabs_api_key) process.env.ELEVENLABS_API_KEY = updates.elevenlabs_api_key;
    if (updates.elevenlabs_voice_id) process.env.ELEVENLABS_VOICE_ID = updates.elevenlabs_voice_id;
    if (updates.openai_api_key) process.env.OPENAI_API_KEY = updates.openai_api_key;

    res.json({ success: true, message: 'Einstellungen gespeichert' });
  } catch (error) {
    console.error('Settings PUT Error:', error);
    res.status(500).json({ error: 'Fehler beim Speichern der Einstellungen' });
  }
});

// Twilio testen
router.post('/test/twilio', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT twilio_account_sid, twilio_auth_token FROM settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].twilio_account_sid) {
      return res.status(400).json({ error: 'Twilio nicht konfiguriert' });
    }

    const { twilio_account_sid, twilio_auth_token } = result.rows[0];
    const twilio = require('twilio');
    const client = twilio(twilio_account_sid, twilio_auth_token);

    // Account Info abrufen zum Testen
    const account = await client.api.accounts(twilio_account_sid).fetch();
    res.json({ success: true, accountName: account.friendlyName });
  } catch (error) {
    console.error('Twilio Test Error:', error);
    res.status(400).json({ error: error.message || 'Twilio-Verbindung fehlgeschlagen' });
  }
});

// ElevenLabs testen
router.post('/test/elevenlabs', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT elevenlabs_api_key FROM settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].elevenlabs_api_key) {
      return res.status(400).json({ error: 'ElevenLabs nicht konfiguriert' });
    }

    const response = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: {
        'xi-api-key': result.rows[0].elevenlabs_api_key
      }
    });

    if (!response.ok) {
      throw new Error('Ungültiger API-Key');
    }

    const user = await response.json();
    res.json({ success: true, subscription: user.subscription?.tier });
  } catch (error) {
    console.error('ElevenLabs Test Error:', error);
    res.status(400).json({ error: error.message || 'ElevenLabs-Verbindung fehlgeschlagen' });
  }
});

// OpenAI testen
router.post('/test/openai', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT openai_api_key FROM settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].openai_api_key) {
      return res.status(400).json({ error: 'OpenAI nicht konfiguriert' });
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${result.rows[0].openai_api_key}`
      }
    });

    if (!response.ok) {
      throw new Error('Ungültiger API-Key');
    }

    res.json({ success: true });
  } catch (error) {
    console.error('OpenAI Test Error:', error);
    res.status(400).json({ error: error.message || 'OpenAI-Verbindung fehlgeschlagen' });
  }
});

// ElevenLabs Voices laden
router.get('/voices', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT elevenlabs_api_key FROM settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].elevenlabs_api_key) {
      return res.status(400).json({ error: 'ElevenLabs nicht konfiguriert' });
    }

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': result.rows[0].elevenlabs_api_key
      }
    });

    if (!response.ok) {
      throw new Error('Fehler beim Laden der Stimmen');
    }

    const data = await response.json();
    res.json(data.voices || []);
  } catch (error) {
    console.error('Voices Error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Sipgate testen
router.post('/test/sipgate', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT sipgate_client_id, sipgate_client_secret FROM settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].sipgate_client_id) {
      return res.status(400).json({ error: 'Sipgate nicht konfiguriert' });
    }

    // Temporär setzen für den Test
    process.env.SIPGATE_CLIENT_ID = result.rows[0].sipgate_client_id;
    process.env.SIPGATE_CLIENT_SECRET = result.rows[0].sipgate_client_secret;
    sipgate.resetToken();

    const accountInfo = await sipgate.getAccountInfo();
    res.json({ success: true, company: accountInfo.company });
  } catch (error) {
    console.error('Sipgate Test Error:', error);
    res.status(400).json({ error: error.message || 'Sipgate-Verbindung fehlgeschlagen' });
  }
});

// Sipgate Telefonnummern abrufen
router.get('/sipgate/numbers', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT sipgate_client_id, sipgate_client_secret FROM settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].sipgate_client_id) {
      return res.status(400).json({ error: 'Sipgate nicht konfiguriert' });
    }

    process.env.SIPGATE_CLIENT_ID = result.rows[0].sipgate_client_id;
    process.env.SIPGATE_CLIENT_SECRET = result.rows[0].sipgate_client_secret;

    const numbers = await sipgate.getPhoneNumbers();
    res.json(numbers);
  } catch (error) {
    console.error('Sipgate Numbers Error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Sipgate Devices abrufen
router.get('/sipgate/devices', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT sipgate_client_id, sipgate_client_secret FROM settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].sipgate_client_id) {
      return res.status(400).json({ error: 'Sipgate nicht konfiguriert' });
    }

    process.env.SIPGATE_CLIENT_ID = result.rows[0].sipgate_client_id;
    process.env.SIPGATE_CLIENT_SECRET = result.rows[0].sipgate_client_secret;

    const devices = await sipgate.getDevices();
    res.json(devices);
  } catch (error) {
    console.error('Sipgate Devices Error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
