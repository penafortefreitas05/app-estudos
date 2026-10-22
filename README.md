# FocoPro ✦ — Plataforma Intensiva de Estudos em TI

> SPA (Single Page Application) em Dark Mode projetada para preparação de alta performance em concursos públicos de Tecnologia da Informação (Analista de Sistemas, Engenharia de Software, Tribunais, Bacen, TCU).

---

## 🚀 Diferenciais & Funcionalidades

- **Zero Frameworks / Pure Vanilla JS:** Construído em ES6 Modules, sem overhead de dependências pesadas, garantindo carregamento ultrarrápido.
- **PWA (Progressive Web App):** Aplicação instalável em desktop e mobile com suporte **100% offline** via *Service Worker*.
- **9 Pilares Macro de TI:** Agrupamento automático de matérias hiperespecíficas em categorias consolidadas do edital, mantendo o tópico original como `#tag` pesquisável.
- **Caderno de Erros Inteligente:** Registro automático de falhas e anotações teóricas com transição de status (`erro` ➔ `superado` ⚡) ao acertar a questão na revisão.
- **Modo Simulado com Cronômetro:** Processamento de respostas em lote, ocultação de gabarito imediato e temporizador regressivo/progressivo.
- **Backup & Portabilidade:** Importação e exportação do histórico completo em JSON para migração entre dispositivos sem perda de estado.

---

## 🛠️ Arquitetura do Projeto

```text
focopro/
├── index.html            # Estrutura DOM com seletores unificados
├── manifest.json         # Configuração de instalação PWA e tema Dark Mode
├── service-worker.js     # Estratégia de cache híbrida e interceptação de rede
├── README.md             # Documentação técnica do repositório
│
├── css/
│   └── style.css         # Estilos Dark Mode, componentes, badges e modais
│
├── data/
│   └── questoes.json     # Banco de dados de questões normalizadas
│
├── js/
│   ├── app.js            # Orquestrador principal, inicializador e escutadores
│   ├── ui.js             # Manipulação DOM, placas, badges e renderização
│   ├── simulado.js       # Gerenciamento do cronômetro e processamento em lote
│   ├── storage.js        # Leitura e gravação no localStorage
│   ├── notifications.js  # Sistema de Toasts e Modais assíncronos (Promises)
│   └── api.js            # Fetch de questões e normalizador macro de matérias
│
└── icons/                # Ícones PWA para desktop e mobile.
    ├── android-chrome-192x192.png
    └── android-chrome-512x512.png
