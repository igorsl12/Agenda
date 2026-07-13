// BottomNav.tsx — barra de navegação inferior com FAB de microfone central.
// 5 destinos: Início, Agenda, (FAB voz), Histórico, Perfil.
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../context/AppContext';
import { HomeIcon, CalendarIcon, HistoryIcon, ProfileIcon, MicIcon } from './icons';
import type { TabName } from '../types';

function TabButton({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  icon: (color: string) => React.ReactNode;
}) {
  const { colors } = useTheme();
  const color = active ? colors.accent : '#9AA7BD';
  return (
    <Pressable
      onPress={onPress}
      className="w-14 flex-col items-center gap-1"
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon(color)}
      <Text
        style={{
          fontFamily: 'Manrope',
          fontWeight: '700',
          fontSize: 10.5,
          color,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function BottomNav() {
  const { colors } = useTheme();
  const { tab, setTabHome, setTabAgenda, openHistory, setTabPerfil, startVoice } = useApp();

  return (
    <View
      className="flex-row items-center justify-between px-5 pb-5 pt-2"
      style={{
        backgroundColor: 'rgba(255,255,255,0.75)',
        borderTopWidth: 1,
        borderTopColor: 'rgba(59,130,246,0.08)',
      }}
    >
      <TabButton label="Início" active={tab === 'home'} onPress={setTabHome} icon={(c) => <HomeIcon color={c} />} />
      <TabButton label="Agenda" active={tab === 'agenda'} onPress={setTabAgenda} icon={(c) => <CalendarIcon color={c} />} />
      <Pressable
        onPress={startVoice}
        className="items-center justify-center rounded-full"
        style={{
          width: 60,
          height: 60,
          marginTop: -30,
          borderWidth: 5,
          borderColor: '#F7FBFF',
          shadowColor: colors.accent,
          shadowOpacity: 0.4,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 12 },
        }}
        accessibilityRole="button"
        accessibilityLabel="Falar para agendar"
      >
        <LinearGradient
          colors={[colors.accentLight, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 30 }}
        />
        <MicIcon size={24} color="#fff" />
      </Pressable>
      <TabButton label="Histórico" active={tab === 'historico'} onPress={openHistory} icon={(c) => <HistoryIcon color={c} />} />
      <TabButton label="Perfil" active={tab === 'perfil'} onPress={setTabPerfil} icon={(c) => <ProfileIcon color={c} />} />
    </View>
  );
}
