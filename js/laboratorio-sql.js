// ============================================================
// js/laboratorio-sql.js - Laboratório SQL dentro da questão (FocoPro)
// ============================================================
// Roda SQL de verdade (SQLite, via sql.js) aqui no aparelho, sem servidor.
// - Só é carregado quando alguém abre o laboratório (o app continua leve para quem não usa).
// - O motor roda num Worker: uma consulta que trava (ex.: recursão infinita) é cancelada
//   depois de alguns segundos sem congelar a tela.
// - Cada execução começa do banco original: dá para errar à vontade.
// Motor: sql.js 1.14.2 (MIT), em js/vendor/sqljs-1.14.2/.

import { esc } from './ui.js';

const PASTA_MOTOR = new URL('./vendor/sqljs-1.14.2/', import.meta.url);
const LIMITE_LINHAS = 100;
const TEMPO_PRIMEIRA_CARGA_MS = 30_000; // baixa ~650 KB na primeira vez
const TEMPO_EXECUCAO_MS = 4_000;

// ---------- Bancos de partida ----------
// "Empresa": o esquema clássico das provas (empregado, departamento, projeto), com as
// armadilhas que as bancas exploram: NULL em salário e em departamento, departamento sem
// ninguém (OUTER JOIN), nomes e cidades repetidos (DISTINCT), gerente na mesma tabela (auto-JOIN).
const BANCOS = {
    empresa: {
        rotulo: 'Banco de exemplo: Empresa',
        sql: `
CREATE TABLE departamento (
    id      INTEGER PRIMARY KEY,
    nome    TEXT NOT NULL,
    cidade  TEXT
);
CREATE TABLE empregado (
    id              INTEGER PRIMARY KEY,
    nome            TEXT NOT NULL,
    salario         NUMERIC,
    departamento_id INTEGER REFERENCES departamento(id),
    gerente_id      INTEGER REFERENCES empregado(id),
    admissao        TEXT
);
CREATE TABLE projeto (
    id              INTEGER PRIMARY KEY,
    nome            TEXT NOT NULL,
    departamento_id INTEGER REFERENCES departamento(id)
);
CREATE TABLE alocacao (
    empregado_id INTEGER REFERENCES empregado(id),
    projeto_id   INTEGER REFERENCES projeto(id),
    horas        NUMERIC,
    PRIMARY KEY (empregado_id, projeto_id)
);
INSERT INTO departamento VALUES
    (1, 'Tecnologia', 'Brasília'),
    (2, 'Financeiro', 'Rio de Janeiro'),
    (3, 'Jurídico', 'Brasília'),
    (4, 'Auditoria', 'São Paulo');
INSERT INTO empregado VALUES
    (1, 'Ana',      15000, 1, NULL, '2015-03-01'),
    (2, 'Bruno',     9000, 1, 1,    '2019-07-15'),
    (3, 'Carla',     9000, 1, 1,    '2021-01-10'),
    (4, 'Diego',    12000, 2, NULL, '2017-11-20'),
    (5, 'Eduarda',   NULL, 2, 4,    '2024-02-05'),
    (6, 'Fábio',     7000, 3, NULL, '2020-09-30'),
    (7, 'Gabriela',  8500, NULL, 1, '2023-05-18'),
    (8, 'Bruno',     6000, 3, 6,    '2022-08-01');
INSERT INTO projeto VALUES
    (1, 'Portal do Cidadão', 1),
    (2, 'Data Warehouse',    1),
    (3, 'Orçamento 2027',    2),
    (4, 'Compliance',        NULL);
INSERT INTO alocacao VALUES
    (1, 1, 10), (2, 1, 30), (3, 2, 40), (2, 2, 10),
    (4, 3, 20), (5, 3, NULL), (7, 2, 15);
`
    },
    vazio: {
        rotulo: 'Banco vazio (o script cria as tabelas)',
        sql: ''
    }
};

// ---------- Worker do motor ----------
let worker = null;
let motorPronto = false;
let proximoId = 0;
const pendentes = new Map();

