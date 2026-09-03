import { describe, it, expect } from 'vitest';
import {
    extractTitle,
    extractRichText,
    extractStatus,
    extractDate,
    extractEmailOrRichText,
    normalizeDatabaseId,
    findPropertyByName,
    findPropertyByCandidateNamesAndTypes,
    findFirstPropertyNameByType,
    hasProperty,
} from '@/lib/notion-schema';

describe('notion-schema', () => {
    describe('extractTitle', () => {
        it('extracts plain text from title property', () => {
            const prop = {
                type: 'title' as const,
                title: [{ plain_text: 'Build API Route' }],
            };
            expect(extractTitle(prop)).toBe('Build API Route');
        });

        it('returns "Untitled" for empty or invalid title property', () => {
            expect(extractTitle(undefined)).toBe('Untitled');
            expect(extractTitle({ type: 'title', title: [] })).toBe('Untitled');
        });
    });

    describe('extractRichText', () => {
        it('extracts text from rich_text property', () => {
            const prop = {
                type: 'rich_text',
                rich_text: [{ plain_text: 'Sample detail text' }],
            };
            expect(extractRichText(prop)).toBe('Sample detail text');
        });

        it('returns undefined when rich_text is empty', () => {
            expect(extractRichText({ type: 'rich_text', rich_text: [] })).toBeUndefined();
            expect(extractRichText(undefined)).toBeUndefined();
        });
    });

    describe('extractStatus', () => {
        it('extracts name from status property', () => {
            const prop = { type: 'status' as const, status: { name: 'In Progress' } };
            expect(extractStatus(prop)).toBe('In Progress');
        });

        it('extracts name from select property fallback', () => {
            const prop = { type: 'select' as const, select: { name: 'Done' } };
            expect(extractStatus(prop)).toBe('Done');
        });

        it('returns "No Status" for undefined', () => {
            expect(extractStatus(undefined)).toBe('No Status');
        });
    });

    describe('extractDate', () => {
        it('extracts start date string', () => {
            const prop = { type: 'date' as const, date: { start: '2026-09-02' } };
            expect(extractDate(prop)).toBe('2026-09-02');
        });

        it('returns undefined if date or start is missing', () => {
            expect(extractDate(undefined)).toBeUndefined();
            expect(extractDate({ type: 'date', date: null })).toBeUndefined();
        });
    });

    describe('extractEmailOrRichText', () => {
        it('extracts from email property', () => {
            const prop = { type: 'email', email: 'user@example.com' };
            expect(extractEmailOrRichText(prop)).toBe('user@example.com');
        });

        it('extracts from rich_text property', () => {
            const prop = { type: 'rich_text', rich_text: [{ plain_text: 'user@example.com' }] };
            expect(extractEmailOrRichText(prop)).toBe('user@example.com');
        });
    });

    describe('normalizeDatabaseId', () => {
        it('formats 32-character raw hex ID into dashed UUID format', () => {
            const raw = '12345678123412341234123456789abc';
            expect(normalizeDatabaseId(raw)).toBe('12345678-1234-1234-1234-123456789abc');
        });

        it('returns already formatted UUID as-is', () => {
            const uuid = '12345678-1234-1234-1234-123456789abc';
            expect(normalizeDatabaseId(uuid)).toBe(uuid);
        });
    });

    describe('schema property finders', () => {
        const properties = {
            'Task Name': { type: 'title' },
            'Status': { type: 'status' },
            'Email': { type: 'email' },
            'Telegram Username': { type: 'rich_text' },
        };

        it('finds property name case-insensitively', () => {
            expect(findPropertyByName(properties, 'status')).toBe('Status');
            expect(findPropertyByName(properties, 'email')).toBe('Email');
        });

        it('finds property by candidate names and allowed types', () => {
            const found = findPropertyByCandidateNamesAndTypes(
                properties,
                ['Telegram Handle', 'Telegram Username'],
                ['rich_text'],
            );
            expect(found).toBe('Telegram Username');
        });

        it('finds first property name by type with fallback', () => {
            expect(findFirstPropertyNameByType(properties, 'title', 'Fallback')).toBe('Task Name');
            expect(findFirstPropertyNameByType(properties, 'date', 'Fallback')).toBe('Fallback');
        });

        it('checks property existence and optional type match', () => {
            expect(hasProperty(properties, 'Email', 'email')).toBe(true);
            expect(hasProperty(properties, 'Email', 'number')).toBe(false);
            expect(hasProperty(properties, 'NonExistent')).toBe(false);
        });
    });
});
