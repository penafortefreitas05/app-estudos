// ============================================================
// js/bloco-tela.js - Tela "Bloco do dia" (FocoPro)
// ============================================================
// Desenho de 21/11/2026 (claude/01-metodo/trilha-bloco-do-dia-desenho-21-11.md). Uma tela só com:
//   1. Revisar hoje: retestes (assunto + data) e a fila de questões.
//   2. Bloco ativo: o assunto do dia (1 novo por dia) e como sair dele ("Ver tudo").
//   3. Sequência do dia: escolher o bloco, caderno de erros, rever, questões novas, fechamento.
// A tela não decide nada sozinha: quem muda filtros, abre o Caderno ou o Aprender é o app.js (callbacks).

import { esc } from './ui.js';
import { icone } from './icones.js';
import {
    PASSOS, TETO_ERROS_BLOCO, diaDeHoje, somarDiasData, formatarDiaBR, dataValida,
    lerPassos, alternarPasso, resumoDoBloco, retestesDoDia, criarReteste
} from './bloco.js';

const semAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// ctx: {
//   assuntos: () => [{ materia, assunto, nQuestoes, nCartoes }],
//   bloco: () => {materia, assunto} | null,  questoes: () => [], historico: () => ({}),
//   retestes: () => [], filaDeHoje: () => número de questões vencidas,
//   aoEscolher(materia, assunto), aoVerTudo(), aoSalvarReteste(r), aoFeitoReteste(r), aoApagarReteste(r),
//   aoAbrirRevisao(), aoCaderno(bloco), aoRever(bloco), aoPraticar(bloco)
// }
export function abrirBlocoDoDia(ctx) {
    if (document.querySelector('.bd-tela')) return;
    const focoAntes = document.activeElement;
    const el = document.createElement('div');
    el.className = 'ce-tela bd-tela';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'bd-titulo');
    el.innerHTML = `
        <header class="ce-topo">
            <div>
                <h2 id="bd-titulo" class="ce-titulo">${icone('alvo', 'ic-azul')}Bloco do dia</h2>
                <p class="ce-sub" aria-live="polite">Um assunto por dia: erro primeiro, depois rever e questões novas.</p>
            </div>
            <button type="button" class="ce-sair" data-bd="fechar" aria-label="Fechar o bloco do dia">${icone('fechar')}</button>
        </header>
        <div class="ce-corpo bd-corpo"></div>`;
    document.body.appendChild(el);
    const corpo = el.querySelector('.bd-corpo');
    let novoReteste = { materia: '', assunto: '', data: somarDiasData(diaDeHoje(), 3) };
    let formAberto = false;

    function fechar() {
        document.removeEventListener('keydown', aoTeclar, true);
        el.remove();
        if (focoAntes && focoAntes.focus && document.contains(focoAntes)) focoAntes.focus({ preventScroll: true });
    }
    function aoTeclar(e) {
        if (e.key === 'Escape' && !document.querySelector('.sa-overlay')) { e.preventDefault(); e.stopPropagation(); fechar(); }
    }
    document.addEventListener('keydown', aoTeclar, true);

    // ----- Seletor de assunto (folha com busca; reaproveita o visual do seletor do app) -----
    function escolherAssunto(aoEscolher) {
        if (document.querySelector('.sa-overlay')) return;
        const lista = ctx.assuntos();
        let busca = '';
        const ov = document.createElement('div');
        ov.className = 'sa-overlay';
        ov.innerHTML = `
            <div class="sa-folha" role="dialog" aria-modal="true" aria-label="Escolher assunto">
                <div class="sa-topo">
                    <input type="search" class="sa-busca" placeholder="Buscar assunto..." aria-label="Buscar assunto" autocomplete="off" enterkeyhint="search">
                    <button type="button" class="sa-fechar" data-sa="fechar" aria-label="Fechar">${icone('fechar')}</button>
                </div>
                <div class="sa-lista"></div>
            </div>`;
        const caixa = ov.querySelector('.sa-lista');
        function desenhar() {
            const termo = semAcento(busca).trim();
            const casam = lista.filter((a) => !termo || semAcento(a.assunto).includes(termo) || semAcento(a.materia).includes(termo));
            const grupos = new Map();
            casam.forEach((a) => { if (!grupos.has(a.materia)) grupos.set(a.materia, []); grupos.get(a.materia).push(a); });
            caixa.innerHTML = [...grupos.entries()].map(([mat, itens]) =>
                `<p class="sa-grupo">${esc(mat)}</p>` + itens.map((a) =>
                    `<button type="button" class="sa-item" data-materia="${esc(a.materia)}" data-assunto="${esc(a.assunto)}">${esc(a.assunto)}<span class="bd-n"> · ${a.nQuestoes} ${a.nQuestoes === 1 ? 'questão' : 'questões'}${a.nCartoes ? `, ${a.nCartoes} ${a.nCartoes === 1 ? 'cartão' : 'cartões'}` : ''}</span></button>`).join('')
            ).join('') || '<p class="sa-vazio">Nenhum assunto com esse texto.</p>';
        }
        function sair() { ov.remove(); }
        ov.addEventListener('click', (e) => {
            if (e.target === ov) return sair();
            const b = e.target.closest('button');
            if (!b) return;
            if (b.dataset.sa === 'fechar') return sair();
            if (b.dataset.assunto !== undefined) { sair(); aoEscolher(b.dataset.materia, b.dataset.assunto); }
        });
        ov.querySelector('.sa-busca').addEventListener('input', (e) => { busca = e.target.value; desenhar(); });
        ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); sair(); } }, true);
        document.body.appendChild(ov);
        desenhar();
        ov.querySelector('.sa-busca').focus({ preventScroll: true });
    }

    // ----- Partes da tela -----
    function htmlRetestes() {
        const hoje = diaDeHoje();
        const d = retestesDoDia(ctx.retestes(), hoje);
        const linha = (r, tipo) => `
            <div class="bd-reteste ${tipo}">
                <div class="bd-reteste-txt"><b>${esc(r.assunto)}</b><span>${esc(r.materia)} · ${tipo === 'atrasado' ? 'atrasado, era ' : (tipo === 'hoje' ? 'hoje, ' : 'em ')}${formatarDiaBR(r.data)}${r.pendente ? ' · aguardando sinal' : ''}</span></div>
                <div class="bd-reteste-acoes">
                    <button type="button" class="ce-btn principal" data-bd="abrir-reteste" data-id="${esc(r.id)}">Abrir bloco</button>
                    <button type="button" class="ce-btn" data-bd="feito-reteste" data-id="${esc(r.id)}">Feito</button>
                    <button type="button" class="ce-btn" data-bd="apagar-reteste" data-id="${esc(r.id)}" aria-label="Apagar o reteste de ${esc(r.assunto)}" title="Apagar">${icone('fechar')}</button>
                </div>
            </div>`;
        const vencidos = d.atrasados.length + d.hoje.length;
        const fila = Number(ctx.filaDeHoje()) || 0;
        const partes = [
            ...d.atrasados.map((r) => linha(r, 'atrasado')),
            ...d.hoje.map((r) => linha(r, 'hoje'))
        ];
        const proximos = d.proximos.length
            ? `<p class="bd-sub">Próximos 7 dias</p>${d.proximos.map((r) => linha(r, 'proximo')).join('')}` : '';
        const vazio = !partes.length ? '<p class="bd-vazio">Nenhum reteste para hoje.</p>' : '';
        const form = formAberto ? `
            <div class="bd-form">
                <button type="button" class="ce-btn" data-bd="escolher-reteste">${novoReteste.assunto ? esc(novoReteste.assunto) : 'Escolher o assunto'}</button>
                <div class="bd-datas">
                    <button type="button" class="ce-chip${novoReteste.data === somarDiasData(hoje, 1) ? ' ativo' : ''}" data-bd="data" data-dias="1">Amanhã</button>
                    <button type="button" class="ce-chip${novoReteste.data === somarDiasData(hoje, 3) ? ' ativo' : ''}" data-bd="data" data-dias="3">Em 3 dias</button>
                    <button type="button" class="ce-chip${novoReteste.data === somarDiasData(hoje, 7) ? ' ativo' : ''}" data-bd="data" data-dias="7">Em 7 dias</button>
                    <input type="date" class="bd-data-input" value="${esc(novoReteste.data)}" min="${hoje}" aria-label="Data do reteste">
                </div>
                <div class="bd-form-acoes">
                    <button type="button" class="ce-btn principal" data-bd="salvar-reteste">Salvar reteste</button>
                    <button type="button" class="ce-btn" data-bd="cancelar-reteste">Cancelar</button>
                </div>
            </div>` : `<button type="button" class="ce-btn" data-bd="novo-reteste">+ Marcar reteste</button>`;
        return `
            <section class="bd-sec" aria-labelledby="bd-h-revisar">
                <h3 id="bd-h-revisar" class="bd-h">Revisar hoje</h3>
                <p class="bd-linha">${fila ? `<b>${fila}</b> ${fila === 1 ? 'questão vence' : 'questões vencem'} na fila de hoje` : 'Nenhuma questão vencida na fila de hoje'}${fila ? ` <button type="button" class="bd-link" data-bd="fila">Abrir a fila</button>` : ''}</p>
                <p class="bd-linha">${vencidos ? `<b>${vencidos}</b> ${vencidos === 1 ? 'reteste' : 'retestes'} para hoje ou atrasados` : 'Sem retestes vencidos'}</p>
                ${partes.join('')}${vazio}${proximos}
                ${form}
            </section>`;
    }

    function htmlBloco() {
        const b = ctx.bloco();
        if (!b) {
            return `
            <section class="bd-sec" aria-labelledby="bd-h-bloco">
                <h3 id="bd-h-bloco" class="bd-h">Bloco de hoje</h3>
                <p class="bd-linha">Você ainda não escolheu o assunto de hoje. O app mostra só ele no Caderno, no Aprender e nas questões.</p>
                <button type="button" class="ce-btn principal" data-bd="escolher-bloco">Escolher o bloco</button>
            </section>`;
        }
        const r = resumoDoBloco(ctx.questoes(), ctx.historico(), b);
        return `
            <section class="bd-sec" aria-labelledby="bd-h-bloco">
                <h3 id="bd-h-bloco" class="bd-h">Bloco de hoje</h3>
                <p class="bd-bloco-nome">${esc(b.assunto)}</p>
                <p class="bd-linha">${esc(b.materia)}</p>
                <p class="bd-linha"><b>${r.erros}</b> ${r.erros === 1 ? 'erro em aberto' : 'erros em aberto'}${r.erros > TETO_ERROS_BLOCO ? ` (começa pelos ${TETO_ERROS_BLOCO} primeiros)` : ''} · <b>${r.novas}</b> ${r.novas === 1 ? 'questão nova' : 'questões novas'} · ${r.total} no assunto</p>
                <div class="bd-acoes">
                    <button type="button" class="ce-btn" data-bd="escolher-bloco">Trocar de bloco</button>
                    <button type="button" class="ce-btn" data-bd="ver-tudo">Ver tudo</button>
                </div>
            </section>`;
    }

    function htmlSequencia() {
        const b = ctx.bloco();
        const feitos = b ? lerPassos(b) : new Set();
        const r = b ? resumoDoBloco(ctx.questoes(), ctx.historico(), b) : null;
        const acao = { erros: ['caderno', 'Abrir o caderno'], rever: ['rever', 'Abrir no Aprender'], questoes: ['praticar', 'Praticar'] };
        const passo = (n, titulo, ajuda, feito, id, travado) => `
            <li class="bd-passo${feito ? ' feito' : ''}${travado ? ' travado' : ''}">
                <button type="button" class="bd-check" data-bd="passo" data-id="${id || ''}" aria-pressed="${feito}" aria-label="${feito ? 'Desmarcar' : 'Marcar como feito'}: ${esc(titulo)}" ${!id || travado ? 'disabled' : ''}>${feito ? '✓' : n}</button>
                <div class="bd-passo-txt"><b>${esc(titulo)}</b><span>${esc(ajuda)}</span>
                    ${id && acao[id] && b ? `<button type="button" class="ce-btn bd-passo-btn" data-bd="${acao[id][0]}">${acao[id][1]}</button>` : ''}
                </div>
            </li>`;
        let n = 1;
        const itens = [passo(n++, 'Escolher o bloco', b ? b.assunto : 'Toque em "Escolher o bloco".', Boolean(b), null, false)];
        PASSOS.forEach((p) => {
            let ajuda = p.ajuda;
            if (b && p.id === 'erros' && r && !r.erros) ajuda = 'Nenhum erro em aberto neste assunto: pode pular.';
            if (b && p.id === 'questoes' && r && !r.novas) ajuda = 'Sem questões novas neste assunto (já respondeu todas).';
            itens.push(passo(n++, p.titulo, ajuda, feitos.has(p.id), p.id, !b));
        });
        return `
            <section class="bd-sec" aria-labelledby="bd-h-seq">
                <h3 id="bd-h-seq" class="bd-h">Sequência do dia</h3>
                <ol class="bd-passos">${itens.join('')}</ol>
                <p class="bd-nota">Assunto novo, sem erros ainda: pule o caderno. A aula acontece fora do app; aqui você fixa.</p>
            </section>`;
    }

    function desenhar() {
        corpo.innerHTML = htmlRetestes() + htmlBloco() + htmlSequencia();
    }

    // ----- Eventos -----
    el.addEventListener('input', (e) => {
        if (e.target.classList.contains('bd-data-input') && dataValida(e.target.value)) { novoReteste.data = e.target.value; desenhar(); }
    });
    el.addEventListener('click', async (e) => {
        const alvo = e.target.closest('[data-bd]');
        if (!alvo) return;
        const acao = alvo.dataset.bd;
        const b = ctx.bloco();
        if (acao === 'fechar') return fechar();
        if (acao === 'escolher-bloco') return escolherAssunto((materia, assunto) => { ctx.aoEscolher(materia, assunto); desenhar(); });
        if (acao === 'ver-tudo') { ctx.aoVerTudo(); return desenhar(); }
        if (acao === 'fila') { fechar(); return ctx.aoAbrirRevisao(); }
        if (acao === 'passo') { if (b && alvo.dataset.id) { alternarPasso(b, alvo.dataset.id); desenhar(); } return; }
        if (acao === 'caderno') { fechar(); return ctx.aoCaderno(b); }
        if (acao === 'rever') { fechar(); return ctx.aoRever(b); }
        if (acao === 'praticar') { fechar(); return ctx.aoPraticar(b); }
        if (acao === 'novo-reteste') { formAberto = true; novoReteste = { materia: b ? b.materia : '', assunto: b ? b.assunto : '', data: somarDiasData(diaDeHoje(), 3) }; return desenhar(); }
        if (acao === 'cancelar-reteste') { formAberto = false; return desenhar(); }
        if (acao === 'escolher-reteste') return escolherAssunto((materia, assunto) => { novoReteste.materia = materia; novoReteste.assunto = assunto; desenhar(); });
        if (acao === 'data') { novoReteste.data = somarDiasData(diaDeHoje(), Number(alvo.dataset.dias)); return desenhar(); }
        if (acao === 'salvar-reteste') {
            if (!novoReteste.assunto) { alvo.textContent = 'Escolha o assunto primeiro'; return; }
            if (!dataValida(novoReteste.data)) return;
            const r = criarReteste(novoReteste.materia, novoReteste.assunto, novoReteste.data);
            formAberto = false;
            await ctx.aoSalvarReteste(r);
            return desenhar();
        }
        const reteste = ctx.retestes().find((x) => x.id === alvo.dataset.id);
        if (!reteste) return;
        if (acao === 'abrir-reteste') { ctx.aoEscolher(reteste.materia, reteste.assunto); return desenhar(); }
        if (acao === 'feito-reteste') { await ctx.aoFeitoReteste(reteste); return desenhar(); }
        if (acao === 'apagar-reteste') { await ctx.aoApagarReteste(reteste); return desenhar(); }
    });

    desenhar();
    el.querySelector('.ce-sair').focus({ preventScroll: true });
    return { fechar, redesenhar: desenhar };
}
