// Testes dos utilitários puros de datas, iniciais e ordenação.
import { describe, it, expect } from 'vitest';
import {
  initialsFromTitle,
  colorForId,
  toISO,
  fromISO,
  isoToFriendly,
  byDate,
  isoInDays,
  statusStyle,
  categoryStyle,
  isValidCategory,
  CATEGORY_LIST,
} from '../appointmentUtils';
import type { Appointment } from '../../types';

describe('initialsFromTitle', () => {
  it('strips doctor honorifics and takes two initials', () => {
    expect(initialsFromTitle('Dra. Fernanda Lima')).toBe('FL');
    expect(initialsFromTitle('Dr. Ricardo Alves')).toBe('RA');
  });

  it('handles single word titles', () => {
    expect(initialsFromTitle('Fisioterapia')).toBe('F');
  });

  it('returns ?? for empty title', () => {
    expect(initialsFromTitle('')).toBe('??');
    expect(initialsFromTitle('Dr.')).toBe('??');
  });
});

describe('colorForId', () => {
  it('is stable for the same id', () => {
    expect(colorForId('abc')).toBe(colorForId('abc'));
  });

  it('returns a hex color', () => {
    expect(colorForId('xyz')).toMatch(/^#[0-9A-F]{6}$/i);
  });
});

describe('date helpers', () => {
  it('toISO formats local date without timezone shift', () => {
    expect(toISO(new Date(2026, 6, 13))).toBe('2026-07-13');
    expect(toISO(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('fromISO round-trips with toISO', () => {
    expect(toISO(fromISO('2026-07-16'))).toBe('2026-07-16');
  });

  it('isoToFriendly renders pt-BR weekday and month', () => {
    expect(isoToFriendly('2026-07-16')).toBe('Quinta-feira, 16 de julho');
  });

  it('isoInDays(0) is today', () => {
    expect(isoInDays(0)).toBe(toISO(new Date()));
  });
});

describe('byDate', () => {
  const make = (dateISO: string, time: string): Appointment => ({
    id: dateISO + time,
    title: 't',
    specialty: '',
    date: '',
    dateISO,
    time,
    location: '',
    status: 'Confirmado',
    category: 'outro',
    color: '#fff',
    initials: 'T',
  });

  it('sorts by date first, then time', () => {
    const list = [
      make('2026-07-20', '08:00'),
      make('2026-07-16', '15:00'),
      make('2026-07-16', '09:00'),
    ].sort(byDate);
    expect(list.map((a) => a.id)).toEqual([
      '2026-07-1609:00',
      '2026-07-1615:00',
      '2026-07-2008:00',
    ]);
  });
});

describe('statusStyle', () => {
  it('returns distinct styles per status', () => {
    expect(statusStyle('Confirmado')).not.toEqual(statusStyle('Pendente'));
  });
});

describe('categoryStyle / isValidCategory', () => {
  it('gives every category in the list a distinct label and colors', () => {
    const labels = CATEGORY_LIST.map((c) => categoryStyle(c).label);
    expect(new Set(labels).size).toBe(CATEGORY_LIST.length);
  });

  it('validates known categories and rejects unknown strings', () => {
    expect(isValidCategory('saude')).toBe(true);
    expect(isValidCategory('outro')).toBe(true);
    expect(isValidCategory('astrologia')).toBe(false);
    expect(isValidCategory('')).toBe(false);
  });
});
