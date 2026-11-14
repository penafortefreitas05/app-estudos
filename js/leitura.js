// ============================================================
// js/leitura.js - Aprender 2.0: modo leitura (FocoPro)
// ============================================================
// Decidido em 01/11/2026 e simplificado em 05/11/2026: o Aprender é leitura pura, sem perguntas e sem
// controle por cartão. A pessoa avança e volta (← →) pelos cartões do assunto e, no último, toca em
// "Aprendi" ou "Ler novamente".
//   - Cartões: data/aprender-cartoes.json (formato em claude/aprender-2-0.md no Project).
//   - "Aprendi" é uma marca por ASSUNTO, guardada no aparelho (localStorage) com a data e um nível
//     (0 na primeira vez; sobe a cada novo "Aprendi"), pronta para um futuro lembrete de releitura.
//   - Quem usou a versão antiga ("Entendi" por cartão): se todos os cartões de um assunto estavam
//     entendidos, ele vira "Aprendi" uma única vez (migrarEntendidos).

import { abrirVideo, formatarDuracao } from './video-aprenda.js';
import { esc } from './ui.js';
import { icone } from './icones.js';

const ARQUIVO_CARTOES = './data/aprender-cartoes.json';
const CHAVE_APRENDIDOS = 'appEstudos_AprenderAprendidos';
const CHAVE_ENTENDIDOS_ANTIGO = 'appEstudos_Aprender2Entendidos';
const CHAVE_MIGRADO = 'appEstudos_AprenderMigrado1';
const NOMES_NIVEL = { 1: 'Iniciante', 2: 'Intermediário', 3: 'Avançado', 4: 'Especialista' };

// ---------- Dados ----------
let cartoesPorAssunto = null; // Map "materia|assunto" -> cartões, na ordem do arquivo

async function carregarCartoes() {
    if (cartoesPorAssunto) return cartoesPorAssunto;
    try {
        const resp = await fetch(ARQUIVO_CARTOES);
        const lista = resp.ok ? await resp.json() : [];
        const mapa = new Map();
        (Array.isArray(lista) ? lista : []).forEach(c => {
            if (!c || !c.id || !c.materia || !c.assunto) return;
            const chave = `${c.materia}|${c.assunto}`;
            if (!mapa.has(chave)) mapa.set(chave, []);
            mapa.get(chave).push(c);
        });
        cartoesPorAssunto = mapa;
    } catch (e) {
        return new Map(); // sem internet ou arquivo ausente: tenta de novo na próxima vez
    }
    return cartoesPorAssunto;
}

// Assuntos que já têm cartões novos: [{ materia, assunto, cartoes }]
export async function assuntosComCartoes() {
    const mapa = await carregarCartoes();
    return [...mapa.values()].map(cartoes => ({ materia: cartoes[0].materia, assunto: cartoes[0].assunto, cartoes }));
}

// ---------- "Aprendi" por assunto, guardado no aparelho ----------
const chaveAssunto = (materia, assunto) => `${materia}|${assunto}`;
const hojeLocal = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// { "materia|assunto": { data: "AAAA-MM-DD", nivel: 0 } }
export function lerAprendidos() {
    try {
        const v = JSON.parse(localStorage.getItem(CHAVE_APRENDIDOS) || '{}');
        return v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    } catch (e) {
        return {};
    }
}

function gravarAprendidos(v) {
    try { localStorage.setItem(CHAVE_APRENDIDOS, JSON.stringify(v)); } catch (e) { /* segue sem guardar */ }
}

// Backup das marcas "Aprendi": arquivo { tipo, versao, exportadoEm, aprendidos }.
export function montarBackupAprendidos(hoje = hojeLocal()) {
    return { tipo: 'focopro-aprendidos', versao: 1, exportadoEm: hoje, aprendidos: lerAprendidos() };
}

