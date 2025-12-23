import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/Layout'
import ToastContainer from './components/Toast'
import Dashboard from './pages/Dashboard'
import Campaigns from './pages/Campaigns'
import CampaignDetail from './pages/CampaignDetail'
import Calls from './pages/Calls'
import Prompts from './pages/Prompts'
import Upload from './pages/Upload'
import Settings from './pages/Settings'
import Agents from './pages/Agents'
import Login from './pages/Login'
import { useStore } from './store'

function App() {
  const { token, initWebSocket } = useStore()

  useEffect(() => {
    if (token) {
      initWebSocket()
    }
  }, [token])

  if (!token) {
    return (
      <>
        <Login />
        <ToastContainer />
      </>
    )
  }

  return (
    <>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/calls" element={<Calls />} />
          <Route path="/prompts" element={<Prompts />} />
          <Route path="/upload" element={<Upload />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
      <ToastContainer />
    </>
  )
}

export default App
