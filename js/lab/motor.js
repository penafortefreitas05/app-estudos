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
function interfacesIp(a) { return a.portas.filter(p => p.ip && ipParaNumero(p.ip) !== null); }
function ifaceLocal(a, ip) {
    return interfacesIp(a).find(p => eLocal({ ip: p.ip, prefixo: p.prefixo }, ip)) || null;
}
function ehMeu(a, ip) { return a.portas.some(p => p.ip === ip); }

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
// Retorna a lista de [aparelho, porta] que RECEBERAM o quadro (hosts/roteadores), registrando os eventos.
function transmitir(rede, est, origem, portaOrigem, quadro, ev, limite) {
    const recebidos = [];
    const fila = [{ id: origem.id, porta: portaOrigem.nome }];
    while (fila.length) {
        const { id, porta: p } = fila.shift();
        if (++limite.n > 200) { limite.tempestade = true; break; }
        const a0 = aparelho(rede, id), p0 = porta(a0, p);
        if (!p0 || !p0.ligada) continue;
        const cabo = caboDa(rede, id, p);
        if (!cabo) continue;
        const outro = cabo.a.id === id && cabo.a.porta === p ? cabo.b : cabo.a;
        const dest = aparelho(rede, outro.id), pd = porta(dest, outro.porta);
        if (!pd || !pd.ligada) { ev.push({ de: id, para: outro.id, quadro, perdido: 'porta desligada' }); continue; }
        ev.push({ de: id, para: outro.id, quadro });
        if (dest.tipo === 'switch') {
            const t = tabMac(est, dest.id);
            t[quadro.origemMac] = outro.porta; // aprende de onde veio
            const saida = quadro.destinoMac !== BROADCAST ? t[quadro.destinoMac] : null;
            const portas = saida ? [saida] : dest.portas.map(x => x.nome).filter(n => n !== outro.porta);
            if (saida === outro.porta) continue; // destino está do mesmo lado: o switch descarta
            portas.forEach(n => fila.push({ id: dest.id, porta: n }));
        } else if (quadro.destinoMac === BROADCAST || quadro.destinoMac === pd.mac) {
            recebidos.push([dest, pd]);
        }
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
    const quadro = { tipo: pacote.tipo, origemMac: r.porta.mac, destinoMac: mac, origemIp: pacote.origemIp, destinoIp, ttl: pacote.ttl,
        resumo: `${pacote.tipo === 'ICMP' ? (pacote.echo === 'pedido' ? 'ICMP echo request' : 'ICMP echo reply') : pacote.tipo} ${pacote.origemIp} → ${destinoIp} (TTL ${pacote.ttl})` };
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
    'arp-sem-resposta': 'ninguém respondeu ao ARP (o destino não existe nessa rede, está desligado ou sem cabo)',
    'gateway-sem-resposta': 'o gateway não respondeu ao ARP (não existe, sem cabo ou porta desligada)',
    'quadro-perdido': 'o quadro se perdeu no caminho (cabo ou porta)',
    'descartado': 'o pacote chegou a um aparelho que não roteia',
    'ttl-expirou': 'o TTL chegou a zero (laço de roteamento)'
};

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
    for (const p of a.portas) {
        if (!p.ip && TIPOS[a.tipo].host === false) continue;
        const c = p.ip ? calcular(p.ip, p.prefixo) : null;
        out.push(`${TIPOS[a.tipo].host ? 'Ethernet adapter' : 'Interface'} ${p.nome}:`, '',
            `   Physical Address. . . . . . . . : ${p.mac}`,
            `   IPv4 Address. . . . . . . . . . : ${p.ip || '0.0.0.0'}`,
            `   Subnet Mask . . . . . . . . . . : ${c && !c.erro ? c.mascara : '0.0.0.0'}`);
        if (TIPOS[a.tipo].host) out.push(`   Default Gateway . . . . . . . . : ${a.gateway || '0.0.0.0'}`);
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
    return ['          Mac Address Table', '-------------------------------------------', 'Mac Address          Ports',
        ...macs.map(m => `${m.padEnd(21)}${t[m]}`)];
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
