# FocoPro ✦ — Plataforma Intensiva de Estudos em TI

> SPA (Single Page Application) em Dark Mode projetada para preparação de alta performance em concursos públicos de Tecnologia da Informação (Analista de Sistemas, Engenharia de Software, Tribunais, Bacen, TCU).

---

## 🚀 Diferenciais & Funcionalidades

- **Zero Frameworks / Pure Vanilla JS:** ES6 Modules, sem build, carregamento rápido.
- **Acesso autenticado:** o banco de questões fica no Supabase, protegido por RLS, e só é carregado para usuários logados.
- **PWA (Progressive Web App):** instalável em desktop e celular. Os arquivos do app ficam em cache; as questões exigem conexão ao abrir.
- **Nenhuma resposta se perde:** respostas dadas sem internet ficam numa fila no aparelho e sobem para a nuvem, com a data original, quando a conexão volta.
- **Laboratório SQL:** em questões de SQL, depois de responder, dá para rodar o código de verdade (SQLite no próprio aparelho, sem servidor), num banco de exemplo estilo prova ou no script do enunciado, com dicas das diferenças entre SQL Server, Oracle, MySQL e SQLite. O motor (~650 KB) só é baixado por quem abre o laboratório.
- **Abre rápido:** os arquivos do site vêm do cache do aparelho; questões e histórico são buscados ao mesmo tempo; do histórico, só baixa o que é novo desde a última abertura (com conferência pela contagem total; se não bater, baixa tudo); a lista desenha 20 questões por vez.
- **9 Pilares Macro de TI:** matérias específicas agrupadas em categorias do edital, com o tópico original como `#tag` pesquisável.
- **Revisão espaçada:** questão errada (ou acertada na dúvida) volta em 1, 3, 7 e 21 dias; "Revisar hoje" mostra só o que vence no dia. Só vira Superada/Dominada acertando em dias diferentes.
- **Certeza ou dúvida:** cada resposta diz se foi com certeza; chute certo não conta como domínio e erro com certeza ganha destaque.
- **Questão-irmã:** depois de um erro, "Outra do mesmo assunto" traz uma questão parecida logo abaixo.
- **Matérias misturadas:** sem matéria escolhida, a lista alterna temas (como na prova).
- **Barra larga (computador):** a barra lateral ocupa cerca de um terço da tela (entre 300 e 560 px, variável `--largura-barra` no CSS).
- **Barra recolhível (computador):** o botão « no canto do FocoPro recolhe tudo e deixa só as questões; o botão F no canto traz de volta. O app lembra a escolha. No celular a barra continua sendo a gaveta ☰.
- **Aprender:** cada assunto do nível Iniciante é um cartão de dois lados: primeiro um exemplo resolvido (a 1ª questão do assunto, com a resposta certa e o comentário), depois as outras questões do assunto para provar que aprendeu. O assunto conta como aprendido com 2 de cada 3 certas; o progresso dos assuntos aparece na escolha da matéria do Aprender (o painel "Por matéria" tem um cartão por matéria: ícone, % de acerto e uma barrinha por nível, I verde, M azul, A laranja, E vermelho, só com questões respondidas). Tudo derivado do histórico, sem tabela nova (js/aprender.js).
- **Entenda em 1 minuto (Aprender, Fase 2):** antes do exemplo, um cartão curto por assunto (ideia central, exemplo, pegadinha). Os textos ficam em `data/resumos-assunto.json` (campos `materia`, `assunto`, `ideia_central`, `exemplo`, `pegadinha`; o `assunto` precisa ser igual ao das questões). Assunto sem texto segue direto para o exemplo. Hoje: Banco de Dados.
- **Modo Foco:** uma questão por vez, sem a barra de filtros. Teclado: A–E escolhe, Enter responde com certeza, Shift+Enter na dúvida, Enter de novo ou → vai para a próxima, ← volta, Esc sai. No fim, mostra quantas acertou na sessão.
- **Responder pelo teclado:** na lista normal, Tab chega nas alternativas, as setas trocam e Enter responde.
- **Reportar problema:** botão 🚩 em cada questão (gabarito errado, enunciado, alternativas, desatualizada). O admin vê a fila agrupada por questão em Ferramentas e Backup. SQL em `docs/sql/u5-reportes-questao.sql`.
- **Modo Simulado com Cronômetro:** respostas em lote, gabarito oculto até finalizar, tempo regressivo.
- **Explicação com IA:** Edge Function do Supabase (Gemini) com login obrigatório, limite de uso por usuário e cache de explicações.

---

## 🛠️ Arquitetura do Projeto

```text
focopro/
├── index.html              # Estrutura da página
├── manifest.json           # Instalação PWA
├── service-worker.js       # Cache só dos arquivos do site (nunca da API); abre do cache e avisa versão nova
├── vercel.json             # Cabeçalhos de segurança (CSP, anti-iframe etc.)
│
├── css/
│   └── style.css           # Estilos Dark Mode
│
├── js/
│   ├── app.js              # Orquestrador: estado, eventos e carga inicial
│   ├── ui.js               # Renderização das questões, placar e desempenho
│   ├── simulado.js         # Cronômetro e correção do simulado
│   ├── storage.js          # Histórico: localStorage + nuvem
│   ├── revisao.js          # Regra da revisão espaçada e dos status
│   ├── supabase.js         # Conexão e consultas ao Supabase (paginadas)
│   ├── auth.js             # Login, cadastro e logout
│   ├── notifications.js    # Toasts e modais de confirmação
│   ├── api.js              # Normalização de questões (matéria, gabarito, IDs)
│   ├── laboratorio-sql.js  # Laboratório SQL (carregado só ao abrir); motor em js/vendor/sqljs-1.14.2 (MIT)
│   ├── pwa.js              # Menu do celular, Service Worker e botão "Instalar"
│   └── vendor/
│       └── supabase-js-2.117.3.min.js   # Biblioteca do Supabase empacotada
│
├── supabase/functions/super-function/
│   └── index.ts            # Edge Function da explicação com IA
│
└── icons/                  # Ícones PWA
```

---

## 🔒 Segurança

- **RLS no Supabase:** `questoes` só pode ser lida por usuário logado e só o admin insere/atualiza; `historico_respostas` só é lido, gravado e apagado pelo próprio dono.
- **Edge Function:** recebe só `{ questaoId, respostaUsuario }`; enunciado, alternativas e gabarito são lidos do banco no servidor.
- **Front:** todo texto vindo do banco é escapado antes de ir para a tela.
- **CSP:** ativa em modo relatório (`Content-Security-Policy-Report-Only`) no `vercel.json`; passa a bloquear depois de um período sem violações.

---

## 📦 Dependências

`js/vendor/supabase-js-2.117.3.min.js` é o `@supabase/supabase-js@2.117.3` empacotado num arquivo só com o esbuild. Para atualizar:

```bash
npm install @supabase/supabase-js@<versao> esbuild
echo "export { createClient } from '@supabase/supabase-js';" > entry.js
npx esbuild entry.js --bundle --format=esm --minify --platform=browser --target=es2020 --legal-comments=none --outfile=supabase-js-<versao>.min.js
```

Depois troque o nome do arquivo em `js/supabase.js` e em `service-worker.js` (e suba o `CACHE_NAME`).


## Publicando uma versão nova

O app abre do cache do aparelho. A cada publicação que muda **qualquer** arquivo do site, suba o número do `CACHE_NAME` em `service-worker.js` (ex.: `focopro-v12` → `focopro-v13`). É isso que faz o celular baixar a versão nova e mostrar "Nova versão do FocoPro disponível". Sem subir o número, quem já tem o app continua na versão antiga.
