const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB'; // Deutsche Stimme

// Audio-Verzeichnis
const AUDIO_DIR = path.join(__dirname, '..', '..', 'audio');
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
}

// Text-to-Speech generieren
async function textToSpeech(text, options = {}) {
  const voiceId = options.voiceId || ELEVENLABS_VOICE_ID;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text,
        model_id: options.model || 'eleven_multilingual_v2',
        voice_settings: {
          stability: options.stability || 0.5,
          similarity_boost: options.similarityBoost || 0.8,
          style: options.style || 0.5,
          use_speaker_boost: true
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs Error: ${error}`);
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
  const voiceId = options.voiceId || ELEVENLABS_VOICE_ID;

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2', // Schneller für Streaming
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8
        }
      })
    }
  );

  if (!response.ok) {
    throw new Error('ElevenLabs Stream Error');
  }

  return response.body; // Readable Stream
}

// Verfügbare Stimmen abrufen
async function getVoices() {
  const response = await fetch('https://api.elevenlabs.io/v1/voices', {
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error('Fehler beim Abrufen der Stimmen');
  }

  const data = await response.json();

  // Nur deutsche/mehrsprachige Stimmen
  return data.voices.filter(v =>
    v.labels?.language === 'de' ||
    v.labels?.language === 'multilingual' ||
    v.name.toLowerCase().includes('german')
  );
}

// Audio-Datei löschen (Cleanup)
function deleteAudio(filename) {
  const filepath = path.join(AUDIO_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}

module.exports = {
  textToSpeech,
  textToSpeechStream,
  getVoices,
  deleteAudio
};
