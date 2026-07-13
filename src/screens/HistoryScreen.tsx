// HistoryScreen.tsx — histórico de compromissos com filtro de status/categoria e busca.
import React from 'react';
import { View, Text, Pressable, ScrollView, TextInput } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../context/AppContext';
import { GradientBackground } from '../components/ui';
import { AppointmentCard } from '../components/AppointmentCard';
import { BottomNav } from '../components/BottomNav';
import { SearchOffIcon } from '../components/icons';
import { CATEGORY_LIST, categoryStyle } from '../utils/appointmentUtils';
import type { AppointmentCategory } from '../types';

const FILTERS: { key: 'todas' | 'Confirmado' | 'Pendente'; label: string }[] = [
  { key: 'todas', label: 'Todas' },
  { key: 'Confirmado', label: 'Confirmadas' },
  { key: 'Pendente', label: 'Pendentes' },
];

type CategoryFilter = 'todas' | AppointmentCategory;

function Chip({
  label,
  active,
  activeBg,
  activeColor,
  onPress,
}: {
  label: string;
  active: boolean;
  activeBg: string;
  activeColor: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      className="items-center justify-center rounded-full border px-4"
      style={{
        height: 34,
        backgroundColor: active ? activeBg : 'transparent',
        borderColor: active ? activeColor : 'rgba(16,27,54,0.12)',
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 12.5, color: active ? activeColor : colors.muted }}>
        {label}
      </Text>
    </Pressable>
  );
}

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
  const [categoryFilter, setCategoryFilter] = React.useState<CategoryFilter>('todas');

  const results = historyFiltered
    .filter((a) => categoryFilter === 'todas' || a.category === categoryFilter)
    .filter(
      (a) =>
        !query.trim() ||
        a.title.toLowerCase().includes(query.toLowerCase()) ||
        a.specialty.toLowerCase().includes(query.toLowerCase()) ||
        a.location.toLowerCase().includes(query.toLowerCase()),
    );

  const hasActiveFilters = historyFilter !== 'todas' || categoryFilter !== 'todas' || query.trim() !== '';

  const clearFilters = () => {
    setHistoryFilter('todas');
    setCategoryFilter('todas');
    setQuery('');
  };

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

        <View className="px-6 pt-1 pb-3">
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar por título, especialidade ou local"
            placeholderTextColor="#AAB4C4"
            className="h-12 rounded-[14px] border bg-surface px-3.5"
            style={{ borderColor: 'rgba(59,130,246,0.18)', fontFamily: 'Manrope', fontSize: 14, color: colors.ink }}
          />
        </View>

        {/* Painel de filtros: card único agrupando status + categoria. */}
        <View
          className="mx-6 mb-3 rounded-[18px] border bg-surface px-4 py-3.5"
          style={{ borderColor: 'rgba(59,130,246,0.08)', gap: 10 }}
        >
          <View className="flex-row gap-2">
            {FILTERS.map((f) => (
              <Chip
                key={f.key}
                label={f.label}
                active={historyFilter === f.key}
                activeBg={colors.accent}
                activeColor="#fff"
                onPress={() => setHistoryFilter(f.key)}
              />
            ))}
          </View>

          <View style={{ height: 34 }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              <Chip
                label="Todas categorias"
                active={categoryFilter === 'todas'}
                activeBg={colors.accent}
                activeColor="#fff"
                onPress={() => setCategoryFilter('todas')}
              />
              {CATEGORY_LIST.map((c) => {
                const meta = categoryStyle(c);
                return (
                  <Chip
                    key={c}
                    label={meta.label}
                    active={categoryFilter === c}
                    activeBg={meta.bg}
                    activeColor={meta.color}
                    onPress={() => setCategoryFilter(c)}
                  />
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Contagem de resultados */}
        <View className="px-6 pb-2 flex-row items-center justify-between">
          <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 12.5, color: colors.muted }}>
            {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
          </Text>
          {hasActiveFilters ? (
            <Pressable onPress={clearFilters} accessibilityRole="button" accessibilityLabel="Limpar filtros">
              <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 12.5, color: colors.accent }}>Limpar filtros</Text>
            </Pressable>
          ) : null}
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ flexGrow: 1, paddingTop: 4, paddingBottom: 140 }} showsVerticalScrollIndicator={false}>
          {results.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8" style={{ gap: 14 }}>
              <View
                className="items-center justify-center rounded-full"
                style={{ width: 68, height: 68, backgroundColor: 'rgba(59,130,246,0.08)' }}
              >
                <SearchOffIcon size={30} color={colors.accent} />
              </View>
              <View style={{ gap: 4 }}>
                <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 15, color: colors.ink, textAlign: 'center' }}>
                  Nenhum compromisso encontrado
                </Text>
                <Text style={{ fontFamily: 'Manrope', fontSize: 13, color: colors.muted, textAlign: 'center', maxWidth: 240 }}>
                  {hasActiveFilters
                    ? 'Tente ajustar a busca ou os filtros aplicados.'
                    : 'Toque no microfone para agendar seu primeiro compromisso.'}
                </Text>
              </View>
              {hasActiveFilters ? (
                <Pressable
                  onPress={clearFilters}
                  className="items-center justify-center rounded-full border px-5"
                  style={{ height: 38, borderColor: colors.accent }}
                  accessibilityRole="button"
                  accessibilityLabel="Limpar filtros"
                >
                  <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 13, color: colors.accent }}>Limpar filtros</Text>
                </Pressable>
              ) : null}
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
