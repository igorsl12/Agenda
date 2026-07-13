// ConfirmScreen.tsx — revisão do evento extraído da voz antes de confirmar.
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../context/AppContext';
import { GradientBackground, GradientButton, OutlineButton, CategoryBadge } from '../components/ui';
import { isoToFriendly } from '../utils/appointmentUtils';

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between py-3.5" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(16,27,54,0.06)' }}>
      <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 13, color: '#64748B' }}>{label}</Text>
      <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 14, color: '#101B36', textAlign: 'right' }}>{value}</Text>
    </View>
  );
}

export function ConfirmScreen() {
  const { colors } = useTheme();
  const { parsed, voiceTranscriptFull, confirmVoiceEvent, editVoiceEvent } = useApp();
  const dateLabel = parsed.date || isoToFriendly(parsed.dateISO);

  return (
    <GradientBackground>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 64, paddingHorizontal: 24, paddingBottom: 28 }}>
        <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 22, color: '#101B36' }}>Confirme o compromisso</Text>
        <View style={{ marginTop: 10 }}>
          <CategoryBadge category={parsed.category} />
        </View>
        <View
          className="mt-3.5 rounded-[14px] border bg-surface px-3.5 py-3"
          style={{ borderColor: 'rgba(59,130,246,0.10)' }}
        >
          <Text style={{ fontFamily: 'Manrope', fontStyle: 'italic', fontSize: 13, lineHeight: 20, color: '#64748B' }}>“{voiceTranscriptFull}”</Text>
        </View>

        <View className="mt-4 rounded-[20px] border bg-surface px-4 py-1.5" style={{ borderColor: 'rgba(59,130,246,0.06)', shadowColor: colors.accent, shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } }}>
          <Row label="Título" value={parsed.title} />
          <Row label="Especialidade" value={parsed.specialty} />
          <Row label="Data" value={dateLabel} />
          <Row label="Horário" value={parsed.time} />
          <View className="flex-row items-center justify-between py-3.5">
            <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 13, color: '#64748B' }}>Local</Text>
            <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 14, color: '#101B36', textAlign: 'right' }}>{parsed.location}</Text>
          </View>
        </View>

        <View style={{ flex: 1 }} />
        <View className="mt-5 flex-row" style={{ gap: 12 }}>
          <OutlineButton label="Editar" onPress={editVoiceEvent} flex={1} />
          <GradientButton label="Confirmar" onPress={confirmVoiceEvent} flex={1.4} />
        </View>
      </ScrollView>
    </GradientBackground>
  );
}
