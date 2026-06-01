---
applyTo: "src/**/*.ts"
---

# DraftProAnalytics Server Environment Management Instructions

## Environment File Structure

Use environment-specific `.env` files to manage configuration across different deployment environments:

```
.env.development    # Local development
.env.stage          # Staging/testing environment
.env.production     # Production environment
.env.example        # Template (committed to git)
.env                # Base configuration (may be committed if safe)
```

## Environment Loading with dotenv

The server uses `dotenv` to load environment variables. Variables are loaded in this order:

1. `.env` (base configuration)
2. `.env.local` (local overrides, never committed)
3. `.env.[NODE_ENV]` (environment-specific, e.g., `.env.development`)

## Variable Naming Conventions

### Server Variables (No prefix required)

Unlike the client, server variables are not prefixed. All `process.env` variables are available:

```bash
# ✅ All of these work
NODE_ENV=development
PORT=5000
DATABASE_URL=mysql://user:pass@localhost:3306/db
JWT_SECRET=your-secret-key
ENABLE_DEBUG=true
LOG_LEVEL=info
```

### Environment-Specific Examples

**Development (.env.development):**
```bash
NODE_ENV=development
APP_ENV=development

# Server
PORT=5000
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173

# Database
DATABASE_URL="mysql://dpaQaUser01:Password2@25!@localhost:3306/MyNFL"

# Authentication
JWT_ACCESS_SECRET=dev-access-secret-key
JWT_REFRESH_SECRET=dev-refresh-secret-key
JWT_REFRESH_MINUTES=43200

# Email (use test services)
MAIL_PROVIDER=mailersend
MAILERSEND_API_KEY=your-dev-api-key
DEFAULT_FROM=noreply@draftproanalytics.com

# External APIs
CFBD_API_KEY=your-dev-api-key
ESPN_OFFLINE=0
ESPN_FALLBACK=1

# Logging
ENABLE_DEBUG=true
LOG_LEVEL=debug
ENABLE_SSE_LOGS=true

# Application
NFL_SEASON=2025
TEAM=kc
FIXTURE_DATE=2025-08-10
```

**Staging (.env.stage):**
```bash
NODE_ENV=production
APP_ENV=staging

# Server
PORT=5000
CORS_ALLOWED_ORIGINS=https://app-stage.draftproanalytics.com

# Database
DATABASE_URL="mysql://user:pass@staging-db:3306/db"

# Authentication
JWT_ACCESS_SECRET=staging-access-secret-key
JWT_REFRESH_SECRET=staging-refresh-secret-key
JWT_REFRESH_MINUTES=43200

# Email
MAIL_PROVIDER=mailersend
MAILERSEND_API_KEY=your-staging-api-key
DEFAULT_FROM=noreply@draftproanalytics.com

# External APIs
CFBD_API_KEY=your-staging-api-key
ESPN_OFFLINE=0
ESPN_FALLBACK=0

# Logging
ENABLE_DEBUG=false
LOG_LEVEL=warn
ENABLE_SSE_LOGS=false

# Application
NFL_SEASON=2025
TEAM=kc
FIXTURE_DATE=2025-08-10
```

**Production (.env.production):**
```bash
NODE_ENV=production
APP_ENV=production

# Server
PORT=5000
CORS_ALLOWED_ORIGINS=https://app.draftproanalytics.com

# Database
DATABASE_URL="mysql://user:pass@prod-db:3306/db"

# Authentication
JWT_ACCESS_SECRET=prod-access-secret-key
JWT_REFRESH_SECRET=prod-refresh-secret-key
JWT_REFRESH_MINUTES=43200

# Email
MAIL_PROVIDER=mailersend
MAILERSEND_API_KEY=your-prod-api-key
DEFAULT_FROM=noreply@draftproanalytics.com

# External APIs
CFBD_API_KEY=your-prod-api-key
ESPN_OFFLINE=0
ESPN_FALLBACK=0

# Logging
ENABLE_DEBUG=false
LOG_LEVEL=error
ENABLE_SSE_LOGS=false

# Application
NFL_SEASON=2025
TEAM=kc
FIXTURE_DATE=2025-08-10
```

