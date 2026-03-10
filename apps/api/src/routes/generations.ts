import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import Replicate from 'replicate'
import db from '../lib/db.js'

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN!,
})

const app = new Hono()

// Generate music
app.post('/generate', async (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const { lyrics, prompt } = await c.req.json()
  
  if (!lyrics?.trim()) {
    return c.json({ error: 'Lyrics required' }, 400)
  }

  const user = db.prepare('SELECT credits FROM users WHERE clerkUserId = ?')
    .get(auth.userId) as any

  if (!user || user.credits < 1) {
    return c.json({ error: 'Insufficient credits' }, 402)
  }

  db.prepare('UPDATE users SET credits = credits - 1 WHERE clerkUserId = ?')
    .run(auth.userId)

  console.log(`🎵 [START] Generation started for user: ${auth.userId.substring(0, 8)}...`)
  console.log(`   Lyrics: ${lyrics.substring(0, 50)}...`)
  console.log(`   Prompt: ${prompt || 'pop music'}`)

  try {
    const generationId = crypto.randomUUID()
    const input = {
      lyrics: lyrics,
      prompt: prompt || 'pop music'
    }
    
    const output = await replicate.run("minimax/music-1.5", { input }) as any

    console.log(`📤 [RAW OUTPUT] Replicate returned:`, typeof output, JSON.stringify(output, null, 2))

    // Handle different output formats
    let audioUrl: string | null = null
    
    if (typeof output === 'string') {
      audioUrl = output
    } else if (Array.isArray(output) && output.length > 0) {
      audioUrl = String(output[0])
    } else if (output && typeof output === 'object') {
      if (output.url) {
        audioUrl = typeof output.url === 'function' ? output.url() : String(output.url)
      } else if (output.output) {
        if (Array.isArray(output.output) && output.output.length > 0) {
          audioUrl = String(output.output[0])
        } else {
          audioUrl = String(output.output)
        }
      } else if (output.audio) {
        audioUrl = String(output.audio)
      } else {
        // Try to find any URL-like string in the object
        const values = Object.values(output)
        const urlValue = values.find(v => typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://')))
        if (urlValue) audioUrl = urlValue as string
      }
    }

    // Ensure audioUrl is a string
    if (audioUrl && typeof audioUrl !== 'string') {
      audioUrl = String(audioUrl)
    }

    if (!audioUrl || typeof audioUrl !== 'string') {
      console.error(`❌ [FAILED] No audio URL found in output:`, output)
      throw new Error('No audio URL in response')
    }

    console.log(`✅ [SUCCESS] Generation completed! URL: ${audioUrl.substring(0, 60)}...`)

    // Store generation in database
    db.prepare(`
      INSERT INTO generations (id, clerkUserId, lyrics, prompt, audioUrl, createdAt)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(generationId, auth.userId, lyrics, prompt || 'pop music', audioUrl)

    console.log(`💾 [SAVED] Generation stored with ID: ${generationId}`)

    return c.json({
      success: true,
      generationId,
      status: 'completed',
      audioUrl,
      creditsRemaining: user.credits - 1
    })
  } catch (error: any) {
    console.error(`❌ [FAILED] Generation error:`, error.message)
    db.prepare('UPDATE users SET credits = credits + 1 WHERE clerkUserId = ?')
      .run(auth.userId)
    return c.json({ error: 'Generation failed', details: error.message }, 500)
  }
})

// List user's generations (MUST come before /:id route!)
app.get('/', (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const generations = db.prepare(`
    SELECT id, lyrics, prompt, audioUrl, createdAt 
    FROM generations 
    WHERE clerkUserId = ? 
    ORDER BY createdAt DESC
  `).all(auth.userId) as any[]

  console.log(`📚 [LIBRARY] Returning ${generations.length} generations for user: ${auth.userId.substring(0, 8)}...`)

  return c.json({ generations })
})

// Get generation by ID
app.get('/:id', (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const id = c.req.param('id')
  const generation = db.prepare(`
    SELECT * FROM generations WHERE id = ? AND clerkUserId = ?
  `).get(id, auth.userId) as any

  if (!generation) {
    return c.json({ error: 'Generation not found' }, 404)
  }

  return c.json(generation)
})

export default app
