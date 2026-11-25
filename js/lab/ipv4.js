// Laboratório (piloto): simulador de sub-rede IPv4. Só lógica, sem tela (a tela vem em lab-subrede-tela.js).
// Regra pedida pela sala Design (25/11): a comunicação depende da conta dos DOIS lados.
// Cada aparelho tem IP, prefixo e gateway; o ping só funciona se a ida E a volta funcionarem.
// Modelo do cenário: uma única rede física (um switch) e, opcionalmente, um roteador ligado a ela.

export function ipParaNumero(ip) {
    const partes = String(ip || '').trim().split('.');
    if (partes.length !== 4) return null;
    let n = 0;
    for (const p of partes) {
        if (!/^\d{1,3}$/.test(p)) return null;
        const v = Number(p);
        if (v > 255) return null;
        n = n * 256 + v;
    }
    return n;
}

export function numeroParaIp(n) {
    return [24, 16, 8, 0].map(s => Math.floor(n / 2 ** s) % 256).join('.');
}

export function mascaraDoPrefixo(prefixo) {
    const p = Number(prefixo);
    if (!Number.isInteger(p) || p < 0 || p > 32) return null;
    return p === 0 ? 0 : (2 ** 32 - 2 ** (32 - p));
}

export function prefixoDaMascara(mascara) {
    const n = ipParaNumero(mascara);
    if (n === null) return null;
    for (let p = 0; p <= 32; p++) if (mascaraDoPrefixo(p) === n) return p;
    return null; // máscara com zeros no meio (ex.: 255.0.255.0) não é válida
}

// Usa só operações aritméticas (sem bit a bit), porque em JavaScript o & de 32 bits fica com sinal.
function eBit(a, m) {
    let r = 0;
    for (let s = 31; s >= 0; s--) {
        const peso = 2 ** s;
        const bitA = Math.floor(a / peso) % 2, bitM = Math.floor(m / peso) % 2;
        if (bitA && bitM) r += peso;
    }
    return r;
}

// Rede, broadcast, primeiro e último host, hosts utilizáveis
export function calcular(ip, prefixo) {
    const n = ipParaNumero(ip), m = mascaraDoPrefixo(prefixo);
    if (n === null) return { erro: 'ip-invalido' };
    if (m === null) return { erro: 'mascara-invalida' };
    const rede = eBit(n, m);
    const tamanho = 2 ** (32 - prefixo);
    const broadcast = rede + tamanho - 1;
    const hosts = prefixo >= 31 ? (prefixo === 31 ? 2 : 1) : tamanho - 2;
    const primeiro = prefixo >= 31 ? rede : rede + 1;
    const ultimo = prefixo >= 31 ? broadcast : broadcast - 1;
    return {
        ip: numeroParaIp(n), prefixo, mascara: numeroParaIp(m),
        rede: numeroParaIp(rede), broadcast: numeroParaIp(broadcast),
        primeiro: numeroParaIp(primeiro), ultimo: numeroParaIp(ultimo), hosts,
        eRede: prefixo < 31 && n === rede, eBroadcast: prefixo < 31 && n === broadcast
    };
}

// Os 32 bits em 4 octetos, marcando quais são de rede (para o "Ver cálculo completo")
export function bits(ip, prefixo) {
    const n = ipParaNumero(ip);
    if (n === null) return null;
    const s = n.toString(2).padStart(32, '0');
    return [0, 1, 2, 3].map(o => ({
        octeto: Math.floor(n / 2 ** (24 - 8 * o)) % 256,
        bits: [...s.slice(8 * o, 8 * o + 8)].map((b, i) => ({ b, rede: 8 * o + i < prefixo }))
    }));
}

// O aparelho A considera o endereço X dentro da sua própria sub-rede?
export function eLocal(a, ipX) {
    const x = ipParaNumero(ipX), m = mascaraDoPrefixo(a.prefixo), n = ipParaNumero(a.ip);
    if (x === null || m === null || n === null) return false;
    return eBit(x, m) === eBit(n, m);
}

// Problemas de configuração de um aparelho (antes de qualquer ping)
export function validar(a) {
    const c = calcular(a.ip, a.prefixo);
    if (c.erro === 'ip-invalido') return { erro: 'ip-invalido', texto: `"${a.ip}" não é um endereço IPv4 válido (4 números de 0 a 255).` };
    if (c.erro) return { erro: c.erro, texto: 'Máscara inválida.' };
    if (c.eRede) return { erro: 'ip-de-rede', texto: `${a.ip} é o endereço da própria rede (${c.rede}/${a.prefixo}); não pode ser usado por um aparelho.` };
    if (c.eBroadcast) return { erro: 'ip-de-broadcast', texto: `${a.ip} é o broadcast da rede; não pode ser usado por um aparelho.` };
    if (a.gateway) {
        if (ipParaNumero(a.gateway) === null) return { erro: 'gateway-invalido', texto: `Gateway "${a.gateway}" não é um IPv4 válido.` };
        if (!eLocal(a, a.gateway)) return { erro: 'gateway-fora-da-rede', texto: `O gateway ${a.gateway} está fora da sub-rede ${c.rede}/${a.prefixo}: o aparelho não consegue alcançá-lo diretamente.` };
    }
    return null;
}

// Um sentido do caminho (de A até o IP de B), na mesma rede física com um roteador opcional
function umSentido(a, b, aparelhos) {
    const pb = validar(a);
    // Gateway errado só atrapalha quem precisa sair da sub-rede; entrega local continua funcionando
    if (pb && !pb.erro.startsWith('gateway')) return { ok: false, motivo: pb.erro, texto: `${a.nome}: ${pb.texto}` };
    if (eLocal(a, b.ip)) {
        // Entrega direta: A pergunta por ARP "quem tem o IP de B?" e B responde (mesmo cabo/switch)
        return { ok: true, via: 'direto', texto: `${a.nome} considera ${b.ip} local: pergunta o MAC por ARP e entrega pelo switch.` };
    }
    if (pb) return { ok: false, motivo: pb.erro, texto: `${a.nome}: ${pb.texto}` };
    if (!a.gateway) return { ok: false, motivo: 'sem-gateway', texto: `${a.nome} considera ${b.ip} de outra rede e não tem gateway configurado: não tem para onde mandar.` };
    const roteador = aparelhos.find(x => x.tipo === 'roteador' && x.ip === a.gateway);
    if (!roteador) return { ok: false, motivo: 'gateway-inexistente', texto: `${a.nome} manda para o gateway ${a.gateway}, mas nenhum roteador tem esse endereço: o ARP fica sem resposta.` };
    if (!eLocal(roteador, b.ip)) return { ok: false, motivo: 'roteador-sem-rota', texto: `O roteador ${roteador.ip} não conhece a rede de ${b.ip}.` };
    return { ok: true, via: 'roteador', texto: `${a.nome} manda para o gateway ${roteador.ip}, que entrega a ${b.nome}.` };
}

// Ping de A para B: ida (A→B) e volta (B→A) precisam funcionar
export function ping(a, b, aparelhos = []) {
    const ida = umSentido(a, b, aparelhos);
    const volta = ida.ok ? umSentido(b, a, aparelhos) : null;
    const ok = ida.ok && volta.ok;
    let resumo;
    if (ok) resumo = `Resposta de ${b.ip}: a ida e a volta funcionam.`;
    else if (!ida.ok) resumo = `Falhou na ida. ${ida.texto}`;
    else resumo = `O pedido chega a ${b.nome}, mas a resposta não volta. ${volta.texto}`;
    return { ok, ida, volta, resumo };
}
