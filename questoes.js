
    
    const questoes = [
    
    // id-1: Português - Concordância Verbal (Perfil Cesgranrio)
    { 
        id: 1, 
        banca: "Cesgranrio", 
        materia: "Português", 
        tags: ["#concordância", "#revisar-véspera", "#pegadinha"],
        enunciado: "Assinale a opção em que a concordância verbal está plenamente de acordo com a norma-padrão da Língua Portuguesa.", 
        alternativas: [
            "A) Fazem dois anos que estudo para o concurso do Banco Central.", 
            "B) Haviam muitos candidatos inscritos na prova de tecnologia.", 
            "C) Tratam-se de regras de negócio complexas na nova API.", 
            "D) Espera-se que hajam mudanças no edital na próxima semana.",
            "E) Devem existir outras formas de otimizar esse algoritmo."
        ], 
        gabarito: "E" 
    },

    // id-2: Raciocínio Lógico - Lógica de Primeira Ordem (Perfil FGV)
    { 
        id: 2, 
        banca: "FGV", 
        materia: "Raciocínio Lógico", 
        tags: ["#lógica-de-primeira-ordem", "#silogismo", "#cgu"],
        enunciado: "Considere as seguintes premissas verdadeiras: 'Todo desenvolvedor sabe Python. Nenhum analista de infraestrutura sabe Python.' A partir dessas premissas, é logicamente correto concluir que:", 
        alternativas: [
            "A) Algum analista de infraestrutura é desenvolvedor.", 
            "B) Nenhum desenvolvedor é analista de infraestrutura.", 
            "C) Todo analista de infraestrutura é desenvolvedor.", 
            "D) Pelo menos um desenvolvedor não sabe Python.",
            "E) Todo desenvolvedor é analista de infraestrutura."
        ], 
        gabarito: "B" 
    },

    // id-3: Python - Tipagem e Operadores (Perfil Cesgranrio)
    { 
        id: 3, 
        banca: "Cesgranrio", 
        materia: "Python", 
        tags: ["#python", "#tipos-de-dados", "#operadores"],
        enunciado: "Em Python 3, a divisão comum entre dois números inteiros utilizando o operador de barra simples (por exemplo, ao executar `resultado = 5 / 2`) gerará um valor do tipo:", 
        alternativas: [
            "A) int", 
            "B) float", 
            "C) double", 
            "D) decimal",
            "E) string"
        ], 
        gabarito: "B" 
    },

    // id-4: Python - Manipulação de Listas (Perfil Cesgranrio)
    { 
        id: 4, 
        banca: "Cesgranrio", 
        materia: "Python", 
        tags: ["#python", "#listas", "#estruturas-dados"],
        enunciado: "Considere a lista `dados = [10, 20, 30]`. Para adicionar o valor inteiro `40` exatamente ao final dessa estrutura em Python, o método correto a ser utilizado é:", 
        alternativas: [
            "A) dados.insert(40)", 
            "B) dados.push(40)", 
            "C) dados.add(40)", 
            "D) dados.append(40)",
            "E) dados.extend(40)"
        ], 
        gabarito: "D" 
    },

    // id-5: Ciência de Dados - Métodos Supervisionados vs Não Supervisionados
    { 
        id: 5, 
        banca: "FGV", 
        materia: "Ciência de Dados", 
        enunciado: "Dois colegas de um time de ciência de dados discutem o novo projeto do time: avaliar um grupo de unidades de negócio e tentar, através de algumas características compartilhadas, separá-las em grupos. O objetivo é migrar de um cenário em que são elaborados contratos individuais para um cenário em que possam ser elaborados contratos por grupo. Alice acha que deve ser usado um método supervisionado. Ela escolhe o K-means Clustering e propõe ajustar os hiperparâmetros C e sigma para alcançar um resultado adequado. Bob prefere métodos não supervisionados, já que a base de dados não possui rótulos, e está em dúvida entre utilizar Naive Bayes (em razão de a base de dados ser pequena) ou Decision Trees (por talvez ser necessário ter um modelo explicável). Analisando as posições de Alice e Bob sobre esse projeto, pode-se afirmar que:", 
        alternativas: [
            "A) Alice e Bob estão corretos. Entretanto, não é possível realizar uma análise prévia dos algoritmos avaliam-se apenas modelos e suas métricas de desempenho;", 
            "B) Alice e Bob estão errados. K-means Clustering é um método não supervisionado e não possui os parâmetros C e sigma. Naive Bayes e Decision Trees são métodos supervisionados;", 
            "C) Alice está correta, mas a sugestão de Bob de utilizar Naive Bayes é fraca, pois esse algoritmo não apresenta bom desempenho com pequenos conjuntos de dados;", 
            "D) Bob está correto e Alice está errada. K-means Clustering é um algoritmo não supervisionado;",
            "E) Bob está errado e Alice está correta. Modelos baseados em Decision Trees não são explicáveis." 
        ], 
        gabarito: "B" 
    },

    // id-6: Ciência de Dados - Matriz de Confusão e Métricas
    { 
        id: 6, 
        banca: "FGV", 
        materia: "Ciência de Dados", 
        enunciado: "Considere uma matriz de confusão de um modelo de classificação binária de relatórios financeiros. O modelo classifica os relatórios em fraudulentos ou não fraudulentos. Se essa matriz apresenta 200 verdadeiros positivos, 100 verdadeiros negativos, 40 erros do 'tipo 1' e 20 erros do 'tipo 2' podem-se calcular as métricas de desempenho aproximadas como:", 
        alternativas: [
            "A) Precision = 0.71. Recall = 0.83;", 
            "B) Precision = 0.83. Recall = 0.71;", 
            "C) Precision = 0.83. Recall = 0.90;", 
            "D) Precision = 0.90. Recall = 0.71;",
            "E) Precision = 0.90. Recall = 0.83." 
        ], 
        gabarito: "C" 
    },

    // id-7: Ciência de Dados - Armazém de Dados vs Lago de Dados
    { 
        id: 7, 
        banca: "FGV", 
        materia: "Ciência de Dados", 
        enunciado: "Uma organização deseja implementar um pipeline de dados e está avaliando a opção mais adequada para o seu contexto de operação. Em torno de 40% dos dados consumidos pela organização se encontram em planilhas eletrônicas que contêm dados sensíveis, produzidas semanalmente por suas unidades de negócio. Os outros 60% dos dados se encontram em alguns bancos de dados relacionais de sistemas de produção da organização. O tamanho da base é de moderado a pequeno, mas existe a necessidade de conformidade com normas de privacidade e confidencialidade dos dados. O objetivo do pipeline é fornecer insumos para um departamento que realiza análises de dados com métodos não supervisionados de aprendizagem de máquina para elaborar relatórios periódicos mensais. A organização está avaliando a construção de um Armazém de Dados (ETL) ou de um Lago de Dados (ELT). A proposta de modelo adequada e corretamente justificada é:", 
        alternativas: [
            "A) Armazém de Dados. Ambos os modelos são adequados, mas Lago de Dados tem maior latência até a carga (L) e custo maior;", 
            "B) Armazém de Dados. Esse modelo possui menor latência até a carga (L) e, ao contrário do Lago de Dados, opera de forma eficiente com dados relacionais;", 
            "C) Armazém de Dados. O processo ETL é mais adequado para o tratamento dos dados sensíveis e os casos de uso são bem conhecidos;", 
            "D) Lago de Dados. Esse modelo possui menor latência até a carga (L) e permite a extração (E) de dados semiestruturados e não estruturados;",
            "E) Lago de Dados. Esse modelo não necessita de hardware especializado e, ao contrário do Armazém de Dados, possibilita tarefas de aprendizado de máquina." 
        ], 
        gabarito: "C" 
    },

    // id-8: Ciência de Dados - Overfitting e Underfitting
    { 
        id: 8, 
        banca: "FGV", 
        materia: "Ciência de Dados", 
        enunciado: "Um time de ciência de dados utilizou um modelo linear para resolver uma tarefa de análise de dados financeiros provenientes de diferentes unidades de uma organização. Um membro do time, que não participou da modelagem, testa o modelo e verifica que ele apresenta um péssimo resultado. Preocupado, ele busca os resultados apresentados no treino e pode concluir que ocorreu:", 
        alternativas: [
            "A) underfitting, se o resultado do treino foi ótimo. Uma possível solução é a utilização de um modelo mais complexo e a redução do tempo de treinamento;", 
            "B) underfitting, se o resultado do treino também foi péssimo. Uma possível solução é a utilização de um modelo menos complexo e métodos de validação cruzada;", 
            "C) overfitting, se o resultado do treino também foi péssimo. Uma possível solução é a utilização de técnicas de regularização e métodos de validação cruzada;", 
            "D) overfitting, se o resultado do treino foi ótimo. Uma possível solução é a utilização de um modelo menos complexo e métodos de validação cruzada;",
            "E) overfitting, se o resultado do treino foi ótimo. Uma possível solução é a utilização de um modelo mais complexo e o aumento do tempo de treinamento." 
        ], 
        gabarito: "D" 
    },

    // id-9: Ciência de Dados - Código Python e Arrays
    { 
        id: 9, 
        banca: "FGV", 
        materia: "Ciência de Dados", 
        enunciado: "Analise o código Python a seguir: x = lambda a, b: a + [a[-1] + a[-2] + b]; y = [-1, 0]; for i in range(7): y = x(y, i); print(y). O resultado produzido pela execução desse código na IDLE Shell 3.9.9 é:", 
        alternativas: [
            "A) [-1, 0, -1, -1, -2, -3, -5, -8, -13]", 
            "B) [0, 1, 4, 9, 18, 33, 51, 84]", 
            "C) [-1, 0, -1, -2, -3, -5, -8, -13, -21]", 
            "D) [-1, 0, 1, 0, 1, 4, 9, 18, 33]",
            "E) [-1, 0, 1, 4, 9, 18, 33, 51]" 
        ], 
        gabarito: "E" 
    },

    // id-10: Ciência de Dados - Naive Bayes e NLP
    { 
        id: 10, 
        banca: "FGV", 
        materia: "Ciência de Dados", 
        enunciado: "Considere as sentenças a seguir. A = 'Eu gostei do livro, apesar do livro ser longo'; B = 'Esse livro é muito legal'; C = 'Eu não gostei do livro, não gosto muito desse autor'. Vamos considerar a seguinte classificação sobre o sentido das sentenças acima: A - positiva; B - positiva; C - negativa. Para calcular as probabilidades de uma sentença ser positiva e de uma determinada palavra aparecer na sentença, dado que a sentença é positiva, em Aprendizado de Máquinas, pode-se usar o Naive Bayes. Com a utilização dessa técnica, e com base nos dados das três sentenças acima, os valores das estimativas de máxima verossimilhança de P(positiva) e P(livro | positiva) são, respectivamente:", 
        alternativas: [
            "A) 1/3 e 1/2", 
            "B) 1/3 e 3/14", 
            "C) 2/3 e 3/14", 
            "D) 2/3 e 1/2",
            "E) 2/3 e 2/3" 
        ], 
        gabarito: "C" 
    },

    // id-11: Ciência de Dados - Regressão Linear
    { 
        id: 11, 
        banca: "FGV", 
        materia: "Ciência de Dados", 
        enunciado: "Como parte de um esforço para melhorar a produtividade, uma empresa vem medindo o tempo gasto em cada tarefa do seu principal processo produtivo. Uma das tarefas, que envolve carregar material em uma máquina, ocorre uma vez por dia e teve os seguintes tempos medidos na semana anterior, em minutos: Seg 80, Ter 76, Qua 85, Qui 68, Sex 56. Considerando um modelo de regressão linear ajustado para perda mínima, usando as medições da semana anterior, o valor residual com relação ao modelo, para o tempo de 70 minutos medido na quinta-feira da semana atual é, em minutos:", 
        alternativas: [
            "A) -3", 
            "B) -2", 
            "C) 1", 
            "D) 2",
            "E) 3" 
        ], 
        gabarito: "D" 
    },

    // id-12: Bancos de Dados - PostgreSQL e Sequences
    { 
        id: 12, 
        banca: "FGV", 
        materia: "Bancos de Dados", 
        enunciado: "No âmbito do PostgreSQL 12, considere o comando a seguir: CREATE SEQUENCE TESTE. Ao objeto TESTE, assim criado, aplicam-se as seguintes funções nativas:", 
        alternativas: [
            "A) before, after;", 
            "B) commit, abort;", 
            "C) currval, nextval;", 
            "D) low, high;",
            "E) next, last." 
        ], 
        gabarito: "C" 
    },

    // id-13: Bancos de Dados - SQL Server e Identity
    { 
        id: 13, 
        banca: "FGV", 
        materia: "Bancos de Dados", 
        enunciado: "No contexto do SQL Server 2019, considere o script SQL a seguir: create table XPTO ( C1 int identity, C2 varchar(16) ) insert into XPTO (C2) values ('A') insert into XPTO (C2) values ('B') insert into XPTO (C2) values ('C') truncate table XPTO insert into XPTO (C2) values ('D') insert into XPTO (C2) values ('E') delete from XPTO truncate table XPTO insert into XPTO (C2) values ('F') truncate table XPTO. Após a execução desse script, o resultado exibido pelo comando select max(C1) from XPTO é:", 
        alternativas: [
            "A) 0", 
            "B) NULL", 
            "C) 1", 
            "D) 3",
            "E) 6" 
        ], 
        gabarito: "B" 
    },

    // id-14: Bancos de Dados - Estrutura MongoDB
    { 
        id: 14, 
        banca: "FGV", 
        materia: "Bancos de Dados", 
        enunciado: "Sobre o MongoDB v5.0, considere as afirmativas a seguir. I. Todos os documentos de uma coleção (collection) devem possuir o mesmo número de campos (fields). II. Um campo presente em diferentes documentos de uma collection pode ter diferentes tipos de dados ao longo dos documentos. III. MongoDB oferece a capacidade de validar esquemas durante operações de inserção (insertion) e atualização (update). Está correto o que se afirma em:", 
        alternativas: [
            "A) somente I;", 
            "B) somente III;", 
            "C) somente I e II;", 
            "D) somente II e III;",
            "E) I, II e III." 
        ], 
        gabarito: "D" 
    },
    // id-15: Desenvolvimento de Sistemas - Controle de Versão (GIT)
    { 
        id: 15, 
        banca: "FGV", 
        materia: "Desenvolvimento de Sistemas", 
        enunciado: "Sistemas de Controle de Versão (SCV), tais como o Mercurial, o GIT e o SVN, são ferramentas indispensáveis para apoiar as melhores práticas de desenvolvimento de sistemas. Os SCVs atualmente disponíveis possuem grande flexibilidade para se adaptar ao fluxo de trabalho de um time e suas práticas de desenvolvimento. No GIT, essa customização do fluxo de trabalho para um time ou projeto é comum, e muitos desses fluxos de trabalho utilizam uma abordagem conhecida como ramificação de recurso (Feature Branch). Uma possível limitação dessa abordagem seria o(a):", 
        alternativas: [
            "A) diminuição da velocidade de desenvolvimento. A necessidade de utilização de rebase quando uma funcionalidade é finalizada aumenta a complexidade do desenvolvimento;", 
            "B) indisponibilidade de dados de auditoria. Existe perda parcial do histórico do repositório quando é realizado o merge de um ramo (Branch);", 
            "C) impacto na integração contínua. Se o ciclo de entrega de funcionalidade de um time é longo, aumentam os riscos e desafios dos merges e integrações;", 
            "D) menor qualidade funcional. O novo fluxo de trabalho dificulta a elaboração de testes de aceitação em função da separação de funcionalidades em diferentes ramos (Branches);",
            "E) menor qualidade do código. O novo fluxo de trabalho dificulta a execução de revisão de código (Code Review) pela imposição de pull requests e merge reviews." 
        ], 
        gabarito: "C" 
    },

    // id-16: Desenvolvimento de Sistemas - Segurança (Vulnerabilidades)
    { 
        id: 16, 
        banca: "FGV", 
        materia: "Desenvolvimento de Sistemas", 
        enunciado: "Considere um cenário típico de exposição de dados sensíveis: uma organização acredita estar segura ao utilizar a criptografia automática do seu banco de dados para encriptar dados financeiros sigilosos dos seus usuários, mas esquece que permite que esses dados sejam automaticamente decriptados nas operações de consulta. Um time de desenvolvedores sem experiência em desenvolvimento seguro trabalha em uma aplicação que acessa essa base de dados. Ao longo do desenvolvimento da aplicação, um tipo comum de vulnerabilidade é inserido em muitas das consultas realizadas, como no seguinte trecho: String consultaHTTP = 'SELECT * FROM extratos WHERE id_cliente=' + request.getParameter('id') + ''; Para mitigar o impacto dos riscos criados por esse tipo de vulnerabilidade, é possível utilizar:", 
        alternativas: [
            "A) protocolos como FTP ou SMTP para o transporte dos dados sensíveis da aplicação;", 
            "B) funções criptográficas fortes, como MD5 e SHA1, no mecanismo automático do banco de dados;", 
            "C) frameworks ORM como o Hibernate e linguagens de consulta como a HQL (Hibernate Query Language);", 
            "D) apenas dados fornecidos por usuários autenticados no processamento de consultas;",
            "E) cláusulas como LIMIT nas consultas para restringir os resultados retornados." 
        ], 
        gabarito: "C" 
    },

    // id-17: Desenvolvimento de Sistemas - Revisão de Código e Validação
    { 
        id: 17, 
        banca: "FGV", 
        materia: "Desenvolvimento de Sistemas", 
        enunciado: "Considere o desenvolvimento de uma aplicação de tratamento de dados sensíveis. O time tem experiência com desenvolvimento seguro e elabora uma lista de verificação com foco em segurança para ser utilizada na revisão de código manual que ocorre antes de um commit. Essa lista de verificação trata exclusivamente da aplicação de boas práticas de validação dos dados de entrada das unidades do sistema. Deveria fazer parte dessa lista verificar se:", 
        alternativas: [
            "A) todo acesso ao banco utiliza credenciais seguras;", 
            "B) todos os dados são validados após redirecionamentos;", 
            "C) todos os dados provenientes de usuários são validados após o processamento;", 
            "D) toda operação de registro (logging) é realizada por aplicações de terceiros (Third Party Applications);",
            "E) apenas falhas de validação de autenticação e autorização causam rejeição completa dos dados de entrada." 
        ], 
        gabarito: "C" 
    },

   // id-18: Desenvolvimento de Sistemas - Metodologia Ágil (Scrum)
    { 
        id: 18, 
        banca: "FGV", 
        materia: "Desenvolvimento de Sistemas", 
        enunciado: "De acordo com o Guia do Scrum, a 'Meta da Sprint é o único objetivo da Sprint. Embora a Meta da Sprint seja um compromisso dos Developers, esta fornece flexibilidade em termos do trabalho exato necessário para alcançá-la'. A Meta da Sprint é elaborada:", 
        alternativas: [
            "A) pelo Product Owner, e deve ser finalizada antes da Sprint Planning, para que seja apresentada e negociada com o Scrum Team;", 
            "B) por todo o Scrum Team na Sprint Planning, e deve ser finalizada até o final do evento;", 
            "C) em conjunto pelo Product Owner e os Developers, e deve ser finalizada até o início do primeiro Daily Scrum;", 
            "D) em conjunto pelo Product Owner e os Developers, e deve ser finalizada até o final da Sprint;",
            "E) pelos Developers na Sprint Planning, e deve ser finalizada até o final do evento." 
        ], 
        gabarito: "D" 
    },

    // id-19: Segurança da Informação - Continuidade de Negócios (ABNT 22301)
    { 
        id: 19, 
        banca: "FGV", 
        materia: "Segurança da Informação", 
        enunciado: "A equipe de Tecnologia da Informação (TI) de um órgão da Administração Pública Federal (APF), ao definir sua Política de Gestão de Continuidade de Negócios (PGCN), precisará restringir o escopo inicial da PGCN, devido a restrições orçamentárias. Considerando que o órgão oferta serviços web essenciais para a população e que a indisponibilidade desses serviços poderia acarretar grandes prejuízos para seus usuários, a alta administração do órgão definiu o escopo inicial de sua PGCN, incluindo os dez principais serviços web ofertados. Para assegurar a implementação e a sustentação da PGCN, de acordo com a ABNT 22301 (Segurança e resiliência - Sistema de gestão de continuidade de negócios), a equipe de TI deve optar por uma estratégia de recuperação de negócios que:", 
        alternativas: [
            "A) utilize uma solução de continuidade adotada em outro órgão da APF e incluí-la no Plano Diretor de Tecnologia da Informação e Comunicação (PDTIC) para contratação/aquisição emergencial;", 
            "B) impeça a disrupção dos serviços de TI ofertados pelo órgão por mapearem os processos e utilizarem replicação de dados assíncrona em um Centro de Dados de contingência;", 
            "C) contemple planos e procedimentos para a operação durante a disrupção, incluindo os custos com a aquisição dos equipamentos necessários;", 
            "D) inclua as orientações e os recursos necessários para a operação antes, durante e após a disrupção, considerando os custos e benefícios associados;",
            "E) considere todos os serviços a serem recuperados com a mesma prioridade, variando apenas o seu tempo de recuperação ou dependência de outros serviços." 
        ], 
        gabarito: "D" 
    },

    // id-20: Segurança da Informação - Preservação de Evidências e Logs
    { 
        id: 20, 
        banca: "FGV", 
        materia: "Segurança da Informação", 
        enunciado: "A equipe liderada por Jonas é responsável por prover o home office de um órgão da Administração Pública Federal (APF). Jonas recebeu uma solicitação da Equipe de Tratamento de Incidente de Rede (ETIR) para fornecer os registros de acesso a um sistema, ocorridos durante determinado tempo, para averiguação por suspeita de um incidente de segurança da informação. Considerando as orientações da Norma Complementar 21/IN01/DSIC/GSIPR, quanto aos requisitos para adequação dos ativos de informação para coleta e preservação das evidências, a equipe de Jonas deve fornecer as seguintes informações para cada acesso:", 
        alternativas: [
            "A) identificação inequívoca do usuário;", 
            "B) registro das autenticações malsucedidas;", 
            "C) data e hora dos acessos sincronizados com o servidor de hora local;", 
            "D) tempo máximo de registro de log de quatro meses;",
            "E) registro das autenticações bem sucedidas." 
        ], 
        gabarito: "C" 
    },

    // id-21: Segurança da Informação - Controles CIS v8 e LGPD
    { 
        id: 21, 
        banca: "FGV", 
        materia: "Segurança da Informação", 
        enunciado: "A equipe de Tecnologia da Informação (TI) de um órgão público está implementando uma solução de TI para atender requisitos de segurança e privacidade dos dados pessoais em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD). Adicionalmente, a equipe passou a adotar controles de segurança do CIS v8 (Center for Internet Security, Inc.) para mitigar os tipos de ataques cibernéticos mais conhecidos. Para reforçar o trabalho associado à LGPD, a equipe de TI identificou e começou a implementar um controle de segurança do CIS v8 que auxilia na mitigação de violação de dados, garantindo privacidade e integridade das informações sensíveis e pessoais. O controle de segurança do CIS v8 implementado pela equipe de TI é a:", 
        alternativas: [
            "A) configuração segura de ativos institucionais e software;", 
            "B) proteção de dados;", 
            "C) gestão do controle de acesso;", 
            "D) gestão contínua de vulnerabilidades;",
            "E) recuperação de dados." 
        ], 
        gabarito: "B" 
    },

    // id-22: Segurança da Informação - IN 01 GSI e Gestor de Segurança
    { 
        id: 22, 
        banca: "FGV", 
        materia: "Segurança da Informação", 
        enunciado: "Geraldo foi aprovado em um concurso público e assumiu a função de gestor de Segurança da Informação. O órgão em que Geraldo trabalha está atualizando sua Política de Segurança da Informação alinhada às orientações da Instrução Normativa nº 01 do Gabinete de Segurança Institucional (GSI). Como gestor de Segurança da Informação, Geraldo possui, entre suas atribuições:", 
        alternativas: [
            "A) a aprovação da Política de Segurança da Informação no âmbito de seu órgão;", 
            "B) a publicação de atos normativos sobre segurança da informação;", 
            "C) o provimento dos recursos necessários para a execução da Política de Segurança da Informação no âmbito de seu órgão;", 
            "D) a manutenção de contato direto com o Departamento de Segurança da Informação do GSI em assuntos relativos à segurança da informação;",
            "E) a comunicação de incidentes de segurança ao Centro de Tratamento de Incidentes de Segurança em Redes de Computadores da Administração Pública Federal (CTIR Gov)." 
        ], 
        gabarito: "D" 
    },
    // id-23: Segurança da Informação - PKIX e X.509
    { 
        id: 23, 
        banca: "FGV", 
        materia: "Segurança da Informação", 
        enunciado: "Wallace está implementando em um órgão público um modelo de infraestrutura de chaves públicas baseado no padrão X.509 (PKIX). Wallace identificou que os sistemas clientes, para operarem com segurança, necessitam da instalação de materiais da chave que possuem o relacionamento apropriado com as chaves armazenadas em outro lugar na infraestrutura de chaves públicas. Para gerenciar a PKIX de forma a atender o requisito identificado, Wallace deve implementar a função:", 
        alternativas: [
            "A) registro;", 
            "B) inicialização;", 
            "C) certificação;", 
            "D) certificação cruzada;",
            "E) solicitação de revogação." 
        ], 
        gabarito: "D" 
    },

    // id-24: Segurança da Informação - ISO/IEC 27005 (Gestão de Riscos)
    { 
        id: 24, 
        banca: "FGV", 
        materia: "Segurança da Informação", 
        enunciado: "João foi contratado para fazer a gestão de risco em um órgão público de acordo com as diretrizes para o processo de gestão de riscos de segurança da informação estabelecidas na norma ABNT NBR ISO/IEC 27005:2019. João está trabalhando em sua tarefa incluindo, excluindo e alterando alguns controles. Com isso poderá avaliar os riscos residuais e considerá-los aceitáveis ou não. A etapa do processo de gestão de riscos de segurança da informação em que João está trabalhando é:", 
        alternativas: [
            "A) definição do contexto;", 
            "B) processo de avaliação de riscos;", 
            "C) tratamento de riscos;", 
            "D) aceitação de riscos;",
            "E) monitoramento e análise crítica dos riscos." 
        ], 
        gabarito: "C" 
    },

    // id-25: Segurança da Informação - Segurança de Endpoints
    { 
        id: 25, 
        banca: "FGV", 
        materia: "Segurança da Informação", 
        enunciado: "Roberto é funcionário de um órgão público e está trabalhando em home office devido ao cenário pandêmico. Para que não haja perda de produtividade, Roberto precisa acessar a rede interna do órgão onde trabalha. Para isso, Roberto irá utilizar um computador considerado um endpoint, por se tratar de um dispositivo final que se conecta fisicamente a uma rede interna do órgão. Para que o órgão público em que Roberto trabalha possa confiar em conexões externas com a rede interna, soluções de segurança de endpoints precisam ser implementadas e ter como características:", 
        alternativas: [
            "A) redução de custos e facilidade de atualização;", 
            "B) configuração simplificada e fácil instalação de API;", 
            "C) monitoramento completo e antivírus atualizado;", 
            "D) administração descentralizada e facilidade de integração com novas tecnologias;",
            "E) bloqueio de ações indesejadas e controle no lado do usuário." 
        ], 
        gabarito: "E" 
    },

    // id-26: Segurança da Informação - ISO/IEC 27001 (SGSI e SoA)
    { 
        id: 26, 
        banca: "FGV", 
        materia: "Segurança da Informação", 
        enunciado: "Um Sistema de Gestão de Segurança da Informação (SGSI) é um conjunto de controles que uma organização implementa para proteger os seus próprios ativos de informação e também para proteger outros ativos pelos quais é responsável. A norma ABNT NBR ISO/IEC 27001:2019 fornece os requisitos necessários para um SGSI. Rafael foi contratado para implementar o SGSI em um órgão público. Ele elencou os controles necessários para garantir a adequação à norma. Para isso, Rafael teve que elaborar:", 
        alternativas: [
            "A) políticas de segurança da informação;", 
            "B) avaliação de desempenho;", 
            "C) política de controle de acesso;", 
            "D) definição de funções e responsabilidades de segurança;",
            "E) declaração de aplicabilidade." 
        ], 
        gabarito: "E" 
    },
    // id-27: Python - Manipulação de Listas e Dicionários (Perfil Bacen/CGU)
    { 
        id: 27, 
        banca: "CEBRASPE", 
        materia: "Python", 
        tags: ["#python", "#bacen", "#estruturas-dados"],
        enunciado: "Em Python, considere a instrução: dados = {'a': 1, 'b': 2, 'c': 3}. A execução da instrução list(dados.keys()) produzirá como resultado uma lista contendo as chaves do dicionário.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-28: Ciência de Dados - Aprendizado Não Supervisionado (Perfil Bacen/CGU)
    { 
        id: 28, 
        banca: "CEBRASPE", 
        materia: "Ciência de Dados", 
        tags: ["#algoritmos", "#bacen", "#clustering"],
        enunciado: "O algoritmo K-Means é um método de aprendizado de máquina não supervisionado utilizado para agrupamento (clustering), no qual o número de clusters (K) deve ser definido previamente pelo usuário.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-29: Python - Compreensão de Listas (List Comprehension)
    { 
        id: 29, 
        banca: "FGV", 
        materia: "Python", 
        tags: ["#python", "#cgu", "#sintaxe-avançada"],
        enunciado: "Considere o seguinte código em Python 3: numeros = [1, 2, 3, 4, 5]; resultado = [x**2 for x in numeros if x % 2 != 0]. O valor da variável 'resultado' após a execução é:", 
        alternativas: [
            "A) [1, 4, 9, 16, 25]", 
            "B) [4, 16]", 
            "C) [1, 9, 25]", 
            "D) [2, 4]",
            "E) [1, 3, 5]" 
        ], 
        gabarito: "C" 
    },

    // id-30: Engenharia de Software - Microserviços (Perfil Bacen/CGU)
    { 
        id: 30, 
        banca: "FGV", 
        materia: "Desenvolvimento de Sistemas", 
        tags: ["#arquitetura", "#bacen", "#microserviços"],
        enunciado: "Em uma arquitetura baseada em microsserviços, cada serviço deve idealmente possuir sua própria base de dados (Database per Service) para garantir o desacoplamento e a autonomia de implantação.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },
    // id-31: Banco de Dados - Normalização (Perfil Bacen/CGU)
    { 
        id: 31, 
        banca: "CEBRASPE", 
        materia: "Bancos de Dados", 
        tags: ["#normalização", "#bacen", "#banco-de-dados"],
        enunciado: "Acerca de banco de dados relacional, julgue o item a seguir. A terceira forma normal (3FN) exige que a tabela esteja na segunda forma normal (2FN) e que não existam dependências transitivas entre os atributos não chave e a chave primária.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-32: Segurança da Informação - Assinatura Digital
    { 
        id: 32, 
        banca: "CEBRASPE", 
        materia: "Segurança da Informação", 
        tags: ["#assinatura-digital", "#criptografia", "#bacen"],
        enunciado: "Na assinatura digital, utiliza-se a chave privada do remetente para cifrar o hash da mensagem, garantindo assim a integridade e o não repúdio da informação.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-33: Engenharia de Software - Requisitos
    { 
        id: 33, 
        banca: "CEBRASPE", 
        materia: "Desenvolvimento de Sistemas", 
        tags: ["#engenharia-de-requisitos", "#bacen", "#agile"],
        enunciado: "Os requisitos não funcionais dizem respeito às restrições sobre os serviços ou funções oferecidos pelo sistema, como, por exemplo, restrições de tempo, limitações sobre o processo de desenvolvimento ou imposições por padrões.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-34: Banco de Dados - SQL Joins (Perfil CGU)
    { 
        id: 34, 
        banca: "FGV", 
        materia: "Bancos de Dados", 
        tags: ["#sql", "#cgu", "#join"],
        enunciado: "Em SQL, o operador utilizado para combinar registros de duas tabelas, retornando apenas as linhas que possuem valores correspondentes em ambas as tabelas, é o:", 
        alternativas: [
            "A) LEFT JOIN", 
            "B) RIGHT JOIN", 
            "C) FULL OUTER JOIN", 
            "D) INNER JOIN", 
            "E) CROSS JOIN"
        ], 
        gabarito: "D" 
    },

    // id-35: Python - Tratamento de Exceções
    { 
        id: 35, 
        banca: "FGV", 
        materia: "Python", 
        tags: ["#python", "#cgu", "#exceções"],
        enunciado: "Em Python, o bloco de código destinado a tentar executar instruções que podem gerar erros, e o bloco destinado a capturar e tratar as exceções caso elas ocorram, são definidos, respectivamente, pelas palavras reservadas:", 
        alternativas: [
            "A) try e catch", 
            "B) try e except", 
            "C) catch e default", 
            "D) try e finally", 
            "E) except e end"
        ], 
        gabarito: "B" 
    },

    // id-36: Ciência de Dados - Overfitting
    { 
        id: 36, 
        banca: "CEBRASPE", 
        materia: "Ciência de Dados", 
        tags: ["#machine-learning", "#bacen", "#overfitting"],
        enunciado: "Ocorre overfitting (sobreajuste) quando um modelo de aprendizado de máquina se ajusta tão bem aos dados de treinamento que acaba perdendo a capacidade de generalização para novos dados, apresentando alto desempenho no treino, mas baixo desempenho no teste.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },
    // id-37: Arquitetura de Computadores - Operações Binárias (Bacen)
    { 
        id: 37, 
        banca: "CEBRASPE", 
        materia: "Arquitetura de Computadores", 
        tags: ["#binarios", "#complemento-de-dois", "#bacen"],
        enunciado: "Computadores efetuam a subtração de números binários por meio de adição, na qual o número a ser subtraído é representado em complemento de um.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },

    // id-38: Arquitetura de Computadores - Compiladores (Bacen)
    { 
        id: 38, 
        banca: "CEBRASPE", 
        materia: "Arquitetura de Computadores", 
        tags: ["#compiladores", "#assembly", "#bacen"],
        enunciado: "Um programa em linguagem de alto nível deve ser compilado para se transformar em linguagem de montagem e, posteriormente, montado para se transformar em linguagem de máquina.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },

    // id-39: Sistemas Operacionais - Permissões Unix (Bacen)
    { 
        id: 39, 
        banca: "CEBRASPE", 
        materia: "Sistemas Operacionais", 
        tags: ["#unix", "#linux", "#permissoes", "#bacen"],
        enunciado: "A respeito de sistemas operacionais, julgue o item que se segue: Em sistemas Unix, a proteção de arquivos é efetuada pelo controle dos campos dono, grupo e universo, compostos de três bits (rwx), que definem se um usuário pode ler, escrever ou executar o arquivo.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-40: Sistemas Operacionais - Gerenciamento de Memória (Bacen)
    { 
        id: 40, 
        banca: "CEBRASPE", 
        materia: "Sistemas Operacionais", 
        tags: ["#memoria", "#processos", "#bacen"],
        enunciado: "A respeito de sistemas operacionais, julgue o item que se segue: Para que um programa possa ser executado, suas instruções precisam ser mapeadas para endereços absolutos e carregadas na memória.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },
    // id-41: Redes de Computadores - Taxa de Transmissão (Bacen)
    { 
        id: 41, 
        banca: "CEBRASPE", 
        materia: "Redes de Computadores", 
        tags: ["#teorema-nyquist", "#meios-de-transmissao", "#bacen"],
        enunciado: "Com relação às redes de computadores, julgue o item subsequente: A taxa de dados máxima alcançável em um canal ideal pode ser calculada pela equação de Nyquist e, em um canal ruidoso, pela equação de Metcalfe.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },

    // id-42: Arquitetura de Computadores - Sistemas Concorrentes (Bacen)
    { 
        id: 42, 
        banca: "CEBRASPE", 
        materia: "Arquitetura de Computadores", 
        tags: ["#sistemas-distribuidos", "#computacao-paralela", "#bacen"],
        enunciado: "Julgue o próximo item, relativo a sistemas concorrentes: Na computação paralela, todos os processadores estão presentes no mesmo circuito integrado, enquanto, na computação distribuída, cada processador encontra-se geograficamente separado por longas distâncias.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },

    // id-43: Gerenciamento de Projetos - PMBOK (Bacen)
    { 
        id: 43, 
        banca: "CEBRASPE", 
        materia: "Gerenciamento de Projetos", 
        tags: ["#pmbok", "#estruturas-organizacionais", "#bacen"],
        enunciado: "Em uma organização de matriz fraca, o gerente de projetos e o gerente funcional compartilham igualmente o poder.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },

    // id-44: Gerenciamento de Projetos - Diagrama de Rede (Bacen)
    { 
        id: 44, 
        banca: "CEBRASPE", 
        materia: "Gerenciamento de Projetos", 
        tags: ["#pmbok", "#cronograma", "#bacen"],
        enunciado: "Para criar o diagrama de rede, é necessário criar primeiramente a lista de atividades.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-45: Governança de TI - COBIT 4.1 (Bacen)
    { 
        id: 45, 
        banca: "CEBRASPE", 
        materia: "Governança de TI", 
        tags: ["#cobit", "#maturidade", "#bacen"],
        enunciado: "Em relação aos fundamentos de SCRUM, ITIL V3 e COBIT, julgue o item a seguir: Segundo o COBIT 4.1, uma organização está no nível 2 repetível, quando as decisões dependem de pessoas-chave e a área de TI é organizada para responder taticamente, porém de forma inconsistente.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },// id-46: Governança de TI - ITIL V3 (Bacen)
    { 
        id: 46, 
        banca: "CEBRASPE", 
        materia: "Governança de TI", 
        tags: ["#itil-v3", "#gerenciamento-configuracao", "#bacen"],
        enunciado: "Em relação aos fundamentos de SCRUM, ITIL V3 e COBIT, julgue o item a seguir: De acordo com a biblioteca ITIL V3, o banco de dados do gerenciamento de configuração (BDGC) contém todas as requisições de mudança de um item de configuração (IC).", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-47: Engenharia de Software - SCRUM (Bacen)
    { 
        id: 47, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#scrum", "#agil", "#product-owner", "#bacen"],
        enunciado: "Em relação aos fundamentos de SCRUM, ITIL V3 e COBIT, julgue o item a seguir: No SCRUM, o product owner é responsável por alterar o backlog da sprint durante a sprint.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },
    // id-48: Engenharia de Software - APF / Usuários (Bacen)
    { 
        id: 48, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#apf", "#atores", "#bacen"],
        enunciado: "Julgue os seguintes itens, acerca da análise de pontos de função (APF): O agente governamental que atua diretamente nos requisitos do software e interage com ele é considerado um usuário do sistema.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-49: Engenharia de Software - Requisitos (Bacen)
    { 
        id: 49, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#requisitos", "#requisitos-nao-funcionais", "#bacen"],
        enunciado: "Transferência de dados, transformação de dados, usabilidade, portabilidade e armazenamento de dados são considerados requisitos funcionais.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },

    // id-50: Engenharia de Software - Análise de Pontos de Função (Bacen)
    { 
        id: 50, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#apf", "#metricas", "#bacen"],
        enunciado: "Um dos objetivos da APF é medir como o software foi construído.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },

    // id-51: Engenharia de Software - Manutenção (Bacen)
    { 
        id: 51, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#manutencao", "#tipos-de-manutencao", "#bacen"],
        enunciado: "Na mudança de servidor de uma aplicação web de Apache para Websphere, a aplicação já instalada precisará de manutenção adaptativa, quando passará por algumas alterações.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },

    // id-52: Engenharia de Software - Processos (Bacen)
    { 
        id: 52, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#processo-de-software", "#ciclo-de-vida", "#bacen"],
        enunciado: "A engenharia de software engloba, além dos processos técnicos de desenvolvimento de software, atividades de gerenciamento de projeto de software e desenvolvimento de ferramentas, métodos e procedimento para apoiar a produção de software. Oferece uma base para a construção de software de alta qualidade e produtividade. Com relação à engenharia de software, julgue o item que se segue: Procedimento é o conjunto de tarefas que inclui o planejamento e estimativa de projeto, análise de requisitos de sistema, modelagem de dados, arquitetura, codificação, teste e manutenção.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },
    // id-53: Engenharia de Software - Orientação a Objetos (Bacen)
    { 
        id: 53, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#orientacao-a-objetos", "#modelagem", "#bacen"],
        enunciado: "Julgue os itens a seguir, relativos a análise e projeto de software: A modelagem orientada a objetos pode demonstrar, entre outros aspectos, como eles podem ser classificados, de que forma herdam atributos e operações de outros objetos, como são compostos por meio de modelos de agregação e de que forma interagem por meio de modelos de comportamento simples.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-54: Engenharia de Software - Modelagem ER (Bacen)
    { 
        id: 54, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#mer", "#dicionario-de-dados", "#bacen"],
        enunciado: "Julgue os itens a seguir, relativos a análise e projeto de software: Na modelagem entidade-relacionamento-atributo, dicionários de dados podem ser utilizados a fim de se obter descrições mais detalhadas das entidades, relacionamentos e atributos incluídos no modelo.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-55: Engenharia de Software - DDD e Linguagem Ubíqua (Bacen)
    { 
        id: 55, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#ddd", "#linguagem-ubiqua", "#bacen"],
        enunciado: "Julgue os itens a seguir, relativos a análise e projeto de software: A linguagem ubíqua utiliza termos que fazem parte das discussões entre os especialistas de negócio e as equipes de desenvolvimento, os quais devem utilizar a mesma terminologia na linguagem falada e no código.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-56: Engenharia de Software - UML (Bacen)
    // id-56: Engenharia de Software - UML (Bacen)
    { 
        id: 56, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#uml", "#metodologia", "#pegadinha", "#bacen"],
        enunciado: "Julgue os itens a seguir, relativos a análise e projeto de software: UML (unified modeling language) é uma metodologia de desenvolvimento focada na análise orientada a objetos que buscam especificar, construir e documentar artefatos de um sistema de software.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "⚠️ PEGADINHA: UML não é uma METODOLOGIA de desenvolvimento (como Scrum ou XP). Ela é apenas uma LINGUAGEM de modelagem visual. Ela não diz 'como' você deve trabalhar, apenas te dá os símbolos para desenhar o projeto."
    },

    // id-57: Engenharia de Software - Requisitos (Bacen)
    { 
        id: 57, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#requisitos", "#funcionais-x-nao-funcionais", "#bacen"],
        enunciado: "Julgue os itens a seguir, relativos a análise e projeto de software: A análise de requisitos envolve descoberta, refinamento, modelagem e especificação do software. Requisitos funcionais estão relacionados aos serviços que o software deve oferecer, ao passo que requisitos não funcionais são restrições acerca de serviços oferecidos pelo software.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },
    // id-58: Engenharia de Software - Metodologias Ágeis (Bacen)
    { 
        id: 58, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#agil", "#manifesto-agil", "#bacen"],
        enunciado: "Julgue os itens subsequentes, no que se refere aos processos de desenvolvimento de software: Uma metodologia é considerada ágil quando realiza o desenvolvimento de software de forma incremental, colaborativa, direta e adaptativa.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A",
        explicacao: "💡 DICA: Os quatro pilares do desenvolvimento ágil nas provas são: Iterativo (ciclos), Incremental (entregas parciais), Colaborativo (cliente junto à equipe) e Adaptativo (aberto a mudanças)."
    },

    // id-59: Engenharia de Software - Extreme Programming / XP (Bacen)
    { 
        id: 59, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#xp", "#extreme-programming", "#pegadinha", "#bacen"],
        enunciado: "Julgue os itens subsequentes, no que se refere aos processos de desenvolvimento de software: As principais características do Extreme Programming são a divisão em equipes de até 7 pessoas, duração de uma iteração de quatro semanas e distribuição de equipes.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "⚠️ PEGADINHA: A banca misturou conceitos de Scrum e XP! No XP (Extreme Programming), as iterações são bem curtas (1 a 2 semanas, não 4) e a equipe deve trabalhar junta fisicamente no mesmo ambiente (não equipes distribuídas/separadas). Além disso, o número fixo de pessoas remete mais às regras do Scrum."
    },

    // id-60: Engenharia de Software - ISO/IEC 12207 (Bacen)
    { 
        id: 60, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#iso-12207", "#processos", "#bacen"],
        enunciado: "Julgue os itens subsequentes, no que se refere aos processos de desenvolvimento de software: De acordo com a norma ISO/IEC 12.207, se uma atividade é coesiva o suficiente, ela é convertida em um subprocesso por meio da definição de propósito e resultados.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-61: Engenharia de Software - Modelos de Ciclo de Vida (Bacen)
    { 
        id: 61, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#ciclo-de-vida", "#modelo-incremental", "#bacen"],
        enunciado: "Julgue os itens subsequentes, no que se refere aos processos de desenvolvimento de software: Na abordagem incremental, o sistema é dividido em subsistemas por funcionalidades. Após a identificação das funcionalidades a serem entregues no primeiro incremento, novas funcionalidades serão adicionadas a cada versão.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },
    // id-62: Desenvolvimento Web - CSS (Bacen)
    { 
        id: 62, 
        banca: "CEBRASPE", 
        materia: "Desenvolvimento Web", 
        tags: ["#css", "#padding", "#bacen"],
        enunciado: "Acerca das folhas de estilo (CSS), julgue o item seguinte: A propriedade padding permite que o usuário redimensione um elemento HMTL, como <div>, por exemplo. A sintaxe correta para essa propriedade é div { padding: both; }.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "⚠️ PEGADINHA: A propriedade que permite o redimensionamento de um elemento pelo usuário é 'resize' (ex: resize: both;). A propriedade 'padding' serve apenas para definir o espaçamento interno do elemento."
    },

    // id-63: Desenvolvimento Web - CSS (Bacen)
    { 
        id: 63, 
        banca: "CEBRASPE", 
        materia: "Desenvolvimento Web", 
        tags: ["#css", "#text-transform", "#bacen"],
        enunciado: "Acerca das folhas de estilo (CSS), julgue o item seguinte: A propriedade text indentation transforma em maiúscula a primeira letra de cada palavra que esteja formatada, por exemplo, por meio do elemento <p>. A sintaxe correta para essa propriedade é p{text-indentation:capitalize;}.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "⚠️ PEGADINHA: A banca inventou a propriedade 'text-indentation' (o correto para recuo é 'text-indent'). Além disso, para transformar a primeira letra de cada palavra em maiúscula, a propriedade correta é 'text-transform: capitalize;'."
    },

    // id-64: Acessibilidade - e-MAG (Bacen)
    { 
        id: 64, 
        banca: "CEBRASPE", 
        materia: "Acessibilidade", 
        tags: ["#e-mag", "#javascript", "#acessibilidade", "#bacen"],
        enunciado: "Considerando o modelo de acessibilidade de governo eletrônico (e-MAG) 3.0, julgue o item subsecutivo: Quando apenas o teclado do computador for utilizado, todas as funções da página, desenvolvidas em Javascript, devem estar disponíveis.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-65: Acessibilidade - e-MAG (Bacen)
    { 
        id: 65, 
        banca: "CEBRASPE", 
        materia: "Acessibilidade", 
        tags: ["#e-mag", "#leitores-de-tela", "#bacen"],
        enunciado: "Considerando o modelo de acessibilidade de governo eletrônico (e-MAG) 3.0, julgue o item subsecutivo: Para permitir que softwares leitores de tela leiam mais facilmente o conteúdo de páginas com carga textual elevada, recomenda-se abrir os links que remetam a esse conteúdo em novas instâncias de abas ou janelas. Assim, deve-se sempre utilizar a mudança no controle do foco do teclado.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "💡 DICA: Abrir links em novas abas/janelas forçadamente é uma das piores práticas de acessibilidade. Isso desorienta completamente o usuário de leitor de tela, pois ele perde o histórico de navegação (botão 'voltar' para de funcionar) e o contexto."
    },

    // id-66: Acessibilidade - W3C e e-MAG (Bacen)
    { 
        id: 66, 
        banca: "CEBRASPE", 
        materia: "Acessibilidade", 
        tags: ["#w3c", "#html", "#e-mag", "#bacen"],
        enunciado: "Considerando o modelo de acessibilidade de governo eletrônico (e-MAG) 3.0, julgue o item subsecutivo: Para maximizar a compatibilidade com atuais e futuros agentes de usuário, é fundamental respeitar os padrões de desenvolvimento web do W3C (World Wide Web Consortium). Por exemplo, é necessário declarar o DOCTYPE correto da página de qualquer documento HTML ou XHTML.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-67: Redes de Computadores - Intranet e Extranet (Bacen)
    { 
        id: 67, 
        banca: "CEBRASPE", 
        materia: "Redes de Computadores", 
        tags: ["#intranet", "#extranet", "#bacen"],
        enunciado: "Julgue o item a seguir, referente à arquitetura de aplicações web: Intranet é uma rede privada de computadores. Extranet pode ser vista como extensão de uma intranet para usuários externos a uma organização, geralmente parceiros, vendedores e fornecedores, em isolamento de todos os outros usuários da Internet.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-68: Banco de Dados - SGBD (Bacen)
    { 
        id: 68, 
        banca: "CEBRASPE", 
        materia: "Banco de Dados", 
        tags: ["#sgbd", "#iis", "#pegadinha", "#bacen"],
        enunciado: "Considerando os sistemas de gerenciamento de bancos de dados, julgue o próximo item: PostgreSQL, MariaDB, IIS e SQL Server são exemplos de sistemas gerenciadores de bancos de dados.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "⚠️ PEGADINHA: O IIS (Internet Information Services) da Microsoft não é um Banco de Dados (SGBD). Ele é um Servidor Web (assim como o Apache ou o Nginx)."
    },

    // id-69: Engenharia de Software - Arquitetura MVC (Bacen)
    { 
        id: 69, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#mvc", "#arquitetura-de-software", "#bacen"],
        enunciado: "Julgue o seguinte item, acerca da arquitetura em três camadas: MVC (Model-view-controller) é um modelo de arquitetura de software que separa, de um lado, a representação da informação e, de outro, a interação do usuário com a informação.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },
    // id-70: Arquitetura de Software - REST (Bacen)
    { 
        id: 70, 
        banca: "CEBRASPE", 
        materia: "Arquitetura de Software", 
        tags: ["#rest", "#api", "#bacen"],
        enunciado: "No que diz respeito a soluções de integração, julgue o item a seguir: O estilo arquitetural REST define um conjunto de restrições para uma aplicação, como, por exemplo, utilização de arquitetura par-a-par, manutenção de informações de estado, não uso de cache no cliente e apresentação de uma interface uniforme.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "⚠️ PEGADINHA: A banca inverteu os princípios REST! REST utiliza arquitetura cliente-servidor (e não par-a-par), é stateless / sem estado (não mantém informações de estado) e incentiva ativamente o uso de cache."
    },

    // id-71: Desenvolvimento Mobile - Arquitetura (Bacen)
    { 
        id: 71, 
        banca: "CEBRASPE", 
        materia: "Desenvolvimento Mobile", 
        tags: ["#mobile", "#arquitetura", "#bacen"],
        enunciado: "Julgue o item subsequente, relativo às arquiteturas para desenvolvimento de aplicativos em dispositivos móveis: No projeto de aplicações para dispositivos móveis, devem ser considerados, entre outros aspectos, as características dos dispositivos de hardware para os quais a aplicação está sendo desenvolvida e o consumo de energia gerado por cada recurso do sistema, visando-se a economia de bateria.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-72: Computação em Nuvem - Multitenancy (Bacen)
    { 
        id: 72, 
        banca: "CEBRASPE", 
        materia: "Computação em Nuvem", 
        tags: ["#cloud", "#multitenancy", "#bacen"],
        enunciado: "A respeito de computação em nuvem, julgue o próximo item: Multitenancy é uma importante característica da computação em nuvem que garante que cada usuário acesse recursos da nuvem de forma exclusiva.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "💡 DICA: O conceito de 'Multitenancy' (Multi-inquilino) significa exatamente o oposto: os recursos físicos e o software são COMPARTILHADOS entre vários clientes (inquilinos), embora os dados de cada um fiquem isolados logicamente."
    },

    // id-73: Linguagens de Programação - C# (Bacen)
    { 
        id: 73, 
        banca: "CEBRASPE", 
        materia: "Linguagens de Programação", 
        tags: ["#c-sharp", "#operadores", "#bacen"],
        enunciado: "No que se refere a linguagens e ambientes de programação Java, C# e paradigma de programação orientada a objetos, julgue o item subsequente: Em C#, o operador ?? é denominado operador de concentração de nulo e é usado para definir um valor padrão para tipos de valor anulável ou tipos de referência. No exemplo abaixo, caso a variável num seja nula, o valor de x será igual a 1.\n\nint x = num ?? 1;", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-74: Linguagens de Programação - Java (Bacen)
    { 
        id: 74, 
        banca: "CEBRASPE", 
        materia: "Linguagens de Programação", 
        tags: ["#java", "#operadores", "#matematica", "#bacen"],
        enunciado: "Considere que as linhas abaixo foram retiradas de um programa escrito em Java, e que não há modificações destas ao longo do programa.\n\nint i = 10;\nint n = ++i%5;\n\nDiante disso, os valores finais das variáveis i e n serão, respectivamente, 11 e 1.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A",
        explicacao: "💡 DICA: O operador '++' vem ANTES de 'i' (pré-incremento). Logo, o 'i' vira 11 primeiro. Depois ocorre a operação '11 % 5' (resto da divisão de 11 por 5), que é 1. Portanto, i=11 e n=1."
    },

    // id-75: Orientação a Objetos - Polimorfismo (Bacen)
    { 
        id: 75, 
        banca: "CEBRASPE", 
        materia: "Orientação a Objetos", 
        tags: ["#poo", "#polimorfismo", "#sobrecarga", "#bacen"],
        enunciado: "No paradigma orientado a objetos, o polimorfismo está relacionado à herança de métodos. O Java possui duas modalidades de polimorfismo: overriding, que consiste em alterar o método em uma subclasse mantendo-se sua mesma assinatura da superclasse; e overloading, no qual há métodos de mesmo nome associados por meio da herança, porém, com argumentos diferentes.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "⚠️ PEGADINHA: O erro está em dizer que o 'overloading' (sobrecarga) é associado 'por meio da herança'. A sobrecarga geralmente ocorre DENTRO da própria classe, criando métodos com o mesmo nome, mas recebendo parâmetros diferentes."
    },

    // id-76: Linguagens de Programação - C# (Bacen)
    { 
        id: 76, 
        banca: "CEBRASPE", 
        materia: "Linguagens de Programação", 
        tags: ["#c-sharp", "#loops", "#logica", "#bacen"],
        enunciado: "Considere a seguinte classe desenvolvida em C#.\n\nclass Teste {\n static void Main() {\n  int num = 1;\n  while (num++ < 6) {\n   Console.WriteLine (\"num é = {0}\", num);\n  }\n }\n}\n\nNessa situação, essa classe produz o seguinte resultado:\nnum é = 1\nnum é = 2\nnum é = 3\nnum é = 4\nnum é = 5", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "⚠️ PEGADINHA de Teste de Mesa: Como é usado 'num++' no while, ele testa a condição com o valor atual e incrementa logo em seguida. Quando 'num' vale 1 (testa 1 < 6, Certo), ele já entra no bloco de código valendo 2. Portanto, o programa vai imprimir de 'num é = 2' até 'num é = 6', e não de 1 a 5."
    },
    // id-77: Desenvolvimento Web - CSS3 (Bacen)
    { 
        id: 77, 
        banca: "CEBRASPE", 
        materia: "Desenvolvimento Web", 
        tags: ["#css3", "#animacoes", "#bacen"],
        enunciado: "Julgue os itens subsecutivos, referentes ao desenvolvimento de sistemas web HTML/HTML5 e CSS3: O CSS3 permite criar animações e transições de estilo sem a necessidade de utilizar Flash ou Javascripts.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-78: Desenvolvimento Web - HTML5 (Bacen)
    { 
        id: 78, 
        banca: "CEBRASPE", 
        materia: "Desenvolvimento Web", 
        tags: ["#html5", "#formularios", "#bacen"],
        enunciado: "Julgue os itens subsecutivos, referentes ao desenvolvimento de sistemas web HTML/HTML5 e CSS3: O exemplo abaixo está escrito corretamente em HTML 5 e o atributo required obriga o usuário a escolher uma cor para que o formulário seja enviado.\n\n&lt;select required&gt;\n  &lt;option value=\"\"&gt;Escolha um&lt;/option&gt;\n  &lt;option value=\"vermelho\"&gt;Vermelho&lt;/option&gt;\n  &lt;option value=\"verde\"&gt;Verde&lt;/option&gt;\n  &lt;option value=\"azul\"&gt;Azul&lt;/option&gt;\n&lt;/select&gt;", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-79: Engenharia de Software - Testes (Bacen)
    { 
        id: 79, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#testes", "#junit", "#java", "#bacen"],
        enunciado: "Acerca de JUnit, JMeter e Concordion, julgue o próximo item: O JUnit é um framework que permite realizar testes unitários de códigos Java, herdando algumas características da própria linguagem. Na versão 4.11, ele permite, entre outros recursos, mudar a ordem de testes, criar testes parametrizados, executar testes de exceção e testes temporizados por meio da palavra-chave timeout.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-80: Banco de Dados - SQL (Bacen)
    { 
        id: 80, 
        banca: "CEBRASPE", 
        materia: "Banco de Dados", 
        tags: ["#sql", "#funcoes-de-string", "#bacen"],
        enunciado: "Considerando o script: CREATE TABLE Pessoa ( Id int NULL, Matricula int NOT NULL, Nome varchar(255) NOT NULL, DataNascimento date NULL );\n\nJulgue o item seguinte: O comando abaixo seleciona os cinco primeiros caracteres da coluna Nome da tabela Pessoa.\n\nSELECT MID(Nome,1,5) FROM Pessoa", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-81: Banco de Dados - SQL Insert (Bacen)
    { 
        id: 81, 
        banca: "CEBRASPE", 
        materia: "Banco de Dados", 
        tags: ["#sql", "#insert", "#restricoes", "#bacen"],
        enunciado: "Considerando a tabela Pessoa ( Id int NULL, Matricula int NOT NULL, Nome varchar(255) NOT NULL, DataNascimento date NULL ), julgue o item:\n\nO comando abaixo insere corretamente apenas um registro na tabela Pessoa.\n\nINSERT INTO Pessoa (Id,Matricula) VALUES (1,287)", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "⚠️ PEGADINHA: A inserção vai falhar! A tabela 'Pessoa' foi criada com a coluna 'Nome' sendo 'NOT NULL'. Como o comando INSERT não informou nenhum valor para o Nome, o banco de dados rejeitará a operação."
    },

    // id-82: Banco de Dados - SQL Primary Key (Bacen)
    { 
        id: 82, 
        banca: "CEBRASPE", 
        materia: "Banco de Dados", 
        tags: ["#sql", "#primary-key", "#bacen"],
        enunciado: "Considerando a tabela Pessoa ( Id int NULL, Matricula int NOT NULL, Nome varchar(255) NOT NULL, DataNascimento date NULL ), julgue o item:\n\nPara criar uma chave primária composta na Tabela Pessoa, deve-se executar o seguinte comando.\n\nALTER TABLE Pessoa ADD CONSTRAINT pk_PessoaID PRIMARY KEY (Id, Matricula)", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "⚠️ PEGADINHA: Repare que a coluna 'Id' foi definida como 'NULL' na criação da tabela. Em bancos relacionais, NENHUMA coluna que faça parte de uma Chave Primária (PK) pode aceitar valores nulos. O comando retornará erro."
    },

    // id-83: Banco de Dados - SQL Foreign Key (Bacen)
    { 
        id: 83, 
        banca: "CEBRASPE", 
        materia: "Banco de Dados", 
        tags: ["#sql", "#foreign-key", "#bacen"],
        enunciado: "Considerando a tabela EnderecoPessoa ( Id int NOT NULL, TipoEndereco char (1) NOT NULL, Endereco varchar(255), Cidade char(55), UF varchar (2) ), julgue o item:\n\nConsiderando que o campo Id na tabela Pessoa esteja corretamente configurado como chave primária, para se criar uma chave estrangeira, deve-se executar o comando:\n\nALTER TABLE EnderecoPessoa ADD CONSTRAINT fk_Endereco_Pessoa FOREIGN KEY (P_id) REFERENCES Pessoa (Id)", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "⚠️ PEGADINHA: O comando falha miseravelmente porque tenta usar a coluna 'P_id' na tabela EnderecoPessoa... mas essa coluna NÃO EXISTE na estrutura da tabela que foi criada! As colunas da tabela são apenas Id, TipoEndereco, Endereco, Cidade e UF."
    },
    // id-84: Portais Corporativos - Personalização (Bacen)
    { 
        id: 84, 
        banca: "CEBRASPE", 
        materia: "Portais Corporativos", 
        tags: ["#portais", "#personalizacao", "#bacen"],
        enunciado: "Julgue os itens a seguir, acerca de portais corporativos: A personalização de um portal corporativo é caracterizada fundamentalmente pela capacidade de alteração do leiaute da página principal conforme o número de acessos por minuto.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },

    // id-85: Portais Corporativos - Integração (Bacen)
    { 
        id: 85, 
        banca: "CEBRASPE", 
        materia: "Portais Corporativos", 
        tags: ["#portais", "#integracao", "#bacen"],
        enunciado: "Julgue os itens a seguir, acerca de portais corporativos: Por meio de um portal corporativo, não é possível o acesso a informações de diversas fontes, como, por exemplo, vários bancos de dados.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },

    // id-86: Gestão de Conteúdo - CMS (Bacen)
    { 
        id: 86, 
        banca: "CEBRASPE", 
        materia: "Gestão de Conteúdo", 
        tags: ["#cms", "#web-2.0", "#bacen"],
        enunciado: "Julgue os itens seguintes, a respeito de Web 2.0 e de gestão de conteúdo: Os sistemas de gerenciamento de conteúdo possibilitam a separação entre conteúdo (informação) e formato de exibição.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-87: Gestão de Conteúdo - Web 2.0 (Bacen)
    { 
        id: 87, 
        banca: "CEBRASPE", 
        materia: "Gestão de Conteúdo", 
        tags: ["#web-2.0", "#conceitos", "#bacen"],
        enunciado: "Julgue os itens seguintes, a respeito de Web 2.0 e de gestão de conteúdo: A Web 2.0, resultado da introdução da tecnologia 3G nos celulares, constituiu uma mudança de conceito na velocidade de acesso aos portais.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "💡 DICA: A Web 2.0 não tem nenhuma relação com a tecnologia 3G de celulares. O termo refere-se à mudança de paradigma na internet: de páginas estáticas para uma rede colaborativa, focada na interação e conteúdo gerado pelo próprio usuário (ex: redes sociais, wikis, blogs)."
    },

    // id-88: Sistemas de Busca - Indexação (Bacen)
    { 
        id: 88, 
        banca: "CEBRASPE", 
        materia: "Sistemas de Busca", 
        tags: ["#indexacao", "#crawlers", "#bacen"],
        enunciado: "Com relação aos sistemas de busca e indexação de conteúdo, julgue os próximos itens: A indexação do conteúdo de uma página recém-publicada na Internet ocorre de modo imediato nos sistemas de busca, como Google, Bing e semelhantes.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },

    // id-89: Sistemas de Busca - Google (Bacen)
    { 
        id: 89, 
        banca: "CEBRASPE", 
        materia: "Sistemas de Busca", 
        tags: ["#google", "#operadores-de-busca", "#pegadinha", "#bacen"],
        enunciado: "Com relação aos sistemas de busca e indexação de conteúdo, julgue os próximos itens: No sistema de buscas do Google, pode-se restringir a busca de documentos pertinentes a um domínio DNS específico, como, por exemplo, a busca do sítio: www.brasil.gov.br presidente.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "⚠️ PEGADINHA: O comando do Google deve ser em inglês. O operador correto para restringir a um domínio é 'site:', e não 'sítio:' como traduzido no enunciado da questão."
    },

    // id-90: Portais Corporativos - SharePoint (Bacen)
    { 
        id: 90, 
        banca: "CEBRASPE", 
        materia: "Portais Corporativos", 
        tags: ["#sharepoint", "#mobile", "#bacen"],
        enunciado: "Julgue os seguintes itens, relativos a SharePoint 2010: Não é possível a visualização do SharePoint 2010 em um aparelho celular.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },

    // id-91: Portais Corporativos - SharePoint (Bacen)
    { 
        id: 91, 
        banca: "CEBRASPE", 
        materia: "Portais Corporativos", 
        tags: ["#sharepoint", "#acesso", "#bacen"],
        enunciado: "Julgue os seguintes itens, relativos a SharePoint 2010: O SharePoint 2010 permite que o usuário crie páginas personalizadas com níveis de restrição de acesso manipuláveis.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-92: Business Intelligence - DW e DM (Bacen)
    { 
        id: 92, 
        banca: "CEBRASPE", 
        materia: "Business Intelligence", 
        tags: ["#bi", "#data-warehouse", "#data-mart", "#bacen"],
        enunciado: "Com relação à inteligência de negócios, julgue os itens subsecutivos: Data warehouse (DW) e data mart (DM) são componentes importantes em um ambiente de business intelligence, visto que eles representam repositórios de múltiplos bancos de dados operacionais da empresa. Um DM agrega informações de diversos DWs distribuídos pelos departamentos da empresa.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "⚠️ PEGADINHA: A banca inverteu totalmente os conceitos! O Data Warehouse (DW) é o grande repositório central que unifica os dados corporativos. O Data Mart (DM) é um subconjunto menor desse repositório, focado em apenas um departamento específico (ex: um DM só para o setor de RH)."
    },

    // id-93: Business Intelligence - Data Mining (Bacen)
    { 
        id: 93, 
        banca: "CEBRASPE", 
        materia: "Business Intelligence", 
        tags: ["#bi", "#data-mining", "#bacen"],
        enunciado: "Com relação à inteligência de negócios, julgue os itens subsecutivos: Árvores de decisão e regras de associação são exemplos de algoritmos de data mining.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-94: Gestão de Conteúdo - ECM e GED (Bacen)
    { 
        id: 94, 
        banca: "CEBRASPE", 
        materia: "Gestão de Conteúdo", 
        tags: ["#ecm", "#ged", "#bacen"],
        enunciado: "Com relação à gestão de conteúdo, julgue os itens subsecutivos: Devido às dificuldades de processamento e armazenamento, nas empresas, de um número cada vez maior de documentos, a gestão de conteúdo (enterprise content management ― ECM), que surgiu na década de 90 do século XX como resultado das preocupações ambientais, atualmente limita-se à gestão eletrônica de documento (GED).", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "💡 DICA: O conceito de ECM (Enterprise Content Management) é muito mais amplo que o GED (Gestão Eletrônica de Documentos). O ECM gerencia todo o ciclo de vida do conteúdo corporativo, não se limitando apenas a documentos tradicionais. Além disso, a sua origem principal está ligada à eficiência e inteligência de negócios, não a 'preocupações ambientais'."
    },
    // id-95: Gerenciamento de Processos - Workflow (Bacen)
    { 
        id: 95, 
        banca: "CEBRASPE", 
        materia: "Gerenciamento de Processos", 
        tags: ["#workflow", "#automacao", "#bacen"],
        enunciado: "No que se refere ao gerenciamento e à automação de processos, julgue os itens subsecutivos: As atividades de um workflow devem incluir, minimamente, atores que as executem, rotas que explicitam o encadeamento e o destino das atividades, documentos produzidos e consumidos durante a execução das atividades e regras que devem ser respeitadas durante a execução das atividades.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-96: Gerenciamento de Processos - Níveis de Modelagem (Bacen)
    { 
        id: 96, 
        banca: "CEBRASPE", 
        materia: "Gerenciamento de Processos", 
        tags: ["#modelagem", "#hierarquia", "#bacen"],
        enunciado: "No que se refere ao gerenciamento e à automação de processos, julgue os itens subsecutivos: Com relação à hierarquia de processos, é correto afirmar que o detalhamento no nível de tarefa é obrigatório durante a modelagem de processos de negócio.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },

    // id-97: BPMN - Fluxos de Sequência (Bacen)
    { 
        id: 97, 
        banca: "CEBRASPE", 
        materia: "Gerenciamento de Processos", 
        tags: ["#bpmn", "#fluxo", "#bacen"],
        enunciado: "No que diz respeito à modelagem de processos de negócio, julgue os próximos itens: Um fluxo de sequência que possua uma condição a ele associada poderá seguir adiante ainda que essa condição seja avaliada como falsa.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },

    // id-98: Gerenciamento de Processos - Redes de Petri (Bacen)
    { 
        id: 98, 
        banca: "CEBRASPE", 
        materia: "Gerenciamento de Processos", 
        tags: ["#redes-de-petri", "#modelagem", "#bacen"],
        enunciado: "No que diz respeito à modelagem de processos de negócio, julgue os próximos itens: Uma das técnicas de análise de processo é a teoria das Redes Petri (RdPs), formada por dois tipos de componentes: as transições que representam ações do sistema e os lugares que representam variáveis de estado do sistema.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "A" 
    },

    // id-99: Gerenciamento de Processos - Métricas (Bacen)
    { 
        id: 99, 
        banca: "CEBRASPE", 
        materia: "Gerenciamento de Processos", 
        tags: ["#metricas", "#tempo-de-execucao", "#bacen"],
        enunciado: "No que diz respeito à modelagem de processos de negócio, julgue os próximos itens: Um processo tem suas métricas de tempo de execução medidas por meio do tempo necessário para a execução de uma tarefa.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },

    // id-100: BPMN - Eventos (Bacen)
    { 
        id: 100, 
        banca: "CEBRASPE", 
        materia: "Gerenciamento de Processos", 
        tags: ["#bpmn", "#eventos", "#bacen"],
        enunciado: "No que diz respeito à modelagem de processos de negócio, julgue os próximos itens: Um evento de início indica onde o processo começa e o que acontece ao longo de sua execução.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B" 
    },

    // id-101: Gerenciamento de Processos - Mapeamento AS-IS (Bacen)
    { 
        id: 101, 
        banca: "CEBRASPE", 
        materia: "Gerenciamento de Processos", 
        tags: ["#as-is", "#mapeamento", "#bacen"],
        enunciado: "Julgue os itens a seguir, referentes a técnicas de modelagem e desenho de processos: Em um processo no setor de RH, a utilização da técnica de mapeamento AS-IS fornecerá o desenho de como o processo é executado, com inclusão apenas de seus acertos.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "⚠️ PEGADINHA: O mapeamento AS-IS retrata a situação atual do processo exatamente como ele é executado no momento, incluindo todas as suas falhas, gargalos, redundâncias e erros. O objetivo é justamente diagnosticar o cenário real para, depois, propor melhorias no modelo TO-BE."
    },

    // id-102: UML - Diagrama de Comunicação (Bacen)
    { 
        id: 102, 
        banca: "CEBRASPE", 
        materia: "Engenharia de Software", 
        tags: ["#uml", "#diagramas", "#bacen"],
        enunciado: "Julgue os itens a seguir, referentes a técnicas de modelagem e desenho de processos: O diagrama de comunicação mostra a sequência de interações entre os elementos, de acordo com a temporalidade com que os processos acontecem.", 
        alternativas: [
            "A) Certo", 
            "B) Errado"
        ], 
        gabarito: "B",
        explicacao: "💡 DICA: A banca trocou os conceitos dos diagramas UML! Quem mostra as interações enfatizando a 'temporalidade' (linha do tempo) é o Diagrama de Sequência. O Diagrama de Comunicação (antigo diagrama de colaboração) foca na organização estrutural e nos vínculos entre os objetos, não na linha do tempo."
    }

    


];