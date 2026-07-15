// LoginScreen.tsx — tela de login (email/senha + Google).
// Estilo espelha o Onboarding: GradientBackground, CTA em LinearGradient,
// inputs com borda hairline e fonte Manrope.
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { GradientBackground } from '../components/ui';

// Resolve a origem para o fluxo de OAuth do Google (web via window.location,
// nativo via EXPO_PUBLIC_API_BASE ou fallback do servidor de produção).
const origin =
  (typeof window !== 'undefined' && window.location?.origin)
    ? window.location.origin
    : (process.env.EXPO_PUBLIC_API_BASE || 'https://agenda-rust-kappa.vercel.app');
const googleUrl = `${origin}/api/auth/google/start`;

export function LoginScreen({
  onGoSignup,
  authError,
}: {
  onGoSignup: () => void;
  authError?: string;
}) {
  const { colors } = useTheme();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogle = () => {
    // Web: redireciona a página. Nativo: abre o link externo.
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = googleUrl;
    } else {
      Linking.openURL(googleUrl);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Informe seu e-mail e senha.');
      return;
    }
    setIsSubmitting(true);
    try {
      await login(email.trim(), password);
      // Sucesso: o Router detecta isAuthed=true e cai no fluxo normal.
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Não foi possível entrar. Verifique seus dados.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GradientBackground>
      <View
        className="flex-1 px-8"
        style={{ gap: 16, paddingTop: 72, paddingBottom: 48 }}
      >
        {/* Header */}
        <View style={{ marginBottom: 8 }}>
          <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 32, color: colors.ink, letterSpacing: -0.5 }}>
            Entrar
          </Text>
          <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 15, color: colors.muted, marginTop: 4 }}>
            Acesse sua agenda dinâmica inteligente.
          </Text>
        </View>

        {/* Erro (Google redirect ou submit) */}
        {(authError || error) && (
          <View
            className="rounded-[14px] px-3.5 py-3"
            style={{ backgroundColor: 'rgba(220,76,76,0.12)', borderColor: 'rgba(220,76,76,0.35)', borderWidth: 1 }}
            accessibilityRole="alert"
          >
            <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 13, color: '#DC4C4C' }}>
              {authError || error}
            </Text>
          </View>
        )}

        {/* Email */}
        <View
          className="rounded-[14px] bg-surface"
          style={{ borderColor: colors.hairline, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, shadowColor: colors.accent, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}
        >
          <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 11, color: colors.muted, marginBottom: 4 }}>
            E-MAIL
          </Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="voce@email.com"
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            style={{ fontFamily: 'Manrope', fontSize: 15, color: colors.ink }}
            accessibilityLabel="Digite seu e-mail"
          />
        </View>

        {/* Senha */}
        <View
          className="rounded-[14px] bg-surface"
          style={{ borderColor: colors.hairline, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, shadowColor: colors.accent, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}
        >
          <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 11, color: colors.muted, marginBottom: 4 }}>
            SENHA
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            style={{ fontFamily: 'Manrope', fontSize: 15, color: colors.ink }}
            accessibilityLabel="Digite sua senha"
          />
        </View>

        {/* Botão Entrar */}
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="items-center justify-center active:opacity-90"
          style={{ marginTop: 8, width: '100%', height: 56, borderRadius: 28, shadowColor: colors.accent, shadowOpacity: 0.32, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, opacity: isSubmitting ? 0.6 : 1 }}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
        >
          <LinearGradient
            colors={[colors.accentLight, colors.accent]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: 28 }}
          />
          {isSubmitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 17, color: '#fff' }}>Entrar</Text>
          )}
        </Pressable>

        {/* Link criar conta */}
        <Pressable onPress={onGoSignup} accessibilityRole="link" accessibilityLabel="Criar conta">
          <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 14, color: colors.accent, textAlign: 'center', marginTop: 4 }}>
            Criar conta
          </Text>
        </Pressable>

        {/* Entrar com Google */}
        <Pressable
          onPress={handleGoogle}
          className="items-center justify-center rounded-[28px] border bg-surface active:opacity-80"
          style={{ marginTop: 12, width: '100%', height: 52, borderColor: colors.hairline }}
          accessibilityRole="button"
          accessibilityLabel="Entrar com Google"
        >
          <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 15, color: colors.ink }}>
            Entrar com Google
          </Text>
        </Pressable>
      </View>
    </GradientBackground>
  );
}
