// AppContext.tsx — estado global do app (telas, abas, consultas, voz).
//
// Reconstrói a lógica do protótipo de design (Draw Things "Voice Agenda App"):
// fluxo onboarding → home → listening → confirm → detalhes/editação, com
// persistência local das consultas e simulação de entrada por voz.
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  Appointment,
  AppointmentForm,
  ScreenName,
  TabName,
} from '../types';
import {
  loadAppointments,
  saveAppointments,
} from '../storage/appointmentStorage';
import {
  colorForId,
  initialsFromTitle,
  statusStyle,
  isoInDays,
  isoToFriendly,
  byDate,
} from '../utils/appointmentUtils';
import { voiceService } from '../services/voiceService';

interface AppState {
  screen: ScreenName;
  tab: TabName;
  listenPhase: 'listening' | 'processing';
  transcriptShown: string;
  selectedId: string | null;
  editMode: 'new' | 'edit-existing' | 'voice-edit';
  form: AppointmentForm;
  appointments: Appointment[];
}

interface AppContextValue extends AppState {
  // navegação
  goOnboardNext: () => void;
  goHome: () => void;
  setTabHome: () => void;
  setTabAgenda: () => void;
  setTabPerfil: () => void;
  openHistory: () => void;
  // consultas
  selectAppointment: (id: string) => void;
  openAddNew: () => void;
  openEditExisting: (id?: string) => void;
  deleteSelected: (id?: string) => void;
  saveForm: () => void;
  historyFilter: 'todas' | 'Confirmado' | 'Pendente';
  setHistoryFilter: (f: 'todas' | 'Confirmado' | 'Pendente') => void;
  historyFiltered: Appointment[];
  // voz
  startVoice: () => void;
  cancelVoice: () => void;
  advanceNow: () => void;
  confirmVoiceEvent: () => void;
  editVoiceEvent: () => void;
  backFromEdit: () => void;
  // form
  setField: (key: keyof AppointmentForm, val: string) => void;
  // helpers de view
  current: Appointment | null;
  parsed: AppointmentForm;
  voiceTranscriptFull: string;
  appointmentCountLabel: string;
  listenStatusLabel: string;
  showManualAdvance: boolean;
  isPhaseListening: boolean;
  isPhaseProcessing: boolean;
  loading: boolean;
  userName: string;
  editScreenTitle: string;
}