## Accessing Environment Variables

### In Application Code
```typescript
import { createLogger } from '@/utils/Logger';

const logger = createLogger('AppConfig');

// Access via process.env
const port = process.env.PORT || 5000;
const nodeEnv = process.env.NODE_ENV || 'development';
const databaseUrl = process.env.DATABASE_URL;

logger.info('Server starting', { port, nodeEnv });
```

### In Configuration Objects
```typescript
// src/config/database.ts
export const databaseConfig = {
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
};

// src/config/auth.ts
export const authConfig = {
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
  jwtRefreshMinutes: parseInt(process.env.JWT_REFRESH_MINUTES || '43200'),
};
```

### In Services
```typescript
import { createLogger } from '@/utils/Logger';

const logger = createLogger('EmailService');

export class EmailService {
  private provider = process.env.MAIL_PROVIDER || 'mailersend';
  private apiKey = process.env.MAILERSEND_API_KEY;

  async sendEmail(to: string, subject: string, body: string) {
    if (!this.apiKey) {
      logger.error('Missing email API key');
      throw new Error('Email service not configured');
    }

    logger.info('Sending email', { to, provider: this.provider });
    // ... implementation
  }
}
```

## Environment Variable Types

### String Variables
```typescript
const apiKey = process.env.CFBD_API_KEY; // string | undefined
const baseUrl = process.env.CFBD_BASE_URL || 'https://api.collegefootballdata.com';
```

### Number Variables
```typescript
const port = parseInt(process.env.PORT || '5000');
const refreshMinutes = parseInt(process.env.JWT_REFRESH_MINUTES || '43200');
const connectionLimit = parseInt(process.env.DB_CONNECTION_LIMIT || '10');
```

### Boolean Variables
```typescript
const enableDebug = process.env.ENABLE_DEBUG === 'true';
const enableSseLogs = process.env.ENABLE_SSE_LOGS === 'true';
const offlineMode = process.env.ESPN_OFFLINE === '1';
```

## Security Considerations

### Never Commit Secrets
```bash
# ❌ Never commit these to git
JWT_ACCESS_SECRET=sk_live_...
DATABASE_URL=mysql://user:secret@...
MAILERSEND_API_KEY=secret-key
GOOGLE_CLIENT_SECRET=secret

# ✅ Instead, use placeholders in .env.example
JWT_ACCESS_SECRET=your_jwt_access_secret_here
DATABASE_URL=mysql://user:password@host:port/database
MAILERSEND_API_KEY=your_mailersend_api_key_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

### Environment Variable Validation
```typescript
// src/config/validate.ts
export const validateEnvironment = () => {
  const requiredVars = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'MAILERSEND_API_KEY',
  ];

  const missing = requiredVars.filter(varName => !process.env[varName]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate formats
  if (!process.env.DATABASE_URL?.startsWith('mysql://')) {
    throw new Error('DATABASE_URL must be a valid MySQL connection string');
  }

  if (parseInt(process.env.JWT_REFRESH_MINUTES || '0') < 60) {
    throw new Error('JWT_REFRESH_MINUTES must be at least 60 minutes');
  }
};
```

## Common Environment Variables

### Server Configuration
```bash
NODE_ENV=development|production
APP_ENV=development|staging|production
PORT=5000
CORS_ALLOWED_ORIGINS=http://localhost:5173,https://app.com
```

### Database
```bash
DATABASE_URL=mysql://user:pass@host:port/database
DB_CONNECTION_LIMIT=10
DB_SSL=true
```

### Authentication & Security
```bash
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_MINUTES=43200
SECURE_TOKEN_SECRET=your-secure-token-secret
```

### Email Configuration
```bash
MAIL_PROVIDER=mailersend|resend|sendgrid
MAILERSEND_API_KEY=your-api-key
RESEND_API_KEY=your-api-key
SENDGRID_API_KEY=your-api-key
DEFAULT_FROM=noreply@domain.com
```

### External APIs
```bash
CFBD_API_KEY=your-college-football-data-key
CFBD_BASE_URL=https://api.collegefootballdata.com
ESPN_CFB_BASE_URL=https://site.api.espn.com/apis/site/v2/sports/football/college-football
CFB_INJURY_BASE_URL=https://www.cfbdepth.com
```

### Logging & Debugging
```bash
ENABLE_DEBUG=true|false
LOG_LEVEL=debug|info|warn|error
ENABLE_SSE_LOGS=true|false
```

### Application Settings
```bash
NFL_SEASON=2025
TEAM=kc
ESPN_OFFLINE=0|1
ESPN_FALLBACK=0|1
FIXTURE_DATE=2025-08-10
FRONTEND_URL=http://localhost:5173
```

## Development Workflow

### Setting Up Local Environment
```bash
# 1. Copy the example file
cp .env.example .env.development

