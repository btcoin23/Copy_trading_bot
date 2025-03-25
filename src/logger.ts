import * as fs from 'fs';
import * as path from 'path';

class Logger {
  private logFilePath: string;
  private originalConsoleLog: any;
  private originalConsoleError: any;

  constructor(logFileName: string = `./src/logs/transaction-logs.log`) {
    this.logFilePath = path.join(process.cwd(), logFileName);
    this.originalConsoleLog = console.log;
    this.originalConsoleError = console.error;
    this.setupLogger();
  }

  private setupLogger() {
    // Create or clear the log file
    fs.writeFileSync(this.logFilePath, '');

    // Override console.log
    console.log = (...args: any[]) => {
      const message = this.formatLogMessage(args);
      this.appendToLogFile(message);
      this.originalConsoleLog.apply(console, args);
    };

    // Override console.error
    console.error = (...args: any[]) => {
      const message = this.formatLogMessage(args, 'ERROR');
      this.appendToLogFile(message);
      this.originalConsoleError.apply(console, args);
    };

    // Override console.table
    const originalConsoleTable = console.table;
    console.table = (tabularData: any, properties?: readonly string[]) => {
      const tableOutput = this.formatTableData(tabularData);
      this.appendToLogFile(tableOutput);
      originalConsoleTable.call(console, tabularData, properties);
    };
  }

  private formatLogMessage(args: any[], level: string = 'INFO'): string {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => {
      if (typeof arg === 'object') {
        return JSON.stringify(arg, null, 2);
      }
      return String(arg);
    }).join(' ');
    
    return `[${timestamp}] [${level}] ${message}\n`;
  }

  private formatTableData(data: any): string {
    if (Array.isArray(data)) {
      return `[TABLE DATA]\n${JSON.stringify(data, null, 2)}\n`;
    } else {
      return `[TABLE DATA]\n${JSON.stringify(data, null, 2)}\n`;
    }
  }

  private appendToLogFile(message: string) {
    fs.appendFileSync(this.logFilePath, message);
  }

  // Method to restore original console methods
  public restore() {
    console.log = this.originalConsoleLog;
    console.error = this.originalConsoleError;
  }
}

export const initLogger = (logFileName?: string) => {
  return new Logger(logFileName);
};
