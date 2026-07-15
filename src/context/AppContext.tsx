// AppContext.tsx — estado global do app (telas, abas, compromissos, voz).
//
// Reconstrói a lógica do protótipo de design (Draw Things "Voice Agenda App"):
// fluxo onboarding → home → listening → confirm → detalhes/editação, com
// persistência local dos compromissos e simulação de entrada por voz.
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
  AppointmentCategory,
  AppointmentForm,
  ScreenName,
  TabName,
} from '../types';
import {
  loadAppointments,
  saveAppointments,
} from '../storage/appointmentStorage';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  type UserSettings,
} from '../storage/settingsStorage';
import {
  colorForId,
  initialsFromTitle,
  statusStyle,
  isoInDays,
  isoToFriendly,
  byDate,
} from '../utils/appointmentUtils';
import { voiceService } from '../services/voiceService';
import { getProvider } from '../services/aiService';
import {
  extractAppointmentFromAudio,
} from '../services/aiService';
import {
  startRecording,
  stopRecording,
  discardRecording,
} from '../services/recorderService';
import {
  ensureNotificationPermission,
  syncAppointmentReminders,
} from '../services/notificationService';
import type { ParsedAppointment } from '../types';

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

/** Provedor resolvido uma vez no load (env é estático no bundle). */
const AI_PROVIDER = getProvider();
const IS_MOCK = AI_PROVIDER === 'mock';

// Mensagens rotativas na fase de processamento (fluxo real): a espera pesa
// menos quando o usuário vê que algo está acontecendo. As duas primeiras
// espelham o que o servidor faz em sequência (transcreve → interpreta).
const PROCESSING_STEPS = [
  'Transcrevendo o áudio...',
  'Interpretando o compromisso...',
  'Organizando os detalhes...',
  'Quase lá...',
];
const PROCESSING_STEP_MS = 2600;

interface AppContextValue extends AppState {
  // navegação
  goOnboardNext: () => void;
  goHome: () => void;
  setTabHome: () => void;
  setTabAgenda: () => void;
  setTabPerfil: () => void;
  openHistory: () => void;
  // compromissos
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
  voiceError: string | null;
  // form
  setField: (key: Exclude<keyof AppointmentForm, 'category'>, val: string) => void;
  setCategory: (category: AppointmentCategory) => void;
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
  settings: UserSettings;
  setUserName: (name: string) => void;
  toggleNotifications: () => void;
  toggleRemindOneHour: () => void;
}

