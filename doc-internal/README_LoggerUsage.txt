/* *********************************************************************
Key Features

Environment Control: Toggle logging with DEBUG environment variable
Log Levels: Filter logs by severity (debug, info, warn, error)
Timestamps: Automatic ISO timestamp on every log
Prefixes: Create module-specific loggers with prefixes
Type Safety: Full TypeScript support
Zero Dependencies: Pure TypeScript implementation
SOLID Principles: Single responsibility, easy to extend
Production Ready: Disable all logs by setting DEBUG=false

This gives you complete control over logging across your entire application while maintaining clean, maintainable code.Here:
export const createLogger = (prefix?: string): Logger => { const config: LoggerConfig = { enabled: process.env.DEBUG === 'true', level: (process.env.LOG_LEVEL as LogLevel) || 'debug', prefix, }; return new Logger(config); };
I want to get the debug status (true/false) from then env property file by reading process.env.debug not setting it but that looks like what is happening - am I reading that wrong?5:26 PMYou're reading it correctly! The code is reading from process.env.DEBUG, not setting it. Let me clarify what's happening:
typescriptexport const createLogger = (prefix?: string): Logger => {
  const config: LoggerConfig = {
    // This READS the DEBUG value from your .env file
    // and compares it to the string 'true'
    enabled: process.env.DEBUG === 'true',
    level: (process.env.LOG_LEVEL as LogLevel) || 'debug',
    prefix,
  };

  return new Logger(config);
};
Breaking it down:

process.env.DEBUG - reads the DEBUG variable from your environment
=== 'true' - compares it to the string 'true' (returns boolean)
enabled: ... - assigns that boolean to the config property

So when you have this in your .env:
ENABLE_DEBUG=true
The code does this:

Reads process.env.DEBUG → gets the string "true"
Evaluates "true" === 'true' → returns true
Sets config.enabled = true

Important Note: Environment variables are always strings, so DEBUG=true in your .env becomes the string "true", not a boolean. That's why we compare with === 'true'.
If you wanted to be more flexible and accept different truthy values, you could use:
typescriptexport const createLogger = (prefix?: string): Logger => {
  const config: LoggerConfig = {
    enabled: process.env.DEBUG?.toLowerCase() === 'true' || 
             process.env.DEBUG === '1',
    level: (process.env.LOG_LEVEL as LogLevel) || 'debug',
    prefix,
  };

  return new Logger(config);
};
This would accept DEBUG=true, DEBUG=TRUE, or DEBUG=1 as enabled.
Does that clear it up?Claude is AI and can make mistakes. Please 
double-check responses. Sonnet 4.5
*************************************************************************/

import { logger } from '@/utils/Logger';

//*********************************************************************
// [Basic Usage]
// Simple logging
//*********************************************************************
logger.debug('User action initiated');
logger.info('Data fetched successfully');
logger.warn('Deprecated method used');
logger.error('Failed to save data');

// With additional data
logger.info('User logged in', { userId: 123, timestamp: Date.now() });
logger.error('API call failed', { endpoint: '/api/teams', error });

//*********************************************************************
// [Module-Specific Loggers]
//*********************************************************************
import { createLogger } from '@/utils/Logger';

// In a service file
const logger = createLogger('TeamService');

export class TeamService {
  async getTeams() {
    logger.debug('Fetching teams from database');
    // ... implementation
    logger.info('Successfully retrieved teams', { count: teams.length });
  }
}

//*********************************************************************
// [In Vue Components]
//*********************************************************************
<script setup lang="ts">
import { createLogger } from '@/utils/Logger';

const logger = createLogger('DashboardComponent');

const fetchData = async () => {
  logger.debug('Starting data fetch');
  try {
    const response = await api.getData();
    logger.info('Data fetched successfully', response);
  } catch (error) {
    logger.error('Failed to fetch data', error);
  }
};
</script>

//*********************************************************************
// [In Express Routes]
//*********************************************************************
import { createLogger } from '../utils/Logger';

const logger = createLogger('TeamRoutes');

router.get('/teams', async (req, res) => {
  logger.debug('GET /teams endpoint called');
  try {
    const teams = await teamService.getAll();
    logger.info('Teams retrieved successfully', { count: teams.length });
    res.json(teams);
  } catch (error) {
    logger.error('Error retrieving teams', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});