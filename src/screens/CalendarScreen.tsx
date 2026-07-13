// CalendarScreen.tsx — visão de calendário mensal (aba Agenda).
import React from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../context/AppContext';
import { GradientBackground } from '../components/ui';
import { AppointmentCard } from '../components/AppointmentCard';
import { BottomNav } from '../components/BottomNav';
import { ChevronRight } from '../components/icons';
import { isoToFriendly, fromISO, toISO, byDate } from '../utils/appointmentUtils';
import type { Appointment } from '../types';

const WEEK = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function CalendarScreen() {
  const { colors } = useTheme();
  const { appointments, selectAppointment, setTabHome } = useApp();
  const [month, setMonth] = React.useState(() => new Date());

  const year = month.getFullYear();
  const m = month.getMonth();
  const first = new Date(year, m, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, m + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(toISO(new Date(year, m, d)));
  while (cells.length % 7 !== 0) cells.push(null);

  const byDay = (iso: string) =>
    appointments.filter((a) => a.dateISO === iso).sort(byDate);

  const selectedISO = toISO(new Date());
  const dayAppts = byDay(selectedISO);

  const shift = (delta: number) => {
    const d = new Date(year, m + delta, 1);
    setMonth(d);
  };

  return (
    <GradientBackground>
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-6 pb-2" style={{ paddingTop: 64 }}>
          <Pressable onPress={setTabHome} accessibilityRole="button" accessibilityLabel="Voltar">
            <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 15, color: colors.accent }}>Início</Text>
          </Pressable>
          <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 18, color: '#101B36' }}>
            {MONTHS[m][0].toUpperCase() + MONTHS[m].slice(1)} {year}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <View className="px-6 pb-3">
          <View className="flex-row items-center justify-between rounded-[18px] border bg-surface px-3 py-2.5" style={{ borderColor: 'rgba(59,130,246,0.08)' }}>
            <Pressable onPress={() => shift(-1)} className="items-center justify-center rounded-full" style={{ width: 34, height: 34 }} accessibilityLabel="Mês anterior">
              <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 18, color: colors.accent }}>‹</Text>
            </Pressable>
            <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 14, color: '#64748B' }}>{MONTHS[m]} de {year}</Text>
            <Pressable onPress={() => shift(1)} className="items-center justify-center rounded-full" style={{ width: 34, height: 34 }} accessibilityLabel="Próximo mês">
              <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 18, color: colors.accent }}>›</Text>
            </Pressable>
          </View>
        </View>

        {/* Grade do calendário */}
        <View className="mx-6 rounded-[18px] border bg-surface px-2.5 py-3" style={{ borderColor: 'rgba(59,130,246,0.06)' }}>
          <View className="flex-row justify-between px-1 pb-1.5">
            {WEEK.map((w, i) => (
              <Text key={i} style={{ flex: 1, textAlign: 'center', fontFamily: 'Manrope', fontWeight: '700', fontSize: 11, color: '#9AA7BD' }}>{w}</Text>
            ))}
          </View>
          {Array.from({ length: Math.ceil(cells.length / 7) }).map((_, r) => (
            <View key={r} className="flex-row" style={{ marginBottom: 4 }}>
              {cells.slice(r * 7, r * 7 + 7).map((iso, c) => {
                if (!iso) return <View key={c} style={{ flex: 1 }} />;
                const has = byDay(iso).length > 0;
                const isToday = iso === selectedISO;
                const num = fromISO(iso).getDate();
                return (
                  <Pressable key={c} style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }} accessibilityLabel={`Dia ${num}`}>
                    <View style={{ width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: isToday ? colors.accent : 'transparent' }}>
                      <Text style={{ fontFamily: 'Manrope', fontWeight: isToday ? '800' : '600', fontSize: 13, color: isToday ? '#fff' : '#101B36' }}>{num}</Text>
                    </View>
                    {has ? <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: colors.accent, marginTop: 3 }} /> : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Lista do dia selecionado (hoje) */}
        <View className="px-6 pt-4 pb-1 flex-row items-center justify-between">
          <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 16, color: '#101B36' }}>Hoje</Text>
          <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 12, color: '#64748B' }}>{isoToFriendly(selectedISO)}</Text>
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 6, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {dayAppts.length === 0 ? (
            <View className="mt-10 items-center px-8">
              <Text style={{ fontFamily: 'Manrope', fontSize: 14, color: '#64748B', textAlign: 'center' }}>
                Nenhuma consulta hoje. Use o microfone para agendar.
              </Text>
            </View>
          ) : (
            dayAppts.map((appt: Appointment) => (
              <AppointmentCard key={appt.id} appt={appt} onPress={() => selectAppointment(appt.id)} />
            ))
          )}
        </ScrollView>

        <BottomNav />
      </View>
    </GradientBackground>
  );
}
