const { pool } = require('../utils/database');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Konversations-State pro Anruf
const conversations = new Map();

// Default System Prompt für Solarmodule
const DEFAULT_SYSTEM_PROMPT = `Du bist ein freundlicher Telefonverkäufer für Solarmodule in Deutschland.
Dein Name ist Max Müller von der Firma SolarTech GmbH.

WICHTIG:
- Sprich natürlich und menschlich, nicht wie ein Roboter
- Halte deine Antworten kurz (1-2 Sätze)
- Stelle Fragen um Interesse zu wecken
- Bei Einwänden: Zeige Verständnis, dann Vorteile nennen
- Bei Interesse: Sammle die benötigten Daten
- Sei höflich aber bestimmt

VERKAUFSARGUMENTE:
- Stromkosten senken um bis zu 70%
- Staatliche Förderung aktuell verfügbar
- Unverbindliches Beratungsgespräch vor Ort
- Keine Anzahlung nötig

EINWÄNDE BEHANDELN:
- "Kein Interesse": "Verstehe ich. Nur kurz: Wussten Sie, dass Sie mit Solar aktuell bis zu 70% Ihrer Stromkosten sparen können?"
- "Keine Zeit": "Dauert nur 30 Sekunden. Darf ich fragen, wie hoch Ihre monatliche Stromrechnung ungefähr ist?"
- "Zu teuer": "Mit der aktuellen Förderung rechnet sich das oft ab dem ersten Jahr."
`;

// KI-Antwort generieren
async function generateResponse(callId, userMessage, promptId = null) {
  // Konversationshistorie holen oder erstellen
  let history = conversations.get(callId) || [];

  // System Prompt laden
  let systemPrompt = DEFAULT_SYSTEM_PROMPT;
  let dataFields = [];

  if (promptId) {
    const result = await pool.query(
      'SELECT system_prompt, data_fields FROM prompts WHERE id = $1',
      [promptId]
    );
    if (result.rows[0]) {
      systemPrompt = result.rows[0].system_prompt;
      dataFields = result.rows[0].data_fields || [];
    }
  }

  // User-Nachricht hinzufügen
  history.push({ role: 'user', content: userMessage });

  // OpenAI API aufrufen
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history
      ],
      max_tokens: 150,
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI Error: ${error}`);
  }

  const data = await response.json();
  const assistantMessage = data.choices[0].message.content;

  // Assistenten-Antwort zur Historie hinzufügen
  history.push({ role: 'assistant', content: assistantMessage });
  conversations.set(callId, history);

  // In DB speichern
  await pool.query(
    'INSERT INTO call_messages (call_id, role, content) VALUES ($1, $2, $3)',
    [callId, 'user', userMessage]
  );
  await pool.query(
    'INSERT INTO call_messages (call_id, role, content) VALUES ($1, $2, $3)',
    [callId, 'assistant', assistantMessage]
  );

  return {
    response: assistantMessage,
    usage: data.usage
  };
}

// Konversation analysieren (Outcome bestimmen)
async function analyzeConversation(callId) {
  const history = conversations.get(callId) || [];

  if (history.length === 0) {
    return { outcome: 'no_answer', summary: 'Keine Konversation' };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `Analysiere diese Verkaufskonversation und gib ein JSON zurück:
{
  "outcome": "interested" | "not_interested" | "callback" | "wrong_number" | "voicemail",
  "summary": "Kurze Zusammenfassung in einem Satz",
  "collected_data": { "name": "", "email": "", ... }
}
Antworte NUR mit dem JSON, kein anderer Text.`
        },
        {
          role: 'user',
          content: `Konversation:\n${history.map(m => `${m.role}: ${m.content}`).join('\n')}`
        }
      ],
      max_tokens: 500,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    return { outcome: 'error', summary: 'Analyse fehlgeschlagen' };
  }

  const data = await response.json();

  try {
    return JSON.parse(data.choices[0].message.content);
  } catch {
    return { outcome: 'unknown', summary: data.choices[0].message.content };
  }
}

// Begrüßung generieren
async function generateGreeting(leadName, promptId = null) {
  let greeting = `Guten Tag, mein Name ist Max Müller von SolarTech. Spreche ich mit ${leadName || 'dem Hausbesitzer'}?`;

  if (promptId) {
    const result = await pool.query(
      'SELECT greeting FROM prompts WHERE id = $1',
      [promptId]
    );
    if (result.rows[0]?.greeting) {
      greeting = result.rows[0].greeting.replace('{name}', leadName || 'dem Hausbesitzer');
    }
  }

  return greeting;
}

// Konversation beenden
function endConversation(callId) {
  conversations.delete(callId);
}

// Alle aktiven Konversationen
function getActiveConversations() {
  return Array.from(conversations.keys());
}

module.exports = {
  generateResponse,
  analyzeConversation,
  generateGreeting,
  endConversation,
  getActiveConversations
};
