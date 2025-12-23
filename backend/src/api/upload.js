const express = require('express');
const router = express.Router();
const multer = require('multer');
const { parse } = require('csv-parse');
const XLSX = require('xlsx');
const { pool } = require('../utils/database');
const { Readable } = require('stream');

// Multer Config (in Memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls'];
    const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Nur CSV und Excel Dateien erlaubt'));
    }
  }
});

// Leads hochladen
router.post('/leads/:campaignId', upload.single('file'), async (req, res) => {
  try {
    const { campaignId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Keine Datei hochgeladen' });
    }

    // Campaign prüfen
    const campaignResult = await pool.query(
      'SELECT id FROM campaigns WHERE id = $1',
      [campaignId]
    );

    if (campaignResult.rows.length === 0) {
      return res.status(404).json({ error: 'Campaign nicht gefunden' });
    }

    let leads = [];
    const ext = file.originalname.toLowerCase();

    if (ext.endsWith('.csv')) {
      // CSV parsen
      leads = await parseCSV(file.buffer);
    } else {
      // Excel parsen
      leads = parseExcel(file.buffer);
    }

    if (leads.length === 0) {
      return res.status(400).json({ error: 'Keine Leads in der Datei gefunden' });
    }

    // Leads in DB einfügen
    let imported = 0;
    let skipped = 0;

    for (const lead of leads) {
      // Telefonnummer ist Pflicht
      if (!lead.phone && !lead.telefon && !lead.Phone && !lead.Telefon) {
        skipped++;
        continue;
      }

      const phone = normalizePhone(lead.phone || lead.telefon || lead.Phone || lead.Telefon);
      const name = lead.name || lead.Name || lead.vorname || lead.Vorname || '';
      const email = lead.email || lead.Email || lead.EMail || '';
      const company = lead.company || lead.firma || lead.Company || lead.Firma || '';

      // Duplikat-Check
      const existing = await pool.query(
        'SELECT id FROM leads WHERE campaign_id = $1 AND phone = $2',
        [campaignId, phone]
      );

      if (existing.rows.length > 0) {
        skipped++;
        continue;
      }

      // Extra-Daten (alle anderen Felder)
      const extraData = {};
      for (const [key, value] of Object.entries(lead)) {
        if (!['phone', 'telefon', 'name', 'email', 'company', 'firma'].includes(key.toLowerCase())) {
          extraData[key] = value;
        }
      }

      await pool.query(
        `INSERT INTO leads (campaign_id, phone, name, email, company, extra_data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [campaignId, phone, name, email, company, JSON.stringify(extraData)]
      );

      imported++;
    }

    res.json({
      success: true,
      imported,
      skipped,
      total: leads.length
    });

  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// CSV parsen
function parseCSV(buffer) {
  return new Promise((resolve, reject) => {
    const results = [];
    const stream = Readable.from(buffer.toString());

    stream
      .pipe(parse({
        columns: true,
        skip_empty_lines: true,
        delimiter: [',', ';', '\t'],
        relax_column_count: true
      }))
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', reject);
  });
}

// Excel parsen
function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet);
}

// Telefonnummer normalisieren
function normalizePhone(phone) {
  if (!phone) return '';

  // String konvertieren
  let normalized = String(phone);

  // Alle Nicht-Ziffern entfernen (außer +)
  normalized = normalized.replace(/[^\d+]/g, '');

  // Deutsche Nummer formatieren
  if (normalized.startsWith('0')) {
    normalized = '+49' + normalized.slice(1);
  } else if (!normalized.startsWith('+')) {
    normalized = '+49' + normalized;
  }

  return normalized;
}

// Template herunterladen
router.get('/template', (req, res) => {
  const template = [
    ['Name', 'Telefon', 'Email', 'Firma', 'Adresse'],
    ['Max Mustermann', '+49 123 456789', 'max@example.de', 'Musterfirma GmbH', 'Musterstraße 1, 12345 Musterstadt']
  ];

  const ws = XLSX.utils.aoa_to_sheet(template);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=leads_template.xlsx');
  res.send(buffer);
});

module.exports = router;
