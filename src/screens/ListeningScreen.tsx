// ListeningScreen.tsx — tela de escuta/processamento por voz.
import React from 'react';
import { View, Text, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../context/AppContext';
import { GradientBackground } from '../components/ui';
import { MicIcon, CloseIcon } from '../components/icons';

export function ListeningScreen() {
  const { colors } = useTheme();
  const {
    cancelVoice,
    transcriptShown,
    listenStatusLabel,
    isPhaseListening,
    advanceNow,
    showManualAdvance,
  } = useApp();

  const breathe = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    if (isPhaseListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1.05, duration: 800, useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 1, duration: 800, useNativeDriver: true }),
        ]),
      ).start();
    } else {
      breathe.setValue(1);
    }
  }, [isPhaseListening, breathe]);

  return (
    <GradientBackground>
      <View className="flex-1" style={{ paddingTop: 64, paddingBottom: 48 }}>
        {/* Fechar */}
        <Pressable
          onPress={cancelVoice}
          className="absolute left-6 top-16 z-10 items-center justify-center rounded-full bg-white"
          style={{ width: 36, height: 36, shadowColor: '#101B36', shadowOpacity: 0.1, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}
          accessibilityRole="button"
          accessibilityLabel="Cancelar"
        >
          <CloseIcon color="#101B36" />
        </Pressable>

        <View className="flex-1 items-center justify-center" style={{ gap: 30 }}>
          {/* Onda/pulso + microfone */}
          <View style={{ position: 'relative', width: 168, height: 168, alignItems: 'center', justifyContent: 'center' }}>
            {isPhaseListening && (
              <>
                <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 84, borderWidth: 2, borderColor: colors.accentLight, opacity: 0.5 }} />
                <Animated.View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 84, borderWidth: 2, borderColor: colors.accentLight, opacity: 0.3, transform: [{ scale: breathe }] }} />
              </>
            )}
            {!isPhaseListening && (
              <View style={{ position: 'absolute', left: 6, right: 6, top: 6, bottom: 6, borderRadius: 84, borderWidth: 3, borderColor: 'rgba(46,107,240,0.18)', borderTopColor: colors.accent }} />
            )}
            <Animated.View
              style={[
                { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', shadowColor: colors.accent, shadowOpacity: 0.36, shadowRadius: 36, shadowOffset: { width: 0, height: 18 } },
                { transform: [{ scale: isPhaseListening ? breathe : 1 }] },
              ]}
            >
              <LinearGradient
                colors={[colors.accentLight, colors.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' }}
              >
                <MicIcon size={34} color="#fff" />
              </LinearGradient>
            </Animated.View>
          </View>

          <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 18, color: '#101B36' }}>
            {listenStatusLabel}
          </Text>
          <Text style={{ fontFamily: 'Manrope', fontWeight: '500', fontSize: 15, lineHeight: 22, color: '#3B5B8C', maxWidth: 290, textAlign: 'center', minHeight: 60 }}>
            {transcriptShown}
          </Text>

          {showManualAdvance && (
            <Pressable
              onPress={advanceNow}
              className="items-center justify-center rounded-full bg-white"
              style={{ paddingVertical: 12, paddingHorizontal: 24, shadowColor: '#101B36', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } }}
              accessibilityRole="button"
              accessibilityLabel="Concluir"
            >
              <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 14, color: colors.accent }}>Concluir</Text>
            </Pressable>
          )}
        </View>
      </View>
    </GradientBackground>
  );
}
