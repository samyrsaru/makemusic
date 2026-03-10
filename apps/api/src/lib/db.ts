import Database, { type Database as DatabaseType } from 'better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dbPath = path.join(__dirname, '../../dev.db')

const db: DatabaseType = new Database(dbPath)

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    clerkUserId TEXT PRIMARY KEY,
    credits INTEGER DEFAULT 0,
    polarSubscriptionId TEXT,
    status TEXT,
    currentPeriodStart TEXT,
    currentPeriodEnd TEXT,
    cancelAtPeriodEnd INTEGER DEFAULT 0,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS generations (
    id TEXT PRIMARY KEY,
    clerkUserId TEXT,
    lyrics TEXT,
    prompt TEXT,
    replicateId TEXT,
    status TEXT DEFAULT 'pending',
    audioUrl TEXT,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
    completedAt TEXT,
    FOREIGN KEY (clerkUserId) REFERENCES users(clerkUserId)
  )
`)

export default db
