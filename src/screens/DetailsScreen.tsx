// DetailsScreen.tsx — detalhes de um compromisso + ações editar/excluir.
import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../context/AppContext';
import { GradientBackground, OutlineButton, Avatar, ConfirmDialog } from '../components/ui';
import { BackIcon, ClockIcon, LocationIcon, CalendarIcon } from '../components/icons';
import { statusStyle, categoryStyle, isoToFriendly, mixWithBase } from '../utils/appointmentUtils';

export function DetailsScreen() {
  const { colors, isDark } = useTheme();
  const { current, goHome, openEditExisting, deleteSelected } = useApp();
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  if (!current) {
    return (
      <GradientBackground>
        <View className="flex-1 items-center justify-center">
          <Text style={{ fontFamily: 'Manrope', color: colors.muted }}>Compromisso não encontrado.</Text>
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
            style={{ width: 36, height: 36, shadowColor: colors.ink, shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <BackIcon color={colors.ink} />
          </Pressable>
          <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 19, color: colors.ink }}>Detalhes do compromisso</Text>
        </View>

        <View className="flex-1 px-6" style={{ paddingTop: 16, paddingBottom: 12, gap: 16 }}>
          {/* Cabeçalho do cartão */}
          <View className="items-center rounded-[20px] border bg-surface p-5" style={{ gap: 8, borderColor: colors.hairline, shadowColor: colors.accent, shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } }}>
            <Avatar initials={current.initials} color={current.color} size={64} />
            <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 18, color: colors.ink, marginTop: 6, textAlign: 'center' }}>{current.title}</Text>
            <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 13.5, color: colors.muted }}>{current.specialty}</Text>
            <View className="flex-row" style={{ gap: 8, marginTop: 4 }}>
              <View style={{ backgroundColor: isDark ? mixWithBase(bg, colors.bg, 0.72) : bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 11, color }}>{current.status}</Text>
              </View>
              <View style={{ backgroundColor: isDark ? mixWithBase(cat.bg, colors.bg, 0.72) : cat.bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
                <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 11, color: cat.color }}>{cat.label}</Text>
              </View>
            </View>
          </View>

          {/* Dados */}
          <View className="rounded-[20px] border bg-surface px-4 py-1.5" style={{ borderColor: colors.hairline, shadowColor: colors.accent, shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } }}>
            <View className="flex-row items-center gap-3 py-3.5" style={{ borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
              <CalendarIcon />
              <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 14, color: colors.ink, flexShrink: 1, flexWrap: 'wrap' }}>{current.date || isoToFriendly(current.dateISO)}</Text>
            </View>
            <View className="flex-row items-center gap-3 py-3.5" style={{ borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
              <ClockIcon />
              <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 14, color: colors.ink }}>{current.time}</Text>
            </View>
            <View className="flex-row items-center gap-3 py-3.5">
              <LocationIcon />
              <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 14, color: colors.ink, flexShrink: 1, flexWrap: 'wrap' }}>{current.location}</Text>
            </View>
          </View>

          {current.notes ? (
            <View className="rounded-[20px] border bg-surface px-4 py-4" style={{ borderColor: colors.hairline, shadowColor: colors.accent, shadowOpacity: 0.08, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } }}>
              <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 12, color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.4 }}>Notas</Text>
              <Text numberOfLines={2} style={{ fontFamily: 'Manrope', fontWeight: '500', fontSize: 14, color: colors.ink, marginTop: 6, lineHeight: 21 }}>{current.notes}</Text>
            </View>
          ) : null}
        </View>

        {/* Ações fixas (sempre visíveis, fora do scroll) */}
        <View className="px-6 pb-6 pt-3 flex-col" style={{ gap: 10, borderTopWidth: 1, borderTopColor: colors.hairline }}>
          <OutlineButton label="Editar compromisso" onPress={() => openEditExisting(current?.id)} />
          <Pressable onPress={() => setConfirmingDelete(true)} className="items-center justify-center" style={{ height: 44 }} accessibilityRole="button" accessibilityLabel="Excluir compromisso">
            <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 14, color: '#DC4C4C' }}>Excluir compromisso</Text>
          </Pressable>
        </View>
      </View>

      <ConfirmDialog
        visible={confirmingDelete}
        title="Excluir compromisso"
        message={`Excluir "${current.title}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        danger
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={() => {
          setConfirmingDelete(false);
          deleteSelected(current.id);
        }}
      />
    </GradientBackground>
  );
}
