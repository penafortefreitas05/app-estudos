// Laboratório FocoPro, fase 2: missões com verificação automática (Projeto 1, escritório da Ana).
// Cada missão: começa de uma rede pronta (ou vazia), lista objetivos que o app confere sozinho
// e termina com uma pergunta de "por quê", no estilo da prova.
import * as M from './motor.js';
import { calcular, ipParaNumero } from './ipv4.js';

// ---------- redes de partida ----------
export function redeEscritorio(ajuste) {
    const r = M.novaRede();
    const sw = M.adicionarAparelho(r, 'switch', 320, 220); sw.nome = 'SW-Escritorio';
    [[90, 90, 'PC1', '192.168.10.11'], [90, 220, 'PC2', '192.168.10.12'], [90, 350, 'PC3', '192.168.10.13']].forEach(([x, y, n, ip], i) => {
        const p = M.adicionarAparelho(r, 'pc', x, y); p.nome = n; p.portas[0].ip = ip; M.ligar(r, p.id, 'Fa0', sw.id, `Fa0/${i + 1}`);
    });
    const imp = M.adicionarAparelho(r, 'impressora', 495, 220); imp.nome = 'Impressora'; imp.portas[0].ip = '192.168.10.20';
    M.ligar(r, imp.id, 'Fa0', sw.id, 'Fa0/4');
    if (ajuste) ajuste(r, nome => r.aparelhos.find(a => a.nome === nome));
    return r;
}


// Projeto 2: Administrativo (192.168.10.0/24) em cima, Financeiro (192.168.20.0/24) embaixo.
// comRoteador=false: os dois setores prontos, sem roteador e sem gateway (o aluno liga).
export function redeDoisSetores(comRoteador = true, ajuste) {
    const r = M.novaRede();
    const sa = M.adicionarAparelho(r, 'switch', 250, 125); sa.nome = 'SW-Adm';
    const sf = M.adicionarAparelho(r, 'switch', 250, 315); sf.nome = 'SW-Fin';
    const host = (tipo, x, y, nome, ip, sw, porta, gw) => { const h = M.adicionarAparelho(r, tipo, x, y); h.nome = nome; h.portas[0].ip = ip; h.gateway = comRoteador ? gw : ''; M.ligar(r, h.id, 'Fa0', sw.id, porta); return h; };
    host('pc', 60, 30, 'Adm1', '192.168.10.11', sa, 'Fa0/1', '192.168.10.1');
    host('pc', 440, 30, 'Adm2', '192.168.10.12', sa, 'Fa0/2', '192.168.10.1');
    host('pc', 60, 400, 'Fin1', '192.168.20.11', sf, 'Fa0/1', '192.168.20.1');
    host('servidor', 440, 400, 'Servidor', '192.168.20.10', sf, 'Fa0/2', '192.168.20.1');
    if (comRoteador) {
        const ro = M.adicionarAparelho(r, 'roteador', 250, 220); ro.nome = 'R1';
        ro.portas[0].ip = '192.168.10.1'; ro.portas[1].ip = '192.168.20.1';
        M.ligar(r, sa.id, 'Fa0/8', ro.id, 'Gi0/0'); M.ligar(r, sf.id, 'Fa0/8', ro.id, 'Gi0/1');
    }
    if (ajuste) ajuste(r, nome => r.aparelhos.find(a => a.nome === nome));
    return r;
}


// Projeto 3: Matriz (192.168.10.0/24) à esquerda, Filial (192.168.30.0/24) à direita,
// roteadores ligados por um link 10.0.0.0/30. opcoes: { link, rotas } controlam o que já vem pronto.
export function redeDuasFiliais(opcoes = {}, ajuste) {
    const { link = true, rotas = true } = opcoes;
    const r = M.novaRede();
    const sm = M.adicionarAparelho(r, 'switch', 95, 200); sm.nome = 'SW-Matriz';
    const sf = M.adicionarAparelho(r, 'switch', 400, 200); sf.nome = 'SW-Filial';
    const rm = M.adicionarAparelho(r, 'roteador', 150, 350); rm.nome = 'R-Matriz';
    const rf = M.adicionarAparelho(r, 'roteador', 350, 350); rf.nome = 'R-Filial';
    const host = (tipo, x, y, nome, ip, sw, porta, gw) => { const h = M.adicionarAparelho(r, tipo, x, y); h.nome = nome; h.portas[0].ip = ip; h.gateway = gw; M.ligar(r, h.id, 'Fa0', sw.id, porta); return h; };
    host('pc', 10, 50, 'M1', '192.168.10.11', sm, 'Fa0/1', '192.168.10.1');
    host('servidor', 170, 50, 'Servidor', '192.168.10.10', sm, 'Fa0/2', '192.168.10.1');
    host('pc', 330, 50, 'F1', '192.168.30.11', sf, 'Fa0/1', '192.168.30.1');
    host('pc', 480, 50, 'F2', '192.168.30.12', sf, 'Fa0/2', '192.168.30.1');
    rm.portas[0].ip = '192.168.10.1'; rf.portas[0].ip = '192.168.30.1';
    M.ligar(r, sm.id, 'Fa0/8', rm.id, 'Gi0/0'); M.ligar(r, sf.id, 'Fa0/8', rf.id, 'Gi0/0');
    if (link) {
        rm.portas[1].ip = '10.0.0.1'; rm.portas[1].prefixo = 30; rf.portas[1].ip = '10.0.0.2'; rf.portas[1].prefixo = 30;
        M.ligar(r, rm.id, 'Gi0/1', rf.id, 'Gi0/1');
    }
    if (rotas) {
        rm.rotas = [{ rede: '192.168.30.0', prefixo: 24, proximo: '10.0.0.2' }];
        rf.rotas = [{ rede: '192.168.10.0', prefixo: 24, proximo: '10.0.0.1' }];
    }
    if (ajuste) ajuste(r, nome => r.aparelhos.find(a => a.nome === nome));
    return r;
}


// Projeto 4 (DHCP): o escritório da Ana com um servidor DHCP (192.168.10.5) na Fa0/5.
// opcoes: { servico, pool: [inicio, fim], pcsDhcp, notebook } — o que já vem pronto.
export function redeDhcp(opcoes = {}, ajuste) {
    const { servico = true, pool = ['192.168.10.100', '192.168.10.150'], pcsDhcp = true, notebook = false } = opcoes;
    const r = redeEscritorio();
    const n = nome => r.aparelhos.find(a => a.nome === nome);
    const sw = n('SW-Escritorio');
    const sv = M.adicionarAparelho(r, 'servidor', 320, 400); sv.nome = 'Servidor'; sv.portas[0].ip = '192.168.10.5';
    M.ligar(r, sv.id, 'Fa0', sw.id, 'Fa0/5');
    sv.servicoDhcp = { ativo: servico, pools: pool ? [{ inicio: pool[0], fim: pool[1], prefixo: 24, gateway: '', dns: '' }] : [], concessoes: {} };
    ['PC1', 'PC2', 'PC3'].forEach(x => { const h = n(x); h.portas[0].ip = ''; h.dhcp = pcsDhcp; });
    if (notebook) { const nb = M.adicionarAparelho(r, 'notebook', 495, 400); nb.nome = 'Note-Ana'; nb.dhcp = true; M.ligar(r, nb.id, 'Fa0', sw.id, 'Fa0/6'); }
    if (ajuste) ajuste(r, n, 'antes');
    const est = M.novoEstado();
    r.aparelhos.filter(a => a.dhcp && a.nome !== 'Note-Ana').forEach(a => M.obterIp(r, est, a.id));
    if (ajuste) ajuste(r, n, 'depois');
    const nb = n('Note-Ana'); if (nb) M.obterIp(r, est, nb.id);
    return r;
}
// Projeto 4, segunda parte: os dois setores do Projeto 2 com o servidor DHCP no Financeiro.
export function redeDhcpSetores(opcoes = {}, ajuste) {
    const { poolAdm = false, helper = false, gwAdm = '192.168.10.1' } = opcoes;
    const r = redeDoisSetores(true);
    const n = nome => r.aparelhos.find(a => a.nome === nome);
    const sv = n('Servidor');
    sv.servicoDhcp = { ativo: true, pools: [{ inicio: '192.168.20.100', fim: '192.168.20.150', prefixo: 24, gateway: '192.168.20.1', dns: '' }], concessoes: {} };
    if (poolAdm) sv.servicoDhcp.pools.push({ inicio: '192.168.10.100', fim: '192.168.10.150', prefixo: 24, gateway: gwAdm, dns: '' });
    if (helper) n('R1').portas[0].helper = '192.168.20.10';
    ['Adm1', 'Adm2', 'Fin1'].forEach(x => { const h = n(x); h.dhcp = true; h.portas[0].ip = ''; h.gateway = ''; });
    if (ajuste) ajuste(r, n);
    const est = M.novoEstado();
    ['Fin1', 'Adm1', 'Adm2'].forEach(x => M.obterIp(r, est, n(x).id));
    return r;
}

