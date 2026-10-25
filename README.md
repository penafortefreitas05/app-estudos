# FocoPro ✦ — Plataforma Intensiva de Estudos em TI

> SPA (Single Page Application) em Dark Mode projetada para preparação de alta performance em concursos públicos de Tecnologia da Informação (Analista de Sistemas, Engenharia de Software, Tribunais, Bacen, TCU).

---

## 🚀 Diferenciais & Funcionalidades

- **Zero Frameworks / Pure Vanilla JS:** ES6 Modules, sem build, carregamento rápido.
- **Acesso autenticado:** o banco de questões fica no Supabase, protegido por RLS, e só é carregado para usuários logados.
- **PWA (Progressive Web App):** instalável em desktop e celular. Os arquivos do app ficam em cache; as questões exigem conexão ao abrir.
- **Nenhuma resposta se perde:** respostas dadas sem internet ficam numa fila no aparelho e sobem para a nuvem, com a data original, quando a conexão volta.
- **9 Pilares Macro de TI:** matérias específicas agrupadas em categorias do edital, com o tópico original como `#tag` pesquisável.
- **Caderno de Erros:** registro de erros e anotações, com transição de status (`erro` ➔ `superado` ⚡) ao acertar na revisão.
- **Modo Simulado com Cronômetro:** respostas em lote, gabarito oculto até finalizar, tempo regressivo.
- **Explicação com IA:** Edge Function do Supabase (Gemini) com login obrigatório, limite de uso por usuário e cache de explicações.

---

## 🛠️ Arquitetura do Projeto

```text
focopro/
├── index.html              # Estrutura da página
├── manifest.json           # Instalação PWA
├── service-worker.js       # Cache só dos arquivos do site (nunca da API)
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
│   ├── supabase.js         # Conexão e consultas ao Supabase (paginadas)
│   ├── auth.js             # Login, cadastro e logout
│   ├── notifications.js    # Toasts e modais de confirmação
│   ├── api.js              # Normalização de questões (matéria, gabarito, IDs)
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
