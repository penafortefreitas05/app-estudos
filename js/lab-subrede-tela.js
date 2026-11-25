// Laboratório (piloto 25/11): "A impressora não responde" — sub-rede e máscara.
// 5 etapas na mesma cena (parecer da sala Design): Missão → Experimentar → Testar um erro → Entender → Praticar.
// Guarda etapa e configuração no aparelho; registra a data só ao concluir a etapa 5.
import { esc } from './ui.js';
import { calcular, bits, eLocal, ping, validar } from './lab-subrede.js';

const CHAVE = 'focopro_lab_subrede';
const ETAPAS = ['Missão', 'Experimentar', 'Testar um erro', 'Entender', 'Praticar'];
const PREFIXOS = [24, 26, 27, 30];
const GATEWAYS = [
    { valor: '192.168.1.1', rotulo: '192.168.1.1 (o roteador)' },
    { valor: '192.168.2.1', rotulo: '192.168.2.1' },
    { valor: '', rotulo: 'sem gateway' }
];

function lerEstado() {
    try { const e = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (e && typeof e === 'object') return e; } catch (e) { /* armazenamento indisponível */ }
    return { etapa: 0, prefixo: 26, gateway: '', concluidoEm: null };
}
function gravarEstado(e) { try { localStorage.setItem(CHAVE, JSON.stringify(e)); } catch (err) { /* segue sem guardar */ } }
export function labSubredeConcluidoEm() { return lerEstado().concluidoEm || null; }

function aparelhos(est) {
    return [
        { id: 'pc', nome: 'PC da Ana', tipo: 'pc', ip: '192.168.1.20', prefixo: est.prefixo, gateway: est.etapa >= 2 ? est.gateway : '' },
        { id: 'imp', nome: 'Impressora', tipo: 'impressora', ip: '192.168.1.70', prefixo: 24, gateway: '192.168.1.1' },
        { id: 'rot', nome: 'Roteador', tipo: 'roteador', ip: '192.168.1.1', prefixo: 24 },
        { id: 'pc2', nome: 'Outro PC', tipo: 'pc', ip: '192.168.1.30', prefixo: 24, gateway: '192.168.1.1' }
    ];
}

const ICONE = { pc: '🖥️', impressora: '🖨️', roteador: '📡' };

function cena(est) {
    const lista = aparelhos(est), pc = lista[0];
    const cartao = a => {
        let selo = '';
        if (a.id !== 'pc') {
            const p = ping(pc, a, lista);
            const local = eLocal(pc, a.ip);
            selo = `<span class="lab-selo ${p.ok ? 'ok' : 'falha'}">${p.ok ? '✓ responde' : '✕ não responde'}</span><span class="lab-sub">${local ? 'local para o PC' : 'outra rede para o PC'}</span>`;
        } else selo = `<span class="lab-selo voce">/${a.prefixo}${a.gateway ? ' · gw ' + esc(a.gateway) : ' · sem gateway'}</span>`;
        return `<div class="lab-aparelho ${a.id === 'pc' ? 'principal' : ''}"><span class="lab-ic" aria-hidden="true">${ICONE[a.tipo]}</span><b>${esc(a.nome)}</b><span class="lab-ip">${esc(a.ip)}</span>${selo}</div>`;
    };
    return `<div class="lab-rede" aria-label="Rede do escritório"><p class="lab-rotulo">Rede do escritório · um switch liga todos</p><div class="lab-aparelhos">${lista.map(cartao).join('')}</div></div>`;
}

function resultado(est) {
    const c = calcular('192.168.1.20', est.prefixo);
    const lin = (r, v) => `<div><span>${r}</span><b>${esc(String(v))}</b></div>`;
    const b = bits('192.168.1.20', est.prefixo);
    const binario = b.map(o => `<span class="lab-octeto"><small>${o.octeto}</small><span class="lab-b">${o.bits.map(x => `<i class="${x.rede ? 'r' : 'h'}">${x.b}</i>`).join('')}</span></span>`).join('');
    return `<div class="lab-calc"><p class="lab-rotulo">Resultado do cálculo · PC da Ana /${est.prefixo} (${esc(c.mascara)})</p>
        <div class="lab-grade">${lin('Rede', c.rede)}${lin('Broadcast', c.broadcast)}${lin('Primeiro host', c.primeiro)}${lin('Último host', c.ultimo)}${lin('Hosts utilizáveis', c.hosts)}</div>
        <details class="lab-bin"><summary>Ver cálculo completo (binário)</summary><div class="lab-bits">${binario}</div><p class="lab-legenda"><i class="r">■</i> bits de rede (${est.prefixo}) · <i class="h">■</i> bits de host (${32 - est.prefixo})</p></details></div>`;
}

function explicacaoImpressora(est) {
    const lista = aparelhos(est), p = ping(lista[0], lista[1], lista);
    return `<p class="lab-explica ${p.ok ? 'ok' : 'falha'}" aria-live="polite">${esc(p.resumo)}</p>`;
}

