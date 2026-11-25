// Laboratório FocoPro: bancada de rede em tela cheia (fase 1, 25/11/2026). Feita para o computador.
// Esquerda: paleta de aparelhos. Centro: área de montagem (SVG). Direita: configuração + terminal.
// Modo simulação: depois de um comando, o pacote anda pelos cabos, evento por evento.
import { esc } from '../ui.js';
import * as M from './motor.js';
import { calcular, prefixoDaMascara, ipParaNumero } from './ipv4.js';

const CHAVE_ATUAL = 'focopro_lab_atual';
const CHAVE_PROJETOS = 'focopro_lab_projetos';
const ICONE = { pc: '🖥️', notebook: '💻', servidor: '🗄️', impressora: '🖨️', switch: '🔀', roteador: '📡' };
const W = 104, H = 64; // tamanho do aparelho na área de montagem

const ler = (k, padrao) => { try { const v = JSON.parse(localStorage.getItem(k) || 'null'); return v == null ? padrao : v; } catch (e) { return padrao; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sem armazenamento: segue */ } };

function lerMascara(txt) {
    const t = String(txt || '').trim();
    if (/^\/?\d{1,2}$/.test(t)) { const p = Number(t.replace('/', '')); return p >= 0 && p <= 32 ? p : null; }
    return prefixoDaMascara(t);
}

// Exemplo pronto: o escritório da Ana (mesmo cenário do Projeto 1)
function exemploEscritorio() {
    const r = M.novaRede();
    const sw = M.adicionarAparelho(r, 'switch', 420, 220); sw.nome = 'SW-Escritorio';
    const ps = [[180, 90, 'PC1', '192.168.10.11'], [180, 220, 'PC2', '192.168.10.12'], [180, 350, 'PC3', '192.168.10.13']].map(([x, y, n, ip], i) => {
        const p = M.adicionarAparelho(r, 'pc', x, y); p.nome = n; p.portas[0].ip = ip; M.ligar(r, p.id, 'Fa0', sw.id, `Fa0/${i + 1}`); return p;
    });
    const imp = M.adicionarAparelho(r, 'impressora', 660, 220); imp.nome = 'Impressora'; imp.portas[0].ip = '192.168.10.20';
    M.ligar(r, imp.id, 'Fa0', sw.id, 'Fa0/4');
    return { nome: 'Escritório da Ana', rede: r, sel: ps[0].id };
}

