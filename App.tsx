// App.tsx — shell do app: providers + roteador por tela (sem navegação externa).
import './global.css';
import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import { useFonts } from 'expo-font';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold, Manrope_800ExtraBold } from '@expo-google-fonts/manrope';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { AppProvider, useApp } from './src/context/AppContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SignupScreen } from './src/screens/SignupScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { ListeningScreen } from './src/screens/ListeningScreen';
import { ConfirmScreen } from './src/screens/ConfirmScreen';
import { DetailsScreen } from './src/screens/DetailsScreen';
import { EditScreen } from './src/screens/EditScreen';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { cn } from './src/utils/cn';

/** Moldura "device" no web: limita a largura e centraliza. */
function DeviceFrame({ children }: { children: React.ReactNode }) {
  const { isDark, colors } = useTheme();
  // No Android (SDK 54) o app roda edge-to-edge: o conteúdo passa por baixo da
  // barra de navegação do sistema. Sem este padding o rodapé (botão Salvar,
  // BottomNav) fica escondido atrás da barra de gestos. No web insets = 0.
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bgGradientTop,
      }}
    >
      <View
        className={cn('flex-1 bg-canvas', isDark && 'dark')}
        style={{
          flex: 1,
          height: '100%',
          width: '100%',
          maxWidth: 420,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          borderBottomLeftRadius: 28,
          borderBottomRightRadius: 28,
          overflow: 'hidden',
          paddingBottom: insets.bottom,
          shadowColor: '#000000',
          shadowOpacity: 0.18,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 12 },
        }}
      >
        <StatusBar style={isDark ? 'light' : 'dark'} />
        {children}
      </View>
    </View>
  );
}

function Router() {
  const { screen, loading } = useApp();
  const { isAuthed, loading: authLoading } = useAuth();
  // Modo das telas de auth (login/signup) quando não logado.
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Erro vindo do retorno do OAuth Google (/?auth_error=...).
  const authError =
    (typeof window !== 'undefined' && window.location?.search)
      ? new URLSearchParams(window.location.search).get('auth_error') ?? undefined
      : undefined;

  // Carregando (app ou auth).
  if (loading || authLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <Text style={{ fontFamily: 'Manrope', color: '#64748B' }}>Carregando…</Text>
        <StatusBar style="dark" />
      </View>
    );
  }

  // Não autenticado -> telas de login/signup.
  if (!isAuthed) {
    return authMode === 'login' ? (
      <LoginScreen onGoSignup={() => setAuthMode('signup')} authError={authError} />
    ) : (
      <SignupScreen onGoLogin={() => setAuthMode('login')} />
    );
  }

  switch (screen) {
    case 'onboarding':
      return <OnboardingScreen />;
    case 'listening':
      return <ListeningScreen />;
    case 'confirm':
      return <ConfirmScreen />;
    case 'details':
      return <DetailsScreen />;
    case 'edit':
      return <EditScreen />;
    case 'agenda':
      return <CalendarScreen />;
    case 'historico':
      return <HistoryScreen />;
    case 'perfil':
      return <ProfileScreen />;
    case 'home':
    default:
      return <HomeScreen />;
  }
}

export default function App() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-canvas">
        <StatusBar style="dark" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppProvider>
            <DeviceFrame>
              <Router />
            </DeviceFrame>
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
