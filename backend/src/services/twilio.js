const twilio = require('twilio');

let client = null;

function getClient() {
  if (!client && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  }
  return client;
}

function getTwilioPhone() {
  return process.env.TWILIO_PHONE_NUMBER;
}

const WEBHOOK_BASE = process.env.WEBHOOK_BASE_URL;

// Ausgehenden Anruf starten
async function makeCall(phoneNumber, campaignId, leadId) {
  const twilioClient = getClient();
  if (!twilioClient) {
    throw new Error('Twilio nicht konfiguriert. Bitte Einstellungen prüfen.');
  }

  const call = await twilioClient.calls.create({
    to: phoneNumber,
    from: getTwilioPhone(),
    url: `${WEBHOOK_BASE}/webhooks/twilio/voice?campaignId=${campaignId}&leadId=${leadId}`,
    statusCallback: `${WEBHOOK_BASE}/webhooks/twilio/status`,
    statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
    statusCallbackMethod: 'POST',
    record: true,
    recordingStatusCallback: `${WEBHOOK_BASE}/webhooks/twilio/recording`,
    machineDetection: 'DetectMessageEnd',
    asyncAmd: true,
    asyncAmdStatusCallback: `${WEBHOOK_BASE}/webhooks/twilio/amd`
  });

  return call;
}

// Anruf beenden
async function endCall(callSid) {
  const twilioClient = getClient();
  if (!twilioClient) {
    throw new Error('Twilio nicht konfiguriert. Bitte Einstellungen prüfen.');
  }
  return twilioClient.calls(callSid).update({ status: 'completed' });
}

// TwiML Response generieren
function generateTwiML(options = {}) {
  const VoiceResponse = twilio.twiml.VoiceResponse;
  const response = new VoiceResponse();
  return response;
}

// Gather (Spracheingabe sammeln)
function createGather(response, options = {}) {
  return response.gather({
    input: 'speech',
    language: 'de-DE',
    speechTimeout: options.speechTimeout || 'auto',
    action: options.action || '/webhooks/twilio/gather',
    method: 'POST',
    speechModel: 'phone_call',
    enhanced: true
  });
}

// Play Audio (ElevenLabs generiert)
function playAudio(response, audioUrl) {
  response.play(audioUrl);
  return response;
}

// Say (Twilio TTS als Fallback)
function say(response, text, options = {}) {
  response.say({
    voice: options.voice || 'Polly.Vicki',
    language: 'de-DE'
  }, text);
  return response;
}

// Stream für Echtzeit-Audio
function createStream(response, websocketUrl) {
  const connect = response.connect();
  connect.stream({
    url: websocketUrl,
    track: 'both_tracks'
  });
  return response;
}

module.exports = {
  getClient,
  makeCall,
  endCall,
  generateTwiML,
  createGather,
  playAudio,
  say,
  createStream
};
