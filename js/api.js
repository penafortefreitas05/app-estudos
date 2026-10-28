// ============================================================
// js/api.js - Carregamento Assíncrono e Normalização (FocoPro)
// ============================================================

const MAPA_MATERIAS_MACRO = {
    // 1. Português
    "português": "Português",
    "lingua portuguesa": "Português",
    "gramática": "Português",
    "interpretação de texto": "Português",

    // 2. Raciocínio Lógico & Matemática
    "raciocínio lógico": "Raciocínio Lógico & Matemática",
    "raciocinio logico": "Raciocínio Lógico & Matemática",
    "rlm": "Raciocínio Lógico & Matemática",
    "matemática": "Raciocínio Lógico & Matemática",
    "estatística": "Raciocínio Lógico & Matemática",

    // 3. Engenharia de Software & Agilidade
    "scrum": "Engenharia de Software & Agilidade",
    "kanban": "Engenharia de Software & Agilidade",
    "agilidade": "Engenharia de Software & Agilidade",
    "metodologias ágeis": "Engenharia de Software & Agilidade",
    "engenharia de software": "Engenharia de Software & Agilidade",
    "engenharia de software & agilidade": "Engenharia de Software & Agilidade",
    "requisitos": "Engenharia de Software & Agilidade",
    "análise de requisitos": "Engenharia de Software & Agilidade",
    "uml": "Engenharia de Software & Agilidade",
    "diagrama de classe": "Engenharia de Software & Agilidade",
    "testes de software": "Engenharia de Software & Agilidade",
    "design patterns": "Engenharia de Software & Agilidade",
    "padrões de projeto": "Engenharia de Software & Agilidade",
    "cmmi": "Engenharia de Software & Agilidade",
    "mps.br": "Engenharia de Software & Agilidade",

    // 4. Desenvolvimento, POO & Linguagens
    "desenvolvimento": "Desenvolvimento, POO & Linguagens",
    "desenvolvimento, poo & linguagens": "Desenvolvimento, POO & Linguagens",
    "desenvolvimento de sistemas": "Desenvolvimento, POO & Linguagens",
    "desenvolvimento web": "Desenvolvimento, POO & Linguagens",
    "desenvolvimento mobile": "Desenvolvimento, POO & Linguagens",
    "desenvolvimento em linguagem": "Desenvolvimento, POO & Linguagens",
    "linguagens de programação": "Desenvolvimento, POO & Linguagens",
    "orientação a objetos": "Desenvolvimento, POO & Linguagens",
    "poo": "Desenvolvimento, POO & Linguagens",
    "portais corporativos": "Desenvolvimento, POO & Linguagens",
    "gestão de conteúdo": "Desenvolvimento, POO & Linguagens",
    "acessibilidade": "Desenvolvimento, POO & Linguagens",
    "programação": "Desenvolvimento, POO & Linguagens",
    "lógica de programação": "Desenvolvimento, POO & Linguagens",
    "javascript": "Desenvolvimento, POO & Linguagens",
    "python": "Desenvolvimento, POO & Linguagens",
    "java": "Desenvolvimento, POO & Linguagens",
    "html": "Desenvolvimento, POO & Linguagens",
    "css": "Desenvolvimento, POO & Linguagens",
    "web": "Desenvolvimento, POO & Linguagens",
    "api rest": "Desenvolvimento, POO & Linguagens",
    "algoritmos": "Desenvolvimento, POO & Linguagens",
    "estruturas de dados": "Desenvolvimento, POO & Linguagens",
    "controle de versão": "Desenvolvimento, POO & Linguagens",
    "git": "Desenvolvimento, POO & Linguagens",

    // 5. Banco de Dados & Dados
    "banco de dados": "Banco de Dados & Dados",
    "bancos de dados": "Banco de Dados & Dados",
    "banco de dados & dados": "Banco de Dados & Dados",
    "banco de dados e dados": "Banco de Dados & Dados",
    "ciência de dados": "Banco de Dados & Dados",
    "sql": "Banco de Dados & Dados",
    "normalização": "Banco de Dados & Dados",
    "modelagem er": "Banco de Dados & Dados",
    "modelo relacional": "Banco de Dados & Dados",
    "postgresql": "Banco de Dados & Dados",
    "mysql": "Banco de Dados & Dados",
    "nosql": "Banco de Dados & Dados",
    "mongodb": "Banco de Dados & Dados",
    "data warehouse": "Banco de Dados & Dados",
    "business intelligence": "Banco de Dados & Dados",
    "bi": "Banco de Dados & Dados",
    "sistemas de busca": "Banco de Dados & Dados",
    "sistemas de buscas": "Banco de Dados & Dados",
    "recuperação de informação": "Banco de Dados & Dados",

    // 6. Arquitetura de TI & Nuvem
    "arquitetura": "Arquitetura de TI & Nuvem",
    "arquitetura de ti & nuvem": "Arquitetura de TI & Nuvem",
    "arquitetura de ti e nuvem": "Arquitetura de TI & Nuvem",
    "arquitetura de software": "Arquitetura de TI & Nuvem",
    "microsserviços": "Arquitetura de TI & Nuvem",
    "containers": "Arquitetura de TI & Nuvem",
    "docker": "Arquitetura de TI & Nuvem",
    "kubernetes": "Arquitetura de TI & Nuvem",
    "cloud computing": "Arquitetura de TI & Nuvem",
    "computação em nuvem": "Arquitetura de TI & Nuvem",
    "aws": "Arquitetura de TI & Nuvem",
    "devops": "Arquitetura de TI & Nuvem",

    // 7. Redes & Segurança da Informação
    "redes": "Redes & Segurança da Informação",
    "redes & segurança da informação": "Redes & Segurança da Informação",
    "rede e segurança da informação": "Redes & Segurança da Informação",
    "redes de computadores": "Redes & Segurança da Informação",
    "segurança": "Redes & Segurança da Informação",
    "segurança da informação": "Redes & Segurança da Informação",
    "criptografia": "Redes & Segurança da Informação",
    "firewall": "Redes & Segurança da Informação",
    "iso 27001": "Redes & Segurança da Informação",
    "lgpd": "Redes & Segurança da Informação",
    "tcp/ip": "Redes & Segurança da Informação",

    // 8. Governança, Gestão & Projetos de TI
    "governança": "Governança, Gestão & Projetos de TI",
    "governança de ti": "Governança, Gestão & Projetos de TI",
    "governança, gestão & projetos de ti": "Governança, Gestão & Projetos de TI",
    "governança e gestão de ti": "Governança, Gestão & Projetos de TI",
    "gerenciamento de projetos": "Governança, Gestão & Projetos de TI",
    "gerenciamento de processos": "Governança, Gestão & Projetos de TI",
    "itil": "Governança, Gestão & Projetos de TI",
    "cobit": "Governança, Gestão & Projetos de TI",
    "pmbok": "Governança, Gestão & Projetos de TI",
    "gestão de ti": "Governança, Gestão & Projetos de TI",
    "gestão de projetos": "Governança, Gestão & Projetos de TI",
    "contratações de ti": "Governança, Gestão & Projetos de TI",

    // 9. Sistemas Operacionais & Hardware
    "sistemas operacionais": "Sistemas Operacionais & Hardware",
    "sistemas operacionais & hardware": "Sistemas Operacionais & Hardware",
    "sistemas operacionais e hardware": "Sistemas Operacionais & Hardware",
    "arquitetura de computadores": "Sistemas Operacionais & Hardware",
    "linux": "Sistemas Operacionais & Hardware",
    "shell script": "Sistemas Operacionais & Hardware",
    "windows": "Sistemas Operacionais & Hardware",
    "windows server": "Sistemas Operacionais & Hardware",
    "virtualização": "Sistemas Operacionais & Hardware",
    "hardware": "Sistemas Operacionais & Hardware"
};

