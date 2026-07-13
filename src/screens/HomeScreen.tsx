// HomeScreen.tsx — lista de consultas (tela principal "Início").
import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../context/AppContext';
import { GradientBackground } from '../components/ui';
import { AppointmentCard } from '../components/AppointmentCard';
import { BottomNav } from '../components/BottomNav';
import { PlusIcon } from '../components/icons';

export function HomeScreen() {
  const { colors } = useTheme();
  const { appointments, selectAppointment, openAddNew, appointmentCountLabel, userName } = useApp();

  return (
    <GradientBackground>
      <View className="flex-1">
        {/* Header */}
        <View className="flex-row items-start justify-between px-6 pt-16 pb-1" style={{ paddingTop: 64 }}>
          <View>
            <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 14, color: '#64748B' }}>
              Olá, {userName}
            </Text>
            <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 24, color: '#101B36', marginTop: 2 }}>
              Sua agenda
            </Text>
          </View>
          <Pressable
            onPress={openAddNew}
            className="items-center justify-center rounded-[14px] border bg-white"
            style={{ width: 40, height: 40, borderColor: 'rgba(59,130,246,0.15)', shadowColor: colors.accent, shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}
            accessibilityRole="button"
            accessibilityLabel="Adicionar consulta"
          >
            <PlusIcon color={colors.accent} />
          </Pressable>
        </View>

        {/* Label de contagem */}
        <View className="px-6 py-2">
          <View
            className="flex-row items-center self-start gap-1.5 rounded-full border bg-white px-3.5 py-2"
            style={{ borderColor: 'rgba(59,130,246,0.15)' }}
          >
            <View style={{ width: 14, height: 14, borderRadius: 4, borderWidth: 1.5, borderColor: colors.accent }} />
            <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 13, color: colors.accent }}>
              {appointmentCountLabel}
            </Text>
          </View>
        </View>

        {/* Lista */}
        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 8, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {appointments.length === 0 ? (
            <View className="mt-20 items-center px-8">
              <Text style={{ fontFamily: 'Manrope', fontSize: 15, color: '#64748B', textAlign: 'center' }}>
                Nenhuma consulta ainda. Toque no microfone e dite sua consulta.
              </Text>
            </View>
          ) : (
            appointments.map((appt) => (
              <AppointmentCard key={appt.id} appt={appt} onPress={() => selectAppointment(appt.id)} />
            ))
          )}
        </ScrollView>

        <BottomNav />
      </View>
    </GradientBackground>
  );
}
