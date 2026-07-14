// ProfileScreen.tsx — perfil do usuário (tema, configurações, ações).
import React from 'react';
import { View, Text, Pressable, Switch, TextInput, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../context/AppContext';
import { GradientBackground, Avatar } from '../components/ui';
import { BottomNav } from '../components/BottomNav';
import { ChevronRight } from '../components/icons';

type Mode = 'light' | 'dark' | 'system';

function Row({ label, value, onPress, trailing }: { label: string; value?: string; onPress?: () => void; trailing?: React.ReactNode }) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-between border-b border-hairline px-4 py-3.5"
      style={{ borderBottomColor: colors.hairline }}
      disabled={!onPress}
    >
      <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 14, color: colors.ink }}>{label}</Text>
      <View className="flex-row items-center" style={{ gap: 6 }}>
        {value ? <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 13, color: colors.muted }}>{value}</Text> : null}
        {trailing}
        {onPress ? <ChevronRight /> : null}
      </View>
    </Pressable>
  );
}

export function ProfileScreen() {
  const { colors, mode, setMode, isDark } = useTheme();
  const {
    userName,
    appointments,
    setTabHome,
    setUserName,
    settings,
    toggleNotifications,
    toggleRemindOneHour,
  } = useApp();

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [nameDraft, setNameDraft] = React.useState(userName);

  const startEditName = () => {
    setNameDraft(userName);
    setIsEditingName(true);
  };
  const commitName = () => {
    setUserName(nameDraft);
    setIsEditingName(false);
  };

  const modes: Mode[] = ['light', 'dark', 'system'];
  const modeLabel = mode === 'light' ? 'Claro' : mode === 'dark' ? 'Escuro' : 'Sistema';

  return (
    <GradientBackground>
      <View className="flex-1">
        <View className="flex-row items-center justify-between px-6 pb-2" style={{ paddingTop: 64 }}>
          <Pressable onPress={setTabHome} accessibilityRole="button" accessibilityLabel="Voltar">
            <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 15, color: colors.accent }}>Início</Text>
          </Pressable>
          <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 18, color: colors.ink }}>Perfil</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        <View className="mt-4 items-center">
          <Avatar initials={(userName || 'U').slice(0, 2).toUpperCase()} color={colors.accentLight} size={84} />
          {isEditingName ? (
            <View className="flex-row items-center" style={{ marginTop: 12, gap: 8 }}>
              <TextInput
                value={nameDraft}
                onChangeText={setNameDraft}
                onSubmitEditing={commitName}
                autoFocus
                maxLength={40}
                className="rounded-[12px] border bg-surface px-3"
                style={{ height: 40, minWidth: 160, borderColor: colors.hairline, fontFamily: 'Manrope', fontWeight: '700', fontSize: 16, color: colors.ink, textAlign: 'center' }}
                accessibilityLabel="Editar nome"
              />
              <Pressable onPress={commitName} accessibilityRole="button" accessibilityLabel="Salvar nome">
                <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 14, color: colors.accent }}>Salvar</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={startEditName} accessibilityRole="button" accessibilityLabel="Editar nome">
              <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 20, color: colors.ink, marginTop: 12 }}>
                {userName} <Text style={{ fontSize: 13, color: colors.accent }}>editar</Text>
              </Text>
            </Pressable>
          )}
          <Text style={{ fontFamily: 'Manrope', fontWeight: '500', fontSize: 14, color: colors.muted, marginTop: 2 }}>
            {appointments.length} compromisso(s) agendado(s)
          </Text>
        </View>

        <View className="mt-6 mx-6 rounded-[20px] border bg-surface" style={{ borderColor: colors.hairline }}>
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
                    borderColor: active ? colors.accent : colors.hairline,
                    backgroundColor: active ? colors.accent : 'transparent',
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Tema ${m}`}
                >
                  <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 12.5, color: active ? '#fff' : colors.muted }}>
                    {m === 'light' ? 'Claro' : m === 'dark' ? 'Escuro' : 'Sistema'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="mt-4 mx-6 rounded-[20px] border bg-surface" style={{ borderColor: colors.hairline }}>
          <Row label="Notificações" trailing={<Switch value={settings.notificationsEnabled} onValueChange={toggleNotifications} />} />
          <Row label="Lembrar 1h antes" trailing={<Switch value={settings.remindOneHourBefore} onValueChange={toggleRemindOneHour} />} />
          <Row label="Idioma" value="Português" />
          <Row label="Sobre" value="v0.1.0" />
        </View>
        </ScrollView>

        <BottomNav />
      </View>
    </GradientBackground>
  );
}
