import { useEffect, useState } from 'react'
import { api, useStore } from '../store'
import {
  Settings as SettingsIcon,
  Key,
  Phone,
  Volume2,
  Brain,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from 'lucide-react'

export default function Settings() {
  const { user } = useStore()
  const [settings, setSettings] = useState({
    twilio_account_sid: '',
    twilio_auth_token: '',
    twilio_phone_number: '',
    elevenlabs_api_key: '',
    elevenlabs_voice_id: '',
    openai_api_key: '',
    openai_model: 'gpt-4'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSecrets, setShowSecrets] = useState({})
  const [testResults, setTestResults] = useState({})
  const [voices, setVoices] = useState([])

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const res = await api.get('/settings')
      setSettings(res.data)
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put('/settings', settings)
      alert('Einstellungen gespeichert!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert(error.response?.data?.error || 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (service) => {
    setTestResults(prev => ({ ...prev, [service]: 'testing' }))
    try {
      await api.post(`/settings/test/${service}`)
      setTestResults(prev => ({ ...prev, [service]: 'success' }))
    } catch (error) {
      setTestResults(prev => ({
        ...prev,
        [service]: error.response?.data?.error || 'Fehler'
      }))
    }
  }

  const loadVoices = async () => {
    try {
      const res = await api.get('/settings/voices')
      setVoices(res.data)
    } catch (error) {
      console.error('Error loading voices:', error)
    }
  }

  const toggleSecret = (key) => {
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }))
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
      <h1 className="text-2xl font-bold mb-6">Einstellungen</h1>

      <div className="space-y-6">
        {/* Twilio Settings */}
        <SettingsSection
          icon={Phone}
          title="Twilio"
          description="Telefonie-Provider für Anrufe"
        >
          <SettingInput
            label="Account SID"
            value={settings.twilio_account_sid}
            onChange={(v) => updateSetting('twilio_account_sid', v)}
            placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
          />
          <SettingInput
            label="Auth Token"
            value={settings.twilio_auth_token}
            onChange={(v) => updateSetting('twilio_auth_token', v)}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            secret
            showSecret={showSecrets.twilio_auth_token}
            onToggleSecret={() => toggleSecret('twilio_auth_token')}
          />
          <SettingInput
            label="Telefonnummer"
            value={settings.twilio_phone_number}
            onChange={(v) => updateSetting('twilio_phone_number', v)}
            placeholder="+49..."
          />
          <TestButton
            onClick={() => handleTest('twilio')}
            result={testResults.twilio}
          />
        </SettingsSection>

        {/* ElevenLabs Settings */}
        <SettingsSection
          icon={Volume2}
          title="ElevenLabs"
          description="Text-to-Speech für realistische Stimme"
        >
          <SettingInput
            label="API Key"
            value={settings.elevenlabs_api_key}
            onChange={(v) => updateSetting('elevenlabs_api_key', v)}
            placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            secret
            showSecret={showSecrets.elevenlabs_api_key}
            onToggleSecret={() => toggleSecret('elevenlabs_api_key')}
          />
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-1">Voice ID</label>
              {voices.length > 0 ? (
                <select
                  value={settings.elevenlabs_voice_id}
                  onChange={(e) => updateSetting('elevenlabs_voice_id', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                >
                  <option value="">Stimme wählen...</option>
                  {voices.map(v => (
                    <option key={v.voice_id} value={v.voice_id}>
                      {v.name} ({v.labels?.accent || 'Standard'})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={settings.elevenlabs_voice_id}
                  onChange={(e) => updateSetting('elevenlabs_voice_id', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                  placeholder="Voice ID"
                />
              )}
            </div>
            <button
              onClick={loadVoices}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              title="Stimmen laden"
            >
              <RefreshCw size={18} />
            </button>
          </div>
          <TestButton
            onClick={() => handleTest('elevenlabs')}
            result={testResults.elevenlabs}
          />
        </SettingsSection>

        {/* OpenAI Settings */}
        <SettingsSection
          icon={Brain}
          title="OpenAI"
          description="GPT-4 für KI-Konversation & Whisper für STT"
        >
          <SettingInput
            label="API Key"
            value={settings.openai_api_key}
            onChange={(v) => updateSetting('openai_api_key', v)}
            placeholder="sk-..."
            secret
            showSecret={showSecrets.openai_api_key}
            onToggleSecret={() => toggleSecret('openai_api_key')}
          />
          <div>
            <label className="block text-sm text-gray-400 mb-1">Modell</label>
            <select
              value={settings.openai_model}
              onChange={(e) => updateSetting('openai_model', e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="gpt-4">GPT-4</option>
              <option value="gpt-4-turbo">GPT-4 Turbo</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-3.5-turbo">GPT-3.5 Turbo (günstiger)</option>
            </select>
          </div>
          <TestButton
            onClick={() => handleTest('openai')}
            result={testResults.openai}
          />
        </SettingsSection>

        {/* User Info */}
        <SettingsSection
          icon={SettingsIcon}
          title="Account"
          description="Deine Kontoinformationen"
        >
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Name:</span>
              <span className="ml-2">{user?.name || '-'}</span>
            </div>
            <div>
              <span className="text-gray-400">E-Mail:</span>
              <span className="ml-2">{user?.email || '-'}</span>
            </div>
          </div>
        </SettingsSection>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            <Save size={20} />
            {saving ? 'Speichern...' : 'Einstellungen speichern'}
          </button>
        </div>
      </div>
    </div>
  )
}

function SettingsSection({ icon: Icon, title, description, children }) {
  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gray-700 rounded-lg">
          <Icon size={20} className="text-blue-400" />
        </div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="text-sm text-gray-400">{description}</p>
        </div>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}

function SettingInput({ label, value, onChange, placeholder, secret, showSecret, onToggleSecret }) {
  return (
    <div>
      <label className="block text-sm text-gray-400 mb-1">{label}</label>
      <div className="relative">
        <input
          type={secret && !showSecret ? 'password' : 'text'}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 pr-10"
        />
        {secret && (
          <button
            type="button"
            onClick={onToggleSecret}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
          >
            {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
    </div>
  )
}

function TestButton({ onClick, result }) {
  return (
    <div className="flex items-center gap-3">
      <button
        onClick={onClick}
        disabled={result === 'testing'}
        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors disabled:opacity-50"
      >
        {result === 'testing' ? 'Teste...' : 'Verbindung testen'}
      </button>
      {result === 'success' && (
        <span className="flex items-center gap-1 text-green-400 text-sm">
          <CheckCircle size={16} />
          Verbunden
        </span>
      )}
      {result && result !== 'success' && result !== 'testing' && (
        <span className="flex items-center gap-1 text-red-400 text-sm">
          <AlertCircle size={16} />
          {result}
        </span>
      )}
    </div>
  )
}
