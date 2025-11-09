// Log levels
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

// Log entry interface
interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, any>;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private formatMessage(
    level: LogLevel,
    message: string,
    context?: Record<string, any>
  ): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` | Context: ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private async persistLog(entry: LogEntry): Promise<void> {
    try {
      // In development, just log to console
      // In production, you could implement file logging or other persistence
      if (this.isDevelopment) {
        console.log('Log entry:', entry);
      } else {
        // For production, you could implement file-based logging
        // or send to external logging service
        console.log('Production log:', entry);
      }
    } catch (error) {
      console.error('Failed to persist log:', error);
      console.log('Original log entry:', entry);
    }
  }

  private createLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, any>,
    error?: Error
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    return entry;
  }

  error(message: string, context?: Record<string, any>, error?: Error): void {
    const entry = this.createLogEntry(LogLevel.ERROR, message, context, error);
    console.error(this.formatMessage(LogLevel.ERROR, message, context), error);
    this.persistLog(entry);
  }

  warn(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, context);
    console.warn(this.formatMessage(LogLevel.WARN, message, context));
    this.persistLog(entry);
  }

  info(message: string, context?: Record<string, any>): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, context);
    console.info(this.formatMessage(LogLevel.INFO, message, context));
    this.persistLog(entry);
  }

  debug(message: string, context?: Record<string, any>): void {
    if (!this.isDevelopment) return;

    const entry = this.createLogEntry(LogLevel.DEBUG, message, context);
    console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
  }

  // API request logging
  apiRequest({
    method,
    url,
    userId,
    sessionId,
    userAgent,
    ip,
    statusCode,
    duration,
    error,
  }: {
    method: string;
    url: string;
    userId?: string;
    sessionId?: string;
    userAgent?: string;
    ip?: string;
    statusCode: number;
    duration: number;
    error?: Error;
  }): void {
    const level = statusCode >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    const message = `${method} ${url} - ${statusCode} (${duration}ms)`;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      userId,
      sessionId,
      userAgent,
      ip,
      url,
      method,
      statusCode,
      duration,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    if (level === LogLevel.ERROR) {
      console.error(this.formatMessage(level, message), error);
    } else {
      console.info(this.formatMessage(level, message));
    }

    this.persistLog(entry);
  }

  // Performance monitoring
  performance(
    operation: string,
    duration: number,
    context?: Record<string, any>
  ): void {
    const level = duration > 5000 ? LogLevel.WARN : LogLevel.INFO;
    const message = `Performance: ${operation} took ${duration}ms`;

    const entry = this.createLogEntry(level, message, {
      ...context,
      duration,
      operation,
    });

    if (level === LogLevel.WARN) {
      console.warn(this.formatMessage(level, message, context));
    } else if (this.isDevelopment) {
      console.info(this.formatMessage(level, message, context));
    }

    this.persistLog(entry);
  }
}

// Export singleton instance
export const logger = new Logger();

// Utility function for timing operations
export function withTiming<T>(
  operation: string,
  fn: () => T | Promise<T>
): Promise<T> {
  return new Promise(async (resolve, reject) => {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      logger.performance(operation, duration);
      resolve(result);
    } catch (error) {
      const duration = Date.now() - start;
      logger.performance(operation, duration, { error: true });
      logger.error(
        `Operation failed: ${operation}`,
        { duration },
        error as Error
      );
      reject(error);
    }
  });
}

// Error boundary logger
export function logErrorBoundary(
  error: Error,
  errorInfo: { componentStack: string }
): void {
  logger.error(
    'React Error Boundary caught an error',
    {
      componentStack: errorInfo.componentStack,
    },
    error
  );
}
