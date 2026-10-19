// ============================================================
// js/app.js - Orquestrador Principal (Com Carga Assíncrona)
// ============================================================

// ---------- IMPORTAÇÕES DE MÓDULOS ----------
import { carregarHistorico, salvarHistorico } from './storage.js';
import {
    esc,
    letraDe,
    gabaritoDe,
    preencherSelect,
    atualizarChipTag,
    atualizarPlacar,
    renderizarQuestoes,
    revelar,
    classificarStatus
} from './ui.js';
import {
    iniciarCronometro,
    pararCronometro,
    adicionarBotaoFinalizar,
    finalizarSimulado
} from './simulado.js';
import { showToast, showConfirmModal } from './notifications.js';
import { carregarQuestoes } from './api.js';

// ---------- ESTADO GLOBAL DA APLICAÇÃO ----------
let historico = carregarHistorico();
let questoes = [];
let porId = new Map();
let tagSelecionada = "";
let simulado = null;

// ---------- CAPTURA DE ELEMENTOS DO DOM ----------
const container = document.getElementById("container-questoes");
const selectBanca = document.getElementById("filtro-banca");
const selectMateria = document.getElementById("filtro-materia");
const inputBusca = document.getElementById("filtro-busca");
const displayCronometro = document.getElementById("display-cronometro");

// ---------- ELEMENTOS DINÂMICOS ----------
const chipTag = document.createElement("div");
chipTag.className = "chip-tag";
chipTag.hidden = true;
container.parentNode.insertBefore(chipTag, container);

const inputImportar = document.createElement("input");
inputImportar.type = "file";
inputImportar.accept = "application/json,.json";
inputImportar.hidden = true;
document.body.appendChild(inputImportar);

function criarBotaoSidebar(texto) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-sidebar";
    btn.innerHTML = `<span>${texto}</span>`;
    return btn;
}

const btnExportar = criarBotaoSidebar("💾 Exportar Histórico");
const btnImportar = criarBotaoSidebar("📂 Importar Histórico");
const btnLimpar = document.getElementById("btn-limpar-dados");
if (btnLimpar) btnLimpar.before(btnExportar, btnImportar);

