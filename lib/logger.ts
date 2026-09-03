export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogPayload {
    timestamp: string;
    level: LogLevel;
    module: string;
    message: string;
    requestId?: string;
    meta?: Record<string, unknown>;
    error?: {
        name?: string;
        message: string;
        stack?: string;
    };
}

class Logger {
    private formatError(error: unknown) {
        if (!error) return undefined;
        if (error instanceof Error) {
            return {
                name: error.name,
                message: error.message,
                stack: error.stack,
            };
        }
        return { message: String(error) };
    }

    private emit(level: LogLevel, moduleName: string, message: string, meta?: Record<string, unknown>, error?: unknown) {
        const payload: LogPayload = {
            timestamp: new Date().toISOString(),
            level,
            module: moduleName,
            message,
            meta,
            error: this.formatError(error),
        };

        const formattedJson = JSON.stringify(payload);

        switch (level) {
            case 'error':
                console.error(formattedJson);
                break;
            case 'warn':
                console.warn(formattedJson);
                break;
            case 'debug':
                console.debug(formattedJson);
                break;
            case 'info':
            default:
                console.log(formattedJson);
                break;
        }

        // Optional error tracking SDK integration placeholder (e.g. Sentry)
        if (level === 'error' && process.env.SENTRY_DSN) {
            this.captureSentryError(payload);
        }

        return payload;
    }

    private captureSentryError(payload: LogPayload) {
        // Safe check for external tracking when configured
        try {
            if (typeof (globalThis as any).Sentry !== 'undefined') {
                (globalThis as any).Sentry.captureException(payload.error || new Error(payload.message));
            }
        } catch {
            // Ignore reporting failures to ensure log emission remains non-blocking
        }
    }

    info(moduleName: string, message: string, meta?: Record<string, unknown>) {
        return this.emit('info', moduleName, message, meta);
    }

    warn(moduleName: string, message: string, meta?: Record<string, unknown>, error?: unknown) {
        return this.emit('warn', moduleName, message, meta, error);
    }

    error(moduleName: string, message: string, meta?: Record<string, unknown>, error?: unknown) {
        return this.emit('error', moduleName, message, meta, error);
    }

    debug(moduleName: string, message: string, meta?: Record<string, unknown>) {
        return this.emit('debug', moduleName, message, meta);
    }
}

export const logger = new Logger();
