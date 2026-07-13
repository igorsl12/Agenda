// ProfileScreen.tsx — perfil do usuário (tema, configurações, ações).
import React from 'react';
import { View, Text, Pressable, Switch } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../context/AppContext';
import { GradientBackground, Avatar } from '../components/ui';
import { BottomNav } from '../components/BottomNav';
import { ChevronRight } from '../components/icons';

type Mode = 'light' | 'dark' | 'system';

function Row({ label, value, onPress, trailing }: { label: string; value?: string; onPress?: () => void; trailing?: React.ReactNode }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-hairline px-4 py-3.5"
      style={{ borderBottomColor: 'rgba(16,27,54,0.06)' }}
      disabled={!onPress}
    >
      <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 14, color: '#101B36' }}>{label}</Text>
      <View className="flex-row items-center" style={{ gap: 6 }}>
        {value ? <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 13, color: '#64748B' }}>{value}</Text> : null}
        {trailing}
        {onPress ? <ChevronRight /> : null}
      </View>
    </Pressable>
  );
}

export function ProfileScreen() {
  const { colors, mode, setMode, isDark } = useTheme();
  const { userName, appointments, setTabHome } = useApp();

  const modes: Mode[] = ['light', 'dark', 'system'];
  const modeLabel = mode === 'light' ? 'Claro' : mode === 'dark' ? 'Escuro' : 'Sistema';

  return (
    <GradientBackground>
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-6 pb-2" style={{ paddingTop: 64 }}>
          <Pressable onPress={setTabHome} accessibilityRole="button" accessibilityLabel="Voltar">
            <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 15, color: colors.accent }}>Início</Text>
          </Pressable>
          <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 18, color: '#101B36' }}>Perfil</Text>
          <View style={{ width: 40 }} />
        </View>

        <View className="mt-4 items-center">
          <Avatar initials={(userName || 'U').slice(0, 2).toUpperCase()} color="#DCEAFF" size={84} />
          <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 20, color: '#101B36', marginTop: 12 }}>{userName}</Text>
          <Text style={{ fontFamily: 'Manrope', fontWeight: '500', fontSize: 14, color: '#64748B', marginTop: 2 }}>
            {appointments.length} consulta(s) agendada(s)
          </Text>
        </View>

        <View className="mt-6 mx-6 rounded-[20px] border bg-surface" style={{ borderColor: 'rgba(59,130,246,0.06)' }}>
          <Row label="Tema" value={modeLabel} />
          <View className="flex-row items-center justify-between px-4 py-3.5">
            {modes.map((m) => {
              const active = mode === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => setMode(m)}
                  className="items-center justify-center rounded-full border"
                  style={{
                    flex: 1,
                    height: 38,
                    marginHorizontal: 4,
                    borderColor: active ? colors.accent : 'rgba(16,27,54,0.10)',
                    backgroundColor: active ? colors.accent : 'transparent',
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Tema ${m}`}
                >
                  <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 12.5, color: active ? '#fff' : '#64748B' }}>
                    {m === 'light' ? 'Claro' : m === 'dark' ? 'Escuro' : 'Sistema'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mt-4 mx-6 rounded-[20px] border bg-surface" style={{ borderColor: 'rgba(59,130,246,0.06)' }}>
          <Row label="Notificações" trailing={<Switch value={true} disabled style={{ opacity: 0.6 }} />} />
          <Row label="Lembrar 1h antes" trailing={<Switch value={true} disabled style={{ opacity: 0.6 }} />} />
          <Row label="Idioma" value="Português" />
          <Row label="Sobre" value="v0.1.0" />
        </View>

        <BottomNav />
      </View>
    </GradientBackground>
  );
}
