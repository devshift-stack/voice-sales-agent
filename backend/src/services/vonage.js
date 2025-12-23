/**
 * Vonage API Integration
 * Dokumentation: https://developer.vonage.com/
 *
 * Verwendet Application ID + Private Key für JWT Auth
 */

const { Vonage } = require('@vonage/server-sdk');

let vonageClient = null;

// Vonage Client initialisieren
function initVonage(apiKey, apiSecret, applicationId, privateKey) {
  if (!apiKey || !apiSecret) {
    throw new Error('Vonage nicht konfiguriert');
  }

  vonageClient = new Vonage({
    apiKey,
    apiSecret,
    applicationId,
    privateKey
  });

  return vonageClient;
}

// Client aus Settings initialisieren
function getVonageClient() {
  if (!vonageClient) {
    const apiKey = process.env.VONAGE_API_KEY;
    const apiSecret = process.env.VONAGE_API_SECRET;
    const applicationId = process.env.VONAGE_APPLICATION_ID;
    const privateKey = process.env.VONAGE_PRIVATE_KEY;

    if (!apiKey || !apiSecret) {
      throw new Error('Vonage nicht konfiguriert');
    }

    vonageClient = new Vonage({
      apiKey,
      apiSecret,
      applicationId,
      privateKey
    });
  }

  return vonageClient;
}

// Account Info abrufen (zum Testen der Verbindung)
async function getAccountInfo() {
  const vonage = getVonageClient();

  return new Promise((resolve, reject) => {
    vonage.account.getBalance((err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// Anruf starten
async function makeCall(to, from, answerUrl, eventUrl) {
  const vonage = getVonageClient();

  return new Promise((resolve, reject) => {
    vonage.voice.createCall({
      to: [{ type: 'phone', number: to }],
      from: { type: 'phone', number: from },
      answer_url: [answerUrl],
      event_url: [eventUrl]
    }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// Anruf beenden
async function hangupCall(callId) {
  const vonage = getVonageClient();

  return new Promise((resolve, reject) => {
    vonage.voice.updateCall(callId, { action: 'hangup' }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// Audio in Anruf abspielen
async function playAudio(callId, audioUrl) {
  const vonage = getVonageClient();

  return new Promise((resolve, reject) => {
    vonage.voice.streamAudio(callId, audioUrl, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// Text-to-Speech in Anruf
async function playTTS(callId, text, voiceName = 'Vicki', language = 'de-DE') {
  const vonage = getVonageClient();

  return new Promise((resolve, reject) => {
    vonage.voice.talk(callId, {
      text,
      voice_name: voiceName,
      language,
      style: 0
    }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

// Verfügbare Nummern abrufen
async function getPhoneNumbers() {
  const vonage = getVonageClient();

  return new Promise((resolve, reject) => {
    vonage.number.get({}, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result.numbers || []);
      }
    });
  });
}

// SMS senden (falls benötigt)
async function sendSms(from, to, text) {
  const vonage = getVonageClient();

  return new Promise((resolve, reject) => {
    vonage.sms.send({ from, to, text }, (err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    });
  });
}

module.exports = {
  initVonage,
  getVonageClient,
  getAccountInfo,
  makeCall,
  hangupCall,
  playAudio,
  playTTS,
  getPhoneNumbers,
  sendSms
};
