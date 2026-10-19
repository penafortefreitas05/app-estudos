// ============================================================
// js/api.js - Serviço de Requisição de Dados (Fetch API)
// ============================================================

// ---------- IMPORTAÇÕES ----------
import { showToast } from './notifications.js';

// ---------- FUNÇÃO DE CARREGAMENTO DAS QUESTÕES ----------
export async function carregarQuestoes() {
    try {
        // Busca o arquivo JSON estático de forma assíncrona
        const resposta = await fetch('data/questoes.json');

        // Valida se o arquivo foi encontrado no servidor
        if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status} - ${resposta.statusText}`);
        }

        // Converte o JSON em objeto JavaScript
        const dados = await resposta.json();
        return dados;

    } catch (erro) {
        console.error('Erro ao carregar o banco de questões:', erro);
        showToast('Não foi possível carregar o banco de questões.', 'erro');
        return [];
    }
}