function corpoEtapa(est) {
    if (est.etapa === 0) return `<h3 class="lab-h">A impressora não responde</h3>
        <p>No escritório da Ana, o PC dela (192.168.1.20) não consegue imprimir na impressora da mesma sala (192.168.1.70). Todos estão ligados no mesmo switch.</p>
        <p>Você vai mudar a máscara do PC e o gateway, ver quem responde e entender por quê.</p>${cena(est)}`;
    if (est.etapa === 1) return `<h3 class="lab-h">Mude a máscara do PC da Ana</h3>
        <p>O PC da Ana está com máscara /26 e <b>sem gateway</b>. Troque a máscara e veja quem passa a responder. Um aparelho só fala direto com quem considera da mesma sub-rede.</p>
        ${cena(est)}
        <div class="lab-controle" role="group" aria-label="Máscara do PC da Ana"><p class="lab-rotulo">Máscara do PC</p>${PREFIXOS.map(p => `<button type="button" class="lab-chip" data-prefixo="${p}" aria-pressed="${est.prefixo === p}">/${p}</button>`).join('')}</div>
        ${explicacaoImpressora(est)}${resultado(est)}`;
    if (est.etapa === 2) {
        const v = validar(aparelhos(est)[0]);
        return `<h3 class="lab-h">E se o gateway estiver errado?</h3>
        <p>A máscara voltou a /26: para o PC, a impressora (.70) está em outra sub-rede. Outra saída é configurar o <b>gateway</b>. Experimente os três.</p>
        ${cena(est)}
        <div class="lab-controle" role="group" aria-label="Gateway do PC da Ana"><p class="lab-rotulo">Gateway do PC</p>${GATEWAYS.map(g => `<button type="button" class="lab-chip" data-gateway="${g.valor}" aria-pressed="${est.gateway === g.valor}">${esc(g.rotulo)}</button>`).join('')}</div>
        ${v ? `<p class="lab-alerta" role="status">⚠ ${esc(v.texto)}</p><p class="lab-explica falha" aria-live="polite">A impressora não responde. O roteador e o Outro PC continuam respondendo: estão na mesma sub-rede e não dependem do gateway.</p>` : explicacaoImpressora(est)}`;
    }
    if (est.etapa === 3) return `<h3 class="lab-h">O que aconteceu</h3>
        <ul class="lab-lista">
            <li><b>Máscara de sub-rede</b> diz quais bits do IP são da rede. Com /24, o PC vê de .0 a .255 como local; com /26, só de .0 a .63.</li>
            <li><b>Mesma sub-rede:</b> o PC pergunta o MAC por <b>ARP</b> e entrega direto pelo switch.</li>
            <li><b>Outra sub-rede:</b> o PC manda para o <b>gateway padrão</b> (o roteador). Sem gateway, o pacote não tem para onde ir.</li>
            <li><b>Gateway fora da sub-rede</b> não serve: o PC não alcança nem o próprio gateway.</li>
            <li>O ping só funciona se a <b>ida e a volta</b> funcionarem: a conta é feita nos dois aparelhos.</li>
        </ul>
        <p class="lab-sub">Termos da prova: máscara, prefixo CIDR (/24), endereço de rede, broadcast, gateway padrão, ARP.</p>`;
    return `<h3 class="lab-h">Agora, questões</h3>
        <p>Feche o laboratório com questões de Fundamentos de redes no Modo Foco.</p>
        ${est.concluidoEm ? `<p class="lab-sub">Concluído em ${esc(new Date(est.concluidoEm).toLocaleDateString('pt-BR'))}.</p>` : ''}
        <button type="button" class="lab-btn principal" data-acao="praticar">Praticar Fundamentos de redes</button>`;
}

export function abrirLabSubrede({ aoPraticar } = {}) {
    if (document.querySelector('.lab')) return;
    const est = lerEstado();
    if (est.etapa > 4 || est.etapa < 0) est.etapa = 0;
    const el = document.createElement('div');
    el.className = 'lab';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Laboratório de sub-redes');
    document.body.appendChild(el);

    const desenhar = () => {
        el.innerHTML = `<div class="lab-caixa">
            <header class="lab-topo"><div><p class="lab-faixa">Laboratório · sub-redes</p><p class="lab-etapa">${est.etapa + 1} de 5 · ${ETAPAS[est.etapa]}</p></div>
                <button type="button" class="lab-sair" data-acao="fechar" aria-label="Sair do laboratório">✕</button></header>
            <ol class="lab-passos" aria-hidden="true">${ETAPAS.map((n, i) => `<li class="${i < est.etapa ? 'feito' : i === est.etapa ? 'atual' : ''}"></li>`).join('')}</ol>
            <main class="lab-corpo">${corpoEtapa(est)}</main>
            <footer class="lab-acoes">
                <button type="button" class="lab-btn" data-acao="voltar" ${est.etapa === 0 ? 'disabled' : ''}>← Voltar</button>
                ${est.etapa < 4 ? `<button type="button" class="lab-btn principal" data-acao="avancar">${est.etapa === 0 ? 'Começar' : 'Continuar →'}</button>` : `<button type="button" class="lab-btn" data-acao="refazer">Refazer experiência</button>`}
            </footer></div>`;
        gravarEstado(est);
    };
    const fechar = () => { el.remove(); document.removeEventListener('keydown', tecla); };
    const tecla = e => { if (e.key === 'Escape') fechar(); };
    document.addEventListener('keydown', tecla);

    el.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b) return;
        if (b.dataset.prefixo) { est.prefixo = Number(b.dataset.prefixo); desenhar(); return; }
        if (b.dataset.gateway !== undefined) { est.gateway = b.dataset.gateway; desenhar(); return; }
        const a = b.dataset.acao;
        if (a === 'fechar') return fechar();
        if (a === 'voltar' && est.etapa > 0) { est.etapa--; desenhar(); }
        if (a === 'avancar') {
            est.etapa++;
            if (est.etapa === 2) { est.prefixo = 26; est.gateway = ''; }
            if (est.etapa === 4 && !est.concluidoEm) est.concluidoEm = Date.now();
            desenhar();
        }
        if (a === 'refazer') { est.etapa = 0; est.prefixo = 26; est.gateway = ''; desenhar(); }
        if (a === 'praticar') { fechar(); if (typeof aoPraticar === 'function') aoPraticar(); }
    });
    desenhar();
}
