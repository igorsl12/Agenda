// HomeScreen.tsx — lista de compromissos (tela principal "Início").
import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../context/AppContext';
import { GradientBackground, ConfirmDialog } from '../components/ui';
import { AppointmentCard } from '../components/AppointmentCard';
import { BottomNav } from '../components/BottomNav';
import { PlusIcon, CloseIcon } from '../components/icons';

export function HomeScreen() {
  const { colors } = useTheme();
  const {
    appointments,
    selectAppointment,
    openAddNew,
    appointmentCountLabel,
    userName,
    selectionMode,
    selectedIds,
    startSelection,
    toggleSelection,
    clearSelection,
    deleteSelectedMany,
  } = useApp();
  const [confirmingBulk, setConfirmingBulk] = React.useState(false);

  const count = selectedIds.length;

  return (
    <GradientBackground>
      <View className="flex-1">
        {/* Header — normal ou barra de seleção */}
        {selectionMode ? (
          <View className="flex-row items-center justify-between px-6 pb-1" style={{ paddingTop: 64 }}>
            <Pressable
              onPress={clearSelection}
              className="items-center justify-center rounded-full bg-surface"
              style={{ width: 36, height: 36 }}
              accessibilityRole="button"
              accessibilityLabel="Cancelar seleção"
            >
              <CloseIcon color={colors.ink} />
            </Pressable>
            <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 17, color: colors.ink }}>
              {count} selecionado{count === 1 ? '' : 's'}
            </Text>
            <Pressable
              onPress={() => setConfirmingBulk(true)}
              disabled={count === 0}
              accessibilityRole="button"
              accessibilityLabel="Excluir selecionados"
            >
              <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 15, color: '#DC4C4C', opacity: count === 0 ? 0.4 : 1 }}>
                Excluir
              </Text>
            </Pressable>
          </View>
        ) : (
          <View className="flex-row items-start justify-between px-6 pt-16 pb-1" style={{ paddingTop: 64 }}>
            <View>
              <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 14, color: colors.muted }}>
                Olá, {userName}
              </Text>
              <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 24, color: colors.ink, marginTop: 2 }}>
                Sua agenda
              </Text>
            </View>
            <Pressable
              onPress={openAddNew}
              className="items-center justify-center rounded-[14px] border bg-surface"
              style={{ width: 40, height: 40, borderColor: colors.hairline, shadowColor: colors.accent, shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}
              accessibilityRole="button"
              accessibilityLabel="Adicionar compromisso"
            >
              <PlusIcon color={colors.accent} />
            </Pressable>
          </View>
        )}

        {/* Label de contagem OU dica de seleção */}
        <View className="px-6 py-2">
          {selectionMode ? (
            <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 12.5, color: colors.muted }}>
              Toque nos compromissos para marcar ou desmarcar.
            </Text>
          ) : (
            <View
              className="flex-row items-center self-start gap-1.5 rounded-full border bg-surface px-3.5 py-2"
              style={{ borderColor: colors.hairline }}
            >
              <View style={{ width: 14, height: 14, borderRadius: 4, borderWidth: 1.5, borderColor: colors.accent }} />
              <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 13, color: colors.accent }}>
                {appointmentCountLabel}
              </Text>
            </View>
          )}
        </View>

        {/* Lista */}
        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 8, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {appointments.length === 0 ? (
            <View className="mt-20 items-center px-8">
              <Text style={{ fontFamily: 'Manrope', fontSize: 15, color: colors.muted, textAlign: 'center' }}>
                Nenhum compromisso ainda. Toque no microfone e dite seu compromisso.
              </Text>
            </View>
          ) : (
            appointments.map((appt) => (
              <AppointmentCard
                key={appt.id}
                appt={appt}
                selectionMode={selectionMode}
                selected={selectedIds.includes(appt.id)}
                onPress={() =>
                  selectionMode ? toggleSelection(appt.id) : selectAppointment(appt.id)
                }
                onLongPress={() => startSelection(appt.id)}
              />
            ))
          )}
        </ScrollView>

        <BottomNav />
      </View>

      <ConfirmDialog
        visible={confirmingBulk}
        title="Excluir compromissos"
        message={`Excluir ${count} compromisso${count === 1 ? '' : 's'}? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        danger
        onCancel={() => setConfirmingBulk(false)}
        onConfirm={() => {
          setConfirmingBulk(false);
          deleteSelectedMany();
        }}
      />
    </GradientBackground>
  );
}
