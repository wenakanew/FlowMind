import { describe, expect, it } from 'vitest';
import { extractDate, extractStatus, extractTitle, normalizeDatabaseId } from '@/lib/notion';

describe('notion helpers', () => {
  it('normalizeDatabaseId formats 32-char database ids', () => {
    expect(normalizeDatabaseId('123456781234123412341234567890ab')).toBe('12345678-1234-1234-1234-1234567890ab');
    expect(normalizeDatabaseId('12345678-1234-1234-1234-1234567890ab')).toBe('12345678-1234-1234-1234-1234567890ab');
  });

  it('extractTitle handles missing title safely', () => {
    expect(extractTitle(undefined)).toBe('Untitled');
    expect(extractTitle({ type: 'title', title: [] })).toBe('Untitled');
    expect(extractTitle({ type: 'title', title: [{ plain_text: 'Task 1' }] })).toBe('Task 1');
  });

  it('extractStatus supports status and select properties', () => {
    expect(extractStatus(undefined)).toBe('No Status');
    expect(extractStatus({ type: 'status', status: { name: 'In Progress' } })).toBe('In Progress');
    expect(extractStatus({ type: 'select', select: { name: 'Done' } })).toBe('Done');
  });

  it('extractDate returns start date when present', () => {
    expect(extractDate(undefined)).toBeUndefined();
    expect(extractDate({ type: 'date', date: null })).toBeUndefined();
    expect(extractDate({ type: 'date', date: { start: '2026-08-31' } })).toBe('2026-08-31');
  });
});
