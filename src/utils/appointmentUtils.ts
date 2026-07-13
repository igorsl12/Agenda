// appointmentUtils.ts — helpers de cores, iniciais, status e datas.
import type { Appointment, AppointmentStatus } from '../types';

/** Cores de fundo de avatar por status (do protótipo de design). */
export const STATUS_STYLE: Record<
  AppointmentStatus,
  { bg: string; color: string }
> = {
  Confirmado: { bg: '#E7F6EC', color: '#1F9254' },
  Pendente: { bg: '#FFF3D9', color: '#B7791F' },
};

export function statusStyle(status: AppointmentStatus) {
  return STATUS_STYLE[status] || STATUS_STYLE.Pendente;
}

/** Paleta de cores de avatar para novas consultas. */
const AVATAR_COLORS = [
  '#DCEAFF',
  '#FFF1E0',
  '#F4E9FF',
  '#E7F6EC',
  '#FCE7F3',
  '#E0F7FA',
];

/** Gera iniciais a partir do título (ex.: "Dra. Fernanda Lima" → "FL"). */
export function initialsFromTitle(title: string): string {
  const clean = title.replace(/\b(dra?|dr)\.?(\s|$)/gi, ' ').trim();
  const parts = clean
    .split(/\s+/)
    .filter((w) => /\p{L}|\d/u.test(w[0] ?? ''));
  if (parts.length === 0) return '??';
  return parts
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

/** Escolhe uma cor de avatar estável a partir do id. */
export function colorForId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

/** Label de contagem ("1 consulta agendada" / "3 consultas agendadas"). */
export function countLabel(list: Appointment[]): string {
  const n = list.length;
  return `${n} ${n === 1 ? 'consulta agendada' : 'consultas agendadas'}`;
}

// ---- Datas ----

const PT_WEEKDAYS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];
const PT_MONTHS = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

/** Converte Date → ISO (YYYY-MM-DD) em horário local. */
export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Data friendly em pt-BR: "Sexta-feira, 19 de julho". */
export function formatFriendly(d: Date): string {
  return `${PT_WEEKDAYS[d.getDay()]}, ${d.getDate()} de ${PT_MONTHS[d.getMonth()]}`;
}

/** ISO (YYYY-MM-DD) → Date local (sem timezone shift). */
export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Formata a data friendly a partir do ISO. */
export function isoToFriendly(iso: string): string {
  return formatFriendly(fromISO(iso));
}

/** Compara consultas por data ISO e depois horário. */
export function byDate(
  a: Appointment,
  b: Appointment,
): number {
  if (a.dateISO !== b.dateISO) return a.dateISO < b.dateISO ? -1 : 1;
  return a.time.localeCompare(b.time);
}

/** Retorna o ISO de hoje + N dias. */
export function isoInDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return toISO(d);
}
