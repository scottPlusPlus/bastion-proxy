export default interface ILogger {
    debug(message?: string, ...optionalParams: unknown[]): void;
    info(message?: string, ...optionalParams: unknown[]): void;
    warn(message?: string, ...optionalParams: unknown[]): void;
    error(message?: string, ...optionalParams: unknown[]): void;
    fatal(message?: string, ...optionalParams: unknown[]): void;
}

export enum LogLevel {
    DEBUG = 'debug',
    INFO = 'info',
    WARN = 'warn',
    ERROR = 'error'
}