# 2. Edit with your local settings
# DATABASE_URL=mysql://user:pass@localhost:3306/db
# JWT_ACCESS_SECRET=dev-secret-key

# 3. Start development server
npm run dev
```

### Switching Environments
```bash
# Development
NODE_ENV=development npm start

# Staging
NODE_ENV=staging npm start

# Production
NODE_ENV=production npm start
```

### Local Overrides
```bash
# Create .env.local for personal overrides (never committed)
echo "ENABLE_DEBUG=true" > .env.local
echo "LOG_LEVEL=debug" >> .env.local
```

## Application Bootstrap

### Loading Environment Variables
```typescript
// src/index.ts or src/app.ts
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

// Validate environment after loading
import { validateEnvironment } from './config/validate';
validateEnvironment();

const logger = createLogger('App');
logger.info('Environment loaded', {
  nodeEnv: process.env.NODE_ENV,
  appEnv: process.env.APP_ENV,
  port: process.env.PORT,
});
```

## Testing Environment Variables

### Unit Tests
```typescript
import { describe, it, expect, vi } from 'vitest';

// Mock process.env
const originalEnv = process.env;
vi.stubGlobal('process', {
  ...originalEnv,
  env: {
    ...originalEnv,
    NODE_ENV: 'test',
    DATABASE_URL: 'mysql://test:test@localhost:3306/test',
    JWT_ACCESS_SECRET: 'test-secret',
  },
});

describe('Database Config', () => {
  it('uses test database URL', () => {
    const config = getDatabaseConfig();
    expect(config.url).toBe('mysql://test:test@localhost:3306/test');
  });
});
```

### Integration Tests
```typescript
// Use test-specific .env file
process.env.NODE_ENV = 'test';
dotenv.config({ path: '.env.test' });

// Run tests with test configuration
```

## Troubleshooting

### Variable Not Available
- Check if `.env` file exists in correct location
- Verify `dotenv.config()` is called before accessing variables
- Check NODE_ENV value for environment-specific files
- Restart server after adding new variables

### Wrong Environment Loaded
- Verify NODE_ENV setting
- Check file loading order
- Use `.env.local` for local overrides
- Ensure dotenv is configured correctly

### Runtime Issues
- Environment variables are loaded at startup
- Cannot change variables without restarting server
- Use database/config for dynamic configuration

## Migration from Hardcoded Values

Replace hardcoded values with environment variables:

```typescript
// ❌ Before
const PORT = 5000;
const JWT_SECRET = 'hardcoded-secret';
const DB_URL = 'mysql://localhost:3306/db';

// ✅ After
const PORT = parseInt(process.env.PORT || '5000');
const JWT_SECRET = process.env.JWT_ACCESS_SECRET;
const DB_URL = process.env.DATABASE_URL;
```
