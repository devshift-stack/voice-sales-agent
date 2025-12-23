import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../store'
import {
  ArrowLeft,
  Play,
  Pause,
  Square,
  Users,
  Phone,
  CheckCircle,
  TrendingUp,
  FileText,
  Settings,
  MessageSquare,
  Upload,
  Save
} from 'lucide-react'

const LANGUAGES = [
  { code: 'de-DE', label: 'Deutsch' },
  { code: 'en-US', label: 'Englisch (US)' },
  { code: 'en-GB', label: 'Englisch (UK)' },
  { code: 'hr-HR', label: 'Kroatisch' },
  { code: 'bs-BA', label: 'Bosnisch' },
  { code: 'sr-RS', label: 'Serbisch' },
  { code: 'tr-TR', label: 'Türkisch' },
  { code: 'fr-FR', label: 'Französisch' },
  { code: 'es-ES', label: 'Spanisch' },
  { code: 'it-IT', label: 'Italienisch' },
  { code: 'pl-PL', label: 'Polnisch' },
  { code: 'nl-NL', label: 'Niederländisch' },
]

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState(null)
  const [leads, setLeads] = useState([])
  const [calls, setCalls] = useState([])
  const [stats, setStats] = useState(null)
  const [agents, setAgents] = useState([])
  const [activeTab, setActiveTab] = useState('settings')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    agentId: '',
    language: 'de-DE',
    systemPrompt: '',
    greeting: '',
    closingScript: '',
    maxConcurrent: 1,
    scheduleStart: '',
    scheduleEnd: '',
    scheduleDays: ''
  })

  useEffect(() => {
    loadData()
    loadAgents()
    const interval = setInterval(loadData, 10000)
    return () => clearInterval(interval)
  }, [id])

  const loadData = async () => {
    try {
      const [campaignRes, leadsRes, callsRes, statsRes] = await Promise.all([
        api.get(`/campaigns/${id}`),
        api.get(`/campaigns/${id}/leads`),
        api.get(`/campaigns/${id}/calls`),
        api.get(`/campaigns/${id}/stats`)
      ])
      const c = campaignRes.data
      setCampaign(c)
      setLeads(leadsRes.data)
      setCalls(callsRes.data)
      setStats(statsRes.data)

      // Form mit Campaign-Daten füllen
      setFormData({
        name: c.name || '',
        agentId: c.agent_id || '',
        language: c.language || 'de-DE',
        systemPrompt: c.system_prompt || '',
        greeting: c.greeting || '',
        closingScript: c.closing_script || '',
        maxConcurrent: c.max_concurrent || 1,
        scheduleStart: c.schedule_start || '',
        scheduleEnd: c.schedule_end || '',
        scheduleDays: c.schedule_days || ''
      })
    } catch (error) {
      console.error('Error loading campaign:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadAgents = async () => {
    try {
      const res = await api.get('/agents')
      setAgents(res.data.filter(a => a.is_active))
    } catch (error) {
      console.error('Error loading agents:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await api.put(`/campaigns/${id}`, formData)
      loadData()
    } catch (error) {
      console.error('Error saving campaign:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAction = async (action) => {
    try {
      await api.post(`/campaigns/${id}/${action}`)
      loadData()
    } catch (error) {
      console.error(`Error ${action} campaign:`, error)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': case 'running': return 'bg-green-600'
      case 'paused': return 'bg-yellow-600'
      case 'completed': return 'bg-blue-600'
      case 'stopped': return 'bg-red-600'
      default: return 'bg-gray-600'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'active': case 'running': return 'Läuft'
      case 'paused': return 'Pausiert'
      case 'completed': return 'Abgeschlossen'
      case 'stopped': return 'Gestoppt'
      default: return status
    }
  }

  const getOutcomeColor = (outcome) => {
    switch (outcome) {
      case 'interested': return 'text-green-400'
      case 'not_interested': return 'text-red-400'
      case 'callback': return 'text-yellow-400'
      default: return 'text-gray-400'
    }
  }

  const getOutcomeLabel = (outcome) => {
    switch (outcome) {
      case 'interested': return 'Interessiert'
      case 'not_interested': return 'Kein Interesse'
      case 'callback': return 'Rückruf'
      case 'no_answer': return 'Keine Antwort'
      case 'busy': return 'Besetzt'
      case 'voicemail': return 'Mailbox'
      default: return outcome || '-'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">Campaign nicht gefunden</p>
        <button onClick={() => navigate('/campaigns')} className="mt-4 text-blue-400 hover:underline">
          Zurück zu Campaigns
        </button>
      </div>
    )
  }

  const tabs = [
    { id: 'settings', label: 'Einstellungen', icon: Settings },
    { id: 'prompt', label: 'Prompt', icon: MessageSquare },
    { id: 'leads', label: 'Kontakte', icon: Users },
    { id: 'calls', label: 'Anrufe', icon: Phone },
  ]

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/campaigns')} className="p-2 hover:bg-gray-700 rounded-lg transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(campaign.status)}`}>
              {getStatusLabel(campaign.status)}
            </span>
            {campaign.agent_name && (
              <span className="px-3 py-1 rounded-full text-sm bg-purple-600">
                {campaign.agent_name}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {(campaign.status === 'paused' || !campaign.status || campaign.status === 'stopped') && (
            <button onClick={() => handleAction('start')} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors">
              <Play size={18} /> Starten
            </button>
          )}
          {campaign.status === 'active' && (
            <button onClick={() => handleAction('pause')} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors">
              <Pause size={18} /> Pausieren
            </button>
          )}
          {campaign.status === 'paused' && (
            <button onClick={() => handleAction('stop')} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors">
              <Square size={18} /> Stoppen
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Users} label="Leads" value={stats?.total_leads || 0} color="blue" />
        <StatCard icon={Phone} label="Anrufe" value={stats?.total_calls || 0} color="green" />
        <StatCard icon={CheckCircle} label="Interessiert" value={stats?.interested || 0} color="emerald" />
        <StatCard icon={TrendingUp} label="Durchschn. Dauer" value={stats?.avg_duration ? `${Math.round(stats.avg_duration)}s` : '-'} color="purple" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1 w-fit">
        {tabs.map(({ id: tabId, label, icon: Icon }) => (
          <button
            key={tabId}
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tabId ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'settings' && (
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Campaign Einstellungen</h2>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Agent</label>
              <select
                value={formData.agentId}
                onChange={(e) => setFormData({ ...formData, agentId: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="">-- Agent auswählen --</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agent.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Sprache</label>
              <select
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Max. gleichzeitige Anrufe</label>
              <input
                type="number"
                min="1"
                max="20"
                value={formData.maxConcurrent}
                onChange={(e) => setFormData({ ...formData, maxConcurrent: parseInt(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Start-Zeit</label>
              <input
                type="time"
                value={formData.scheduleStart}
                onChange={(e) => setFormData({ ...formData, scheduleStart: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">End-Zeit</label>
              <input
                type="time"
                value={formData.scheduleEnd}
                onChange={(e) => setFormData({ ...formData, scheduleEnd: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-300 mb-1">Wochentage</label>
              <input
                type="text"
                value={formData.scheduleDays}
                onChange={(e) => setFormData({ ...formData, scheduleDays: e.target.value })}
                placeholder="1,2,3,4,5 (Mo-Fr)"
                className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">0=So, 1=Mo, 2=Di, 3=Mi, 4=Do, 5=Fr, 6=Sa</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'prompt' && (
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold">Prompt Konfiguration</h2>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {saving ? 'Speichern...' : 'Speichern'}
            </button>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">System-Prompt</label>
              <textarea
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                rows={8}
                placeholder="Du bist ein freundlicher Verkaufsagent für Solarmodule..."
                className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none font-mono text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Definiert das Verhalten und die Rolle des KI-Agenten</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Begrüssung</label>
              <textarea
                value={formData.greeting}
                onChange={(e) => setFormData({ ...formData, greeting: e.target.value })}
                rows={3}
                placeholder="Guten Tag, hier ist [Name] von SolarTech. Ich rufe an weil..."
                className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Erster Satz den der Agent sagt</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Abschluss-Script</label>
              <textarea
                value={formData.closingScript}
                onChange={(e) => setFormData({ ...formData, closingScript: e.target.value })}
                rows={3}
                placeholder="Vielen Dank für Ihr Interesse. Wir werden uns bei Ihnen melden..."
                className="w-full px-3 py-2 bg-gray-700 rounded-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">Abschlusstext wenn Kunde interessiert ist</p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leads' && (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Kontakte ({leads.length})</h2>
            <button
              onClick={() => navigate('/upload')}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
            >
              <Upload size={16} /> Neue hochladen
            </button>
          </div>
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Telefon</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Firma</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    Keine Kontakte. Lade Kontakte über den Upload-Bereich hoch.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-750">
                    <td className="px-4 py-3">{lead.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-400">{lead.phone}</td>
                    <td className="px-4 py-3 text-gray-400">{lead.company || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        lead.status === 'completed' ? 'bg-green-900 text-green-300' :
                        lead.status === 'pending' ? 'bg-gray-700 text-gray-300' :
                        lead.status === 'calling' ? 'bg-blue-900 text-blue-300' :
                        'bg-gray-700 text-gray-300'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'calls' && (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-semibold">Anrufe ({calls.length})</h2>
          </div>
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Lead</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Dauer</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Ergebnis</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Zeit</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Transkript</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {calls.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Noch keine Anrufe
                  </td>
                </tr>
              ) : (
                calls.map((call) => (
                  <tr key={call.id} className="hover:bg-gray-750">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{call.lead_name || 'Unbekannt'}</p>
                        <p className="text-sm text-gray-400">{call.lead_phone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {call.duration ? `${Math.round(call.duration)}s` : '-'}
                    </td>
                    <td className={`px-4 py-3 ${getOutcomeColor(call.outcome)}`}>
                      {getOutcomeLabel(call.outcome)}
                    </td>
                    <td className="px-4 py-3 text-gray-400">
                      {call.started_at ? new Date(call.started_at).toLocaleString('de-DE') : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {call.transcript && (
                        <button
                          onClick={() => alert(call.transcript)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          <FileText size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    emerald: 'bg-emerald-600',
    purple: 'bg-purple-600'
  }

  return (
    <div className="bg-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colors[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  )
}
