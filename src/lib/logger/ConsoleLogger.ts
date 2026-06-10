import ILogger from "./ILogger";

export default class ConsoleLogger implements ILogger {
  debug(message?: string, ...optionalParams: unknown[]): void {
    console.debug(message, ...optionalParams);
  }

  info(message?: string, ...optionalParams: unknown[]): void {
    console.info(message, ...optionalParams);
  }

  warn(message?: string, ...optionalParams: unknown[]): void {
    console.warn(message, ...optionalParams);
  }

  error(message?: string, ...optionalParams: unknown[]): void {
    console.error(message, ...optionalParams);
  }

  fatal(message?: string, ...optionalParams: unknown[]): void {
    console.error(message, ...optionalParams);
  }
}
