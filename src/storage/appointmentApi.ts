// appointmentApi.ts — CRUD de compromissos contra o backend (/api/appointments).
// O servidor é dono do id e do escopo por usuário. O cliente mapeia o tipo
// Appointment (camelCase, do app) <-> o formato snake_case do banco.
import type { Appointment, AppointmentCategory, AppointmentStatus } from '../types';
import { apiFetch } from '../services/apiClient';
import { colorForId, initialsFromTitle, isValidCategory, isoToFriendly } from '../utils/appointmentUtils';

/** Forma como o compromisso trafega no banco (snake_case). */
interface AppointmentRow {
  id: string;
  title: string;
  specialty: string;
  date_iso: string;
  time: string;
  location: string;
  notes: string;
  status: string;
  category: string;
  color: string;
  initials: string;
}

/** Campos enviados ao criar/atualizar (sem id e sem 'date' derivado). */
export type AppointmentPayload = Omit<Appointment, 'id' | 'date'>;

function normalizeCategory(value: string): AppointmentCategory {
  return isValidCategory(value) ? value : 'outro';
}

/** Reconstrói o Appointment do app a partir da linha do banco. */
function fromRow(row: AppointmentRow): Appointment {
  return {
    id: row.id,
    title: row.title || '',
    specialty: row.specialty || '',
    dateISO: row.date_iso || '',
    date: row.date_iso ? isoToFriendly(row.date_iso) : '',
    time: row.time || '',
    location: row.location || '',
    status: (row.status as AppointmentStatus) || 'Confirmado',
    category: normalizeCategory(row.category),
    color: row.color || colorForId(row.id),
    initials: row.initials || initialsFromTitle(row.title || '?'),
    notes: row.notes || '',
  };
}

/** Converte o Appointment do app para o formato snake_case do banco. */
function toRow(appt: AppointmentPayload): Record<string, string> {
  return {
    title: appt.title,
    specialty: appt.specialty,
    date_iso: appt.dateISO,
    time: appt.time,
    location: appt.location,
    notes: appt.notes || '',
    status: appt.status,
    category: appt.category,
    color: appt.color,
    initials: appt.initials,
  };
}

export async function fetchAppointments(): Promise<Appointment[]> {
  const r = await apiFetch<{ appointments: AppointmentRow[] }>('/appointments', {
    auth: true,
  });
  if (!r.ok || !r.data) {
    throw new Error(r.error || 'Falha ao carregar compromissos.');
  }
  return (r.data.appointments || []).map(fromRow);
}

export async function createAppointment(
  appt: AppointmentPayload,
): Promise<Appointment> {
  const r = await apiFetch<{ appointment: AppointmentRow }>('/appointments', {
    method: 'POST',
    auth: true,
    body: toRow(appt),
  });
  if (!r.ok || !r.data) {
    throw new Error(r.error || 'Falha ao salvar compromisso.');
  }
  return fromRow(r.data.appointment);
}

export async function updateAppointment(
  id: string,
  appt: AppointmentPayload,
): Promise<Appointment> {
  const r = await apiFetch<{ appointment: AppointmentRow }>(
    `/appointments/${id}`,
    { method: 'PUT', auth: true, body: toRow(appt) },
  );
  if (!r.ok || !r.data) {
    throw new Error(r.error || 'Falha ao atualizar compromisso.');
  }
  return fromRow(r.data.appointment);
}

export async function deleteAppointment(id: string): Promise<void> {
  const r = await apiFetch(`/appointments/${id}`, {
    method: 'DELETE',
    auth: true,
  });
  if (!r.ok) throw new Error(r.error || 'Falha ao remover compromisso.');
}
