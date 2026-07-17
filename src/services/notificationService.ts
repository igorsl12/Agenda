// notificationService.ts — lembretes de compromisso.
//
// Nativo (iOS/Android): expo-notifications com agendamento local real,
// registrado no sistema — dispara mesmo com o app fechado.
// Web: Notification API do navegador + setTimeout. ATENÇÃO: no web o timer só
// roda enquanto a aba/app está aberta; quando o app é fechado o navegador
// suspende o timer e o lembrete NÃO dispara. Notificação em segundo plano na
// web exige Web Push (service worker + servidor) — não coberto aqui. Para
// lembretes confiáveis, use o build nativo.
//
// Estratégia de sincronização: em vez de rastrear ids por compromisso,
// cancela tudo e reagenda a partir da lista atual — simples e à prova
// de dessincronização.
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { SchedulableTriggerInputTypes } from 'expo-notifications';
import type { Appointment } from '../types';
import type { UserSettings } from '../storage/settingsStorage';
import { fromISO } from '../utils/appointmentUtils';

const ONE_HOUR_MS = 60 * 60 * 1000;

// Canal Android: sem um canal de alta importância o SO pode silenciar ou não
// exibir o heads-up. Necessário no Android 8+.
const ANDROID_CHANNEL_ID = 'reminders';

// Timers ativos no web (id → timeout).
const webTimers = new Map<string, ReturnType<typeof setTimeout>>();

// No Expo Go (SDK 53+) o módulo de notificações remotas foi removido e o
// agendamento nativo lança erro. Em development build ele funciona normalmente.
// Guardamos para não quebrar o app ao apenas visualizar a interface no Go.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

if (Platform.OS !== 'web') {
  // Exibe a notificação mesmo com o app em primeiro plano.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/** Cria/atualiza o canal de notificação do Android (idempotente). */
async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
      name: 'Lembretes de compromisso',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#2E6BF0',
    });
  } catch (err) {
    console.warn('[notifications] canal Android falhou:', err);
  }
}

// Registra o canal já no carregamento (não bloqueante).
void ensureAndroidChannel();

/** Data/hora efetiva do compromisso (dateISO + time HH:MM). */
export function appointmentDateTime(appt: Appointment): Date | null {
  if (!appt.dateISO) return null;
  const date = fromISO(appt.dateISO);
  const match = appt.time.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  } else {
    date.setHours(9, 0, 0, 0); // sem horário definido: assume 09:00
  }
  return date;
}

/** Pede permissão de notificação. Devolve true se concedida. */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === 'web') {
      if (typeof Notification === 'undefined') return false;
      if (Notification.permission === 'granted') return true;
      if (Notification.permission === 'denied') return false;
      return (await Notification.requestPermission()) === 'granted';
    }
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch (err) {
    console.warn('[notifications] permissão falhou:', err);
    return false;
  }
}

function reminderBody(appt: Appointment): string {
  const parts = [appt.title];
  if (appt.time) parts.push(`às ${appt.time}`);
  if (appt.location) parts.push(`— ${appt.location}`);
  return parts.join(' ');
}

async function cancelAll(): Promise<void> {
  if (Platform.OS === 'web') {
    webTimers.forEach((t) => clearTimeout(t));
    webTimers.clear();
    return;
  }
  await Notifications.cancelAllScheduledNotificationsAsync();
}

function scheduleWeb(id: string, title: string, body: string, fireAt: Date) {
  const delay = fireAt.getTime() - Date.now();
  if (delay <= 0) return;
  const timer = setTimeout(() => {
    webTimers.delete(id);
    try {
      new Notification(title, { body });
    } catch (err) {
      console.warn('[notifications] falha ao exibir:', err);
    }
  }, delay);
  webTimers.set(id, timer);
}

/**
 * Reagenda todos os lembretes a partir do estado atual.
 * Chame sempre que compromissos ou preferências mudarem.
 */
export async function syncAppointmentReminders(
  appointments: Appointment[],
  settings: UserSettings,
): Promise<void> {
  try {
    await cancelAll();
    if (!settings.notificationsEnabled) return;

    const granted = await ensureNotificationPermission();
    if (!granted) return;

    await ensureAndroidChannel();

    const now = Date.now();
    for (const appt of appointments) {
      const at = appointmentDateTime(appt);
      if (!at) continue;
      const fireAt = settings.remindOneHourBefore
        ? new Date(at.getTime() - ONE_HOUR_MS)
        : at;
      if (fireAt.getTime() <= now) continue;

      const title = 'Lembrete de compromisso';
      const body = reminderBody(appt);
      if (Platform.OS === 'web') {
        scheduleWeb(appt.id, title, body, fireAt);
      } else if (!IS_EXPO_GO) {
        await Notifications.scheduleNotificationAsync({
          content: { title, body, sound: 'default' },
          trigger: {
            type: SchedulableTriggerInputTypes.DATE,
            date: fireAt,
            channelId: Platform.OS === 'android' ? ANDROID_CHANNEL_ID : undefined,
          },
        });
      }
    }
  } catch (err) {
    console.warn('[notifications] sync falhou:', err);
  }
}
