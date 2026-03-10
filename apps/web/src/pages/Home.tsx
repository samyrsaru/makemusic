import { useState, useEffect } from 'react'
import { SignIn, Show, UserButton, useAuth } from '@clerk/react'
import { Link } from 'react-router'

function Home() {
  const { userId } = useAuth()
  const [status, setStatus] = useState<any>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (userId) fetchStatus()
  }, [userId])

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/subscription/status')
      const data = await res.json()
      setStatus(data)
    } catch (err) {
      console.error('Failed to fetch status:', err)
    }
  }

  const subscribe = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/subscription/checkout', { method: 'POST' })
      const { checkoutUrl, error } = await res.json()
      if (error) {
        setMessage(error)
      } else {
        window.location.href = checkoutUrl
      }
    } catch (err) {
      setMessage('Failed to create checkout')
    } finally {
      setLoading(false)
    }
  }

  const useCredit = async () => {
    try {
      const res = await fetch('/api/credits/use', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setMessage(`Credit used! ${data.remaining} remaining`)
        fetchStatus()
      } else {
        setMessage(data.error)
      }
    } catch (err) {
      setMessage('Failed to use credit')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      <nav className="p-4 flex justify-between items-center">
        <Link to="/" className="text-white text-xl font-bold">
          MakeMusic
        </Link>
        <div className="flex items-center gap-4">
          <Show when="signed-in">
            <Link 
              to="/studio" 
              className="text-white hover:text-white/80 transition-colors"
            >
              Studio
            </Link>
            {status?.subscribed && (
              <span className="text-white font-semibold bg-white/20 px-3 py-1 rounded-full">
                {status.credits} credits
              </span>
            )}
            <UserButton />
          </Show>
        </div>
      </nav>

      <div className="flex items-center justify-center min-h-[calc(100vh-80px)]">
        <Show when="signed-out">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-white mb-4">MakeMusic</h1>
            <p className="text-xl text-white/80 mb-8">Your music creation journey starts here</p>
            <div className="inline-block">
              <SignIn routing="hash" />
            </div>
          </div>
        </Show>

        <Show when="signed-in">
          <div className="text-center max-w-md mx-auto px-4">
            <h1 className="text-6xl font-bold text-white mb-4">Welcome to MakeMusic</h1>
            
            {!status?.subscribed ? (
              <div className="space-y-4">
                <p className="text-xl text-white/80">Get 100 credits/month</p>
                <button 
                  onClick={subscribe}
                  disabled={loading}
                  className="mt-4 px-8 py-3 bg-white text-purple-600 font-semibold rounded-lg shadow-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Loading...' : 'Subscribe $10/month'}
                </button>
                {message && <p className="text-red-200 mt-2">{message}</p>}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white/10 rounded-xl p-6 backdrop-blur-sm">
                  <p className="text-3xl font-bold text-white mb-2">{status.credits}</p>
                  <p className="text-white/80">credits available</p>
                </div>
                
                <Link
                  to="/studio"
                  className="inline-block px-8 py-3 bg-white text-purple-600 font-semibold rounded-lg shadow-lg hover:bg-white/90 transition-all"
                >
                  Open Studio
                </Link>

                <button 
                  onClick={useCredit}
                  disabled={status.credits <= 0}
                  className="px-8 py-3 bg-white/20 text-white font-semibold rounded-lg hover:bg-white/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Use 1 Credit (Test)
                </button>
                
                {message && (
                  <p className={`mt-4 ${message.includes('remaining') ? 'text-green-300' : 'text-red-200'}`}>
                    {message}
                  </p>
                )}
                
                {status.currentPeriodEnd && (
                  <p className="text-white/60 text-sm">
                    Resets on {new Date(status.currentPeriodEnd).toLocaleDateString()}
                  </p>
                )}
              </div>
            )}
            
            {/* Debug: Show Clerk User ID */}
            <div className="mt-8 p-4 bg-black/20 rounded-lg text-left">
              <p className="text-white/40 text-xs mb-1">Debug Info:</p>
              <p className="text-white/60 text-xs font-mono break-all">{userId}</p>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(userId || '')
                  alert('User ID copied!')
                }}
                className="mt-2 text-xs text-purple-300 hover:text-purple-200"
              >
                Copy User ID
              </button>
            </div>
          </div>
        </Show>
      </div>
    </div>
  )
}

export default Home