function reiniciarMotor(motivo) {
    if (worker) worker.terminate();
    worker = null;
    motorPronto = false;
    pendentes.forEach(p => { clearTimeout(p.timer); p.rejeitar(new Error(motivo)); });
    pendentes.clear();
}

function obterWorker() {
    if (worker) return worker;
    worker = new Worker(new URL('worker.sql-wasm.js', PASTA_MOTOR));
    worker.onmessage = (e) => {
        const { id } = e.data || {};
        const p = pendentes.get(id);
        if (!p) return;
        pendentes.delete(id);
        clearTimeout(p.timer);
        if (e.data.error) p.rejeitar(new Error(e.data.error));
        else p.resolver(e.data);
    };
    worker.onerror = (e) => {
        console.error('[FocoPro] Falha no motor SQL:', e.message);
        reiniciarMotor('MOTOR');
    };
    return worker;
}

function pedir(mensagem, tempoMs) {
    return new Promise((resolver, rejeitar) => {
        const id = ++proximoId;
        const timer = setTimeout(() => {
            if (!pendentes.has(id)) return;
            // Consulta presa: derruba o motor inteiro (a próxima execução cria outro)
            reiniciarMotor('TEMPO');
        }, tempoMs);
        pendentes.set(id, { resolver, rejeitar, timer });
        obterWorker().postMessage({ id, ...mensagem });
    });
}

async function abrirBanco(chaveBase) {
    const tempo = motorPronto ? TEMPO_EXECUCAO_MS : TEMPO_PRIMEIRA_CARGA_MS;
    await pedir({ action: 'open' }, tempo);
    motorPronto = true;
    const base = BANCOS[chaveBase] || BANCOS.empresa;
    if (base.sql.trim()) await pedir({ action: 'exec', sql: base.sql }, TEMPO_EXECUCAO_MS);
}

async function executar(sql) {
    const r = await pedir({ action: 'exec', sql }, TEMPO_EXECUCAO_MS);
    return r.results || [];
}

