# app-estudos
Aplicativo pessoal de estudos e resoluções de questões.
# 🚀 App de Estudos Inteligente - Foco TI (Bacen, CGU, TCU)

## 📌 Sobre o Projeto
Uma aplicação web (Single Page Application - SPA) desenvolvida do zero com o objetivo de criar um ecossistema de estudos tático e altamente customizável para concursos públicos de alto nível em Tecnologia da Informação. 

Diferente de plataformas genéricas, este sistema permite o controle total do banco de questões e utiliza métricas de desempenho para direcionar revisões precisas, unindo conceitos de metodologias ativas de estudo (como flashcards e repetição espaçada) a um painel analítico de progresso.

## 🛠️ Tecnologias e Arquitetura
* **Frontend:** HTML5, CSS3 e JavaScript (Vanilla/ES6+).
* **Armazenamento:** `localStorage` (Client-side storage) garantindo isolamento total de dados por usuário e dispositivo, sem necessidade de backend na versão 1.0.
* **Banco de Dados Local:** Estrutura de dados em Array de Objetos JSON (`questoes.js`), otimizada para buscas rápidas e iterações nativas do JS.
* **Deploy e CI/CD:** Hospedado no [Vercel](https://vercel.com/) com integração contínua via GitHub.

## ⚙️ Funcionalidades e Destaques Técnicos

### 1. Motor de Filtragem Dinâmica e Busca em Tempo Real
* **Filtros Combinados:** Cruzamento de dados instantâneo utilizando o método `.filter()` do JavaScript para Banca, Matéria, Tags e Termos de Busca.
* **Sistema de Tags Clicáveis:** Implementação de marcações táticas (ex: `#bacen`, `#pegadinha`, `#estruturas-dados`) para isolamento de tópicos específicos.
* **Busca Textual (Live Search):** Varredura de strings no enunciado e alternativas aplicando `.toLowerCase()` e `.includes()` em tempo real enquanto o usuário digita.

### 2. Painel de Desempenho (Dashboard Analytics)
* **Classificação de Status:** Algoritmo que calcula a taxa de acertos e o volume de tentativas para classificar automaticamente a proficiência na questão ("Dominada", "Em Aprendizado", "Alerta: Erro", "Nova").
* **Dashboard Macro:** Geração dinâmica de barras de progresso percentuais que ilustram a evolução de aprendizado consolidada por disciplina.

### 3. Modo Simulado com Algoritmo Fisher-Yates
* **Embaralhamento Aleatório (Shuffle):** Implementação do algoritmo matemático *Fisher-Yates* para garantir complexidade de tempo O(n) na randomização justa do array de questões, evitando vícios visuais.
* **Fatiamento (Slice):** Geração de provas com limites customizáveis de questões definidos pelo usuário.
* **Cronômetro Regressivo:** Utilização de `setInterval` e manipulação de tempo (Minutos/Segundos) para simular a pressão do gerenciamento de tempo de uma prova real, com alertas visuais de esgotamento.

### 4. Modo Revisão Focada
* Filtragem baseada no estado da última resposta computada no `localStorage`, isolando apenas as questões erradas na tentativa anterior para uma revisão cirúrgica.

## 🚀 Roadmap (Próximos Passos)
- [ ] **Migração para Cloud:** Integração com Firebase ou Supabase (BaaS) para sincronização de dados entre dispositivos e trabalho offline/embarcado.
- [ ] **Autenticação:** Sistema de Login de usuários para isolar múltiplos perfis no servidor.
- [ ] **Algoritmo de Repetição Espaçada:** Automatização do agendamento de revisões inspirado no modelo do Anki.
- [ ] **Integração com IA:** Uso de LLMs para gerar explicações automáticas das alternativas incorretas.

---
*Desenvolvido por Nathan Freitas - Estudante de Análise e Desenvolvimento de Sistemas (ADS).*