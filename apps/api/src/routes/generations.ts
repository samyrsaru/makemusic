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

  try {
    const generationId = crypto.randomUUID()
    
    const output = await replicate.run("minimax/music-01", {
      input: {
        lyrics: lyrics,
        prompt: prompt || 'pop music'
      }
    }) as any

    const audioUrl = output.url()

    db.prepare(`
      INSERT INTO generations (id, clerkUserId, lyrics, prompt, replicateId, status, audioUrl, completedAt)
      VALUES (?, ?, ?, ?, ?, 'completed', ?, datetime('now'))
    `).run(generationId, auth.userId, lyrics, prompt, 'sync', audioUrl)

    return c.json({
      success: true,
      generationId,
      status: 'completed',
      audioUrl,
      creditsRemaining: user.credits - 1
    })
  } catch (error: any) {
    console.error('Generation error:', error.message)
    db.prepare('UPDATE users SET credits = credits + 1 WHERE clerkUserId = ?')
      .run(auth.userId)
    return c.json({ error: 'Generation failed', details: error.message }, 500)
  }
})

// Get generation status
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

// List user's generations
app.get('/', (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const generations = db.prepare(`
    SELECT * FROM generations 
    WHERE clerkUserId = ? 
    ORDER BY createdAt DESC
  `).all(auth.userId) as any[]

  return c.json({ generations })
})

export default app