// ---------- verificações ----------
const hosts = r => r.aparelhos.filter(a => M.TIPOS[a.tipo].host);
const ipDe = a => (a.portas[0] || {}).ip || '';
// Testa em silêncio, com tabelas novas (não mexe no que o aluno vê no terminal).
function conversam(r, a, b) {
    if (!ipDe(b)) return false;
    const res = M.ping(r, M.novoEstado(), a.id, ipDe(b), 2);
    return res.ok > 0;
}
export function todosConversam(r) {
    const hs = hosts(r); if (hs.length < 2) return false;
    for (let i = 0; i < hs.length; i++) for (let j = i + 1; j < hs.length; j++) if (!conversam(r, hs[i], hs[j]) || !conversam(r, hs[j], hs[i])) return false;
    return true;
}
function linkEntreRoteadores(r) {
    for (const c of r.cabos) {
        const A = M.aparelho(r, c.a.id), B = M.aparelho(r, c.b.id);
        if (A && B && A.tipo === 'roteador' && B.tipo === 'roteador') return [M.porta(A, c.a.porta), M.porta(B, c.b.porta)];
    }
    return null;
}
function temRotaUtil(r, nomeRoteador, destino) {
    const ro = r.aparelhos.find(a => a.nome === nomeRoteador); if (!ro) return false;
    const rt = M.rotaPara(ro, destino);
    return !rt.erro && rt.tipo !== 'conectada';
}
const servidorDhcp = r => r.aparelhos.find(a => a.servicoDhcp);
const noPool = (r, ip) => { const sv = servidorDhcp(r); if (!sv || !ip) return false; const n = ipParaNumero(ip); return (sv.servicoDhcp.pools || []).some(pl => n >= ipParaNumero(pl.inicio) && n <= ipParaNumero(pl.fim)); };
const pegouDhcp = (r, nome) => { const h = r.aparelhos.find(a => a.nome === nome); return !!h && !!h.dhcp && noPool(r, ipDe(h)) && !/^169\.254\./.test(ipDe(h)); };
const pingDe = (ctx, filtro) => ctx.comandos.some(c => c.cmd === 'ping' && filtro(c));
const nomeDoIp = (r, ip) => (hosts(r).find(h => ipDe(h) === ip) || {}).nome;

