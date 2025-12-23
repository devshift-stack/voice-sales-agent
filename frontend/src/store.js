import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

// Axios Instance
const api = axios.create({
  baseURL: API_URL
})

export const useStore = create(
  persist(
    (set, get) => ({
      // Auth
      token: null,
      user: null,

      // WebSocket
      ws: null,
      wsConnected: false,

      // Live Data
      activeCalls: [],
      stats: null,

      // Login
      login: async (email, password) => {
        const res = await api.post('/auth/login', { email, password })
        set({ token: res.data.token, user: res.data.user })
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
        return res.data
      },

      // Logout
      logout: () => {
        const { ws } = get()
        if (ws) ws.close()
        set({ token: null, user: null, ws: null, wsConnected: false })
        delete api.defaults.headers.common['Authorization']
      },

      // Register
      register: async (email, password, name) => {
        const res = await api.post('/auth/register', { email, password, name })
        set({ token: res.data.token, user: res.data.user })
        api.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`
        return res.data
      },

      // WebSocket initialisieren
      initWebSocket: () => {
        const wsUrl = import.meta.env.VITE_WS_URL ||
          `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`

        const ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          console.log('WebSocket verbunden')
          set({ wsConnected: true })
        }

        ws.onmessage = (event) => {
          const data = JSON.parse(event.data)
          handleWSMessage(data, set, get)
        }

        ws.onclose = () => {
          console.log('WebSocket getrennt')
          set({ wsConnected: false })
          // Reconnect nach 3 Sekunden
          setTimeout(() => get().initWebSocket(), 3000)
        }

        ws.onerror = (error) => {
          console.error('WebSocket Error:', error)
        }

        set({ ws })
      },

      // Stats laden
      loadStats: async () => {
        const { token } = get()
        if (!token) return
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`

        try {
          const res = await api.get('/stats')
          set({ stats: res.data })
        } catch (error) {
          console.error('Stats Error:', error)
        }
      },

      // Aktive Calls laden
      loadActiveCalls: async () => {
        const { token } = get()
        if (!token) return
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`

        try {
          const res = await api.get('/calls/active/list')
          set({ activeCalls: res.data })
        } catch (error) {
          console.error('Active Calls Error:', error)
        }
      }
    }),
    {
      name: 'voice-agent-storage',
      partialize: (state) => ({ token: state.token, user: state.user })
    }
  )
)

// WebSocket Message Handler
function handleWSMessage(data, set, get) {
  switch (data.type) {
    case 'call_started':
      get().loadActiveCalls()
      get().loadStats()
      break

    case 'call_completed':
      get().loadActiveCalls()
      get().loadStats()
      break

    case 'call_status':
      get().loadActiveCalls()
      break

    case 'campaign_started':
    case 'campaign_paused':
    case 'campaign_stopped':
      get().loadStats()
      break

    default:
      console.log('WS Message:', data)
  }
}

// API Export für direkte Nutzung
export { api }
