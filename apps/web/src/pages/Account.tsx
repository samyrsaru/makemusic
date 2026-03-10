import { useState, useEffect } from 'react'
import { Show, UserButton, useAuth, useUser } from '@clerk/react'
import { Link } from 'react-router'
import { ThemeToggle } from '../components/ThemeToggle.tsx'

interface SubscriptionStatus {
  subscribed: boolean
  credits: number
  currentPeriodEnd?: string
}

function Account() {
  const { userId, isLoaded } = useAuth()
  const { user } = useUser()
  const [status, setStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [managingSubscription, setManagingSubscription] = useState(false)

  useEffect(() => {
    if (isLoaded && userId) fetchStatus()
  }, [isLoaded, userId])

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/subscription/status')
      const data = await res.json()
      setStatus(data)
    } catch (err) {
      setError('Failed to load account information')
    } finally {
      setLoading(false)
    }
  }

  const manageSubscription = async () => {
    setManagingSubscription(true)
    try {
      const email = user?.primaryEmailAddress?.emailAddress
      const res = await fetch('/api/subscription/portal', { 
        method: 'POST',
        headers: email ? { 'x-user-email': email } : undefined
      })
      const { portalUrl, error } = await res.json()
      if (error) {
        setError(error)
      } else if (portalUrl) {
        window.location.href = portalUrl
      }
    } catch (err) {
      setError('Failed to open billing portal')
    } finally {
      setManagingSubscription(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      {/* Navigation */}
      <nav className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-semibold tracking-tight">
          <span className="text-green-500">Make</span>Music
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link 
            to="/studio" 
            className="text-zinc-600 dark:text-zinc-400 hover:text-green-500 dark:hover:text-green-400 transition-colors text-sm font-medium"
          >
            Studio
          </Link>
          <Link 
            to="/library" 
            className="text-zinc-600 dark:text-zinc-400 hover:text-green-500 dark:hover:text-green-400 transition-colors text-sm font-medium"
          >
            Library
          </Link>
          <UserButton />
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <Show when="signed-out">
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold mb-4">Account</h1>
            <p className="text-zinc-600 dark:text-zinc-400 mb-8">Please sign in to view your account</p>
            <Link
              to="/"
              className="inline-block py-3 px-6 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-xl transition-all"
            >
              Sign In
            </Link>
          </div>
        </Show>

        <Show when="signed-in">
          <div>
            <h1 className="text-3xl font-bold mb-8">Account</h1>

            {error && (
              <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-xl p-4 text-red-600 dark:text-red-400 mb-6">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent mx-auto mb-4"></div>
                <p className="text-zinc-500 dark:text-zinc-400">Loading account...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Profile Section */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4">Profile</h2>
                  <div className="flex items-center gap-4">
                    {user?.imageUrl ? (
                      <img 
                        src={user.imageUrl} 
                        alt="Profile" 
                        className="w-16 h-16 rounded-full"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-zinc-200 dark:bg-zinc-800 rounded-full flex items-center justify-center">
                        <span className="text-2xl">👤</span>
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-lg">{user?.fullName || user?.username || 'User'}</p>
                      <p className="text-zinc-500 dark:text-zinc-500 text-sm">{user?.primaryEmailAddress?.emailAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Credits Section */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4">Credits</h2>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-green-500">{status?.credits || 0}</span>
                    <span className="text-zinc-500 dark:text-zinc-500">credits remaining</span>
                  </div>
                  {status?.currentPeriodEnd && (
                    <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-2">
                      Credits reset on {formatDate(status.currentPeriodEnd)}
                    </p>
                  )}
                </div>

                {/* Subscription Section */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
                  <h2 className="text-lg font-semibold mb-4">Subscription</h2>
                  
                  {status?.subscribed ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        <span className="font-medium">Pro Plan - Active</span>
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        You have unlimited access to generate music.
                      </p>
                      <button
                        onClick={manageSubscription}
                        disabled={managingSubscription}
                        className="py-2.5 px-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all disabled:opacity-50"
                      >
                        {managingSubscription ? 'Opening...' : 'Manage Subscription'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-zinc-400 rounded-full"></span>
                        <span className="font-medium">Free Plan</span>
                      </div>
                      <p className="text-zinc-600 dark:text-zinc-400">
                        Upgrade to Pro to get 100 credits per month.
                      </p>
                      <Link
                        to="/"
                        className="inline-block py-2.5 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-lg transition-all"
                      >
                        Upgrade to Pro
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </Show>
      </main>
    </div>
  )
}

export default Account
