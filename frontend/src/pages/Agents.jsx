import { useState, useEffect } from 'react'
import { useStore } from '../store'

export default function Agents() {
  const { token, addToast } = useStore()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    codePath: ''
  })

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/agents`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      setAgents(data)
    } catch (error) {
      addToast('Fehler beim Laden der Agenten', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    try {
      const url = editingAgent
        ? `${API_URL}/api/agents/${editingAgent.id}`
        : `${API_URL}/api/agents`

      const res = await fetch(url, {
        method: editingAgent ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Fehler beim Speichern')
      }

      addToast(editingAgent ? 'Agent aktualisiert' : 'Agent erstellt', 'success')
      setShowModal(false)
      setEditingAgent(null)
      setFormData({ name: '', description: '', codePath: '' })
      fetchAgents()
    } catch (error) {
      addToast(error.message, 'error')
    }
  }

  const handleEdit = (agent) => {
    setEditingAgent(agent)
    setFormData({
      name: agent.name,
      description: agent.description || '',
      codePath: agent.code_path
    })
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Agent wirklich löschen?')) return

    try {
      const res = await fetch(`${API_URL}/api/agents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Fehler beim Löschen')
      }

      addToast('Agent gelöscht', 'success')
      fetchAgents()
    } catch (error) {
      addToast(error.message, 'error')
    }
  }

  const handleToggle = async (id) => {
    try {
      const res = await fetch(`${API_URL}/api/agents/${id}/toggle`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Fehler beim Umschalten')

      fetchAgents()
    } catch (error) {
      addToast(error.message, 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Agenten</h1>
        <button
          onClick={() => {
            setEditingAgent(null)
            setFormData({ name: '', description: '', codePath: '' })
            setShowModal(true)
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Neuer Agent
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Beschreibung</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code-Pfad</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaigns</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Aktionen</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {agents.length === 0 ? (
              <tr>
                <td colSpan="6" className="px-6 py-12 text-center text-gray-500">
                  Keine Agenten vorhanden. Erstelle deinen ersten Agenten.
                </td>
              </tr>
            ) : (
              agents.map((agent) => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{agent.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500 truncate max-w-xs">
                      {agent.description || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded truncate max-w-xs block">
                      {agent.code_path}
                    </code>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {agent.campaign_count || 0} Campaigns
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggle(agent.id)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        agent.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {agent.is_active ? 'Aktiv' : 'Inaktiv'}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(agent)}
                      className="text-blue-600 hover:text-blue-900 mr-4"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => handleDelete(agent.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Löschen
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4">
              {editingAgent ? 'Agent bearbeiten' : 'Neuer Agent'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  placeholder="z.B. SupportAgent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Beschreibung
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  rows={2}
                  placeholder="Kurze Beschreibung des Agenten..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code-Pfad
                </label>
                <input
                  type="text"
                  value={formData.codePath}
                  onChange={(e) => setFormData({ ...formData, codePath: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                  placeholder="/Users/.../SupportAgent.js"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  Absoluter Pfad zur JavaScript-Datei des Agenten
                </p>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setEditingAgent(null)
                  }}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingAgent ? 'Speichern' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
