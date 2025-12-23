const fs = require('fs');
const path = require('path');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Audio zu Text transkribieren
async function transcribeAudio(audioPath, options = {}) {
  const formData = new FormData();

  // Audio-Datei lesen
  const audioBuffer = fs.readFileSync(audioPath);
  const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
  formData.append('file', audioBlob, 'audio.wav');
  formData.append('model', 'whisper-1');
  formData.append('language', options.language || 'de');
  formData.append('response_format', 'json');

  if (options.prompt) {
    formData.append('prompt', options.prompt);
  }

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: formData
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whisper Error: ${error}`);
  }

  const data = await response.json();
  return data.text;
}

// Audio-URL zu Text (für Twilio Recordings)
async function transcribeFromUrl(audioUrl, options = {}) {
  // Audio herunterladen
  const response = await fetch(audioUrl);
  const audioBuffer = await response.arrayBuffer();

  // Temporär speichern
  const tempPath = path.join(__dirname, '..', '..', 'audio', `temp_${Date.now()}.wav`);
  fs.writeFileSync(tempPath, Buffer.from(audioBuffer));

  try {
    const text = await transcribeAudio(tempPath, options);
    return text;
  } finally {
    // Temp-Datei löschen
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}

// Echtzeit-Transkription (für Twilio Media Streams)
class RealtimeTranscriber {
  constructor() {
    this.audioChunks = [];
    this.isProcessing = false;
  }

  addChunk(chunk) {
    this.audioChunks.push(chunk);
  }

  async processBuffer() {
    if (this.isProcessing || this.audioChunks.length === 0) {
      return null;
    }

    this.isProcessing = true;

    try {
      // Chunks zusammenfügen
      const audioBuffer = Buffer.concat(this.audioChunks);
      this.audioChunks = [];

      // Transkribieren
      const tempPath = path.join(__dirname, '..', '..', 'audio', `realtime_${Date.now()}.wav`);
      fs.writeFileSync(tempPath, audioBuffer);

      const text = await transcribeAudio(tempPath, { language: 'de' });

      // Cleanup
      fs.unlinkSync(tempPath);

      return text;
    } finally {
      this.isProcessing = false;
    }
  }

  clear() {
    this.audioChunks = [];
  }
}

module.exports = {
  transcribeAudio,
  transcribeFromUrl,
  RealtimeTranscriber
};
