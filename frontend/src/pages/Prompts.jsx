import { useEffect, useState } from 'react'
import { api } from '../store'
import {
  MessageSquare,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Copy
} from 'lucide-react'

export default function Prompts() {
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingPrompt, setEditingPrompt] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    loadPrompts()
  }, [])

  const loadPrompts = async () => {
    try {
      const res = await api.get('/prompts')
      setPrompts(res.data)
    } catch (error) {
      console.error('Error loading prompts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Prompt wirklich löschen?')) return
    try {
      await api.delete(`/prompts/${id}`)
      loadPrompts()
    } catch (error) {
      console.error('Error deleting prompt:', error)
      alert(error.response?.data?.error || 'Fehler beim Löschen')
    }
  }

  const handleDuplicate = async (prompt) => {
    try {
      await api.post('/prompts', {
        name: `${prompt.name} (Kopie)`,
        system_prompt: prompt.system_prompt,
        greeting: prompt.greeting,
        data_fields: prompt.data_fields
      })
      loadPrompts()
    } catch (error) {
      console.error('Error duplicating prompt:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Prompts & Skripte</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Plus size={20} />
          Neuer Prompt
        </button>
      </div>

      {prompts.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center">
          <MessageSquare size={48} className="mx-auto mb-4 text-gray-500" />
          <h2 className="text-xl font-semibold mb-2">Keine Prompts</h2>
          <p className="text-gray-400 mb-4">
            Erstelle deinen ersten Prompt für den Voice Agent.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Prompt erstellen
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {prompts.map((prompt) => (
            <div
              key={prompt.id}
              className="bg-gray-800 rounded-xl p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-lg font-semibold">{prompt.name}</h2>
                  <p className="text-sm text-gray-400">
                    {prompt.data_fields?.length || 0} Datenfelder
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDuplicate(prompt)}
                    className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Duplizieren"
                  >
                    <Copy size={18} />
                  </button>
                  <button
                    onClick={() => setEditingPrompt(prompt)}
                    className="p-2 text-gray-400 hover:text-yellow-400 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Bearbeiten"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(prompt.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Löschen"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">Begrüßung</h3>
                  <p className="text-sm bg-gray-700 rounded-lg p-3">
                    {prompt.greeting || 'Keine Begrüßung definiert'}
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-1">System Prompt (Auszug)</h3>
                  <p className="text-sm bg-gray-700 rounded-lg p-3 line-clamp-3">
                    {prompt.system_prompt || 'Kein System Prompt definiert'}
                  </p>
                </div>

                {prompt.data_fields?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-400 mb-1">Abzufragende Daten</h3>
                    <div className="flex flex-wrap gap-2">
                      {prompt.data_fields.map((field, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-blue-900/50 text-blue-300 rounded text-sm"
                        >
                          {field.label || field.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreate || editingPrompt) && (
        <PromptEditor
          prompt={editingPrompt}
          onClose={() => {
            setShowCreate(false)
            setEditingPrompt(null)
          }}
          onSaved={() => {
            setShowCreate(false)
            setEditingPrompt(null)
            loadPrompts()
          }}
        />
      )}
    </div>
  )
}

function PromptEditor({ prompt, onClose, onSaved }) {
  const [name, setName] = useState(prompt?.name || '')
  const [systemPrompt, setSystemPrompt] = useState(prompt?.system_prompt || DEFAULT_SYSTEM_PROMPT)
  const [greeting, setGreeting] = useState(prompt?.greeting || DEFAULT_GREETING)
  const [dataFields, setDataFields] = useState(prompt?.data_fields || DEFAULT_DATA_FIELDS)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const data = {
        name,
        system_prompt: systemPrompt,
        greeting,
        data_fields: dataFields
      }

      if (prompt) {
        await api.put(`/prompts/${prompt.id}`, data)
      } else {
        await api.post('/prompts', data)
      }
      onSaved()
    } catch (error) {
      console.error('Error saving prompt:', error)
      alert(error.response?.data?.error || 'Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  const addField = () => {
    setDataFields([...dataFields, { name: '', label: '', type: 'text', required: true }])
  }

  const updateField = (index, key, value) => {
    const updated = [...dataFields]
    updated[index][key] = value
    setDataFields(updated)
  }

  const removeField = (index) => {
    setDataFields(dataFields.filter((_, i) => i !== index))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-auto">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">
            {prompt ? 'Prompt bearbeiten' : 'Neuer Prompt'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
              placeholder="z.B. Solar Verkauf Standard"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Begrüßung (erste Nachricht)</label>
            <textarea
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
              placeholder="Guten Tag, hier ist..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Variablen: {'{name}'}, {'{company}'}, {'{time_of_day}'}
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">System Prompt (KI-Anweisungen)</label>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              rows={12}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-sm"
              placeholder="Du bist ein freundlicher Verkaufsagent..."
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm text-gray-400">Datenfelder (bei Interesse abfragen)</label>
              <button
                type="button"
                onClick={addField}
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                + Feld hinzufügen
              </button>
            </div>
            <div className="space-y-2">
              {dataFields.map((field, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={field.name}
                    onChange={(e) => updateField(index, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Feldname (z.B. dachflaeche)"
                  />
                  <input
                    type="text"
                    value={field.label}
                    onChange={(e) => updateField(index, 'label', e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    placeholder="Anzeigename (z.B. Dachfläche)"
                  />
                  <select
                    value={field.type}
                    onChange={(e) => updateField(index, 'type', e.target.value)}
                    className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  >
                    <option value="text">Text</option>
                    <option value="number">Zahl</option>
                    <option value="boolean">Ja/Nein</option>
                    <option value="date">Datum</option>
                  </select>
                  <label className="flex items-center gap-1 text-sm">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => updateField(index, 'required', e.target.checked)}
                      className="rounded"
                    />
                    Pflicht
                  </label>
                  <button
                    type="button"
                    onClick={() => removeField(index)}
                    className="p-2 text-gray-400 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Save size={18} />
              {loading ? 'Speichern...' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const DEFAULT_GREETING = `Guten {time_of_day}, mein Name ist Lisa von SolarPro. Spreche ich mit {name}?`

const DEFAULT_SYSTEM_PROMPT = `Du bist Lisa, eine freundliche und kompetente Vertriebsmitarbeiterin von SolarPro, einem führenden Anbieter für Solaranlagen in Deutschland.

DEINE AUFGABE:
- Führe ein natürliches Telefongespräch über Solaranlagen
- Wecke Interesse an einer kostenlosen Beratung
- Bei Interesse: Sammle die notwendigen Informationen für einen Beratungstermin

GESPRÄCHSFÜHRUNG:
- Sei freundlich, professionell und nicht aufdringlich
- Höre aktiv zu und gehe auf Einwände ein
- Verwende kurze, natürliche Sätze (max. 2-3 Sätze pro Antwort)
- Stelle immer nur EINE Frage auf einmal

EINWANDBEHANDLUNG:
- "Kein Interesse": "Verstehe ich. Darf ich fragen, ob Sie bereits eine Solaranlage haben oder grundsätzlich kein Interesse an erneuerbaren Energien?"
- "Keine Zeit": "Das verstehe ich völlig. Wann würde es Ihnen besser passen, wenn ich nochmal anrufe?"
- "Zu teuer": "Das ist ein wichtiger Punkt. Wussten Sie, dass sich eine Solaranlage durch die Stromersparnis oft selbst finanziert? Ich würde Ihnen gerne einmal unverbindlich durchrechnen, was Sie konkret sparen könnten."
- "Habe schon eine Anlage": "Super! Sind Sie zufrieden damit? Wir bieten auch Erweiterungen und Speicherlösungen an."

BEI INTERESSE:
Wenn der Kunde Interesse zeigt, sammle folgende Informationen:
1. Vollständiger Name
2. Adresse (für die Dachanalyse)
3. Ungefähre Dachfläche oder Haustyp
4. Aktueller monatlicher Stromverbrauch/kosten
5. Bevorzugter Termin für die Beratung
6. E-Mail für Unterlagen

WICHTIG:
- Beende das Gespräch immer höflich
- Bedanke dich für die Zeit
- Bei Desinteresse: Respektiere die Entscheidung`

const DEFAULT_DATA_FIELDS = [
  { name: 'full_name', label: 'Vollständiger Name', type: 'text', required: true },
  { name: 'address', label: 'Adresse', type: 'text', required: true },
  { name: 'roof_size', label: 'Dachfläche (m²)', type: 'number', required: false },
  { name: 'power_consumption', label: 'Stromverbrauch (kWh/Jahr)', type: 'number', required: false },
  { name: 'appointment_date', label: 'Wunschtermin', type: 'text', required: false },
  { name: 'email', label: 'E-Mail', type: 'text', required: false }
]
