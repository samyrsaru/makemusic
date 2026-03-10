import { useState, useEffect } from 'react'
import { UserButton, Show, useAuth } from '@clerk/react'
import { Link } from 'react-router'

function Studio() {
  const { userId } = useAuth()
  const [lyrics, setLyrics] = useState('')
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generation, setGeneration] = useState<any>(null)
  const [error, setError] = useState('')
  const [credits, setCredits] = useState(0)

  // Fetch credits on load
  useEffect(() => {
    if (userId) fetchStatus()
  }, [userId])

  // Poll for generation status
  useEffect(() => {
    if (!generation?.id || generation.status === 'completed' || generation.status === 'failed') return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/generations/${generation.id}`)
        const data = await res.json()
        setGeneration(data)
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(interval)
        }
      } catch (err) {
        console.error('Polling error:', err)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [generation])

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/subscription/status')
      const data = await res.json()
      setCredits(data.credits)
    } catch (err) {
      console.error('Failed to fetch status:', err)
    }
  }

  const handleGenerate = async () => {
    if (!lyrics.trim()) return
    
    setIsGenerating(true)
    setError('')
    
    try {
      const res = await fetch('/api/generations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lyrics, prompt })
      })
      
      const data = await res.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setGeneration(data)
        setCredits(data.creditsRemaining)
      }
    } catch (err: any) {
      setError('Failed to start generation')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500">
      {/* Navigation */}
      <nav className="p-4 flex justify-between items-center">
        <Link to="/" className="text-white text-xl font-bold">
          MakeMusic
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-white font-semibold bg-white/20 px-3 py-1 rounded-full">
            {credits} credits
          </span>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <Show when="signed-out">
          <div className="text-center py-20">
            <h1 className="text-4xl font-bold text-white mb-4">Studio</h1>
            <p className="text-white/80 mb-8">Please sign in to use the music generator</p>
          </div>
        </Show>

        <Show when="signed-in">
          <div className="space-y-6">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">Studio</h1>
              <p className="text-white/80">Generate music with AI</p>
            </div>

            {/* Lyrics Input */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <label htmlFor="lyrics" className="block text-white font-semibold mb-2">
                Lyrics
              </label>
              <textarea
                id="lyrics"
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="Enter your lyrics here..."
                disabled={isGenerating}
                className="w-full h-48 px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none disabled:opacity-50"
              />
            </div>

            {/* Prompt Input */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6">
              <label htmlFor="prompt" className="block text-white font-semibold mb-2">
                Style Prompt
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the style, mood, instruments, tempo... (e.g., upbeat pop with electronic beats, dreamy synths, 120 BPM)"
                disabled={isGenerating}
                className="w-full h-24 px-4 py-3 bg-white/20 border border-white/30 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/50 resize-none disabled:opacity-50"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200">
                {error}
              </div>
            )}

            {/* Generate Button */}
            <div className="flex justify-center pt-4">
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !lyrics.trim() || credits < 1}
                className="px-12 py-4 bg-white text-purple-600 font-bold text-lg rounded-full shadow-lg hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
              >
                {isGenerating ? 'Starting...' : credits < 1 ? 'No Credits' : 'Generate Music'}
              </button>
            </div>

            {/* Credits indicator */}
            <div className="text-center text-white/60 text-sm">
              Each generation costs 1 credit • You have {credits} credits
            </div>

            {/* Generation Status */}
            {generation && (
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 mt-8">
                <h3 className="text-white font-semibold mb-4">Generation Status</h3>
                
                {generation.status === 'pending' && (
                  <div className="flex items-center gap-3 text-white/80">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Generating your music... (This may take 30-60 seconds)</span>
                  </div>
                )}
                
                {generation.status === 'completed' && generation.audioUrl && (
                  <div className="space-y-4">
                    <div className="text-green-300 font-medium">✅ Generation complete!</div>
                    <audio controls className="w-full">
                      <source src={generation.audioUrl} type="audio/mpeg" />
                      Your browser does not support the audio element.
                    </audio>
                    <a 
                      href={generation.audioUrl} 
                      download 
                      className="inline-block px-6 py-2 bg-white text-purple-600 font-semibold rounded-lg hover:bg-white/90 transition-all"
                    >
                      Download MP3
                    </a>
                  </div>
                )}
                
                {generation.status === 'failed' && (
                  <div className="text-red-300">
                    ❌ Generation failed. Your credit has been refunded.
                  </div>
                )}
              </div>
            )}
          </div>
        </Show>
      </div>
    </div>
  )
}

export default Studio
