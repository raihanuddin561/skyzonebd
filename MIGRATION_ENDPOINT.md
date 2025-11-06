# Migration Endpoint

Secure API endpoint to run database migrations on Vercel.

## Endpoint

**POST** `/api/migrate` - Run pending migrations  
**GET** `/api/migrate` - Check migration status

## Security

Requires `MIGRATION_SECRET_KEY` environment variable and Bearer token authentication.

## Usage

### Run Migrations

```bash
curl -X POST https://your-domain.vercel.app/api/migrate \
  -H "Authorization: Bearer your-migration-secret-key"
```

### Check Migration Status

```bash
curl https://your-domain.vercel.app/api/migrate \
  -H "Authorization: Bearer your-migration-secret-key"
```

## Setup in Vercel

1. Go to your project settings on Vercel
2. Navigate to Environment Variables
3. Add: `MIGRATION_SECRET_KEY` with a secure random value
4. After deployment, call the endpoint to apply migrations

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Database migrations applied successfully",
  "output": "Migration output..."
}
```

### Error Response
```json
{
  "success": false,
  "error": "Migration failed",
  "details": "Error details..."
}
```

## Security Notes

⚠️ **Important:**
- Keep `MIGRATION_SECRET_KEY` secret and secure
- Only call this endpoint from secure environments
- Consider removing this endpoint after initial deployment
- For production, use Vercel CLI: `vercel env pull && npx prisma migrate deploy`
