// ============================================================
// js/app.js - Orquestrador Principal do FocoPro
// ============================================================

// ---------- 1. IMPORTAÇÕES DE MÓDULOS ----------
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

// ---------- 2. ESTADO GLOBAL ----------
let historico = carregarHistorico();
let questoes = [];
let porId = new Map();
let tagSelecionada = "";
let simulado = null;

// ---------- 3. ELEMENTOS DO DOM ----------
const container = document.getElementById("container-questoes");
const selectBanca = document.getElementById("filtro-banca");
const selectMateria = document.getElementById("filtro-materia");
const inputBusca = document.getElementById("filtro-busca");
const displayCronometro = document.getElementById("display-cronometro");

// ---------- 4. ELEMENTOS DINÂMICOS DA SIDEBAR ----------
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

// ---------- 5. UTILITÁRIOS E VALIDAÇÃO ----------
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
        if (ids.has(String(q.id))) console.warn('ID duplicado detectado:', q.id);
        ids.add(String(q.id));
    });
}

// ---------- 6. GERENCIAMENTO DE FILTROS ----------
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

// ---------- 7. LÓGICA DE RESPOSTA E PONTUAÇÃO ----------
function responder(card, botao) {
    if (simulado && simulado.finalizado) return;
    if (!simulado && card.dataset.respondida) return;

    const q = porId.get(card.dataset.id);
    if (!q) return;

    const letraEscolhida = letraDe(botao.dataset.letra || botao.innerText);
    const gabaritoOficial = gabaritoDe(q);

    // MODO SIMULADO: Apenas registra a intenção sem revelar gabarito
    if (simulado) {
        const idStr = String(q.id);
        simulado.respostas[idStr] = letraEscolhida;
        simulado.respostas[q.id] = letraEscolhida;
        
        card.querySelectorAll(".btn-opcao").forEach(b => b.classList.remove("selecionada"));
        botao.classList.add("selecionada");
        
        const fb = card.querySelector(".feedback-area");
        if (fb) {
            fb.className = "feedback-area feedback neutro";
            fb.innerText = "Resposta registrada. Você pode alterar antes de finalizar.";
        }
        return; 
    }

    // MODO ESTUDO / REVISÃO: Processamento imediato
    card.dataset.respondida = "1";
    botao.classList.add("selecionada"); 

    const acertou = (letraEscolhida === gabaritoOficial);
    const idChave = String(q.id);

    if (!historico[idChave]) {
        historico[idChave] = { acertos: 0, erros: 0, tentativas: 0, ultimaResposta: null, recentes: [], status: 'novo' };
    }
    const h = historico[idChave];
    if (!Array.isArray(h.recentes)) h.recentes = [];

    h.tentativas = (h.tentativas || 0) + 1;
    if (acertou) {
        h.acertos = (h.acertos || 0) + 1;
        // Se a questão estava pendente no Caderno de Erros e foi acertada, é promovida a 'superado'
        if (h.status === 'erro' || h.ultimaResposta === 'errado') {
            h.status = 'superado';
        } else {
            h.status = 'acerto';
        }
    } else {
        h.erros = (h.erros || 0) + 1;
        h.status = 'erro';
    }
    
    h.ultimaResposta = acertou ? 'certo' : 'errado';
    h.recentes.push(acertou ? 1 : 0);
    if (h.recentes.length > 5) h.recentes.shift();
    h.ultimaData = Date.now();
    
    salvarHistorico(historico);

    // Revela feedback e atualiza badge visual no card
    revelar(card, q, letraEscolhida);

    const status = classificarStatus(idChave, historico);
    const badge = card.querySelector(".badge");
    if (badge) {
        badge.className = `badge ${status.classe}`;
        badge.innerText = status.texto;
    }
    const elemTentativas = card.querySelector(".tentativas");
    if (elemTentativas) elemTentativas.innerText = `Tentativas: ${h.tentativas}`;

    // Atualiza placar global e mapa de matérias no painel lateral
    atualizarPlacar(historico, questoes);
}

