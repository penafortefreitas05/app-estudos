// ============================================================
// js/storage.js - Gerenciamento de Dados Locais (localStorage)
// ============================================================

const CHAVE_HISTORICO = 'appEstudos_Historico';

export function carregarHistorico() {
    try {
        const dados = JSON.parse(localStorage.getItem(CHAVE_HISTORICO));
        return dados && typeof dados === 'object' && !Array.isArray(dados) ? dados : {};
    } catch (e) {
        console.warn('Histórico ilegível, iniciando vazio.', e);
        return {};
    }
}

export function salvarHistorico(historico) {
    try {
        localStorage.setItem(CHAVE_HISTORICO, JSON.stringify(historico));
    } catch (e) {
        alert('Não foi possível salvar seu progresso neste navegador. Exporte o histórico para não perder dados.');
    }
}