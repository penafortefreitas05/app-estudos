
    
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
    }

];