const blankForm = (): AppointmentForm => ({
  title: '',
  specialty: '',
  date: '',
  dateISO: isoInDays(0),
  time: '',
  location: '',
  notes: '',
});

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<ScreenName>('onboarding');
  const [tab, setTab] = useState<TabName>('home');
  const [listenPhase, setListenPhase] = useState<'listening' | 'processing'>(
    'listening',
  );
  const [transcriptShown, setTranscriptShown] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState<
    'new' | 'edit-existing' | 'voice-edit'
  >('new');
  const [form, setForm] = useState<AppointmentForm>(blankForm());
  const [historyFilter, setHistoryFilter] = useState<
    'todas' | 'Confirmado' | 'Pendente'
  >('todas');

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    loadAppointments().then((list) => {
      setAppointments(list);
      setLoading(false);
    });
  }, []);

  const clearTimers = () => {
    timers.current.forEach((t) => clearTimeout(t));
    timers.current = [];
  };

  // ---- navegação ----
  const goOnboardNext = () => setScreen('home');
  const goHome = () => setScreen('home');
  const setTabHome = () => {
    setTab('home');
    setScreen('home');
  };
  const setTabAgenda = () => {
    setTab('agenda');
    setScreen('agenda');
  };
  const setTabPerfil = () => {
    setTab('perfil');
    setScreen('perfil');
  };
  const openHistory = () => {
    setTab('historico');
    setScreen('historico');
  };

  // ---- consultas ----
  const selectAppointment = (id: string) => {
    setSelectedId(id);
    setScreen('details');
  };
  const openAddNew = () => {
    setEditMode('new');
    setForm(blankForm());
    setScreen('edit');
  };
  // Usa `current` (consulta em tela) como fonte do id, tornando a ação
  // independente de possíveis dessincronizações de `selectedId`.
  const openEditExisting = (id?: string) => {
    const appt =
      appointments.find((a) => a.id === (id ?? selectedId)) ||
      current;
    if (!appt) return;
    setEditMode('edit-existing');
    setSelectedId(appt.id);
    setForm({
      title: appt.title,
      specialty: appt.specialty,
      date: appt.date,
      dateISO: appt.dateISO,
      time: appt.time,
      location: appt.location,
      notes: appt.notes || '',
    });
    setScreen('edit');
  };
  const deleteSelected = (id?: string) => {
    const appt =
      appointments.find((a) => a.id === (id ?? selectedId)) ||
      current;
    if (!appt) return;
    const next = appointments.filter((a) => a.id !== appt.id);
    setAppointments(next);
    saveAppointments(next);
    setSelectedId(null);
    setScreen('home');
  };
  const saveForm = () => {
    const dateISO = form.dateISO || isoInDays(0);
    const dateFriendly = form.date || isoToFriendly(dateISO);
    if (editMode === 'edit-existing' && selectedId) {
      const next = appointments.map((a) =>
        a.id === selectedId
          ? { ...a, ...form, dateISO, date: dateFriendly }
          : a,
      );
      setAppointments(next);
      saveAppointments(next);
      setScreen('details');
    } else {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const title = form.title || 'Nova consulta';
      const created: Appointment = {
        ...form,
        id,
        title,
        date: dateFriendly,
        dateISO,
        status: 'Confirmado',
        color: colorForId(id),
        initials: initialsFromTitle(title),
      };
      const next = [created, ...appointments];
      setAppointments(next);
      saveAppointments(next);
      setScreen('home');
    }
  };

  // ---- voz ----
  const startVoice = () => {
    clearTimers();
    setListenPhase('listening');
    setTranscriptShown('');
    setScreen('listening');
    const words = voiceService.words();
    words.forEach((w, i) => {
      const t = setTimeout(() => {
        setTranscriptShown((prev) => (prev ? prev + ' ' : '') + w);
      }, 260 + i * 140);
      timers.current.push(t);
    });
    const revealDone = 260 + words.length * 140 + 300;
    const t2 = setTimeout(() => setListenPhase('processing'), revealDone);
    timers.current.push(t2);
    const t3 = setTimeout(() => setScreen('confirm'), revealDone + 1300);
    timers.current.push(t3);
  };
  const cancelVoice = () => {
    clearTimers();
    setScreen('home');
  };
  const advanceNow = () => {
    clearTimers();
    setScreen('confirm');
  };
  const confirmVoiceEvent = () => {
    const parsed = voiceService.extractEvent();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const created: Appointment = {
      ...parsed,
      id,
      date: parsed.date || isoToFriendly(parsed.dateISO || isoInDays(0)),
      dateISO: parsed.dateISO || isoInDays(0),
      status: 'Confirmado',
      color: '#FCE7F3',
      initials: initialsFromTitle(parsed.title),
    };
    const next = [created, ...appointments];
    setAppointments(next);
    saveAppointments(next);
    setScreen('home');
  };
  const editVoiceEvent = () => {
    setEditMode('voice-edit');
    setForm({ ...voiceService.extractEvent() });
    setScreen('edit');
  };
  const backFromEdit = () => {
    setScreen(editMode === 'edit-existing' ? 'details' : 'home');
  };

  // ---- form ----
  const setField = (key: keyof AppointmentForm, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const current =
    appointments.find((a) => a.id === selectedId) || null;

  const parsed = voiceService.extractEvent();

  const historyFiltered = useMemo(() => {
    const filtered =
      historyFilter === 'todas'
        ? appointments
        : appointments.filter((a) => a.status === historyFilter);
    return [...filtered].sort(byDate);
  }, [appointments, historyFilter]);

  const value = useMemo<AppContextValue>(
    () => ({
      screen,
      tab,
      listenPhase,
      transcriptShown,
      selectedId,
      editMode,
      form,
      appointments,
      loading,
      goOnboardNext,
      goHome,
      setTabHome,
      setTabAgenda,
      setTabPerfil,
      openHistory,
      selectAppointment,
      openAddNew,
      openEditExisting,
      deleteSelected,
      saveForm,
      historyFilter,
      setHistoryFilter,
      historyFiltered,
      startVoice,
      cancelVoice,
      advanceNow,
      confirmVoiceEvent,
      editVoiceEvent,
      backFromEdit,
      setField,
      current,
      parsed,
      voiceTranscriptFull: voiceService.fullTranscript(),
      appointmentCountLabel: `${appointments.length} ${
        appointments.length === 1 ? 'consulta agendada' : 'consultas agendadas'
      }`,
      listenStatusLabel:
        listenPhase === 'listening' ? 'Ouvindo...' : 'Processando...',
      showManualAdvance: false,
      isPhaseListening: listenPhase === 'listening',
      isPhaseProcessing: listenPhase === 'processing',
      userName: 'Marina',
      editScreenTitle:
        editMode === 'edit-existing' ? 'Editar consulta' : 'Novo compromisso',
    }),
    [
      screen,
      tab,
      listenPhase,
      transcriptShown,
      selectedId,
      editMode,
      form,
      appointments,
      loading,
      current,
      historyFilter,
      historyFiltered,
    ],
  );

  return (
    <AppContext.Provider value={value}>{children}</AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp deve ser usado dentro de <AppProvider>');
  return ctx;
}

// Re-exporta para conveniência de quem precisa só do statusStyle.
export { statusStyle };
