// ConfirmScreen.tsx — revisão do evento extraído da voz antes de confirmar.
import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../context/AppContext';
import { GradientBackground, GradientButton, OutlineButton, CategoryBadge } from '../components/ui';
import { isoToFriendly } from '../utils/appointmentUtils';

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View className="flex-row items-center justify-between py-3.5" style={{ borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
      <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 13, color: colors.muted }}>{label}</Text>
      <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 14, color: colors.ink, textAlign: 'right' }}>{value}</Text>
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
        <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 22, color: colors.ink }}>Confirme o compromisso</Text>
        <View style={{ marginTop: 10 }}>
          <CategoryBadge category={parsed.category} />
        </View>
        <View
          className="mt-3.5 rounded-[14px] border bg-surface px-3.5 py-3"
          style={{ borderColor: colors.hairline }}
        >
          <Text style={{ fontFamily: 'Manrope', fontStyle: 'italic', fontSize: 13, lineHeight: 20, color: colors.muted }}>“{voiceTranscriptFull}”</Text>
        </View>

        <View className="mt-4 rounded-[20px] border bg-surface px-4 py-1.5" style={{ borderColor: colors.hairline, shadowColor: colors.accent, shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } }}>
          <Row label="Título" value={parsed.title} />
          <Row label="Detalhes" value={parsed.specialty} />
          <Row label="Data" value={dateLabel} />
          <Row label="Horário" value={parsed.time} />
          <View className="flex-row items-center justify-between py-3.5">
            <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 13, color: colors.muted }}>Local</Text>
            <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 14, color: colors.ink, textAlign: 'right' }}>{parsed.location}</Text>
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
