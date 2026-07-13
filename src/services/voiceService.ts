// voiceService.ts — simulação de entrada por voz (mock) para o protótipo.
//
// No protótipo real, aqui entraria expo-av + Whisper. Mantemos um mock que
// devolve, palavra por palavra, uma transcrição fictícia para reproduzir o
// efeito de "ouvindo" do design.
import type { ParsedAppointment } from '../types';
import { isoInDays } from '../utils/appointmentUtils';

const TRANSCRIPT =
  'Marca uma consulta com o Dr. Ricardo, dermatologista, quinta-feira às quatro da tarde, na Clínica Vida Saudável';

const PARSED: ParsedAppointment = {
  title: 'Dr. Ricardo Alves',
  specialty: 'Dermatologista',
  date: 'Quinta-feira, 18 de julho',
  dateISO: isoInDays(2),
  time: '16:00',
  location: 'Clínica Vida Saudável',
  notes: '',
  category: 'saude',
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
