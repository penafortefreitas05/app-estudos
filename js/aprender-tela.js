// ============================================================
// js/aprender-tela.js - Tela do Aprender: matérias → assuntos (FocoPro)
// ============================================================
// Decidido em 05/11/2026: o Aprender deixa de ser uma janela com lista única e passa a ser uma tela:
//   - "Continuar" no topo (último assunto aberto, ou o próximo ainda não feito);
//   - matérias com barra de progresso (assuntos aprendidos);
//   - assuntos da matéria escolhida, na ordem em que ensinam, com filtro (Todos, Não lidos,
//     Aprendidos) e busca.
// Celular: duas vistas (matérias → assuntos, com botão voltar). Computador (>= 900px): duas colunas.
// O "Aprendi" (uma marca por assunto) é guardado no aparelho por js/leitura.js; esta tela só lê esse estado.

import { esc } from './ui.js';
import { montarPlano, TIPOS_DIA } from './plano.js';
import { ordenarAssuntos } from './ordem-assuntos.js';
import { assuntosComCartoes, abrirLeitura, lerAprendidos, assuntoAprendido, migrarEntendidos } from './leitura.js';

const CHAVE_ULTIMO = 'appEstudos_AprenderUltimo';

export const FILTROS = [
    ['todos', 'Todos'],
    ['novos', 'Não lidos'],
    ['feitos', 'Aprendidos']
];

// ---------- Regras puras (testáveis sem tela) ----------

// Estado de um assunto: feitos (marcou "Aprendi") ou novos
export function estadoDe(assunto, aprendidos = {}) {
    return assuntoAprendido(assunto.materia, assunto.assunto, aprendidos) ? 'feitos' : 'novos';
}

// Agrupa [{materia, assunto, cartoes}] por matéria. Matérias na ordem dada (as demais, em ordem alfabética);
// assuntos na ordem de pré-requisitos da sala de aula (js/ordem-assuntos.js); o que não está lá, na ordem do arquivo de cartões.
export function agruparPorMateria(lista, ordemMaterias = []) {
    const mapa = new Map();
    lista.forEach(a => {
        if (!mapa.has(a.materia)) mapa.set(a.materia, []);
        mapa.get(a.materia).push(a);
    });
    const extras = [...mapa.keys()].filter(m => !ordemMaterias.includes(m)).sort((x, y) => x.localeCompare(y, 'pt-BR'));
    return [...ordemMaterias.filter(m => mapa.has(m)), ...extras].map(materia => ({ materia, assuntos: ordenarAssuntos(materia, mapa.get(materia)) }));
}

// Progresso de uma matéria em assuntos
export function progressoDaMateria(assuntos, aprendidos = {}) {
    const feitos = assuntos.filter(a => estadoDe(a, aprendidos) === 'feitos').length;
    return { assuntos: assuntos.length, assuntosFeitos: feitos, cartoes: assuntos.reduce((n, a) => n + a.cartoes.length, 0) };
}

// O que o botão "Continuar" oferece: { materia, assunto, tipo } ou null quando tudo foi aprendido
//   continuar: o último assunto aberto ainda não foi marcado "Aprendi"
//   proximo:   o último foi aprendido; vai para o próximo da matéria (ou o primeiro pendente de qualquer matéria)
//   comecar:   nunca abriu nada
export function escolherContinuar(grupos, ultimo, aprendidos = {}) {
    const pendente = a => estadoDe(a, aprendidos) !== 'feitos';
    const g0 = ultimo ? grupos.find(x => x.materia === ultimo.materia) : null;
    const i0 = g0 ? g0.assuntos.findIndex(a => a.assunto === ultimo.assunto) : -1;
    if (i0 >= 0) {
        if (pendente(g0.assuntos[i0])) return { materia: ultimo.materia, assunto: ultimo.assunto, tipo: 'continuar' };
        const depois = g0.assuntos.slice(i0 + 1).find(pendente);
        if (depois) return { materia: depois.materia, assunto: depois.assunto, tipo: 'proximo' };
    }
    for (const g of grupos) {
        const a = g.assuntos.find(pendente);
        if (a) return { materia: g.materia, assunto: a.assunto, tipo: i0 >= 0 ? 'proximo' : 'comecar' };
    }
    return null;
}

