# Agent Instructions

## Project Structure

### Development Environment
- **Location**: `~/dev/apps/music/`
- **Database**: `apps/api/dev.db` (development)
- **Purpose**: Active development, testing changes

### Production Environment
- **Location**: `/opt/myapps/music/`
- **Database**: `main.db` (production)
- **Purpose**: Live production deployment
- **Access**: Read-only unless explicitly asked to modify

## Conventions

### Database Operations
- **Default**: Work on development database (`dev.db`)
- **Production changes**: Only when explicitly requested with "in prod" or "production"
- **Always confirm**: Before modifying production data

### Deployment Workflow
1. Changes are made in `~/dev/apps/music/`
2. Committed and pushed to git
3. Deployed to `/opt/myapps/music/` via deploy script

### Adding Lifetime Credits

**Development:**
```bash
sqlite3 apps/api/dev.db "UPDATE users SET lifetime_credits = lifetime_credits + 50 WHERE clerkUserId = 'USER_ID'"
```

**Production:**
```bash
# From /opt/myapps/music/
sqlite3 main.db "UPDATE users SET lifetime_credits = lifetime_credits + 50 WHERE clerkUserId = 'USER_ID'"
```

Or use the admin API:
```bash
curl -X POST https://your-domain.com/api/subscription/add-lifetime-credits \
  -H "Content-Type: application/json" \
  -H "x-admin-key: $ADMIN_API_KEY" \
  -d '{"clerkUserId": "USER_ID", "credits": 50}'
```

## Key Files
- `apps/api/src/lib/db.ts` - Database schema & migrations
- `apps/api/.env.production` - Production secrets (never commit)
- `/opt/myapps/music/.env` - Production environment variables
