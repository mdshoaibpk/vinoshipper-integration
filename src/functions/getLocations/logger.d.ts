declare interface Logger {
    info(message: string, data?: any): void;
    error(message: string, error?: any): void;
    debug(message: string, data?: any): void;
    warn(message: string, data?: any): void;
}

declare const logger: Logger;
export = logger; 