const blankForm = (): AppointmentForm => ({
  title: '',
  specialty: '',
  date: '',
  dateISO: isoInDays(0),
  time: '',
  location: '',
  notes: '',
  category: 'outro',
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
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [parsedEvent, setParsedEvent] = useState<ParsedAppointment | null>(
    null,
  );
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [processingLabel, setProcessingLabel] = useState('Processando...');

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    Promise.all([loadAppointments(), loadSettings()]).then(
      ([list, loadedSettings]) => {
        setAppointments(list);
        setSettings(loadedSettings);
        setLoading(false);
      },
    );
  }, []);

  // Reagenda lembretes quando compromissos ou preferências mudam.
  useEffect(() => {
    if (loading) return;
    void syncAppointmentReminders(appointments, settings);
  }, [appointments, settings, loading]);

  const updateSettings = (patch: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      saveSettings(next);
      return next;
    });
  };

  const setUserName = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateSettings({ userName: trimmed });
  };
  const toggleNotifications = () => {
    const enabling = !settings.notificationsEnabled;
    if (enabling) void ensureNotificationPermission();
    updateSettings({ notificationsEnabled: enabling });
  };
  const toggleRemindOneHour = () =>
    updateSettings({ remindOneHourBefore: !settings.remindOneHourBefore });

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

  // ---- compromissos ----
  const selectAppointment = (id: string) => {
    setSelectedId(id);
    setScreen('details');
  };
  const openAddNew = () => {
    setEditMode('new');
    setForm(blankForm());
    setScreen('edit');
  };
  // Usa `current` (compromisso em tela) como fonte do id, tornando a ação
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
      category: appt.category,
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
      const title = form.title || 'Novo compromisso';
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
  /** Fluxo mock: transcrição fictícia digitada palavra a palavra. */
  const startVoiceMock = () => {
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
    const t3 = setTimeout(() => {
      setParsedEvent(voiceService.extractEvent());
      setVoiceTranscript(voiceService.fullTranscript());
      setScreen('confirm');
    }, revealDone + 1300);
    timers.current.push(t3);
  };

  /** Fluxo real: grava o microfone até o usuário tocar em "Concluir". */
  const startVoiceReal = async () => {
    try {
      await startRecording();
    } catch (err: unknown) {
      setVoiceError(
        err instanceof Error ? err.message : 'Falha ao acessar o microfone.',
      );
    }
  };

  const startVoice = () => {
    clearTimers();
    setVoiceError(null);
    setListenPhase('listening');
    setTranscriptShown('');
    setScreen('listening');
    if (IS_MOCK) {
      startVoiceMock();
    } else {
      void startVoiceReal();
    }
  };

  const cancelVoice = () => {
    clearTimers();
    if (!IS_MOCK) void discardRecording();
    setVoiceError(null);
    setScreen('home');
  };

  /** Mock: pula direto para a confirmação. Real: para de gravar e processa. */
  const advanceNow = () => {
    clearTimers();
    if (IS_MOCK) {
      setParsedEvent(voiceService.extractEvent());
      setVoiceTranscript(voiceService.fullTranscript());
      setScreen('confirm');
      return;
    }
    void (async () => {
      setListenPhase('processing');
      // Agenda a troca das mensagens enquanto a chamada única ao proxy corre.
      setProcessingLabel(PROCESSING_STEPS[0]);
      PROCESSING_STEPS.slice(1).forEach((label, i) => {
        const t = setTimeout(
          () => setProcessingLabel(label),
          (i + 1) * PROCESSING_STEP_MS,
        );
        timers.current.push(t);
      });
      try {
        const audio = await stopRecording();
        const result = await extractAppointmentFromAudio(audio);
        clearTimers();
        setParsedEvent(result.event);
        setVoiceTranscript(result.transcript);
        setTranscriptShown(result.transcript);
        setScreen('confirm');
      } catch (err: unknown) {
        clearTimers();
        setVoiceError(
          err instanceof Error
            ? err.message
            : 'Não consegui processar o áudio. Tente novamente.',
        );
        setListenPhase('listening');
      }
    })();
  };

  const confirmVoiceEvent = () => {
    const parsed = parsedEvent ?? voiceService.extractEvent();
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const created: Appointment = {
      ...parsed,
      id,
      date: parsed.date || isoToFriendly(parsed.dateISO || isoInDays(0)),
      dateISO: parsed.dateISO || isoInDays(0),
      status: 'Confirmado',
      color: colorForId(id),
      initials: initialsFromTitle(parsed.title),
    };
    const next = [created, ...appointments];
    setAppointments(next);
    saveAppointments(next);
    setParsedEvent(null);
    setScreen('home');
  };
  const editVoiceEvent = () => {
    setEditMode('voice-edit');
    setForm({ ...(parsedEvent ?? voiceService.extractEvent()) });
    setScreen('edit');
  };
  const backFromEdit = () => {
    setScreen(editMode === 'edit-existing' ? 'details' : 'home');
  };

  // ---- form ----
  const setField = (key: Exclude<keyof AppointmentForm, 'category'>, val: string) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };
  const setCategory = (category: AppointmentCategory) => {
    setForm((prev) => ({ ...prev, category }));
  };

  const current =
    appointments.find((a) => a.id === selectedId) || null;

  const parsed = parsedEvent ?? voiceService.extractEvent();

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
      voiceError,
      setField,
      setCategory,
      current,
      parsed,
      voiceTranscriptFull:
        voiceTranscript || voiceService.fullTranscript(),
      appointmentCountLabel: `${appointments.length} ${
        appointments.length === 1 ? 'compromisso agendado' : 'compromissos agendados'
      }`,
      listenStatusLabel:
        listenPhase === 'listening'
          ? IS_MOCK
            ? 'Ouvindo...'
            : 'Gravando... fale o compromisso'
          : IS_MOCK
            ? 'Processando...'
            : processingLabel,
      showManualAdvance: !IS_MOCK && listenPhase === 'listening' && !voiceError,
      isPhaseListening: listenPhase === 'listening',
      isPhaseProcessing: listenPhase === 'processing',
      userName: settings.userName,
      editScreenTitle:
        editMode === 'edit-existing' ? 'Editar compromisso' : 'Novo compromisso',
      settings,
      setUserName,
      toggleNotifications,
      toggleRemindOneHour,
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
      voiceError,
      parsedEvent,
      voiceTranscript,
      processingLabel,
      settings,
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
