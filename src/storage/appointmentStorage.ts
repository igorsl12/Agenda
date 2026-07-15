// appointmentStorage.ts — persistência local de compromissos via AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Appointment } from '../types';
import { isoInDays } from '../utils/appointmentUtils';

const KEY = 'agenda.appointments';
const SEED_FLAG = 'agenda.seeded.v1';

/**
 * Compromissos iniciais de demonstração — variados entre categorias para
 * deixar claro que a agenda não é só de consultas médicas.
 */
function seedAppointments(): Appointment[] {
  const base = [
    {
      title: 'Consulta com Dra. Fernanda Lima',
      specialty: 'Cardiologia',
      time: '09:30',
      location: 'Hospital Santa Casa',
      status: 'Confirmado' as const,
      category: 'saude' as const,
      notes: 'Levar exames anteriores e lista de medicamentos.',
      offset: 0,
    },
    {
      title: 'Prova de Cálculo II',
      specialty: 'Cálculo II',
      time: '08:00',
      location: 'Bloco B, sala 204',
      status: 'Pendente' as const,
      category: 'faculdade' as const,
      notes: 'Levar calculadora e caderno de fórmulas.',
      offset: 1,
    },
    {
      title: 'Treino de futebol',
      specialty: 'Futebol',
      time: '18:30',
      location: 'Quadra do bairro',
      status: 'Confirmado' as const,
      category: 'esporte' as const,
      notes: 'Levar chuteira e garrafa de água.',
      offset: 2,
    },
    {
      title: 'Retorno Dr. André Souza',
      specialty: 'Ortopedia',
      time: '14:30',
      location: 'Clínica Movimentar',
      status: 'Confirmado' as const,
      category: 'saude' as const,
      notes: 'Trazer raio-X do joelho.',
      offset: 3,
    },
  ];
  return base.map((b, i) => {
    const iso = isoInDays(b.offset);
    return {
      id: `seed-${i}`,
      title: b.title,
      specialty: b.specialty,
      date: '', // preenchido em runtime por isoToFriendly
      dateISO: iso,
      time: b.time,
      location: b.location,
      status: b.status,
      category: b.category,
      notes: b.notes,
      color: ['#DCEAFF', '#E9E4FF', '#FFE7DA', '#FCE7F3'][i % 4],
      initials: ['FL', 'CL', 'TF', 'AS'][i % 4],
    } as Appointment;
  });
}

/** Preenche `category` em registros salvos antes desse campo existir. */
function withCategoryFallback(list: Appointment[]): Appointment[] {
  return list.map((a) => (a.category ? a : { ...a, category: 'outro' }));
}

/** Carrega os compromissos salvos; seeds no primeiro launch. */
export async function loadAppointments(): Promise<Appointment[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? withCategoryFallback(parsed as Appointment[])
        : [];
    }
    // Primeiro launch: popula com seeds e persiste.
    const seeded = seedAppointments();
    await AsyncStorage.setItem(KEY, JSON.stringify(seeded));
    await AsyncStorage.setItem(SEED_FLAG, '1');
    return seeded;
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
