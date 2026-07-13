// HistoryScreen.tsx — histórico de consultas com filtro de status e busca.
import React from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../context/AppContext';
import { GradientBackground } from '../components/ui';
import { AppointmentCard } from '../components/AppointmentCard';
import { BottomNav } from '../components/BottomNav';
import { cn } from '../utils/cn';

const FILTERS: { key: 'todas' | 'Confirmado' | 'Pendente'; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'Confirmado', label: 'Confirmadas' },
  { key: 'Pendente', label: 'Pendentes' },
];

export function HistoryScreen() {
  const { colors } = useTheme();
  const {
    historyFiltered,
    historyFilter,
    setHistoryFilter,
    selectAppointment,
    setTabHome,
  } = useApp();
  const [query, setQuery] = React.useState('');

  const results = query.trim()
    ? historyFiltered.filter(
        (a) =>
          a.title.toLowerCase().includes(query.toLowerCase()) ||
          a.specialty.toLowerCase().includes(query.toLowerCase()) ||
          a.location.toLowerCase().includes(query.toLowerCase()),
      )
    : historyFiltered;

  return (
    <GradientBackground>
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-6 pb-2" style={{ paddingTop: 64 }}>
          <Pressable onPress={setTabHome} accessibilityRole="button" accessibilityLabel="Voltar">
            <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 15, color: colors.accent }}>Início</Text>
          </Pressable>
          <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 18, color: '#101B36' }}>Histórico</Text>
          <View style={{ width: 40 }} />
        </View>

        <View className="px-6 pt-1 pb-2">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por título, especialidade ou local"
            placeholderTextColor="#AAB4C4"
            className="h-12 rounded-[14px] border bg-surface px-3.5"
            style={{ borderColor: 'rgba(59,130,246,0.18)', fontFamily: 'Manrope', fontSize: 14, color: colors.ink }}
          />
        </View>

        <View className="flex-row gap-2 px-6 pb-3">
          {FILTERS.map((f) => {
            const active = historyFilter === f.key;
            return (
              <Pressable
                key={f.key}
                onPress={() => setHistoryFilter(f.key)}
                className={cn('items-center justify-center rounded-full border px-4', active ? 'bg-accent border-accent' : 'bg-surface border-hairline')}
                style={{ height: 36 }}
                accessibilityRole="button"
                accessibilityLabel={f.label}
              >
                <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 13, color: active ? '#fff' : colors.muted }}>{f.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 4, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {results.length === 0 ? (
            <View className="mt-16 items-center px-8">
              <Text style={{ fontFamily: 'Manrope', fontSize: 14, color: '#64748B', textAlign: 'center' }}>
                Nenhuma consulta encontrada.
              </Text>
            </View>
          ) : (
            results.map((appt) => (
              <AppointmentCard key={appt.id} appt={appt} onPress={() => selectAppointment(appt.id)} />
            ))
          )}
        </ScrollView>

        <BottomNav />
      </View>
    </GradientBackground>
  );
}
