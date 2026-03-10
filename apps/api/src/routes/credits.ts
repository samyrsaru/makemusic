import { Hono } from 'hono'
import { getAuth } from '@hono/clerk-auth'
import db from '../lib/db.js'

const app = new Hono()

// Simulate using credits
app.post('/use', (c) => {
  const auth = getAuth(c)
  if (!auth?.userId) return c.json({ error: 'Unauthorized' }, 401)

  const { amount = '1' } = c.req.query()
  const creditsToUse = parseInt(amount, 10)
  
  const user = db.prepare('SELECT credits FROM users WHERE clerkUserId = ?')
    .get(auth.userId) as any

  if (!user || user.credits < creditsToUse) {
    return c.json({ error: 'Insufficient credits' }, 400)
  }

  db.prepare('UPDATE users SET credits = credits - ? WHERE clerkUserId = ?')
    .run(creditsToUse, auth.userId)

  return c.json({ 
    success: true, 
    remaining: user.credits - creditsToUse 
  })
})

export default app
