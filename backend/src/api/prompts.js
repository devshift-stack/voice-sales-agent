const express = require('express');
const router = express.Router();
const { pool } = require('../utils/database');

// Alle Prompts
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM prompts ORDER BY created_at DESC'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Prompt erstellen
router.post('/', async (req, res) => {
  try {
    const {
      name,
      systemPrompt,
      system_prompt,
      greeting,
      objectionHandlers,
      objection_handlers,
      closingScript,
      closing_script,
      dataFields,
      data_fields
    } = req.body;

    const finalSystemPrompt = systemPrompt || system_prompt;
    const finalObjectionHandlers = objectionHandlers || objection_handlers || [];
    const finalClosingScript = closingScript || closing_script;
    const finalDataFields = dataFields || data_fields || [];

    if (!finalSystemPrompt) {
      return res.status(400).json({ error: 'System Prompt ist erforderlich' });
    }

    const result = await pool.query(
      `INSERT INTO prompts (name, system_prompt, greeting, objection_handlers, closing_script, data_fields)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        name,
        finalSystemPrompt,
        greeting,
        JSON.stringify(finalObjectionHandlers),
        finalClosingScript,
        JSON.stringify(finalDataFields)
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Prompt Details
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM prompts WHERE id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Prompt nicht gefunden' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Prompt updaten
router.put('/:id', async (req, res) => {
  try {
    const {
      name,
      systemPrompt,
      system_prompt,
      greeting,
      objectionHandlers,
      objection_handlers,
      closingScript,
      closing_script,
      dataFields,
      data_fields
    } = req.body;

    const finalSystemPrompt = systemPrompt || system_prompt;
    const finalObjectionHandlers = objectionHandlers || objection_handlers;
    const finalClosingScript = closingScript || closing_script;
    const finalDataFields = dataFields || data_fields;

    const result = await pool.query(
      `UPDATE prompts SET
        name = COALESCE($1, name),
        system_prompt = COALESCE($2, system_prompt),
        greeting = COALESCE($3, greeting),
        objection_handlers = COALESCE($4, objection_handlers),
        closing_script = COALESCE($5, closing_script),
        data_fields = COALESCE($6, data_fields),
        updated_at = NOW()
       WHERE id = $7 RETURNING *`,
      [
        name,
        finalSystemPrompt,
        greeting,
        finalObjectionHandlers ? JSON.stringify(finalObjectionHandlers) : null,
        finalClosingScript,
        finalDataFields ? JSON.stringify(finalDataFields) : null,
        req.params.id
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Prompt löschen
router.delete('/:id', async (req, res) => {
  try {
    // Prüfen ob Prompt in Verwendung
    const usageResult = await pool.query(
      'SELECT id FROM campaigns WHERE prompt_id = $1 LIMIT 1',
      [req.params.id]
    );

    if (usageResult.rows.length > 0) {
      return res.status(400).json({ error: 'Prompt wird noch von einer Campaign verwendet' });
    }

    await pool.query('DELETE FROM prompts WHERE id = $1', [req.params.id]);

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Default Prompt erstellen (für Solarmodule)
router.post('/create-default', async (req, res) => {
  try {
    const defaultPrompt = {
      name: 'Solarmodule Verkauf - Standard',
      systemPrompt: `Du bist ein freundlicher Telefonverkäufer für Solarmodule in Deutschland.
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
- Keine Anzahlung nötig`,
      greeting: 'Guten Tag, mein Name ist Max Müller von SolarTech. Spreche ich mit {name}?',
      objectionHandlers: [
        { trigger: 'kein interesse', response: 'Verstehe ich. Nur kurz: Wussten Sie, dass Sie mit Solar aktuell bis zu 70% Ihrer Stromkosten sparen können?' },
        { trigger: 'keine zeit', response: 'Dauert nur 30 Sekunden. Darf ich fragen, wie hoch Ihre monatliche Stromrechnung ungefähr ist?' },
        { trigger: 'zu teuer', response: 'Mit der aktuellen Förderung rechnet sich das oft ab dem ersten Jahr.' }
      ],
      closingScript: 'Vielen Dank für Ihre Zeit. Wir melden uns dann wegen des Termins. Auf Wiederhören!',
      dataFields: [
        { name: 'name', label: 'Name', required: true },
        { name: 'address', label: 'Adresse', required: true },
        { name: 'roof_size', label: 'Dachfläche (m²)', required: false },
        { name: 'power_consumption', label: 'Stromverbrauch (kWh/Jahr)', required: false },
        { name: 'appointment_interest', label: 'Interesse an Termin', type: 'boolean', required: true },
        { name: 'preferred_date', label: 'Bevorzugter Termin', required: false },
        { name: 'email', label: 'E-Mail', required: false }
      ]
    };

    const result = await pool.query(
      `INSERT INTO prompts (name, system_prompt, greeting, objection_handlers, closing_script, data_fields)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [
        defaultPrompt.name,
        defaultPrompt.systemPrompt,
        defaultPrompt.greeting,
        JSON.stringify(defaultPrompt.objectionHandlers),
        defaultPrompt.closingScript,
        JSON.stringify(defaultPrompt.dataFields)
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
