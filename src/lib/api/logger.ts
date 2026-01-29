/**
 * Structured logging utilities for API requests
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  method: string;
  path: string;
  status?: number;
  duration?: number;
  error?: string;
  clientId?: string;
  requestId?: string;
}

export type LogInput = Partial<LogEntry> & {
  level: LogLevel;
  method: string;
  path: string;
};

/**
 * Determine if a log level should be output based on configured minimum level
 */
function shouldLog(level: LogLevel): boolean {
  const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
  const minLevel = (import.meta.env.LOG_LEVEL as LogLevel) || 'info';
  return levels.indexOf(level) >= levels.indexOf(minLevel);
}

/**
 * Format a log entry into a string message
 */
function formatLogMessage(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    entry.level.toUpperCase().padEnd(5),
    entry.method,
    entry.path,
  ];

  if (entry.status) {
    parts.push(String(entry.status));
  }

  if (entry.duration !== undefined) {
    parts.push(`${entry.duration}ms`);
  }

  if (entry.requestId) {
    parts.push(`[${entry.requestId}]`);
  }

  if (entry.error) {
    parts.push(`- ${entry.error}`);
  }

  return parts.join(' ');
}

/**
 * Log a structured API request/response entry
 * @param entry - Log entry data
 */
export function log(entry: LogInput): void {
  if (!shouldLog(entry.level)) {
    return;
  }

  const logEntry: LogEntry = {
    timestamp: new Date().toISOString(),
    ...entry,
  };

  const message = formatLogMessage(logEntry);

  switch (entry.level) {
    case 'error':
      console.error(message);
      break;
    case 'warn':
      console.warn(message);
      break;
    case 'debug':
      console.debug(message);
      break;
    default:
      console.log(message);
  }
}

/**
 * Generate a unique request ID for tracing
 * @returns A unique request identifier
 */
export function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create a logger instance scoped to a specific request
 */
export function createRequestLogger(method: string, path: string, requestId?: string) {
  const id = requestId || generateRequestId();
  const startTime = Date.now();

  return {
    requestId: id,
    startTime,
    debug: (message: string) => log({ level: 'debug', method, path, requestId: id, error: message }),
    info: (status?: number) => log({ level: 'info', method, path, status, duration: Date.now() - startTime, requestId: id }),
    warn: (error: string) => log({ level: 'warn', method, path, error, requestId: id }),
    error: (error: string, status?: number) => log({ level: 'error', method, path, status, duration: Date.now() - startTime, error, requestId: id }),
  };
}
