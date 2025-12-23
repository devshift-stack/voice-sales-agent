const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');
const sipgate = require('../services/sipgate');
const vonage = require('../services/vonage');

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
        sipgate_token_id: '',
        sipgate_token: '',
        sipgate_phone_number: '',
        sipgate_device_id: 'p0',
        vonage_api_key: '',
        vonage_api_secret: '',
        vonage_application_id: '',
        vonage_private_key: '',
        vonage_phone_number: '',
        tts_provider: 'azure',
        elevenlabs_api_key: '',
        elevenlabs_voice_id: '',
        azure_speech_key: '',
        azure_speech_region: 'germanywestcentral',
        azure_voice_id: 'de-DE-ConradNeural',
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
      sipgate_token_id: settings.sipgate_token_id || '',
      sipgate_token: settings.sipgate_token ? '••••••••' : '',
      sipgate_phone_number: settings.sipgate_phone_number || '',
      sipgate_device_id: settings.sipgate_device_id || 'p0',
      vonage_api_key: settings.vonage_api_key || '',
      vonage_api_secret: settings.vonage_api_secret ? '••••••••' : '',
      vonage_application_id: settings.vonage_application_id || '',
      vonage_private_key: settings.vonage_private_key ? '••••••••' : '',
      vonage_phone_number: settings.vonage_phone_number || '',
      tts_provider: settings.tts_provider || 'azure',
      elevenlabs_api_key: settings.elevenlabs_api_key ? '••••••••' : '',
      elevenlabs_voice_id: settings.elevenlabs_voice_id || '',
      azure_speech_key: settings.azure_speech_key ? '••••••••' : '',
      azure_speech_region: settings.azure_speech_region || 'germanywestcentral',
      azure_voice_id: settings.azure_voice_id || 'de-DE-ConradNeural',
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
      sipgate_token_id,
      sipgate_token,
      sipgate_phone_number,
      sipgate_device_id,
      vonage_api_key,
      vonage_api_secret,
      vonage_application_id,
      vonage_private_key,
      vonage_phone_number,
      tts_provider,
      elevenlabs_api_key,
      elevenlabs_voice_id,
      azure_speech_key,
      azure_speech_region,
      azure_voice_id,
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
    if (sipgate_token_id) updates.sipgate_token_id = sipgate_token_id;
    if (sipgate_token && !sipgate_token.includes('••')) updates.sipgate_token = sipgate_token;
    if (sipgate_phone_number) updates.sipgate_phone_number = sipgate_phone_number;
    if (sipgate_device_id) updates.sipgate_device_id = sipgate_device_id;
    if (vonage_api_key) updates.vonage_api_key = vonage_api_key;
    if (vonage_api_secret && !vonage_api_secret.includes('••')) updates.vonage_api_secret = vonage_api_secret;
    if (vonage_application_id) updates.vonage_application_id = vonage_application_id;
    if (vonage_private_key && !vonage_private_key.includes('••')) updates.vonage_private_key = vonage_private_key;
    if (vonage_phone_number) updates.vonage_phone_number = vonage_phone_number;
    if (tts_provider) updates.tts_provider = tts_provider;
    if (elevenlabs_api_key && !elevenlabs_api_key.includes('••')) updates.elevenlabs_api_key = elevenlabs_api_key;
    if (elevenlabs_voice_id) updates.elevenlabs_voice_id = elevenlabs_voice_id;
    if (azure_speech_key && !azure_speech_key.includes('••')) updates.azure_speech_key = azure_speech_key;
    if (azure_speech_region) updates.azure_speech_region = azure_speech_region;
    if (azure_voice_id) updates.azure_voice_id = azure_voice_id;
    if (openai_api_key && !openai_api_key.includes('••')) updates.openai_api_key = openai_api_key;
    if (openai_model) updates.openai_model = openai_model;

    if (existing.rows.length === 0) {
      // Insert
      await pool.query(
        `INSERT INTO settings (user_id, telephony_provider, twilio_account_sid, twilio_auth_token, twilio_phone_number,
         sipgate_token_id, sipgate_token, sipgate_phone_number, sipgate_device_id,
         vonage_api_key, vonage_api_secret, vonage_application_id, vonage_private_key, vonage_phone_number,
         tts_provider, elevenlabs_api_key, elevenlabs_voice_id,
         azure_speech_key, azure_speech_region, azure_voice_id,
         openai_api_key, openai_model)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
        [
          req.user.id,
          updates.telephony_provider || 'twilio',
          updates.twilio_account_sid || '',
          updates.twilio_auth_token || '',
          updates.twilio_phone_number || '',
          updates.sipgate_token_id || '',
          updates.sipgate_token || '',
          updates.sipgate_phone_number || '',
          updates.sipgate_device_id || 'p0',
          updates.vonage_api_key || '',
          updates.vonage_api_secret || '',
          updates.vonage_application_id || '',
          updates.vonage_private_key || '',
          updates.vonage_phone_number || '',
          updates.tts_provider || 'azure',
          updates.elevenlabs_api_key || '',
          updates.elevenlabs_voice_id || '',
          updates.azure_speech_key || '',
          updates.azure_speech_region || 'germanywestcentral',
          updates.azure_voice_id || 'de-DE-ConradNeural',
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
    if (updates.sipgate_token_id) process.env.SIPGATE_TOKEN_ID = updates.sipgate_token_id;
    if (updates.sipgate_token) process.env.SIPGATE_TOKEN = updates.sipgate_token;
    if (updates.sipgate_phone_number) process.env.SIPGATE_PHONE_NUMBER = updates.sipgate_phone_number;
    if (updates.sipgate_device_id) process.env.SIPGATE_DEVICE_ID = updates.sipgate_device_id;
    if (updates.vonage_api_key) process.env.VONAGE_API_KEY = updates.vonage_api_key;
    if (updates.vonage_api_secret) process.env.VONAGE_API_SECRET = updates.vonage_api_secret;
    if (updates.vonage_application_id) process.env.VONAGE_APPLICATION_ID = updates.vonage_application_id;
    if (updates.vonage_private_key) process.env.VONAGE_PRIVATE_KEY = updates.vonage_private_key;
    if (updates.vonage_phone_number) process.env.VONAGE_PHONE_NUMBER = updates.vonage_phone_number;
    if (updates.tts_provider) process.env.TTS_PROVIDER = updates.tts_provider;
    if (updates.elevenlabs_api_key) process.env.ELEVENLABS_API_KEY = updates.elevenlabs_api_key;
    if (updates.azure_speech_key) process.env.AZURE_SPEECH_KEY = updates.azure_speech_key;
    if (updates.azure_speech_region) process.env.AZURE_SPEECH_REGION = updates.azure_speech_region;
    if (updates.azure_voice_id) process.env.AZURE_VOICE_ID = updates.azure_voice_id;
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
      'SELECT sipgate_token_id, sipgate_token FROM settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].sipgate_token_id) {
      return res.status(400).json({ error: 'Sipgate nicht konfiguriert' });
    }

    // Temporär setzen für den Test
    process.env.SIPGATE_TOKEN_ID = result.rows[0].sipgate_token_id;
    process.env.SIPGATE_TOKEN = result.rows[0].sipgate_token;

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
      'SELECT sipgate_token_id, sipgate_token FROM settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].sipgate_token_id) {
      return res.status(400).json({ error: 'Sipgate nicht konfiguriert' });
    }

    process.env.SIPGATE_TOKEN_ID = result.rows[0].sipgate_token_id;
    process.env.SIPGATE_TOKEN = result.rows[0].sipgate_token;

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
      'SELECT sipgate_token_id, sipgate_token FROM settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].sipgate_token_id) {
      return res.status(400).json({ error: 'Sipgate nicht konfiguriert' });
    }

    process.env.SIPGATE_TOKEN_ID = result.rows[0].sipgate_token_id;
    process.env.SIPGATE_TOKEN = result.rows[0].sipgate_token;

    const devices = await sipgate.getDevices();
    res.json(devices);
  } catch (error) {
    console.error('Sipgate Devices Error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Azure TTS testen
router.post('/test/azure', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT azure_speech_key, azure_speech_region FROM settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].azure_speech_key) {
      return res.status(400).json({ error: 'Azure Speech nicht konfiguriert' });
    }

    process.env.AZURE_SPEECH_KEY = result.rows[0].azure_speech_key;
    process.env.AZURE_SPEECH_REGION = result.rows[0].azure_speech_region || 'germanywestcentral';

    const azureTts = require('../services/azure-tts');
    const testResult = await azureTts.testConnection();
    res.json({ success: true, region: testResult.region });
  } catch (error) {
    console.error('Azure TTS Test Error:', error);
    res.status(400).json({ error: error.message || 'Azure Speech-Verbindung fehlgeschlagen' });
  }
});

// Azure TTS Stimmen abrufen
router.get('/azure/voices', async (req, res) => {
  try {
    const azureTts = require('../services/azure-tts');
    const voices = await azureTts.getVoices();
    res.json(voices);
  } catch (error) {
    console.error('Azure Voices Error:', error);
    res.status(400).json({ error: error.message });
  }
});

// Vonage testen
router.post('/test/vonage', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT vonage_api_key, vonage_api_secret FROM settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].vonage_api_key) {
      return res.status(400).json({ error: 'Vonage nicht konfiguriert' });
    }

    process.env.VONAGE_API_KEY = result.rows[0].vonage_api_key;
    process.env.VONAGE_API_SECRET = result.rows[0].vonage_api_secret;

    const accountInfo = await vonage.getAccountInfo();
    res.json({ success: true, balance: accountInfo.value });
  } catch (error) {
    console.error('Vonage Test Error:', error);
    res.status(400).json({ error: error.message || 'Vonage-Verbindung fehlgeschlagen' });
  }
});

// Vonage Telefonnummern abrufen
router.get('/vonage/numbers', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT vonage_api_key, vonage_api_secret FROM settings WHERE user_id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0 || !result.rows[0].vonage_api_key) {
      return res.status(400).json({ error: 'Vonage nicht konfiguriert' });
    }

    process.env.VONAGE_API_KEY = result.rows[0].vonage_api_key;
    process.env.VONAGE_API_SECRET = result.rows[0].vonage_api_secret;

    const numbers = await vonage.getPhoneNumbers();
    res.json(numbers);
  } catch (error) {
    console.error('Vonage Numbers Error:', error);
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
