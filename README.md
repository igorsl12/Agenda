# Agenda Dinâmica Inteligente — Protótipo (Voz)

App de **agenda de compromissos por voz** — consultas médicas, aulas, provas,
treinos, reuniões, lazer e o que mais você precisar agendar — em React Native + Expo.

Fale naturalmente → o app grava o áudio do microfone → a IA transcreve, extrai
os dados do compromisso (título, detalhes, data, horário, local, categoria,
notas) → mostra uma tela de confirmação → salva localmente.

**Voz real**: preencha `EXPO_PUBLIC_AI_PROXY_URL` (modo proxy, recomendado —
ver `server/`) ou uma chave direta (`EXPO_PUBLIC_GEMINI_API_KEY`,
`EXPO_PUBLIC_GROQ_API_KEY`, `EXPO_PUBLIC_OPENAI_API_KEY`) no `.env` — o app
auto-detecta o provedor. Sem nada configurado, roda em **modo mock**
(transcrição simulada, sem credenciais).

> ⚠️ **Segurança**: variáveis `EXPO_PUBLIC_*` são embutidas no bundle do app —
> qualquer pessoa com acesso ao APK ou à build web consegue extrair a chave.
> Aceitável para protótipo/uso pessoal com chaves de cota limitada; para
> **distribuição pública, use o modo proxy** (recomendado): rode o backend
> mínimo em [`server/`](server/README.md), que guarda as chaves server-side
> (`GEMINI_API_KEY` / `GROQ_API_KEY` / `OPENAI_API_KEY`, sem prefixo
> `EXPO_PUBLIC`), e configure só `EXPO_PUBLIC_AI_PROXY_URL` no `.env` do app.
> Com a URL do proxy definida, ela tem prioridade sobre as chaves diretas na
> auto-detecção — nenhuma chave vai para o bundle. Nunca distribua uma build
> contendo sua chave.

> Status: funcional de ponta a ponta. Testes unitários da lógica pura (vitest); sem CI configurado.

## Telas
- **Onboarding** — boas-vindas com CTA "Começar".
- **Início (Home)** — lista de compromissos em cartões, contador e botão "+".
- **Escuta** — grava o microfone (ou simula no mock); "Concluir" envia o áudio para a IA; erros com "Tentar novamente".
- **Confirmação** — revisão do evento extraído da voz, com Editar/Confirmar.
- **Detalhes** — cartão do compromisso, dados e ações Editar / Cancelar.
- **Edição** — formulário de novo compromisso ou edição existente, com seletor de categoria.
- **Agenda** — calendário mensal com dias selecionáveis e lista do dia.
- **Histórico** — busca + filtro por status e por categoria.
- **Perfil** — nome editável, tema claro/escuro/sistema, preferências persistidas (notificações/lembretes).

## Categorias
Saúde, Faculdade, Trabalho, Esporte, Lazer, Finanças, Outro — atribuídas manualmente
na Edição ou inferidas automaticamente pela IA a partir da fala.

## Stack
- React Native 0.74 + Expo SDK 51 (TypeScript)
- NativeWind 4 (Tailwind CSS) + `expo-linear-gradient` (gradientes azuis do design)
- `@expo-google-fonts/manrope`
- AsyncStorage (persistência local dos compromissos e preferências)
- expo-av (gravação de voz) + expo-notifications (lembretes locais)
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
├─ types.ts                  # Appointment / AppointmentCategory / ScreenName / TabName
├─ theme/ThemeProvider.tsx   # tema claro/escuro (paleta azul + Manrope)
├─ context/AppContext.tsx    # estado global (telas, abas, compromissos, voz, settings)
├─ storage/
│  ├─ appointmentStorage.ts  # persistência dos compromissos (+ seeds de demo)
│  └─ settingsStorage.ts     # nome, notificações, lembretes
├─ services/
│  ├─ recorderService.ts     # gravação de áudio (expo-av)
│  ├─ aiService.ts           # Gemini / Groq / OpenAI: áudio → evento estruturado
│  ├─ voiceService.ts        # mock de transcrição/extração
│  └─ notificationService.ts # lembretes locais (expo-notifications / web Notification)
├─ utils/appointmentUtils.ts # status, categoria, iniciais, cores, datas
├─ components/
│  ├─ ui.tsx                 # GradientBackground, Avatar, StatusBadge, CategoryBadge, ...
│  ├─ icons.tsx              # ícones SVG
│  ├─ AppointmentCard.tsx
│  └─ BottomNav.tsx          # 5 abas + FAB de voz central
└─ screens/                  # Onboarding, Home, Listening, Confirm, Details, Edit, Calendar, History, Profile
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