// ---------- Ajuda de dialeto ----------
// As provas usam SQL Server, Oracle, MySQL e PostgreSQL; o motor aqui é SQLite.
const DIALETOS = [
    [/\btruncate\s+table\b/i, 'TRUNCATE TABLE não existe no SQLite: use DELETE FROM tabela. Na prova, lembre: no SQL Server o TRUNCATE reinicia o IDENTITY; o DELETE não.'],
    [/\bidentity\b/i, 'IDENTITY é do SQL Server. Aqui, para numerar sozinho, use: id INTEGER PRIMARY KEY AUTOINCREMENT.'],
    [/\bauto_increment\b/i, 'AUTO_INCREMENT é do MySQL. Aqui use: id INTEGER PRIMARY KEY AUTOINCREMENT.'],
    [/\bselect\s+top\s*\(?\s*\d+/i, 'TOP n é do SQL Server. Aqui use LIMIT n no fim da consulta.'],
    [/\brownum\b/i, 'ROWNUM é do Oracle. Aqui use LIMIT n no fim da consulta.'],
    [/\b(nvl|isnull)\s*\(/i, 'NVL (Oracle) e ISNULL (SQL Server) aqui são COALESCE(valor, padrao) ou IFNULL(valor, padrao).'],
    [/\b(sysdate|getdate\s*\(|now\s*\()/i, "Data atual aqui: date('now') ou datetime('now')."],
    [/\bminus\b/i, 'MINUS é do Oracle. O equivalente aqui é EXCEPT.'],
    [/\bfrom\s+dual\b/i, "DUAL é do Oracle. Aqui basta SELECT sem FROM (ex.: SELECT 1+1;)."]
];

function dicasDeDialeto(sql) {
    return DIALETOS.filter(([padrao]) => padrao.test(sql)).map(([, dica]) => dica);
}

function traduzirErro(mensagem, sql) {
    const m = String(mensagem || '');
    if (m === 'TEMPO') return 'A consulta passou de 4 segundos e foi interrompida (laço sem fim?).';
    if (m === 'MOTOR') return 'O motor SQL não carregou. Confira a internet e tente de novo.';
    const comandos = (sql.match(/\b(select|insert|update|delete|create|drop|alter|truncate)\b/gi) || []).length;
    const pontoEVirgula = (sql.match(/;/g) || []).length;
    let extra = '';
    if (/syntax error/i.test(m) && comandos > 1 && pontoEVirgula < comandos - 1) {
        extra = " Faltou ';' entre os comandos? No SQL Server ele é opcional; aqui é obrigatório.";
    } else if (/no such table/i.test(m)) {
        extra = ' Use "Ver tabelas" para conferir os nomes, ou troque para o banco vazio se o script cria as próprias tabelas.';
    } else if (/no such column/i.test(m)) {
        extra = ' Confira o nome da coluna em "Ver tabelas".';
    }
    return `Erro do SQLite: ${m}.${extra}`;
}

// ---------- SQL do enunciado ----------
const INICIO_SQL = /\b(create\s+table|insert\s+into|select\b[\s\S]{0,300}?\bfrom|update\s+\w+\s+set|delete\s+from|with\s+\w+\s+as\s*\()/i;
const FIM_SQL = /\.\s+(Após|Apos|Assinale|O resultado|Considerando|Com base|Nesse caso|Julgue|É correto|Qual|Quantas?|Quantos?)\b|\s+(Após a execução|O resultado (exibido|obtido|da consulta))/i;

export function extrairSqlDoEnunciado(texto) {
    const t = String(texto || '');
    const inicio = t.search(INICIO_SQL);
    if (inicio < 0) return '';
    let trecho = t.slice(inicio);
    const fim = trecho.search(FIM_SQL);
    if (fim > 0) trecho = trecho.slice(0, fim);
    // Prova costuma colar o script numa linha só: quebra antes de cada comando
    trecho = trecho
        .replace(/\s+(?=(create|insert|update|delete|drop|alter|truncate|select)\b)/gi, (m, _p, off) => (off === 0 ? m : '\n'))
        .trim();
    return trecho;
}

// ---------- Tela ----------
function tabelaHTML(resultado) {
    const { columns = [], values = [] } = resultado;
    const linhas = values.slice(0, LIMITE_LINHAS);
    const cab = columns.map(c => `<th>${esc(c)}</th>`).join('');
    const corpo = linhas.map(l => `<tr>${l.map(v => v === null
        ? '<td class="lab-nulo">NULL</td>'
        : `<td>${esc(String(v))}</td>`).join('')}</tr>`).join('');
    const resto = values.length > LIMITE_LINHAS ? `<p class="lab-nota">Mostrando ${LIMITE_LINHAS} de ${values.length} linhas.</p>` : '';
    return `<div class="lab-tabela-rolagem"><table class="lab-tabela"><thead><tr>${cab}</tr></thead><tbody>${corpo}</tbody></table></div>
        <p class="lab-nota">${values.length} linha(s).</p>${resto}`;
}

function montarPainel(card, q) {
    const enunciado = q.enunciado || q.pergunta || '';
    const sqlEnunciado = extrairSqlDoEnunciado(enunciado);
    const criaTabelas = /\bcreate\s+table\b/i.test(sqlEnunciado);
    const base = criaTabelas ? 'vazio' : 'empresa';
    const inicial = criaTabelas ? sqlEnunciado : 'SELECT * FROM empregado;';

    const painel = document.createElement('div');
    painel.className = 'lab-sql';
    painel.innerHTML = `
        <div class="lab-topo">
            <strong>🧪 Laboratório SQL</strong>
            <select class="input-dark lab-base" aria-label="Banco de partida">
                ${Object.entries(BANCOS).map(([chave, b]) =>
                    `<option value="${chave}" ${chave === base ? 'selected' : ''}>${esc(b.rotulo)}</option>`).join('')}
            </select>
        </div>
        <p class="lab-nota">SQLite rodando aqui no aparelho. Cada execução começa do banco original. Ctrl+Enter executa.</p>
        <textarea class="lab-editor" rows="6" spellcheck="false" autocapitalize="off" autocomplete="off" autocorrect="off" aria-label="Comandos SQL"></textarea>
        <div class="lab-botoes">
            <button type="button" class="btn-primary lab-executar">▶ Executar</button>
            ${sqlEnunciado ? '<button type="button" class="btn-sidebar lab-trazer">📋 SQL do enunciado</button>' : ''}
            <button type="button" class="btn-sidebar lab-tabelas">🗂️ Ver tabelas</button>
        </div>
        <div class="lab-saida" aria-live="polite"></div>`;

    const editor = painel.querySelector('.lab-editor');
    const saida = painel.querySelector('.lab-saida');
    const seletor = painel.querySelector('.lab-base');
    const botaoExecutar = painel.querySelector('.lab-executar');
    editor.value = inicial;

    let ocupado = false;
    const rodar = async (sqlExtra = null) => {
        if (ocupado) return;
        ocupado = true;
        botaoExecutar.disabled = true;
        const sql = editor.value;
        saida.innerHTML = `<p class="lab-nota">${motorPronto ? 'Executando...' : 'Carregando o motor SQL (só na primeira vez)...'}</p>`;
        const dicas = dicasDeDialeto(sql);
        const htmlDicas = dicas.length ? `<div class="lab-dialeto">${dicas.map(d => `<p>💡 ${esc(d)}</p>`).join('')}</div>` : '';
        try {
            await abrirBanco(seletor.value);
            let resultados = sql.trim() ? await executar(sql) : [];
            if (sqlExtra) resultados = await mostrarTabelas();
            const html = resultados.length
                ? resultados.map(r => (r.titulo ? `<p class="lab-titulo-tabela">${esc(r.titulo)}</p>` : '') + tabelaHTML(r)).join('')
                : '<p class="lab-ok">✔ Executado. Nenhuma linha de resultado (comandos como INSERT, UPDATE e DELETE não devolvem linhas; use "Ver tabelas" para ver o efeito).</p>';
            saida.innerHTML = htmlDicas + html;
        } catch (erro) {
            saida.innerHTML = htmlDicas + `<p class="lab-erro">✖ ${esc(traduzirErro(erro.message, sql))}</p>`;
        } finally {
            ocupado = false;
            botaoExecutar.disabled = false;
        }
    };

    // Estado de cada tabela DEPOIS do script do editor
    async function mostrarTabelas() {
        const [lista] = await executar("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
        const nomes = lista ? lista.values.map(v => v[0]) : [];
        const saidas = [];
        for (const nome of nomes) {
            const [r] = await executar(`SELECT * FROM "${nome.replace(/"/g, '""')}";`);
            saidas.push({ titulo: `Tabela ${nome}`, columns: r ? r.columns : ['(vazia)'], values: r ? r.values : [] });
        }
        if (!saidas.length) saidas.push({ titulo: 'Nenhuma tabela', columns: ['(banco vazio)'], values: [] });
        return saidas;
    }

    botaoExecutar.addEventListener('click', () => rodar());
    painel.querySelector('.lab-tabelas').addEventListener('click', () => rodar(true));
    const botaoTrazer = painel.querySelector('.lab-trazer');
    if (botaoTrazer) {
        botaoTrazer.addEventListener('click', () => {
            editor.value = sqlEnunciado;
            if (/\bcreate\s+table\b/i.test(sqlEnunciado)) seletor.value = 'vazio';
            editor.focus();
        });
    }
    editor.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            rodar();
        }
    });
    return painel;
}

/** Abre (ou fecha) o laboratório dentro do card da questão. */
export function alternarLaboratorio(card, q) {
    const lugar = card.querySelector('.lab-sql-container');
    if (!lugar) return;
    const aberto = lugar.querySelector('.lab-sql');
    const botao = card.querySelector('.btn-lab-sql');
    if (aberto) {
        aberto.remove();
        if (botao) botao.textContent = '🧪 Testar no laboratório SQL';
        return;
    }
    lugar.appendChild(montarPainel(card, q));
    if (botao) botao.textContent = '✖ Fechar laboratório';
    const editor = lugar.querySelector('.lab-editor');
    if (editor) editor.focus({ preventScroll: true });
}
