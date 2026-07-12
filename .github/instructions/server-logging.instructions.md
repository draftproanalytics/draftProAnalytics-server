---
applyTo: "src/**/*.ts"
---

# DraftProAnalytics Server Logging Instructions

## Logger Overview

Use the global logging service at `src/utils/Logger.ts` for all observability. This replaces all `console.log`, `console.debug`, `console.warn`, and `console.error` calls.

## Logger API

### Import
```typescript
import { createLogger } from '@/utils/Logger';
```

### Usage

Create a module-specific logger with a descriptive prefix:
```typescript
const logger = createLogger('ModuleName');

logger.debug('Detailed diagnostic info');
logger.info('General informational message');
logger.warn('Warning condition');
logger.error('Error or failure message');
```

### Log Levels

- **debug**: Detailed diagnostic information (env var `LOG_LEVEL=debug`). Use for:
  - Variable state snapshots
  - Loop iterations during development
  - Internal workflow checkpoints
  - Disabled by default in production

- **info**: Informational messages for normal operation. Use for:
  - Workflow start/completion (e.g., `info('Beginning draft import...')`)
  - Successful outcomes (e.g., `info('Imported 150 draft picks')`)
  - State transitions
  - Background job start/end

- **warn**: Warning conditions that don't stop execution. Use for:
  - Recoverable errors (e.g., missing optional field, retry attempt)
  - Deprecated API usage
  - Unexpected but handled conditions (e.g., `warn('Prospect not found in ESPN; skipping')`)
  - Performance degradation

- **error**: Error or failure messages. Use for:
  - Caught exceptions
  - Failed operations (e.g., database write, external API call)
  - Validation failures
  - Unrecoverable conditions

## Configuration

Logging is controlled by environment variables:

| Variable | Default | Example |
|----------|---------|---------|
| `ENABLE_DEBUG` | `false` | `ENABLE_DEBUG=true` enables all levels |
| `LOG_LEVEL` | `'debug'` | `LOG_LEVEL=info` \| `warn` \| `error` |

Timestamp and level are automatically added to all messages.

## Conventions

### Module Logger Creation

Create a module-specific logger near the top of each file or in infrastructure setup:
```typescript
// src/modules/draftPicks/application/useCases/ImportDraftPicksUseCase.ts
const logger = createLogger('ImportDraftPicksUseCase');

export class ImportDraftPicksUseCase {
  async execute(input: ImportPicksInput): Promise<Result> {
    logger.info(`Starting import for season ${input.season}`);
    // ...
  }
}
```

### Naming Conventions for Logger Prefixes

Use PascalCase class or feature names:
- `CreateLogger('ImportDraftPicksUseCase')`
- `CreateLogger('DraftEventRepository')`
- `CreateLogger('EmailService')`
- `CreateLogger('ProspectSyncJob')`

### Logging at Boundaries

Log at key architectural boundaries:

1. **Use Case Entry/Exit**
   ```typescript
   logger.info(`Starting ${this.constructor.name}.execute()`);
   logger.info(`Completed ${this.constructor.name}`);
   ```

2. **Repository Operations**
   ```typescript
   logger.debug(`Fetching draft picks for season ${seasonId}`);
   logger.info(`Found ${picks.length} draft picks`);
   ```

3. **External API Calls**
   ```typescript
   logger.info('Requesting ESPN draft data...');
   logger.info(`Received ${data.picks.length} picks from ESPN`);
   logger.error(`ESPN API failed: ${error.message}`);
   ```

4. **Job/Background Task Progress**
   ```typescript
   logger.info('Background job started');
   logger.info(`Processed ${current} of ${total} records`);
   logger.info('Background job completed successfully');
   ```

5. **Error Context**
   ```typescript
   logger.error(`Failed to import pick: ${error.message}`, { pickId: pick.id, error });
   ```

### What NOT to Log

- ❌ Passwords, tokens, or sensitive credentials
- ❌ Full request/response bodies (log a summary or key fields instead)
- ❌ Personally identifiable information (PII) unless required for support
- ❌ Verbose repetitive data (e.g., every loop iteration without context)

### Migration Path

Replace all existing console calls:
- `console.log()` → `logger.info()`
- `console.debug()` → `logger.debug()`
- `console.warn()` → `logger.warn()`
- `console.error()` → `logger.error()`

Avoid:
```typescript
// ❌ Do not use console directly
console.log('User ID:', userId);
console.error('Failed:', error);

// ✅ Use the logger
logger.info(`User ID: ${userId}`);
logger.error(`Failed: ${error.message}`);
```

## Examples

### Use Case Layer
```typescript
import { createLogger } from '@/utils/Logger';

const logger = createLogger('SeedDraftPicksUseCase');

export class SeedDraftPicksUseCase {
  constructor(private pickRepository: PickRepository) {}

  async execute(input: SeedInput): Promise<void> {
    logger.info(`Seeding ${input.picks.length} draft picks for season ${input.season}`);
    
    try {
      await this.pickRepository.insertMany(input.picks);
      logger.info(`Successfully seeded ${input.picks.length} picks`);
    } catch (error) {
      logger.error(`Failed to seed picks: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}
```

### Repository Layer
```typescript
const logger = createLogger('DraftPickRepository');

async findByTeam(teamId: string): Promise<DraftPick[]> {
  logger.debug(`Fetching picks for team ${teamId}`);
  const picks = await prisma.draftPick.findMany({ where: { teamId } });
  logger.info(`Found ${picks.length} picks for team ${teamId}`);
  return picks;
}
```

### External API Integration
```typescript
const logger = createLogger('ESPNScraper');

async fetchProspects(): Promise<Prospect[]> {
  logger.info('Fetching prospects from ESPN...');
  try {
    const response = await axios.get('/prospects');
    logger.info(`Fetched ${response.data.length} prospects`);
    return response.data;
  } catch (error) {
    logger.error(`ESPN API error: ${error instanceof Error ? error.message : 'Unknown'}`);
    throw error;
  }
}
```

### Background Job/Batch Processing
```typescript
const logger = createLogger('TeamSyncJob');

async execute(): Promise<void> {
  logger.info('Team sync job started');
  
  const teams = await this.teamRepository.findAll();
  logger.info(`Syncing ${teams.length} teams`);
  
  let synced = 0;
  let failed = 0;
  
  for (const team of teams) {
    try {
      await this.syncTeam(team);
      synced++;
      if (synced % 10 === 0) logger.debug(`Synced ${synced} teams so far`);
    } catch (error) {
      failed++;
      logger.warn(`Failed to sync team ${team.id}: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
  }
  
  logger.info(`Team sync completed: ${synced} synced, ${failed} failed`);
}
```
