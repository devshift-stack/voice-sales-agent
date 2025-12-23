const express = require('express');
const router = express.Router();
const twilio = require('twilio');
const { pool } = require('../utils/database');
const { textToSpeech } = require('../services/elevenlabs');
const { generateResponse, analyzeConversation, generateGreeting, endConversation } = require('../services/ai-engine');
const { broadcast } = require('../services/websocket');

const VoiceResponse = twilio.twiml.VoiceResponse;

// Eingehender Anruf / Ausgehender Anruf gestartet
router.post('/voice', async (req, res) => {
  const { campaignId, leadId } = req.query;
  const { CallSid, From, To, Direction } = req.body;

  console.log(`📞 Anruf gestartet: ${CallSid}`);

  try {
    // Lead-Daten holen
    let leadName = '';
    let promptId = null;

    if (leadId) {
      const leadResult = await pool.query('SELECT * FROM leads WHERE id = $1', [leadId]);
      if (leadResult.rows[0]) {
        leadName = leadResult.rows[0].name;
      }
    }

    if (campaignId) {
      const campaignResult = await pool.query('SELECT prompt_id FROM campaigns WHERE id = $1', [campaignId]);
      if (campaignResult.rows[0]) {
        promptId = campaignResult.rows[0].prompt_id;
      }
    }

    // Begrüßung generieren
    const greeting = await generateGreeting(leadName, promptId);

    // Audio generieren
    const audio = await textToSpeech(greeting);

    // TwiML Response
    const response = new VoiceResponse();

    // Audio abspielen
    response.play(`${process.env.WEBHOOK_BASE_URL}${audio.url}`);

    // Auf Antwort warten
    const gather = response.gather({
      input: 'speech',
      language: 'de-DE',
      speechTimeout: 'auto',
      action: `/webhooks/twilio/gather?campaignId=${campaignId}&leadId=${leadId}&callSid=${CallSid}`,
      method: 'POST'
    });

    // Falls keine Antwort, nochmal fragen
    response.redirect(`/webhooks/twilio/no-input?campaignId=${campaignId}&leadId=${leadId}&callSid=${CallSid}`);

    res.type('text/xml');
    res.send(response.toString());

  } catch (error) {
    console.error('Voice Webhook Error:', error);

    const response = new VoiceResponse();
    response.say({ voice: 'Polly.Vicki', language: 'de-DE' },
      'Entschuldigung, es gab einen technischen Fehler. Auf Wiederhören.');
    response.hangup();

    res.type('text/xml');
    res.send(response.toString());
  }
});

// Spracheingabe verarbeiten
router.post('/gather', async (req, res) => {
  const { campaignId, leadId, callSid } = req.query;
  const { SpeechResult, Confidence } = req.body;

  console.log(`🎤 Speech: "${SpeechResult}" (${Confidence})`);

  try {
    // Call ID aus DB holen
    const callResult = await pool.query(
      'SELECT id FROM calls WHERE twilio_sid = $1',
      [callSid]
    );
    const callId = callResult.rows[0]?.id;

    // Prompt ID holen
    let promptId = null;
    if (campaignId) {
      const campaignResult = await pool.query('SELECT prompt_id FROM campaigns WHERE id = $1', [campaignId]);
      promptId = campaignResult.rows[0]?.prompt_id;
    }

    // KI-Antwort generieren
    const aiResult = await generateResponse(callId, SpeechResult, promptId);

    // Audio generieren
    const audio = await textToSpeech(aiResult.response);

    // Live Update
    broadcast({
      type: 'call_message',
      data: {
        callId,
        userMessage: SpeechResult,
        aiResponse: aiResult.response
      }
    });

    // TwiML Response
    const response = new VoiceResponse();

    // KI-Antwort abspielen
    response.play(`${process.env.WEBHOOK_BASE_URL}${audio.url}`);

    // Weiter auf Antwort warten
    const gather = response.gather({
      input: 'speech',
      language: 'de-DE',
      speechTimeout: 'auto',
      action: `/webhooks/twilio/gather?campaignId=${campaignId}&leadId=${leadId}&callSid=${callSid}`,
      method: 'POST'
    });

    // Nach langer Stille beenden
    response.say({ voice: 'Polly.Vicki', language: 'de-DE' },
      'Sind Sie noch da?');
    response.redirect(`/webhooks/twilio/gather?campaignId=${campaignId}&leadId=${leadId}&callSid=${callSid}`);

    res.type('text/xml');
    res.send(response.toString());

  } catch (error) {
    console.error('Gather Webhook Error:', error);

    const response = new VoiceResponse();
    response.say({ voice: 'Polly.Vicki', language: 'de-DE' },
      'Vielen Dank für Ihre Zeit. Auf Wiederhören.');
    response.hangup();

    res.type('text/xml');
    res.send(response.toString());
  }
});

