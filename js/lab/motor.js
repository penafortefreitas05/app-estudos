// Laboratório FocoPro: motor da bancada de rede (fase 1, 25/11/2026).
// Simula o que acontece de verdade numa rede local e entre redes:
//  - switch: aprende MAC por porta (tabela MAC), encaminha ou inunda (broadcast/desconhecido)
//  - hosts e roteador: tabela ARP; ARP request em broadcast, ARP reply em unicast
//  - roteador: redes conectadas + rotas estáticas + rota padrão; decrementa TTL
//  - ping (ICMP echo), ipconfig, arp -a, tracert
// Tudo síncrono: cada envio gera uma lista de eventos que a tela anima no modo simulação.
import { ipParaNumero, eLocal, calcular, validar } from './ipv4.js';

export const TIPOS = {
    pc:         { nome: 'PC', portas: ['Fa0'], host: true, ttl: 128 },
    notebook:   { nome: 'Notebook', portas: ['Fa0'], host: true, ttl: 128 },
    servidor:   { nome: 'Servidor', portas: ['Fa0'], host: true, ttl: 128 },
    impressora: { nome: 'Impressora', portas: ['Fa0'], host: true, ttl: 64 },
    switch:     { nome: 'Switch', portas: ['Fa0/1', 'Fa0/2', 'Fa0/3', 'Fa0/4', 'Fa0/5', 'Fa0/6', 'Fa0/7', 'Fa0/8'], host: false },
    roteador:   { nome: 'Roteador', portas: ['Gi0/0', 'Gi0/1', 'Gi0/2'], host: false, roteia: true, ttl: 255 }
};

const BROADCAST = 'FF:FF:FF:FF:FF:FF';
let contadorMac = 0;
function novoMac() {
    contadorMac++;
    const h = (n) => n.toString(16).toUpperCase().padStart(2, '0');
    return `00:1A:2B:${h((contadorMac >> 16) & 255)}:${h((contadorMac >> 8) & 255)}:${h(contadorMac & 255)}`;
}

// ---------- montagem ----------
export function novaRede() { return { aparelhos: [], cabos: [] }; }

export function adicionarAparelho(rede, tipo, x = 0, y = 0) {
    const t = TIPOS[tipo]; if (!t) throw new Error('tipo desconhecido');
    const n = rede.aparelhos.filter(a => a.tipo === tipo).length + 1;
    let id; do { id = `${tipo}${Math.random().toString(36).slice(2, 7)}`; } while (rede.aparelhos.some(a => a.id === id));
    const a = {
        id, tipo, nome: `${t.nome}${n}`, x, y,
        portas: t.portas.map(p => ({ nome: p, mac: novoMac(), ip: '', prefixo: 24, ligada: true })),
        gateway: '', rotas: []
    };
    rede.aparelhos.push(a);
    return a;
}

export function removerAparelho(rede, id) {
    rede.aparelhos = rede.aparelhos.filter(a => a.id !== id);
    rede.cabos = rede.cabos.filter(c => c.a.id !== id && c.b.id !== id);
}

export const aparelho = (rede, id) => rede.aparelhos.find(a => a.id === id) || null;
export const porta = (a, nome) => (a && a.portas.find(p => p.nome === nome)) || null;
export function caboDa(rede, id, nomePorta) {
    return rede.cabos.find(c => (c.a.id === id && c.a.porta === nomePorta) || (c.b.id === id && c.b.porta === nomePorta)) || null;
}
export function portaLivre(rede, a) { return a.portas.find(p => !caboDa(rede, a.id, p.nome)) || null; }

export function ligar(rede, idA, portaA, idB, portaB) {
    if (idA === idB) return { erro: 'Não dá para ligar um aparelho nele mesmo.' };
    const a = aparelho(rede, idA), b = aparelho(rede, idB);
    if (!porta(a, portaA) || !porta(b, portaB)) return { erro: 'Porta inexistente.' };
    if (caboDa(rede, idA, portaA)) return { erro: `${a.nome} ${portaA} já tem cabo.` };
    if (caboDa(rede, idB, portaB)) return { erro: `${b.nome} ${portaB} já tem cabo.` };
    // Cabo direto entre tipos diferentes; cruzado entre iguais (o app escolhe, mas diz qual seria)
    const tipoDe = x => (TIPOS[x.tipo].host || x.tipo === 'roteador') ? 'fim' : 'switch';
    const cabo = { a: { id: idA, porta: portaA }, b: { id: idB, porta: portaB }, tipo: tipoDe(a) === tipoDe(b) ? 'cruzado' : 'direto' };
    rede.cabos.push(cabo);
    return { cabo };
}
export function desligarCabo(rede, cabo) { rede.cabos = rede.cabos.filter(c => c !== cabo); }

