import { Polar } from '@polar-sh/sdk'
import db from './db.js'

const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
  server: (process.env.POLAR_ENV as 'sandbox' | 'production') || 'sandbox',
})

export async function syncAllSubscriptions() {
  console.log('🔄 Syncing subscriptions on startup...')
  
  try {
    // Get all subscriptions from Polar
    const subsResult = await polar.subscriptions.list({})
    
    let syncedCount = 0
    
    for await (const subscription of subsResult as any) {
      const clerkUserId = subscription.metadata?.clerkUserId
      
      if (!clerkUserId) {
        console.log(`  ⚠️  Subscription ${subscription.id} has no clerkUserId in metadata`)
        continue
      }
      
      // Only sync active subscriptions
      if (subscription.status !== 'active') {
        continue
      }
      
      // Check if user exists in our DB
      const existingUser = db.prepare('SELECT * FROM users WHERE clerkUserId = ?')
        .get(clerkUserId) as any
      
      // If user doesn't exist or subscription changed, sync it
      if (!existingUser || existingUser.polarSubscriptionId !== subscription.id) {
        db.prepare(`
          INSERT INTO users (clerkUserId, credits, polarSubscriptionId, status, currentPeriodStart, currentPeriodEnd)
          VALUES (?, 100, ?, ?, ?, ?)
          ON CONFLICT(clerkUserId) DO UPDATE SET
            credits = COALESCE(users.credits, 100),
            polarSubscriptionId = excluded.polarSubscriptionId,
            status = excluded.status,
            currentPeriodStart = excluded.currentPeriodStart,
            currentPeriodEnd = excluded.currentPeriodEnd
        `).run(
          clerkUserId,
          subscription.id,
          subscription.status,
          subscription.currentPeriodStart,
          subscription.currentPeriodEnd
        )
        
        console.log(`  ✅ Synced subscription for user: ${clerkUserId}`)
        syncedCount++
      }
    }
    
    console.log(`🎉 Synced ${syncedCount} subscriptions`)
  } catch (error: any) {
    console.error('❌ Failed to sync subscriptions:', error.message)
  }
}
