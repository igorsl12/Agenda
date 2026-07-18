// ui.tsx — primitivos de UI do protótipo (Avatar, StatusBadge, GradientButton,
// GradientBackground, Field). Seguem o design "Voice Agenda App".
import React from 'react';
import { View, Text, Pressable, TextInput, type TextInputProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeProvider';
import { categoryStyle, statusStyle, mixWithBase } from '../utils/appointmentUtils';
import type { AppointmentCategory, AppointmentStatus } from '../types';
import { cn } from '../utils/cn';

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

/** Fundo em gradiente azulado (acento claro → branco/escuro). */
export function Avatar({
  initials,
  color,
  size = 48,
}: {
  initials: string;
  color: string;
  size?: number;
}) {
  const { colors, isDark } = useTheme();
  // No escuro, escurece o fundo (misturando com o fundo neutro) e mantém texto claro,
  // evitando o "quadrado pastel claro" que destoava do tema neutro.
  const backgroundColor = isDark ? mixWithBase(color, colors.bg, 0.78) : color;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.3,
        backgroundColor,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text
        style={{
          fontFamily: 'Manrope',
          fontWeight: '800',
          fontSize: size * 0.32,
          color: colors.ink,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

/** Etiqueta de status (Confirmado/Pendente) com cor de fundo. */
export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const { colors, isDark } = useTheme();
  const { bg, color } = statusStyle(status);
  return (
    <View
      style={{
        backgroundColor: isDark ? mixWithBase(bg, colors.bg, 0.72) : bg,
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
  const { colors, isDark } = useTheme();
  const { bg, color, label } = categoryStyle(category);
  return (
    <View
      style={{
        backgroundColor: isDark ? mixWithBase(bg, colors.bg, 0.72) : bg,
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
      // height explícito (não só via className): no nativo, flex:1 num container
      // em coluna colapsa a altura; sem flex, a altura fixa garante o render.
      style={{ flex, height: 52, opacity: disabled ? 0.5 : 1 }}
      className="items-center justify-center rounded-[26px] active:opacity-90"
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
      // height explícito (ver GradientButton): flex:1 padrão colapsava a altura
      // no nativo quando o botão fica em coluna (ex.: Detalhes, Edição).
      style={{ flex, height: 52, borderColor: danger ? '#DC4C4C' : colors.hairline }}
      className="items-center justify-center rounded-[26px] border active:opacity-80"
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

/**
 * Diálogo de confirmação no estilo do app (não o popup do navegador).
 * Renderiza um overlay absoluto que cobre a moldura do app; toque no fundo
 * cancela. Use para ações irreversíveis (ex.: excluir compromisso).
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { colors } = useTheme();
  if (!visible) return null;
  const accent = danger ? '#DC4C4C' : colors.accent;
  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
        zIndex: 50,
      }}
    >
      <Pressable
        onPress={onCancel}
        accessibilityRole="button"
        accessibilityLabel="Fechar"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: 'rgba(15,23,42,0.45)',
        }}
      />
      <View
        className="bg-surface"
        style={{
          width: '100%',
          maxWidth: 340,
          borderRadius: 24,
          padding: 24,
          shadowColor: '#000000',
          shadowOpacity: 0.25,
          shadowRadius: 30,
          shadowOffset: { width: 0, height: 16 },
        }}
      >
        <Text
          style={{
            fontFamily: 'Manrope',
            fontWeight: '800',
            fontSize: 17,
            color: colors.ink,
          }}
        >
          {title}
        </Text>
        <Text
          style={{
            fontFamily: 'Manrope',
            fontWeight: '500',
            fontSize: 14,
            color: colors.muted,
            lineHeight: 21,
            marginTop: 8,
          }}
        >
          {message}
        </Text>
        <View className="flex-col" style={{ gap: 10, marginTop: 20 }}>
          <Pressable
            onPress={onConfirm}
            style={{ width: '100%', height: 52, backgroundColor: accent }}
            className="items-center justify-center rounded-[26px] active:opacity-90"
            accessibilityRole="button"
          >
            <Text
              style={{
                fontFamily: 'Manrope',
                fontWeight: '700',
                fontSize: 15,
                color: '#FFFFFF',
              }}
            >
              {confirmLabel}
            </Text>
          </Pressable>
          <Pressable
            onPress={onCancel}
            style={{ width: '100%', height: 52, borderColor: colors.hairline }}
            className="items-center justify-center rounded-[26px] border active:opacity-80"
            accessibilityRole="button"
          >
            <Text
              style={{
                fontFamily: 'Manrope',
                fontWeight: '700',
                fontSize: 15,
                color: colors.accent,
              }}
            >
              {cancelLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
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
        placeholderTextColor={isDark ? '#7C7C82' : '#AAB4C4'}
        multiline={multiline}
        keyboardType={keyboardType}
        className={cn(
          'rounded-[14px] border bg-surface px-3.5 text-[14px]',
          multiline ? 'h-20 py-3' : 'h-12',
        )}
        style={{
          borderColor: colors.hairline,
          color: colors.ink,
          fontFamily: 'Manrope',
          fontSize: 14,
        }}
      />
    </View>
  );
}
