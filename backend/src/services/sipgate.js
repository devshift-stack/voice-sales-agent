/**
 * Sipgate API Integration
 * Dokumentation: https://developer.sipgate.io/
 *
 * Verwendet Personal Access Token (PAT) mit Basic Auth
 */

// Basic Auth Header erstellen
function getAuthHeader() {
  const tokenId = process.env.SIPGATE_TOKEN_ID;
  const token = process.env.SIPGATE_TOKEN;

  if (!tokenId || !token) {
    throw new Error('Sipgate nicht konfiguriert');
  }

  const credentials = Buffer.from(`${tokenId}:${token}`).toString('base64');
  return `Basic ${credentials}`;
}

// API Request Helper
async function sipgateRequest(endpoint, method = 'GET', body = null) {
  const authHeader = getAuthHeader();

  const options = {
    method,
    headers: {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`https://api.sipgate.com/v2${endpoint}`, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sipgate API Error: ${error}`);
  }

  // Manche Endpoints geben kein JSON zurück
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

// Account Info abrufen (zum Testen der Verbindung)
async function getAccountInfo() {
  return sipgateRequest('/account');
}

// Verfügbare Telefonnummern abrufen
async function getPhoneNumbers() {
  const data = await sipgateRequest('/numbers');
  return data.items || [];
}

// Verfügbare Devices/Endpoints abrufen
async function getDevices() {
  const data = await sipgateRequest('/devices');
  return data.items || [];
}

// Anruf initiieren (Click-to-Call)
async function initiateCall(caller, callee, deviceId) {
  // caller = eigene Nummer (CLI)
  // callee = Zielnummer
  // deviceId = z.B. "p0" für erste Telefon-Extension

  const device = deviceId || process.env.SIPGATE_DEVICE_ID || 'p0';

  const response = await sipgateRequest('/sessions/calls', 'POST', {
    caller,
    callee,
    deviceId: device
  });

  return response;
}

// Webhook für eingehende Anrufe einrichten
async function setupWebhook(webhookUrl) {
  // Sipgate Webhooks müssen im Dashboard konfiguriert werden
  // Diese Funktion ist ein Placeholder
  console.log('Sipgate Webhook URL:', webhookUrl);
  return { message: 'Webhook muss im Sipgate Dashboard konfiguriert werden', url: webhookUrl };
}

// Anruf beenden
async function hangupCall(sessionId) {
  return sipgateRequest(`/sessions/calls/${sessionId}`, 'DELETE');
}

// SMS senden (falls benötigt)
async function sendSms(recipient, message, smsId) {
  const smsExtension = smsId || process.env.SIPGATE_SMS_ID || 's0';

  return sipgateRequest('/sessions/sms', 'POST', {
    smsId: smsExtension,
    recipient,
    message
  });
}

// History abrufen
async function getCallHistory(limit = 50) {
  return sipgateRequest(`/history?types=CALL&limit=${limit}`);
}

module.exports = {
  getAccountInfo,
  getPhoneNumbers,
  getDevices,
  initiateCall,
  setupWebhook,
  hangupCall,
  sendSms,
  getCallHistory
};
