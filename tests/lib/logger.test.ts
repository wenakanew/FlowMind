import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { logger } from '@/lib/logger';

describe('logger', () => {
    let consoleLogSpy: any;
    let consoleWarnSpy: any;
    let consoleErrorSpy: any;

    beforeEach(() => {
        consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
        consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('emits formatted info log to console.log', () => {
        const payload = logger.info('TestModule', 'Operation completed', { count: 5 });
        
        expect(payload.level).toBe('info');
        expect(payload.module).toBe('TestModule');
        expect(payload.message).toBe('Operation completed');
        expect(payload.meta).toEqual({ count: 5 });
        expect(consoleLogSpy).toHaveBeenCalledOnce();
        
        const loggedJson = JSON.parse(consoleLogSpy.mock.calls[0][0]);
        expect(loggedJson.module).toBe('TestModule');
        expect(loggedJson.level).toBe('info');
    });

    it('emits formatted warn log to console.warn', () => {
        const payload = logger.warn('TestModule', 'Resource scarce');
        
        expect(payload.level).toBe('warn');
        expect(consoleWarnSpy).toHaveBeenCalledOnce();
    });

    it('emits formatted error log with error payload to console.error', () => {
        const testErr = new Error('Database connection failed');
        const payload = logger.error('DatabaseModule', 'Failed to connect', { retry: true }, testErr);
        
        expect(payload.level).toBe('error');
        expect(payload.error?.message).toBe('Database connection failed');
        expect(consoleErrorSpy).toHaveBeenCalledOnce();
        
        const loggedJson = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
        expect(loggedJson.error.message).toBe('Database connection failed');
    });
});
