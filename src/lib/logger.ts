type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private isProduction = import.meta.env.PROD;

  private formatMessage(level: LogLevel, message: string) {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  }

  info(message: string, data?: unknown) {
    if (!this.isProduction) {
      console.info(this.formatMessage('info', message), data || '');
    }
  }

  warn(message: string, data?: unknown) {
    console.warn(this.formatMessage('warn', message), data || '');
  }

  error(message: string, error?: unknown) {
    console.error(this.formatMessage('error', message), error || '');
    // In the future, send this to Sentry or another monitoring service here
  }

  debug(message: string, data?: unknown) {
    if (!this.isProduction) {
      console.debug(this.formatMessage('debug', message), data || '');
    }
  }
}

export const logger = new Logger();