// ---------- 8. EXPORTAÇÃO E IMPORTAÇÃO DE BACKUP ----------
function exportarHistorico() {
    const blob = new Blob([JSON.stringify(historico, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `focopro-historico-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    showToast("Download do histórico iniciado!", "sucesso");
}

function importarHistorico(arquivo) {
    const leitor = new FileReader();
    leitor.onload = async () => {
        try {
            const dados = JSON.parse(leitor.result);
            const valido = dados && typeof dados === 'object' && !Array.isArray(dados);
            
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
            showToast("Arquivo JSON inválido. Use um backup original do FocoPro.", "erro");
        }
    };
    leitor.readAsText(arquivo);
}

// ---------- 9. DELEGAÇÃO E ESCUTADORES DE EVENTOS ----------
container.addEventListener("click", e => {
    // 1. Responder Questão
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

    // 3. Finalizar Simulado Manualmente
    if (e.target.closest("#btn-finalizar")) {
        finalizarSimulado(simulado, container, porId, historico, questoes, false);
        return;
    }

    // 4. Toggle Caixa de Anotação
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
            historico[qId] = { acertos: 0, erros: 0, tentativas: 0, ultimaResposta: null, recentes: [], status: 'novo' };
        }

        historico[qId].anotacao = texto;
        salvarHistorico(historico);
        
        atualizarPlacar(historico, questoes);
        showToast("Anotação salva no seu Caderno de Erros!", "sucesso");
        
        const spanBtn = card.querySelector(".btn-anotacao-toggle span");
        if (spanBtn) spanBtn.innerText = texto ? "Editar Anotação Pessoal" : "Adicionar Anotação Pessoal";
    }
});

chipTag.addEventListener("click", e => {
    if (e.target.id === "btn-limpar-tag") definirTag("");
});

inputBusca.addEventListener("input", aplicarFiltros);
selectBanca.addEventListener("change", aplicarFiltros);
selectMateria.addEventListener("change", aplicarFiltros);

// Modo Simulado
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

// Limpar Filtros
document.getElementById("btn-todas").addEventListener("click", () => {
    selectBanca.value = "";
    selectMateria.value = "";
    inputBusca.value = "";
    document.getElementById("qtd-simulado").value = "";
    document.getElementById("tempo-simulado").value = "";
    tagSelecionada = "";
    atualizarChipTag(chipTag, tagSelecionada);
    aplicarFiltros();
    showToast("Exibindo todas as questões.", "info");
});

// Modo Revisão / Caderno de Erros
document.getElementById("btn-modo-revisao").addEventListener("click", () => {
    simulado = null;
    pararCronometro(displayCronometro);
    
    const cadernoDeErros = questoes.filter(q => {
        const idStr = String(q.id);
        const h = historico[idStr] || historico[q.id];
        if (!h) return false;
        
        const ehErroAtivo = h.status === 'erro' || (h.ultimaResposta === 'errado' && h.status !== 'superado');
        const temAnotacao = h.anotacao && String(h.anotacao).trim().length > 0;
        
        return ehErroAtivo || temAnotacao;
    });

    renderizarQuestoes(
        container, 
        cadernoDeErros, 
        historico, 
        "Seu Caderno de Erros está limpo! Nenhuma questão pendente para revisão no momento."
    );
    
    showToast(`Carregadas ${cadernoDeErros.length} questões no Caderno de Erros.`, "info");
});

// Zerar Histórico Geral
if (btnLimpar) {
    btnLimpar.addEventListener("click", async () => {
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
}

btnExportar.addEventListener("click", exportarHistorico);
btnImportar.addEventListener("click", () => inputImportar.click());
inputImportar.addEventListener("change", () => {
    if (inputImportar.files[0]) importarHistorico(inputImportar.files[0]);
    inputImportar.value = "";
});

// ---------- 10. CARGA INICIAL ASSÍNCRONA ----------
async function iniciarApp() {
    questoes = await carregarQuestoes();
    porId = new Map(questoes.map(q => [String(q.id), q]));
    validarQuestoes();
    preencherSelect(selectBanca, "🏛️ Todas as Bancas", "banca", questoes);
    preencherSelect(selectMateria, "📖 Todas as Matérias", "materia", questoes);
    atualizarPlacar(historico, questoes);
    aplicarFiltros();
}

iniciarApp();
// ---------- REGISTRO DO SERVICE WORKER (PWA) ----------
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => console.log('Service Worker registrado com sucesso! Escopo:', reg.scope))
            .catch(err => console.error('Falha ao registrar Service Worker:', err));
    });
}