// Junta o arquivo com o que já existe no aparelho: fica a marca de data mais recente de cada assunto.
// Devolve { ok, novos, atualizados, ignorados } ou { ok:false, erro }.
export function mesclarBackupAprendidos(arquivo) {
    const origem = arquivo && arquivo.tipo === 'focopro-aprendidos' ? arquivo.aprendidos : null;
    if (!origem || typeof origem !== 'object' || Array.isArray(origem)) return { ok: false, erro: 'Esse arquivo não é um backup do Aprender.' };
    const atual = lerAprendidos();
    let novos = 0, atualizados = 0, ignorados = 0;
    for (const [k, v] of Object.entries(origem)) {
        const valido = k.includes('|') && v && /^\d{4}-\d{2}-\d{2}$/.test(String(v.data));
        if (!valido) { ignorados++; continue; }
        const nivel = Math.max(0, Math.min(Number(v.nivel) || 0, 4));
        if (!atual[k]) { atual[k] = { data: v.data, nivel }; novos++; }
        else if (v.data > atual[k].data || (v.data === atual[k].data && nivel > (Number(atual[k].nivel) || 0))) { atual[k] = { data: v.data, nivel }; atualizados++; }
    }
    gravarAprendidos(atual);
    return { ok: true, novos, atualizados, ignorados };
}

export function marcarAprendi(materia, assunto, hoje = hojeLocal()) {
    const v = lerAprendidos();
    const k = chaveAssunto(materia, assunto);
    v[k] = { data: hoje, nivel: v[k] ? Math.min((Number(v[k].nivel) || 0) + 1, 4) : 0 };
    gravarAprendidos(v);
    return v[k];
}

export function assuntoAprendido(materia, assunto, aprendidos = lerAprendidos()) {
    return Boolean(aprendidos[chaveAssunto(materia, assunto)]);
}

// Converte o "Entendi" por cartão da versão antiga: assunto com todos os cartões entendidos vira "Aprendi".
// Roda uma vez por aparelho. `lista` = [{ materia, assunto, cartoes }].
export function migrarEntendidos(lista) {
    try {
        if (localStorage.getItem(CHAVE_MIGRADO)) return;
        const antigo = JSON.parse(localStorage.getItem(CHAVE_ENTENDIDOS_ANTIGO) || '{}') || {};
        const v = lerAprendidos();
        lista.forEach(a => {
            const k = chaveAssunto(a.materia, a.assunto);
            if (v[k] || !a.cartoes.every(c => antigo[c.id])) return;
            const datas = a.cartoes.map(c => String(antigo[c.id])).sort();
            v[k] = { data: datas[datas.length - 1], nivel: 0 };
        });
        gravarAprendidos(v);
        localStorage.setItem(CHAVE_MIGRADO, '1');
    } catch (e) { /* segue sem migrar */ }
}

// ---------- Navegação (regras puras, testáveis sem tela) ----------
export function novaSessao(total) {
    return { indice: 0, total };
}

// 'proximo' e 'anterior' andam um cartão; passar do último leva à tela final (indice === total)
export function navegar(sessao, acao) {
    if (acao === 'proximo') return { ...sessao, indice: Math.min(sessao.indice + 1, sessao.total) };
    if (acao === 'anterior') return { ...sessao, indice: Math.max(sessao.indice - 1, 0) };
    return sessao;
}

// ---------- Tela ----------
// Separa o exemplo do resumo ("... Exemplo: ..." ou "... Ex.: ...") para dar destaque à frase central
function dividirExemplo(texto) {
    const t = String(texto || '');
    const m = t.match(/\s(Exemplo:|Ex\.:)/);
    return m ? [t.slice(0, m.index), t.slice(m.index + 1)] : [t, ''];
}

