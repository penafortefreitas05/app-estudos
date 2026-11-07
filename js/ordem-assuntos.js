// ============================================================
// js/ordem-assuntos.js - Ordem didática dos assuntos (FocoPro)
// ============================================================
// Sequência de pré-requisitos por matéria, definida pela sala de aula em 06/11/2026 (v1):
// cada assunto só aparece depois do que precisa ser entendido antes. Vale para a lista do Aprender,
// para o botão "Continuar" e para o "Meu plano" (que anda pela mesma lista).
// Os nomes são os do app (data/aprender-cartoes.json). Assunto que não estiver aqui fica depois dos listados,
// na ordem em que já estava; matéria que não estiver aqui não muda.
// A ordem das MATÉRIAS não muda: ela segue a prioridade do app.

export const ORDEM_ASSUNTOS = {
    'Redes & Segurança da Informação': [
        'Fundamentos de redes (OSI, TCP/IP, equipamentos, tipos de rede)',
        'Roteamento, switching e SDN',
        'Protocolos de aplicação (DNS, HTTP, SMTP, LDAP)',
        'Criptografia, certificação digital e PKI',
        'Autenticação e identidade (MFA, SSO, SAML, OAuth)',
        'Segurança de redes (firewall, VPN, IPSec, IDS/IPS)',
        'Ataques e desenvolvimento seguro (OWASP)',
        'Segurança de endpoint e malware',
        'Gestão de SI e riscos (ISO 27001, 27002, 27005)',
        'Frameworks de segurança (NIST CSF, CIS Controls)',
        'Normas de SI na APF (GSI)',
        'Continuidade de negócios'
    ],
    'Engenharia de Software & Agilidade': [
        'Processos, ciclos de vida e manutenção de software',
        'Engenharia de requisitos',
        'Métodos ágeis (manifesto, XP, Kanban, Lean)',
        'Scrum',
        'Análise e projeto OO (UML, DDD)',
        'Padrões de projeto (GoF)',
        'Testes de software (TDD, BDD, tipos de teste)',
        'Métricas e estimativas (APF, pontos de história)',
        'Qualidade e maturidade (CMMI, MPS.BR, ISO 12207)',
        'DevOps, DevSecOps e CI/CD'
    ],
    'Sistemas Operacionais & Hardware': [
        'Arquitetura de computadores',
        'Sistemas operacionais — processos e memória',
        'Linux',
        'Windows Server',
        'Sistemas distribuídos e paralelismo'
    ],
    'Banco de Dados & Dados': [
        'Conceitos de SGBD',
        'Modelagem de dados (MER e relacional)',
        'Normalização',
        'SQL — DDL e restrições',
        'SQL — DML (INSERT, UPDATE, DELETE, TRUNCATE)',
        'SQL — Consultas, JOIN e subconsultas',
        'SQL — Agrupamento e agregação',
        'SQL — Funções',
        'Objetos de banco (views, triggers, procedures, sequences)',
        'Transações, concorrência e otimização',
        'SQL — DCL e controle de acesso',
        'NoSQL',
        'Data warehouse, OLAP e BI',
        'Engenharia de dados (ETL, ELT, data lake)',
        'Machine learning — conceitos e tipos de aprendizado',
        'Machine learning — avaliação de modelos',
        'Machine learning — algoritmos',
        'Deep learning e PLN',
        'IA generativa e LLMs',
        'MLOps',
        'Ética e governança de IA'
    ]
};

// Põe os assuntos de uma matéria na ordem didática (estável: o que não está na lista vai para o fim, como estava)
export function ordenarAssuntos(materia, assuntos, ordem = ORDEM_ASSUNTOS) {
    const lista = ordem[materia];
    if (!lista) return assuntos;
    const pos = (a) => { const i = lista.indexOf(a.assunto); return i < 0 ? lista.length : i; };
    return assuntos.map((a, n) => ({ a, n })).sort((x, y) => (pos(x.a) - pos(y.a)) || (x.n - y.n)).map(x => x.a);
}