// ---------- estado de execução (tabelas aprendidas) ----------
// Fica fora do aparelho salvo: some ao reabrir o projeto, como num equipamento reiniciado.
export function novoEstado() { return { arp: {}, mac: {} }; }
function tabArp(est, id) { return est.arp[id] || (est.arp[id] = {}); }
function tabMac(est, id) { return est.mac[id] || (est.mac[id] = {}); }
export function limparTabelas(est) { est.arp = {}; est.mac = {}; }

// ---------- camada 3: de onde sai e para quem vai ----------
// Interfaces L3: portas com IP e, no roteador, subinterfaces (Gi0/0.10 = VLAN 10 pelo trunk) com a porta física ligada.
export function interfaces(a) {
    const lista = [];
    for (const p of a.portas) {
        lista.push(p);
        for (const s of (p.subs || [])) { s.fisica = p.nome; s.mac = p.mac; s.ligada = p.ligada; lista.push(s); }
    }
    return lista;
}
function interfacesIp(a) { return interfaces(a).filter(p => p.ip && ipParaNumero(p.ip) !== null && (p.fisica ? p.ligada : true)); }
function ifaceLocal(a, ip) {
    return interfacesIp(a).find(p => eLocal({ ip: p.ip, prefixo: p.prefixo }, ip)) || null;
}
function ehMeu(a, ip) { return interfaces(a).some(p => p.ip === ip); }

// Rota para o destino: { porta, proximo } ou { erro }
export function rotaPara(a, ip) {
    const local = ifaceLocal(a, ip);
    if (local) return { porta: local, proximo: ip, tipo: 'conectada' };
    if (TIPOS[a.tipo].roteia) {
        // rotas estáticas, da mais específica para a mais genérica (0.0.0.0/0 = rota padrão)
        const cand = (a.rotas || []).filter(r => eLocal({ ip: r.rede, prefixo: r.prefixo }, ip)).sort((x, y) => y.prefixo - x.prefixo);
        for (const r of cand) {
            const saida = ifaceLocal(a, r.proximo);
            if (saida) return { porta: saida, proximo: r.proximo, tipo: r.prefixo === 0 ? 'padrao' : 'estatica' };
        }
        return { erro: 'sem-rota' };
    }
    const p = interfacesIp(a)[0];
    if (!p) return { erro: 'sem-ip' };
    if (!a.gateway) return { erro: 'sem-gateway' };
    if (!eLocal({ ip: p.ip, prefixo: p.prefixo }, a.gateway)) return { erro: 'gateway-fora' };
    return { porta: p, proximo: a.gateway, tipo: 'gateway' };
}

