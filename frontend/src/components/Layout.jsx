import { Link, useLocation } from 'react-router-dom'
import { useStore } from '../store'
import {
  LayoutDashboard,
  Megaphone,
  Phone,
  MessageSquare,
  Upload,
  Settings,
  LogOut,
  Wifi,
  WifiOff
} from 'lucide-react'

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { path: '/calls', label: 'Anrufe', icon: Phone },
  { path: '/prompts', label: 'Prompts', icon: MessageSquare },
  { path: '/upload', label: 'Upload', icon: Upload },
  { path: '/settings', label: 'Einstellungen', icon: Settings },
]

export default function Layout({ children }) {
  const location = useLocation()
  const { user, logout, wsConnected } = useStore()

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h1 className="text-xl font-bold text-blue-400">Voice Sales Agent</h1>
          <p className="text-sm text-gray-400">Solarmodule Telesales</p>
        </div>

        <nav className="flex-1 p-4">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                location.pathname === path
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-700'
              }`}
            >
              <Icon size={20} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            {wsConnected ? (
              <Wifi size={16} className="text-green-400" />
            ) : (
              <WifiOff size={16} className="text-red-400" />
            )}
            <span className="text-sm text-gray-400">
              {wsConnected ? 'Live verbunden' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">{user?.name || user?.email}</span>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-red-400 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-900 p-6">
        {children}
      </main>
    </div>
  )
}