export function abrirBancada() {
    if (document.querySelector('.bancada')) return;
    const salvo = ler(CHAVE_ATUAL, null);
    let projeto = salvo && salvo.rede ? { nome: salvo.nome || 'Sem nome', rede: M.carregar(salvo.rede) } : exemploEscritorio();
    let est = M.novoEstado();
    let sel = projeto.sel || null, caboSel = null;
    let modo = 'tempo-real';
    let ferramenta = null; // null | { tipo: 'cabo', a?: {id, porta} }
    const terminais = {}; // id → linhas
    let simulacao = { eventos: [], i: -1, rodando: false };

    const el = document.createElement('div');
    el.className = 'bancada';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Laboratório: bancada de rede');
    el.innerHTML = `
        <header class="bc-topo">
            <div class="bc-titulo"><span class="bc-faixa">Laboratório</span><input class="bc-nome" aria-label="Nome do projeto" value=""></div>
            <div class="bc-barra">
                <button type="button" data-acao="novo">Novo</button>
                <button type="button" data-acao="exemplo">Exemplo: escritório</button>
                <button type="button" data-acao="salvar">Salvar</button>
                <button type="button" data-acao="abrir-lista">Abrir…</button>
                <span class="bc-sep"></span>
                <button type="button" data-acao="cabo" class="bc-cabo">🔌 Cabo</button>
                <span class="bc-sep"></span>
                <div class="bc-modo" role="group" aria-label="Modo"><button type="button" data-modo="tempo-real">Tempo real</button><button type="button" data-modo="simulacao">Simulação</button></div>
            </div>
            <button type="button" class="bc-sair" data-acao="fechar" aria-label="Sair do laboratório">✕</button>
        </header>
        <div class="bc-corpo">
            <aside class="bc-paleta" aria-label="Aparelhos">
                <p class="bc-rot">Aparelhos</p>
                ${Object.entries(M.TIPOS).map(([k, t]) => `<button type="button" class="bc-item" data-novo="${k}"><span>${ICONE[k]}</span>${esc(t.nome)}</button>`).join('')}
                <p class="bc-dica">Clique para pôr na bancada; arraste para mover. Use 🔌 Cabo para ligar porta a porta.</p>
            </aside>
            <section class="bc-area">
                <p class="bc-status" aria-live="polite"></p>
                <svg class="bc-svg" role="application" aria-label="Área de montagem"></svg>
                <div class="bc-portas" hidden></div>
                <div class="bc-sim" hidden></div>
            </section>
            <aside class="bc-lado">
                <div class="bc-config"></div>
                <div class="bc-term" hidden>
                    <p class="bc-rot bc-term-tit"></p>
                    <pre class="bc-saida" aria-live="polite"></pre>
                    <form class="bc-linha"><span class="bc-prompt"></span><input class="bc-cmd" autocomplete="off" spellcheck="false" aria-label="Comando"></form>
                </div>
            </aside>
        </div>
        <div class="bc-dialogo" hidden></div>
        <div class="bc-pequena"><p><b>O Laboratório foi feito para o computador.</b> Na tela do celular a bancada fica apertada.</p><button type="button" data-acao="mesmo-assim">Abrir mesmo assim</button> <button type="button" data-acao="fechar">Voltar</button></div>`;
    document.body.appendChild(el);
    document.body.classList.add('modo-bancada');
    const $ = s => el.querySelector(s);
    const svg = $('.bc-svg');

    const salvarAtual = () => gravar(CHAVE_ATUAL, { nome: projeto.nome, rede: M.serializar(projeto.rede), sel });
    const status = (txt) => { $('.bc-status').textContent = txt || ''; };
    const ap = id => M.aparelho(projeto.rede, id);
    const centro = a => ({ x: a.x + W / 2, y: a.y + H / 2 });

    // ---------- desenho da área ----------
    function desenharArea() {
        const r = projeto.rede;
        const caboSvg = r.cabos.map((c, i) => {
            const A = ap(c.a.id), B = ap(c.b.id); if (!A || !B) return '';
            const a = centro(A), b = centro(B);
            const pa = M.porta(A, c.a.porta), pb = M.porta(B, c.b.porta);
            const ativo = pa.ligada && pb.ligada;
            const ponto = (p, q, t) => ({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
            const la = ponto(a, b, 0.28), lb = ponto(a, b, 0.72);
            return `<g class="bc-cabo-g ${caboSel === i ? 'sel' : ''}" data-cabo="${i}">
                <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="bc-fio ${c.tipo}"/>
                <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="bc-fio-toque"/>
                <circle cx="${la.x}" cy="${la.y}" r="5" class="bc-luz ${ativo ? 'on' : 'off'}"/><circle cx="${lb.x}" cy="${lb.y}" r="5" class="bc-luz ${ativo ? 'on' : 'off'}"/>
                <text x="${la.x}" y="${la.y - 9}" class="bc-porta-rot">${esc(c.a.porta)}</text><text x="${lb.x}" y="${lb.y - 9}" class="bc-porta-rot">${esc(c.b.porta)}</text></g>`;
        }).join('');
        const apSvg = r.aparelhos.map(a => {
            const ip = a.portas.filter(p => p.ip).map(p => p.ip)[0] || '';
            const origem = ferramenta && ferramenta.a && ferramenta.a.id === a.id;
            return `<g class="bc-ap ${sel === a.id ? 'sel' : ''} ${origem ? 'origem' : ''}" data-ap="${a.id}" transform="translate(${a.x},${a.y})">
                <rect width="${W}" height="${H}" rx="10" class="bc-ap-caixa ${a.tipo}"/>
                <text x="${W / 2}" y="30" class="bc-ap-ic">${ICONE[a.tipo]}</text>
                <text x="${W / 2}" y="52" class="bc-ap-nome">${esc(a.nome)}</text>
                ${ip ? `<text x="${W / 2}" y="${H + 16}" class="bc-ap-ip">${esc(ip)}${M.TIPOS[a.tipo].host ? '' : ' …'}</text>` : ''}</g>`;
        }).join('');
        svg.innerHTML = `<g class="bc-cabos">${caboSvg}</g><g class="bc-aps">${apSvg}</g><g class="bc-pacotes"></g>`;
        if (!r.aparelhos.length) svg.innerHTML += `<text x="50%" y="45%" class="bc-vazio">Bancada vazia: escolha um aparelho à esquerda ou abra o exemplo.</text>`;
    }

    // ---------- painel de configuração ----------
    function desenharConfig() {
        const box = $('.bc-config');
        if (caboSel !== null && projeto.rede.cabos[caboSel]) {
            const c = projeto.rede.cabos[caboSel], A = ap(c.a.id), B = ap(c.b.id);
            box.innerHTML = `<p class="bc-rot">Cabo</p><p><b>${esc(A.nome)}</b> ${esc(c.a.porta)} ↔ <b>${esc(B.nome)}</b> ${esc(c.b.porta)}</p>
                <p class="bc-nota">Tipo: <b>${c.tipo === 'direto' ? 'direto (straight-through)' : 'cruzado (crossover)'}</b>. ${c.tipo === 'direto' ? 'Liga aparelhos de tipos diferentes, como PC e switch.' : 'Liga aparelhos do mesmo tipo, como switch e switch ou PC e PC. (Switches atuais costumam detectar isso sozinhos: auto-MDIX.)'}</p>
                <button type="button" class="bc-perigo" data-acao="remover-cabo">Remover cabo</button>`;
            $('.bc-term').hidden = true; return;
        }
        const a = sel && ap(sel);
        if (!a) { box.innerHTML = `<p class="bc-rot">Nada selecionado</p><p class="bc-nota">Clique num aparelho para configurar e abrir o terminal dele.</p>`; $('.bc-term').hidden = true; return; }
        const t = M.TIPOS[a.tipo];
        const linhaPorta = p => {
            const cabo = M.caboDa(projeto.rede, a.id, p.nome);
            const viz = cabo ? ap(cabo.a.id === a.id && cabo.a.porta === p.nome ? cabo.b.id : cabo.a.id) : null;
            const calc = p.ip ? calcular(p.ip, p.prefixo) : null;
            const ipConf = t.host || t.roteia;
            return `<div class="bc-porta" data-porta="${esc(p.nome)}">
                <div class="bc-porta-cab"><b>${esc(p.nome)}</b><span class="bc-nota">${viz ? '↔ ' + esc(viz.nome) : 'sem cabo'}</span>
                    <label class="bc-liga"><input type="checkbox" data-campo="ligada" ${p.ligada ? 'checked' : ''}> ${p.ligada ? 'ligada' : 'desligada (shutdown)'}</label></div>
                ${ipConf ? `<div class="bc-campos"><label>IP<input data-campo="ip" value="${esc(p.ip)}" placeholder="192.168.1.10"></label>
                    <label>Máscara<input data-campo="mascara" value="${p.ip ? esc(calc && !calc.erro ? calc.mascara : '') : ''}" placeholder="255.255.255.0 ou /24"></label></div>
                    ${calc && !calc.erro ? `<p class="bc-nota">Rede ${esc(calc.rede)}/${p.prefixo} · broadcast ${esc(calc.broadcast)} · ${calc.hosts} hosts${calc.eRede || calc.eBroadcast ? ' · <b class="bc-ruim">esse IP é o endereço de rede/broadcast: não serve para aparelho</b>' : ''}</p>` : ''}` : `<p class="bc-nota">MAC ${esc(p.mac)}</p>`}
            </div>`;
        };
        const portas = t.host ? a.portas : a.portas.filter(p => t.roteia || M.caboDa(projeto.rede, a.id, p.nome) || a.portas.indexOf(p) < 4);
        box.innerHTML = `<p class="bc-rot">${ICONE[a.tipo]} ${esc(t.nome)}</p>
            <label class="bc-nome-ap">Nome<input data-campo="nome" value="${esc(a.nome)}"></label>
            ${t.host ? `<label class="bc-nome-ap">Gateway padrão<input data-campo="gateway" value="${esc(a.gateway || '')}" placeholder="vazio = sem gateway"></label>` : ''}
            ${portas.map(linhaPorta).join('')}
            ${a.tipo === 'switch' ? `<p class="bc-nota">Switch não precisa de IP para encaminhar: ele aprende sozinho em que porta está cada MAC.</p>` : ''}
            ${t.roteia ? `<p class="bc-rot">Rotas estáticas</p>
                ${(a.rotas || []).map((r, i) => `<p class="bc-rota">${esc(r.rede)}/${r.prefixo} via ${esc(r.proximo)} ${r.prefixo === 0 ? '<span class="bc-nota">(rota padrão)</span>' : ''} <button type="button" data-acao="tirar-rota" data-i="${i}" aria-label="Remover rota">✕</button></p>`).join('') || '<p class="bc-nota">Nenhuma. O roteador já conhece as redes ligadas às suas portas.</p>'}
                <form class="bc-nova-rota"><input name="rede" placeholder="rede (10.0.0.0)"><input name="mascara" placeholder="máscara (/8)"><input name="proximo" placeholder="próximo salto"><button>+ rota</button></form>` : ''}
            <button type="button" class="bc-perigo" data-acao="excluir">Excluir ${esc(a.nome)}</button>`;
        const term = $('.bc-term');
        term.hidden = false;
        $('.bc-term-tit').textContent = `Terminal · ${a.nome}`;
        $('.bc-prompt').textContent = a.tipo === 'switch' || a.tipo === 'roteador' ? `${a.nome}#` : `C:\\>`;
        if (!terminais[a.id]) terminais[a.id] = [a.tipo === 'switch' ? 'Comandos: show mac address-table, clear' : a.tipo === 'roteador' ? 'Comandos: ping, show ip route, show ip interface brief, show arp, clear' : 'Comandos: ping, ipconfig, arp -a, tracert, cls, help'];
        desenharTerminal();
    }
    function desenharTerminal() {
        const s = $('.bc-saida'); const linhas = terminais[sel] || [];
        s.innerHTML = linhas.map(l => typeof l === 'string' ? esc(l) : `<span class="bc-exp ${l.tipo}">${esc(l.texto)}</span>`).join('\n');
        s.scrollTop = s.scrollHeight;
    }

    function desenharTudo() {
        $('.bc-nome').value = projeto.nome;
        el.querySelectorAll('[data-modo]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.modo === modo)));
        $('.bc-cabo').setAttribute('aria-pressed', String(!!ferramenta));
        desenharArea(); desenharConfig(); salvarAtual();
    }

    // ---------- comandos ----------
    function executar(cmdTxt) {
        const a = ap(sel); if (!a) return;
        const out = terminais[a.id] || (terminais[a.id] = []);
        const prompt = $('.bc-prompt').textContent;
        out.push(`${prompt}${cmdTxt}`);
        const [cmd, ...args] = cmdTxt.trim().split(/\s+/); const c = (cmd || '').toLowerCase(); const resto = args.join(' ').toLowerCase();
        let eventos = null;
        if (c === 'cls' || c === 'clear') { terminais[a.id] = []; desenharTerminal(); return; }
        if (c === 'help' || c === '?') out.push('ping <ip> · ipconfig · arp -a · tracert <ip> · cls');
        else if (c === 'ping' && args[0]) {
            const r = M.ping(projeto.rede, est, a.id, args[0]);
            out.push(...r.linhas);
            if (r.explicacao) out.push({ tipo: r.ok === 4 ? 'ok' : 'ruim', texto: `Por quê: ${r.explicacao}` });
            (r.avisos || []).forEach(x => out.push({ tipo: 'aviso', texto: `⚠ ${x}` }));
            eventos = r.tentativas && r.tentativas[0] && r.tentativas[0].eventos; // 1ª tentativa: ARP + um eco, como no Packet Tracer
        } else if (c === 'tracert' && args[0]) { const r = M.tracert(projeto.rede, est, a.id, args[0]); out.push(...r.linhas); eventos = r.eventos; }
        else if (c === 'ipconfig') out.push(...M.ipconfig(projeto.rede, a.id));
        else if (c === 'arp' && resto === '-a' || c === 'show' && resto === 'arp') out.push(...M.arpA(est, projeto.rede, a.id));
        else if (c === 'show' && /^mac/.test(resto)) out.push(...M.tabelaMac(est, projeto.rede, a.id));
        else if (c === 'show' && resto === 'ip route') {
            const linhas = ['Codes: C - connected, S - static, S* - default', ''];
            a.portas.filter(p => p.ip && p.ligada).forEach(p => { const k = calcular(p.ip, p.prefixo); linhas.push(`C    ${k.rede}/${p.prefixo} is directly connected, ${p.nome}`); });
            (a.rotas || []).forEach(r => linhas.push(`${r.prefixo === 0 ? 'S*' : 'S '}   ${r.rede}/${r.prefixo} [1/0] via ${r.proximo}`));
            out.push(...linhas);
        } else if (c === 'show' && resto === 'ip interface brief') {
            out.push('Interface    IP-Address       Status');
            a.portas.forEach(p => out.push(`${p.nome.padEnd(13)}${(p.ip || 'unassigned').padEnd(17)}${p.ligada ? 'up' : 'administratively down'}`));
        } else out.push(`'${cmdTxt}' não é um comando conhecido aqui. Digite help.`);
        out.push('');
        desenharTerminal();
        if (eventos && eventos.length && modo === 'simulacao') prepararSimulacao(eventos);
    }

    // ---------- modo simulação ----------
    function prepararSimulacao(eventos) {
        simulacao = { eventos, i: -1, rodando: false };
        desenharSim();
    }
    function desenharSim() {
        const box = $('.bc-sim');
        if (modo !== 'simulacao') { box.hidden = true; return; }
        box.hidden = false;
        const ev = simulacao.eventos;
        if (!ev.length) { box.innerHTML = `<p class="bc-rot">Simulação</p><p class="bc-nota">Rode um <b>ping</b> ou <b>tracert</b> no terminal: os pacotes aparecem aqui, um a um.</p>`; return; }
        const nome = id => (ap(id) || {}).nome || '?';
        const atual = ev[simulacao.i];
        box.innerHTML = `<div class="bc-sim-cab"><p class="bc-rot">Simulação · ${simulacao.i + 1} de ${ev.length}</p>
            <div><button type="button" data-sim="reiniciar">⏮</button><button type="button" data-sim="passo">Próximo ▶</button><button type="button" data-sim="tocar">${simulacao.rodando ? '⏸ Pausar' : '▶▶ Tocar'}</button></div></div>
            ${atual ? `<div class="bc-detalhe"><p><b>${esc(atual.quadro.resumo)}</b></p>
                <p class="bc-nota">Camada 2 (Ethernet): de ${esc(atual.quadro.origemMac)} para ${esc(atual.quadro.destinoMac)}${atual.quadro.destinoMac === 'FF:FF:FF:FF:FF:FF' ? ' (broadcast: todos da rede local recebem)' : ''}</p>
                ${atual.quadro.tipo === 'ARP' ? `<p class="bc-nota">ARP ${atual.quadro.op === 'pedido' ? 'pedido' : 'resposta'}: IP ${esc(atual.quadro.origemIp)} pergunta/responde sobre ${esc(atual.quadro.alvoIp)}</p>` : `<p class="bc-nota">Camada 3 (IP): de ${esc(atual.quadro.origemIp)} para ${esc(atual.quadro.destinoIp)} · TTL ${atual.quadro.ttl}</p>`}</div>` : ''}
            <ol class="bc-eventos">${ev.map((e, i) => `<li class="${i === simulacao.i ? 'atual' : ''} ${e.quadro.tipo}" data-ev="${i}"><b>${e.quadro.tipo}</b> ${esc(nome(e.de))} → ${esc(nome(e.para))}${e.perdido ? ` <span class="bc-ruim">✕ ${esc(e.perdido)}</span>` : ''}</li>`).join('')}</ol>`;
    }
    function animar(i, depois) {
        const e = simulacao.eventos[i]; const g = svg.querySelector('.bc-pacotes');
        const A = ap(e.de), B = ap(e.para); if (!A || !B || !g) { if (depois) depois(); return; }
        const a = centro(A), b = centro(B);
        g.innerHTML = `<g class="bc-pacote ${e.quadro.tipo}"><rect x="-11" y="-8" width="22" height="16" rx="3"/><text y="4">${e.quadro.tipo === 'ARP' ? 'A' : 'I'}</text></g>`;
        const p = g.firstChild; const t0 = performance.now(), dur = 650;
        const passo = (t) => {
            const k = Math.min(1, (t - t0) / dur), lim = e.perdido ? 0.5 : 1, kk = Math.min(k, lim);
            p.setAttribute('transform', `translate(${a.x + (b.x - a.x) * kk},${a.y + (b.y - a.y) * kk})`);
            if (k < 1) requestAnimationFrame(passo); else { if (e.perdido) p.classList.add('perdido'); if (depois) depois(); }
        };
        requestAnimationFrame(passo);
    }
    function proximoEvento(continuar) {
        if (simulacao.i >= simulacao.eventos.length - 1) { simulacao.rodando = false; desenharSim(); return; }
        simulacao.i++; desenharSim();
        animar(simulacao.i, () => { if (continuar && simulacao.rodando) setTimeout(() => proximoEvento(true), 150); });
    }

    // ---------- portas para o cabo ----------
    function escolherPorta(a, x, y, aoEscolher) {
        const box = $('.bc-portas');
        const livres = a.portas.filter(p => !M.caboDa(projeto.rede, a.id, p.nome));
        if (!livres.length) { status(`${a.nome} não tem porta livre.`); return; }
        box.innerHTML = `<p class="bc-rot">${esc(a.nome)}: porta</p>${livres.map(p => `<button type="button" data-escolhe="${esc(p.nome)}">${esc(p.nome)}</button>`).join('')}`;
        box.style.left = `${x}px`; box.style.top = `${y}px`; box.hidden = false;
        box.onclick = (ev) => { const b = ev.target.closest('[data-escolhe]'); if (!b) return; box.hidden = true; aoEscolher(b.dataset.escolhe); };
    }

    // ---------- eventos ----------
    let arrasto = null;
    svg.addEventListener('pointerdown', (ev) => {
        const g = ev.target.closest('[data-ap]');
        const c = ev.target.closest('[data-cabo]');
        $('.bc-portas').hidden = true;
        if (g) {
            const a = ap(g.dataset.ap);
            if (ferramenta) {
                const r = svg.getBoundingClientRect(), area = $('.bc-area').getBoundingClientRect();
                const x = a.x + W + 6 + (r.left - area.left), y = a.y + (r.top - area.top);
                escolherPorta(a, x, y, (pn) => {
                    if (!ferramenta.a) { ferramenta.a = { id: a.id, porta: pn }; status(`Origem: ${a.nome} ${pn}. Agora clique no outro aparelho.`); desenharArea(); return; }
                    const res = M.ligar(projeto.rede, ferramenta.a.id, ferramenta.a.porta, a.id, pn);
                    if (res.erro) status(res.erro); else { status(`Cabo ${res.cabo.tipo} ligado: ${ap(ferramenta.a.id).nome} ${ferramenta.a.porta} ↔ ${a.nome} ${pn}.`); M.limparTabelas(est); }
                    ferramenta = null; desenharTudo();
                });
                return;
            }
            sel = a.id; caboSel = null;
            arrasto = { id: a.id, dx: ev.offsetX - a.x, dy: ev.offsetY - a.y, moveu: false };
            svg.setPointerCapture(ev.pointerId);
            desenharTudo(); return;
        }
        if (c && !ferramenta) { caboSel = Number(c.dataset.cabo); sel = null; desenharTudo(); return; }
        if (!ferramenta) { sel = null; caboSel = null; desenharTudo(); }
    });
    svg.addEventListener('pointermove', (ev) => {
        if (!arrasto) return;
        const a = ap(arrasto.id); if (!a) return;
        const r = svg.getBoundingClientRect();
        a.x = Math.max(4, Math.min(r.width - W - 4, ev.offsetX - arrasto.dx));
        a.y = Math.max(4, Math.min(r.height - H - 24, ev.offsetY - arrasto.dy));
        arrasto.moveu = true; desenharArea();
    });
    svg.addEventListener('pointerup', () => { if (arrasto && arrasto.moveu) salvarAtual(); arrasto = null; });

    el.addEventListener('click', (ev) => {
        const b = ev.target.closest('button'); if (!b || !el.contains(b)) return;
        if (b.dataset.novo) {
            const r = svg.getBoundingClientRect();
            const n = projeto.rede.aparelhos.length;
            const a = M.adicionarAparelho(projeto.rede, b.dataset.novo, Math.max(20, r.width / 2 - W / 2 + (n % 5) * 24 - 48), Math.max(20, r.height / 2 - H / 2 + (n % 4) * 22 - 33));
            sel = a.id; caboSel = null; desenharTudo(); return;
        }
        if (b.dataset.modo) { modo = b.dataset.modo; desenharTudo(); desenharSim(); return; }
        if (b.dataset.sim) {
            if (b.dataset.sim === 'reiniciar') { simulacao.i = -1; simulacao.rodando = false; desenharSim(); }
            if (b.dataset.sim === 'passo') { simulacao.rodando = false; proximoEvento(false); }
            if (b.dataset.sim === 'tocar') { simulacao.rodando = !simulacao.rodando; if (simulacao.rodando) proximoEvento(true); else desenharSim(); }
            return;
        }
        const ac = b.dataset.acao;
        if (ac === 'fechar') return fechar();
        if (ac === 'mesmo-assim') { el.classList.add('forcar'); return; }
        if (ac === 'cabo') { ferramenta = ferramenta ? null : { tipo: 'cabo' }; status(ferramenta ? 'Cabo: clique no primeiro aparelho e escolha a porta. Esc cancela.' : ''); desenharTudo(); return; }
        if (ac === 'novo') { projeto = { nome: 'Projeto novo', rede: M.novaRede() }; est = M.novoEstado(); sel = null; caboSel = null; desenharTudo(); return; }
        if (ac === 'exemplo') { projeto = exemploEscritorio(); sel = projeto.sel; est = M.novoEstado(); caboSel = null; desenharTudo(); return; }
        if (ac === 'salvar') { const t = ler(CHAVE_PROJETOS, {}); t[projeto.nome] = M.serializar(projeto.rede); gravar(CHAVE_PROJETOS, t); status(`Projeto "${projeto.nome}" salvo neste computador.`); return; }
        if (ac === 'abrir-lista') {
            const t = ler(CHAVE_PROJETOS, {}); const nomes = Object.keys(t);
            const d = $('.bc-dialogo');
            d.innerHTML = `<div class="bc-caixa"><p class="bc-rot">Projetos salvos neste computador</p>${nomes.length ? nomes.map(n => `<p class="bc-proj"><button type="button" data-abre="${esc(n)}">${esc(n)}</button> <button type="button" data-apaga="${esc(n)}" aria-label="Apagar ${esc(n)}">🗑</button></p>`).join('') : '<p class="bc-nota">Nenhum projeto salvo ainda. Use "Salvar".</p>'}<button type="button" data-acao="fechar-dialogo">Fechar</button></div>`;
            d.hidden = false; return;
        }
        if (b.dataset.abre) { const t = ler(CHAVE_PROJETOS, {}); projeto = { nome: b.dataset.abre, rede: M.carregar(t[b.dataset.abre]) }; est = M.novoEstado(); sel = null; caboSel = null; $('.bc-dialogo').hidden = true; desenharTudo(); return; }
        if (b.dataset.apaga) { const t = ler(CHAVE_PROJETOS, {}); delete t[b.dataset.apaga]; gravar(CHAVE_PROJETOS, t); b.closest('.bc-proj').remove(); return; }
        if (ac === 'fechar-dialogo') { $('.bc-dialogo').hidden = true; return; }
        if (ac === 'excluir' && sel) { M.removerAparelho(projeto.rede, sel); sel = null; M.limparTabelas(est); desenharTudo(); return; }
        if (ac === 'remover-cabo' && caboSel !== null) { M.desligarCabo(projeto.rede, projeto.rede.cabos[caboSel]); caboSel = null; M.limparTabelas(est); desenharTudo(); return; }
        if (ac === 'tirar-rota') { const a = ap(sel); a.rotas.splice(Number(b.dataset.i), 1); M.limparTabelas(est); desenharTudo(); return; }
    });
    $('.bc-sim').addEventListener('click', (ev) => { const li = ev.target.closest('[data-ev]'); if (!li) return; simulacao.i = Number(li.dataset.ev); simulacao.rodando = false; desenharSim(); animar(simulacao.i); });

    // Configuração: aplica ao sair do campo (e no Enter)
    $('.bc-config').addEventListener('change', (ev) => {
        const inp = ev.target; const a = ap(sel); if (!a || !inp.dataset.campo) return;
        const pDiv = inp.closest('[data-porta]'); const p = pDiv ? M.porta(a, pDiv.dataset.porta) : null;
        const v = inp.value.trim();
        if (inp.dataset.campo === 'nome') a.nome = v || a.nome;
        if (inp.dataset.campo === 'gateway') { if (v && ipParaNumero(v) === null) { status(`Gateway "${v}" não é um IPv4 válido.`); return; } a.gateway = v; }
        if (p && inp.dataset.campo === 'ip') { if (v && ipParaNumero(v) === null) { status(`"${v}" não é um IPv4 válido: são 4 números de 0 a 255 separados por ponto.`); return; } p.ip = v; }
        if (p && inp.dataset.campo === 'mascara') { const pre = lerMascara(v); if (pre === null) { status(`Máscara "${v}" inválida. Use 255.255.255.0 ou /24 (os 1 precisam vir todos antes dos 0).`); return; } p.prefixo = pre; }
        if (p && inp.dataset.campo === 'ligada') p.ligada = inp.checked;
        M.limparTabelas(est); status(''); desenharTudo();
    });
    $('.bc-config').addEventListener('submit', (ev) => {
        ev.preventDefault(); const f = ev.target; const a = ap(sel); if (!a || !f.classList.contains('bc-nova-rota')) return;
        const rede = f.rede.value.trim(), pre = lerMascara(f.mascara.value), prox = f.proximo.value.trim();
        if (ipParaNumero(rede) === null || pre === null || ipParaNumero(prox) === null) { status('Rota: preencha rede (ex.: 10.0.0.0), máscara (ex.: /8) e próximo salto (ex.: 192.168.2.2). Rota padrão: 0.0.0.0 /0.'); return; }
        a.rotas = a.rotas || []; a.rotas.push({ rede: calcular(rede, pre).rede, prefixo: pre, proximo: prox }); M.limparTabelas(est); desenharTudo();
    });
    $('.bc-linha').addEventListener('submit', (ev) => { ev.preventDefault(); const i = $('.bc-cmd'); const v = i.value; i.value = ''; if (v.trim()) executar(v); });
    $('.bc-nome').addEventListener('change', (ev) => { projeto.nome = ev.target.value.trim() || 'Sem nome'; salvarAtual(); });

    const tecla = (ev) => {
        if (ev.key !== 'Escape') return;
        if (ferramenta) { ferramenta = null; $('.bc-portas').hidden = true; status(''); desenharTudo(); return; }
        if (!$('.bc-dialogo').hidden) { $('.bc-dialogo').hidden = true; return; }
        fechar();
    };
    document.addEventListener('keydown', tecla);
    function fechar() { salvarAtual(); document.removeEventListener('keydown', tecla); document.body.classList.remove('modo-bancada'); el.remove(); }

    desenharTudo(); desenharSim();
}
