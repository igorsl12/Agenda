# Agenda Dinâmica Inteligente — Protótipo (Voz)

App de **agenda de consultas médicas por voz**, em React Native + Expo.

Fale naturalmente → o app grava o áudio do microfone → a IA transcreve e
extrai os dados da consulta (título, especialidade, data, horário, local,
notas) → mostra uma tela de confirmação → salva localmente.

**Voz real**: preencha `EXPO_PUBLIC_GEMINI_API_KEY` (ou `EXPO_PUBLIC_OPENAI_API_KEY`)
no `.env` — o app auto-detecta o provedor. Sem chave, roda em **modo mock**
(transcrição simulada, sem credenciais).

> Status: funcional de ponta a ponta. Testes unitários da lógica pura (vitest); sem CI configurado.

## Telas
- **Onboarding** — boas-vindas com CTA "Começar".
- **Início (Home)** — lista de consultas em cartões, contador e botão "+".
- **Escuta** — grava o microfone (ou simula no mock); "Concluir" envia o áudio para a IA; erros com "Tentar novamente".
- **Confirmação** — revisão do evento extraído da voz, com Editar/Confirmar.
- **Detalhes** — cartão da consulta, dados e ações Editar / Cancelar.
- **Edição** — formulário de nova consulta ou edição existente.
- **Agenda** — calendário mensal com dias selecionáveis e lista do dia.
- **Histórico** — busca + filtro por status.
- **Perfil** — nome editável, tema claro/escuro/sistema, preferências persistidas.

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

Checagem de tipos: `npm run typecheck` · Testes: `npm test`

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

## Arquitetura da voz
```
HomeScreen (FAB mic) → startVoice()
  └─ recorderService (expo-av)  — grava m4a (nativo) / webm (web)
       └─ aiService — Gemini (áudio → JSON em 1 chamada)
                      ou OpenAI (Whisper transcreve → GPT extrai JSON)
            └─ parseExtractionResponse() valida/normaliza (testado)
                 └─ ConfirmScreen → salva no AsyncStorage
```

## Próximos passos
- CI (GitHub Actions: typecheck + testes).
- Notificações locais reais (expo-notifications) para os lembretes do Perfil.
- Testes de componente/E2E das telas.
