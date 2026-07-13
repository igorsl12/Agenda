# Log de Estado do Projeto — Agenda Dinâmica Inteligente

Este arquivo é o artefato de continuidade do projeto. Descreve o estado atual, o
histórico e os próximos passos para retomada imediata em qualquer nova sessão.

---

## 📌 Estado Atual do Projeto
* **Descrição**: App de **agenda de compromissos por voz** (não só consultas
  médicas — também faculdade, trabalho, esporte, lazer, finanças...). O usuário
  fala → o app grava o áudio → a IA transcreve e extrai os dados do compromisso
  (título, detalhes, data, horário, local, categoria, notas) → mostra tela de
  confirmação → salva localmente. Inclui lista de compromissos, detalhes, edição,
  exclusão, calendário mensal, histórico com busca/filtros e barra de 5 abas
  (Início, Agenda, FAB de voz, Histórico, Perfil) sempre visível nas 4 telas de aba.
* **Origem do design**: arquivo `Voice agenda app prototype.zip` (protótipo
  "Draw Things" / `Voice Agenda App.dc.html`) — artefatos de prototipagem já
  removidos do repo; o app foi **reaplicado do zero** sobre esse design (paleta
  azul #2E6BF0, fonte Manrope, gradientes, cartões arredondados).
* **Tecnologias**: React Native + Expo + TypeScript, NativeWind (Tailwind),
  expo-linear-gradient, @expo-google-fonts/manrope, AsyncStorage, react-native-svg,
  expo-av (gravação de voz), expo-notifications (lembretes locais).
* **Estado de voz/IA**: **real**, com fallback mock. `src/services/aiService.ts`
  suporta Gemini, Groq e OpenAI (auto-detectado pela chave presente no `.env`);
  sem nenhuma chave, cai no mock (`src/services/voiceService.ts`).
* **Categorias**: Saúde, Faculdade, Trabalho, Esporte, Lazer, Finanças, Outro —
  atribuídas manualmente (Edição) ou inferidas pela IA a partir da fala.

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

### [13/07/2026] Voz real + categorias + agenda geral (não só saúde)
* **Voz real**: `recorderService.ts` (expo-av) grava m4a/webm; `aiService.ts` fala
  com Gemini (1 chamada multimodal) ou Groq/OpenAI (Whisper + chat) e valida/
  normaliza a resposta (testado). Erros de gravação/permissão/API aparecem na
  tela de Escuta com "Tentar novamente".
* **Notificações reais**: `notificationService.ts` agenda lembretes locais
  (expo-notifications nativo / Notification API no web), resincronizados sempre
  que compromissos ou preferências mudam.
* **Categorias**: novo campo `Appointment.category` (Saúde/Faculdade/Trabalho/
  Esporte/Lazer/Finanças/Outro) — seletor na Edição, badge em Cartão/Detalhes/
  Confirmação, filtro em chips no Histórico. IA já pede a categoria no prompt.
* **Reposicionamento geral**: app deixou de ser só "consultas médicas" — textos,
  seeds de demo e exemplos revisados para refletir uma agenda geral de eventos.
* **HistoryScreen redesenhada**: filtros de status/categoria agrupados num card,
  contagem de resultados, empty state com ícone e "Limpar filtros" (corrige um
  espaço em branco grande que sobrava quando a lista ficava vazia).

---

## 🚀 Próximos Passos e Instruções Futuras

1. **Tema escuro em telas restantes**: validar contraste nas telas de edição e
   confirmar que todos os textos usam `colors.ink`/`colors.muted` (não hex fixo).
2. **CI**: GitHub Actions rodando typecheck + `npm test` a cada push.
3. **Testes de componente/E2E** das telas principais.

---

## ▶️ Como rodar
* Dev web: `npx expo start --web` (Metro na 8081, web na 19006).
* Typecheck: `npm run typecheck`.
* Build web: `npx expo export --platform web --output-dir __webcheck`.
* Observação: no Windows/MSYS, processos do Expo às vezes precisam de
  `taskkill /F /PID <pid> /T` para encerramento completo.