// ---------- camada 2: um quadro atravessando cabos e switches ----------
// VLAN: porta de switch "access" pertence a uma VLAN (p.vlan, padrão 1); "trunk" leva várias, com etiqueta 802.1Q
// (VLAN 1 = nativa, vai sem etiqueta). O switch só encaminha dentro da mesma VLAN (domínio de broadcast).
const vlanDe = p => Number(p.vlan) || 1;
function trunkPermite(p, v) { const l = String(p.permitidas || '').trim(); if (!l || /^(all|todas)$/i.test(l)) return true; return l.split(/[\s,]+/).map(Number).includes(v); }
function portaNaVlan(p, v) { return p.modo === 'trunk' ? trunkPermite(p, v) : vlanDe(p) === v; }
// Retorna a lista de [aparelho, porta] que RECEBERAM o quadro (hosts/roteadores), registrando os eventos.
function transmitir(rede, est, origem, portaOrigem, quadro, ev, limite) {
    const recebidos = [];
    const fila = [{ id: origem.id, porta: portaOrigem.fisica || portaOrigem.nome, tag: portaOrigem.fisica ? (Number(portaOrigem.vlan) || null) : null }];
    while (fila.length) {
        const { id, porta: p, tag } = fila.shift();
        if (++limite.n > 200) { limite.tempestade = true; break; }
        const a0 = aparelho(rede, id), p0 = porta(a0, p);
        if (!p0 || !p0.ligada) continue;
        const cabo = caboDa(rede, id, p);
        if (!cabo) continue;
        const outro = cabo.a.id === id && cabo.a.porta === p ? cabo.b : cabo.a;
        const dest = aparelho(rede, outro.id), pd = porta(dest, outro.porta);
        const q = tag ? { ...quadro, vlan: tag } : quadro;
        if (!pd || !pd.ligada) { ev.push({ de: id, para: outro.id, quadro: q, perdido: 'porta desligada' }); continue; }
        if (dest.tipo === 'switch') {
            let v;
            if (pd.modo === 'trunk') { v = tag || 1; if (!trunkPermite(pd, v)) { ev.push({ de: id, para: outro.id, quadro: q, perdido: `VLAN ${v} não permitida no trunk` }); continue; } }
            else { v = vlanDe(pd); if (tag && tag !== v) { ev.push({ de: id, para: outro.id, quadro: q, perdido: `chegou com etiqueta da VLAN ${tag} numa porta access da VLAN ${v}` }); continue; } }
            ev.push({ de: id, para: outro.id, quadro: q });
            const t = tabMac(est, dest.id);
            t[`${v}|${quadro.origemMac}`] = outro.porta; // aprende de onde veio (por VLAN)
            const conhecida = quadro.destinoMac !== BROADCAST ? t[`${v}|${quadro.destinoMac}`] : null;
            if (conhecida === outro.porta) continue; // destino está do mesmo lado: o switch descarta
            const saidas = conhecida ? [porta(dest, conhecida)] : dest.portas.filter(x => x.nome !== outro.porta && portaNaVlan(x, v));
            if (!conhecida) dest.portas.filter(x => x.nome !== outro.porta && x.modo === 'trunk' && !trunkPermite(x, v)).forEach(x => {
                const c2 = caboDa(rede, dest.id, x.nome); if (!c2) return;
                const viz = c2.a.id === dest.id && c2.a.porta === x.nome ? c2.b.id : c2.a.id;
                ev.push({ de: dest.id, para: viz, quadro: { ...quadro, vlan: v }, perdido: `VLAN ${v} não permitida no trunk ${x.nome}` });
            });
            saidas.forEach(x => fila.push({ id: dest.id, porta: x.nome, tag: x.modo === 'trunk' && v !== 1 ? v : null }));
            continue;
        }
        ev.push({ de: id, para: outro.id, quadro: q });
        let pr = pd;
        if (tag) { // quadro com etiqueta: só uma subinterface daquela VLAN aceita
            pr = TIPOS[dest.tipo].roteia ? interfaces(dest).find(x => x.fisica === pd.nome && Number(x.vlan) === tag) : null;
            if (!pr) { ev[ev.length - 1].perdido = `${dest.nome} não tem subinterface para a VLAN ${tag}`; continue; }
        }
        if (quadro.destinoMac === BROADCAST || quadro.destinoMac === pr.mac) recebidos.push([dest, pr]);
    }
    return recebidos;
}

// Descobre o MAC de "ip" saindo pela porta "p" do aparelho "a" (ARP). Retorna o MAC ou null.
function resolverArp(rede, est, a, p, ip, ev, limite, avisos) {
    const t = tabArp(est, a.id);
    if (t[ip]) return t[ip];
    const pedido = { tipo: 'ARP', op: 'pedido', origemMac: p.mac, destinoMac: BROADCAST, origemIp: p.ip, alvoIp: ip,
        resumo: `ARP: quem tem ${ip}? Responda a ${p.ip}` };
    const quem = transmitir(rede, est, a, p, pedido, ev, limite).filter(([d, pd]) => pd.ip === ip);
    if (quem.length > 1) avisos.add(`Conflito de IP: ${quem.map(([d]) => d.nome).join(' e ')} usam ${ip}.`);
    for (const [d, pd] of quem) {
        tabArp(est, d.id)[p.ip] = p.mac; // quem responde também aprende o pedinte
        const resposta = { tipo: 'ARP', op: 'resposta', origemMac: pd.mac, destinoMac: p.mac, origemIp: ip, alvoIp: p.ip,
            resumo: `ARP: ${ip} está em ${pd.mac}` };
        const chegou = transmitir(rede, est, d, pd, resposta, ev, limite).some(([x, px]) => x.id === a.id && px.nome === p.nome);
        if (chegou) t[ip] = pd.mac;
    }
    return t[ip] || null;
}

