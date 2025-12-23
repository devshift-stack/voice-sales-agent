import { useToastStore } from '../store'
import { X, AlertCircle, CheckCircle, AlertTriangle } from 'lucide-react'

export default function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function Toast({ toast, onClose }) {
  const icons = {
    error: <AlertCircle className="text-red-400" size={20} />,
    success: <CheckCircle className="text-green-400" size={20} />,
    warning: <AlertTriangle className="text-yellow-400" size={20} />
  }

  const colors = {
    error: 'bg-red-900/90 border-red-700',
    success: 'bg-green-900/90 border-green-700',
    warning: 'bg-yellow-900/90 border-yellow-700'
  }

  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm shadow-lg animate-slide-in ${colors[toast.type]}`}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white">{toast.title}</p>
        <p className="text-sm text-gray-300 mt-1">{toast.message}</p>
        {toast.details && (
          <p className="text-xs text-gray-400 mt-1 font-mono">{toast.details}</p>
        )}
      </div>
      <button
        onClick={onClose}
        className="p-1 hover:bg-white/10 rounded transition-colors"
      >
        <X size={16} className="text-gray-400" />
      </button>
    </div>
  )
}
