// ============================================================
// js/modelo-prova.js - Simulado no padrão da prova (FocoPro)
// ============================================================
// Decidido com o Nathan em 05/11/2026: o simulado "equilibrar" sorteava um pouco de cada matéria,
// o que não se parece com prova. Aqui a proporção de cada matéria segue o edital do concurso.
// Bacen: Edital nº 1/2024 (referência até sair o novo), 120 questões:
//   Básicos 50 = Português 25 · Lógica e Estatística 10 · Direito Administrativo 5 · Micro e Macro 10
//   TI 70 = Engenharia de Software 24 · Infraestrutura 17 · Ciência de Dados 14 · Segurança 7 · Bancos de Dados 4 · Gestão 4
// As matérias do app não são iguais às do edital; a divisão abaixo é a adotada pelo FocoPro:
//   Engenharia de Software 24 → ES & Agilidade 16 + Desenvolvimento/POO 8
//   Infraestrutura 17 → Arquitetura & Nuvem 8 + Sistemas Operacionais 4 + Redes 5
//   Segurança 7 + Redes 5 → Redes & Segurança 12;  Ciência de Dados 14 + BD 4 → Banco de Dados & Dados 18

// Na ordem em que aparecem na prova (básicos primeiro, depois TI)
export const MODELOS = {
    bacen: {
        nome: 'Padrão Bacen (edital 2024)',
        pesos: [
            ['Português', 25],
            ['Raciocínio Lógico & Matemática', 10],
            ['Direito Administrativo', 5],
            ['Micro e Macroeconomia', 10],
            ['Engenharia de Software & Agilidade', 16],
            ['Desenvolvimento, POO & Linguagens', 8],
            ['Arquitetura de TI & Nuvem', 8],
            ['Sistemas Operacionais & Hardware', 4],
            ['Redes & Segurança da Informação', 12],
            ['Banco de Dados & Dados', 18],
            ['Governança, Gestão & Projetos de TI', 4]
        ]
    }
};

export const modeloDoConcurso = (trilha) => MODELOS[trilha] || null;

// Quantas questões de cada matéria para um simulado de `qtd` (maior resto). [[materia, n]] na ordem da prova.
// disponiveis (opcional): { materia: quantas existem }; o que faltar numa matéria vai para as outras, pelo peso.
export function quotasDoModelo(modelo, qtd, disponiveis = null) {
    const pesos = modelo.pesos;
    const soma = pesos.reduce((s, [, p]) => s + p, 0);
    const teto = (m) => (disponiveis ? (disponiveis[m] || 0) : Infinity);
    const exato = pesos.map(([m, p]) => ({ m, p, x: (qtd * p) / soma }));
    const quota = new Map(exato.map(e => [e.m, Math.min(Math.floor(e.x), teto(e.m))]));
    let faltam = qtd - [...quota.values()].reduce((s, n) => s + n, 0);
    // Distribui o resto (arredondamento e falta de questões) pelas matérias com maior parte fracionária / peso
    const ordem = [...exato].sort((a, b) => (b.x - Math.floor(b.x)) - (a.x - Math.floor(a.x)) || b.p - a.p);
    let progresso = true;
    while (faltam > 0 && progresso) {
        progresso = false;
        for (const e of ordem) {
            if (faltam <= 0) break;
            if (quota.get(e.m) < teto(e.m)) { quota.set(e.m, quota.get(e.m) + 1); faltam--; progresso = true; }
        }
    }
    return pesos.map(([m]) => [m, quota.get(m)]).filter(([, n]) => n > 0);
}

// Escolhe as questões do pool (já embaralhado/priorizado) seguindo as quotas; mantém a ordem da prova.
// Matérias fora do modelo só entram se o modelo não preencher a quantidade pedida.
export function sortearPeloModelo(pool, qtd, modelo) {
    const porMateria = new Map();
    pool.forEach(q => {
        const m = q.materia || 'Geral';
        if (!porMateria.has(m)) porMateria.set(m, []);
        porMateria.get(m).push(q);
    });
    const disponiveis = {};
    porMateria.forEach((l, m) => { disponiveis[m] = l.length; });
    const escolhidas = [];
    quotasDoModelo(modelo, qtd, disponiveis).forEach(([m, n]) => { escolhidas.push(...porMateria.get(m).slice(0, n)); });
    if (escolhidas.length < qtd) {
        const usadas = new Set(escolhidas.map(q => String(q.id)));
        escolhidas.push(...pool.filter(q => !usadas.has(String(q.id))).slice(0, qtd - escolhidas.length));
    }
    return escolhidas;
}