// Envia um pacote IP de "a" até ip destino, passando por roteadores. Retorna { ok, chegouEm, ttl, motivo, saltos }
function enviarIp(rede, est, a, destinoIp, pacote, ev, limite, avisos, saltos = []) {
    if (ehMeu(a, destinoIp)) return { ok: true, chegouEm: a, ttl: pacote.ttl, saltos };
    const r = rotaPara(a, destinoIp);
    if (r.erro) return { ok: false, motivo: r.erro, em: a, saltos };
    const mac = resolverArp(rede, est, a, r.porta, r.proximo, ev, limite, avisos);
    if (!mac) return { ok: false, motivo: r.tipo === 'conectada' ? 'arp-sem-resposta' : 'gateway-sem-resposta', em: a, proximo: r.proximo, saltos };
    const quadro = { tipo: pacote.tipo, op: pacote.op, origemMac: r.porta.mac, destinoMac: mac, origemIp: pacote.origemIp, destinoIp, ttl: pacote.ttl,
        resumo: pacote.tipo === 'DHCP' ? `DHCP ${pacote.op} repassado (relay, unicast) ${pacote.origemIp} → ${destinoIp}`
            : `${pacote.tipo === 'ICMP' ? (pacote.echo === 'pedido' ? 'ICMP echo request' : 'ICMP echo reply') : pacote.tipo} ${pacote.origemIp} → ${destinoIp} (TTL ${pacote.ttl})` };
    const recebeu = transmitir(rede, est, a, r.porta, quadro, ev, limite).find(([d, pd]) => pd.mac === mac);
    if (!recebeu) return { ok: false, motivo: 'quadro-perdido', em: a, saltos };
    const [prox] = recebeu;
    if (ehMeu(prox, destinoIp)) return { ok: true, chegouEm: prox, ttl: pacote.ttl, saltos };
    if (!TIPOS[prox.tipo].roteia) return { ok: false, motivo: 'descartado', em: prox, saltos };
    const salto = { aparelho: prox, ip: recebeu[1].ip };
    if (pacote.ttl <= 1) return { ok: false, motivo: 'ttl-expirou', em: prox, saltos: [...saltos, salto] };
    return enviarIp(rede, est, prox, destinoIp, { ...pacote, ttl: pacote.ttl - 1 }, ev, limite, avisos, [...saltos, salto]);
}

const MOTIVO = {
    'sem-ip': 'o aparelho não tem endereço IP configurado',
    'sem-gateway': 'o destino é de outra rede e não há gateway configurado',
    'gateway-fora': 'o gateway está fora da sub-rede do aparelho',
    'sem-rota': 'o roteador não tem rota para essa rede',
    'arp-sem-resposta': 'ninguém respondeu ao ARP (o destino não existe nessa rede, está em outra VLAN, desligado ou sem cabo)',
    'gateway-sem-resposta': 'o gateway não respondeu ao ARP (não existe, está em outra VLAN, sem cabo ou porta desligada)',
    'quadro-perdido': 'o quadro se perdeu no caminho (cabo ou porta)',
    'descartado': 'o pacote chegou a um aparelho que não roteia',
    'ttl-expirou': 'o TTL chegou a zero (laço de roteamento)'
};


