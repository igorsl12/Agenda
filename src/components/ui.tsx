// ui.tsx — primitivos de UI do protótipo (Avatar, StatusBadge, GradientButton,
// GradientBackground, Field). Seguem o design "Voice Agenda App".
import React from 'react';
import { View, Text, Pressable, TextInput, type TextInputProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { categoryStyle, statusStyle } from '../utils/appointmentUtils';
import type { AppointmentCategory, AppointmentStatus } from '../types';
import { cn } from '../utils/cn';

/** Fundo em gradiente azulado (acento claro → branco/escuro). */
export function GradientBackground({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  const { colors, isDark } = useTheme();
  return (
    <LinearGradient
      colors={[colors.bgGradientTop, colors.bgGradientBottom]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={[
        {
          flex: 1,
          width: '100%',
          backgroundColor: isDark ? colors.bg : undefined,
        },
        style,
      ]}
    >
      {children}
    </LinearGradient>
  );
}

/** Avatar quadrado arredondado com iniciais. */
export function Avatar({
  initials,
  color,
  size = 48,
}: {
  initials: string;
  color: string;
  size?: number;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: 'Manrope',
          fontWeight: '800',
          fontSize: size * 0.32,
          color: '#101B36',
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

/** Etiqueta de status (Confirmado/Pendente) com cor de fundo. */
export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { bg, color } = statusStyle(status);
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        alignSelf: 'flex-start',
      }}
    >
      <Text
        style={{
          fontFamily: 'Manrope',
          fontWeight: '700',
          fontSize: 10.5,
          color,
        }}
      >
        {status}
      </Text>
    </View>
  );
}

/** Etiqueta de categoria (Saúde/Faculdade/...) com cor de fundo própria. */
export function CategoryBadge({ category }: { category: AppointmentCategory }) {
  const { bg, color, label } = categoryStyle(category);
  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        alignSelf: 'flex-start',
      }}
    >
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
    </View>
  );
}

/** Botão CTA em gradiente azul. */
export function GradientButton({
  label,
  onPress,
  disabled,
  flex,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  flex?: number;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={{ flex: flex ?? 1, opacity: disabled ? 0.5 : 1 }}
      className="h-[52px] items-center justify-center rounded-[26px] active:opacity-90"
      accessibilityRole="button"
    >
      <LinearGradient
        colors={[colors.accentLight, colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          position: 'absolute', left: 0, right: 0, top: 0, bottom: 0,
          borderRadius: 26,
        }}
      />
      <Text
        style={{
          fontFamily: 'Manrope',
          fontWeight: '700',
          fontSize: 15,
          color: colors.onAccent,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Botão secundário (contorno azul). */
export function OutlineButton({
  label,
  onPress,
  flex,
  danger,
}: {
  label: string;
  onPress: () => void;
  flex?: number;
  danger?: boolean;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={{ flex: flex ?? 1 }}
      className="h-[52px] items-center justify-center rounded-[26px] border active:opacity-80"
      accessibilityRole="button"
    >
      <Text
        style={{
          fontFamily: 'Manrope',
          fontWeight: '700',
          fontSize: 15,
          color: danger ? '#DC4C4C' : colors.accent,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Campo de texto do formulário de edição. */
export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
}) {
  const { colors, isDark } = useTheme();
  return (
    <View className="flex-col gap-[6px]">
      <Text
        style={{
          fontFamily: 'Manrope',
          fontWeight: '700',
          fontSize: 12,
          color: colors.muted,
        }}
      >
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={isDark ? '#5A6781' : '#AAB4C4'}
        multiline={multiline}
        keyboardType={keyboardType}
        className={cn(
          'rounded-[14px] border bg-surface px-3.5 text-[14px]',
          multiline ? 'h-20 py-3' : 'h-12',
        )}
        style={{
          borderColor: isDark
            ? 'rgba(91,156,255,0.22)'
            : 'rgba(59,130,246,0.18)',
          color: colors.ink,
          fontFamily: 'Manrope',
          fontSize: 14,
        }}
      />
    </View>
  );
}
