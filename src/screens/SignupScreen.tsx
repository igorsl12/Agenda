// SignupScreen.tsx — tela de cadastro (nome opcional, email, senha + Google).
// Estilo espelha o LoginScreen / Onboarding.
import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Linking } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useAuth } from '../context/AuthContext';
import { GradientBackground } from '../components/ui';

const origin =
  (typeof window !== 'undefined' && window.location?.origin)
    ? window.location.origin
    : (process.env.EXPO_PUBLIC_API_BASE || 'https://agenda-rust-kappa.vercel.app');
const googleUrl = `${origin}/api/auth/google/start`;

// Validação simples de e-mail.
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignupScreen({ onGoLogin }: { onGoLogin: () => void }) {
  const { colors } = useTheme();
  const { signup } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleGoogle = () => {
    if (typeof window !== 'undefined' && window.location) {
      window.location.href = googleUrl;
    } else {
      Linking.openURL(googleUrl);
    }
  };

  const validate = (): string | null => {
    if (!emailRe.test(email.trim())) return 'Informe um e-mail válido.';
    if (password.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
    return null;
  };

  const handleSubmit = async () => {
    setError(null);
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setIsSubmitting(true);
    try {
      await signup(email.trim(), password, name.trim() || undefined);
      // Sucesso: o Router detecta isAuthed=true e cai no fluxo normal.
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Não foi possível criar a conta. Tente novamente.';
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
            Criar conta
          </Text>
          <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 15, color: colors.muted, marginTop: 4 }}>
            Comece a organizar sua agenda com a voz.
          </Text>
        </View>

        {/* Erro */}
        {error && (
          <View
            className="rounded-[14px] px-3.5 py-3"
            style={{ backgroundColor: 'rgba(220,76,76,0.12)', borderColor: 'rgba(220,76,76,0.35)', borderWidth: 1 }}
            accessibilityRole="alert"
          >
            <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 13, color: '#DC4C4C' }}>
              {error}
            </Text>
          </View>
        )}

        {/* Nome (opcional) */}
        <View
          className="rounded-[14px] bg-surface"
          style={{ borderColor: colors.hairline, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, shadowColor: colors.accent, shadowOpacity: 0.06, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}
        >
          <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 11, color: colors.muted, marginBottom: 4 }}>
            NOME (OPCIONAL)
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Como podemos te chamar?"
            placeholderTextColor={colors.muted}
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="name"
            style={{ fontFamily: 'Manrope', fontSize: 15, color: colors.ink }}
            accessibilityLabel="Digite seu nome (opcional)"
          />
        </View>

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
            SENHA (MÍN. 8 CARACTERES)
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.muted}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            style={{ fontFamily: 'Manrope', fontSize: 15, color: colors.ink }}
            accessibilityLabel="Crie uma senha com pelo menos 8 caracteres"
          />
        </View>

        {/* Botão Criar conta */}
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          className="items-center justify-center active:opacity-90"
          style={{ marginTop: 8, width: '100%', height: 56, borderRadius: 28, shadowColor: colors.accent, shadowOpacity: 0.32, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, opacity: isSubmitting ? 0.6 : 1 }}
          accessibilityRole="button"
          accessibilityLabel="Criar conta"
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
            <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 17, color: '#fff' }}>Criar conta</Text>
          )}
        </Pressable>

        {/* Link já tenho conta */}
        <Pressable onPress={onGoLogin} accessibilityRole="link" accessibilityLabel="Já tenho conta">
          <Text style={{ fontFamily: 'Manrope', fontWeight: '600', fontSize: 14, color: colors.accent, textAlign: 'center', marginTop: 4 }}>
            Já tenho conta
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
