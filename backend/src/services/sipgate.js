/**
 * Sipgate API Integration
 * Dokumentation: https://developer.sipgate.io/
 */

let accessToken = null;
let tokenExpiry = null;

// OAuth2 Token holen
async function getAccessToken() {
  const clientId = process.env.SIPGATE_CLIENT_ID;
  const clientSecret = process.env.SIPGATE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('Sipgate nicht konfiguriert');
  }

  // Token noch gültig?
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const response = await fetch('https://api.sipgate.com/login/third-party/protocol/openid-connect/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Sipgate Auth Error: ${error}`);
  }

  const data = await response.json();
  accessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // 1 Minute Puffer

  return accessToken;
}

// API Request Helper
async function sipgateRequest(endpoint, method = 'GET', body = null) {
  const token = await getAccessToken();

  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
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

// Token zurücksetzen (bei Credential-Änderung)
function resetToken() {
  accessToken = null;
  tokenExpiry = null;
}

module.exports = {
  getAccessToken,
  getAccountInfo,
  getPhoneNumbers,
  getDevices,
  initiateCall,
  setupWebhook,
  hangupCall,
  sendSms,
  getCallHistory,
  resetToken
};
