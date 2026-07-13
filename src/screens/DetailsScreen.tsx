// DetailsScreen.tsx — detalhes de um compromisso + ações editar/cancelar.
import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../context/AppContext';
import { GradientBackground, OutlineButton, Avatar } from '../components/ui';
import { BackIcon, ClockIcon, LocationIcon, CalendarIcon } from '../components/icons';
import { statusStyle, categoryStyle, isoToFriendly } from '../utils/appointmentUtils';

export function DetailsScreen() {
  const { colors } = useTheme();
  const { current, goHome, openEditExisting, deleteSelected } = useApp();

  if (!current) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center">
          <Text style={{ fontFamily: 'Manrope', color: '#64748B' }}>Compromisso não encontrado.</Text>
        </View>
      </GradientBackground>
    );
  }

  const { bg, color } = statusStyle(current.status);
  const cat = categoryStyle(current.category);

  return (
    <GradientBackground>
      <View className="flex-1">
        <View className="flex-row items-center gap-3.5 px-6" style={{ paddingTop: 64, paddingBottom: 8 }}>
          <Pressable
            onPress={goHome}
            className="items-center justify-center rounded-full bg-surface"
            style={{ width: 36, height: 36, shadowColor: '#101B36', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <BackIcon color={colors.ink} />
          </Pressable>
          <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 19, color: colors.ink }}>Detalhes do compromisso</Text>
        </View>

        <View className="flex-1 px-6" style={{ paddingTop: 16, paddingBottom: 12, gap: 16 }}>
          {/* Cabeçalho do cartão */}
          <View className="items-center rounded-[20px] border bg-surface p-5" style={{ gap: 8, borderColor: 'rgba(59,130,246,0.06)', shadowColor: colors.accent, shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } }}>
            <Avatar initials={current.initials} color={current.color} size={64} />
            <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 18, color: colors.ink, marginTop: 6, textAlign: 'center' }}>{current.title}</Text>
            <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 13.5, color: colors.muted }}>{current.specialty}</Text>
            <View className="flex-row" style={{ gap: 8, marginTop: 4 }}>
              <View style={{ backgroundColor: bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 11, color }}>{current.status}</Text>
              </View>
              <View style={{ backgroundColor: cat.bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 11, color: cat.color }}>{cat.label}</Text>
              </View>
            </View>
          </View>

          {/* Dados */}
          <View className="rounded-[20px] border bg-surface px-4 py-1.5" style={{ borderColor: 'rgba(59,130,246,0.06)', shadowColor: colors.accent, shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } }}>
            <View className="flex-row items-center gap-3 py-3.5" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(16,27,54,0.06)' }}>
              <CalendarIcon />
              <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 14, color: colors.ink, flexShrink: 1, flexWrap: 'wrap' }}>{current.date || isoToFriendly(current.dateISO)}</Text>
            </View>
            <View className="flex-row items-center gap-3 py-3.5" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(16,27,54,0.06)' }}>
              <ClockIcon />
              <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 14, color: colors.ink }}>{current.time}</Text>
            </View>
            <View className="flex-row items-center gap-3 py-3.5">
              <LocationIcon />
              <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 14, color: colors.ink, flexShrink: 1, flexWrap: 'wrap' }}>{current.location}</Text>
            </View>
          </View>

          {current.notes ? (
            <View className="rounded-[20px] border bg-surface px-4 py-4" style={{ borderColor: 'rgba(59,130,246,0.06)', shadowColor: colors.accent, shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } }}>
              <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>Notas</Text>
              <Text numberOfLines={2} style={{ fontFamily: 'Manrope', fontWeight: '500', fontSize: 14, color: colors.ink, marginTop: 6, lineHeight: 21 }}>{current.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Ações fixas (sempre visíveis, fora do scroll) */}
        <View className="px-6 pb-6 pt-3 flex-col" style={{ gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(59,130,246,0.08)' }}>
          <OutlineButton label="Editar compromisso" onPress={() => openEditExisting(current?.id)} />
          <Pressable onPress={() => deleteSelected(current?.id)} className="items-center justify-center" style={{ height: 44 }} accessibilityRole="button" accessibilityLabel="Cancelar compromisso">
            <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 14, color: '#DC4C4C' }}>Cancelar compromisso</Text>
          </Pressable>
        </View>
      </View>
    </GradientBackground>
  );
}
