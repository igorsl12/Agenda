# Agenda Dinâmica Inteligente — Protótipo (Voz)

App de **agenda de consultas médicas por voz**. Baseado no protótipo de design
`Voice agenda app prototype.zip` (extraído em `__design_extract/`).

Fale naturalmente → o app simula a transcrição → extrai os dados da consulta
(título, especialidade, data, horário, local, notas) → mostra uma tela de
confirmação → salva localmente. Tudo funciona em **modo mock** (sem credenciais).

## Telas
- **Onboarding** — boas-vindas com CTA "Começar".
- **Início (Home)** — lista de consultas em cartões, contador e botão "+".
- **Escuta** — tela de microfone com pulso/processando e transcrição ao vivo (mock).
- **Confirmação** — revisão do evento extraído da voz, com Editar/Confirmar.
- **Detalhes** — cartão da consulta, dados e ações Editar / Cancelar.
- **Edição** — formulário de nova consulta ou edição existente.
- **Histórico / Perfil** — stubs (abas inferiores).

## Stack
- React Native + Expo (TypeScript)
- NativeWind (Tailwind CSS) + `expo-linear-gradient` (gradientes azuis do design)
- `expo-font` (Manrope)
- AsyncStorage (persistência local das consultas)
- react-native-svg (ícones)

## Como rodar
```bash
npm install
npx expo start          # Expo Dev Tools (Expo Go no celular / emulador)
```
Web: `npx expo start --web` · iOS: `--ios` · Android: `--android`

## Estrutura
```
App.tsx                      # shell + roteador por tela (DeviceFrame)
index.tsx                    # entrypoint + carrega fonte Manrope
src/
├─ types.ts                  # Appointment / ScreenName / TabName
├─ theme/ThemeProvider.tsx   # tema claro/escuro (paleta azul + Manrope)
├─ context/AppContext.tsx    # estado global (telas, abas, consultas, voz)
├─ storage/appointmentStorage.ts
├─ services/voiceService.ts  # mock de transcrição/extração
├─ utils/appointmentUtils.ts # status, iniciais, cores
├─ components/
│  ├─ ui.tsx                 # GradientBackground, Avatar, StatusBadge, GradientButton, ...
│  ├─ icons.tsx              # ícones SVG
│  ├─ AppointmentCard.tsx
│  └─ BottomNav.tsx          # 5 abas + FAB de voz central
└─ screens/                  # Onboarding, Home, Listening, Confirm, Details, Edit, History, Profile
```

## Próximos passos
- Voz/IA real (`expo-av` + Whisper/OpenAI/Gemini) no lugar do mock.
- Completar Histórico e Perfil; validar tema escuro; seed de consultas iniciais.
