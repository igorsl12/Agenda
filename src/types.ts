// types.ts — contratos de dados do app "Agenda de Consultas por Voz".

export type AppointmentStatus = 'Confirmado' | 'Pendente';

/**
 * Consulta médica agendada. Campos espelham o modelo do protótipo de design
 * (title, specialty, date, time, location, status, notes).
 */
export interface Appointment {
  id: string;
  title: string;
  specialty: string;
  /** Data em texto livre (ex.: "Hoje", "Sexta-feira, 19 de julho"). */
  date: string;
  /** Data em ISO (YYYY-MM-DD) para ordenação e calendário mensal. */
  dateISO: string;
  /** Horário em texto livre (ex.: "14:30"). */
  time: string;
  location: string;
  status: AppointmentStatus;
  /** Cor de fundo do avatar (hex). */
  color: string;
  /** Iniciais exibidas no avatar (ex.: "FL"). */
  initials: string;
  notes?: string;
}

/** Formulário editável (sem id/status/color/initials). */
export type AppointmentForm = Omit<
  Appointment,
  'id' | 'status' | 'color' | 'initials'
>;

/** Evento "cru" retornado pela IA antes de virar consulta salva. */
export type ParsedAppointment = AppointmentForm;

export type ScreenName =
  | 'onboarding'
  | 'home'
  | 'listening'
  | 'confirm'
  | 'details'
  | 'edit'
  | 'agenda'
  | 'historico'
  | 'perfil';

export type TabName = 'home' | 'agenda' | 'historico' | 'perfil';
