// ============================================================
// js/app.js - Orquestrador Principal do FocoPro
// ============================================================

// ---------- 1. IMPORTAÇÕES DE MÓDULOS ----------
import { carregarHistorico, salvarHistorico } from './storage.js';
import {
    obterOpcoes,
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
if (container && container.parentNode) {
    container.parentNode.insertBefore(chipTag, container);
}

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
        const idStr = String(q.id);
        if (ids.has(idStr)) console.warn('[FocoPro] ID duplicado detectado:', q.id);
        ids.add(idStr);
    });
}

// ---------- 6. GERENCIAMENTO DE FILTROS ----------
function filtrarQuestoes() {
    const banca = selectBanca ? selectBanca.value : "";
    const materia = selectMateria ? selectMateria.value : "";
    const termo = inputBusca ? inputBusca.value.trim().toLowerCase() : "";
    const tag = tagSelecionada.toLowerCase();

    return questoes.filter(q => {
        if (banca && q.banca !== banca) return false;
        if (materia && q.materia !== materia) return false;
        if (tag && !(q.tags || []).some(t => String(t).toLowerCase() === tag)) return false;

        if (termo) {
            const textoOpcoes = obterOpcoes(q).map(op => op.texto).join(" ");
            const textoTags = (q.tags || []).join(" ");
            const alvoBusca = `${q.enunciado || ""} ${textoOpcoes} ${textoTags} ${q.banca || ""} ${q.orgao || ""}`.toLowerCase();
            if (!alvoBusca.includes(termo)) return false;
        }
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
    if (!card) return;
    if (simulado && simulado.finalizado) return;
    if (!simulado && card.dataset.respondida === "1") return;

    const idChave = String(card.dataset.id);
    const q = porId.get(idChave);
    if (!q) return;

    const radioSelecionado = card.querySelector(".radio-opcao:checked");
    if (!radioSelecionado) {
        showToast("Selecione uma alternativa antes de responder!", "alerta");
        return;
    }

    const letraEscolhida = radioSelecionado.value;
    const gabaritoOficial = gabaritoDe(q);

    // MODO SIMULADO: Registra a resposta sem revelar o gabarito
    if (simulado) {
        simulado.respostas[idChave] = letraEscolhida;
        simulado.respostas[q.id] = letraEscolhida;

        card.querySelectorAll(".opcao-item").forEach(op => op.classList.remove("selecionada"));
        const labelPai = radioSelecionado.closest(".opcao-item");
        if (labelPai) labelPai.classList.add("selecionada");

        const fbContainer = card.querySelector(".feedback-container");
        if (fbContainer) {
            fbContainer.classList.remove("oculta", "correto", "incorreto");
            fbContainer.classList.add("neutro");
            const gabaritoDiv = fbContainer.querySelector(".gabarito-resposta");
            if (gabaritoDiv) {
                gabaritoDiv.innerHTML = `📌 Alternativa <strong>(${letraEscolhida})</strong> registrada no simulado. Você pode alterar antes de finalizar.`;
            }
        }
        showToast(`Questão registrada: alternativa ${letraEscolhida}`, "info", 1800);
        return;
    }

    // MODO ESTUDO / REVISÃO: Processamento imediato
    card.dataset.respondida = "1";
    if (botao) botao.disabled = true;

    const acertou = (letraEscolhida === gabaritoOficial);

    if (!historico[idChave]) {
        historico[idChave] = { acertos: 0, erros: 0, tentativas: 0, ultimaResposta: null, recentes: [], status: 'novo' };
    }
    const h = historico[idChave];
    if (!Array.isArray(h.recentes)) h.recentes = [];

    h.tentativas = (h.tentativas || 0) + 1;
    if (acertou) {
        h.acertos = (h.acertos || 0) + 1;
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

    // Revela feedback oficial e destaca alternativas no card
    revelar(card, q, letraEscolhida);

    // Atualiza badge de status e contador de tentativas no card
    const status = classificarStatus(idChave, historico);
    const badge = card.querySelector(".badge");
    if (badge) {
        badge.className = `badge ${status.classe}`;
        badge.innerText = status.texto;
    }

    const elemTentativas = card.querySelector(".tentativas");
    if (elemTentativas) {
        elemTentativas.innerText = `Tentativas: ${h.tentativas}`;
    }

    // Atualiza placar global e mapa de matérias na sidebar
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
if (container) {
    // Em Modo Simulado, marcar uma opção já registra automaticamente a escolha
    container.addEventListener("change", (e) => {
        if (e.target.classList.contains("radio-opcao") && simulado && !simulado.finalizado) {
            const card = e.target.closest(".card-questao");
            const btn = card ? card.querySelector(".btn-responder") : null;
            if (card) responder(card, btn);
        }
    });

    container.addEventListener("click", (e) => {
        // 1. Clique no botão "Responder"
        const btnResponder = e.target.closest(".btn-responder");
        if (btnResponder) {
            const card = btnResponder.closest(".card-questao");
            if (card) responder(card, btnResponder);
            return;
        }

        // 2. Clique em tags dentro dos cards (#sql, #uml)
        const elemTag = e.target.closest(".tag-item");
        if (elemTag) {
            const tagTexto = elemTag.dataset.tag || elemTag.innerText.replace(/^#/, "").trim();
            if (tagTexto) definirTag(tagTexto);
            return;
        }

        // 3. Botão de Finalizar Simulado
        const btnFinalizar = e.target.closest("#btn-finalizar-simulado, #btn-finalizar");
        if (btnFinalizar && simulado) {
            pararCronometro(displayCronometro);
            finalizarSimulado(simulado, container, porId, historico, questoes, false);
            return;
        }

        // 4. Abrir/Fechar Caixa de Anotação Pessoal
        const btnToggleAnotacao = e.target.closest(".btn-anotacao-toggle");
        if (btnToggleAnotacao) {
            const card = btnToggleAnotacao.closest(".card-questao");
            const box = card ? card.querySelector(".box-anotacao") : null;
            if (box) box.hidden = !box.hidden;
            return;
        }

        // 5. Salvar Anotação Pessoal no Caderno de Erros
        const btnSalvarAnotacao = e.target.closest(".btn-salvar-anotacao");
        if (btnSalvarAnotacao) {
            const card = btnSalvarAnotacao.closest(".card-questao");
            if (!card) return;
            const qId = String(card.dataset.id);
            const inputAnot = card.querySelector(".input-anotacao");
            const texto = inputAnot ? inputAnot.value.trim() : "";

            if (!historico[qId]) {
                historico[qId] = { acertos: 0, erros: 0, tentativas: 0, ultimaResposta: null, recentes: [], status: 'novo' };
            }

            historico[qId].anotacao = texto;
            salvarHistorico(historico);
            atualizarPlacar(historico, questoes);

            showToast(texto ? "Anotação salva no seu Caderno de Erros!" : "Anotação removida.", "sucesso");

            const spanBtn = card.querySelector(".btn-anotacao-toggle span");
            if (spanBtn) {
                spanBtn.innerText = texto ? "Editar Anotação Pessoal" : "Adicionar Anotação Pessoal";
            }
        }
    });
}

chipTag.addEventListener("click", e => {
    if (e.target.id === "btn-limpar-tag") definirTag("");
});

if (inputBusca) inputBusca.addEventListener("input", aplicarFiltros);
if (selectBanca) selectBanca.addEventListener("change", aplicarFiltros);
if (selectMateria) selectMateria.addEventListener("change", aplicarFiltros);

// Modo Simulado
const btnSimulado = document.getElementById("btn-simulado");
if (btnSimulado) {
    btnSimulado.addEventListener("click", () => {
        const inputQtd = document.getElementById("qtd-simulado");
        const inputTempo = document.getElementById("tempo-simulado");
        const qtd = parseInt(inputQtd ? inputQtd.value : 10) || 10;
        const tempo = parseInt(inputTempo ? inputTempo.value : 0);

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

        showToast(`Simulado iniciado com ${sorteadas.length} questões!`, "info");

        if (tempo > 0) {
            iniciarCronometro(tempo, displayCronometro, () => {
                finalizarSimulado(simulado, container, porId, historico, questoes, true);
            });
        }
    });
}

// Limpar Filtros / Ver Todas
const btnTodas = document.getElementById("btn-todas");
if (btnTodas) {
    btnTodas.addEventListener("click", () => {
        if (selectBanca) selectBanca.value = "";
        if (selectMateria) selectMateria.value = "";
        if (inputBusca) inputBusca.value = "";

        const inputQtd = document.getElementById("qtd-simulado");
        const inputTempo = document.getElementById("tempo-simulado");
        if (inputQtd) inputQtd.value = "";
        if (inputTempo) inputTempo.value = "";

        tagSelecionada = "";
        atualizarChipTag(chipTag, tagSelecionada);
        aplicarFiltros();
        showToast("Exibindo todas as questões.", "info");
    });
}

// Modo Revisão / Caderno de Erros
const btnModoRevisao = document.getElementById("btn-modo-revisao");
if (btnModoRevisao) {
    btnModoRevisao.addEventListener("click", () => {
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
}

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

// Backup (Exportar / Importar)
btnExportar.addEventListener("click", exportarHistorico);
btnImportar.addEventListener("click", () => inputImportar.click());
inputImportar.addEventListener("change", () => {
    if (inputImportar.files[0]) importarHistorico(inputImportar.files[0]);
    inputImportar.value = "";
});

// ---------- 10. CARGA INICIAL ASSÍNCRONA ----------
async function iniciarApp() {
    pararCronometro(displayCronometro);
    questoes = await carregarQuestoes();
    porId = new Map(questoes.map(q => [String(q.id), q]));
    validarQuestoes();
    preencherSelect(selectBanca, "🏛️ Todas as Bancas", "banca", questoes);
    preencherSelect(selectMateria, "📖 Todas as Matérias", "materia", questoes);
    atualizarPlacar(historico, questoes);
    aplicarFiltros();
}

iniciarApp();

// ---------- 11. REGISTRO DO SERVICE WORKER (PWA) ----------
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(reg => {
                reg.update();
                console.log('Service Worker ativo no escopo:', reg.scope);
            })
            .catch(err => console.error('Falha ao registrar Service Worker:', err));
    });
}