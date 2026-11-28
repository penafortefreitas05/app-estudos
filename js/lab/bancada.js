// Laboratório FocoPro: bancada de rede em tela cheia (fase 1, 25/11/2026). Feita para o computador.
// Esquerda: paleta de aparelhos. Centro: área de montagem (SVG). Direita: configuração + terminal.
// Modo simulação: depois de um comando, o pacote anda pelos cabos, evento por evento.
import { esc } from '../ui.js';
import * as M from './motor.js';
import { calcular, prefixoDaMascara, ipParaNumero } from './ipv4.js';
import { MISSOES, redeEscritorio, avaliar } from './missoes.js';

const CHAVE_ATUAL = 'focopro_lab_atual';
const CHAVE_PROJETOS = 'focopro_lab_projetos';
const CHAVE_MISSOES = 'focopro_lab_missoes';
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
    const rede = redeEscritorio();
    return { nome: 'Escritório da Ana', rede, sel: rede.aparelhos.find(a => a.nome === 'PC1').id };
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
    let missao = null; // { def, comandos: [], vistos: [], dicas: 0, resposta: null }

    const el = document.createElement('div');
    el.className = 'bancada';
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-label', 'Laboratório: bancada de rede');
    el.innerHTML = `
        <header class="bc-topo">
            <div class="bc-titulo"><span class="bc-faixa">Laboratório</span><input class="bc-nome" aria-label="Nome do projeto" value=""></div>
            <div class="bc-barra">
                <button type="button" data-acao="missoes" class="bc-destaque">🎯 Missões</button>
                <span class="bc-sep"></span>
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
                <div class="bc-missao" hidden></div>
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
                ${ipConf ? `<div class="bc-campos"><label>IP<input data-campo="ip" value="${esc(p.ip)}" placeholder="192.168.1.10" ${a.dhcp ? 'disabled' : ''}></label>
                    <label>Máscara<input data-campo="mascara" value="${p.ip ? esc(calc && !calc.erro ? calc.mascara : '') : ''}" placeholder="255.255.255.0 ou /24" ${a.dhcp ? 'disabled' : ''}></label></div>
                    ${t.roteia ? `<label class="bc-helper">NAT nesta porta<select data-campo="nat"><option value="" ${!p.nat ? 'selected' : ''}>—</option><option value="inside" ${p.nat === 'inside' ? 'selected' : ''}>inside (rede interna)</option><option value="outside" ${p.nat === 'outside' ? 'selected' : ''}>outside (para a internet)</option></select></label>` : ''}
                    ${t.roteia ? `<label class="bc-helper">ip helper-address (relay DHCP)<input data-campo="helper" value="${esc(p.helper || '')}" placeholder="IP do servidor DHCP, se estiver em outra rede"></label>` : ''}
                    ${calc && !calc.erro ? `<p class="bc-nota">Rede ${esc(calc.rede)}/${p.prefixo} · broadcast ${esc(calc.broadcast)} · ${calc.hosts} hosts${calc.eRede || calc.eBroadcast ? ' · <b class="bc-ruim">esse IP é o endereço de rede/broadcast: não serve para aparelho</b>' : ''}</p>` : ''}` : `${a.tipo === 'switch' ? `<div class="bc-campos bc-vlan"><label>Modo<select data-campo="modo"><option value="access" ${p.modo !== 'trunk' ? 'selected' : ''}>access</option><option value="trunk" ${p.modo === 'trunk' ? 'selected' : ''}>trunk (802.1Q)</option></select></label>
                    ${p.modo === 'trunk' ? `<label>VLANs permitidas<input data-campo="permitidas" value="${esc(p.permitidas || '')}" placeholder="todas (ou 10,20)"></label>` : `<label>VLAN<input data-campo="vlan" type="number" min="1" max="4094" value="${Number(p.vlan) || 1}"></label>`}</div>` : `<p class="bc-nota">MAC ${esc(p.mac)}</p>`}`}
                ${t.roteia ? `<div class="bc-subs">${(p.subs || []).map((sb, i) => `<p class="bc-rota">${esc(p.nome)}.${sb.vlan} · VLAN ${sb.vlan} · ${esc(sb.ip)}/${sb.prefixo} <button type="button" data-acao="tirar-sub" data-i="${i}" aria-label="Remover subinterface">✕</button></p>`).join('')}
                    <form class="bc-nova-sub"><input name="vlan" placeholder="VLAN" inputmode="numeric"><input name="ip" placeholder="IP"><input name="mascara" placeholder="máscara"><button>+ sub</button></form></div>` : ''}
            </div>`;
        };
        const portas = t.host || a.tipo === 'switch' || t.roteia ? a.portas : a.portas.filter(p => M.caboDa(projeto.rede, a.id, p.nome));
        box.innerHTML = `<p class="bc-rot">${ICONE[a.tipo]} ${esc(t.nome)}</p>
            <label class="bc-nome-ap">Nome<input data-campo="nome" value="${esc(a.nome)}"></label>
            ${t.host ? `<div class="bc-modo-ip" role="group" aria-label="Como o aparelho recebe o IP"><span>Endereço IP:</span><button type="button" data-ipmodo="estatico" aria-pressed="${!a.dhcp}">Estático</button><button type="button" data-ipmodo="dhcp" aria-pressed="${!!a.dhcp}">DHCP</button></div>
                ${a.dhcp ? `<p class="bc-nota">${a.portas[0].ip ? (/^169\.254\./.test(a.portas[0].ip) ? '<b class="bc-ruim">Sem resposta do DHCP: ficou com 169.254.x.x (APIPA).</b>' : `Recebido por DHCP.`) : 'Ainda sem IP.'} <button type="button" data-acao="renovar">Pedir IP de novo</button></p>` : ''}
                <label class="bc-nome-ap">Gateway padrão<input data-campo="gateway" value="${esc(a.gateway || '')}" placeholder="vazio = sem gateway" ${a.dhcp ? 'disabled' : ''}></label>
                <label class="bc-nome-ap">Servidor DNS<input data-campo="dns" value="${esc(a.dns || '')}" placeholder="ex.: 8.8.8.8 (vazio = sem DNS)" ${a.dhcp ? 'disabled' : ''}></label>` : ''}
            ${portas.map(linhaPorta).join('')}
            ${a.tipo === 'servidor' ? painelDhcp(a) + painelDns(a) : ''}
            ${a.tipo === 'switch' ? `<p class="bc-nota">Switch não precisa de IP para encaminhar: ele aprende sozinho em que porta está cada MAC. Porta access = uma VLAN; trunk = várias, com etiqueta 802.1Q (para outro switch ou roteador).</p>` : ''}
            ${t.roteia ? `<div class="bc-servico"><div class="bc-porta-cab"><b>NAT com sobrecarga (PAT)</b><label class="bc-liga"><input type="checkbox" data-nat="ativo" ${a.nat ? 'checked' : ''}> ${a.nat ? 'ligado' : 'desligado'}</label></div><p class="bc-nota">Quem entra por uma porta inside e sai por uma outside passa a usar o IP da porta outside. No Cisco: ip nat inside source list 1 interface g0/1 overload.</p></div>` : ''}
            ${t.roteia ? `<p class="bc-rot">Rotas estáticas</p>
                ${(a.rotas || []).map((r, i) => `<p class="bc-rota">${esc(r.rede)}/${r.prefixo} via ${esc(r.proximo)} ${r.prefixo === 0 ? '<span class="bc-nota">(rota padrão)</span>' : ''} <button type="button" data-acao="tirar-rota" data-i="${i}" aria-label="Remover rota">✕</button></p>`).join('') || '<p class="bc-nota">Nenhuma. O roteador já conhece as redes ligadas às suas portas.</p>'}
                <form class="bc-nova-rota"><input name="rede" placeholder="rede (10.0.0.0)"><input name="mascara" placeholder="máscara (/8)"><input name="proximo" placeholder="próximo salto"><button>+ rota</button></form>` : ''}
            <button type="button" class="bc-perigo" data-acao="excluir">Excluir ${esc(a.nome)}</button>`;
        const term = $('.bc-term');
        term.hidden = false;
        $('.bc-term-tit').textContent = `Terminal · ${a.nome}`;
        $('.bc-prompt').textContent = a.tipo === 'switch' || a.tipo === 'roteador' ? `${a.nome}#` : `C:\\>`;
        if (!terminais[a.id]) terminais[a.id] = [a.tipo === 'switch' ? 'Comandos: show mac address-table, show vlan brief, clear' : a.tipo === 'roteador' ? 'Comandos: ping, show ip route, show ip interface brief, show ip nat translations, show arp, clear' : 'Comandos: ping, nslookup, ipconfig, ipconfig /renew, arp -a, tracert, cls, help'];
        desenharTerminal();
    }
    function painelDhcp(a) {
        const sv = a.servicoDhcp || { ativo: false, pools: [], concessoes: {} };
        const cs = M.concessoes(projeto.rede, a.id);
        return `<div class="bc-servico"><div class="bc-porta-cab"><b>Serviço DHCP</b><label class="bc-liga"><input type="checkbox" data-dhcp="ativo" ${sv.ativo ? 'checked' : ''}> ${sv.ativo ? 'ligado' : 'desligado'}</label></div>
            ${(sv.pools || []).map((pl, i) => `<p class="bc-rota">${esc(pl.inicio)} a ${esc(pl.fim)} /${pl.prefixo}${pl.gateway ? ` · gw ${esc(pl.gateway)}` : ''}${pl.dns ? ` · dns ${esc(pl.dns)}` : ''} <button type="button" data-acao="tirar-pool" data-i="${i}" aria-label="Remover pool">✕</button></p>`).join('') || '<p class="bc-nota">Nenhum pool. Crie um: faixa de IPs que o servidor pode emprestar.</p>'}
            <form class="bc-novo-pool"><input name="inicio" placeholder="primeiro IP"><input name="fim" placeholder="último IP"><input name="mascara" placeholder="máscara"><input name="gateway" placeholder="gateway (opcional)"><input name="dns" placeholder="DNS (opcional)"><button>+ pool</button></form>
            <p class="bc-rot">Concessões (${cs.length})</p>
            ${cs.map(c => `<p class="bc-rota">${esc(c.ip)} → ${esc(c.nome)} <span class="bc-nota">${esc(c.mac)}</span></p>`).join('') || '<p class="bc-nota">Nenhum IP emprestado ainda.</p>'}</div>`;
    }
    function painelDns(a) {
        const sv = a.servicoDns || { ativo: false, registros: {} };
        const regs = Object.entries(sv.registros || {});
        return `<div class="bc-servico bc-servico-dns"><div class="bc-porta-cab"><b>Serviço DNS</b><label class="bc-liga"><input type="checkbox" data-dnsserv="ativo" ${sv.ativo ? 'checked' : ''}> ${sv.ativo ? 'ligado' : 'desligado'}</label></div>
            ${regs.map(([n, ip]) => `<p class="bc-rota">${esc(n)} → ${esc(ip)} <button type="button" data-acao="tirar-dns" data-nome="${esc(n)}" aria-label="Remover registro">✕</button></p>`).join('') || '<p class="bc-nota">Nenhum registro. Um registro A liga um nome a um IP.</p>'}
            <form class="bc-novo-dns"><input name="nome" placeholder="nome (www.exemplo.com)"><input name="ip" placeholder="IP"><button>+ registro</button></form></div>`;
    }
    function pedirIp(a) {
        const r = M.obterIp(projeto.rede, est, a.id);
        const out = terminais[a.id] || (terminais[a.id] = []);
        if (r.ok) out.push({ tipo: 'ok', texto: `DHCP: recebeu ${r.ip}${r.gateway ? `, gateway ${r.gateway}` : ''} do ${r.servidor}${r.relay ? ` (repassado pelo ${r.relay})` : ''}.` });
        else out.push({ tipo: 'ruim', texto: `DHCP falhou: ${r.explicacao}. Ficou com ${r.ip} (APIPA).` });
        out.push('');
        if (missao) missao.comandos.push({ de: a.id, cmd: 'dhcp', alvo: '', ok: r.ok ? 1 : 0 });
        if (modo === 'simulacao' && r.eventos.length) prepararSimulacao(r.eventos);
        return r;
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
        desenharArea(); desenharConfig(); salvarAtual(); desenharMissao();
    }

    // ---------- comandos ----------
    function executar(cmdTxt) {
        const a = ap(sel); if (!a) return;
        const out = terminais[a.id] || (terminais[a.id] = []);
        const prompt = $('.bc-prompt').textContent;
        out.push(`${prompt}${cmdTxt}`);
        const [cmd, ...args] = cmdTxt.trim().split(/\s+/); const c = (cmd || '').toLowerCase(); const resto = args.join(' ').toLowerCase();
        let eventos = null;
        const registro = { de: a.id, cmd: c, alvo: args[0] || '', ok: 0 };
        if (c === 'cls' || c === 'clear') { terminais[a.id] = []; desenharTerminal(); return; }
        if (c === 'help' || c === '?') out.push(a.tipo === 'roteador' ? 'ping <ip> · show ip route · show ip interface brief · show ip nat translations · show arp' : 'ping <ip ou nome> · nslookup <nome> · ipconfig · ipconfig /renew · ipconfig /release · arp -a · tracert <ip> · cls');
        else if (c === 'nslookup' && args[0]) {
            const r = M.nslookup(projeto.rede, est, a.id, args[0]); out.push(...r.linhas);
            registro.cmd = 'nslookup'; registro.alvo = args[0].toLowerCase(); registro.ok = r.ok ? 1 : 0; eventos = r.eventos;
        }
        else if (c === 'ping' && args[0] && ipParaNumero(args[0]) === null && /[a-z]/i.test(args[0])) {
            const rn = M.resolverNome(projeto.rede, est, a.id, args[0]);
            registro.nome = args[0].toLowerCase();
            if (!rn.ok) { out.push(`Ping request could not find host ${args[0]}. Please check the name and try again.`, { tipo: 'ruim', texto: `Por quê: ${rn.explicacao}.` }); eventos = rn.eventos; }
            else {
                const r = M.ping(projeto.rede, est, a.id, rn.ip);
                registro.alvo = rn.ip; registro.ok = r.ok || 0;
                out.push(`Pinging ${args[0]} [${rn.ip}] with 32 bytes of data:`, ...r.linhas.slice(1));
                if (r.explicacao) out.push({ tipo: r.ok === 4 ? 'ok' : 'ruim', texto: `Por quê: o DNS (${rn.servidor}) respondeu ${rn.ip}. ${r.explicacao}` });
                eventos = [...rn.eventos, ...((r.tentativas && r.tentativas[0] && r.tentativas[0].eventos) || [])];
            }
        }
        else if (c === 'ping' && args[0]) {
            const r = M.ping(projeto.rede, est, a.id, args[0]);
            registro.ok = r.ok || 0;
            out.push(...r.linhas);
            if (r.explicacao) out.push({ tipo: r.ok === 4 ? 'ok' : 'ruim', texto: `Por quê: ${r.explicacao}` });
            (r.avisos || []).forEach(x => out.push({ tipo: 'aviso', texto: `⚠ ${x}` }));
            eventos = r.tentativas && r.tentativas[0] && r.tentativas[0].eventos; // 1ª tentativa: ARP + um eco, como no Packet Tracer
        } else if (c === 'tracert' && args[0]) { const r = M.tracert(projeto.rede, est, a.id, args[0]); out.push(...r.linhas); eventos = r.eventos; registro.cmd = 'tracert'; }
        else if (c === 'ipconfig' && resto === '/renew') {
            if (!a.dhcp) out.push('O aparelho está com IP estático. Troque para DHCP no painel para usar /renew.');
            else { const r = pedirIp(a); out.pop(); out.push(...M.ipconfig(projeto.rede, a.id)); registro.cmd = 'dhcp'; registro.ok = r.ok ? 1 : 0; eventos = r.eventos; desenharTudo(); }
        } else if (c === 'ipconfig' && resto === '/release') {
            if (!a.dhcp) out.push('O aparelho está com IP estático.');
            else { M.liberarIp(projeto.rede, a.id); out.push('IP liberado: o aparelho devolveu o endereço ao servidor DHCP.'); M.limparTabelas(est); desenharTudo(); }
        }
        else if (c === 'ipconfig') out.push(...M.ipconfig(projeto.rede, a.id));
        else if (c === 'arp' && resto === '-a' || c === 'show' && resto === 'arp') out.push(...M.arpA(est, projeto.rede, a.id));
        else if (c === 'show' && /^ip nat/.test(resto)) { registro.cmd = 'show-nat'; out.push(...M.traducoesNat(est, projeto.rede, a.id)); }
        else if (c === 'show' && /^vlan/.test(resto)) { registro.cmd = 'show-vlan'; out.push(...M.vlanBrief(projeto.rede, a.id)); }
        else if (c === 'show' && /^mac/.test(resto)) { registro.cmd = 'show-mac'; out.push(...M.tabelaMac(est, projeto.rede, a.id)); }
        else if (c === 'show' && resto === 'ip route') {
            const linhas = ['Codes: C - connected, S - static, S* - default', ''];
            M.interfaces(a).filter(p => p.ip && p.ligada).forEach(p => { const k = calcular(p.ip, p.prefixo); linhas.push(`C    ${k.rede}/${p.prefixo} is directly connected, ${p.nome}`); });
            (a.rotas || []).forEach(r => linhas.push(`${r.prefixo === 0 ? 'S*' : 'S '}   ${r.rede}/${r.prefixo} [1/0] via ${r.proximo}`));
            out.push(...linhas);
        } else if (c === 'show' && resto === 'ip interface brief') {
            out.push('Interface    IP-Address       Status');
            M.interfaces(a).forEach(p => out.push(`${p.nome.padEnd(13)}${(p.ip || 'unassigned').padEnd(17)}${p.ligada ? 'up' : 'administratively down'}`));
        } else out.push(`'${cmdTxt}' não é um comando conhecido aqui. Digite help.`);
        out.push('');
        if (missao) missao.comandos.push(registro);
        desenharTerminal();
        if (eventos && eventos.length && modo === 'simulacao') prepararSimulacao(eventos);
        desenharMissao();
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
                <p class="bc-nota">Camada 2 (Ethernet): de ${esc(atual.quadro.origemMac)} para ${esc(atual.quadro.destinoMac)}${atual.quadro.destinoMac === 'FF:FF:FF:FF:FF:FF' ? ' (broadcast: todos da mesma VLAN recebem)' : ''}</p>${atual.quadro.vlan ? `<p class="bc-nota"><span class="bc-tag">802.1Q</span> etiqueta VLAN ${atual.quadro.vlan}: neste cabo (trunk) o quadro leva a marca de qual VLAN ele é.</p>` : ''}${atual.perdido ? `<p class="bc-nota bc-ruim">Descartado: ${esc(atual.perdido)}.</p>` : ''}${atual.quadro.nat ? `<p class="bc-nota"><span class="bc-tag bc-tag-nat">NAT</span> ${esc(atual.quadro.nat)}</p>` : ''}
                ${atual.quadro.tipo === 'ARP' ? `<p class="bc-nota">ARP ${atual.quadro.op === 'pedido' ? 'pedido' : 'resposta'}: IP ${esc(atual.quadro.origemIp)} pergunta/responde sobre ${esc(atual.quadro.alvoIp)}</p>` : `<p class="bc-nota">Camada 3 (IP): de ${esc(atual.quadro.origemIp)} para ${esc(atual.quadro.destinoIp)} · TTL ${atual.quadro.ttl}</p>${atual.quadro.origemIp === '0.0.0.0' ? '<p class="bc-nota">Origem 0.0.0.0: o aparelho ainda não tem IP. Destino 255.255.255.255: broadcast, todos da rede local recebem.</p>' : ''}`}</div>` : ''}
            <ol class="bc-eventos">${ev.map((e, i) => `<li class="${i === simulacao.i ? 'atual' : ''} ${e.quadro.tipo}" data-ev="${i}"><b>${e.quadro.tipo}${e.quadro.tipo === 'DHCP' && e.quadro.op ? ' ' + e.quadro.op : ''}</b>${e.quadro.vlan ? ` <span class="bc-tag">VLAN ${e.quadro.vlan}</span>` : ''}${e.quadro.nat ? ' <span class="bc-tag bc-tag-nat">NAT</span>' : ''} ${esc(nome(e.de))} → ${esc(nome(e.para))}${e.perdido ? ` <span class="bc-ruim">✕ ${esc(e.perdido)}</span>` : ''}</li>`).join('')}</ol>`;
        const atualLi = box.querySelector('.bc-eventos li.atual'); if (atualLi) atualLi.scrollIntoView({ block: 'nearest' });
    }
    function animar(i, depois) {
        const e = simulacao.eventos[i]; const g = svg.querySelector('.bc-pacotes');
        const A = ap(e.de), B = ap(e.para); if (!A || !B || !g) { if (depois) depois(); return; }
        const a = centro(A), b = centro(B);
        g.innerHTML = `<g class="bc-pacote ${e.quadro.tipo}"><rect x="-11" y="-8" width="22" height="16" rx="3"/><text y="4">${e.quadro.tipo === 'ARP' ? 'A' : e.quadro.tipo === 'DHCP' ? 'D' : e.quadro.tipo === 'DNS' ? 'N' : 'I'}</text></g>`;
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
        simulacao.i++; verEvento(simulacao.i); desenharSim();
        animar(simulacao.i, () => { if (continuar && simulacao.rodando) setTimeout(() => proximoEvento(true), 150); });
    }

    function verEvento(i) {
        const e = simulacao.eventos[i]; if (!e || !missao) return;
        missao.vistos.push({ origemIp: e.quadro.origemIp, destinoIp: e.quadro.destinoIp, nat: !!e.quadro.nat, tipo: e.quadro.tipo, op: e.quadro.op, alvoIp: e.quadro.alvoIp, ttl: e.quadro.ttl, vlan: e.quadro.vlan, perdido: e.perdido, de: (ap(e.de) || {}).nome, para: (ap(e.para) || {}).nome });
        desenharMissao();
    }

    // ---------- missões ----------
    const progresso = () => ler(CHAVE_MISSOES, {});
    // Embaralha as opções da pergunta numa ordem fixa por missão (a certa não fica sempre no mesmo lugar).
    function ordemOpcoes(d) {
        let h = 0; for (const ch of d.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
        const idx = d.pergunta.opcoes.map((_, i) => i);
        for (let i = idx.length - 1; i > 0; i--) { h = (h * 1103515245 + 12345) >>> 0; const j = h % (i + 1); [idx[i], idx[j]] = [idx[j], idx[i]]; }
        return idx;
    }
    function iniciarMissao(def) {
        projeto = { nome: `Missão: ${def.titulo}`, rede: def.inicio() };
        est = M.novoEstado(); caboSel = null; ferramenta = null; modo = 'tempo-real';
        Object.keys(terminais).forEach(k => delete terminais[k]);
        simulacao = { eventos: [], i: -1, rodando: false };
        const pc1 = projeto.rede.aparelhos.find(a => a.nome === 'PC1') || projeto.rede.aparelhos.find(a => a.tipo === 'pc'); sel = pc1 ? pc1.id : null;
        missao = { def, comandos: [], vistos: [], acoes: {}, feitos: new Set(), dicas: 0, resposta: null, aberta: true };
        $('.bc-dialogo').hidden = true; status('');
        desenharTudo(); desenharSim();
    }
    function desenharMissao() {
        const box = $('.bc-missao');
        if (!missao) { box.hidden = true; return; }
        box.hidden = false;
        const d = missao.def;
        const res = avaliar(d, { rede: projeto.rede, comandos: missao.comandos, acoes: missao.acoes, feitos: missao.feitos, sim: { modo, vistos: missao.vistos } });
        const proximo = res.indexOf(false);
        const tudo = res.every(Boolean);
        if (!missao.aberta) { box.innerHTML = `<button type="button" class="bc-missao-mini" data-missao="abrir">🎯 ${res.filter(Boolean).length}/${res.length} · ${esc(d.titulo)}</button>`; return; }
        const pergunta = tudo ? `<div class="bc-pergunta"><p><b>${esc(d.pergunta.texto)}</b></p>
            ${ordemOpcoes(d).map(i => [d.pergunta.opcoes[i], i]).map(([o, i]) => `<button type="button" data-resp="${i}" class="${missao.resposta === null ? '' : i === d.pergunta.certa ? 'certa' : i === missao.resposta ? 'errada' : ''}" ${missao.resposta !== null ? 'disabled' : ''}>${esc(o)}</button>`).join('')}
            ${missao.resposta !== null ? `<p class="bc-nota">${missao.resposta === d.pergunta.certa ? '<b class="bc-bom">Isso.</b> ' : '<b class="bc-ruim">Não foi isso.</b> '}${esc(d.pergunta.explicacao)}</p><p class="bc-bom"><b>Missão concluída ✓</b></p><button type="button" data-acao="missoes">Próxima missão</button>` : ''}</div>` : '';
        box.innerHTML = `<div class="bc-missao-cab"><p class="bc-rot">🎯 ${esc(d.grupo)}</p><button type="button" data-missao="recolher" aria-label="Recolher a missão">–</button></div>
            <p class="bc-missao-tit">${esc(d.titulo)}</p><p class="bc-nota">${esc(d.historia)}</p>
            <ul class="bc-objetivos">${d.objetivos.map((o, i) => `<li class="${res[i] ? 'ok' : ''} ${i === proximo && o.como ? 'agora' : ''}"><span aria-hidden="true">${res[i] ? '✓' : '○'}</span> ${esc(o.texto)}<span class="sr-only">${res[i] ? ' (feito)' : ' (falta)'}</span></li>`).join('')}</ul>
            ${proximo >= 0 && d.objetivos[proximo].como ? `<p class="bc-agora"><b>Agora:</b> ${esc(d.objetivos[proximo].como)}</p>` : ''}
            ${painelDesafio(d)}
            ${d.dicas.slice(0, missao.dicas).map(t => `<p class="bc-dica-m">💡 ${esc(t)}</p>`).join('')}
            ${!tudo && missao.dicas < d.dicas.length ? `<button type="button" data-missao="dica">💡 Dica ${missao.dicas + 1} de ${d.dicas.length}</button>` : ''}
            ${pergunta}
            <button type="button" class="bc-link" data-missao="sair">Sair da missão</button>`;
    }
    // Desafio de conta: o aluno escreve a previsão; o app confere. Aceita ".64", "64" ou o IP inteiro.
    function painelDesafio(d) {
        if (!d.desafios) return '';
        const feitos = missao.acoes.desafios || [];
        const i = d.desafios.findIndex((_, k) => !feitos[k]);
        if (i < 0) return `<p class="bc-bom bc-desafio-ok">✓ Todas as contas certas.</p>`;
        const ds = d.desafios[i]; const erros = (missao.acoes.erros || [])[i] || 0;
        return `<form class="bc-desafio" data-desafio="${i}"><p class="bc-rot">✎ ${esc(ds.titulo)}</p>
            <div class="bc-desafio-campos">${ds.campos.map((c, k) => `<label>${esc(c.rotulo)}<input name="c${k}" autocomplete="off" inputmode="decimal" value="${esc((missao.acoes.rascunho || {})[`${i}-${k}`] || '')}"></label>`).join('')}</div>
            <button>Conferir</button>${missao.acoes.msg ? `<p class="bc-nota ${missao.acoes.msgOk ? 'bc-bom' : 'bc-ruim'}">${esc(missao.acoes.msg)}</p>` : ''}
            ${erros >= 2 ? '<p class="bc-nota">Método: passo = 256 − último número da máscara. Rede = início do bloco onde o IP cai; broadcast = próximo início − 1; hosts = passo − 2.</p>' : ''}</form>`;
    }
    const normalizar = (v, tipo) => { const t = String(v || '').trim().replace(/^\./, ''); if (tipo === 'numero') return t.replace(/\D/g, ''); const partes = t.split('.'); return partes[partes.length - 1]; };
    function listaMissoes() {
        const feitas = progresso(); let grupo = '';
        const d = $('.bc-dialogo');
        d.innerHTML = `<div class="bc-caixa bc-caixa-larga"><p class="bc-rot">Missões</p>
            <p class="bc-nota">Cada missão abre a sua própria bancada. Seu projeto atual fica guardado se você usou "Salvar".</p>
            ${MISSOES.map((m, i) => { const g = m.grupo !== grupo ? `<p class="bc-grupo">${esc((grupo = m.grupo))}</p>` : ''; const f = feitas[m.id];
                return `${g}<button type="button" class="bc-missao-item" data-iniciar="${i}"><span>${f ? '✓' : '○'}</span><span><b>${esc(m.titulo)}</b><small>${m.tipo === 'chamado' ? 'Chamado de suporte: ache a causa e conserte' : m.tipo === 'montar' ? 'Monte do zero' : m.tipo === 'tutorial' ? 'Tutorial: aprenda a mexer na bancada' : m.tipo === 'contas' ? 'Contas: preveja antes de ver' : 'Modo simulação'}</small></span></button>`; }).join('')}
            <p class="bc-nota">Em breve: mais projetos (ACL, segurança e serviços).</p>
            <button type="button" data-acao="fechar-dialogo">Fechar</button></div>`;
        d.hidden = false;
    }
    $('.bc-missao').addEventListener('submit', (ev) => {
        const f = ev.target.closest('.bc-desafio'); if (!f || !missao) return;
        ev.preventDefault(); ev.stopPropagation();
        const i = Number(f.dataset.desafio); const ds = missao.def.desafios[i];
        const ac = missao.acoes; ac.rascunho = ac.rascunho || {};
        const certos = ds.campos.map((c, k) => { const v = f.elements[`c${k}`].value; ac.rascunho[`${i}-${k}`] = v; return normalizar(v, c.tipo) === normalizar(c.certo, c.tipo); });
        if (certos.every(Boolean)) { ac.desafios = ac.desafios || []; ac.desafios[i] = true; ac.msg = 'Certo! Agora, se quiser, troque a máscara no painel e confira.'; ac.msgOk = true; }
        else { ac.erros = ac.erros || []; ac.erros[i] = (ac.erros[i] || 0) + 1; ac.msg = `Ainda não: ${certos.filter(x => !x).length} de ${certos.length} campo(s) errado(s). Refaça a conta (sem trocar a máscara antes).`; ac.msgOk = false; }
        desenharMissao();
    });
    $('.bc-missao').addEventListener('click', (ev) => {
        const b = ev.target.closest('button'); if (!b || !missao || b.closest('.bc-desafio')) return;
        ev.stopPropagation();
        if (b.dataset.acao === 'missoes') { listaMissoes(); return; }
        const k = b.dataset.missao;
        if (k === 'dica') missao.dicas++;
        if (k === 'recolher') missao.aberta = false;
        if (k === 'abrir') missao.aberta = true;
        if (k === 'sair') { missao = null; }
        if (b.dataset.resp !== undefined && missao.resposta === null) {
            missao.resposta = Number(b.dataset.resp);
            const t = progresso(); const acertou = missao.resposta === missao.def.pergunta.certa;
            t[missao.def.id] = { feita: true, acertou: (t[missao.def.id] && t[missao.def.id].acertou) || acertou, em: new Date().toISOString().slice(0, 10) };
            gravar(CHAVE_MISSOES, t);
        }
        desenharMissao();
    });

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
    svg.addEventListener('pointerup', () => { if (arrasto && arrasto.moveu) { salvarAtual(); if (missao && !missao.acoes.moveu) { missao.acoes.moveu = true; desenharMissao(); } } arrasto = null; });

    el.addEventListener('click', (ev) => {
        const b = ev.target.closest('button'); if (!b || !el.contains(b)) return;
        if (b.dataset.iniciar !== undefined) { iniciarMissao(MISSOES[Number(b.dataset.iniciar)]); return; }
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
        if (ac === 'missoes') { listaMissoes(); return; }
        if (ac === 'cabo') { ferramenta = ferramenta ? null : { tipo: 'cabo' }; status(ferramenta ? 'Cabo: clique no primeiro aparelho e escolha a porta. Esc cancela.' : ''); desenharTudo(); return; }
        if (ac === 'novo') { missao = null; projeto = { nome: 'Projeto novo', rede: M.novaRede() }; est = M.novoEstado(); sel = null; caboSel = null; desenharTudo(); return; }
        if (ac === 'exemplo') { missao = null; projeto = exemploEscritorio(); sel = projeto.sel; est = M.novoEstado(); caboSel = null; desenharTudo(); return; }
        if (ac === 'salvar') { const t = ler(CHAVE_PROJETOS, {}); t[projeto.nome] = M.serializar(projeto.rede); gravar(CHAVE_PROJETOS, t); status(`Projeto "${projeto.nome}" salvo neste computador.`); return; }
        if (ac === 'abrir-lista') {
            const t = ler(CHAVE_PROJETOS, {}); const nomes = Object.keys(t);
            const d = $('.bc-dialogo');
            d.innerHTML = `<div class="bc-caixa"><p class="bc-rot">Projetos salvos neste computador</p>${nomes.length ? nomes.map(n => `<p class="bc-proj"><button type="button" data-abre="${esc(n)}">${esc(n)}</button> <button type="button" data-apaga="${esc(n)}" aria-label="Apagar ${esc(n)}">🗑</button></p>`).join('') : '<p class="bc-nota">Nenhum projeto salvo ainda. Use "Salvar".</p>'}<button type="button" data-acao="fechar-dialogo">Fechar</button></div>`;
            d.hidden = false; return;
        }
        if (b.dataset.abre) { missao = null; const t = ler(CHAVE_PROJETOS, {}); projeto = { nome: b.dataset.abre, rede: M.carregar(t[b.dataset.abre]) }; est = M.novoEstado(); sel = null; caboSel = null; $('.bc-dialogo').hidden = true; desenharTudo(); return; }
        if (b.dataset.apaga) { const t = ler(CHAVE_PROJETOS, {}); delete t[b.dataset.apaga]; gravar(CHAVE_PROJETOS, t); b.closest('.bc-proj').remove(); return; }
        if (ac === 'fechar-dialogo') { $('.bc-dialogo').hidden = true; return; }
        if (ac === 'excluir' && sel) { M.removerAparelho(projeto.rede, sel); sel = null; M.limparTabelas(est); desenharTudo(); return; }
        if (ac === 'remover-cabo' && caboSel !== null) { M.desligarCabo(projeto.rede, projeto.rede.cabos[caboSel]); caboSel = null; M.limparTabelas(est); desenharTudo(); return; }
        if (b.dataset.ipmodo) {
            const a = ap(sel); a.dhcp = b.dataset.ipmodo === 'dhcp';
            if (a.dhcp) { M.limparTabelas(est); pedirIp(a); } else { const p = a.portas[0]; if (/^169\.254\./.test(p.ip)) { p.ip = ''; p.prefixo = 24; } }
            desenharTudo(); desenharTerminal(); return;
        }
        if (ac === 'renovar') { const a = ap(sel); M.limparTabelas(est); pedirIp(a); desenharTudo(); return; }
        if (ac === 'tirar-dns') { const a = ap(sel); delete a.servicoDns.registros[b.dataset.nome]; desenharTudo(); return; }
        if (ac === 'tirar-sub') { const a = ap(sel); const pf = M.porta(a, b.closest('[data-porta]').dataset.porta); pf.subs.splice(Number(b.dataset.i), 1); M.limparTabelas(est); desenharTudo(); return; }
        if (ac === 'tirar-pool') { const a = ap(sel); a.servicoDhcp.pools.splice(Number(b.dataset.i), 1); desenharTudo(); return; }
        if (ac === 'tirar-rota') { const a = ap(sel); a.rotas.splice(Number(b.dataset.i), 1); M.limparTabelas(est); desenharTudo(); return; }
    });
    $('.bc-sim').addEventListener('click', (ev) => { const li = ev.target.closest('[data-ev]'); if (!li) return; simulacao.i = Number(li.dataset.ev); simulacao.rodando = false; verEvento(simulacao.i); desenharSim(); animar(simulacao.i); });

    // Configuração: aplica ao sair do campo (e no Enter)
    $('.bc-config').addEventListener('change', (ev) => {
        const inp = ev.target; const a = ap(sel);
        if (a && inp.dataset.nat === 'ativo') { a.nat = inp.checked; M.limparTabelas(est); desenharTudo(); return; }
        if (a && inp.dataset.dnsserv === 'ativo') { a.servicoDns = a.servicoDns || { ativo: false, registros: {} }; a.servicoDns.ativo = inp.checked; desenharTudo(); return; }
        if (a && inp.dataset.dhcp === 'ativo') { a.servicoDhcp = a.servicoDhcp || { ativo: false, pools: [], concessoes: {} }; a.servicoDhcp.ativo = inp.checked; desenharTudo(); return; }
        if (!a || !inp.dataset.campo) return;
        const pDiv = inp.closest('[data-porta]'); const p = pDiv ? M.porta(a, pDiv.dataset.porta) : null;
        const v = inp.value.trim(); const v0 = () => v;
        if (inp.dataset.campo === 'nome') a.nome = v || a.nome;
        if (inp.dataset.campo === 'gateway') { if (v && ipParaNumero(v) === null) { status(`Gateway "${v}" não é um IPv4 válido.`); return; } a.gateway = v; }
        if (p && inp.dataset.campo === 'ip') { if (v && ipParaNumero(v) === null) { status(`"${v}" não é um IPv4 válido: são 4 números de 0 a 255 separados por ponto.`); return; } p.ip = v; }
        if (p && inp.dataset.campo === 'mascara') { const pre = lerMascara(v); if (pre === null) { status(`Máscara "${v}" inválida. Use 255.255.255.0 ou /24 (os 1 precisam vir todos antes dos 0).`); return; } p.prefixo = pre; }
        if (p && inp.dataset.campo === 'ligada') p.ligada = inp.checked;
        if (p && inp.dataset.campo === 'modo') { p.modo = inp.value; }
        if (p && inp.dataset.campo === 'nat') { p.nat = inp.value || undefined; }
        if (inp.dataset.campo === 'dns') { if (v && ipParaNumero(v) === null) { status(`DNS "${v}" não é um IPv4 válido.`); return; } a.dns = v; }
        if (p && inp.dataset.campo === 'vlan') { const v = Number(v0()); if (!(v >= 1 && v <= 4094)) { status('VLAN vai de 1 a 4094.'); return; } p.vlan = v; }
        if (p && inp.dataset.campo === 'permitidas') { if (v && !/^(all|todas|[\d\s,]+)$/i.test(v)) { status('VLANs permitidas: deixe vazio (todas) ou liste os números, ex.: 10,20.'); return; } p.permitidas = v; }
        if (p && inp.dataset.campo === 'helper') { if (v && ipParaNumero(v) === null) { status(`"${v}" não é um IPv4 válido.`); return; } p.helper = v; }
        M.limparTabelas(est); status(''); desenharTudo();
    });
    $('.bc-config').addEventListener('submit', (ev) => {
        ev.preventDefault(); const f = ev.target; const a = ap(sel); if (!a) return;
        if (f.classList.contains('bc-novo-pool')) {
            const ini = f.inicio.value.trim(), fim = f.fim.value.trim(), pre = lerMascara(f.mascara.value), gw = f.gateway.value.trim(), dns = f.dns.value.trim();
            if (ipParaNumero(ini) === null || ipParaNumero(fim) === null || pre === null) { status('Pool: preencha primeiro IP, último IP e máscara (ex.: 192.168.10.100, 192.168.10.150, /24).'); return; }
            if (calcular(ini, pre).rede !== calcular(fim, pre).rede || ipParaNumero(fim) < ipParaNumero(ini)) { status('Pool: o primeiro e o último IP precisam estar na mesma rede, e o último depois do primeiro.'); return; }
            if ((gw && ipParaNumero(gw) === null) || (dns && ipParaNumero(dns) === null)) { status('Pool: gateway e DNS, se preenchidos, precisam ser IPv4 válidos.'); return; }
            a.servicoDhcp = a.servicoDhcp || { ativo: true, pools: [], concessoes: {} };
            a.servicoDhcp.pools.push({ inicio: ini, fim, prefixo: pre, gateway: gw, dns }); status(''); desenharTudo(); return;
        }
        if (f.classList.contains('bc-novo-dns')) {
            const nome = f.nome.value.trim().toLowerCase().replace(/\.$/, ''), ip = f.ip.value.trim();
            if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(nome) || ipParaNumero(ip) === null) { status('Registro DNS: um nome como www.exemplo.com e um IPv4.'); return; }
            a.servicoDns = a.servicoDns || { ativo: true, registros: {} }; a.servicoDns.registros[nome] = ip; status(''); desenharTudo(); return;
        }
        if (f.classList.contains('bc-nova-sub')) {
            const pf = M.porta(a, f.closest('[data-porta]').dataset.porta);
            const vl = Number(f.vlan.value), ip = f.ip.value.trim(), pre = lerMascara(f.mascara.value);
            if (!(vl >= 1 && vl <= 4094) || ipParaNumero(ip) === null || pre === null) { status('Subinterface: VLAN (1 a 4094), IP e máscara. Ex.: 10, 192.168.10.1, /24. No Cisco: interface g0/0.10 → encapsulation dot1Q 10 → ip address ...'); return; }
            if ((pf.subs || []).some(x => Number(x.vlan) === vl)) { status(`Já existe subinterface para a VLAN ${vl} nessa porta.`); return; }
            pf.subs = pf.subs || []; pf.subs.push({ nome: `${pf.nome}.${vl}`, vlan: vl, ip, prefixo: pre });
            M.limparTabelas(est); status(''); desenharTudo(); return;
        }
        if (!f.classList.contains('bc-nova-rota')) return;
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

    if (!salvo && !Object.keys(progresso()).length) iniciarMissao(MISSOES[0]); // primeira visita: tutorial
    else { desenharTudo(); desenharSim(); }
}
