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
    const opcao = e.target.closest(".btn-opcao");
    if (opcao && !opcao.disabled) {
        responder(opcao.closest(".questao-card"), opcao);
        return;
    }
    const tag = e.target.closest(".tag-item");
    if (tag) {
        definirTag(tag.dataset.tag);
        return;
    }
    if (e.target.closest("#btn-finalizar")) {
        finalizarSimulado(simulado, container, porId, historico, questoes, false);
    }
});

chipTag.addEventListener("click", e => {
    if (e.target.id === "btn-limpar-tag") definirTag("");
});

inputBusca.addEventListener("input", aplicarFiltros);
selectBanca.addEventListener("change", aplicarFiltros);
selectMateria.addEventListener("change", aplicarFiltros);

document.getElementById("btn-simulado").addEventListener("click", () => {
    const qtd = parseInt(document.getElementById("qtd-simulado").value) || 10;
    const tempo = parseInt(document.getElementById("tempo-simulado").value);

    const filtradas = filtrarQuestoes();
    pararCronometro(displayCronometro);

    if (filtradas.length === 0) {
        simulado = null;
        renderizarQuestoes(container, [], historico);
        return;
    }

    const sorteadas = embaralharArray(filtradas).slice(0, qtd);
    simulado = { ids: sorteadas.map(q => q.id), respostas: {}, inicio: Date.now(), finalizado: false };
    renderizarQuestoes(container, sorteadas, historico);
    adicionarBotaoFinalizar(container);

    if (tempo > 0) {
        iniciarCronometro(tempo, displayCronometro, () => {
            finalizarSimulado(simulado, container, porId, historico, questoes, true);
        });
    }
});

document.getElementById("btn-todas").addEventListener("click", () => {
    selectBanca.value = "";
    selectMateria.value = "";
    inputBusca.value = "";
    document.getElementById("qtd-simulado").value = "";
    document.getElementById("tempo-simulado").value = "";
    definirTag("");
});

document.getElementById("btn-modo-revisao").addEventListener("click", () => {
    simulado = null;
    pararCronometro(displayCronometro);
    const erradas = questoes.filter(q => historico[q.id] && historico[q.id].ultimaResposta === 'errado');
    renderizarQuestoes(container, erradas, historico, "Nenhuma questão para revisar. Você não tem erros pendentes.");
});

document.getElementById("btn-limpar-dados").addEventListener("click", async () => {
    const confirmado = await showConfirmModal({
        titulo: "Zerar Histórico",
        mensagem: "Tem certeza que deseja apagar todo o seu progresso? Esta ação não pode ser desfeita.",
        textoConfirmar: "Sim, Apagar Tudo",
        textoCancelar: "Cancelar",
        corPerigo: true
    });

    if (confirmado) {
        localStorage.removeItem('appEstudos_Historico');
        historico = {};
        atualizarPlacar(historico, questoes);
        aplicarFiltros();
        showToast("Seu histórico de progresso foi zerado.", "alerta");
    }
});

btnExportar.addEventListener("click", exportarHistorico);
btnImportar.addEventListener("click", () => inputImportar.click());
inputImportar.addEventListener("change", () => {
    if (inputImportar.files[0]) importarHistorico(inputImportar.files[0]);
    inputImportar.value = "";
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