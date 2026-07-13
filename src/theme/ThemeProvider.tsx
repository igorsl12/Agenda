// ThemeProvider.tsx — tema (claro/escuro) do app "Agenda".
//
// Paleta do protótipo de design (Voice Agenda App):
//   - acento azul #2E6BF0 (gradiente 5B9CFF → 2E6BF0)
//   - fundo claro em gradiente azulado (#EAF3FE → #FFFFFF)
//   - texto #101B36, secundário #64748B
// O tema escuro espelha essas cores com tons apropriados.
//
// Suporta três modos: 'system' | 'light' | 'dark', persistidos em AsyncStorage.
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeMode = 'system' | 'light' | 'dark';

export interface ThemeColors {
  /** Fundo de tela (claro: gradiente azulado; escuro: quase preto azulado). */
  bg: string;
  bgGradientTop: string;
  bgGradientBottom: string;
  /** Cartões/superfícies. */
  surface: string;
  /** Texto primário. */
  ink: string;
  /** Texto secundário/muted. */
  muted: string;
  /** Azul de destaque (acento). */
  accent: string;
  /** Início do gradiente do botão FAB/CTA. */
  accentLight: string;
  /** Borda sutil. */
  hairline: string;
  /** Texto em botões de destaque (branco). */
  onAccent: string;
}

const lightColors: ThemeColors = {
  bgGradientTop: '#EAF3FE',
  bgGradientBottom: '#FFFFFF',
  bg: '#F7FBFF',
  surface: '#FFFFFF',
  ink: '#101B36',
  muted: '#64748B',
  accent: '#2E6BF0',
  accentLight: '#5B9CFF',
  hairline: 'rgba(59,130,246,0.15)',
  onAccent: '#FFFFFF',
};

const darkColors: ThemeColors = {
  bgGradientTop: '#0B1424',
  bgGradientBottom: '#05080F',
  bg: '#0A1020',
  surface: '#141C2E',
  ink: '#EAF2FF',
  muted: '#8E9BB4',
  accent: '#5B9CFF',
  accentLight: '#7FB2FF',
  hairline: 'rgba(91,156,255,0.22)',
  onAccent: '#FFFFFF',
};

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: ThemeColors;
  setMode: (m: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'agenda.themeMode';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setModeState(v);
      })
      .catch(() => {});
  }, []);

  const setMode = (m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  };

  const isDark =
    mode === 'dark' || (mode === 'system' && systemScheme === 'dark');
  const colors = isDark ? darkColors : lightColors;

  const toggle = () => {
    setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light');
  };

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, isDark, colors, setMode, toggle }),
    [mode, isDark, colors],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme deve ser usado dentro de <ThemeProvider>');
  return ctx;
}
