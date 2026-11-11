// ============================================================
// js/registro-abertura.js - Registro curto das últimas aberturas do app (FocoPro)
// ============================================================
// Para a próxima vez que o app "não abrir" não ser adivinhação (A07 da auditoria de 11/11/2026).
// Guarda no aparelho (localStorage) as últimas 20 aberturas: data e hora, se havia internet,
// versão do cache, até que etapa a inicialização chegou e o erro, se houve. Nada pessoal:
// sem e-mail, sem id de usuário, sem respostas.
//
// Script comum (não é módulo) e carregado ANTES do app.js: se o app.js falhar ao carregar,
// a tentativa de abertura e o erro ficam registrados mesmo assim.
//
// Como ver:
//   - Menu > Minha conta > "Registro de aberturas" (mostra e copia);
//   - abrir o site com #registro no fim do endereço (funciona mesmo se o app não iniciar);
//   - no Console: FocoProRegistro.texto()
(function () {
    var CHAVE = 'appEstudos_RegistroAbertura';
    var MAXIMO = 20;
    var inicio = Date.now();

    function ler() {
        try {
            var v = JSON.parse(localStorage.getItem(CHAVE) || '[]');
            return Array.isArray(v) ? v : [];
        } catch (e) {
            return [];
        }
    }

    var atual = {
        em: new Date().toISOString(),
        online: navigator.onLine !== false,
        cache: '?',
        sw: Boolean(navigator.serviceWorker && navigator.serviceWorker.controller),
        etapa: 'pagina'
    };
    var lista = ler().slice(-(MAXIMO - 1));
    lista.push(atual);

    function gravar() {
        try { localStorage.setItem(CHAVE, JSON.stringify(lista)); } catch (e) { /* sem espaço: segue sem registrar */ }
    }

    // Texto de erro curto e sem dados pessoais (e-mails e ids longos são trocados)
    function limpar(texto) {
        return String(texto || '')
            .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
            .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '[id]')
            .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '[token]')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 200);
    }

    // etapa('sessao', { modo: 'sem-rede' }): até onde a inicialização chegou e em quanto tempo
    function etapa(nome, extra) {
        atual.etapa = String(nome);
        atual.ms = Date.now() - inicio;
        if (extra && extra.modo) atual.modo = String(extra.modo);
        if (extra && Number.isFinite(extra.questoes)) atual.questoes = extra.questoes;
        gravar();
    }

    function erro(e) {
        var texto = limpar(e && e.message ? e.message : e);
        if (!texto) return;
        var erros = atual.erro ? atual.erro.split(' || ') : [];
        if (erros.length >= 3 || erros.indexOf(texto) >= 0) return; // no máximo 3 por abertura
        erros.push(texto);
        atual.erro = erros.join(' || ');
        gravar();
    }

    // Erro solto de script, arquivo que não carregou (captura) e promessa rejeitada sem tratamento
    window.addEventListener('error', function (ev) {
        var alvo = ev && ev.target;
        if (alvo && alvo !== window && (alvo.src || alvo.href)) {
            if (alvo.tagName === 'SCRIPT' || alvo.tagName === 'LINK') erro('não carregou: ' + String(alvo.src || alvo.href).split('/').slice(-2).join('/'));
            return;
        }
        var onde = ev && ev.filename ? ' @' + String(ev.filename).split('/').pop() + ':' + (ev.lineno || 0) : '';
        erro((ev && ev.message ? ev.message : 'erro') + onde);
    }, true);
    window.addEventListener('unhandledrejection', function (ev) {
        var r = ev && ev.reason;
        erro('promessa: ' + (r && r.message ? r.message : r));
    });

    // Versão do cache do service worker (ex.: focopro-v143)
    try {
        if (window.caches && caches.keys) {
            caches.keys().then(function (nomes) {
                var meus = nomes.filter(function (n) { return n.indexOf('focopro-') === 0; });
                atual.cache = meus.length ? meus.join(',') : 'nenhum';
                gravar();
            }).catch(function () { atual.cache = 'erro'; gravar(); });
        } else {
            atual.cache = 'sem suporte';
        }
    } catch (e) { atual.cache = 'erro'; }

    function dois(n) { return String(n).padStart(2, '0'); }
    function dataHora(isoTexto) {
        var d = new Date(isoTexto);
        if (isNaN(d)) return String(isoTexto);
        return dois(d.getDate()) + '/' + dois(d.getMonth() + 1) + '/' + d.getFullYear() + ' ' + dois(d.getHours()) + ':' + dois(d.getMinutes()) + ':' + dois(d.getSeconds());
    }

    // Uma linha por abertura, da mais nova para a mais antiga
    function texto() {
        var linhas = ler().slice().reverse().map(function (r) {
            return dataHora(r.em) +
                ' | ' + (r.online ? 'online' : 'offline') +
                ' | cache ' + (r.cache || '?') + (r.sw ? '' : ' (sem SW)') +
                ' | etapa ' + (r.etapa || '?') + (r.modo ? ' (' + r.modo + ')' : '') +
                (Number.isFinite(r.ms) ? ' em ' + (r.ms / 1000).toFixed(1) + ' s' : '') +
                (Number.isFinite(r.questoes) ? ' | ' + r.questoes + ' questões' : '') +
                (r.erro ? ' | ERRO: ' + r.erro : '');
        });
        return 'FocoPro: registro de aberturas (' + linhas.length + ')\n' +
            'Etapas: pagina > iniciando > sessao > historico > questoes > pronto\n' +
            linhas.join('\n');
    }

    gravar();
    window.FocoProRegistro = { etapa: etapa, erro: erro, ler: ler, texto: texto };

    // Endereço terminado em #registro: mostra o registro por cima de tudo, mesmo se o app não iniciar
    function mostrarSePedido() {
        if (location.hash !== '#registro' || document.getElementById('registro-abertura-cru')) return;
        var caixa = document.createElement('pre');
        caixa.id = 'registro-abertura-cru';
        caixa.setAttribute('style', 'position:fixed;inset:0;z-index:99999;margin:0;padding:16px;overflow:auto;background:#0f172a;color:#e2e8f0;font:12px/1.5 monospace;white-space:pre-wrap;word-break:break-word;');
        caixa.textContent = texto() + '\n\n(Toque duas vezes para fechar.)';
        caixa.addEventListener('dblclick', function () { caixa.remove(); });
        document.body.appendChild(caixa);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mostrarSePedido);
    else mostrarSePedido();
    window.addEventListener('hashchange', mostrarSePedido);
})();