// ---------- as missões ----------
export const MISSOES = [
    {
        id: 'p0-primeiros-passos', grupo: 'Comece aqui', titulo: 'Primeiros passos na bancada', tipo: 'tutorial',
        historia: 'Um passo por vez: o cartão mostra o que fazer agora. Cada passo vira ✓ quando você consegue.',
        inicio: () => M.novaRede(),
        objetivos: [
            { fixo: true, texto: 'Ponha um PC na bancada', como: 'Na coluna da esquerda, clique em "PC".', ok: ({ rede }) => rede.aparelhos.some(a => a.tipo === 'pc') },
            { fixo: true, texto: 'Arraste o PC para outro lugar', como: 'Clique no PC e, sem soltar o botão, leve para outro ponto da área escura.', ok: ({ acoes }) => !!acoes.moveu },
            { fixo: true, texto: 'Ponha um switch', como: 'Clique em "Switch" na esquerda. Ele é o aparelho que liga vários PCs numa rede local.', ok: ({ rede }) => rede.aparelhos.some(a => a.tipo === 'switch') },
            { fixo: true, texto: 'Ligue o PC ao switch com um cabo', como: 'Clique em 🔌 Cabo (no alto) → clique no PC → escolha Fa0 → clique no switch → escolha Fa0/1.', ok: ({ rede }) => rede.cabos.length >= 1 },
            { fixo: true, texto: 'Ponha um segundo PC e ligue no switch também', como: 'Clique em "PC" de novo, depois 🔌 Cabo: PC2 Fa0 → switch Fa0/2.', ok: ({ rede }) => rede.aparelhos.filter(a => a.tipo === 'pc' && M.caboDa(rede, a.id, 'Fa0')).length >= 2 },
            { fixo: true, texto: 'Dê um IP a cada PC, na mesma rede', como: 'Clique no PC1. À direita, em IP digite 192.168.1.1 e em Máscara /24, e aperte Tab. No PC2: 192.168.1.2 e /24.', ok: ({ rede }) => { const ps = rede.aparelhos.filter(a => a.tipo === 'pc' && a.portas[0].ip); if (ps.length < 2) return false; const c = ps.map(p => calcular(p.portas[0].ip, p.portas[0].prefixo)); return c[0].rede === c[1].rede && ps[0].portas[0].ip !== ps[1].portas[0].ip; } },
            { fixo: true, texto: 'Faça um ping de um PC para o outro', como: 'Com o PC1 selecionado, clique no terminal (embaixo à direita), digite ping 192.168.1.2 e Enter. "Reply from" = chegou e voltou.', ok: ({ comandos }) => comandos.some(c => c.cmd === 'ping' && c.ok > 0) },
            { fixo: true, texto: 'Desligue uma porta e veja a luz ficar vermelha', como: 'Clique no switch. Na porta Fa0/2, desmarque "ligada". Repare na luz do cabo. Rode o ping de novo no PC1: agora falha.', ok: ({ rede }) => rede.aparelhos.some(a => a.portas.some(p => !p.ligada)) },
            { fixo: true, texto: 'Ligue a porta de volta', como: 'No switch, marque "ligada" de novo na Fa0/2. A luz volta a ficar verde.', ok: ({ rede, feitos }) => feitos.has(7) && rede.aparelhos.every(a => a.portas.every(p => p.ligada)) },
            { fixo: true, texto: 'Veja o pacote andar no modo Simulação', como: 'No alto, clique em "Simulação". Rode o ping no PC1 e use "Próximo ▶" no painel que aparece embaixo.', ok: ({ sim }) => sim.vistos.length >= 2 }
        ],
        dicas: [],
        pergunta: { texto: 'Para que serve o switch nessa rede?', opcoes: ['Liga os aparelhos da mesma rede local e entrega cada quadro na porta certa, pelo MAC', 'Dá IP automático para os PCs', 'Liga a rede à internet'], certa: 0,
            explicacao: 'Switch = camada 2: junta os aparelhos da rede local e aprende em que porta está cada MAC. IP automático é DHCP; sair para outra rede ou para a internet é papel do roteador.' }
    },
    {
        id: 'p1-montar', grupo: 'Projeto 1 · Escritório da Ana', titulo: 'Montar o escritório', tipo: 'montar',
        historia: 'A Ana abriu um escritório com 3 computadores e 1 impressora. Monte a rede local para que todos conversem entre si. Rede combinada: 192.168.10.0/24.',
        inicio: () => M.novaRede(),
        objetivos: [
            { texto: 'Ponha na bancada 1 switch, 3 PCs e 1 impressora', ok: ({ rede }) => { const n = t => rede.aparelhos.filter(a => a.tipo === t).length; return n('switch') >= 1 && n('pc') >= 3 && n('impressora') >= 1; } },
            { texto: 'Ligue cada PC e a impressora a uma porta do switch', ok: ({ rede }) => { const hs = hosts(rede); return hs.length >= 4 && hs.every(h => { const c = M.caboDa(rede, h.id, h.portas[0].nome); if (!c) return false; const outro = c.a.id === h.id ? c.b.id : c.a.id; return M.aparelho(rede, outro).tipo === 'switch'; }); } },
            { texto: 'Dê a cada um um IP da rede 192.168.10.0/24, sem repetir', ok: ({ rede }) => { const hs = hosts(rede); if (hs.length < 4) return false; const ips = hs.map(ipDe); if (new Set(ips).size !== ips.length) return false; return hs.every(h => { const p = h.portas[0]; if (ipParaNumero(p.ip) === null) return false; const c = calcular(p.ip, p.prefixo); return p.prefixo === 24 && c.rede === '192.168.10.0' && !c.eRede && !c.eBroadcast; }); } },
            { texto: 'Todos conversam com todos (o app testa por você)', ok: ({ rede }) => todosConversam(rede) },
            { texto: 'Prove no terminal: ping de um PC para a impressora, com resposta', ok: ({ rede, comandos }) => pingDe({ comandos }, c => { const o = M.aparelho(rede, c.de), d = hosts(rede).find(h => ipDe(h) === c.alvo); return o && o.tipo === 'pc' && d && d.tipo === 'impressora' && c.ok > 0; }) }
        ],
        dicas: ['Clique nos aparelhos à esquerda para pôr na bancada. Depois use 🔌 Cabo: clique no PC, escolha Fa0, clique no switch e escolha uma porta livre.',
            'IPs sugeridos: PCs .11, .12 e .13; impressora .20. Máscara 255.255.255.0 (ou /24). Gateway em branco: ninguém sai da rede.',
            'Selecione um PC e digite no terminal: ping 192.168.10.20'],
        pergunta: { texto: 'Por que neste projeto o gateway pode ficar em branco?', opcoes: ['Porque o switch faz o papel de gateway', 'Porque todos estão na mesma rede, e gateway só serve para sair para outra rede', 'Porque a impressora não aceita gateway'], certa: 1,
            explicacao: 'Gateway é a porta de saída para outras redes. Com todos em 192.168.10.0/24, o PC entrega direto pelo switch. O switch não é gateway: ele não olha IP, só MAC.' }
    },
    {
        id: 'p1-chamado-outra-rede', grupo: 'Projeto 1 · Escritório da Ana', titulo: 'Chamado: o PC3 não fala com ninguém', tipo: 'chamado',
        historia: 'A Ana reclama: "o PC3 não imprime e não acha os colegas". Os cabos parecem bons. Investigue no terminal, ache a causa e conserte.',
        inicio: () => redeEscritorio((r, n) => { n('PC3').portas[0].ip = '192.168.20.13'; }),
        objetivos: [
            { texto: 'Investigue: rode ipconfig ou ping no PC3', ok: ({ rede, comandos }) => { const pc3 = rede.aparelhos.find(a => a.nome === 'PC3'); return !!pc3 && comandos.some(c => c.de === pc3.id && (c.cmd === 'ping' || c.cmd === 'ipconfig')); } },
            { texto: 'Todos voltam a conversar com todos', ok: ({ rede }) => todosConversam(rede) },
            { texto: 'Prove no terminal: ping do PC3 para a impressora, com resposta', ok: ({ rede, comandos }) => { const pc3 = rede.aparelhos.find(a => a.nome === 'PC3'); return !!pc3 && pingDe({ comandos }, c => c.de === pc3.id && nomeDoIp(rede, c.alvo) === 'Impressora' && c.ok > 0); } }
        ],
        dicas: ['Compare o ipconfig do PC3 com o de um PC que funciona. Os três primeiros números batem?', 'Com máscara /24, só o último número pode mudar. 192.168.20.x é outra rede.'],
        pergunta: { texto: 'Qual era a causa?', opcoes: ['Cabo do PC3 com defeito', 'O PC3 estava em outra rede (192.168.20.x) e, sem gateway, não tinha como sair', 'O switch não sabia o MAC do PC3'], certa: 1,
            explicacao: 'O PC faz a conta com a máscara: 192.168.20.13/24 é a rede 192.168.20.0, diferente de 192.168.10.0. Para ele, todos os colegas estão "fora", e sem gateway o ping nem sai (General failure). O cabo estava com luz verde: o problema era de camada 3.' }
    },
    {
        id: 'p1-chamado-mascara', grupo: 'Projeto 1 · Escritório da Ana', titulo: 'Chamado: o PC2 fala com uns e não com outros', tipo: 'chamado',
        historia: 'O PC2 acessa o PC3, mas não acha o PC1 nem a impressora. E o PC1 também não consegue falar com o PC2. O IP do PC2 está certo. Descubra o que mais pode estar errado.',
        inicio: () => redeEscritorio((r, n) => { n('PC2').portas[0].prefixo = 30; }),
        objetivos: [
            { texto: 'Investigue: rode um ping a partir do PC2', ok: ({ rede, comandos }) => { const pc2 = rede.aparelhos.find(a => a.nome === 'PC2'); return !!pc2 && pingDe({ comandos }, c => c.de === pc2.id); } },
            { texto: 'Todos voltam a conversar com todos', ok: ({ rede }) => todosConversam(rede) },
            { texto: 'Prove no terminal: ping do PC1 para o PC2, com resposta', ok: ({ rede, comandos }) => { const pc1 = rede.aparelhos.find(a => a.nome === 'PC1'); return !!pc1 && pingDe({ comandos }, c => c.de === pc1.id && nomeDoIp(rede, c.alvo) === 'PC2' && c.ok > 0); } }
        ],
        dicas: ['Selecione o PC2 e olhe a linha "Rede ... · broadcast ..." no painel. Quantos hosts cabem?', 'Com /30 (255.255.255.252), a rede do PC2 vai de .12 a .15. O .13 está dentro; o .11 e o .20 estão fora.'],
        pergunta: { texto: 'Por que o ping do PC1 para o PC2 falhava, se o PC1 estava certo?', opcoes: ['O pedido chegava, mas o PC2 achava que o PC1 era de outra rede e não sabia responder', 'O PC1 bloqueava o PC2', 'O switch só deixa passar redes /24'], certa: 0,
            explicacao: 'A comunicação depende da conta dos dois lados. O PC1 (/24) vê o PC2 na mesma rede e manda. O PC2 (/30) olha o .11, conclui que está fora e, sem gateway, não responde. Máscara errada em um lado só dá esse sintoma "meio funciona".' }
    },
    {
        id: 'p1-chamado-porta', grupo: 'Projeto 1 · Escritório da Ana', titulo: 'Chamado: o PC3 sumiu da rede', tipo: 'chamado',
        historia: 'Ontem tudo funcionava. Hoje o PC3 não responde a ninguém. Ninguém mexeu no IP dele. Investigue e conserte.',
        inicio: () => redeEscritorio((r, n) => { M.porta(n('SW-Escritorio'), 'Fa0/3').ligada = false; }),
        objetivos: [
            { texto: 'Investigue: ping para o PC3 ou tabela MAC do switch', ok: ({ comandos }) => comandos.some(c => (c.cmd === 'ping' && c.alvo === '192.168.10.13') || c.cmd === 'show-mac') },
            { texto: 'Todos voltam a conversar com todos', ok: ({ rede }) => todosConversam(rede) }
        ],
        dicas: ['Antes de olhar IP, olhe as luzes nos cabos. Verde = enlace ativo; vermelho = porta parada.', 'Selecione o switch: a porta Fa0/3 está "desligada (shutdown)". Marque "ligada" (no Packet Tracer: no shutdown).'],
        pergunta: { texto: 'Em que camada estava o problema?', opcoes: ['Camada 3: IP errado', 'Camada 1/2: a porta do switch estava desligada (shutdown)', 'Camada 7: a impressora travou'], certa: 1,
            explicacao: 'O IP estava certo; o que parou foi o enlace. Porta em shutdown não passa nada, e o cabo fica vermelho. Regra prática: olhe o cabo primeiro. Verde e não funciona → procure em IP e máscara; vermelho → físico/enlace.' }
    },
    {
        id: 'p1-por-dentro', grupo: 'Projeto 1 · Escritório da Ana', titulo: 'Ver por dentro: ARP e ICMP', tipo: 'simulacao',
        historia: 'Agora a rede funciona. Vamos ver em câmera lenta o que acontece num ping: quem pergunta, quem responde e por onde o switch manda cada quadro.',
        inicio: () => redeEscritorio(),
        objetivos: [
            { texto: 'Troque o modo para Simulação (botão no alto)', ok: ({ sim }) => sim.modo === 'simulacao' },
            { texto: 'No PC1, rode: ping 192.168.10.20', ok: ({ rede, comandos }) => { const pc1 = rede.aparelhos.find(a => a.nome === 'PC1'); return !!pc1 && pingDe({ comandos }, c => c.de === pc1.id && c.alvo === '192.168.10.20'); } },
            { texto: 'Avance até ver a resposta ARP da impressora', ok: ({ sim }) => sim.vistos.some(e => e.tipo === 'ARP' && e.op === 'resposta') },
            { texto: 'Avance até o ICMP (o ping) chegar à impressora', ok: ({ sim }) => sim.vistos.some(e => e.tipo === 'ICMP' && e.para === 'Impressora') }
        ],
        dicas: ['Use "Próximo ▶" para andar um passo por vez e leia o quadro acima da lista.', 'Repare: o primeiro ARP vai para FF:FF:FF:FF:FF:FF (todos). A resposta volta só para o PC1.'],
        pergunta: { texto: 'Por que o primeiro quadro do ping é um ARP em broadcast?', opcoes: ['Porque o PC1 sabia o IP da impressora, mas não o MAC, e precisa do MAC para montar o quadro Ethernet', 'Porque o switch exige um broadcast antes de cada ping', 'Porque o ICMP só funciona em broadcast'], certa: 0,
            explicacao: 'Na rede local, a entrega é por MAC (camada 2). O ARP traduz IP → MAC: "quem tem o 192.168.10.20?" vai para todos, e só a dona do IP responde. Depois disso o PC guarda na tabela ARP (veja com arp -a) e não precisa perguntar de novo.' }
    },

    {
        id: 'p2-ligar', grupo: 'Projeto 2 · Dois setores e um roteador', titulo: 'Ligar o Administrativo ao Financeiro', tipo: 'montar',
        historia: 'A empresa cresceu: o Administrativo usa 192.168.10.0/24 e o Financeiro 192.168.20.0/24. Cada setor já funciona sozinho. Ponha um roteador entre os dois para que todos conversem.',
        inicio: () => redeDoisSetores(false),
        objetivos: [
            { texto: 'Ponha um roteador e ligue uma porta em cada switch', ok: ({ rede }) => { const ro = rede.aparelhos.find(a => a.tipo === 'roteador'); if (!ro) return false; const viz = ro.portas.map(p => M.caboDa(rede, ro.id, p.nome)).filter(Boolean).map(c => (c.a.id === ro.id ? c.b.id : c.a.id)); const nomes = viz.map(id => M.aparelho(rede, id).nome); return nomes.includes('SW-Adm') && nomes.includes('SW-Fin'); } },
            { texto: 'Dê ao roteador um IP em cada rede (uma porta para cada setor)', ok: ({ rede }) => { const ro = rede.aparelhos.find(a => a.tipo === 'roteador'); if (!ro) return false; const redes = ro.portas.filter(p => p.ip).map(p => { const c = calcular(p.ip, p.prefixo); return c.erro ? '' : `${c.rede}/${p.prefixo}`; }); return redes.includes('192.168.10.0/24') && redes.includes('192.168.20.0/24'); } },
            { texto: 'Configure o gateway padrão de cada PC e do servidor', ok: ({ rede }) => { const ro = rede.aparelhos.find(a => a.tipo === 'roteador'); if (!ro) return false; const ipsRo = ro.portas.map(p => p.ip).filter(Boolean); return hosts(rede).every(h => ipsRo.includes(h.gateway) && calcular(h.gateway, h.portas[0].prefixo).rede === calcular(ipDe(h), h.portas[0].prefixo).rede); } },
            { texto: 'Todos conversam com todos, nos dois setores', ok: ({ rede }) => todosConversam(rede) },
            { texto: 'Prove no terminal: tracert do Adm1 para o Servidor', ok: ({ rede, comandos }) => { const a = rede.aparelhos.find(x => x.nome === 'Adm1'); return !!a && comandos.some(c => c.cmd === 'tracert' && c.de === a.id && c.alvo === '192.168.20.10'); } }
        ],
        dicas: ['Ponha um Roteador e use 🔌 Cabo: SW-Adm (porta livre) → roteador Gi0/0; SW-Fin → roteador Gi0/1.',
            'Selecione o roteador: Gi0/0 = 192.168.10.1 /24 e Gi0/1 = 192.168.20.1 /24. Cada porta do roteador fica numa rede.',
            'Gateway de cada aparelho = IP do roteador na rede DELE. Adm1 e Adm2: 192.168.10.1. Fin1 e Servidor: 192.168.20.1.'],
        pergunta: { texto: 'Por que agora o gateway não pode ficar em branco?', opcoes: ['Porque o switch só funciona com gateway', 'Porque o destino está em outra rede, e o PC entrega para o gateway (o roteador) levar até lá', 'Porque o servidor exige gateway para responder ping'], certa: 1,
            explicacao: 'O PC faz a conta com a máscara: se o destino é de outra rede, ele não entrega direto; manda para o gateway. O roteador tem uma perna em cada rede e repassa. Sem gateway: "General failure".' }
    },
    {
        id: 'p2-chamado-gateway', grupo: 'Projeto 2 · Dois setores e um roteador', titulo: 'Chamado: o Fin1 só fala com o próprio setor', tipo: 'chamado',
        historia: 'O Fin1 acessa o Servidor normalmente, mas não alcança ninguém do Administrativo. O resto da empresa funciona. Descubra por quê.',
        inicio: () => redeDoisSetores(true, (r, n) => { n('Fin1').gateway = '192.168.20.254'; }),
        objetivos: [
            { texto: 'Investigue no Fin1 (ipconfig, ping ou tracert)', ok: ({ rede, comandos }) => { const f = rede.aparelhos.find(a => a.nome === 'Fin1'); return !!f && comandos.some(c => c.de === f.id && ['ipconfig', 'ping', 'tracert'].includes(c.cmd)); } },
            { texto: 'Todos voltam a conversar com todos', ok: ({ rede }) => todosConversam(rede) },
            { texto: 'Prove no terminal: ping do Fin1 para o Adm1, com resposta', ok: ({ rede, comandos }) => { const f = rede.aparelhos.find(a => a.nome === 'Fin1'); return !!f && comandos.some(c => c.cmd === 'ping' && c.de === f.id && c.alvo === '192.168.10.11' && c.ok > 0); } }
        ],
        dicas: ['Dentro do setor funciona, fora não. Quem leva o pacote para fora?', 'Compare o "Default Gateway" do ipconfig do Fin1 com o IP do roteador na porta Gi0/1.'],
        pergunta: { texto: 'Qual era a causa?', opcoes: ['Máscara errada no Fin1', 'Gateway apontando para um IP que não existe (192.168.20.254)', 'Porta do roteador desligada'], certa: 1,
            explicacao: 'Para o mesmo setor o PC entrega direto e nem usa o gateway; por isso funcionava. Para fora, o Fin1 pergunta via ARP "quem é 192.168.20.254?" e ninguém responde: Request timed out. Sintoma típico de gateway errado: local ok, fora não.' }
    },
    {
        id: 'p2-chamado-volta', grupo: 'Projeto 2 · Dois setores e um roteador', titulo: 'Chamado: o Servidor recebe, mas não responde', tipo: 'chamado',
        historia: 'O pessoal do Administrativo não alcança o Servidor. No Financeiro, o Fin1 usa o Servidor normalmente. O roteador parece bem. Investigue.',
        inicio: () => redeDoisSetores(true, (r, n) => { n('Servidor').gateway = ''; }),
        objetivos: [
            { texto: 'Investigue com ping do Adm1 para o Servidor', ok: ({ rede, comandos }) => { const a = rede.aparelhos.find(x => x.nome === 'Adm1'); return !!a && comandos.some(c => c.cmd === 'ping' && c.de === a.id && c.alvo === '192.168.20.10'); } },
            { texto: 'Todos voltam a conversar com todos', ok: ({ rede }) => todosConversam(rede) }
        ],
        dicas: ['Leia a linha "Por quê:" do ping. O pedido chegou ao Servidor?', 'Para responder ao Adm1, o Servidor também precisa sair da rede dele. Olhe o gateway do Servidor.'],
        pergunta: { texto: 'Por que o ping falhava se o pedido chegava ao Servidor?', opcoes: ['A resposta precisa fazer o caminho de volta, e o Servidor sem gateway não sabia sair da rede dele', 'O roteador bloqueia respostas', 'O Servidor estava desligado'], certa: 0,
            explicacao: 'Ping é ida e volta. A ida usou o gateway do Adm1; a volta depende do gateway do Servidor. Sem ele, a resposta para 192.168.10.11 (outra rede) não sai. Lição: em comunicação entre redes, confira os dois lados.' }
    },
    {
        id: 'p2-chamado-roteador', grupo: 'Projeto 2 · Dois setores e um roteador', titulo: 'Chamado: ninguém do Financeiro sai do setor', tipo: 'chamado',
        historia: 'Depois de uma "manutenção" no roteador, ninguém do Financeiro alcança o Administrativo, e o Administrativo também não alcança o Financeiro. Dentro de cada setor, tudo normal. Os cabos estão verdes.',
        inicio: () => redeDoisSetores(true, (r, n) => { n('R1').portas[1].ip = '192.168.21.1'; }),
        objetivos: [
            { texto: 'Investigue no roteador: show ip interface brief ou show ip route', ok: ({ rede, comandos }) => { const ro = rede.aparelhos.find(a => a.nome === 'R1'); return !!ro && comandos.some(c => c.de === ro.id && c.cmd === 'show'); } },
            { texto: 'Todos voltam a conversar com todos', ok: ({ rede }) => todosConversam(rede) }
        ],
        dicas: ['Cabos verdes descartam o físico. Selecione o R1 e rode show ip interface brief.', 'A porta do Financeiro (Gi0/1) precisa ter um IP da rede 192.168.20.0/24, o mesmo que os PCs usam como gateway.'],
        pergunta: { texto: 'Qual era o problema?', opcoes: ['A porta Gi0/1 do roteador estava em outra rede (192.168.21.1), então o gateway 192.168.20.1 não existia mais', 'Faltava uma rota estática para 192.168.20.0', 'O switch do Financeiro estava em shutdown'], certa: 0,
            explicacao: 'O roteador só conhece de cara as redes das suas portas (rotas "C - connected" no show ip route). Com 192.168.21.1, ele deixou de estar na rede do Financeiro, e o gateway 192.168.20.1 sumiu. Não falta rota estática: as duas redes são diretamente conectadas.' }
    },
    {
        id: 'p2-por-dentro', grupo: 'Projeto 2 · Dois setores e um roteador', titulo: 'Ver por dentro: o pacote atravessa o roteador', tipo: 'simulacao',
        historia: 'Com tudo funcionando, veja o que muda quando o destino está em outra rede: a quem o PC pergunta o MAC, e o que acontece com o TTL.',
        inicio: () => redeDoisSetores(true),
        objetivos: [
            { texto: 'Troque o modo para Simulação', ok: ({ sim }) => sim.modo === 'simulacao' },
            { texto: 'No Adm1, rode: ping 192.168.20.10', ok: ({ rede, comandos }) => { const a = rede.aparelhos.find(x => x.nome === 'Adm1'); return !!a && comandos.some(c => c.cmd === 'ping' && c.de === a.id && c.alvo === '192.168.20.10'); } },
            { texto: 'Veja o ARP do Adm1 perguntando pelo gateway (192.168.10.1), não pelo Servidor', ok: ({ sim }) => sim.vistos.some(e => e.tipo === 'ARP' && e.op === 'pedido' && e.alvoIp === '192.168.10.1') },
            { texto: 'Veja o ICMP chegar ao Servidor com TTL 127', ok: ({ sim }) => sim.vistos.some(e => e.tipo === 'ICMP' && e.para === 'Servidor' && e.ttl === 127) }
        ],
        dicas: ['Avance com "Próximo ▶" e leia o quadro de cada passo: o alvo do ARP e o TTL.', 'São dois ARP: um no Administrativo (Adm1 → gateway) e outro no Financeiro (R1 → Servidor).'],
        pergunta: { texto: 'Por que o TTL chegou 127 e não 128?', opcoes: ['Cada roteador no caminho diminui o TTL em 1; aqui houve um roteador', 'O switch diminui o TTL', 'O Servidor diminui antes de ler'], certa: 0,
            explicacao: 'TTL (time to live) cai 1 a cada roteador. Serve para um pacote não rodar para sempre num laço: chegou a 0, é descartado. Switch não mexe no TTL: ele nem olha o IP. É por isso que o tracert consegue listar os saltos.' }
    },
    {
        id: 'p3-ligar', grupo: 'Projeto 3 · Matriz e Filial (rotas estáticas)', titulo: 'Ligar a Matriz à Filial', tipo: 'montar',
        historia: 'A empresa abriu uma filial em outra cidade. Cada lado tem sua rede e seu roteador (Matriz 192.168.10.0/24, Filial 192.168.30.0/24). Ligue os dois roteadores por um link 10.0.0.0/30 e ensine a cada um o caminho para a rede do outro.',
        inicio: () => redeDuasFiliais({ link: false, rotas: false }),
        objetivos: [
            { texto: 'Ligue um cabo entre os dois roteadores', ok: ({ rede }) => !!linkEntreRoteadores(rede) },
            { texto: 'Dê às duas pontas do link IPs da mesma rede /30', ok: ({ rede }) => { const l = linkEntreRoteadores(rede); if (!l) return false; const [pa, pb] = l; if (!pa.ip || !pb.ip || pa.ip === pb.ip || pa.prefixo !== 30 || pb.prefixo !== 30) return false; const ca = calcular(pa.ip, 30), cb = calcular(pb.ip, 30); return ca.rede === cb.rede && !ca.eRede && !ca.eBroadcast && !cb.eRede && !cb.eBroadcast; } },
            { texto: 'Prove que os roteadores se enxergam: ping de um roteador para o outro', ok: ({ rede, comandos }) => comandos.some(c => c.cmd === 'ping' && c.ok > 0 && (M.aparelho(rede, c.de) || {}).tipo === 'roteador' && /^10\./.test(c.alvo)) },
            { texto: 'R-Matriz: rota para 192.168.30.0/24', ok: ({ rede }) => temRotaUtil(rede, 'R-Matriz', '192.168.30.11') },
            { texto: 'R-Filial: rota para 192.168.10.0/24', ok: ({ rede }) => temRotaUtil(rede, 'R-Filial', '192.168.10.11') },
            { texto: 'Todos conversam com todos, nas duas cidades', ok: ({ rede }) => todosConversam(rede) },
            { texto: 'Prove no terminal: tracert do M1 para o F1 (3 saltos)', ok: ({ rede, comandos }) => { const a = rede.aparelhos.find(x => x.nome === 'M1'); return !!a && comandos.some(c => c.cmd === 'tracert' && c.de === a.id && c.alvo === '192.168.30.11'); } }
        ],
        dicas: ['🔌 Cabo: R-Matriz Gi0/1 → R-Filial Gi0/1 (o app escolhe cabo cruzado: mesmo tipo de aparelho nas duas pontas). Depois, no R-Matriz, Gi0/1 = 10.0.0.1 /30; no R-Filial, Gi0/1 = 10.0.0.2 /30.',
            'Teste o link antes das rotas: selecione o R-Matriz e rode ping 10.0.0.2. Se falhar aqui, rota nenhuma vai resolver.',
            'Rotas: no R-Matriz, rede 192.168.30.0, máscara /24, próximo salto 10.0.0.2. No R-Filial, rede 192.168.10.0, /24, próximo salto 10.0.0.1. (No Cisco: ip route 192.168.30.0 255.255.255.0 10.0.0.2)'],
        pergunta: { texto: 'Por que usar máscara /30 no link entre os roteadores?', opcoes: ['Porque /30 tem só 2 IPs utilizáveis: exatamente um para cada roteador, sem desperdício', 'Porque roteadores só aceitam /30', 'Porque /30 deixa o link mais rápido'], certa: 0,
            explicacao: '/30 = 4 endereços: rede (10.0.0.0), dois utilizáveis (.1 e .2) e broadcast (.3). Um link ponto a ponto só tem duas pontas, então /30 é o tamanho certo. Cai muito em prova junto com a conta de hosts: 2^(32−30) − 2 = 2.' }
    },
    {
        id: 'p3-chamado-volta', grupo: 'Projeto 3 · Matriz e Filial (rotas estáticas)', titulo: 'Chamado: a rota está lá, mas não funciona', tipo: 'chamado',
        historia: 'O técnico configurou a rota para a Filial no R-Matriz e jura que está certa (e está). Mesmo assim, o M1 não alcança o F1, e o pessoal da Filial também não alcança a Matriz. O link entre os roteadores responde ping.',
        inicio: () => redeDuasFiliais({}, (r, n) => { n('R-Filial').rotas = []; }),
        objetivos: [
            { texto: 'Investigue: ping do M1 para o F1 e show ip route nos roteadores', ok: ({ rede, comandos }) => comandos.some(c => c.cmd === 'show' && (M.aparelho(rede, c.de) || {}).tipo === 'roteador') },
            { texto: 'Todos voltam a conversar com todos', ok: ({ rede }) => todosConversam(rede) }
        ],
        dicas: ['Leia o "Por quê:" do ping do M1. O pedido chegou ao F1?', 'Compare o show ip route dos dois roteadores. Cada um precisa conhecer a rede do OUTRO lado.'],
        pergunta: { texto: 'Qual era a causa?', opcoes: ['Faltava a rota de volta no R-Filial (para 192.168.10.0/24)', 'A rota do R-Matriz estava errada', 'O link /30 estava com máscara errada'], certa: 0,
            explicacao: 'Roteamento é de mão dupla: a ida usa a tabela do R-Matriz, a volta usa a do R-Filial. Sem a rota de volta, a resposta morre no R-Filial e o M1 só vê "Request timed out". Sintoma clássico: o pedido chega, a resposta não volta.' }
    },
    {
        id: 'p3-chamado-digitacao', grupo: 'Projeto 3 · Matriz e Filial (rotas estáticas)', titulo: 'Chamado: depois da alteração, a Filial sumiu', tipo: 'chamado',
        historia: 'Ontem à noite alguém "revisou" as rotas do R-Matriz. Hoje a Matriz não alcança a Filial, e o ping mostra uma mensagem diferente de antes. O R-Filial não foi mexido.',
        inicio: () => redeDuasFiliais({}, (r, n) => { n('R-Matriz').rotas = [{ rede: '192.168.3.0', prefixo: 24, proximo: '10.0.0.2' }]; }),
        objetivos: [
            { texto: 'Investigue: show ip route no R-Matriz', ok: ({ rede, comandos }) => { const ro = rede.aparelhos.find(a => a.nome === 'R-Matriz'); return !!ro && comandos.some(c => c.de === ro.id && c.cmd === 'show'); } },
            { texto: 'Todos voltam a conversar com todos', ok: ({ rede }) => todosConversam(rede) },
            { texto: 'Prove no terminal: ping do M1 para o F2, com resposta', ok: ({ rede, comandos }) => { const a = rede.aparelhos.find(x => x.nome === 'M1'); return !!a && comandos.some(c => c.cmd === 'ping' && c.de === a.id && c.alvo === '192.168.30.12' && c.ok > 0); } }
        ],
        dicas: ['"Destination host unreachable" vindo de 192.168.10.1 quer dizer: o próprio R-Matriz não sabe chegar lá.', 'Leia a rota S com calma, número por número, e compare com a rede da Filial. Remova a errada (✕) e crie a certa.'],
        pergunta: { texto: 'Por que a mensagem foi "Destination host unreachable" e não "Request timed out"?', opcoes: ['Porque o R-Matriz, na ida, não achou rota e avisou o M1 de volta', 'Porque o F1 estava desligado', 'Porque a máscara do M1 estava errada'], certa: 0,
            explicacao: 'O roteador compara o destino (192.168.30.x) com cada rota. 192.168.3.0/24 não casa, e não há rota padrão: ele descarta e avisa a origem ("unreachable"). Regra prática: unreachable = algum roteador na ida não tem rota; timed out = o pacote (ou a resposta) sumiu sem aviso.' }
    },
    {
        id: 'p3-rota-padrao', grupo: 'Projeto 3 · Matriz e Filial (rotas estáticas)', titulo: 'Simplificar a Filial com rota padrão', tipo: 'montar',
        historia: 'A Filial só tem uma saída: o link para a Matriz. Em vez de uma rota para cada rede da empresa, deixe no R-Filial apenas uma rota padrão. Tudo precisa continuar funcionando.',
        inicio: () => redeDuasFiliais(),
        objetivos: [
            { texto: 'R-Filial com rota padrão 0.0.0.0/0 apontando para o R-Matriz', ok: ({ rede }) => { const ro = rede.aparelhos.find(a => a.nome === 'R-Filial'); return !!ro && (ro.rotas || []).some(r => r.prefixo === 0 && r.proximo === '10.0.0.1'); } },
            { texto: 'R-Filial sem nenhuma outra rota estática', ok: ({ rede }) => { const ro = rede.aparelhos.find(a => a.nome === 'R-Filial'); return !!ro && (ro.rotas || []).length > 0 && ro.rotas.every(r => r.prefixo === 0); } },
            { texto: 'Todos continuam conversando com todos', ok: ({ rede }) => todosConversam(rede) },
            { texto: 'Confira no R-Filial: show ip route (procure o S*)', ok: ({ rede, comandos }) => { const ro = rede.aparelhos.find(a => a.nome === 'R-Filial'); return !!ro && comandos.some(c => c.de === ro.id && c.cmd === 'show' && c.alvo === 'ip'); } }
        ],
        dicas: ['Selecione o R-Filial. Em "Rotas estáticas", crie: rede 0.0.0.0, máscara /0, próximo salto 10.0.0.1. (No Cisco: ip route 0.0.0.0 0.0.0.0 10.0.0.1)', 'Depois remova (✕) a rota para 192.168.10.0/24 e teste de novo.'],
        pergunta: { texto: 'Quando a rota padrão é a melhor escolha?', opcoes: ['Quando a rede tem uma única saída (rede "stub"): tudo que não é local vai pelo mesmo caminho', 'Sempre, em todos os roteadores, porque é mais rápida', 'Só quando não há switch'], certa: 0,
            explicacao: '0.0.0.0/0 casa com qualquer destino, mas é a menos específica: só é usada se nenhuma outra rota servir. Numa filial com uma única saída, uma linha resolve tudo. No Cisco ela aparece como S* e é o "gateway of last resort".' }
    },
    {
        id: 'p3-por-dentro', grupo: 'Projeto 3 · Matriz e Filial (rotas estáticas)', titulo: 'Ver por dentro: dois roteadores no caminho', tipo: 'simulacao',
        historia: 'Acompanhe um ping da Matriz até a Filial. Repare quantas vezes aparece ARP (um em cada trecho) e o que acontece com o TTL a cada roteador.',
        inicio: () => redeDuasFiliais(),
        objetivos: [
            { texto: 'Troque o modo para Simulação', ok: ({ sim }) => sim.modo === 'simulacao' },
            { texto: 'No M1, rode: ping 192.168.30.11', ok: ({ rede, comandos }) => { const a = rede.aparelhos.find(x => x.nome === 'M1'); return !!a && comandos.some(c => c.cmd === 'ping' && c.de === a.id && c.alvo === '192.168.30.11'); } },
            { texto: 'Veja o ARP no link: R-Matriz perguntando por 10.0.0.2', ok: ({ sim }) => sim.vistos.some(e => e.tipo === 'ARP' && e.op === 'pedido' && e.alvoIp === '10.0.0.2') },
            { texto: 'Veja o ICMP chegar ao F1 com TTL 126', ok: ({ sim }) => sim.vistos.some(e => e.tipo === 'ICMP' && e.para === 'F1' && e.ttl === 126) }
        ],
        dicas: ['Use "Próximo ▶" e leia a linha de camada 3 de cada passo: o TTL vai caindo.', 'São três trechos de rede (Matriz, link, Filial), e cada trecho tem seu próprio ARP: o MAC muda a cada salto, o IP de origem e destino não.'],
        pergunta: { texto: 'Ao atravessar os dois roteadores, o que muda no pacote?', opcoes: ['Os MACs mudam a cada trecho e o TTL cai 1 por roteador; os IPs de origem e destino continuam os mesmos', 'Os IPs mudam a cada roteador e os MACs continuam', 'Nada muda: o pacote é igual do início ao fim'], certa: 0,
            explicacao: 'IP = endereço fim a fim (quem mandou e quem vai receber). MAC = endereço do trecho atual (de quem para quem neste cabo). Cada roteador monta um quadro novo com MACs novos e diminui o TTL: 128 → 127 → 126.' }
    },
    {
        id: 'p4-montar', grupo: 'Projeto 4 · DHCP (IP automático)', titulo: 'Ligar o DHCP no escritório', tipo: 'montar',
        historia: 'A Ana cansou de configurar IP na mão em cada PC. O servidor (192.168.10.5) vai emprestar os IPs automaticamente. A impressora (.20) e o servidor continuam com IP fixo.',
        inicio: () => redeDhcp({ servico: false, pool: null, pcsDhcp: false }),
        objetivos: [
            { texto: 'No Servidor: serviço DHCP ligado, com um pool da rede 192.168.10.0/24', ok: ({ rede }) => { const sv = servidorDhcp(rede); return !!sv && sv.servicoDhcp.ativo && sv.servicoDhcp.pools.some(pl => calcular(pl.inicio, pl.prefixo).rede === '192.168.10.0' && pl.prefixo === 24); } },
            { texto: 'O pool não pode incluir os IPs fixos (servidor .5 e impressora .20)', ok: ({ rede }) => { const sv = servidorDhcp(rede); if (!sv || !sv.servicoDhcp.pools.length) return false; return sv.servicoDhcp.pools.every(pl => ['192.168.10.5', '192.168.10.20'].every(ip => { const x = ipParaNumero(ip); return x < ipParaNumero(pl.inicio) || x > ipParaNumero(pl.fim); })); } },
            { texto: 'PC1, PC2 e PC3 em DHCP, cada um com um IP do pool', ok: ({ rede }) => ['PC1', 'PC2', 'PC3'].every(x => pegouDhcp(rede, x)) },
            { texto: 'Todos conversam com todos', ok: ({ rede }) => todosConversam(rede) },
            { texto: 'Confira no terminal de um PC: ipconfig (procure "DHCP Enabled")', ok: ({ rede, comandos }) => comandos.some(c => c.cmd === 'ipconfig' && (M.aparelho(rede, c.de) || {}).dhcp) }
        ],
        dicas: ['Selecione o Servidor. Em "Serviço DHCP", marque ligado e crie um pool: primeiro IP 192.168.10.100, último 192.168.10.150, máscara /24. Gateway pode ficar vazio (rede sem saída).',
            'Em cada PC, clique em "DHCP" no topo do painel. O PC pede o IP na hora.',
            'Se um PC ficar com 169.254.x.x, o pedido não foi atendido: confira se o serviço está ligado e clique em "Pedir IP de novo".'],
        pergunta: { texto: 'Por que o primeiro pedido do PC (DHCP Discover) vai em broadcast?', opcoes: ['Porque o PC ainda não tem IP e não sabe qual é o IP do servidor: grita para a rede toda', 'Porque o switch exige broadcast', 'Porque o servidor só escuta broadcast por segurança'], certa: 0,
            explicacao: 'Sem IP (origem 0.0.0.0) e sem saber quem é o servidor, o PC manda para 255.255.255.255 e MAC FF:FF:FF:FF:FF:FF. Todo mundo da rede local recebe; só o servidor DHCP responde. São 4 mensagens: Discover, Offer, Request, Ack (DORA).' }
    },
    {
        id: 'p4-chamado-apipa', grupo: 'Projeto 4 · DHCP (IP automático)', titulo: 'Chamado: o notebook novo ficou com 169.254', tipo: 'chamado',
        historia: 'Chegou o notebook da Ana. Ela ligou no cabo e ele ficou com um IP 169.254.x.x e não acessa nada. Os PCs antigos continuam funcionando normalmente.',
        inicio: () => redeDhcp({ notebook: true }, (r, n, fase) => { if (fase === 'depois') n('Servidor').servicoDhcp.ativo = false; }),
        objetivos: [
            { texto: 'Investigue: ipconfig no Note-Ana', ok: ({ rede, comandos }) => { const nb = rede.aparelhos.find(a => a.nome === 'Note-Ana'); return !!nb && comandos.some(c => c.de === nb.id && c.cmd === 'ipconfig'); } },
            { texto: 'O Note-Ana recebe um IP do pool', ok: ({ rede }) => pegouDhcp(rede, 'Note-Ana') },
            { texto: 'Todos conversam com todos', ok: ({ rede }) => todosConversam(rede) }
        ],
        dicas: ['169.254.x.x não vem de servidor nenhum: o próprio Windows inventa quando o DHCP não responde (APIPA).', 'Os PCs antigos ainda estão com o IP emprestado de antes. Olhe o painel do Servidor: o serviço está ligado? Depois, no notebook, "Pedir IP de novo" (ipconfig /renew).'],
        pergunta: { texto: 'O que um IP 169.254.x.x indica?', opcoes: ['Que o aparelho está em DHCP, mas nenhum servidor DHCP respondeu (APIPA)', 'Que o servidor DHCP deu um IP de outra rede', 'Que o aparelho está com IP fixo errado'], certa: 0,
            explicacao: 'APIPA (Automatic Private IP Addressing): sem resposta do DHCP, o Windows se dá um 169.254.x.x/16. Com isso ele só fala com outros aparelhos na mesma situação. Em prova: viu 169.254, pense "DHCP não respondeu".' }
    },
    {
        id: 'p4-chamado-pool', grupo: 'Projeto 4 · DHCP (IP automático)', titulo: 'Chamado: o DHCP está ligado, mas o notebook não pega IP', tipo: 'chamado',
        historia: 'Desta vez o serviço DHCP está ligado (confira!). Os três PCs pegaram IP sem problema. O notebook novo, não: 169.254 de novo.',
        inicio: () => redeDhcp({ notebook: true, pool: ['192.168.10.100', '192.168.10.102'] }),
        objetivos: [
            { texto: 'Investigue: olhe o pool e as concessões no Servidor', ok: ({ rede, comandos }) => { const nb = rede.aparelhos.find(a => a.nome === 'Note-Ana'); return !!nb && comandos.some(c => c.de === nb.id && (c.cmd === 'ipconfig' || c.cmd === 'dhcp')); } },
            { texto: 'O Note-Ana recebe um IP do pool', ok: ({ rede }) => pegouDhcp(rede, 'Note-Ana') },
            { texto: 'Todos conversam com todos', ok: ({ rede }) => todosConversam(rede) }
        ],
        dicas: ['Conte: quantos IPs cabem de .100 a .102? Quantos já estão em "Concessões"?', 'Remova o pool (✕) e crie um maior, por exemplo .100 a .150. Depois, no notebook, "Pedir IP de novo".'],
        pergunta: { texto: 'Qual era a causa?', opcoes: ['O pool tinha só 3 IPs e todos já estavam emprestados (pool esgotado)', 'O notebook não aceita DHCP', 'O cabo do notebook estava cruzado'], certa: 0,
            explicacao: 'O servidor só empresta o que está no pool. Com .100 a .102 cabem 3 aparelhos; o quarto fica sem resposta e cai no APIPA. Na vida real: dimensione o pool para o número de aparelhos (com folga) e lembre que celulares e visitantes também pedem IP.' }
    },
    {
        id: 'p4-relay', grupo: 'Projeto 4 · DHCP (IP automático)', titulo: 'Um servidor DHCP para os dois setores (relay)', tipo: 'montar',
        historia: 'Na rede do Projeto 2, o servidor DHCP fica no Financeiro e já atende o Fin1. O pessoal do Administrativo também está em DHCP, mas ficou com 169.254. Faça o mesmo servidor atender os dois setores.',
        inicio: () => redeDhcpSetores(),
        objetivos: [
            { texto: 'No Servidor: um pool para a rede 192.168.10.0/24 com gateway 192.168.10.1', ok: ({ rede }) => { const sv = servidorDhcp(rede); return !!sv && sv.servicoDhcp.pools.some(pl => calcular(pl.inicio, pl.prefixo).rede === '192.168.10.0' && pl.gateway === '192.168.10.1'); } },
            { texto: 'No R1, porta do Administrativo (Gi0/0): ip helper-address 192.168.20.10', ok: ({ rede }) => { const ro = rede.aparelhos.find(a => a.nome === 'R1'); return !!ro && ro.portas[0].helper === '192.168.20.10'; } },
            { texto: 'Adm1 e Adm2 recebem IP pelo DHCP', ok: ({ rede }) => pegouDhcp(rede, 'Adm1') && pegouDhcp(rede, 'Adm2') },
            { texto: 'Todos conversam com todos', ok: ({ rede }) => todosConversam(rede) }
        ],
        dicas: ['O Discover é broadcast, e roteador não repassa broadcast. Por isso o pedido do Adm1 morre no R1.', 'Selecione o R1. Na porta Gi0/0 (lado do Administrativo), preencha "ip helper-address" com 192.168.20.10. No Cisco: interface g0/0 → ip helper-address 192.168.20.10.', 'O servidor também precisa de um pool para o Administrativo: .10.100 a .10.150, /24, gateway 192.168.10.1. Depois, em Adm1 e Adm2, "Pedir IP de novo".'],
        pergunta: { texto: 'Por que foi preciso o ip helper-address no roteador?', opcoes: ['Porque o Discover é broadcast e o roteador não repassa broadcast; o helper transforma o pedido em unicast até o servidor', 'Porque o servidor DHCP só atende roteadores', 'Porque sem ele o roteador apaga o gateway dos PCs'], certa: 0,
            explicacao: 'Broadcast fica preso na rede local: roteador separa domínios de broadcast. O relay (ip helper-address) escuta o Discover na porta do setor e o encaminha em unicast ao servidor, informando de qual rede veio. Assim o servidor sabe de qual pool tirar o IP.' }
    },
    {
        id: 'p4-chamado-gateway', grupo: 'Projeto 4 · DHCP (IP automático)', titulo: 'Chamado: pega IP, mas não sai do setor', tipo: 'chamado',
        historia: 'No Administrativo, Adm1 e Adm2 pegam IP pelo DHCP direitinho e conversam entre si. Mas ninguém do Administrativo alcança o Financeiro. Ninguém mexeu nos PCs.',
        inicio: () => redeDhcpSetores({ poolAdm: true, helper: true, gwAdm: '192.168.10.254' }),
        objetivos: [
            { texto: 'Investigue: ipconfig no Adm1', ok: ({ rede, comandos }) => { const a = rede.aparelhos.find(x => x.nome === 'Adm1'); return !!a && comandos.some(c => c.de === a.id && c.cmd === 'ipconfig'); } },
            { texto: 'Todos voltam a conversar com todos', ok: ({ rede }) => todosConversam(rede) },
            { texto: 'Adm1 e Adm2 continuam em DHCP', ok: ({ rede }) => pegouDhcp(rede, 'Adm1') && pegouDhcp(rede, 'Adm2') }
        ],
        dicas: ['O PC em DHCP recebe do servidor não só o IP, mas também a máscara e o gateway. Compare o gateway do ipconfig com o IP do R1.', 'O erro está no pool do Administrativo, no Servidor. Corrija (remova e crie de novo com gateway 192.168.10.1) e peça IP de novo nos dois PCs.'],
        pergunta: { texto: 'Por que consertar no Servidor, e não nos PCs?', opcoes: ['Porque o gateway errado vinha do pool do DHCP; corrigindo o pool, todos os PCs do setor recebem o certo', 'Porque PC em DHCP não tem gateway', 'Porque o roteador lê o gateway do servidor'], certa: 0,
            explicacao: 'DHCP entrega o pacote completo: IP, máscara, gateway e DNS. Um erro no pool se espalha para todos os aparelhos daquela rede, e o conserto também: corrige uma vez, e cada PC recebe o certo ao renovar.' }
    },
    {
        id: 'p4-por-dentro', grupo: 'Projeto 4 · DHCP (IP automático)', titulo: 'Ver por dentro: as 4 mensagens do DHCP (DORA)', tipo: 'simulacao',
        historia: 'Veja em câmera lenta como um PC sem IP conversa com o servidor DHCP: quem fala em broadcast, quem responde e em que ordem.',
        inicio: () => redeDhcp(),
        objetivos: [
            { texto: 'Troque o modo para Simulação', ok: ({ sim }) => sim.modo === 'simulacao' },
            { texto: 'No PC1, rode: ipconfig /renew', ok: ({ rede, comandos }) => { const a = rede.aparelhos.find(x => x.nome === 'PC1'); return !!a && comandos.some(c => c.de === a.id && c.cmd === 'dhcp'); } },
            { texto: 'Veja o Discover e o Offer', ok: ({ sim }) => ['Discover', 'Offer'].every(op => sim.vistos.some(e => e.tipo === 'DHCP' && e.op === op)) },
            { texto: 'Veja o Request e o Ack chegando ao PC1', ok: ({ sim }) => sim.vistos.some(e => e.tipo === 'DHCP' && e.op === 'Request') && sim.vistos.some(e => e.tipo === 'DHCP' && e.op === 'Ack' && e.para === 'PC1') }
        ],
        dicas: ['Use "Próximo ▶". Repare na linha de camada 3: origem 0.0.0.0 e destino 255.255.255.255 no Discover.', 'O switch inunda o Discover e o Request (broadcast) para todas as portas. Offer e Ack vão direto ao PC1.'],
        pergunta: { texto: 'Qual é a ordem das mensagens do DHCP?', opcoes: ['Discover → Offer → Request → Ack', 'Request → Offer → Discover → Ack', 'Offer → Discover → Ack → Request'], certa: 0,
            explicacao: 'DORA: o cliente Descobre (Discover), o servidor Oferece (Offer), o cliente Requisita o que foi oferecido (Request) e o servidor Confirma (Ack). Discover e Request saem em broadcast porque o cliente ainda não tem IP.' }
    }
];

// Objetivo "fixo": uma vez feito, continua ✓ (passos do tutorial). Os demais são conferidos ao vivo.
export function avaliar(missao, ctx) {
    const feitos = ctx.feitos || new Set();
    return missao.objetivos.map((o, i) => {
        if (o.fixo && feitos.has(i)) return true;
        let ok = false; try { ok = !!o.ok({ ...ctx, feitos }); } catch (e) { ok = false; }
        if (ok && o.fixo) feitos.add(i);
        return ok;
    });
}
