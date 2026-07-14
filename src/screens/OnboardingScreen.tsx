// OnboardingScreen.tsx — tela de boas-vindas (protótipo).
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../context/AppContext';
import { MicIcon } from '../components/icons';
import { GradientBackground } from '../components/ui';

export function OnboardingScreen() {
  const { colors } = useTheme();
  const { goOnboardNext } = useApp();

  return (
    <GradientBackground>
      <View
        className="flex-1 items-center justify-center px-8"
        style={{ gap: 18, paddingTop: 64, paddingBottom: 56 }}
      >
        {/* Halo de luz ao fundo */}
        <View
          style={{
            position: 'absolute',
            top: -120,
            left: '50%',
            width: 420,
            height: 420,
            transform: [{ translateX: -210 }],
            borderRadius: 210,
            backgroundColor: 'rgba(59,139,255,0.18)',
            opacity: 0.6,
          }}
        />
        <View
          style={{
            width: 112,
            height: 112,
            borderRadius: 56,
            shadowColor: colors.accent,
            shadowOpacity: 0.38,
            shadowRadius: 44,
            shadowOffset: { width: 0, height: 20 },
          }}
        >
          <LinearGradient
            colors={[colors.accentLight, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 112, height: 112, borderRadius: 56, alignItems: 'center', justifyContent: 'center' }}
          >
            <MicIcon size={40} color="#fff" />
          </LinearGradient>
        </View>
        <View style={{ marginTop: 6, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 34, color: colors.ink, letterSpacing: -0.5 }}>Agenda</Text>
          <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 16, color: colors.accent, marginTop: 4 }}>Dinâmica Inteligente</Text>
        </View>
        <Text style={{ fontFamily: 'Manrope', fontSize: 15, lineHeight: 24, color: colors.muted, maxWidth: 270, textAlign: 'center', marginTop: 2 }}>
          Marque seus compromissos só com a sua voz. Fale naturalmente e a IA organiza tudo para você.
        </Text>
        <Pressable
          onPress={goOnboardNext}
          className="items-center justify-center active:opacity-90"
          style={{ marginTop: 22, width: '100%', maxWidth: 280, height: 56, borderRadius: 28, shadowColor: colors.accent, shadowOpacity: 0.32, shadowRadius: 26, shadowOffset: { width: 0, height: 14 } }}
          accessibilityRole="button"
          accessibilityLabel="Começar"
        >
          <LinearGradient
            colors={[colors.accentLight, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 28 }}
          />
          <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 17, color: '#fff' }}>Começar</Text>
        </Pressable>
      </View>
    </GradientBackground>
  );
}
