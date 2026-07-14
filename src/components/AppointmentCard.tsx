// AppointmentCard.tsx — cartão de compromisso na lista (Home).
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import type { Appointment } from '../types';
import { Avatar } from './ui';
import { ChevronRight } from './icons';
import { statusStyle, categoryStyle, isoToFriendly, mixWithBase } from '../utils/appointmentUtils';

export function AppointmentCard({
  appt,
  onPress,
}: {
  appt: Appointment;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  const { bg, color } = statusStyle(appt.status);
  const cat = categoryStyle(appt.category);
  return (
    <Pressable
      onPress={onPress}
      className="mb-3 flex-row items-center gap-3.5 rounded-[20px] border bg-surface p-4 active:opacity-90"
      style={{
        borderColor: colors.hairline,
        shadowColor: colors.accent,
        shadowOpacity: 0.08,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 10 },
      }}
      accessibilityRole="button"
      accessibilityLabel={appt.title}
    >
      <Avatar initials={appt.initials} color={appt.color} size={48} />
      <View className="flex-1" style={{ minWidth: 0 }}>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: 'Manrope',
            fontWeight: '700',
            fontSize: 15,
            color: colors.ink,
          }}
        >
          {appt.title}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            fontFamily: 'Manrope',
            fontWeight: '500',
            fontSize: 13,
            color: colors.muted,
            marginTop: 2,
          }}
        >
          {appt.specialty} · {appt.date || isoToFriendly(appt.dateISO)}, {appt.time}
        </Text>
        <View className="flex-row" style={{ gap: 6, marginTop: 6 }}>
          <View style={{ backgroundColor: isDark ? mixWithBase(cat.bg, colors.bg, 0.72) : cat.bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
            <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 10, color: cat.color }}>{cat.label}</Text>
          </View>
        </View>
      </View>
      <View className="flex-col items-end gap-2">
        <View style={{ backgroundColor: bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 10.5, color }}>{appt.status}</Text>
        </View>
        <ChevronRight />
      </View>
    </Pressable>
  );
}