// Keine Eingabe
router.post('/no-input', async (req, res) => {
  const { campaignId, leadId, callSid } = req.query;

  const response = new VoiceResponse();
  response.say({ voice: 'Polly.Vicki', language: 'de-DE' },
    'Entschuldigung, ich konnte Sie nicht verstehen. Können Sie das bitte wiederholen?');

  const gather = response.gather({
    input: 'speech',
    language: 'de-DE',
    speechTimeout: 'auto',
    action: `/webhooks/twilio/gather?campaignId=${campaignId}&leadId=${leadId}&callSid=${callSid}`,
    method: 'POST'
  });

  response.say({ voice: 'Polly.Vicki', language: 'de-DE' },
    'Vielen Dank für Ihre Zeit. Auf Wiederhören.');
  response.hangup();

  res.type('text/xml');
  res.send(response.toString());
});

// Anruf-Status Updates
router.post('/status', async (req, res) => {
  const { CallSid, CallStatus, CallDuration } = req.body;

  console.log(`📊 Status: ${CallSid} -> ${CallStatus}`);

  try {
    // Status in DB updaten
    await pool.query(
      `UPDATE calls SET status = $1, duration = $2,
       ended_at = CASE WHEN $1 = 'completed' THEN NOW() ELSE ended_at END
       WHERE twilio_sid = $3`,
      [CallStatus, CallDuration || 0, CallSid]
    );

    // Bei Anrufende: Analyse durchführen
    if (CallStatus === 'completed') {
      const callResult = await pool.query(
        'SELECT id, lead_id FROM calls WHERE twilio_sid = $1',
        [CallSid]
      );

      if (callResult.rows[0]) {
        const callId = callResult.rows[0].id;
        const leadId = callResult.rows[0].lead_id;

        // Konversation analysieren
        const analysis = await analyzeConversation(callId);

        // Ergebnis speichern
        await pool.query(
          `UPDATE calls SET outcome = $1, ai_summary = $2, collected_data = $3 WHERE id = $4`,
          [analysis.outcome, analysis.summary, JSON.stringify(analysis.collected_data || {}), callId]
        );

        // Lead Status updaten
        await pool.query(
          'UPDATE leads SET status = $1 WHERE id = $2',
          [analysis.outcome, leadId]
        );

        // Konversation aus Memory löschen
        endConversation(callId);

        // Live Update
        broadcast({
          type: 'call_completed',
          data: { callId, leadId, analysis }
        });
      }
    }

    // Live Update
    broadcast({
      type: 'call_status',
      data: { callSid: CallSid, status: CallStatus }
    });

  } catch (error) {
    console.error('Status Webhook Error:', error);
  }

  res.sendStatus(200);
});

// Recording fertig
router.post('/recording', async (req, res) => {
  const { CallSid, RecordingUrl, RecordingDuration } = req.body;

  console.log(`🎙️ Recording: ${RecordingUrl}`);

  try {
    await pool.query(
      'UPDATE calls SET recording_url = $1 WHERE twilio_sid = $2',
      [RecordingUrl, CallSid]
    );
  } catch (error) {
    console.error('Recording Webhook Error:', error);
  }

  res.sendStatus(200);
});

// Anrufbeantworter-Erkennung
router.post('/amd', async (req, res) => {
  const { CallSid, AnsweredBy } = req.body;

  console.log(`🤖 AMD: ${CallSid} -> ${AnsweredBy}`);

  if (AnsweredBy === 'machine_start' || AnsweredBy === 'machine_end_beep') {
    // Anrufbeantworter - auflegen
    const client = require('../services/twilio').client;
    await client.calls(CallSid).update({ status: 'completed' });

    // Status updaten
    await pool.query(
      `UPDATE calls SET status = 'voicemail', outcome = 'voicemail' WHERE twilio_sid = $1`,
      [CallSid]
    );
  }

  res.sendStatus(200);
});

// Eingehender Anruf (Callback)
router.post('/incoming', async (req, res) => {
  const { CallSid, From, To } = req.body;

  console.log(`📲 Eingehender Anruf: ${From}`);

  const response = new VoiceResponse();

  // Prüfen ob Nummer bekannt
  const leadResult = await pool.query(
    'SELECT * FROM leads WHERE phone = $1',
    [From]
  );

  if (leadResult.rows[0]) {
    const lead = leadResult.rows[0];

    response.say({ voice: 'Polly.Vicki', language: 'de-DE' },
      `Guten Tag ${lead.name || ''}. Schön, dass Sie zurückrufen. Wie kann ich Ihnen helfen?`);

    response.gather({
      input: 'speech',
      language: 'de-DE',
      speechTimeout: 'auto',
      action: `/webhooks/twilio/gather?leadId=${lead.id}&callSid=${CallSid}`,
      method: 'POST'
    });
  } else {
    response.say({ voice: 'Polly.Vicki', language: 'de-DE' },
      'Guten Tag, hier ist SolarTech. Wie kann ich Ihnen helfen?');

    response.gather({
      input: 'speech',
      language: 'de-DE',
      speechTimeout: 'auto',
      action: `/webhooks/twilio/gather?callSid=${CallSid}`,
      method: 'POST'
    });
  }

  res.type('text/xml');
  res.send(response.toString());
});

module.exports = router;
