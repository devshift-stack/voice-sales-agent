import { useState, useRef, useEffect } from 'react'
import { api } from '../store'
import {
  Upload as UploadIcon,
  FileSpreadsheet,
  CheckCircle,
  AlertCircle,
  X,
  Download
} from 'lucide-react'

export default function Upload() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [selectedCampaign, setSelectedCampaign] = useState('')
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      const res = await api.get('/campaigns')
      setCampaigns(res.data)
    } catch (error) {
      console.error('Error loading campaigns:', error)
    }
  }

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0]
    if (!selectedFile) return

    // Check file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
    if (!validTypes.includes(selectedFile.type) &&
        !selectedFile.name.endsWith('.csv') &&
        !selectedFile.name.endsWith('.xlsx') &&
        !selectedFile.name.endsWith('.xls')) {
      alert('Bitte wähle eine CSV oder Excel-Datei')
      return
    }

    setFile(selectedFile)
    setResult(null)

    // Preview
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const res = await api.post('/upload/preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setPreview(res.data)
    } catch (error) {
      console.error('Preview error:', error)
      setPreview(null)
    }
  }

  const handleUpload = async () => {
    if (!file || !selectedCampaign) return

    setUploading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('campaign_id', selectedCampaign)

      const res = await api.post('/upload/leads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      setResult({
        success: true,
        message: `${res.data.imported} Leads erfolgreich importiert`,
        details: res.data
      })
      setFile(null)
      setPreview(null)
    } catch (error) {
      console.error('Upload error:', error)
      setResult({
        success: false,
        message: error.response?.data?.error || 'Fehler beim Upload'
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      const fakeEvent = { target: { files: [droppedFile] } }
      handleFileSelect(fakeEvent)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Leads Upload</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Area */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Datei hochladen</h2>

          {/* Campaign Selection */}
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">Campaign auswählen</label>
            <select
              value={selectedCampaign}
              onChange={(e) => setSelectedCampaign(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
            >
              <option value="">Campaign wählen...</option>
              {campaigns.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              file
                ? 'border-green-500 bg-green-900/20'
                : 'border-gray-600 hover:border-blue-500 hover:bg-gray-700/50'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />

            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileSpreadsheet size={32} className="text-green-400" />
                <div className="text-left">
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-gray-400">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setFile(null)
                    setPreview(null)
                  }}
                  className="p-1 hover:bg-gray-600 rounded"
                >
                  <X size={18} />
                </button>
              </div>
            ) : (
              <>
                <UploadIcon size={48} className="mx-auto mb-4 text-gray-500" />
                <p className="text-gray-300 mb-2">
                  Datei hierher ziehen oder klicken
                </p>
                <p className="text-sm text-gray-500">
                  CSV oder Excel (.xlsx, .xls)
                </p>
              </>
            )}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={!file || !selectedCampaign || uploading}
            className="w-full mt-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Uploading...
              </>
            ) : (
              <>
                <UploadIcon size={20} />
                Leads importieren
              </>
            )}
          </button>

          {/* Result */}
          {result && (
            <div className={`mt-4 p-4 rounded-lg flex items-start gap-3 ${
              result.success
                ? 'bg-green-900/30 border border-green-600'
                : 'bg-red-900/30 border border-red-600'
            }`}>
              {result.success ? (
                <CheckCircle className="text-green-400 flex-shrink-0" />
              ) : (
                <AlertCircle className="text-red-400 flex-shrink-0" />
              )}
              <div>
                <p className={result.success ? 'text-green-300' : 'text-red-300'}>
                  {result.message}
                </p>
                {result.details?.duplicates > 0 && (
                  <p className="text-sm text-yellow-400 mt-1">
                    {result.details.duplicates} Duplikate übersprungen
                  </p>
                )}
                {result.details?.errors > 0 && (
                  <p className="text-sm text-red-400 mt-1">
                    {result.details.errors} Fehler
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Preview & Format Info */}
        <div className="space-y-6">
          {/* Preview */}
          {preview && (
            <div className="bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold mb-4">Vorschau</h2>
              <div className="overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-700">
                    <tr>
                      {preview.columns.map((col, i) => (
                        <th key={i} className="px-3 py-2 text-left font-medium text-gray-300">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {preview.rows.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        {preview.columns.map((col, j) => (
                          <td key={j} className="px-3 py-2 text-gray-400">
                            {row[col] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-sm text-gray-500 mt-3">
                {preview.total} Zeilen gefunden
              </p>
            </div>
          )}

          {/* Format Info */}
          <div className="bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold mb-4">Dateiformat</h2>
            <p className="text-gray-400 text-sm mb-4">
              Die Datei sollte folgende Spalten enthalten:
            </p>
            <div className="space-y-2">
              <FormatRow name="phone" required description="Telefonnummer (Pflicht)" />
              <FormatRow name="name" description="Name des Kontakts" />
              <FormatRow name="company" description="Firmenname" />
              <FormatRow name="email" description="E-Mail-Adresse" />
              <FormatRow name="notes" description="Notizen" />
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700">
              <h3 className="font-medium mb-2">Beispiel-Datei</h3>
              <a
                href="/example-leads.csv"
                download
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm"
              >
                <Download size={16} />
                example-leads.csv herunterladen
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function FormatRow({ name, description, required }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <code className="px-2 py-1 bg-gray-700 rounded text-blue-300">{name}</code>
      <span className="text-gray-400">{description}</span>
      {required && (
        <span className="text-xs text-red-400">*Pflicht</span>
      )}
    </div>
  )
}
