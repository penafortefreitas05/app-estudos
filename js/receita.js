// ============================================================
// js/receita.js - Simulado montado por receita (FocoPro, Fase 2 do simulado, 15/11/2026)
// ============================================================
// A sala de aula escreve a receita no formato do catálogo (claude/07-catalogo/00-leia-primeiro.md);
// o Nathan cola no app, vê a prévia com quantas questões existem e começa. Aqui só há funções
// puras (sem tela): ler o texto, casar os nomes com os do banco e sortear as questões.
//
// Formato:
//   SIMULADO: <nome curto>
//   <matéria> / <assunto> [/ tema: <tag>, <tag>] → <quantidade>
//   <matéria> → <quantidade>                 (qualquer assunto da matéria)
//   <matéria> / <assunto> + <assunto> → <quantidade>   (sorteia entre os assuntos; v172)
//   status: <% novas>, <% Caderno de erros> | já feitas · nível: 1 | 2 | 3 · tipo: todas | C/E | múltipla
//   tempo: sem | sugerido | <minutos>

// Sem acento, minúsculo e com espaços simples: "Normalização " == "normalizacao"
export function normalizar(t) {
    return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const SETA = /\s*(?:→|->|=>|⇒)\s*/;

function lerPorcentagens(texto) {
    const t = normalizar(texto);
    // v188: "status: já feitas" = só questões que o aluno já respondeu (erros em aberto + já vistas)
    if (/\b(?:ja\s+)?(?:feita|vista|respondida)s?\b/.test(t) && !/nova|caderno/.test(t)) return { novas: 0, caderno: 0, feitas: true };
    const novas = t.match(/(\d{1,3})\s*%?\s*(?:de\s+)?nova/);
    const caderno = t.match(/(\d{1,3})\s*%?\s*(?:do\s+|de\s+)?caderno/);
    let n = novas ? Number(novas[1]) : null;
    let c = caderno ? Number(caderno[1]) : null;
    if (n === null && c === null) return null;
    if (n === null) n = 100 - c;
    if (c === null) c = 100 - n;
    if (n < 0 || c < 0 || n + c !== 100) return { erro: `As porcentagens de status somam ${n + c}%, e precisam somar 100%.` };
    return { novas: n, caderno: c };
}

function lerNiveis(texto) {
    const t = normalizar(texto);
    if (/todos|qualquer/.test(t)) return [];
    const n = [...t.matchAll(/[1-4]/g)].map((m) => Number(m[0]));
    return [...new Set(n)];
}

function lerTipo(texto) {
    const t = normalizar(texto).replace(/\s/g, '');
    if (!t || /todas|todos|qualquer/.test(t)) return 'todas';
    if (/c\/e|certo|ce\b|^ce$/.test(t)) return 'certo_errado';
    if (/multipla|a-e|a\/e|objetiva/.test(t)) return 'multipla_escolha';
    return null;
}

function lerTempo(texto) {
    const t = normalizar(texto);
    if (!t || /sem/.test(t)) return { modo: 'sem' };
    if (/suger/.test(t)) return { modo: 'sugerido' };
    const n = t.match(/(\d{1,3})/);
    if (n && Number(n[1]) > 0) return { modo: 'minutos', minutos: Number(n[1]) };
    return null;
}

// Lê o texto colado. Não sabe nada do banco: só a forma.
// Devolve { nome, linhas: [{ n, materia, assunto, temas, qtd, texto }], status, niveis, tipo, tempo, erros: [{ n, texto, motivo }] }
export function lerReceita(texto) {
    const r = { nome: '', linhas: [], status: { novas: 100, caderno: 0 }, niveis: [], tipo: 'todas', tempo: { modo: 'sem' }, erros: [] };
    const linhas = String(texto || '').replace(/\r/g, '').split('\n');
    linhas.forEach((bruta, i) => {
        const n = i + 1;
        const linha = bruta.replace(/^[\s\-*•>`]+|[\s`]+$/g, '').trim();
        if (!linha || /^```/.test(linha)) return;
        const chave = normalizar(linha).match(/^(simulado|status|nivel|tipo|tempo)\s*:/);
        if (chave) {
            // Uma linha pode trazer várias partes: "status: 70% novas, 30% Caderno · nível: 1 · tipo: C/E"
            linha.split(/\s*[·|;]\s*(?=[A-Za-zÀ-ú]+\s*:)/).forEach((parte) => {
                const m = parte.match(/^\s*([A-Za-zÀ-ú]+)\s*:\s*(.*)$/);
                if (!m) return;
                const k = normalizar(m[1]);
                const v = m[2].trim();
                if (k === 'simulado') r.nome = v.slice(0, 60);
                else if (k === 'status') { const s = lerPorcentagens(v); if (!s || s.erro) r.erros.push({ n, texto: linha, motivo: s && s.erro ? s.erro : 'Não entendi o status. Exemplo: "status: 70% novas, 30% Caderno de erros".' }); else r.status = s; }
                else if (k === 'nivel') r.niveis = lerNiveis(v);
                else if (k === 'tipo') { const t = lerTipo(v); if (t) r.tipo = t; else r.erros.push({ n, texto: linha, motivo: 'Tipo deve ser "todas", "C/E" ou "múltipla".' }); }
                else if (k === 'tempo') { const t = lerTempo(v); if (t) r.tempo = t; else r.erros.push({ n, texto: linha, motivo: 'Tempo deve ser "sem", "sugerido" ou um número de minutos.' }); }
            });
            return;
        }
        if (!SETA.test(linha)) { r.erros.push({ n, texto: linha, motivo: 'Falta a seta com a quantidade (→ 10).' }); return; }
        const [esquerda, direita] = linha.split(SETA);
        const qtd = Number(String(direita || '').match(/\d+/));
        if (!qtd || qtd < 1) { r.erros.push({ n, texto: linha, motivo: 'A quantidade depois da seta precisa ser um número.' }); return; }
        const partes = esquerda.split(/\s+\/\s+/).map((p) => p.trim()).filter(Boolean);
        let temas = [];
        const iTema = partes.findIndex((p) => /^tema\s*:/i.test(p));
        if (iTema >= 0) {
            temas = partes[iTema].replace(/^tema\s*:\s*/i, '').split(',').map((t) => t.trim()).filter(Boolean);
            partes.splice(iTema, 1);
        }
        const [materia, ...resto] = partes;
        if (!materia) { r.erros.push({ n, texto: linha, motivo: 'Falta a matéria.' }); return; }
        const assuntos = resto.join(' / ').split(/\s+\+\s+/).map((a) => a.trim()).filter(Boolean);
        r.linhas.push({ n, materia, assunto: assuntos.length === 1 ? assuntos[0] : '', assuntos: assuntos.length > 1 ? assuntos : [], temas, qtd: Math.min(qtd, 200), texto: linha });
    });
    if (!r.linhas.length && !r.erros.length) r.erros.push({ n: 0, texto: '', motivo: 'Nenhuma linha com matéria e quantidade (ex.: "Redes & Segurança da Informação / Scrum → 10").' });
    return r;
}

// Catálogo a partir das questões carregadas: Map(materia -> Set(assunto))
export function catalogoDe(questoes) {
    const cat = new Map();
    (questoes || []).forEach((q) => {
        const m = q.materia || 'Geral';
        if (!cat.has(m)) cat.set(m, new Set());
        if (q.assunto) cat.get(m).add(q.assunto);
    });
    return cat;
}

// Parecença entre dois nomes (0 a 1): pares de letras em comum, para pegar erro de digitação
// ("Scrun" ~ "Scrum"). Compara o pedido com o começo do nome do banco, do mesmo tamanho.
function parecenca(a, b) {
    const pares = (t) => { const x = normalizar(t).replace(/[^a-z0-9]/g, ''); const l = []; for (let i = 0; i < x.length - 1; i++) l.push(x.slice(i, i + 2)); return l; };
    const pa = pares(a);
    const pb = pares(normalizar(b).slice(0, normalizar(a).length + 2));
    if (!pa.length || !pb.length) return 0;
    const resto = [...pb];
    let comum = 0;
    pa.forEach((p) => { const i = resto.indexOf(p); if (i >= 0) { comum++; resto.splice(i, 1); } });
    return (2 * comum) / (pa.length + pb.length);
}

// Exato (sem acento) > começa igual (único) > nenhum. Devolve { nome, sugestao }.
function casarNome(pedido, opcoes) {
    const alvo = normalizar(pedido);
    const lista = [...opcoes];
    const exato = lista.find((o) => normalizar(o) === alvo);
    if (exato) return { nome: exato };
    const comeca = lista.filter((o) => normalizar(o).startsWith(alvo) || alvo.startsWith(normalizar(o).split(/ \(|,| —/)[0]));
    if (comeca.length === 1) return { nome: comeca[0] };
    const melhor = lista.map((o) => [o, parecenca(pedido, o)]).sort((a, b) => b[1] - a[1])[0];
    return { nome: null, sugestao: melhor && melhor[1] >= 0.4 ? melhor[0] : null };
}

// Troca os nomes da receita pelos nomes exatos do banco. Linha com nome que não existe ganha `problema`.
export function casarReceita(receita, catalogo) {
    const linhas = receita.linhas.map((l) => {
        const m = casarNome(l.materia, catalogo.keys());
        if (!m.nome) return { ...l, problema: `Matéria não encontrada: "${l.materia}".`, sugestao: m.sugestao || null };
        if (l.assuntos && l.assuntos.length) {
            const casados = l.assuntos.map((a) => ({ a, c: casarNome(a, catalogo.get(m.nome) || []) }));
            const ruim = casados.find((x) => !x.c.nome);
            if (ruim) return { ...l, materia: m.nome, problema: `Assunto não encontrado em ${m.nome}: "${ruim.a}".`, sugestao: ruim.c.sugestao || null };
            return { ...l, materia: m.nome, assuntos: [...new Set(casados.map((x) => x.c.nome))] };
        }
        if (!l.assunto) return { ...l, materia: m.nome };
        const a = casarNome(l.assunto, catalogo.get(m.nome) || []);
        if (!a.nome) return { ...l, materia: m.nome, problema: `Assunto não encontrado em ${m.nome}: "${l.assunto}".`, sugestao: a.sugestao || null };
        return { ...l, materia: m.nome, assunto: a.nome };
    });
    return { ...receita, linhas };
}

// Situação da questão para a receita: 'caderno' (erro em aberto, como no Caderno de erros),
// 'nova' (nunca respondida) ou 'vista' (respondida e sem erro em aberto)
export function situacao(h) {
    if (!h || !h.tentativas) return 'nova';
    if ((h.erros || 0) > 0 && h.ultimaResposta === 'errado') return 'caderno';
    return 'vista';
}

function serveParaLinha(q, l, receita) {
    if ((q.materia || 'Geral') !== l.materia) return false;
    if (l.assunto && q.assunto !== l.assunto) return false;
    if (l.assuntos && l.assuntos.length && !l.assuntos.includes(q.assunto)) return false;
    if (receita.niveis.length && !receita.niveis.includes(Number(q.nivel))) return false;
    if (receita.tipo !== 'todas' && (q.tipo || 'multipla_escolha') !== receita.tipo) return false;
    if (l.temas && l.temas.length) {
        const tags = (q.tags || []).map(normalizar);
        if (!l.temas.some((t) => tags.includes(normalizar(t)))) return false;
    }
    return true;
}

function embaralhar(lista, aleatorio = Math.random) {
    const a = [...lista];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(aleatorio() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// Sorteia as questões, linha a linha, na ordem da receita. Por linha: a parte do Caderno sai das
// questões com erro em aberto, o resto das novas; se faltar num grupo, completa com o outro e,
// por último, com questões já vistas (avisado na prévia). A mesma questão nunca entra duas vezes.
// Devolve { questoes, porLinha: [{ ...linha, disponiveis, entraram, caderno, novas, vistas }], total }
export function montarPelaReceita(questoes, receita, historico = {}, { aleatorio = Math.random } = {}) {
    const usadas = new Set();
    const escolhidas = [];
    const porLinha = receita.linhas.map((l) => {
        if (l.problema) return { ...l, disponiveis: 0, entraram: 0, querCaderno: 0, caderno: 0, novas: 0, vistas: 0 };
        const grupos = { caderno: [], nova: [], vista: [] };
        questoes.forEach((q) => {
            if (usadas.has(String(q.id)) || !serveParaLinha(q, l, receita)) return;
            grupos[situacao(historico[String(q.id)])].push(q);
        });
        Object.keys(grupos).forEach((k) => { grupos[k] = embaralhar(grupos[k], aleatorio); });
        // v188: origem "Já feitas": sorteia só entre o que o aluno já respondeu (erros em aberto
        // e já vistas, misturados). Nunca completa com novas: se faltar, entra menos e a prévia avisa.
        if (receita.status.feitas) {
            const feitas = embaralhar([...grupos.caderno, ...grupos.vista], aleatorio);
            const escolhidasLinha = feitas.slice(0, Math.max(0, l.qtd));
            escolhidasLinha.forEach((q) => usadas.add(String(q.id)));
            escolhidas.push(...escolhidasLinha);
            const doCad = escolhidasLinha.filter((q) => situacao(historico[String(q.id)]) === 'caderno').length;
            return { ...l, disponiveis: feitas.length, entraram: escolhidasLinha.length, querCaderno: 0, caderno: doCad, novas: 0, vistas: escolhidasLinha.length - doCad };
        }
        const disponiveis = grupos.caderno.length + grupos.nova.length + grupos.vista.length;
        const querCaderno = Math.round((l.qtd * receita.status.caderno) / 100);
        const pega = (lista, n) => lista.splice(0, Math.max(0, n));
        const doCaderno = pega(grupos.caderno, querCaderno);
        const novas = pega(grupos.nova, l.qtd - doCaderno.length);
        // Faltou nova: completa com o Caderno; ainda faltando, com já vistas
        const maisCaderno = pega(grupos.caderno, l.qtd - doCaderno.length - novas.length);
        const vistas = pega(grupos.vista, l.qtd - doCaderno.length - novas.length - maisCaderno.length);
        const daLinha = embaralhar([...doCaderno, ...maisCaderno, ...novas, ...vistas], aleatorio);
        daLinha.forEach((q) => usadas.add(String(q.id)));
        escolhidas.push(...daLinha);
        return { ...l, disponiveis, entraram: daLinha.length, querCaderno, caderno: doCaderno.length + maisCaderno.length, novas: novas.length, vistas: vistas.length };
    });
    return { questoes: escolhidas, porLinha, total: escolhidas.length };
}

// Texto de volta (para guardar a receita já com os nomes do banco)
export function receitaComoTexto(r) {
    const nivel = r.niveis.length ? r.niveis.join(' | ') : 'todos';
    const tipo = { todas: 'todas', certo_errado: 'C/E', multipla_escolha: 'múltipla' }[r.tipo] || 'todas';
    const tempo = r.tempo.modo === 'minutos' ? `${r.tempo.minutos}` : r.tempo.modo === 'sugerido' ? 'sugerido' : 'sem';
    return [
        `SIMULADO: ${r.nome || 'Sem nome'}`,
        ...r.linhas.map((l) => `${l.materia}${l.assuntos && l.assuntos.length ? ` / ${l.assuntos.join(' + ')}` : l.assunto ? ` / ${l.assunto}` : ''}${l.temas && l.temas.length ? ` / tema: ${l.temas.join(', ')}` : ''} → ${l.qtd}`),
        `status: ${r.status.feitas ? 'já feitas' : `${r.status.novas}% novas, ${r.status.caderno}% Caderno de erros`} · nível: ${nivel} · tipo: ${tipo}`,
        `tempo: ${tempo}`
    ].join('\n');
}

// ---------- Montador visual (v172) ----------
// A tela guarda uma configuração estruturada (cfg); a receita em texto é gerada dela.
// cfg: { nome, blocos: [{ materia, assuntos: [] (vazio = todos), qtd, porAssunto, qtdPorAssunto: {assunto: n}, temas: [] }],
//        status: { novas, caderno }, niveis: [], tipo, tempo: { modo, minutos } }
export function cfgVazia() {
    return { nome: '', blocos: [], status: { novas: 70, caderno: 30 }, niveis: [1], tipo: 'todas', tempo: { modo: 'sugerido' } };
}

// Linhas da receita a partir da cfg: bloco "por assunto" vira uma linha por assunto
export function cfgParaReceita(cfg) {
    const linhas = [];
    (cfg.blocos || []).forEach((b, i) => {
        const temas = b.temas || [];
        if (b.porAssunto && b.assuntos.length) {
            b.assuntos.forEach((a) => { const n = Number((b.qtdPorAssunto || {})[a]) || 0; if (n > 0) linhas.push({ n: i + 1, bloco: i, materia: b.materia, assunto: a, assuntos: [], temas, qtd: n }); });
        } else if (Number(b.qtd) > 0) {
            linhas.push({ n: i + 1, bloco: i, materia: b.materia, assunto: b.assuntos.length === 1 ? b.assuntos[0] : '', assuntos: b.assuntos.length > 1 ? [...b.assuntos] : [], temas, qtd: Number(b.qtd) });
        }
    });
    return { nome: cfg.nome || '', linhas, status: { ...cfg.status }, niveis: [...(cfg.niveis || [])], tipo: cfg.tipo || 'todas', tempo: { ...cfg.tempo }, erros: [] };
}

// Receita lida (texto já casado com o banco) → cfg. Linhas seguidas da mesma matéria com um assunto
// cada viram um bloco "por assunto"; o resto, um bloco por linha.
export function receitaParaCfg(r) {
    const blocos = [];
    r.linhas.filter((l) => !l.problema).forEach((l) => {
        const ult = blocos[blocos.length - 1];
        if (l.assunto && ult && ult.materia === l.materia && (ult.porAssunto || ult.assuntos.length === 1) && !ult.assuntos.includes(l.assunto) && JSON.stringify(ult.temas) === JSON.stringify(l.temas || [])) {
            if (!ult.porAssunto) { ult.porAssunto = true; ult.qtdPorAssunto = { [ult.assuntos[0]]: ult.qtd }; }
            ult.assuntos.push(l.assunto);
            ult.qtdPorAssunto[l.assunto] = l.qtd;
            ult.qtd += l.qtd;
            return;
        }
        blocos.push({ materia: l.materia, assuntos: l.assuntos && l.assuntos.length ? [...l.assuntos] : l.assunto ? [l.assunto] : [], qtd: l.qtd, porAssunto: false, qtdPorAssunto: {}, temas: l.temas || [] });
    });
    return { nome: r.nome || '', blocos, status: { ...r.status }, niveis: [...r.niveis], tipo: r.tipo, tempo: { ...r.tempo } };
}

// Quantas questões cada assunto tem com o nível e o tipo escolhidos: Map(materia -> Map(assunto -> n))
export function contarPorAssunto(questoes, { niveis = [], tipo = 'todas' } = {}) {
    const m = new Map();
    (questoes || []).forEach((q) => {
        if (niveis.length && !niveis.includes(Number(q.nivel))) return;
        if (tipo !== 'todas' && (q.tipo || 'multipla_escolha') !== tipo) return;
        const mat = q.materia || 'Geral';
        if (!m.has(mat)) m.set(mat, new Map());
        const a = q.assunto || 'Sem assunto';
        m.get(mat).set(a, (m.get(mat).get(a) || 0) + 1);
    });
    return m;
}

// v188b: quantas questões o aluno já respondeu, por matéria e assunto (mesmo filtro de nível e tipo
// de contarPorAssunto). Serve para colorir as listas de "Adicionar matéria" e de assuntos.
export function contarFeitasPorAssunto(questoes, historico = {}, { niveis = [], tipo = 'todas' } = {}) {
    const m = new Map();
    (questoes || []).forEach((q) => {
        if (niveis.length && !niveis.includes(Number(q.nivel))) return;
        if (tipo !== 'todas' && (q.tipo || 'multipla_escolha') !== tipo) return;
        if (situacao(historico[String(q.id)]) === 'nova') return;
        const mat = q.materia || 'Geral';
        if (!m.has(mat)) m.set(mat, new Map());
        const a = q.assunto || 'Sem assunto';
        m.get(mat).set(a, (m.get(mat).get(a) || 0) + 1);
    });
    return m;
}

// Estado de cobertura: 'novo' (nada respondido), 'comecei' (menos da metade) ou 'coberto' (metade ou mais)
export function estadoCobertura(feitas, total) {
    if (!feitas || !total) return 'novo';
    return feitas / total >= 0.5 ? 'coberto' : 'comecei';
}
