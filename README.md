# Agenda Dinâmica Inteligente — Protótipo (Voz)

App de **agenda de consultas médicas por voz**, em React Native + Expo.

Fale naturalmente → o app simula a transcrição → extrai os dados da consulta
(título, especialidade, data, horário, local, notas) → mostra uma tela de
confirmação → salva localmente. Hoje a voz/IA funciona em **modo mock** (sem
credenciais); o `.env.example` já reserva chaves para uma integração real
(Gemini/OpenAI) — ver [Próximos passos](#próximos-passos).

> Status: protótipo de UI funcional, sem testes automatizados e sem CI configurado.

## Telas
- **Onboarding** — boas-vindas com CTA "Começar".
- **Início (Home)** — lista de consultas em cartões, contador e botão "+".
- **Escuta** — tela de microfone com pulso/processando e transcrição ao vivo (mock).
- **Confirmação** — revisão do evento extraído da voz, com Editar/Confirmar.
- **Detalhes** — cartão da consulta, dados e ações Editar / Cancelar.
- **Edição** — formulário de nova consulta ou edição existente.
- **Histórico / Perfil** — stubs (abas inferiores).

## Stack
- React Native 0.74 + Expo SDK 51 (TypeScript)
- NativeWind 4 (Tailwind CSS) + `expo-linear-gradient` (gradientes azuis do design)
- `@expo-google-fonts/manrope`
- AsyncStorage (persistência local das consultas)
- react-native-svg (ícones)

## Como rodar
```bash
npm install
cp .env.example .env    # preencher se/quando a integração de voz real for ligada
npx expo start           # Expo Dev Tools (Expo Go no celular / emulador)
```
Web: `npx expo start --web` · iOS: `--ios` · Android: `--android`

Checagem de tipos: `npm run typecheck`

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
- Voz/IA real (`expo-av` + Whisper/OpenAI/Gemini) no lugar do mock em `src/services/voiceService.ts`.
- Completar Histórico e Perfil (hoje são stubs); validar tema escuro; seed de consultas iniciais.
- Testes automatizados e CI — nenhum dos dois existe ainda.
