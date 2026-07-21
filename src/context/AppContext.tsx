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
import { BackHandler, Platform } from 'react-native';
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
import { useAuth } from './AuthContext';
import {
  fetchAppointments,
  createAppointment,
  updateAppointment,
  deleteAppointment,
} from '../storage/appointmentApi';
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
  goBack: () => boolean;
  setTabHome: () => void;
  setTabAgenda: () => void;
  setTabPerfil: () => void;
  openHistory: () => void;
  // compromissos
  selectAppointment: (id: string) => void;
  openAddNew: () => void;
  openEditExisting: (id?: string) => void;
  deleteSelected: (id?: string) => void;
  // seleção múltipla
  selectionMode: boolean;
  selectedIds: string[];
  startSelection: (id: string) => void;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  deleteSelectedMany: () => void;
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
  // Seleção múltipla (long-press na Home) para excluir vários de uma vez.
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
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
  // Fluxo real: só vira true quando o microfone está capturando de fato, para
  // a UI não pedir "fale" (nem liberar "Concluir") antes de estar gravando.
  const [micReady, setMicReady] = useState(false);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Auth: quando logado, compromissos vivem no banco (escopados por usuário);
  // sem login, no AsyncStorage do dispositivo.
  const { isAuthed, user } = useAuth();
  const isAuthedRef = useRef(isAuthed);
  isAuthedRef.current = isAuthed;
  // Espelho do usuário logado para uso dentro de efeitos assíncronos.
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Preferências locais ao dispositivo. A saudação/perfil, porém, refletem a
      // conta logada: aplicamos o nome da conta ATOMICAMENTE aqui (num único
      // setSettings), senão uma corrida sobrescreveria o nome com o default local.
      const loadedSettings = await loadSettings();
      const account = userRef.current;
      const effectiveSettings =
        isAuthed && account?.name?.trim()
          ? { ...loadedSettings, userName: account.name.trim() }
          : loadedSettings;
      if (!cancelled) setSettings(effectiveSettings);

      if (isAuthed) {
        try {
          // Cada conta vê apenas os seus compromissos — nada de seeds de
          // demonstração nem de dados de outra conta no mesmo navegador.
          const remote = await fetchAppointments();
          if (!cancelled) {
            setAppointments(remote);
            setLoading(false);
          }
        } catch {
          // Falha de rede: conta logada não usa cache local — mostra vazio.
          if (!cancelled) {
            setAppointments([]);
            setLoading(false);
          }
        }
        return;
      }

      // Modo local (sem login): usa apenas o cache do dispositivo.
      const list = await loadAppointments();
      if (!cancelled) {
        setAppointments(list);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthed]);

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
  // Pilha de histórico: cada transição de tela guarda o par {screen, tab} de
  // onde veio, para que "voltar" (botão da UI ou botão físico do Android)
  // restaure EXATAMENTE a tela E a aba anteriores — sem cair na Home com o
  // ícone de outra aba selecionado.
  type NavEntry = { screen: ScreenName; tab: TabName };
  const historyRef = useRef<NavEntry[]>([]);
  // Espelhos vivos de screen/tab para leitura dentro de closures (BackHandler).
  const screenRef = useRef(screen);
  screenRef.current = screen;
  const tabRef = useRef(tab);
  tabRef.current = tab;
  const MAX_HISTORY = 50;

  /** Empilha o estado atual e navega para a nova tela (opcionalmente aba). */
  const push = (nextScreen: ScreenName, nextTab?: TabName) => {
    // Evita empilhar navegações redundantes (tocar na aba já ativa, etc.).
    if (
      screenRef.current === nextScreen &&
      (nextTab === undefined || tabRef.current === nextTab)
    ) {
      return;
    }
    const stack = historyRef.current;
    stack.push({ screen: screenRef.current, tab: tabRef.current });
    if (stack.length > MAX_HISTORY) stack.shift();
    setScreen(nextScreen);
    if (nextTab !== undefined) setTab(nextTab);
  };
  /** Troca a tela atual sem empilhar (a anterior não deve ser revisitada). */
  const replace = (nextScreen: ScreenName, nextTab?: TabName) => {
    setScreen(nextScreen);
    if (nextTab !== undefined) setTab(nextTab);
  };
  /** Zera o histórico e vai para uma tela raiz (fim de fluxo). */
  const resetTo = (nextScreen: ScreenName, nextTab?: TabName) => {
    historyRef.current = [];
    setScreen(nextScreen);
    if (nextTab !== undefined) setTab(nextTab);
  };
  /** Desempilha e restaura tela+aba. Retorna false se não havia para onde voltar. */
  const goBack = (): boolean => {
    const prev = historyRef.current.pop();
    if (!prev) return false;
    setScreen(prev.screen);
    setTab(prev.tab);
    return true;
  };

  const goOnboardNext = () => resetTo('home', 'home');
  const goHome = () => resetTo('home', 'home');
  const setTabHome = () => push('home', 'home');
  const setTabAgenda = () => push('agenda', 'agenda');
  const setTabPerfil = () => push('perfil', 'perfil');
  const openHistory = () => push('historico', 'historico');

  // ---- persistência híbrida (banco quando logado, AsyncStorage offline) ----
  /** Cria no banco se logado; senão retorna o próprio (fica local). */
  const persistCreate = async (appt: Appointment): Promise<Appointment> => {
    if (!isAuthedRef.current) return appt;
    try {
      return await createAppointment({
        title: appt.title,
        specialty: appt.specialty,
        dateISO: appt.dateISO,
        time: appt.time,
        location: appt.location,
        notes: appt.notes || '',
        status: appt.status,
        category: appt.category,
        color: appt.color,
        initials: appt.initials,
      });
    } catch {
      return appt; // offline: mantém local
    }
  };
  /** Atualiza no banco se logado; senão retorna o próprio. */
  const persistUpdate = async (
    id: string,
    appt: Appointment,
  ): Promise<Appointment> => {
    if (!isAuthedRef.current) return appt;
    try {
      return await updateAppointment(id, {
        title: appt.title,
        specialty: appt.specialty,
        dateISO: appt.dateISO,
        time: appt.time,
        location: appt.location,
        notes: appt.notes || '',
        status: appt.status,
        category: appt.category,
        color: appt.color,
        initials: appt.initials,
      });
    } catch {
      return appt;
    }
  };
  /** Remove no banco se logado (silencioso se offline). */
  const persistDelete = async (id: string): Promise<void> => {
    if (!isAuthedRef.current) return;
    try {
      await deleteAppointment(id);
    } catch {
      /* mantém local */
    }
  };

  // ---- compromissos ----
  const selectAppointment = (id: string) => {
    setSelectedId(id);
    // Mantém a aba atual (agenda/histórico/home): voltar retorna para ela.
    push('details');
  };
  const openAddNew = () => {
    setEditMode('new');
    setForm(blankForm());
    push('edit');
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
    push('edit');
  };
  const deleteSelected = async (id?: string) => {
    const appt =
      appointments.find((a) => a.id === (id ?? selectedId)) ||
      current;
    if (!appt) return;
    const next = appointments.filter((a) => a.id !== appt.id);
    setAppointments(next);
    if (!isAuthedRef.current) saveAppointments(next);
    await persistDelete(appt.id);
    setSelectedId(null);
    // Item removido: volta para a Home limpando o histórico (não faz sentido
    // "voltar" para os detalhes de algo que não existe mais).
    resetTo('home', 'home');
  };

  // ---- seleção múltipla ----
  const startSelection = (id: string) => {
    setSelectionMode(true);
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id];
      if (next.length === 0) setSelectionMode(false);
      return next;
    });
  };
  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedIds([]);
  };
  /** Exclui todos os compromissos selecionados de uma vez. */
  const deleteSelectedMany = async () => {
    const ids = selectedIds;
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    const next = appointments.filter((a) => !idSet.has(a.id));
    setAppointments(next);
    if (!isAuthedRef.current) saveAppointments(next);
    clearSelection();
    await Promise.all(ids.map((id) => persistDelete(id)));
  };

  const saveForm = async () => {
    const dateISO = form.dateISO || isoInDays(0);
    const dateFriendly = form.date || isoToFriendly(dateISO);
    if (editMode === 'edit-existing' && selectedId) {
      const base =
        appointments.find((a) => a.id === selectedId) || current;
      const updated: Appointment = {
        ...(base as Appointment),
        ...form,
        dateISO,
        date: dateFriendly,
      };
      const saved = await persistUpdate(selectedId, updated);
      const next = appointments.map((a) =>
        a.id === selectedId ? saved : a,
      );
      setAppointments(next);
      if (!isAuthedRef.current) saveAppointments(next);
      // Entrar no form empilhou {details, aba de origem}; voltar para os
      // detalhes consome exatamente essa entrada, mantendo a aba de origem
      // logo abaixo na pilha (voltar de novo leva à agenda/histórico).
      if (!goBack()) resetTo('details');
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
      const saved = await persistCreate(created);
      const next = [saved, ...appointments];
      setAppointments(next);
      if (!isAuthedRef.current) saveAppointments(next);
      resetTo('home', 'home');
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
      replace('confirm');
    }, revealDone + 1300);
    timers.current.push(t3);
  };

  /** Fluxo real: grava o microfone até o usuário tocar em "Concluir". */
  const startVoiceReal = async () => {
    try {
      await startRecording();
      setMicReady(true);
    } catch (err: unknown) {
      setVoiceError(
        err instanceof Error ? err.message : 'Falha ao acessar o microfone.',
      );
    }
  };

  const startVoice = () => {
    clearTimers();
    setVoiceError(null);
    setMicReady(false);
    setListenPhase('listening');
    setTranscriptShown('');
    if (screenRef.current !== 'listening') push('listening');
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
    // Volta para a tela de onde a gravação foi iniciada (home/agenda/etc).
    if (!goBack()) resetTo('home', 'home');
  };

  /** Mock: pula direto para a confirmação. Real: para de gravar e processa. */
  const advanceNow = () => {
    clearTimers();
    if (IS_MOCK) {
      setParsedEvent(voiceService.extractEvent());
      setVoiceTranscript(voiceService.fullTranscript());
      // Substitui 'listening' (tela transitória) por 'confirm' no lugar.
      replace('confirm');
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
        replace('confirm');
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

  const confirmVoiceEvent = async () => {
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
    const saved = await persistCreate(created);
    const next = [saved, ...appointments];
    setAppointments(next);
    if (!isAuthedRef.current) saveAppointments(next);
    setParsedEvent(null);
    resetTo('home', 'home');
  };
  const editVoiceEvent = () => {
    setEditMode('voice-edit');
    setForm({ ...(parsedEvent ?? voiceService.extractEvent()) });
    push('edit');
  };
  const backFromEdit = () => {
    // Volta para a tela anterior real (detalhes, confirmação ou aba de origem).
    if (!goBack()) resetTo('home', 'home');
  };

  // Botão físico "voltar" do Android: sem isto o sistema fecha o app em vez de
  // voltar uma tela. Registrado uma única vez; usa refs para ler o estado atual.
  // Só no nativo — na web o BackHandler é um stub que apenas loga erro.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const onHardwareBack = (): boolean => {
      const s = screenRef.current;
      // Na tela de voz, "voltar" equivale a cancelar (descarta a gravação).
      if (s === 'listening') {
        cancelVoice();
        return true;
      }
      if (goBack()) return true;
      // Sem histórico: se não estiver na Home, vai para ela; senão deixa o
      // sistema fechar o app (comportamento esperado na tela raiz).
      if (s !== 'home') {
        resetTo('home', 'home');
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener(
      'hardwareBackPress',
      onHardwareBack,
    );
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      goBack,
      setTabHome,
      setTabAgenda,
      setTabPerfil,
      openHistory,
      selectAppointment,
      openAddNew,
      openEditExisting,
      deleteSelected,
      selectionMode,
      selectedIds,
      startSelection,
      toggleSelection,
      clearSelection,
      deleteSelectedMany,
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
            : micReady
              ? 'Gravando... fale o compromisso'
              : 'Preparando o microfone...'
          : IS_MOCK
            ? 'Processando...'
            : processingLabel,
      showManualAdvance:
        !IS_MOCK && listenPhase === 'listening' && micReady && !voiceError,
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
      selectionMode,
      selectedIds,
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
      micReady,
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
