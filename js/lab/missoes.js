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
    const imp = M.adicionarAparelho(r, 'impressora', 520, 220); imp.nome = 'Impressora'; imp.portas[0].ip = '192.168.10.20';
    M.ligar(r, imp.id, 'Fa0', sw.id, 'Fa0/4');
    if (ajuste) ajuste(r, nome => r.aparelhos.find(a => a.nome === nome));
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
const pingDe = (ctx, filtro) => ctx.comandos.some(c => c.cmd === 'ping' && filtro(c));
const nomeDoIp = (r, ip) => (hosts(r).find(h => ipDe(h) === ip) || {}).nome;

// ---------- as missões ----------
export const MISSOES = [
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
    }
];

export function avaliar(missao, ctx) {
    return missao.objetivos.map(o => { try { return !!o.ok(ctx); } catch (e) { return false; } });
}