// ============================================================
// U11 — Campo "assunto" padronizado, ligado aos tópicos do edital
// ============================================================
// As chaves de MAPA_MATERIAS_MACRO acima JÁ SÃO os tópicos reais do edital (scrum, uml,
// normalização, docker, lgpd, itil...). Em vez de criar um segundo dicionário (e correr o
// risco de os dois desalinharem), o "assunto" de cada questão é a própria chave que bateu,
// só formatada para leitura. Isso resolve o problema das tags livres (376 valores soltos para
// 194 questões, na auditoria de 26/10): toda questão passa a cair num vocabulário fecho e
// fixo, sem precisar reescrever nada no banco — a padronização acontece ao carregar, a partir
// da matéria/tags que a questão já tem.

// Formatação especial para siglas e nomes próprios que o Title Case simples erraria.
const ASSUNTO_FORMATADO_ESPECIAL = {
    "rlm": "RLM", "uml": "UML", "poo": "POO", "sql": "SQL", "css": "CSS", "html": "HTML",
    "bi": "BI", "cmmi": "CMMI", "mps.br": "MPS.BR", "aws": "AWS", "devops": "DevOps",
    "tcp/ip": "TCP/IP", "lgpd": "LGPD", "iso 27001": "ISO 27001", "itil": "ITIL",
    "cobit": "COBIT", "pmbok": "PMBOK", "nosql": "NoSQL", "mongodb": "MongoDB",
    "postgresql": "PostgreSQL", "mysql": "MySQL", "api rest": "API REST",
    "modelagem er": "Modelagem ER", "modelo relacional": "Modelo Relacional",
    "data warehouse": "Data Warehouse", "business intelligence": "Business Intelligence"
};

