import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../store'
import {
  Megaphone,
  Plus,
  Play,
  Pause,
  Square,
  Users,
  Phone,
  Clock,
  ChevronRight,
  Trash2
} from 'lucide-react'

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      const res = await api.get('/campaigns')
      setCampaigns(res.data)
    } catch (error) {
      console.error('Error loading campaigns:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (id, action) => {
    try {
      await api.post(`/campaigns/${id}/${action}`)
      loadCampaigns()
    } catch (error) {
      console.error(`Error ${action} campaign:`, error)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Campaign wirklich löschen?')) return
    try {
      await api.delete(`/campaigns/${id}`)
      loadCampaigns()
    } catch (error) {
      console.error('Error deleting campaign:', error)
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
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Plus size={20} />
          Neue Campaign
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-12 text-center">
          <Megaphone size={48} className="mx-auto mb-4 text-gray-500" />
          <h2 className="text-xl font-semibold mb-2">Keine Campaigns</h2>
          <p className="text-gray-400 mb-4">Erstelle deine erste Campaign um zu starten.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Campaign erstellen
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {campaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-gray-800 rounded-xl p-6 hover:bg-gray-750 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-semibold">{campaign.name}</h2>
                    <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(campaign.status)}`}>
                      {getStatusLabel(campaign.status)}
                    </span>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-gray-400">
                    <span className="flex items-center gap-1">
                      <Users size={16} />
                      {campaign.total_leads || 0} Leads
                    </span>
                    <span className="flex items-center gap-1">
                      <Phone size={16} />
                      {campaign.calls_made || 0} Anrufe
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={16} />
                      {campaign.concurrent_calls || 1} gleichzeitig
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {campaign.status === 'draft' && (
                    <button
                      onClick={() => handleAction(campaign.id, 'start')}
                      className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                      title="Starten"
                    >
                      <Play size={18} />
                    </button>
                  )}
                  {campaign.status === 'running' && (
                    <button
                      onClick={() => handleAction(campaign.id, 'pause')}
                      className="p-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg transition-colors"
                      title="Pausieren"
                    >
                      <Pause size={18} />
                    </button>
                  )}
                  {campaign.status === 'paused' && (
                    <>
                      <button
                        onClick={() => handleAction(campaign.id, 'resume')}
                        className="p-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                        title="Fortsetzen"
                      >
                        <Play size={18} />
                      </button>
                      <button
                        onClick={() => handleAction(campaign.id, 'stop')}
                        className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                        title="Stoppen"
                      >
                        <Square size={18} />
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors"
                    title="Löschen"
                  >
                    <Trash2 size={18} />
                  </button>
                  <Link
                    to={`/campaigns/${campaign.id}`}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ChevronRight size={18} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <CreateCampaignModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false)
            loadCampaigns()
          }}
        />
      )}
    </div>
  )
}

function CreateCampaignModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [promptId, setPromptId] = useState('')
  const [concurrentCalls, setConcurrentCalls] = useState(1)
  const [scheduleStart, setScheduleStart] = useState('09:00')
  const [scheduleEnd, setScheduleEnd] = useState('18:00')
  const [scheduleDays, setScheduleDays] = useState([1, 2, 3, 4, 5])
  const [prompts, setPrompts] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    loadPrompts()
  }, [])

  const loadPrompts = async () => {
    try {
      const res = await api.get('/prompts')
      setPrompts(res.data)
      if (res.data.length > 0) {
        setPromptId(res.data[0].id)
      }
    } catch (error) {
      console.error('Error loading prompts:', error)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await api.post('/campaigns', {
        name,
        prompt_id: promptId,
        concurrent_calls: concurrentCalls,
        schedule_start: scheduleStart,
        schedule_end: scheduleEnd,
        schedule_days: scheduleDays
      })
      onCreated()
    } catch (error) {
      console.error('Error creating campaign:', error)
      alert(error.response?.data?.error || 'Fehler beim Erstellen')
    } finally {
      setLoading(false)
    }
  }

  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']

  const toggleDay = (day) => {
    if (scheduleDays.includes(day)) {
      setScheduleDays(scheduleDays.filter(d => d !== day))
    } else {
      setScheduleDays([...scheduleDays, day].sort())
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-6">Neue Campaign</h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                placeholder="z.B. Solar Campaign Q1"
                required
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">Prompt/Skript</label>
              <select
                value={promptId}
                onChange={(e) => setPromptId(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                required
              >
                <option value="">Prompt auswählen...</option>
                {prompts.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              {prompts.length === 0 && (
                <p className="text-xs text-yellow-400 mt-1">
                  Erstelle zuerst einen Prompt unter "Prompts"
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1">
                Gleichzeitige Anrufe: {concurrentCalls}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={concurrentCalls}
                onChange={(e) => setConcurrentCalls(parseInt(e.target.value))}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-500">
                <span>1</span>
                <span>10</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Start</label>
                <input
                  type="time"
                  value={scheduleStart}
                  onChange={(e) => setScheduleStart(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Ende</label>
                <input
                  type="time"
                  value={scheduleEnd}
                  onChange={(e) => setScheduleEnd(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-2">Wochentage</label>
              <div className="flex gap-2">
                {dayNames.map((day, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => toggleDay(index)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      scheduleDays.includes(index)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !promptId}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Erstelle...' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
