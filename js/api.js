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

function normalizarMateriaEAgruparTags(questao) {
    if (!questao || !questao.materia) return questao;

    const materiaOriginal = String(questao.materia).trim();
    const materiaLower = materiaOriginal.toLowerCase();

    let materiaMacro = MAPA_MATERIAS_MACRO[materiaLower];

    if (!materiaMacro) {
        if (materiaLower.includes("portugu")) {
            materiaMacro = "Português";
        } else if (materiaLower.includes("lógic") || materiaLower.includes("matemát") || materiaLower.includes("rlm")) {
            materiaMacro = "Raciocínio Lógico & Matemática";
        } else if (materiaLower.includes("scrum") || materiaLower.includes("agil") || materiaLower.includes("requisito") || materiaLower.includes("uml") || materiaLower.includes("software")) {
            materiaMacro = "Engenharia de Software & Agilidade";
        } else if (materiaLower.includes("prog") || materiaLower.includes("desenv") || materiaLower.includes("orienta") || materiaLower.includes("objetos") || materiaLower.includes("poo") || materiaLower.includes("portal") || materiaLower.includes("acessibil") || materiaLower.includes("java") || materiaLower.includes("python") || materiaLower.includes("web")) {
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

    questao.materia = materiaMacro;
    return questao;
}

export async function carregarQuestoes() {
    try {
        const resposta = await fetch('./data/questoes.json');
        if (!resposta.ok) {
            throw new Error(`Erro de HTTP ao carregar questões: ${resposta.status}`);
        }

        const questoes = await resposta.json();
        return questoes.map(q => normalizarMateriaEAgruparTags(q));
    } catch (erro) {
        console.error('Falha ao carregar banco de questões em js/api.js:', erro);
        return [];
    }
}