// Title Case simples em português (maiúscula só na 1ª letra de cada palavra), preservando
// acentos. Usado como regra padrão para quem não está em ASSUNTO_FORMATADO_ESPECIAL.
function formatarAssunto(chave) {
    if (ASSUNTO_FORMATADO_ESPECIAL[chave]) return ASSUNTO_FORMATADO_ESPECIAL[chave];
    return chave
        .split(/\s+/)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(' ');
}

// Ordem canônica dos "9 Pilares" (as matérias-macro), na ordem em que aparecem acima.
// Usado pelo painel "Cobertura do Edital" (ui.js) só pra decidir em que ordem mostrar
// as matérias que o banco já tem — a contagem de assuntos dentro de cada uma vem direto
// das questões carregadas, não de uma lista fixa (um dicionário fixo de ~80 palavras não
// tem como acompanhar assuntos já ricos e específicos que vêm prontos na importação, tipo
// "Autenticação e identidade (MFA, SSO, SAML, OAuth)").
export const ORDEM_MACROS = [...new Set(Object.values(MAPA_MATERIAS_MACRO))];

// Escolhe o assunto padronizado da questão: a primeira entre [matéria original, suas tags]
// que bater, por igualdade exata, com um tópico conhecido do edital. Sem bater com nada, cai
// no nome da matéria macro — fica visível no painel de cobertura como "ainda sem tópico fino".
function derivarAssunto(questao, materiaOriginal, materiaMacro) {
    const assuntoJaPadronizado = String(questao.assunto || '').trim();
    if (assuntoJaPadronizado) return assuntoJaPadronizado; // import manual já veio com assunto

    // As tags vêm primeiro: normalmente são mais específicas que a matéria (ex.: matéria
    // "Engenharia de Software" + tag "Scrum" — "Scrum" é o assunto mais útil dos dois).
    const candidatos = [...(Array.isArray(questao.tags) ? questao.tags : []), materiaOriginal];
    for (const candidato of candidatos) {
        const chave = String(candidato || '').trim().toLowerCase();
        if (chave && MAPA_MATERIAS_MACRO[chave]) {
            return formatarAssunto(chave);
        }
    }
    return materiaMacro;
}