// ---------- DHCP (fase 3, 27/11/2026) ----------
// Host com a.dhcp = true pede IP. Servidor com a.servicoDhcp = { ativo, pools: [{ inicio, fim, prefixo, gateway, dns }], concessoes: { mac: ip } }.
// Porta de roteador com p.helper = IP do servidor repassa o pedido (relay, "ip helper-address").
// DORA: Discover (broadcast) → Offer → Request (broadcast) → Ack. Sem resposta: APIPA 169.254.x.y/16.
const IP_BROADCAST = '255.255.255.255';
function redeDoPool(pool) { const c = calcular(pool.inicio, pool.prefixo); return c.erro ? null : c.rede; }
function poolPara(servidor, ipReferencia) {
    const sv = servidor.servicoDhcp; if (!sv || !sv.ativo) return null;
    return (sv.pools || []).find(pl => { const c = calcular(ipReferencia, pl.prefixo); return !c.erro && c.rede === redeDoPool(pl); }) || null;
}
function ipsEmUso(rede) { return new Set(rede.aparelhos.flatMap(a => a.portas.map(p => p.ip).filter(Boolean))); }
function escolherIp(rede, servidor, pool, mac) {
    const sv = servidor.servicoDhcp; sv.concessoes = sv.concessoes || {};
    const ja = sv.concessoes[mac];
    if (ja && calcular(ja, pool.prefixo).rede === redeDoPool(pool)) return ja;
    const usados = ipsEmUso(rede); Object.values(sv.concessoes).forEach(ip => usados.add(ip));
    const a = ipParaNumero(pool.inicio), b = ipParaNumero(pool.fim);
    if (a === null || b === null || b < a) return null;
    for (let n = a; n <= b; n++) {
        const ip = [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
        const c = calcular(ip, pool.prefixo);
        if (c.eRede || c.eBroadcast || usados.has(ip)) continue;
        return ip;
    }
    return null; // pool esgotado
}
const quadroDhcp = (op, origemMac, destinoMac, origemIp, destinoIp, resumo) => ({ tipo: 'DHCP', op, origemMac, destinoMac, origemIp, destinoIp, ttl: 128, resumo });

// Leva uma mensagem DHCP do host até um servidor (direto no segmento ou via relay). Retorna { servidor, pool, relay } ou { motivo }.
function acharServidor(rede, est, host, p, op, ev, limite, avisos) {
    const q = quadroDhcp(op, p.mac, BROADCAST, '0.0.0.0', IP_BROADCAST, op === 'Discover' ? 'DHCP Discover: alguém aí tem um IP para mim? (broadcast)' : 'DHCP Request: quero o IP que me ofereceram (broadcast)');
    const recebidos = transmitir(rede, est, host, p, q, ev, limite);
    let motivo = 'sem-servidor';
    for (const [d, pd] of recebidos) {
        if (d.servicoDhcp && d.servicoDhcp.ativo) {
            const ref = pd.ip || (interfacesIp(d)[0] || {}).ip; const pool = ref && poolPara(d, ref);
            if (pool) return { servidor: d, porta: pd, pool, relay: null };
            motivo = 'sem-pool';
        }
        if (TIPOS[d.tipo].roteia && pd.helper && pd.ip) {
            const ida = enviarIp(rede, est, d, pd.helper, { tipo: 'DHCP', op, origemIp: pd.ip, ttl: 255 }, ev, limite, avisos);
            if (!ida.ok) { motivo = 'relay-sem-caminho'; continue; }
            const sv = ida.chegouEm;
            if (!sv.servicoDhcp || !sv.servicoDhcp.ativo) { motivo = 'relay-sem-servico'; continue; }
            const pool = poolPara(sv, pd.ip);
            if (!pool) { motivo = 'sem-pool'; continue; }
            return { servidor: sv, pool, relay: { roteador: d, porta: pd } };
        }
    }
    return { motivo };
}
// Resposta do servidor até o host (Offer/Ack). Retorna true se chegou.
function responder(rede, est, achado, host, p, op, ip, ev, limite, avisos) {
    const { servidor, relay } = achado;
    const resumo = op === 'Offer' ? `DHCP Offer: ofereço ${ip}` : `DHCP Ack: ${ip} é seu (concessão confirmada)`;
    if (!relay) {
        const ps = achado.porta;
        return transmitir(rede, est, servidor, ps, quadroDhcp(op, ps.mac, p.mac, ps.ip, ip, resumo), ev, limite).some(([x]) => x.id === host.id);
    }
    const volta = enviarIp(rede, est, servidor, relay.porta.ip, { tipo: 'DHCP', op, origemIp: (interfacesIp(servidor)[0] || {}).ip, ttl: 128 }, ev, limite, avisos);
    if (!volta.ok) return false;
    return transmitir(rede, est, relay.roteador, relay.porta, quadroDhcp(op, relay.porta.mac, p.mac, relay.porta.ip, ip, resumo + ' (repassado pelo roteador)'), ev, limite).some(([x]) => x.id === host.id);
}
const MOTIVO_DHCP = {
    'sem-servidor': 'nenhum servidor DHCP respondeu nesta rede (serviço desligado, sem cabo, ou o servidor está em outra rede sem relay no roteador)',
    'sem-pool': 'o servidor DHCP não tem pool para esta rede',
    'relay-sem-caminho': 'o roteador repassou o pedido, mas não alcança o servidor (confira o ip helper-address e as rotas)',
    'relay-sem-servico': 'o roteador repassou o pedido para um aparelho sem serviço DHCP ativo',
    'pool-esgotado': 'o pool do servidor acabou: todos os IPs já estão concedidos',
    'sem-resposta': 'a resposta do servidor não chegou ao aparelho'
};
function apipa(p) {
    const h = parseInt(p.mac.replace(/:/g, '').slice(-4), 16);
    return `169.254.${(h >> 8) % 254 + 1}.${(h & 255) % 254 + 1}`;
}
export function obterIp(rede, est, hostId) {
    const host = aparelho(rede, hostId); const p = host.portas[0];
    const ev = [], limite = { n: 0 }, avisos = new Set();
    p.ip = ''; host.gateway = '';
    const falhar = (motivo) => { p.ip = apipa(p); p.prefixo = 16; host.gateway = ''; return { ok: false, ip: p.ip, motivo, explicacao: MOTIVO_DHCP[motivo] || motivo, eventos: ev }; };
    const a1 = acharServidor(rede, est, host, p, 'Discover', ev, limite, avisos);
    if (!a1.servidor) return falhar(a1.motivo);
    const ip = escolherIp(rede, a1.servidor, a1.pool, p.mac);
    if (!ip) return falhar('pool-esgotado');
    if (!responder(rede, est, a1, host, p, 'Offer', ip, ev, limite, avisos)) return falhar('sem-resposta');
    const a2 = acharServidor(rede, est, host, p, 'Request', ev, limite, avisos);
    if (!a2.servidor) return falhar(a2.motivo);
    if (!responder(rede, est, a2, host, p, 'Ack', ip, ev, limite, avisos)) return falhar('sem-resposta');
    a1.servidor.servicoDhcp.concessoes[p.mac] = ip;
    p.ip = ip; p.prefixo = a1.pool.prefixo; host.gateway = a1.pool.gateway || ''; host.dns = a1.pool.dns || '';
    return { ok: true, ip, prefixo: p.prefixo, gateway: host.gateway, servidor: a1.servidor.nome, relay: a1.relay ? a1.relay.roteador.nome : null, eventos: ev };
}
export function liberarIp(rede, hostId) {
    const host = aparelho(rede, hostId); const p = host.portas[0];
    rede.aparelhos.forEach(a => { if (a.servicoDhcp && a.servicoDhcp.concessoes) delete a.servicoDhcp.concessoes[p.mac]; });
    p.ip = ''; host.gateway = '';
}
export function concessoes(rede, servidorId) {
    const sv = aparelho(rede, servidorId).servicoDhcp; const c = (sv && sv.concessoes) || {};
    const macParaNome = {}; rede.aparelhos.forEach(a => a.portas.forEach(p => { macParaNome[p.mac] = a.nome; }));
    return Object.entries(c).map(([mac, ip]) => ({ mac, ip, nome: macParaNome[mac] || '?' }));
}

// ---------- comandos do terminal ----------
export function ping(rede, est, origemId, destinoIp, vezes = 4) {
    const a = aparelho(rede, origemId);
    const linhas = [`Pinging ${destinoIp} with 32 bytes of data:`, ''];
    const tentativas = [];
    if (ipParaNumero(destinoIp) === null) return { linhas: [`Ping request could not find host ${destinoIp}. Please check the name and try again.`], tentativas, explicacao: 'Endereço IP inválido.' };
    // Origem do ping: num roteador, o IP da porta por onde o pacote sai (como no Cisco); nos demais, a única porta com IP.
    let pa = interfacesIp(a)[0];
    if (TIPOS[a.tipo].roteia) { const rt = rotaPara(a, destinoIp); if (rt.porta && rt.porta.ip) pa = rt.porta; }
    const problema = pa ? validar({ ip: pa.ip, prefixo: pa.prefixo, gateway: TIPOS[a.tipo].host ? a.gateway : '' }) : null;
    let ok = 0; const avisos = new Set(); let ultimoMotivo = null;
    for (let i = 0; i < vezes; i++) {
        const ev = [], limite = { n: 0 };
        const ida = enviarIp(rede, est, a, destinoIp, { tipo: 'ICMP', echo: 'pedido', origemIp: pa ? pa.ip : '', ttl: TIPOS[a.tipo].ttl || 128 }, ev, limite, avisos);
        let volta = null;
        if (ida.ok) {
            const resp = ida.chegouEm;
            const ipResp = destinoIp;
            volta = enviarIp(rede, est, resp, pa.ip, { tipo: 'ICMP', echo: 'resposta', origemIp: ipResp, ttl: TIPOS[resp.tipo].ttl || 128 }, ev, limite, avisos);
        }
        if (limite.tempestade) avisos.add('Laço entre switches: os cabos fecham um círculo e o broadcast fica rodando sem parar (tempestade de broadcast). Switches reais usam o STP para bloquear um dos caminhos; esta bancada ainda não simula STP.');
        const sucesso = ida.ok && volta && volta.ok;
        if (sucesso) { ok++; linhas.push(`Reply from ${destinoIp}: bytes=32 time<1ms TTL=${volta.ttl}`); }
        else {
            const m = !ida.ok ? ida : volta;
            ultimoMotivo = { lado: !ida.ok ? 'ida' : 'volta', ...m };
            if (m.motivo === 'sem-ip' || (m.motivo === 'sem-gateway' && m.em === a) || (m.motivo === 'gateway-fora' && m.em === a)) linhas.push('PING: transmit failed. General failure.');
            // O aviso "unreachable" só chega se a falha foi na ida (o roteador sabe voltar à origem).
            // Falha na volta = a resposta some no caminho: o PC só vê o tempo esgotar.
            else if (!ida.ok && m.motivo === 'sem-rota' && m.em && TIPOS[m.em.tipo].roteia) { const r0 = pa ? rotaPara(m.em, pa.ip) : {}; const ipAviso = (r0.porta && r0.porta.ip) || (interfacesIp(m.em)[0] || {}).ip; linhas.push(`Reply from ${ipAviso}: Destination host unreachable.`); }
            else linhas.push('Request timed out.');
        }
        tentativas.push({ eventos: ev, sucesso });
    }
    linhas.push('', `Ping statistics for ${destinoIp}:`, `    Packets: Sent = ${vezes}, Received = ${ok}, Lost = ${vezes - ok} (${Math.round(((vezes - ok) * 100) / vezes)}% loss)`);
    let explicacao;
    if (ok === vezes) explicacao = 'Ida e volta funcionaram.';
    else if (ultimoMotivo) {
        const onde = ultimoMotivo.em ? ultimoMotivo.em.nome : a.nome;
        explicacao = `${ultimoMotivo.lado === 'volta' ? 'O pedido chegou, mas a resposta não voltou: ' : ''}${onde}: ${MOTIVO[ultimoMotivo.motivo] || ultimoMotivo.motivo}.`;
    }
    if (problema && ok < vezes) explicacao = `${explicacao} (${problema.texto})`;
    return { linhas, tentativas, ok, explicacao, avisos: [...avisos] };
}

export function ipconfig(rede, id) {
    const a = aparelho(rede, id);
    const out = [];
    for (const p of interfaces(a)) {
        if (!p.ip && TIPOS[a.tipo].host === false) continue;
        const c = p.ip ? calcular(p.ip, p.prefixo) : null;
        out.push(`${TIPOS[a.tipo].host ? 'Ethernet adapter' : 'Interface'} ${p.nome}:`, '',
            `   Physical Address. . . . . . . . : ${p.mac}`,
            `   IPv4 Address. . . . . . . . . . : ${p.ip || '0.0.0.0'}`,
            `   Subnet Mask . . . . . . . . . . : ${c && !c.erro ? c.mascara : '0.0.0.0'}`);
        if (TIPOS[a.tipo].host) out.push(`   Default Gateway . . . . . . . . : ${a.gateway || '0.0.0.0'}`);
        if (TIPOS[a.tipo].host && a.dhcp) out.push(`   DHCP Enabled. . . . . . . . . . : Yes${/^169\.254\./.test(p.ip) ? '   (sem resposta do DHCP: endereço automático APIPA)' : ''}`);
        out.push('');
    }
    return out.length ? out : ['Nenhuma interface com IP.'];
}

export function arpA(est, rede, id) {
    const t = tabArp(est, id); const ips = Object.keys(t);
    if (!ips.length) return ['No ARP Entries Found.'];
    const a = aparelho(rede, id), p = interfacesIp(a)[0];
    return [`Interface: ${p ? p.ip : '?'}`, '  Internet Address      Physical Address      Type',
        ...ips.map(ip => `  ${ip.padEnd(22)}${t[ip].padEnd(22)}dynamic`)];
}

export function tabelaMac(est, rede, id) {
    const t = tabMac(est, id); const macs = Object.keys(t);
    if (!macs.length) return ['Tabela MAC vazia (o switch ainda não viu nenhum quadro).'];
    return ['          Mac Address Table', '-------------------------------------------', 'Vlan    Mac Address          Ports',
        ...macs.map(k => { const [v, m] = k.includes('|') ? k.split('|') : ['1', k]; return `${v.padEnd(8)}${m.padEnd(21)}${t[k]}`; })];
}
export function vlanBrief(rede, id) {
    const a = aparelho(rede, id); const vs = {};
    a.portas.filter(p => p.modo !== 'trunk').forEach(p => { const v = Number(p.vlan) || 1; (vs[v] = vs[v] || []).push(p.nome); });
    const linhas = ['VLAN Name      Status  Ports', '---- --------- ------- ----------------'];
    Object.keys(vs).map(Number).sort((x, y) => x - y).forEach(v => linhas.push(`${String(v).padEnd(5)}${(v === 1 ? 'default' : 'VLAN' + String(v).padStart(4, '0')).padEnd(10)}active  ${vs[v].join(', ')}`));
    const trunks = a.portas.filter(p => p.modo === 'trunk');
    if (trunks.length) linhas.push('', 'Trunks (802.1Q): ' + trunks.map(p => `${p.nome} (VLANs ${String(p.permitidas || '').trim() || 'todas'})`).join(', '));
    return linhas;
}

export function tracert(rede, est, origemId, destinoIp) {
    const a = aparelho(rede, origemId);
    const ev = [], limite = { n: 0 }, avisos = new Set();
    const pa = interfacesIp(a)[0];
    const r = enviarIp(rede, est, a, destinoIp, { tipo: 'ICMP', echo: 'pedido', origemIp: pa ? pa.ip : '', ttl: 30 }, ev, limite, avisos);
    const linhas = [`Tracing route to ${destinoIp} over a maximum of 30 hops:`, ''];
    let n = 0;
    for (const s of r.saltos) {
        n++;
        linhas.push(`  ${n}   <1 ms   <1 ms   <1 ms   ${s.ip}`);
    }
    if (r.ok) linhas.push(`  ${n + 1}   <1 ms   <1 ms   <1 ms   ${destinoIp}`, '', 'Trace complete.');
    else linhas.push(`  ${n + 1}     *        *        *     Request timed out.`, '', `Parou: ${MOTIVO[r.motivo] || r.motivo}.`);
    return { linhas, eventos: ev };
}

// ---------- salvar e abrir ----------
export function serializar(rede) { return JSON.parse(JSON.stringify(rede)); }
export function carregar(dados) {
    const r = novaRede();
    if (dados && Array.isArray(dados.aparelhos)) r.aparelhos = dados.aparelhos;
    if (dados && Array.isArray(dados.cabos)) r.cabos = dados.cabos;
    // MACs únicos depois de abrir (o contador recomeça a cada sessão)
    const maior = r.aparelhos.flatMap(a => a.portas.map(p => parseInt(p.mac.split(':').slice(3).join(''), 16) || 0));
    contadorMac = Math.max(contadorMac, ...maior, 0);
    return r;
}
