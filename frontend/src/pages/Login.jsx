import { useState } from 'react'
import { useStore } from '../store'
import { Phone } from 'lucide-react'

export default function Login() {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login, register } = useStore()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isRegister) {
        await register(email, password, name)
      } else {
        await login(email, password)
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Ein Fehler ist aufgetreten')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Phone size={32} />
          </div>
          <h1 className="text-2xl font-bold">Voice Sales Agent</h1>
          <p className="text-gray-400">KI-gestützter Telesales für Solarmodule</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6">
            {isRegister ? 'Registrieren' : 'Anmelden'}
          </h2>

          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}

          {isRegister && (
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-1">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
                required
              />
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-1">E-Mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm text-gray-400 mb-1">Passwort</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading ? 'Bitte warten...' : isRegister ? 'Registrieren' : 'Anmelden'}
          </button>

          <p className="text-center text-sm text-gray-400 mt-4">
            {isRegister ? 'Bereits registriert?' : 'Noch kein Account?'}{' '}
            <button
              type="button"
              onClick={() => setIsRegister(!isRegister)}
              className="text-blue-400 hover:underline"
            >
              {isRegister ? 'Anmelden' : 'Registrieren'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
