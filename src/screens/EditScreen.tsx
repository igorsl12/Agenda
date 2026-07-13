// EditScreen.tsx — formulário de nova consulta ou edição.
import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeProvider';
import { useApp } from '../context/AppContext';
import { GradientBackground, Field, GradientButton } from '../components/ui';
import { BackIcon } from '../components/icons';
import { CATEGORY_LIST, categoryStyle } from '../utils/appointmentUtils';

export function EditScreen() {
  const { colors } = useTheme();
  const { form, editMode, editScreenTitle, setField, setCategory, saveForm, backFromEdit } = useApp();

  return (
    <GradientBackground>
      <View className="flex-1">
        <View className="flex-row items-center gap-3.5 px-6" style={{ paddingTop: 64, paddingBottom: 8 }}>
          <Pressable
            onPress={backFromEdit}
            className="items-center justify-center rounded-full bg-surface"
            style={{ width: 36, height: 36, shadowColor: '#101B36', shadowOpacity: 0.08, shadowRadius: 16, shadowOffset: { width: 0, height: 6 } }}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <BackIcon color={colors.ink} />
          </Pressable>
          <Text style={{ fontFamily: 'Manrope', fontWeight: '800', fontSize: 19, color: colors.ink }}>{editScreenTitle}</Text>
        </View>

        <ScrollView className="flex-1 px-6" contentContainerStyle={{ paddingTop: 16, paddingBottom: 12, gap: 14 }}>
          <Field label="Título" value={form.title} onChangeText={(v) => setField('title', v)} placeholder="Ex: Consulta com Dr. João" />
          <Field label="Especialidade" value={form.specialty} onChangeText={(v) => setField('specialty', v)} placeholder="Ex: Cardiologista" />
          <View className="flex-row" style={{ gap: 12 }}>
            <View className="flex-1">
              <Field label="Data" value={form.date} onChangeText={(v) => setField('date', v)} placeholder="Ex: Sexta-feira, 19 de julho" />
            </View>
            <View style={{ width: 110 }}>
              <Field label="Horário" value={form.time} onChangeText={(v) => setField('time', v)} placeholder="14:30" />
            </View>
          </View>
          <Field label="Local" value={form.location} onChangeText={(v) => setField('location', v)} placeholder="Ex: Clínica Vida Saudável" />

          <View className="flex-col gap-[6px]">
            <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 12, color: colors.muted }}>Categoria</Text>
            <View className="flex-row flex-wrap" style={{ gap: 8 }}>
              {CATEGORY_LIST.map((c) => {
                const meta = categoryStyle(c);
                const active = form.category === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => setCategory(c)}
                    className="items-center justify-center rounded-full border"
                    style={{
                      height: 34,
                      paddingHorizontal: 14,
                      backgroundColor: active ? meta.bg : 'transparent',
                      borderColor: active ? meta.color : 'rgba(16,27,54,0.12)',
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`Categoria ${meta.label}`}
                  >
                    <Text style={{ fontFamily: 'Manrope', fontWeight: '700', fontSize: 12.5, color: active ? meta.color : colors.muted }}>
                      {meta.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Field label="Notas" value={form.notes ?? ''} onChangeText={(v) => setField('notes', v)} placeholder="Alguma observação?" multiline />
        </ScrollView>

        <View className="px-6 pb-6 pt-3">
          <GradientButton label="Salvar" onPress={saveForm} />
        </View>
      </View>
    </GradientBackground>
  );
}