function gerarIdEstavel(texto, indexFallback = 0) {
    const str = String(texto || "").trim();
    if (!str) return `q_${indexFallback}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return `q_${Math.abs(hash)}`;
}

export function normalizarMateriaEAgruparTags(questao, index = 0) {
    if (!questao || typeof questao !== "object") return questao;

    // 1. Garante que enunciado e pergunta sempre existam
    const textoEnunciado = String(questao.enunciado || questao.pergunta || questao.texto || "").trim();
    questao.enunciado = textoEnunciado;
    questao.pergunta = textoEnunciado;

    // 2. Garante ID estável (não muda a cada F5)
    if (questao.id === undefined || questao.id === null || String(questao.id).trim() === "") {
        questao.id = gerarIdEstavel(textoEnunciado, index);
    } else {
        questao.id = String(questao.id).trim();
    }

    // 3. Garante alternativas padronizadas
    if (!questao.alternativas && questao.opcoes) {
        questao.alternativas = questao.opcoes;
    }

    // 4. Garante gabarito e resposta_correta sincronizados
    // Sem padrão "A": desde o U9 o gabarito não vem mais junto com a questão. Inventar um "A"
    // aqui fazia o app corrigir contra uma resposta falsa se o servidor falhasse.
    const gabaritoBruto = String(questao.resposta_correta || questao.gabarito || "").trim();
    questao.gabarito = gabaritoBruto || null;
    questao.resposta_correta = gabaritoBruto || null;

    // 5. Preserva explicação / comentário se existir
    questao.explicacao = String(questao.explicacao || questao.comentario || questao.justificativa || "").trim();

    // 6. Normalização de Matéria e Tags
    const materiaOriginal = String(questao.materia || questao.disciplina || "Geral").trim();
    const materiaLower = materiaOriginal.toLowerCase();

    let materiaMacro = MAPA_MATERIAS_MACRO[materiaLower];

    if (!materiaMacro) {
        if (materiaLower.includes("portugu")) {
            materiaMacro = "Português";
        } else if (materiaLower.includes("lógic") || materiaLower.includes("matemát") || materiaLower.includes("rlm")) {
            materiaMacro = "Raciocínio Lógico & Matemática";
        } else if (materiaLower.includes("scrum") || materiaLower.includes("agil") || materiaLower.includes("requisito") || materiaLower.includes("uml") || materiaLower.includes("software")) {
            materiaMacro = "Engenharia de Software & Agilidade";
        } else if (materiaLower.includes("prog") || materiaLower.includes("desenv") || materiaLower.includes("orienta") || materiaLower.includes("objetos") || materiaLower.includes("poo") || materiaLower.includes("portal") || materiaLower.includes("acessibil") || materiaLower.includes("java") || materiaLower.includes("python") || materiaLower.includes("web") || materiaLower.includes("git")) {
            materiaMacro = "Desenvolvimento, POO & Linguagens";
        } else if (materiaLower.includes("banco") || materiaLower.includes("sql") || materiaLower.includes("dado") || materiaLower.includes("bi") || materiaLower.includes("busca")) {
            materiaMacro = "Banco de Dados & Dados";
        } else if (materiaLower.includes("cloud") || materiaLower.includes("nuvem") || materiaLower.includes("docker") || materiaLower.includes("arquitetura")) {
            materiaMacro = "Arquitetura de TI & Nuvem";
        } else if (materiaLower.includes("rede") || materiaLower.includes("seguran") || materiaLower.includes("lgpd") || materiaLower.includes("cripto")) {
            materiaMacro = "Redes & Segurança da Informação";
        } else if (materiaLower.includes("itil") || materiaLower.includes("cobit") || materiaLower.includes("gov") || materiaLower.includes("gest") || materiaLower.includes("projet") || materiaLower.includes("processo")) {
            materiaMacro = "Governança, Gestão & Projetos de TI";
        } else if (materiaLower.includes("operaciona") || materiaLower.includes("linux") || materiaLower.includes("window") || materiaLower.includes("hard")) {
            materiaMacro = "Sistemas Operacionais & Hardware";
        } else {
            materiaMacro = materiaOriginal;
        }
    }

    if (!Array.isArray(questao.tags)) {
        questao.tags = [];
    }

    const tagExiste = questao.tags.some(t => String(t).toLowerCase() === materiaLower);
    if (!tagExiste && materiaOriginal !== materiaMacro) {
        questao.tags.push(materiaOriginal);
    }

    // 7. Assunto padronizado (U11) — calculado ANTES de materiaOriginal virar materiaMacro
    questao.assunto = derivarAssunto(questao, materiaOriginal, materiaMacro);

    questao.materia = materiaMacro;
    questao.banca = String(questao.banca || "Não informada").trim();

    return questao;
}

export const normalizarQuestao = normalizarMateriaEAgruparTags;