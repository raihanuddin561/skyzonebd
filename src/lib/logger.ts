// lib/logger.ts - Production-ready logging utility
// Replaces console.log with proper logging that can be controlled by environment

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogOptions {
  context?: string;
  metadata?: Record<string, any>;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: string;
  metadata?: Record<string, any>;
  userId?: string;
  requestId?: string;
}

class Logger {
  private isProduction = process.env.NODE_ENV === 'production';
  private isDevelopment = process.env.NODE_ENV === 'development';
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory

  /**
   * Debug level logging - only in development
   */
  debug(message: string, options?: LogOptions) {
    if (this.isDevelopment) {
      this.log('debug', message, options);
    }
  }

  /**
   * Info level logging
   */
  info(message: string, options?: LogOptions) {
    this.log('info', message, options);
  }

  /**
   * Warning level logging
   */
  warn(message: string, options?: LogOptions) {
    this.log('warn', message, options);
  }

  /**
   * Error level logging - always logged
   */
  error(message: string, error?: Error | unknown, options?: LogOptions) {
    const metadata = {
      ...options?.metadata,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : error
    };

    this.log('error', message, { ...options, metadata });

    // In production, you might want to send errors to a service like Sentry
    // if (this.isProduction) {
    //   // Send to error tracking service
    // }
  }

  /**
   * Internal logging method
   */
  private log(level: LogLevel, message: string, options?: LogOptions) {
    const timestamp = new Date().toISOString();
    const context = options?.context ? `[${options.context}]` : '';
    const prefix = `${timestamp} ${level.toUpperCase()} ${context}`;

    const logMessage = `${prefix} ${message}`;

    // Store log entry
    const entry: LogEntry = {
      timestamp,
      level,
      message,
      context: options?.context,
      metadata: options?.metadata,
    };

    this.logs.push(entry);
    
    // Keep only last maxLogs entries
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    switch (level) {
      case 'debug':
        console.log(logMessage, options?.metadata || '');
        break;
      case 'info':
        console.info(logMessage, options?.metadata || '');
        break;
      case 'warn':
        console.warn(logMessage, options?.metadata || '');
        break;
      case 'error':
        console.error(logMessage, options?.metadata || '');
        break;
    }
  }

  /**
   * Log API request
   */
  logRequest(method: string, url: string, status: number, duration?: number) {
    this.info(`${method} ${url} - ${status}`, {
      context: 'API',
      metadata: { method, url, status, duration }
    });
  }

  /**
   * Log database query (development only)
   */
  logQuery(query: string, duration?: number) {
    if (this.isDevelopment) {
      this.debug(`Query executed`, {
        context: 'Database',
        metadata: { query, duration }
      });
    }
  }

  /**
   * Log authentication attempt
   */
  logAuth(userId: string, success: boolean, method: string) {
    const level = success ? 'info' : 'warn';
    const message = success ? 'Authentication successful' : 'Authentication failed';
    
    this[level](message, {
      context: 'Auth',
      metadata: { userId, method }
    });
  }

  /**
   * Log security event
   */
  logSecurity(event: string, severity: 'low' | 'medium' | 'high', metadata?: Record<string, any>) {
    const level = severity === 'high' ? 'error' : severity === 'medium' ? 'warn' : 'info';
    
    this[level](`Security event: ${event}`, {
      context: 'Security',
      metadata: { ...metadata, severity }
    });
  }

  /**
   * Log business event
   */
  logBusiness(event: string, metadata?: Record<string, any>) {
    this.info(event, {
      context: 'Business',
      metadata
    });
  }

  /**
   * Get recent logs (for debugging)
   */
  getRecentLogs(count: number = 100): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * Clear logs
   */
  clearLogs() {
    this.logs = [];
  }
}

// Export singleton instance
export const logger = new Logger();

// Utility functions for common use cases
export const logError = (message: string, error: Error | unknown, context?: string) => {
  logger.error(message, error, { context });
};

export const logInfo = (message: string, context?: string) => {
  logger.info(message, { context });
};

export const logWarning = (message: string, context?: string) => {
  logger.warn(message, { context });
};

export const logDebug = (message: string, metadata?: Record<string, any>, context?: string) => {
  logger.debug(message, { context, metadata });
};

export const logAuth = (userId: string, success: boolean, method: string) => {
  logger.logAuth(userId, success, method);
};

export const logSecurity = (event: string, severity: 'low' | 'medium' | 'high', metadata?: Record<string, any>) => {
  logger.logSecurity(event, severity, metadata);
};

export const logBusiness = (event: string, metadata?: Record<string, any>) => {
  logger.logBusiness(event, metadata);
};

