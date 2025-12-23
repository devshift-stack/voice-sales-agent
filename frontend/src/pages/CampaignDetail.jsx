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
  XCircle,
  Clock,
  TrendingUp,
  FileText
} from 'lucide-react'

export default function CampaignDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState(null)
  const [leads, setLeads] = useState([])
  const [calls, setCalls] = useState([])
  const [stats, setStats] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
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
      setCampaign(campaignRes.data)
      setLeads(leadsRes.data)
      setCalls(callsRes.data)
      setStats(statsRes.data)
    } catch (error) {
      console.error('Error loading campaign:', error)
    } finally {
      setLoading(false)
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
      case 'running': return 'bg-green-600'
      case 'paused': return 'bg-yellow-600'
      case 'completed': return 'bg-blue-600'
      default: return 'bg-gray-600'
    }
  }

  const getStatusLabel = (status) => {
    switch (status) {
      case 'running': return 'Läuft'
      case 'paused': return 'Pausiert'
      case 'completed': return 'Abgeschlossen'
      case 'draft': return 'Entwurf'
      default: return status
    }
  }

  const getOutcomeColor = (outcome) => {
    switch (outcome) {
      case 'interested': return 'text-green-400'
      case 'not_interested': return 'text-red-400'
      case 'callback': return 'text-yellow-400'
      case 'no_answer': return 'text-gray-400'
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
        <button
          onClick={() => navigate('/campaigns')}
          className="mt-4 text-blue-400 hover:underline"
        >
          Zurück zu Campaigns
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/campaigns')}
          className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{campaign.name}</h1>
            <span className={`px-3 py-1 rounded-full text-sm ${getStatusColor(campaign.status)}`}>
              {getStatusLabel(campaign.status)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === 'draft' && (
            <button
              onClick={() => handleAction('start')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
            >
              <Play size={18} />
              Starten
            </button>
          )}
          {campaign.status === 'running' && (
            <button
              onClick={() => handleAction('pause')}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
            >
              <Pause size={18} />
              Pausieren
            </button>
          )}
          {campaign.status === 'paused' && (
            <>
              <button
                onClick={() => handleAction('resume')}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                <Play size={18} />
                Fortsetzen
              </button>
              <button
                onClick={() => handleAction('stop')}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                <Square size={18} />
                Stoppen
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={Users}
          label="Leads"
          value={stats?.total_leads || 0}
          color="blue"
        />
        <StatCard
          icon={Phone}
          label="Anrufe"
          value={stats?.total_calls || 0}
          color="green"
        />
        <StatCard
          icon={CheckCircle}
          label="Interessiert"
          value={stats?.interested || 0}
          color="emerald"
        />
        <StatCard
          icon={TrendingUp}
          label="Erfolgsrate"
          value={stats?.success_rate ? `${stats.success_rate}%` : '-'}
          color="purple"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-800 rounded-lg p-1 w-fit">
        {['overview', 'leads', 'calls'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {tab === 'overview' ? 'Übersicht' : tab === 'leads' ? 'Leads' : 'Anrufe'}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Campaign Info */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Campaign Details</h2>
            <div className="space-y-3">
              <InfoRow label="Gleichzeitige Anrufe" value={campaign.concurrent_calls} />
              <InfoRow label="Zeitfenster" value={`${campaign.schedule_start} - ${campaign.schedule_end}`} />
              <InfoRow
                label="Wochentage"
                value={campaign.schedule_days?.map(d => ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d]).join(', ')}
              />
              <InfoRow label="Erstellt" value={new Date(campaign.created_at).toLocaleString('de-DE')} />
            </div>
          </div>

          {/* Progress */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Fortschritt</h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">Bearbeitet</span>
                  <span>{stats?.processed || 0} / {stats?.total_leads || 0}</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600 transition-all"
                    style={{ width: `${stats?.total_leads ? (stats.processed / stats.total_leads * 100) : 0}%` }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-400">{stats?.interested || 0}</p>
                  <p className="text-sm text-gray-400">Interessiert</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-400">{stats?.not_interested || 0}</p>
                  <p className="text-sm text-gray-400">Kein Interesse</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leads' && (
        <div className="bg-gray-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Name</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Telefon</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Status</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                    Keine Leads in dieser Campaign
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-750">
                    <td className="px-4 py-3">{lead.name || '-'}</td>
                    <td className="px-4 py-3 text-gray-400">{lead.phone}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        lead.status === 'completed' ? 'bg-green-900 text-green-300' :
                        lead.status === 'pending' ? 'bg-gray-700 text-gray-300' :
                        'bg-blue-900 text-blue-300'
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 ${getOutcomeColor(lead.outcome)}`}>
                      {getOutcomeLabel(lead.outcome)}
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
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Lead</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Dauer</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Outcome</th>
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
                      {new Date(call.started_at).toLocaleString('de-DE')}
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

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span>{value || '-'}</span>
    </div>
  )
}
