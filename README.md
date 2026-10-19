# 🎯 FocoPro - Plataforma de Simulados para Concursos de TI

> Aplicação web (SPA) moderna, responsiva e otimizada para a preparação estratégica em concursos públicos de Tecnologia da Informação (Bacen, TCU, CGU, Analista Judiciário).

![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow?style=for-the-badge&logo=javascript)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)
![Architecture](https://img.shields.io/badge/Architecture-Modular_ES6-blue?style=for-the-badge)

---

## 🎨 Visão Geral & Interface

O **FocoPro** foi projetado com foco em usabilidade e alta performance durante longas sessões de estudo. Possui uma interface em **Dark Mode Premium** baseada nas paletas *Slate* e *Blue/Emerald*, reduzindo a fadiga visual e organizando métricas em tempo real.

---

## 🚀 Principais Funcionalidades

- 📖 **Banco de Questões Assíncrono:** Consumo estrito via **Fetch API** (`async/await`) alimentado por base de dados em formato JSON.
- ⚙️ **Arquitetura Modular (ES6):** Separação rígida de responsabilidades seguindo o princípio SOLID (Single Responsibility Principle).
- ⏱️ **Modo Simulado & Cronômetro:** Geração aleatória de simulados por quantidade e limite de tempo com relatório final de desempenho.
- 💾 **Persistência de Dados & Backup:** Armazenamento isolado no `localStorage` com suporte a **exportação e importação de histórico em JSON**.
- 🔔 **Sistema de Notificações Assíncronas:** Substituição de caixas nativas do navegador por **Toasts animadas** e **Modais baseados em Promises (`async/await`)**.
- 📊 **Dashboard Macro de Desempenho:** Cálculo dinâmico de taxa de acertos por matéria e marcação de status da questão (*Dominada*, *Em Aprendizado*, *Alerta*).

---

## 📁 Arquitetura do Projeto

```text
📁 focopro/
├── 📄 index.html              # Estrutura semântica principal (Entry point)
├── 📄 README.md                # Documentação técnica do repositório
├── 📁 css/
│   └── 📄 style.css           # Design System em Dark Mode Premium
├── 📁 data/
│   └── 📄 questoes.json       # Base estrita de dados em formato JSON
└── 📁 js/
    ├── 📄 api.js              # Serviço de busca assíncrona (Fetch API)
    ├── 📄 app.js              # Controlador e orquestrador de eventos
    ├── 📄 notifications.js    # Toasts e Modais assíncronos (Promises)
    ├── 📄 simulado.js         # Lógica de prova, cronômetro e relatórios
    ├── 📄 storage.js          # Camada de abstração do LocalStorage
    └── 📄 ui.js               # Renderização dinâmica do DOM e componentes