// ---------- UTILITÁRIOS ----------
function embaralharArray(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function validarQuestoes() {
    const ids = new Set();
    questoes.forEach(q => {
        if (ids.has(String(q.id))) console.warn('ID duplicado:', q.id);
        ids.add(String(q.id));
        ['banca', 'materia', 'enunciado', 'gabarito'].forEach(campo => {
            if (!q[campo]) console.warn(`Campo ausente (${campo}) na questão`, q.id);
        });
        if (!Array.isArray(q.alternativas) || !q.alternativas.map(letraDe).includes(gabaritoDe(q))) {
            console.warn('Gabarito não bate com as alternativas:', q.id);
        }
    });
}

// ---------- FILTROS DE QUESTÕES ----------
function filtrarQuestoes() {
    const banca = selectBanca.value;
    const materia = selectMateria.value;
    const termo = inputBusca.value.trim().toLowerCase();
    const tag = tagSelecionada.toLowerCase();

    return questoes.filter(q => {
        if (banca && q.banca !== banca) return false;
        if (materia && q.materia !== materia) return false;
        if (tag && !(q.tags || []).some(t => t.toLowerCase() === tag)) return false;
        if (termo && !`${q.enunciado} ${q.alternativas.join(" ")}`.toLowerCase().includes(termo)) return false;
        return true;
    });
}

function definirTag(tag) {
    tagSelecionada = tag;
    atualizarChipTag(chipTag, tagSelecionada);
    aplicarFiltros();
}

function aplicarFiltros() {
    simulado = null;
    pararCronometro(displayCronometro);
    renderizarQuestoes(container, filtrarQuestoes(), historico);
}

// ---------- RESPOSTAS E PONTUAÇÃO ----------
function responder(card, botao) {
    if (simulado && simulado.finalizado) return;
    if (!simulado && card.dataset.respondida) return;

    const q = porId.get(card.dataset.id);
    if (!q) return;

    const letra = botao.dataset.letra;

    if (simulado) {
        simulado.respostas[q.id] = letra;
        card.querySelectorAll(".btn-opcao").forEach(b => b.classList.remove("selecionada"));
        botao.classList.add("selecionada");
        
        const fb = card.querySelector(".feedback-area");
        fb.className = "feedback-area feedback neutro";
        fb.innerText = "Resposta registrada. Você pode alterar antes de finalizar.";
        return; 
    }

    card.dataset.respondida = "1";
    botao.classList.add("selecionada"); 

    const acertou = letra === gabaritoDe(q);

    if (!historico[q.id]) {
        historico[q.id] = { acertos: 0, erros: 0, tentativas: 0, ultimaResposta: null, recentes: [] };
    }
    const h = historico[q.id];
    if (!Array.isArray(h.recentes)) h.recentes = [];

    h.tentativas = (h.tentativas || 0) + 1;
    if (acertou) h.acertos = (h.acertos || 0) + 1;
    else h.erros = (h.erros || 0) + 1;
    
    h.ultimaResposta = acertou ? 'certo' : 'errado';
    h.recentes.push(acertou ? 1 : 0);
    if (h.recentes.length > 5) h.recentes.shift();
    h.ultimaData = Date.now();
    salvarHistorico(historico);

    revelar(card, q, letra);

    const status = classificarStatus(q.id, historico);
    const badge = card.querySelector(".badge");
    badge.className = `badge ${status.classe}`;
    badge.innerText = status.texto;
    card.querySelector(".tentativas").innerText = `Tentativas: ${h.tentativas}`;

    atualizarPlacar(historico, questoes);
}

// ---------- EXPORTAR / IMPORTAR ----------
function exportarHistorico() {
    const blob = new Blob([JSON.stringify(historico, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `focopro-historico-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Download do histórico iniciado!", "sucesso");
}

function importarHistorico(arquivo) {
    const leitor = new FileReader();
    leitor.onload = async () => {
        try {
            const dados = JSON.parse(leitor.result);
            const valido = dados && typeof dados === 'object' && !Array.isArray(dados) &&
                Object.values(dados).every(h => h && typeof h === 'object' && typeof h.tentativas === 'number');
            
            if (!valido) throw new Error("formato inválido");

            const confirmado = await showConfirmModal({
                titulo: "Importar Histórico",
                mensagem: `Deseja importar o progresso de ${Object.keys(dados).length} questões e substituir o histórico atual?`,
                textoConfirmar: "Substituir Dados",
                corPerigo: true
            });

            if (!confirmado) return;

            historico = dados;
            salvarHistorico(historico);
            atualizarPlacar(historico, questoes);
            aplicarFiltros();
            showToast("Histórico importado com sucesso!", "sucesso");
        } catch (e) {
            showToast("Arquivo JSON inválido. Use um backup exportado pelo FocoPro.", "erro");
        }
    };
    leitor.readAsText(arquivo);
}

// ---------- ESCUTADORES DE EVENTOS ----------
container.addEventListener("click", e => {
    // 1. Responder opção de questão
    const opcao = e.target.closest(".btn-opcao");
    if (opcao && !opcao.disabled) {
        responder(opcao.closest(".questao-card"), opcao);
        return;
    }

    // 2. Filtrar por Tag
    const tag = e.target.closest(".tag-item");
    if (tag) {
        definirTag(tag.dataset.tag);
        return;
    }

    // 3. Finalizar Simulado
    if (e.target.closest("#btn-finalizar")) {
        finalizarSimulado(simulado, container, porId, historico, questoes, false);
        return;
    }

    // 4. Toggle da Caixa de Anotação (Caderno de Erros)
    const btnToggleAnotacao = e.target.closest(".btn-anotacao-toggle");
    if (btnToggleAnotacao) {
        const card = btnToggleAnotacao.closest(".questao-card");
        const box = card.querySelector(".box-anotacao");
        box.hidden = !box.hidden;
        return;
    }

    // 5. Salvar Anotação Pessoal
    const btnSalvarAnotacao = e.target.closest(".btn-salvar-anotacao");
    if (btnSalvarAnotacao) {
        const card = btnSalvarAnotacao.closest(".questao-card");
        const qId = card.dataset.id;
        const texto = card.querySelector(".input-anotacao").value.trim();

        if (!historico[qId]) {
            historico[qId] = { acertos: 0, erros: 0, tentativas: 0, ultimaResposta: null, recentes: [] };
        }

        historico[qId].anotacao = texto;
        salvarHistorico(historico);
        
        showToast("Anotação salva no seu Caderno de Erros!", "sucesso");
        
        const spanBtn = card.querySelector(".btn-anotacao-toggle span");
        if (spanBtn) spanBtn.innerText = texto ? "Editar Anotação Pessoal" : "Adicionar Anotação Pessoal";
    }
});

// ---------- BOTÃO MODO REVISÃO / CADERNO DE ERROS ----------
document.getElementById("btn-modo-revisao").addEventListener("click", () => {
    simulado = null;
    pararCronometro(displayCronometro);
    
    // Filtra questões que possuem erros recentes OU anotações salvas
    const cadernoDeErros = questoes.filter(q => {
        const h = historico[q.id];
        if (!h) return false;
        return h.ultimaResposta === 'errado' || (h.anotacao && h.anotacao.length > 0);
    });

    renderizarQuestoes(
        container, 
        cadernoDeErros, 
        historico, 
        "Seu Caderno de Erros está vazio! Nenhuma questão pendente para revisão ou com anotações salvas."
    );
    
    showToast(`Carregadas ${cadernoDeErros.length} questões no Caderno de Erros.`, "info");
});
// ---------- CARGA INICIAL ASSÍNCRONA ----------
async function iniciarApp() {
    // 1. Busca as questões via Fetch API (async/await)
    questoes = await carregarQuestoes();

    // 2. Cria o Map de acesso rápido por ID
    porId = new Map(questoes.map(q => [String(q.id), q]));

    // 3. Valida os dados e popula a interface
    validarQuestoes();
    preencherSelect(selectBanca, "🏛️ Todas as Bancas", "banca", questoes);
    preencherSelect(selectMateria, "📖 Todas as Matérias", "materia", questoes);
    atualizarPlacar(historico, questoes);
    aplicarFiltros();
}

// Dispara a inicialização
iniciarApp();