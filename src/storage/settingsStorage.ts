// settingsStorage.ts — persistência local de preferências do usuário.
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'agenda.settings';

export interface UserSettings {
  userName: string;
  notificationsEnabled: boolean;
  remindOneHourBefore: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
  userName: 'Marina',
  notificationsEnabled: true,
  remindOneHourBefore: true,
};

export async function loadSettings(): Promise<UserSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (err) {
    console.warn('[storage] falha ao carregar settings:', err);
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('[storage] falha ao salvar settings:', err);
  }
}
