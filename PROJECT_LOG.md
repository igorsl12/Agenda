# Log de Estado do Projeto — Agenda Dinâmica Inteligente

Este arquivo é o artefato de continuidade do projeto. Descreve o estado atual, o
histórico e os próximos passos para retomada imediata em qualquer nova sessão.

---

## 📌 Estado Atual do Projeto
* **Descrição**: App de **agenda de consultas médicas por voz**. O usuário fala →
  o app simula transcrição → extrai os dados da consulta (título, especialidade,
  data, horário, local, notas) → mostra tela de confirmação → salva localmente.
  Inclui lista de consultas, detalhes, edição, exclusão e barra de 5 abas
  (Início, Agenda, FAB de voz, Histórico, Perfil).
* **Origem do design**: arquivo `Voice agenda app prototype.zip` (protótipo
  "Draw Things" / `Voice Agenda App.dc.html`) extraído em `__design_extract/`.
  O app foi **reaplicado do zero** sobre esse design (paleta azul #2E6BF0, fonte
  Manrope, gradientes, cartões arredondados).
* **Tecnologias**: React Native + Expo + TypeScript, NativeWind (Tailwind),
  expo-linear-gradient, @expo-google-fonts/manrope, AsyncStorage, react-native-svg.
* **Estado de voz/IA**: **mock** (`src/services/voiceService.ts`) — transcrição e
  evento estruturado fictícios, para protótipo sem credenciais.

---

## 🕒 Histórico de Alterações

### [13/07/2026] Reaplicação sobre o novo design (Voice Agenda App)
* Fundação (types, ThemeProvider claro/escuro, storage, voiceService mock,
  appointmentUtils, AppContext global), primitivos (ui.tsx, icons.tsx),
  telas (Onboarding, Home, Listening, Confirm, Details, Edit, History, Profile),
  BottomNav (5 abas + FAB), App.tsx roteador por `screen`.
* Instalado `expo-linear-gradient` e `@expo-google-fonts/manrope` (ambos com
  `--legacy-peer-deps`). Fonte Manrope via bundle local (URL placeholder anterior
  fazia o título cair em serifada).

### [13/07/2026] Telas de menu + seed + correções de teste
* **Seed** de 3 consultas em `appointmentStorage.ts` (Dra. Fernanda Lima/
  Cardiologia, Exame de sangue, Dr. André Souza/Dermatologia) — Home não fica vazia.
* **CalendarScreen** real: calendário mensal (cabeçalho com setas, grade de dias,
  destaque de "hoje", marcadores nos dias com consulta) + lista "Hoje".
* **HistoryScreen** real: busca por título/especialidade/local + filtros
  (Todas/Confirmadas/Pendentes).
* **ProfileScreen** real: avatar, contagem de consultas, seletor de tema
  (Claro/Escuro/Sistema via ThemeProvider), Notificações, Idioma, Sobre.
* **Correções dark mode**: tokens CSS alinhados a #2E6BF0; Field/ConfirmScreen/
  DetailsScreen usam `bg-surface` e `colors.ink` (antes `bg-white`/`#101B36`
  hardcoded); GradientBackground com gradiente azulado.
* **Bug crítico de Editar/Cancelar resolvido**: os handlers `openEditExisting` e
  `deleteSelected` dependiam de `selectedId` que chegava `null` no clique (a tela
  de Detalhes renderizava com `current` não-null, mas o handler via closure pegava
  `selectedId` dessincronizado). Corrigido passando `current?.id` diretamente da
  DetailsScreen para handlers que agora aceitam `id?`. Detalhes também reestruturada
  para `View flex-1` + botões de ação fixos (fora de ScrollView) para garantir
  clicabilidade.
* **Resultado**: `npm run typecheck` limpo (0 erros); `npx expo export --platform web`
  compila (391 módulos). Fluxos validados no navegador (produção): onboarding→home,
  voz→confirmar→salvar, detalhes→editar→salvar (com persistência), detalhes→cancelar
  (exclusão), calendário, histórico (busca/filtro), perfil (tema claro/escuro).

---

## 🚀 Próximos Passos e Instruções Futuras

1. **Voz/IA real**: trocar `voiceService` mock por `expo-av` (gravação) + Whisper/
   OpenAI ou Gemini (extração estruturada). O `AppContext.startVoice` já orquestra
   os estados (listening → processing → confirm).
2. **Tema escuro em telas restantes**: validar contraste nas telas de edição e
   confirmar que todos os textos usam `colors.ink`/`colors.muted` (não hex fixo).
3. **Scroll em Details**: conteúdo curto cabe sem scroll; se houver notas longas,
   considerar `ScrollView` com `flex:1` + botões fixos (estrutura testada e ok).
4. **Calendário**: navegação entre meses já funciona; adicionar seleção de dia para
   filtrar consultas daquele dia, se desejado.
5. **Limpeza**: pasta `__design_extract/` e `__webcheck/` são temporárias — remover
   antes de commitar.

---

## ▶️ Como rodar
* Dev web: `npx expo start --web` (Metro na 8081, web na 19006).
* Typecheck: `npm run typecheck`.
* Build web: `npx expo export --platform web --output-dir __webcheck`.
* Observação: no Windows/MSYS, processos do Expo às vezes precisam de
  `taskkill /F /PID <pid> /T` para encerramento completo.
