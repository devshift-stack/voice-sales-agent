/**
 * Azure Cognitive Services Text-to-Speech
 * Dokumentation: https://learn.microsoft.com/en-us/azure/cognitive-services/speech-service/
 */

const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Audio-Verzeichnis
const AUDIO_DIR = path.join(__dirname, '..', '..', 'audio');
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Deutsche Neural Voices
const GERMAN_VOICES = [
  { id: 'de-DE-ConradNeural', name: 'Conrad', gender: 'Male', style: 'Freundlich, natürlich' },
  { id: 'de-DE-KatjaNeural', name: 'Katja', gender: 'Female', style: 'Professionell, klar' },
  { id: 'de-DE-AmalaNeural', name: 'Amala', gender: 'Female', style: 'Warm, freundlich' },
  { id: 'de-DE-BerndNeural', name: 'Bernd', gender: 'Male', style: 'Seriös, geschäftlich' },
  { id: 'de-DE-ChristophNeural', name: 'Christoph', gender: 'Male', style: 'Jung, dynamisch' },
  { id: 'de-DE-ElkeNeural', name: 'Elke', gender: 'Female', style: 'Freundlich, einladend' },
  { id: 'de-DE-GiselaNeural', name: 'Gisela', gender: 'Female', style: 'Reif, vertrauenswürdig' },
  { id: 'de-DE-KasperNeural', name: 'Kasper', gender: 'Male', style: 'Energisch, überzeugend' },
  { id: 'de-DE-KillianNeural', name: 'Killian', gender: 'Male', style: 'Warm, beruhigend' },
  { id: 'de-DE-KlarissaNeural', name: 'Klarissa', gender: 'Female', style: 'Hell, freundlich' },
  { id: 'de-DE-KlausNeural', name: 'Klaus', gender: 'Male', style: 'Autoritär, kompetent' },
  { id: 'de-DE-LouisaNeural', name: 'Louisa', gender: 'Female', style: 'Jung, modern' },
  { id: 'de-DE-MajaNeural', name: 'Maja', gender: 'Female', style: 'Lebhaft, enthusiastisch' },
  { id: 'de-DE-RalfNeural', name: 'Ralf', gender: 'Male', style: 'Entspannt, locker' },
  { id: 'de-DE-TanjaNeural', name: 'Tanja', gender: 'Female', style: 'Professionell, klar' },
  { id: 'de-DE-FlorianMultilingualNeural', name: 'Florian (Multilingual)', gender: 'Male', style: 'Natürlich, vielseitig' },
  { id: 'de-DE-SeraphinaMultilingualNeural', name: 'Seraphina (Multilingual)', gender: 'Female', style: 'Elegant, ausdrucksstark' }
];

// Text-to-Speech generieren
async function textToSpeech(text, options = {}) {
  const apiKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'germanywestcentral';
  const voiceId = options.voiceId || process.env.AZURE_VOICE_ID || 'de-DE-ConradNeural';

  if (!apiKey) {
    throw new Error('Azure Speech nicht konfiguriert');
  }

  // SSML erstellen für natürlichere Sprache
  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="de-DE">
      <voice name="${voiceId}">
        <prosody rate="${options.rate || '0%'}" pitch="${options.pitch || '0%'}">
          ${escapeXml(text)}
        </prosody>
      </voice>
    </speak>
  `.trim();

  const response = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'VoiceSalesAgent'
      },
      body: ssml
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure TTS Error: ${error}`);
  }

  // Audio als Buffer
  const audioBuffer = await response.arrayBuffer();

  // Speichern als Datei
  const filename = `${uuidv4()}.mp3`;
  const filepath = path.join(AUDIO_DIR, filename);
  fs.writeFileSync(filepath, Buffer.from(audioBuffer));

  return {
    filename,
    filepath,
    url: `/audio/${filename}`
  };
}

// Streaming TTS (für niedrige Latenz)
async function textToSpeechStream(text, options = {}) {
  const apiKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'germanywestcentral';
  const voiceId = options.voiceId || process.env.AZURE_VOICE_ID || 'de-DE-ConradNeural';

  if (!apiKey) {
    throw new Error('Azure Speech nicht konfiguriert');
  }

  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="de-DE">
      <voice name="${voiceId}">
        ${escapeXml(text)}
      </voice>
    </speak>
  `.trim();

  const response = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
        'User-Agent': 'VoiceSalesAgent'
      },
      body: ssml
    }
  );

  if (!response.ok) {
    throw new Error('Azure TTS Stream Error');
  }

  return response.body; // Readable Stream
}

// Verfügbare deutsche Stimmen
async function getVoices() {
  // Wir geben die vordefinierte Liste zurück
  // (Azure API call für Voices braucht extra Token-Handling)
  return GERMAN_VOICES;
}

// Stimme testen (API-Verbindung prüfen)
async function testConnection() {
  const apiKey = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION || 'germanywestcentral';

  if (!apiKey) {
    throw new Error('Azure Speech nicht konfiguriert');
  }

  // Kurzen Test-Text sprechen
  const ssml = `
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="de-DE">
      <voice name="de-DE-ConradNeural">Test</voice>
    </speak>
  `.trim();

  const response = await fetch(
    `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
    {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
        'User-Agent': 'VoiceSalesAgent'
      },
      body: ssml
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Azure TTS Error: ${error}`);
  }

  return { success: true, region };
}

// Audio-Datei löschen (Cleanup)
function deleteAudio(filename) {
  const filepath = path.join(AUDIO_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}

// XML-Escape für SSML
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = {
  textToSpeech,
  textToSpeechStream,
  getVoices,
  testConnection,
  deleteAudio,
  GERMAN_VOICES
};
