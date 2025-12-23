import { useState, useEffect, useRef } from 'react'
import { api, useStore } from '../store'
import { Upload, FileCode, X } from 'lucide-react'

export default function Agents() {
  const { addToast } = useStore()
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingAgent, setEditingAgent] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [selectedFile, setSelectedFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    fetchAgents()
  }, [])

  const fetchAgents = async () => {
    try {
      const res = await api.get('/agents')
      setAgents(res.data)
    } catch (error) {
      addToast('Fehler beim Laden der Agenten', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (saving) return // Doppelklick verhindern

    if (!editingAgent && !selectedFile) {
      addToast('Bitte eine Agent-Datei auswählen', 'error')
      return
    }

    setSaving(true)
    try {
      const data = new FormData()
      data.append('name', formData.name)
      data.append('description', formData.description)
      if (selectedFile) {
        data.append('agentFile', selectedFile)
      }

      if (editingAgent) {
        await api.put(`/agents/${editingAgent.id}`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      } else {
        await api.post('/agents', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        })
      }

      addToast(editingAgent ? 'Agent aktualisiert' : 'Agent erstellt', 'success')
      closeModal()
      fetchAgents()
    } catch (error) {
      addToast(error.response?.data?.error || error.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingAgent(null)
    setFormData({ name: '', description: '' })
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleEdit = (agent) => {
    setEditingAgent(agent)
    setFormData({
      name: agent.name,
      description: agent.description || ''
    })
    setSelectedFile(null)
    setShowModal(true)
  }

  const handleDelete = async (id) => {
    if (!confirm('Agent wirklich löschen?')) return

    try {
      await api.delete(`/agents/${id}`)
      addToast('Agent gelöscht', 'success')
      fetchAgents()
    } catch (error) {
      addToast(error.response?.data?.error || error.message, 'error')
    }
  }

  const handleToggle = async (id) => {
    try {
      await api.post(`/agents/${id}/toggle`)
      fetchAgents()
    } catch (error) {
      addToast(error.response?.data?.error || error.message, 'error')
    }
  }

  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (!file.name.endsWith('.js')) {
        addToast('Nur JavaScript-Dateien (.js) erlaubt', 'error')
        return
      }
      setSelectedFile(file)
    }
  }

  const getFileName = (path) => {
    if (!path) return '-'
    return path.split('/').pop().split('\\').pop()
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
            setFormData({ name: '', description: '' })
            setSelectedFile(null)
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datei</th>
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
                    <div className="flex items-center gap-2">
                      <FileCode size={16} className="text-gray-400" />
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {getFileName(agent.code_path)}
                      </code>
                    </div>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  placeholder="z.B. SalesAgent"
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                  rows={2}
                  placeholder="Kurze Beschreibung des Agenten..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agent-Datei (.js)
                  {editingAgent && <span className="text-gray-400 ml-2">(optional bei Bearbeitung)</span>}
                </label>
                <div className="mt-1">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".js"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="agent-file"
                  />
                  {selectedFile ? (
                    <div className="flex items-center gap-3 p-3 border border-green-300 bg-green-50 rounded-lg">
                      <FileCode size={20} className="text-green-600" />
                      <span className="flex-1 text-sm text-green-800 font-medium">
                        {selectedFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null)
                          if (fileInputRef.current) fileInputRef.current.value = ''
                        }}
                        className="text-green-600 hover:text-green-800"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <label
                      htmlFor="agent-file"
                      className="flex flex-col items-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                    >
                      <Upload size={32} className="text-gray-400" />
                      <span className="text-sm text-gray-600">
                        Klicken zum Auswählen oder Datei hierher ziehen
                      </span>
                      <span className="text-xs text-gray-400">
                        Nur JavaScript-Dateien (.js)
                      </span>
                      {editingAgent && (
                        <span className="text-xs text-blue-600 mt-1">
                          Aktuelle Datei: {getFileName(editingAgent.code_path)}
                        </span>
                      )}
                    </label>
                  )}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Speichern...' : (editingAgent ? 'Speichern' : 'Erstellen')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