// Modelo "direto ao ponto" v2 (13/11/2026): cor por papel, não por assunto.
// azul = o conceito do cartão; laranja = o vizinho que se confunde; âmbar = "Na prova"; lilás = exemplo.
// A cor nunca é a única pista: a sigla vem em negrito e cada bloco tem rótulo.
// Tudo sai dos campos que já existem (sem campo novo): a sigla vem do "(SIGLA)" do termo em inglês.
function separarSigla(texto) {
    const t = String(texto || '').trim();
    const m = t.match(/^(.*?)\s*\(([^()]+)\)\s*$/);
    return m ? { nome: m[1].trim(), parenteses: m[2].trim() } : { nome: t, parenteses: '' };
}
const ehSigla = s => /^[A-Z0-9][A-Za-z0-9./-]{1,11}$/.test(s) && /[A-Z]{2}/.test(s);

function palavras(t) { return new Set((String(t || '').toLowerCase().match(/[a-zà-ú0-9]{4,}/g) || [])); }
function repete(a, b) {
    const A = palavras(a), B = palavras(b);
    if (!A.size) return true;
    let comum = 0; A.forEach(w => { if (B.has(w)) comum++; });
    return comum / A.size >= 0.5;
}
// Destaca a sigla do conceito (azul) na frase, só a primeira vez
function marcarSigla(textoEsc, sigla, classe) {
    if (!sigla) return textoEsc;
    const re = new RegExp(`(^|[^A-Za-z0-9])(${sigla.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?![A-Za-z0-9])`);
    return textoEsc.replace(re, `$1<b class="${classe}">$2</b>`);
}
// "DHCP entrega…" depois do rótulo DHCP: tira a sigla repetida do começo da frase
function semSiglaInicial(texto, conceito) {
    const { nome, parenteses } = separarSigla(conceito);
    const sig = ehSigla(nome) ? nome : (ehSigla(parenteses) ? parenteses : '');
    if (!sig) return texto;
    if (new RegExp(`^(o |a )?${sig}\\s*\\(`, 'i').test(String(texto))) return texto;
    const t = String(texto).replace(new RegExp(`^(o |a )?${sig}\\s+`, 'i'), '');
    return t.charAt(0).toUpperCase() + t.slice(1);
}
function rotuloVizinho(conceito) {
    const { nome, parenteses } = separarSigla(conceito);
    if (parenteses && ehSigla(nome)) return `<b class="lv-viz">${esc(nome)}</b> <small class="lv-extenso">${esc(parenteses)}</small>`;
    if (parenteses && ehSigla(parenteses)) return `<b class="lv-viz">${esc(parenteses)}</b> <small class="lv-extenso">${esc(nome)}</small>`;
    if (/^erro comum$/i.test(nome)) return '';
    return `<b class="lv-viz">${esc(nome)}</b>`;
}

