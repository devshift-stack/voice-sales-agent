import { useEffect, useState } from 'react'
import { api, useStore } from '../store'
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Clock,
  Filter,
  Search,
  FileText,
  Play,
  Download
} from 'lucide-react'

export default function Calls() {
  const { activeCalls } = useStore()
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selectedCall, setSelectedCall] = useState(null)

  useEffect(() => {
    loadCalls()
  }, [filter])

  const loadCalls = async () => {
    try {
      const params = filter !== 'all' ? { outcome: filter } : {}
      const res = await api.get('/calls', { params })
      setCalls(res.data)
    } catch (error) {
      console.error('Error loading calls:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredCalls = calls.filter(call => {
    if (!search) return true
    const searchLower = search.toLowerCase()
    return (
      call.lead_name?.toLowerCase().includes(searchLower) ||
      call.lead_phone?.includes(search)
    )
  })

  const getOutcomeColor = (outcome) => {
    switch (outcome) {
      case 'interested': return 'bg-green-900 text-green-300'
      case 'not_interested': return 'bg-red-900 text-red-300'
      case 'callback': return 'bg-yellow-900 text-yellow-300'
      case 'no_answer': return 'bg-gray-700 text-gray-300'
      case 'busy': return 'bg-orange-900 text-orange-300'
      case 'voicemail': return 'bg-purple-900 text-purple-300'
      default: return 'bg-gray-700 text-gray-300'
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
      default: return outcome || 'Unbekannt'
    }
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '-'
    const mins = Math.floor(seconds / 60)
    const secs = Math.round(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Anrufe</h1>

      {/* Active Calls */}
      {activeCalls.length > 0 && (
        <div className="bg-green-900/30 border border-green-600 rounded-xl p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <PhoneCall className="text-green-400 animate-pulse" />
            Aktive Anrufe ({activeCalls.length})
          </h2>
          <div className="grid gap-3">
            {activeCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between bg-gray-800 rounded-lg p-3"
              >
                <div>
                  <p className="font-medium">{call.lead_name || 'Unbekannt'}</p>
                  <p className="text-sm text-gray-400">{call.lead_phone}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-sm text-gray-400">
                    <Clock size={14} />
                    {call.duration ? formatDuration(call.duration) : 'Läuft...'}
                  </span>
                  <span className="px-2 py-1 bg-green-600 rounded text-sm">
                    {call.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-4 py-2 flex-1 max-w-md">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Suchen nach Name oder Telefon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-none outline-none flex-1"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 focus:outline-none focus:border-blue-500"
          >
            <option value="all">Alle Outcomes</option>
            <option value="interested">Interessiert</option>
            <option value="not_interested">Kein Interesse</option>
            <option value="callback">Rückruf</option>
            <option value="no_answer">Keine Antwort</option>
            <option value="busy">Besetzt</option>
            <option value="voicemail">Mailbox</option>
          </select>
        </div>
      </div>

      {/* Calls Table */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredCalls.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <Phone size={48} className="mb-4 opacity-50" />
            <p>Keine Anrufe gefunden</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Lead</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Campaign</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Dauer</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Outcome</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Zeit</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-300">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredCalls.map((call) => (
                <tr key={call.id} className="hover:bg-gray-750">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium">{call.lead_name || 'Unbekannt'}</p>
                      <p className="text-sm text-gray-400">{call.lead_phone}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-400">
                    {call.campaign_name || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-1 text-gray-400">
                      <Clock size={14} />
                      {formatDuration(call.duration)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs ${getOutcomeColor(call.outcome)}`}>
                      {getOutcomeLabel(call.outcome)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-400">
                    {new Date(call.started_at).toLocaleString('de-DE')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {call.transcript && (
                        <button
                          onClick={() => setSelectedCall(call)}
                          className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded transition-colors"
                          title="Transkript anzeigen"
                        >
                          <FileText size={18} />
                        </button>
                      )}
                      {call.recording_url && (
                        <a
                          href={call.recording_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-gray-400 hover:text-green-400 hover:bg-gray-700 rounded transition-colors"
                          title="Aufnahme abspielen"
                        >
                          <Play size={18} />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Transcript Modal */}
      {selectedCall && (
        <TranscriptModal
          call={selectedCall}
          onClose={() => setSelectedCall(null)}
        />
      )}
    </div>
  )
}

function TranscriptModal({ call, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-xl font-semibold">Transkript</h2>
            <p className="text-sm text-gray-400">
              {call.lead_name} - {new Date(call.started_at).toLocaleString('de-DE')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-auto bg-gray-900 rounded-lg p-4">
          <pre className="whitespace-pre-wrap text-sm text-gray-300 font-mono">
            {call.transcript || 'Kein Transkript verfügbar'}
          </pre>
        </div>

        {/* Collected Data */}
        {call.collected_data && Object.keys(call.collected_data).length > 0 && (
          <div className="mt-4 bg-green-900/30 border border-green-600 rounded-lg p-4">
            <h3 className="font-semibold mb-2 text-green-300">Erfasste Daten</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {Object.entries(call.collected_data).map(([key, value]) => (
                <div key={key}>
                  <span className="text-gray-400">{key}:</span>{' '}
                  <span>{String(value)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  )
}
