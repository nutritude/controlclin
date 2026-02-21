
import { User } from '../types';

interface LogEntry {
  timestamp: string;
  level: 'LOG' | 'WARN' | 'ERROR';
  message: string;
  args?: any[];
}

class LogService {
  private _logs: LogEntry[] = [];
  private _isLogging = false;
  private readonly _storageKey = 'CONTROLCLIN_APP_LOGS';
  private _originalConsole = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };

  constructor() {
    this.loadLogs();
    this.overrideConsole();
  }

  private loadLogs() {
    try {
      const storedLogs = localStorage.getItem(this._storageKey);
      if (storedLogs) {
        this._logs = JSON.parse(storedLogs);
      }
    } catch (e) {
      console.error('Failed to load logs from localStorage', e);
      this.clearLogs(); // Clear potentially corrupted logs
    }
  }

  private saveLogs() {
    try {
      localStorage.setItem(this._storageKey, JSON.stringify(this._logs));
    } catch (e) {
      // Avoid calling console.error here if it's already being caught by the override
      this._originalConsole.error('Failed to save logs to localStorage', e);
    }
  }

  private overrideConsole() {
    console.log = (...args: any[]) => {
      this.addLog('LOG', args[0], ...args.slice(1));
      this._originalConsole.log.apply(console, args);
    };
    console.warn = (...args: any[]) => {
      this.addLog('WARN', args[0], ...args.slice(1));
      this._originalConsole.warn.apply(console, args);
    };
    console.error = (...args: any[]) => {
      this.addLog('ERROR', args[0], ...args.slice(1));
      this._originalConsole.error.apply(console, args);
    };
  }

  public addLog(level: LogEntry['level'], message: any, ...args: any[]) {
    if (this._isLogging) return; // Prevent infinite recursion
    this._isLogging = true;

    try {
      const timestamp = new Date().toISOString();
      const logMessage = typeof message === 'string' ? message : JSON.stringify(message);
      this._logs.push({ timestamp, level, message: logMessage, args: args.length > 0 ? args : undefined });
      // Keep a reasonable number of logs in memory, e.g., 500
      if (this._logs.length > 500) {
        this._logs = this._logs.slice(this._logs.length - 500);
      }
      this.saveLogs();
    } finally {
      this._isLogging = false;
    }
  }

  public getLogs(): LogEntry[] {
    return [...this._logs]; // Return a copy to prevent external modification
  }

  public clearLogs() {
    this._logs = [];
    localStorage.removeItem(this._storageKey);
    this._originalConsole.log('Logs cleared.');
  }

  public reportBug(description: string, userInfo: User | null): string {
    const reportTimestamp = new Date().toISOString();
    const userIdentifier = userInfo ? `${userInfo.name} (${userInfo.email} - ${userInfo.role})` : 'Guest User';
    const report = `--- BUG REPORT ---
Timestamp: ${reportTimestamp}
Reported by: ${userIdentifier}
Description: ${description}
Application State Snapshot:
  - Current URL: ${window.location.href}
  - User Agent: ${navigator.userAgent}
  - Screen Resolution: ${window.screen.width}x${window.screen.height}
--- COLLECTED LOGS ---
${this._logs.map(log => {
      let msg = `${log.timestamp} [${log.level}]: ${log.message}`;
      if (log.args && log.args.length > 0) {
        msg += ` Args: ${JSON.stringify(log.args)}`;
      }
      return msg;
    }).join('\n')}
--- END REPORT ---`;

    this._originalConsole.error('Generated Bug Report:', report);
    // In a real application, this report would be sent to a backend service (e.g., Sentry, Bugsnag, or a custom API endpoint).
    // For this mock, we just log it.
    this.clearLogs(); // Optionally clear logs after reporting
    return report;
  }
}

export const logService = new LogService();