const semAcento = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Filtra os assuntos de uma matéria por situação e por texto
export function filtrarAssuntos(assuntos, filtro, busca, aprendidos = {}) {
    const termo = semAcento(busca).trim();
    return assuntos.filter(a => {
        if (filtro !== 'todos' && estadoDe(a, aprendidos) !== filtro) return false;
        return !termo || semAcento(a.assunto).includes(termo);
    });
}

function lerUltimo() {
    try {
        const v = JSON.parse(localStorage.getItem(CHAVE_ULTIMO) || 'null');
        return v && v.materia && v.assunto ? v : null;
    } catch (e) { return null; }
}

function guardarUltimo(materia, assunto) {
    try { localStorage.setItem(CHAVE_ULTIMO, JSON.stringify({ materia, assunto })); } catch (e) { /* segue sem guardar */ }
}

// ---------- Tela ----------

// opcoes.ordemMaterias: ordem das matérias na lista
// opcoes.temQuestoes(materia, assunto): se true, a leitura mostra "Praticar" no fim
// opcoes.aoPraticar(materia, assunto): chamado depois de fechar leitura e tela
// opcoes.assuntoVisivel(materia, assunto): false esconde o assunto (concurso escolhido no perfil)
// opcoes.perfil: perfil do usuário (dias e horas montam o plano); opcoes.aoConfigurarPlano(): abre o perfil
// opcoes.aoAbrirRevisao/aoAbrirCaderno/aoAbrirSimulado(): atalhos dos dias de recuperação e comprovação; opcoes.prioridades(): assuntos a focar na recuperação
// opcoes.materia: matéria já escolhida ao abrir (ex.: primeira sessão guiada)
// Devolve false quando não há cartões carregados (ex.: sem internet na primeira vez).
export async function abrirAprender({ ordemMaterias = [], temQuestoes = () => false, aoPraticar, materia: materiaInicial, assuntoVisivel = null, perfil = null, aoConfigurarPlano, aoAbrirRevisao, aoAbrirCaderno, aoAbrirSimulado, prioridades } = {}) {
    if (document.querySelector('.aprender-tela')) return true;
    const todos = await assuntosComCartoes();
    if (!todos.length) return false;
    // Segue o concurso do perfil: só os assuntos com questões dele. Se o filtro esvaziar tudo, mostra todos.
    const doConcurso = assuntoVisivel ? todos.filter(a => assuntoVisivel(a.materia, a.assunto)) : todos;
    const lista = doConcurso.length ? doConcurso : todos;
    migrarEntendidos(lista); // converte o "Entendi" por cartão da versão antiga (uma vez por aparelho)
    const grupos = agruparPorMateria(lista, ordemMaterias);

    const ultimo = lerUltimo();
    let materia = null;
    let vista = 'materias';
    const inicial = materiaInicial || (ultimo && ultimo.materia);
    if (grupos.some(g => g.materia === materiaInicial)) { materia = materiaInicial; vista = 'assuntos'; }
    else materia = grupos.some(g => g.materia === inicial) ? inicial : grupos[0].materia;
    let filtro = 'todos';
    let busca = '';

    const focoAntes = document.activeElement;
    const el = document.createElement('div');
    el.className = 'aprender-tela';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'at-titulo');
    el.innerHTML = `
        <header class="at-topo">
            <div>
                <h2 id="at-titulo" class="at-titulo">📖 Aprender</h2>
                <p class="at-sub"></p>
            </div>
            <button type="button" class="at-sair" data-acao="fechar" aria-label="Fechar o Aprender">✕</button>
        </header>
        <div class="at-corpo">
            <div class="at-continuar-area"></div>
            <div class="at-plano-area"></div>
            <div class="at-grade">
                <nav class="at-materias" aria-label="Matérias"></nav>
                <section class="at-assuntos" aria-label="Assuntos da matéria">
                    <div class="at-assuntos-topo">
                        <button type="button" class="at-voltar" data-acao="voltar">← Matérias</button>
                        <h3 class="at-materia-nome"></h3>
                        <p class="at-materia-prog"></p>
                    </div>
                    <div class="at-ferramentas">
                        <input type="search" class="at-busca" placeholder="Buscar assunto..." aria-label="Buscar assunto" autocomplete="off" enterkeyhint="search">
                        <div class="at-chips" role="group" aria-label="Filtrar assuntos"></div>
                    </div>
                    <ul class="at-lista"></ul>
                </section>
            </div>
        </div>`;
    const q = sel => el.querySelector(sel);

    function barra(feitos, total) {
        const pct = total ? Math.round(feitos * 100 / total) : 0;
        return `<span class="at-barra" aria-hidden="true"><i style="width:${pct}%"></i></span>`;
    }
    const dataCurta = iso => { const [a, m, d] = String(iso || '').split('-'); return d && m ? `${d}/${m}` : ''; };
    const cartoesTxt = n => `${n} ${n === 1 ? 'cartão' : 'cartões'}`;

    function desenharTopo(aprendidos) {
        const feitos = lista.filter(a => estadoDe(a, aprendidos) === 'feitos').length;
        q('.at-sub').textContent = `${feitos} de ${lista.length} assuntos aprendidos · ${lista.reduce((n, a) => n + a.cartoes.length, 0)} cartões`;
        const c = escolherContinuar(grupos, lerUltimo(), aprendidos);
        const area = q('.at-continuar-area');
        if (!c) {
            area.innerHTML = '<p class="at-tudo">🎉 Você marcou todos os assuntos como aprendidos. Abra qualquer um para ler de novo.</p>';
            return;
        }
        const a = lista.find(x => x.materia === c.materia && x.assunto === c.assunto);
        const rotulo = c.tipo === 'continuar' ? 'Continuar de onde parei' : (c.tipo === 'proximo' ? 'Próximo assunto' : 'Começar por aqui');
        area.innerHTML = `
            <button type="button" class="at-continuar" data-acao="continuar" data-materia="${esc(c.materia)}" data-assunto="${esc(c.assunto)}">
                <span class="at-continuar-rotulo">${rotulo}</span>
                <span class="at-continuar-nome">${esc(c.assunto)}</span>
                <span class="at-continuar-det">${esc(c.materia)} · ${cartoesTxt(a.cartoes.length)}</span>
            </button>`;
    }

    function desenharPlano(aprendidos) {
        const area = q('.at-plano-area');
        const plano = montarPlano({ perfil, grupos, aprendidos });
        if (!plano) {
            area.innerHTML = `<div class="at-plano"><p class="at-plano-titulo">📅 Meu plano</p>
                <p class="at-plano-texto">Diga quais dias você estuda e quanto tempo tem. O app monta a semana para você.</p>
                <button type="button" class="at-plano-btn" data-acao="configurar-plano">Montar meu plano</button></div>`;
            return;
        }
        const blocosHtml = (d) => d.blocos.length ? d.blocos.map(b => `
            <div class="at-plano-bloco"><p class="at-plano-materia">${esc(b.materia)}</p>
            ${b.assuntos.map(a => `<button type="button" class="at-plano-assunto${a.feito ? ' feito' : ''}" data-acao="assunto" data-materia="${esc(b.materia)}" data-assunto="${esc(a.assunto)}"><span aria-hidden="true">${a.feito ? '✓' : '○'}</span> ${esc(a.assunto)}</button>`).join('')}</div>`).join('')
            : '<p class="at-plano-texto">Sem assuntos novos: foque em questões e na revisão.</p>';
        const hoje = plano.dias.find(d => d.hoje);
        const tag = (d) => (plano.ciclos ? ` · ${TIPOS_DIA[d.tipo]}` : '');
        let topo;
        if (hoje && hoje.tipo === 'recuperacao') {
            const prio = typeof prioridades === 'function' ? prioridades() : [];
            const lista = prio.length
                ? `<p class="at-plano-texto">Onde focar (mais erros, e os feitos com certeza pesam mais):</p>
                   ${prio.map(p => `<p class="at-plano-dia-linha"><b>${esc(p.assunto)}</b> <span>${esc(p.materia)} · ${p.erradas} de ${p.respondidas} erradas (${p.taxa}%)${p.comCerteza ? ` · ${p.comCerteza} com certeza` : ''}</span></p>`).join('')}`
                : '<p class="at-plano-texto">Ainda não há erros suficientes para apontar um assunto. Siga pela revisão do dia.</p>';
            topo = `<p class="at-plano-titulo">📅 Hoje é dia de recuperação · ${esc(hoje.nome.toLowerCase())}</p>
                <p class="at-plano-texto">Sem assunto novo. Primeiro a revisão do dia, depois os erros da semana.</p>${lista}
                <div class="at-plano-acoes"><button type="button" class="at-plano-btn" data-acao="ir-revisao">Revisar hoje</button>
                <button type="button" class="at-plano-btn" data-acao="ir-caderno">Caderno de erros</button></div>`;
        } else if (hoje && hoje.tipo === 'comprovacao') {
            topo = `<p class="at-plano-titulo">📅 Hoje é dia de comprovação · ${esc(hoje.nome.toLowerCase())}</p>
                <p class="at-plano-texto">Faça um simulado e veja o resultado por matéria. Os erros vão para o Caderno e orientam a próxima semana.</p>
                <div class="at-plano-acoes"><button type="button" class="at-plano-btn" data-acao="ir-simulado">Fazer simulado</button></div>`;
        } else if (hoje) {
            topo = `<p class="at-plano-titulo">📅 Plano de hoje${tag(hoje)} · ${esc(hoje.nome.toLowerCase())}</p>${blocosHtml(hoje)}
                <p class="at-plano-q">🎯 <b>${hoje.questoes} questões</b> <span>(a revisão do dia entra nessa conta)</span></p>`;
        } else {
            const prox = plano.proximo || plano.dias[0];
            topo = `<p class="at-plano-titulo">📅 Hoje é dia de descanso</p>
                <p class="at-plano-texto">Seu próximo dia de estudo: <b>${esc(prox.nome.toLowerCase())}</b>${plano.proximo ? '' : ' (semana que vem)'}.</p>`;
        }
        const semana = plano.dias.map(d => `
            <div class="at-plano-dia${d.hoje ? ' hoje' : ''}"><p class="at-plano-dia-nome">${esc(d.nome)}${d.hoje ? ' · hoje' : ''} <span>${d.tipo === 'evolucao' ? `${plano.ciclos ? 'evolução · ' : ''}${d.questoes} questões` : TIPOS_DIA[d.tipo]}</span></p>
            ${d.tipo === 'recuperacao' ? '<p class="at-plano-dia-linha">Revisar hoje e Caderno de erros</p>' : d.tipo === 'comprovacao' ? '<p class="at-plano-dia-linha">Simulado e resultado por matéria</p>' : d.blocos.map(b => `<p class="at-plano-dia-linha"><b>${esc(b.materia)}</b>: ${b.assuntos.map(a => (a.feito ? '✓ ' : '') + esc(a.assunto)).join(', ')}</p>`).join('') || '<p class="at-plano-dia-linha">Questões e revisão</p>'}</div>`).join('');
        area.innerHTML = `<div class="at-plano">${topo}
            <details class="at-plano-semana"><summary>Ver a semana (${plano.dias.length} ${plano.dias.length === 1 ? 'dia' : 'dias'} · ${plano.horas} h por dia)</summary>${plano.ciclos ? '' : '<p class="at-plano-texto">Com 3 dias ou mais, o plano ganha um dia de recuperação e um de comprovação.</p>'}${semana}</details>
            <button type="button" class="at-plano-link" data-acao="configurar-plano">Ajustar dias e horas</button></div>`;
    }

    function desenharMaterias(aprendidos) {
        q('.at-materias').innerHTML = grupos.map(g => {
            const p = progressoDaMateria(g.assuntos, aprendidos);
            const ativa = g.materia === materia;
            return `<button type="button" class="at-materia${ativa ? ' ativa' : ''}" data-acao="materia" data-materia="${esc(g.materia)}" aria-current="${ativa ? 'true' : 'false'}">
                <span class="at-materia-texto">${esc(g.materia)}</span>
                ${barra(p.assuntosFeitos, p.assuntos)}
                <span class="at-materia-det">${p.assuntosFeitos} de ${p.assuntos} assuntos aprendidos</span>
            </button>`;
        }).join('');
    }

    function desenharLista(aprendidos) {
        const grupo = grupos.find(g => g.materia === materia) || grupos[0];
        const p = progressoDaMateria(grupo.assuntos, aprendidos);
        q('.at-materia-nome').textContent = grupo.materia;
        q('.at-materia-prog').textContent = `${p.assuntosFeitos} de ${p.assuntos} assuntos aprendidos`;
        const contagem = { todos: grupo.assuntos.length, novos: 0, feitos: 0 };
        grupo.assuntos.forEach(a => { contagem[estadoDe(a, aprendidos)] += 1; });
        q('.at-chips').innerHTML = FILTROS.map(([id, nome]) =>
            `<button type="button" class="at-chip${id === filtro ? ' ativo' : ''}" data-acao="filtro" data-filtro="${id}" aria-pressed="${id === filtro}">${nome} <span>${contagem[id]}</span></button>`).join('');
        const visiveis = filtrarAssuntos(grupo.assuntos, filtro, busca, aprendidos);
        q('.at-lista').innerHTML = visiveis.length ? visiveis.map(a => {
            const estado = estadoDe(a, aprendidos);
            const marca = aprendidos[`${a.materia}|${a.assunto}`];
            const detalhe = estado === 'feitos' ? `Aprendido${dataCurta(marca && marca.data) ? ' em ' + dataCurta(marca.data) : ''} · ${cartoesTxt(a.cartoes.length)}` : cartoesTxt(a.cartoes.length);
            return `<li><button type="button" class="at-assunto ${estado}" data-acao="assunto" data-materia="${esc(a.materia)}" data-assunto="${esc(a.assunto)}">
                <span class="at-assunto-icone" aria-hidden="true">${estado === 'feitos' ? '✓' : '○'}</span>
                <span class="at-assunto-texto"><span class="at-assunto-nome">${esc(a.assunto)}</span>
                <span class="at-assunto-det">${detalhe}</span></span>
            </button></li>`;
        }).join('') : `<li class="at-vazio">${busca.trim() ? 'Nenhum assunto com esse texto.' : 'Nenhum assunto neste filtro.'}</li>`;
    }

    function desenhar() {
        const aprendidos = lerAprendidos();
        el.dataset.vista = vista;
        desenharTopo(aprendidos);
        desenharPlano(aprendidos);
        desenharMaterias(aprendidos);
        desenharLista(aprendidos);
    }

    function abrirAssunto(mat, nome) {
        const a = lista.find(x => x.materia === mat && x.assunto === nome);
        if (!a) return;
        guardarUltimo(mat, nome);
        materia = mat;
        abrirLeitura(a.cartoes, {
            titulo: a.assunto,
            aoFechar: () => { if (!fechada) desenhar(); },
            aoPraticar: temQuestoes(mat, nome) && typeof aoPraticar === 'function'
                ? () => { fechar(); aoPraticar(mat, nome); }
                : undefined
        });
    }

    function agir(botao) {
        const d = botao.dataset;
        switch (d.acao) {
            case 'fechar': return fechar();
            case 'voltar': vista = 'materias'; return desenhar();
            case 'materia':
                materia = d.materia; vista = 'assuntos'; filtro = 'todos'; busca = '';
                q('.at-busca').value = '';
                desenhar();
                return q('.at-assuntos').scrollIntoView({ block: 'start' });
            case 'configurar-plano':
                fechar();
                if (typeof aoConfigurarPlano === 'function') aoConfigurarPlano();
                return;
            case 'ir-revisao': fechar(); if (typeof aoAbrirRevisao === 'function') aoAbrirRevisao(); return;
            case 'ir-caderno': fechar(); if (typeof aoAbrirCaderno === 'function') aoAbrirCaderno(); return;
            case 'ir-simulado': fechar(); if (typeof aoAbrirSimulado === 'function') aoAbrirSimulado(); return;
            case 'filtro': filtro = d.filtro; return desenharLista(lerAprendidos());
            case 'continuar':
            case 'assunto': return abrirAssunto(d.materia, d.assunto);
        }
    }

    function aoTeclar(e) {
        if (e.key !== 'Escape' || document.querySelector('.leitura')) return;
        e.preventDefault();
        if (vista === 'assuntos' && window.matchMedia('(max-width: 899px)').matches) { vista = 'materias'; desenhar(); }
        else fechar();
    }

    let fechada = false;
    function fechar() {
        if (fechada) return;
        fechada = true;
        document.removeEventListener('keydown', aoTeclar);
        el.classList.remove('visivel');
        document.body.classList.remove('modo-aprender');
        setTimeout(() => el.remove(), 180);
        if (focoAntes && typeof focoAntes.focus === 'function' && document.contains(focoAntes)) focoAntes.focus({ preventScroll: true });
    }

    el.addEventListener('click', (e) => {
        const botao = e.target.closest('[data-acao]');
        if (botao) agir(botao);
    });
    q('.at-busca').addEventListener('input', (e) => { busca = e.target.value; desenharLista(lerAprendidos()); });
    document.addEventListener('keydown', aoTeclar);

    document.body.classList.add('modo-aprender');
    document.body.appendChild(el);
    desenhar();
    requestAnimationFrame(() => el.classList.add('visivel'));
    const primeiro = q('.at-continuar') || q('.at-materia');
    if (primeiro) primeiro.focus({ preventScroll: true });
    return true;
}
