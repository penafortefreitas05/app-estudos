// ============================================================
// js/offline-pacote.js - Pacote offline: todas as questões e gabaritos no aparelho (FocoPro)
// ============================================================
// Decidido com o Nathan em 05/11/2026 (estudar no navio, sem internet). O pacote fica no
// IndexedDB (cabe os ~2,5 MB com folga); um resumo curto fica no localStorage para a tela
// saber, sem esperar, se há pacote e de quando ele é. O gabarito fica no aparelho de propósito:
// sem servidor não há como corrigir de outro jeito.

const BANCO = 'focopro-offline';
const LOJA = 'kv';
const CHAVE_PACOTE = 'pacote';
const CHAVE_INFO = 'appEstudos_PacoteOffline';

function abrir() {
    return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB indisponível')); return; }
        const req = indexedDB.open(BANCO, 1);
        req.onupgradeneeded = () => { req.result.createObjectStore(LOJA); };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error || new Error('Falha ao abrir o armazenamento'));
        req.onblocked = () => reject(new Error('Armazenamento bloqueado por outra aba'));
    });
}

function transacao(modo, fazer) {
    return abrir().then(db => new Promise((resolve, reject) => {
        const t = db.transaction(LOJA, modo);
        const r = fazer(t.objectStore(LOJA));
        t.oncomplete = () => { db.close(); resolve(r && r.result); };
        t.onerror = () => { db.close(); reject(t.error || new Error('Falha no armazenamento')); };
        t.onabort = () => { db.close(); reject(t.error || new Error('Armazenamento cheio ou bloqueado')); };
    }));
}

// pacote: { baixadoEm: ISO, questoes: [linhas cruas do banco], gabaritos: { questaoId: resposta_correta } }
export async function salvarPacote(pacote) {
    await transacao('readwrite', (loja) => loja.put(pacote, CHAVE_PACOTE));
    try {
        localStorage.setItem(CHAVE_INFO, JSON.stringify({ em: pacote.baixadoEm, n: pacote.questoes.length }));
    } catch (e) { /* o pacote está salvo; só o resumo ficou de fora */ }
    // Pede ao navegador para não apagar o pacote quando faltar espaço
    try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* segue */ }
}

// Limite de tempo (A05): se o armazenamento do navegador não responder, a abertura não fica
// esperando para sempre; segue como se não houvesse pacote.
const LIMITE_LEITURA_MS = 6000;

export async function lerPacote() {
    try {
        const p = await Promise.race([
            transacao('readonly', (loja) => loja.get(CHAVE_PACOTE)),
            new Promise((_, rejeita) => setTimeout(() => rejeita(new Error('armazenamento demorou')), LIMITE_LEITURA_MS))
        ]);
        return p && Array.isArray(p.questoes) && p.questoes.length ? p : null;
    } catch (e) { return null; }
}

// Resumo rápido { em, n } ou null
export function infoPacote() {
    try {
        const v = JSON.parse(localStorage.getItem(CHAVE_INFO) || 'null');
        return v && v.em && v.n ? v : null;
    } catch (e) { return null; }
}

export function descreverPacote(info = infoPacote()) {
    if (!info) return 'Nenhum pacote baixado ainda.';
    const d = new Date(info.em);
    const dia = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} às ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return `Baixado em ${dia} · ${info.n} questões`;
}