function cartaoHTML(c) {
    const [central, exemplo] = dividirExemplo(c.resumo);
    const pares = Array.isArray(c.nao_confundir) ? c.nao_confundir.filter(p => p && p.conceito) : [];
    const ingles = separarSigla(c.termo_ingles);
    const doConceito = separarSigla(c.conceito);
    const sigla = ehSigla(ingles.parenteses) ? ingles.parenteses : (ehSigla(doConceito.parenteses) ? doConceito.parenteses : '');
    let nomeConceito = (!ehSigla(ingles.parenteses) && sigla) ? doConceito.nome : String(c.conceito);
    if (sigla) nomeConceito = nomeConceito.replace(new RegExp(`^${sigla}\\s*[:–-]\\s*`), '');
    const comparacao = /\s×\s/.test(c.conceito || '');
    let titulo;
    if (comparacao) {
        const [a, b] = String(c.conceito).split(/\s×\s/);
        titulo = `<span class="lv-conc">${esc(a)}</span> <span class="lv-x">×</span> <span class="lv-viz">${esc(b)}</span>`;
    } else if (sigla) {
        titulo = `<span class="lv-conc">${esc(sigla)}</span> <small class="lv-extenso">${esc(nomeConceito)}</small>`;
    } else {
        titulo = esc(c.conceito);
    }
    const nomeEn = (sigla && !comparacao) ? ingles.nome : String(c.termo_ingles || '').trim();
    const traducao = String(c.traducao || '').trim();
    const mostrarTraducao = traducao && !repete(traducao, c.resumo);
    const linhaNC = p => {
        const dif = String(p.diferenca || '');
        const partes = dif.split(/;\s*/);
        // Sala Design (13/11): o lado do próprio conceito já está no resumo; mostra só o vizinho
        if (partes.length === 2 && sigla && new RegExp(`\\b${sigla}\\b`).test(partes[0]) && !new RegExp(`\\b${sigla}\\b`).test(partes[1])) {
            return `<li class="lv-par lv-par-viz">${rotuloVizinho(p.conceito)}<span>${esc(semSiglaInicial(partes[1], p.conceito))}</span></li>`;
        }
        return `<li class="lv-par lv-par-viz">${rotuloVizinho(p.conceito)}<span>${esc(dif)}</span></li>`;
    };
    return `
        <article class="leitura-cartao v2">
            <p class="leitura-meta">${esc(c.materia)} · ${esc(NOMES_NIVEL[c.nivel] || 'Iniciante')}</p>
            <h3 class="leitura-conceito" tabindex="-1">${titulo}</h3>
            ${nomeEn ? `<p class="leitura-termo"><span class="leitura-en">EN</span><span lang="en">${esc(nomeEn)}</span>${mostrarTraducao ? `<span class="leitura-traducao">→ ${esc(traducao)}</span>` : ''}</p>` : (mostrarTraducao ? `<p class="leitura-termo"><span class="leitura-traducao">${esc(traducao)}</span></p>` : '')}
            <p class="leitura-resumo">${comparacao
                ? marcarSigla(marcarSigla(esc(central), String(c.conceito).split(/\s×\s/)[0].trim(), 'lv-conc'), String(c.conceito).split(/\s×\s/)[1].trim(), 'lv-viz')
                : marcarSigla(esc(central), sigla, 'lv-conc')}</p>
            ${exemplo ? `<p class="leitura-exemplo">${esc(exemplo)}</p>` : ''}
            ${pares.length ? `<section class="leitura-bloco"><h4>${icone("ciclo")}${pares.every(p => /^erro comum$/i.test(String(p.conceito).trim())) ? 'Erro comum' : 'Não confundir'}</h4><ul class="lv-pares">${pares.map(linhaNC).join('')}</ul></section>` : ''}
            ${c.atencao ? `<section class="leitura-bloco atencao"><h4>${icone("alvo")}Na prova</h4><p>${esc(c.atencao)}</p></section>` : ''}
            ${fonteHTML(c.fonte)}
        </article>`;
}

// Fontes: o texto do cartão traz título e endereço de cada fonte, separados por " ; ". Na leitura ficam recolhidas
// ("Ver fonte"), cada uma com o título e um link curto, para não ocupar a tela nem estourar a largura (05/11/2026).
export function fonteHTML(fonte) {
    const partes = String(fonte || '').split(/\s;\s/).map(p => p.trim()).filter(Boolean);
    if (!partes.length) return '';
    const itens = partes.map(p => {
        const m = p.match(/https?:\/\/\S+/);
        const titulo = (m ? p.replace(m[0], '') : p).replace(/\s*[—-]\s*$/, '').trim();
        const link = m ? ` <a href="${esc(m[0])}" target="_blank" rel="noopener noreferrer">abrir</a>` : '';
        return `<li>${esc(titulo)}${link}</li>`;
    }).join('');
    return `<details class="leitura-fonte"><summary>Ver fonte${partes.length > 1 ? 's' : ''}</summary><ul>${itens}</ul></details>`;
}

