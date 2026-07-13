// voiceService.ts — simulação de entrada por voz (mock) para o protótipo.
//
// No protótipo real, aqui entraria expo-av + Whisper. Mantemos um mock que
// devolve, palavra por palavra, uma transcrição fictícia para reproduzir o
// efeito de "ouvindo" do design.
import type { ParsedAppointment } from '../types';
import { isoInDays } from '../utils/appointmentUtils';

const TRANSCRIPT =
  'Marca uma prova de Cálculo II quinta-feira às oito da manhã, no bloco B, sala 204';

const PARSED: ParsedAppointment = {
  title: 'Prova de Cálculo II',
  specialty: 'Cálculo II',
  date: 'Quinta-feira, 18 de julho',
  dateISO: isoInDays(2),
  time: '08:00',
  location: 'Bloco B, sala 204',
  notes: '',
  category: 'faculdade',
};

export const voiceService = {
  /** Transcrição completa (usada na tela de confirmação). */
  fullTranscript(): string {
    return TRANSCRIPT;
  },

  /** Palavras da transcrição (para animação de digitação). */
  words(): string[] {
    return TRANSCRIPT.split(' ');
  },

  /** Devolve o evento estruturado extraído da fala (mock). */
  extractEvent(): ParsedAppointment {
    return PARSED;
  },
};
