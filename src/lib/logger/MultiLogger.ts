import ILogger from "./ILogger";

export default class MultiLogger implements ILogger {
  constructor(
    private debugLoggers: ILogger[],
    private infoLoggers: ILogger[],
    private warnLoggers: ILogger[],
    private errorLoggers: ILogger[]
  ) {}

  debug(message?: string, ...optionalParams: unknown[]): void {
    this.debugLoggers.forEach((logger) =>
      logger.debug(message, ...optionalParams)
    );
  }

  info(message?: string, ...optionalParams: unknown[]): void {
    this.infoLoggers.forEach((logger) =>
      logger.info(message, ...optionalParams)
    );
  }

  warn(message?: string, ...optionalParams: unknown[]): void {
    this.warnLoggers.forEach((logger) =>
      logger.warn(message, ...optionalParams)
    );
  }

  error(message?: string, ...optionalParams: unknown[]): void {
    this.errorLoggers.forEach((logger) =>
      logger.error(message, ...optionalParams)
    );
  }

  fatal(message?: string, ...optionalParams: unknown[]): void {
    this.errorLoggers.forEach((logger) =>
      logger.error(message, ...optionalParams)
    );
  }
}

