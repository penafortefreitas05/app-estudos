FocoPro ✦ — Plataforma Intensiva de Estudos em TISPA (Single Page Application) em Dark Mode projetada para preparação de alta performance em concursos públicos de Tecnologia da Informação (Analista de Sistemas, Engenharia de Software, Tribunais, Bacen, TCU).🚀 Diferenciais & FuncionalidadesZero Frameworks / Pure Vanilla JS: Construído em ES6 Modules, sem overhead de dependências pesadas, garantindo carregamento ultrarrápido.PWA (Progressive Web App): Aplicação instalável em desktop e mobile com suporte 100% offline via Service Worker.9 Pilares Macro de TI: Agrupamento automático de matérias hiperespecíficas em categorias consolidadas do edital, mantendo o tópico original como #tag pesquisável.Caderno de Erros Inteligente: Registro automático de falhas e anotações teóricas com transição de status (erro ➔ superado ⚡) ao acertar a questão na revisão.Modo Simulado com Cronômetro: Processamento de respostas em lote, ocultação de gabarito imediato e temporizador regressivo/progressivo.Backup & Portabilidade: Importação e exportação do histórico completo em JSON para migração entre dispositivos sem perda de estado.🛠️ Arquitetura do ProjetoPlaintextfocopro/
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
└── icons/                # Ícones PWA para desktop e mobile
    ├── android-chrome-192x192.png
    └── android-chrome-512x512.png
📊 Taxonomia das Matérias (9 Pilares Macro)O módulo js/api.js intercepta a carga do JSON e normaliza automaticamente mais de 25 tópicos específicos nos 9 Pilares Estratégicos dos Editais de TI:Pilar MacroSubtópicos & Tags Absorvidas1. PortuguêsGramática, Interpretação de Texto, Sintaxe, Redação Oficial2. Raciocínio Lógico & MatemáticaLógica Proposicional, Estatística, Probabilidade, RLM3. Engenharia de Software & AgilidadeScrum, Kanban, Requisitos, UML, Testes, Design Patterns4. Desenvolvimento, POO & LinguagensPOO, Javascript, Python, Java, HTML/CSS, APIs REST, Portais5. Banco de Dados & DadosModelagem ER, SQL, Normalização, NoSQL, BI, Data Warehouse, Buscas6. Arquitetura de TI & NuvemMicrosserviços, Docker, Kubernetes, AWS, Cloud Computing, DevOps7. Redes & Segurança da InformaçãoModelos OSI/TCP-IP, Criptografia, Firewalls, LGPD, ISO 270018. Governança, Gestão & ProjetosITIL v4, COBIT 2019, PMBOK, Gestão de Contratos de TI9. Sistemas Operacionais & HardwareLinux, Windows Server, Virtualização, Shell Script, Hardware⚡ Estratégia do Service Worker (PWA)O service-worker.js implementa uma estratégia de cache de dois níveis:Stale-While-Revalidate (App Shell): Recursos de interface (index.html, css/style.css, scripts da pasta js/) são entregues instantaneamente pelo cache e atualizados em segundo plano.Network-First com Fallback para Cache (Dados JSON): Requisições ao data/questoes.json buscam primeiro a versão mais recente na rede e utilizam o cache local caso o usuário esteja offline.