// Abre a leitura de um assunto. Só um por vez.
// aoPraticar (opcional): se vier, a tela final ganha o botão "Praticar" (atalho para as questões do assunto
// no Testar). Quem chama decide se há questões; sem a função, o botão não aparece.
// aoAprender (opcional): chamado depois de marcar "Aprendi".
// nivelPraticar (opcional): nome do nível que o Praticar abre, para o texto não prometer o nível errado.
// avisoSemQuestoes (opcional): sem aoPraticar, frase que explica por que não há o que praticar.
// videos (opcional): vídeos "Aprenda em 1 min" do assunto (data/videos.json); cada um ganha um botão no topo da leitura.
export function abrirLeitura(cartoes, { titulo, aoFechar, aoPraticar, aoAprender, nivelPraticar, avisoSemQuestoes, videos = [] } = {}) {
    if (!Array.isArray(cartoes) || !cartoes.length || document.querySelector('.leitura')) return;
    const assunto = titulo || cartoes[0].assunto;
    const materia = cartoes[0].materia;
    let sessao = novaSessao(cartoes.length);
    const jaEraAprender = document.body.classList.contains('modo-aprender');
    const focoAntes = document.activeElement;

    const el = document.createElement('div');
    el.className = 'leitura';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-labelledby', 'leitura-titulo');
    el.innerHTML = `
        <header class="leitura-topo">
            <div>
                <p class="leitura-faixa">${icone("livro")}Aprender · leitura</p>
                <h2 id="leitura-titulo" class="leitura-titulo">${esc(assunto)}</h2>
            </div>
            <button type="button" class="leitura-sair" data-acao="fechar" aria-label="Sair da leitura">${icone("fechar")}</button>
        </header>
        ${videos.length ? `<div class="leitura-videos">${videos.map((v, i) => `<button type="button" class="leitura-video" data-acao="video" data-i="${i}">${icone("play")}${esc(v.titulo)} <span>${formatarDuracao(v.duracao)}</span></button>`).join('')}</div>` : ''}
        <div class="leitura-bolas" aria-hidden="true"></div>
        <p class="leitura-contagem" aria-live="polite"></p>
        <div class="leitura-corpo"></div>
        <div class="leitura-acoes"></div>
        <p class="leitura-atalhos">Teclado: ← anterior · → próximo · Esc = sair</p>`;
    const bolas = el.querySelector('.leitura-bolas');
    const contagem = el.querySelector('.leitura-contagem');
    const corpo = el.querySelector('.leitura-corpo');
    const acoes = el.querySelector('.leitura-acoes');
    const naFinal = () => sessao.indice >= cartoes.length;

    function desenhar() {
        bolas.innerHTML = cartoes.map((c, i) => `<i class="leitura-bola${i < sessao.indice ? ' feita' : ''}${i === sessao.indice ? ' atual' : ''}"></i>`).join('');
        if (naFinal()) {
            contagem.textContent = `${cartoes.length} de ${cartoes.length} cartões lidos`;
            corpo.innerHTML = `
                <div class="leitura-fim">
                    <p class="leitura-fim-icone" aria-hidden="true">${icone("feito")}</p>
                    <h3 class="leitura-conceito" tabindex="-1">Você leu os ${cartoes.length} cartões</h3>
                    <p>${esc(assunto)}</p>
                    <p class="leitura-fim-dica">${typeof aoPraticar === 'function'
                        ? `"Aprendi" marca o assunto e já abre as questões dele (nível ${esc(nivelPraticar || 'Iniciante')}). "Praticar" abre as questões sem marcar.`
                        : 'Toque em "Aprendi" para marcar o assunto como aprendido.'}</p>
                    ${typeof aoPraticar !== 'function' && avisoSemQuestoes ? `<p class="leitura-fim-dica leitura-sem-questoes">${esc(avisoSemQuestoes)}</p>` : ''}
                </div>`;
            acoes.innerHTML = `
                <button type="button" class="leitura-btn ainda" data-acao="denovo">Ler novamente</button>
                <button type="button" class="leitura-btn entendi" data-acao="aprendi">${typeof aoPraticar === 'function' ? 'Aprendi ✓ e praticar →' : 'Aprendi ✓'}</button>
                ${typeof aoPraticar === 'function' ? '<button type="button" class="leitura-btn praticar" data-acao="praticar">Praticar →</button>' : ''}`;
        } else {
            contagem.textContent = `${sessao.indice + 1} de ${cartoes.length}`;
            corpo.innerHTML = cartaoHTML(cartoes[sessao.indice]);
            acoes.innerHTML = `
                <button type="button" class="leitura-btn ainda" data-acao="anterior"${sessao.indice === 0 ? ' disabled' : ''}>← Anterior</button>
                <button type="button" class="leitura-btn entendi" data-acao="proximo">${sessao.indice === cartoes.length - 1 ? 'Concluir' : 'Próximo →'}</button>`;
        }
        corpo.scrollTop = 0;
        requestAnimationFrame(() => { corpo.scrollTop = 0; }); // celular: garante o topo depois do layout
        const tituloCartao = corpo.querySelector('.leitura-conceito');
        if (tituloCartao) tituloCartao.focus({ preventScroll: true });
    }

    function agir(acao, botao) {
        if (acao === 'fechar') return fechar();
        if (acao === 'video') {
            const v = videos[Number(botao && botao.dataset.i)];
            // "Praticar" do vídeo faz o mesmo que o da leitura (sem marcar "Aprendi"): fecha a leitura e abre as questões
            return abrirVideo(v, { aoPraticar: typeof aoPraticar === 'function' ? () => { fechar(); aoPraticar(); } : undefined, nivelPraticar });
        }
        if (acao === 'aprendi') {
            if (!naFinal()) return;
            marcarAprendi(materia, assunto);
            fechar();
            if (typeof aoAprender === 'function') aoAprender();
            // Marcou "Aprendi": segue direto para as questões do assunto (antes voltava à tela inicial)
            if (typeof aoPraticar === 'function') return aoPraticar();
            return;
        }
        if (acao === 'praticar') {
            // só vale na tela final: fecha a leitura e deixa o app abrir as questões (não marca "Aprendi")
            if (!naFinal() || typeof aoPraticar !== 'function') return;
            fechar();
            return aoPraticar();
        }
        if (acao === 'denovo') { sessao = novaSessao(cartoes.length); return desenhar(); }
        if (acao === 'proximo' || acao === 'anterior') {
            if (naFinal() && acao === 'proximo') return;
            sessao = navegar(sessao, acao);
            desenhar();
        }
    }

    // Captura: os atalhos do app (busca "/", letras do Modo Foco) não podem agir por trás da leitura
    function aoTeclar(e) {
        if (document.querySelector('.video-tela')) return; // o vídeo aberto por cima cuida do teclado
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'Tab') {
            const focaveis = [...el.querySelectorAll('button:not([disabled]), summary, a[href]')];
            if (!focaveis.length) return;
            const primeiro = focaveis[0], ultimo = focaveis[focaveis.length - 1];
            if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
            else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
            else if (!el.contains(document.activeElement)) { e.preventDefault(); primeiro.focus(); }
            return;
        }
        e.stopPropagation();
        if (e.key === 'Escape') { e.preventDefault(); agir('fechar'); }
        else if (e.key === 'ArrowRight' && !naFinal()) { e.preventDefault(); agir('proximo'); }
        else if (e.key === 'ArrowLeft' && sessao.indice > 0) { e.preventDefault(); agir('anterior'); }
    }

    let fechada = false;
    function fechar() {
        if (fechada) return;
        fechada = true;
        document.removeEventListener('keydown', aoTeclar, true);
        el.classList.remove('visivel');
        if (!jaEraAprender) document.body.classList.remove('modo-aprender');
        setTimeout(() => el.remove(), 180);
        if (focoAntes && typeof focoAntes.focus === 'function' && document.contains(focoAntes)) focoAntes.focus({ preventScroll: true });
        if (typeof aoFechar === 'function') aoFechar();
    }

    el.addEventListener('click', (e) => {
        const botao = e.target.closest('[data-acao]');
        if (botao && !botao.disabled) agir(botao.dataset.acao, botao);
    });
    document.addEventListener('keydown', aoTeclar, true);
    document.body.classList.add('modo-aprender');
    document.body.appendChild(el);
    desenhar();
    requestAnimationFrame(() => el.classList.add('visivel'));
}
