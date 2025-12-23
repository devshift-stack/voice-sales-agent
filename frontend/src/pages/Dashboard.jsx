import { useEffect, useState } from 'react'
import { useStore, api } from '../store'
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#6366f1', '#8b5cf6']

export default function Dashboard() {
  const { stats, loadStats, activeCalls, loadActiveCalls } = useStore()
  const [callsPerDay, setCallsPerDay] = useState([])
  const [outcomes, setOutcomes] = useState([])

  useEffect(() => {
    loadStats()
    loadActiveCalls()

    // Charts laden
    loadCharts()

    // Auto-refresh alle 10 Sekunden
    const interval = setInterval(() => {
      loadStats()
      loadActiveCalls()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const loadCharts = async () => {
    try {
      const [callsRes, outcomesRes] = await Promise.all([
        api.get('/stats/calls-per-day'),
        api.get('/stats/outcomes')
      ])
      setCallsPerDay(callsRes.data.slice(0, 7).reverse())
      setOutcomes(outcomesRes.data)
    } catch (error) {
      console.error('Charts Error:', error)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={PhoneCall}
          label="Aktive Anrufe"
          value={activeCalls.length}
          color="blue"
        />
        <StatCard
          icon={Phone}
          label="Anrufe Heute"
          value={stats?.today?.calls_today || 0}
          color="green"
        />
        <StatCard
          icon={CheckCircle}
          label="Interessiert Heute"
          value={stats?.today?.interested_today || 0}
          color="emerald"
        />
        <StatCard
          icon={Users}
          label="Leads Wartend"
          value={stats?.leads?.pending_leads || 0}
          color="yellow"
        />
      </div>

      {/* Active Calls */}
      {activeCalls.length > 0 && (
        <div className="bg-gray-800 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PhoneCall className="text-green-400" />
            Aktive Anrufe
          </h2>
          <div className="space-y-3">
            {activeCalls.map((call) => (
              <div
                key={call.id}
                className="flex items-center justify-between bg-gray-700 rounded-lg p-4"
              >
                <div>
                  <p className="font-medium">{call.lead_name || 'Unbekannt'}</p>
                  <p className="text-sm text-gray-400">{call.lead_phone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-green-600 rounded-full text-sm">
                    {call.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calls per Day */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Anrufe (letzte 7 Tage)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={callsPerDay}>
                <XAxis dataKey="date" tick={{ fill: '#9ca3af' }} />
                <YAxis tick={{ fill: '#9ca3af' }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="interested" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Outcomes */}
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Ergebnisse</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={outcomes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  dataKey="count"
                  nameKey="outcome"
                  label={({ outcome, count }) => `${outcome}: ${count}`}
                >
                  {outcomes.map((entry, index) => (
                    <Cell key={entry.outcome} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#1f2937', border: 'none' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
        <QuickStat label="Gesamt Anrufe" value={stats?.calls?.total_calls || 0} />
        <QuickStat label="Interessiert" value={stats?.calls?.interested || 0} />
        <QuickStat label="Kein Interesse" value={stats?.calls?.not_interested || 0} />
        <QuickStat
          label="Durchschn. Dauer"
          value={stats?.calls?.avg_duration ? `${Math.round(stats.calls.avg_duration)}s` : '-'}
        />
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }) {
  const colors = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    emerald: 'bg-emerald-600',
    yellow: 'bg-yellow-600',
    red: 'bg-red-600'
  }

  return (
    <div className="bg-gray-800 rounded-xl p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </div>
    </div>
  )
}

function QuickStat({ label, value }) {
  return (
    <div className="bg-gray-800 rounded-lg p-4 text-center">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  )
}
