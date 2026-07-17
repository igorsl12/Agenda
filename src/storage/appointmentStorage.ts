// appointmentStorage.ts — persistência local de compromissos via AsyncStorage.
// Usado apenas no modo local (sem login). Quando há sessão, os compromissos
// vivem no banco, escopados por usuário (ver appointmentApi.ts) — este cache
// NÃO deve semear dados de demonstração, senão eles vazam para contas novas.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Appointment } from '../types';

const KEY = 'agenda.appointments';

/** Preenche `category` em registros salvos antes desse campo existir. */
function withCategoryFallback(list: Appointment[]): Appointment[] {
  return list.map((a) => (a.category ? a : { ...a, category: 'outro' }));
}

/** Carrega os compromissos salvos no dispositivo. Vazio quando não há nada. */
export async function loadAppointments(): Promise<Appointment[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? withCategoryFallback(parsed as Appointment[])
      : [];
  } catch (err) {
    console.warn('[storage] falha ao carregar:', err);
    return [];
  }
}

/** Sobrescreve a lista de compromissos. Fire-and-forget tolerante a erros. */
export async function saveAppointments(list: Appointment[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('[storage] falha ao salvar:', err);
  }
}

/** Remove todos os compromissos locais (usado após migração para a nuvem). */
export async function clearAppointments(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (err) {
    console.warn('[storage] falha ao limpar:', err);
  }
}
