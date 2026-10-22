// ============================================================
// js/app.js - Orquestrador Principal do FocoPro
// ============================================================

// ==================== INÍCIO: 1. IMPORTAÇÕES DE MÓDULOS ====================

// ---------- 1.1 Interface (ui.js) ----------
import {
    esc,                    // escapa HTML (usado em formatarExplicacaoIA)
    obterOpcoes,
    gabaritoDe,
    preencherSelect,
    atualizarChipTag,
    atualizarPlacar,
    renderizarQuestoes,
    revelar,
    classificarStatus
} from './ui.js';

// ---------- 1.2 Supabase (banco e cliente) ----------
import {
    supabaseClient,
    salvarRespostaNoHistorico,
    salvarQuestoesEmMassa,
    carregarTodasQuestoes
} from './supabase.js';

// ---------- 1.3 Autenticação ----------
import { criarConta, entrar, sair } from './auth.js';

// ---------- 1.4 Armazenamento local (localStorage) ----------
import {
    carregarHistorico,
    salvarHistorico,
    salvarQuestoesLocais,
    carregarQuestoesLocais
} from './storage.js';

// ---------- 1.5 Simulado (cronômetro e finalização) ----------
import {
    iniciarCronometro,
    pararCronometro,
    adicionarBotaoFinalizar,
    finalizarSimulado
} from './simulado.js';

// ---------- 1.6 Notificações (toast e modal) ----------
import { showToast, showConfirmModal } from './notifications.js';

// ---------- 1.7 API de questões ----------
import { carregarQuestoes, normalizarQuestao } from './api.js';

// ==================== FIM: 1. IMPORTAÇÕES DE MÓDULOS ====================
// ---------- 2. ESTADO GLOBAL ----------
let historico = {};
let questoes = [];
let porId = new Map();
let tagSelecionada = "";
let simulado = null;
const ADMIN_UID = '82cc7c31-2be4-4aba-8eb9-80067f545f3e'; // mesmo UUID usado nas políticas de RLS da tabela questoes

export let usuarioAtual = null;

// Questões padrão para a tela nunca iniciar vazia
const questoesPadrao = [
    {
        id: "git_01",
        enunciado: "Qual comando do Git envia os commits do repositório local para o remoto?",
        pergunta: "Qual comando do Git envia os commits do repositório local para o remoto?",
        alternativas: ["git pull", "git push", "git commit", "git fetch"],
        gabarito: "B",
        resposta_correta: "B",
        explicacao: "O comando git push envia (empurra) as alterações confirmadas localmente para o repositório remoto (como o GitHub).",
        materia: "Desenvolvimento, POO & Linguagens",
        banca: "Cesgranrio"
    },
    {
        id: "bd_01",
        enunciado: "No modelo relacional de banco de dados, qual chave identifica unicamente cada registro em uma tabela?",
        pergunta: "No modelo relacional de banco de dados, qual chave identifica unicamente cada registro em uma tabela?",
        alternativas: ["Chave Estrangeira", "Chave Primária", "Chave Candidata", "Chave Substituta"],
        gabarito: "B",
        resposta_correta: "B",
        explicacao: "A Chave Primária (Primary Key) identifica de forma única cada tupla (linha) de uma relação, não permitindo valores nulos.",
        materia: "Banco de Dados & Dados",
        banca: "Cesgranrio"
    }
];

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
// ==================== INÍCIO: COLAR DEPOIS DE embaralharArray ====================

// Distribui as questões (já embaralhadas/priorizadas) intercalando entre as matérias,
// para o simulado não vir concentrado numa matéria só quando o filtro é "Todas"
function distribuirPorMateria(pool, qtd) {
    const porMateria = new Map();
    pool.forEach(q => {
        const m = q.materia || "Geral";
        if (!porMateria.has(m)) porMateria.set(m, []);
        porMateria.get(m).push(q);
    });

    const materias = [...porMateria.keys()];
    const resultado = [];

    while (resultado.length < qtd) {
        let adicionouAlgum = false;
        for (const m of materias) {
            if (resultado.length >= qtd) break;
            const lista = porMateria.get(m);
            if (lista.length > 0) {
                resultado.push(lista.shift());
                adicionouAlgum = true;
            }
        }
        if (!adicionouAlgum) break; // esgotou as questões de todas as matérias
    }
    return resultado;
}

// Monta a lista final do simulado aplicando as opções marcadas pelo usuário:
// só novas, priorizar erros e/ou equilibrar por matéria.
function sortearSimulado(filtradas, qtd, historicoAtual, opcoes = {}) {
    let pool = filtradas;

    if (opcoes.somenteNovas) {
        pool = pool.filter(q => {
            const h = historicoAtual[String(q.id)];
            return !h || !h.tentativas;
        });
    }

    if (pool.length === 0) return [];

    if (opcoes.priorizarErros) {
        const comErro = [];
        const resto = [];
        pool.forEach(q => {
            const h = historicoAtual[String(q.id)];
            if (h && h.status === "erro") comErro.push(q);
            else resto.push(q);
        });
        pool = [...embaralharArray(comErro), ...embaralharArray(resto)];
    } else {
        pool = embaralharArray(pool);
    }

    if (opcoes.equilibrar) {
        return distribuirPorMateria(pool, qtd);
    }

    return pool.slice(0, qtd);
}
// ==================== FIM ====================

function mesclarQuestoes(...listas) {
    const mapa = new Map();
    let contador = 0;

    listas.forEach(lista => {
        if (!Array.isArray(lista)) return;
        lista.forEach(item => {
            if (!item || typeof item !== "object") return;
            const qNorm = normalizarQuestao({ ...item }, contador++);
            if (!qNorm.enunciado && !qNorm.pergunta) return;

            const idStr = String(qNorm.id);
            if (!mapa.has(idStr)) {
                mapa.set(idStr, qNorm);
            } else {
                const existente = mapa.get(idStr);
                mapa.set(idStr, {
                    ...existente,
                    ...qNorm,
                    enunciado: qNorm.enunciado || existente.enunciado,
                    pergunta: qNorm.pergunta || existente.pergunta,
                    explicacao: qNorm.explicacao || existente.explicacao || "",
                    ano: qNorm.ano || existente.ano || "",
                    orgao: qNorm.orgao || existente.orgao || null
                });
            }
        });
    });

    return Array.from(mapa.values());
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
            const alvoBusca = `${q.enunciado || q.pergunta || ""} ${textoOpcoes} ${textoTags} ${q.banca || ""} ${q.orgao || ""}`.toLowerCase();
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
async function responder(card, botao) {
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
    const acertou = (letraEscolhida === gabaritoOficial);

    // 1. MODO SIMULADO: registra sem revelar o gabarito
    if (simulado) {
        simulado.respostas[idChave] = letraEscolhida;
        if (q.id) simulado.respostas[q.id] = letraEscolhida;

        card.querySelectorAll(".opcao-item").forEach(op => op.classList.remove("selecionada"));
        const labelPai = radioSelecionado.closest(".opcao-item");
        if (labelPai) labelPai.classList.add("selecionada");

        const fbContainer = card.querySelector(".feedback-container");
        if (fbContainer) {
            fbContainer.classList.remove("oculta", "correto", "incorreto");
            fbContainer.classList.add("neutro");
            fbContainer.style.display = "block";
            const gabaritoDiv = fbContainer.querySelector(".gabarito-resposta");
            if (gabaritoDiv) {
                gabaritoDiv.innerHTML = `📌 Alternativa <strong>(${letraEscolhida})</strong> registrada no simulado. Você pode alterar antes de finalizar.`;
            }
        }
        showToast(`Questão registrada: alternativa ${letraEscolhida}`, "info", 1800);
        return;
    }

    // 2. MODO ESTUDO / REVISÃO
    card.dataset.respondida = "1";
    if (botao) botao.disabled = true;

    // 3. ATUALIZAÇÃO DO HISTÓRICO LOCAL IMEDIATA (Garante persistência no F5)
    if (!historico[idChave]) {
        historico[idChave] = {
            acertos: 0,
            erros: 0,
            tentativas: 0,
            ultimaResposta: null,
            ultimaEscolha: null,
            recentes: [],
            status: 'novo',
            anotacao: ""
        };
    }
    const h = historico[idChave];
    if (!Array.isArray(h.recentes)) h.recentes = [];

    h.tentativas = (h.tentativas || 0) + 1;
    if (acertou) {
        h.acertos = (h.acertos || 0) + 1;
        h.status = (h.status === 'erro' || h.ultimaResposta === 'errado') ? 'superado' : 'acerto';
    } else {
        h.erros = (h.erros || 0) + 1;
        h.status = 'erro';
    }

    h.ultimaResposta = acertou ? 'certo' : 'errado';
    h.ultimaEscolha = letraEscolhida;
    h.materia = q.materia || 'Geral';
    h.recentes.push(acertou ? 1 : 0);
    if (h.recentes.length > 5) h.recentes.shift();
    h.ultimaData = Date.now();

    salvarHistorico(historico);

    // 4. REVELAR O GABARITO NA TELA E ATUALIZAR PLACAR
    revelar(card, q, letraEscolhida);

    const status = classificarStatus(idChave, historico);
    const badge = card.querySelector(".badge");
    if (badge && status) {
        badge.className = `badge ${status.classe}`;
        badge.innerText = status.texto;
    }

    const elemTentativas = card.querySelector(".tentativas");
    if (elemTentativas) {
        elemTentativas.innerText = `Tentativas: ${h.tentativas}`;
    }

    atualizarPlacar(historico, questoes);

    // 5. PERSISTÊNCIA NO SUPABASE EM SEGUNDO PLANO
    salvarRespostaNoHistorico({
        questaoId: idChave,
        materia: q.materia || q.disciplina || 'Geral',
        banca: q.banca || 'Não informada',
        acertou: acertou,
        respostaEscolhida: letraEscolhida
    });
}

function destravarCardParaRefazer(card) {
    if (!card) return;
    delete card.dataset.respondida;

    card.querySelectorAll(".opcao-item").forEach(label => {
        label.classList.remove("selecionada", "correta", "incorreta", "desabilitada");
        const radio = label.querySelector(".radio-opcao");
        if (radio) {
            radio.disabled = false;
            radio.checked = false;
        }
    });

    const btnResponder = card.querySelector(".btn-responder");
    if (btnResponder) {
        btnResponder.disabled = false;
        btnResponder.innerText = "✔ Responder";
    }

    const btnRefazer = card.querySelector(".btn-refazer");
    if (btnRefazer) {
        btnRefazer.hidden = true;
    }

    const fbContainer = card.querySelector(".feedback-container");
    if (fbContainer) {
        fbContainer.classList.add("oculta");
        fbContainer.classList.remove("correto", "incorreto", "neutro");
        fbContainer.style.display = "";
    }
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
    container.addEventListener("change", (e) => {
        if (e.target.classList.contains("radio-opcao") && simulado && !simulado.finalizado) {
            const card = e.target.closest(".card-questao");
            const btn = card ? card.querySelector(".btn-responder") : null;
            if (card) responder(card, btn);
        }
    });

    container.addEventListener("click", (e) => {
        // >>>>>>>>>> INÍCIO BLOCO A: HELPERS DA IA >>>>>>>>>>
const IA_MSG_PADRAO = "Não foi possível gerar a explicação agora. Tente novamente em instantes.";

// Escapa TUDO primeiro e só depois aplica **negrito**, "- item" e quebras de linha
function formatarExplicacaoIA(texto) {
    return esc(String(texto ?? ""))
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/^\s*[-•]\s+/gm, "• ")
        .replace(/\n/g, "<br>");
}

// invoke() devolve FunctionsHttpError em status != 2xx; a mensagem do servidor está em error.context
async function extrairMensagemErroIA(error) {
    if (!navigator.onLine) return "Sem conexão com a internet. Verifique e tente novamente.";
    try {
        if (error && error.context && typeof error.context.json === "function") {
            const corpo = await error.context.json();
            if (corpo && typeof corpo.message === "string") return corpo.message;
        }
    } catch (_) { /* corpo não era JSON: usa a mensagem padrão */ }
    return IA_MSG_PADRAO;
}

async function solicitarExplicacaoIA(btnIA) {
    if (btnIA.disabled) return; // evita clique duplo (cobrança dupla na API)

    const card = btnIA.closest(".card-questao");
    if (!card) return;

    const qId = String(card.dataset.id);
    const q = porId.get(qId);
    const h = historico[qId];
    const caixa = card.querySelector(".ia-resposta-container");
    if (!q || !h || !caixa) return;

    btnIA.disabled = true;
    btnIA.textContent = "⏳ Processando com IA...";
    caixa.style.display = "block";
    caixa.innerHTML = "<em>A IA está analisando a questão e a sua resposta...</em>";

    try {
        const { data, error } = await supabaseClient.functions.invoke("super-function", {
            body: {
                pergunta: q.enunciado || q.pergunta,
                alternativas: obterOpcoes(q),
                respostaUsuario: h.ultimaEscolha,
                gabarito: gabaritoDe(q)
            }
        });
        if (error) throw error;
        if (!data || data.ok !== true || typeof data.explicacao !== "string") {
            throw new Error("Resposta inesperada da função");
        }

        caixa.innerHTML = formatarExplicacaoIA(data.explicacao);
        btnIA.style.display = "none";
    } catch (erro) {
        console.error("Erro na chamada da IA:", erro);
        const msg = await extrairMensagemErroIA(erro);

        // textContent: a mensagem nunca é interpretada como HTML
        caixa.textContent = "";
        const aviso = document.createElement("span");
        aviso.style.color = "#f87171";
        aviso.textContent = "⚠️ " + msg;
        caixa.appendChild(aviso);

        btnIA.disabled = false;
        btnIA.textContent = "✨ Tentar novamente";
    }
}
// <<<<<<<<<< FIM BLOCO A <<<<<<<<<<
        const btnResponder = e.target.closest(".btn-responder");
        if (btnResponder) {
            const card = btnResponder.closest(".card-questao");
            if (card) responder(card, btnResponder);
            return;
        }

        const btnRefazer = e.target.closest(".btn-refazer");
        if (btnRefazer) {
            const card = btnRefazer.closest(".card-questao");
            if (card) destravarCardParaRefazer(card);
            return;
        }

       // >>>>>>>>>> INÍCIO BLOCO B: CLIQUE NO BOTÃO DE IA >>>>>>>>>>
        // --- BOTÃO: ENTENDER MEU ERRO COM IA ---
        const btnIA = e.target.closest(".btn-ia-explicar");
        if (btnIA) {
            solicitarExplicacaoIA(btnIA);
            return;
        }
// <<<<<<<<<< FIM BLOCO B <<<<<<<<<<

        const elemTag = e.target.closest(".tag-item");
        if (elemTag) {
            const tagTexto = elemTag.dataset.tag || elemTag.innerText.replace(/^#/, "").trim();
            if (tagTexto) definirTag(tagTexto);
            return;
        }

        const btnFinalizar = e.target.closest("#btn-finalizar-simulado, #btn-finalizar");
        if (btnFinalizar && simulado) {
            pararCronometro(displayCronometro);
            finalizarSimulado(simulado, container, porId, historico, questoes, false);
            return;
        }

        const btnToggleAnotacao = e.target.closest(".btn-anotacao-toggle");
        if (btnToggleAnotacao) {
            const card = btnToggleAnotacao.closest(".card-questao");
            const box = card ? card.querySelector(".box-anotacao") : null;
            if (box) box.hidden = !box.hidden;
            return;
        }

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

// ==================== INÍCIO: SUBSTITUIR O BLOCO "10. MODO SIMULADO" ====================
// ---------- 10. MODO SIMULADO ----------
const btnSimulado = document.getElementById("btn-simulado");
if (btnSimulado) {
    btnSimulado.addEventListener("click", () => {
        const inputQtd = document.getElementById("qtd-simulado");
        const inputTempo = document.getElementById("tempo-simulado");
        const qtd = parseInt(inputQtd ? inputQtd.value : 10) || 10;
        const tempo = parseInt(inputTempo ? inputTempo.value : 0) || 0;

        const checkEquilibrar = document.getElementById("check-equilibrar");
        const checkNovas = document.getElementById("check-novas");
        const checkPriorizarErros = document.getElementById("check-priorizar-erros");
        const opcoesSimulado = {
            equilibrar: checkEquilibrar ? checkEquilibrar.checked : false,
            somenteNovas: checkNovas ? checkNovas.checked : false,
            priorizarErros: checkPriorizarErros ? checkPriorizarErros.checked : false
        };

        const filtradas = filtrarQuestoes();
        pararCronometro(displayCronometro);

        const sorteadas = sortearSimulado(filtradas, qtd, historico, opcoesSimulado);

        if (sorteadas.length === 0) {
            simulado = null;
            renderizarQuestoes(container, [], historico);
            showToast(
                opcoesSimulado.somenteNovas
                    ? "Não há questões novas com esse filtro. Desmarque 'Só questões novas' ou mude o filtro."
                    : "Nenhuma questão encontrada com esse filtro.",
                "alerta"
            );
            return;
        }

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
// ==================== FIM ====================

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

// ---------- 11. MODO REVISÃO / CADERNO DE ERROS ----------
const btnModoRevisao = document.getElementById("btn-modo-revisao");
if (btnModoRevisao) {
    btnModoRevisao.addEventListener("click", () => {
        simulado = null;
        pararCronometro(displayCronometro);

        const cadernoDeErros = questoes.filter(q => {
            const h = historico[String(q.id)];
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

// ============================================================
// 12. SISTEMA DE AUTENTICAÇÃO E MODAL
// ============================================================
const modalAuth = document.getElementById('modal-auth');
const formAuth = document.getElementById('form-auth');
const btnAuthAcao = document.getElementById('btn-auth-acao');
const btnAlternarAuth = document.getElementById('btn-alternar-auth');
const authTitulo = document.getElementById('auth-titulo');
const authSubtitulo = document.getElementById('auth-subtitulo');
const btnSubmitAuth = document.getElementById('btn-submit-auth');
const authTextoAlternar = document.getElementById('auth-texto-alternar');
const userEmail = document.getElementById('user-email');
const userAvatar = document.getElementById('user-avatar');

let isCadastro = false;

supabaseClient.auth.onAuthStateChange(async (event, session) => {
    usuarioAtual = session?.user || null;

    if (usuarioAtual) {
        if (userEmail) userEmail.innerText = usuarioAtual.email;
        if (userAvatar) userAvatar.innerText = usuarioAtual.email.charAt(0).toUpperCase();
        if (btnAuthAcao) btnAuthAcao.innerText = "Sair";
        if (modalAuth) modalAuth.classList.remove('visible');

        if (event === 'SIGNED_IN') {
            historico = await carregarHistorico();
            atualizarPlacar(historico, questoes);
            aplicarFiltros();
        }
    } else {
        if (userEmail) userEmail.innerText = "Visitante";
        if (userAvatar) userAvatar.innerText = "?";
        if (btnAuthAcao) btnAuthAcao.innerText = "Fazer Login";
    }
});

if (btnAuthAcao) {
    btnAuthAcao.addEventListener('click', () => {
        if (usuarioAtual) {
            sair();
        } else if (modalAuth) {
            modalAuth.classList.add('visible');
        }
    });
}

if (modalAuth) {
    modalAuth.addEventListener('click', (e) => {
        if (e.target === modalAuth) modalAuth.classList.remove('visible');
    });
}

if (btnAlternarAuth) {
    btnAlternarAuth.addEventListener('click', () => {
        isCadastro = !isCadastro;
        if (isCadastro) {
            authTitulo.innerText = "Criar nova conta";
            authSubtitulo.innerText = "Comece a salvar seu progresso na nuvem.";
            btnSubmitAuth.innerText = "Cadastrar";
            authTextoAlternar.innerText = "Já tem uma conta?";
            btnAlternarAuth.innerText = "Fazer login";
        } else {
            authTitulo.innerText = "Entrar no FocoPro";
            authSubtitulo.innerText = "Sincronize seu histórico e caderno de erros.";
            btnSubmitAuth.innerText = "Entrar";
            authTextoAlternar.innerText = "Não tem uma conta?";
            btnAlternarAuth.innerText = "Criar conta";
        }
    });
}

if (formAuth) {
    formAuth.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('auth-email').value.trim();
        const senha = document.getElementById('auth-senha').value;

        btnSubmitAuth.disabled = true;
        btnSubmitAuth.innerText = "Aguarde...";

        try {
            if (isCadastro) {
                await criarConta(email, senha);
            } else {
                await entrar(email, senha);
            }
        } finally {
            btnSubmitAuth.disabled = false;
            btnSubmitAuth.innerText = isCadastro ? "Cadastrar" : "Entrar";
        }
    });
}

// ==================== INÍCIO: SUBSTITUIR TODA A SEÇÃO 13 (até antes de "14. CARGA INICIAL") ====================
// ============================================================
// 13. IMPORTAÇÃO EM MASSA DE QUESTÕES
// ============================================================
const modalImportar = document.getElementById('modalImportar');
const btnAbrirImportar = document.getElementById('btnAbrirImportar');
const btnFecharImportar = document.getElementById('btnFecharImportar');
const btnProcessarImportacao = document.getElementById('btnProcessarImportacao');
const textoJsonQuestoes = document.getElementById('textoJsonQuestoes');

if (btnAbrirImportar && modalImportar) {
    btnAbrirImportar.addEventListener('click', () => { modalImportar.style.display = 'flex'; });
}
if (btnFecharImportar && modalImportar) {
    btnFecharImportar.addEventListener('click', () => { modalImportar.style.display = 'none'; });
}

if (btnProcessarImportacao && textoJsonQuestoes && modalImportar) {
    btnProcessarImportacao.addEventListener('click', async () => {
        try {
            const jsonBruto = textoJsonQuestoes.value.trim();
            if (!jsonBruto) {
                showToast('Cole o conteúdo JSON antes de prosseguir.', 'alerta');
                return;
            }

            const novasQuestoesBrutas = JSON.parse(jsonBruto);
            if (!Array.isArray(novasQuestoesBrutas)) {
                showToast('O formato deve ser uma lista (array) de questões válida.', 'erro');
                return;
            }

            const novasNormalizadas = novasQuestoesBrutas.map((q, idx) => normalizarQuestao(q, questoes.length + idx));

            // Salva no cache local imediatamente e mescla com as questões em tela
            salvarQuestoesLocais(novasNormalizadas);
            questoes = mesclarQuestoes(questoes, novasNormalizadas);
            porId = new Map(questoes.map(q => [String(q.id), q]));

            // Tenta sincronizar com o Supabase
            const ehAdmin = usuarioAtual && usuarioAtual.id === ADMIN_UID;
            try {
                await salvarQuestoesEmMassa(novasNormalizadas);
                showToast(`Sucesso! ${novasNormalizadas.length} questões adicionadas e sincronizadas na nuvem.`, 'sucesso');
            } catch (erroNuvem) {
                if (ehAdmin) {
                    showToast(`Falha ao sincronizar com a nuvem: ${erroNuvem.message || 'erro desconhecido'}.`, 'erro');
                } else {
                    showToast(`${novasNormalizadas.length} questões salvas apenas neste navegador. Só o administrador pode publicar questões novas para todos os usuários.`, 'alerta', 6000);
                }
            }

            modalImportar.style.display = 'none';
            textoJsonQuestoes.value = '';

            preencherSelect(selectBanca, "🏛️ Todas as Bancas", "banca", questoes);
            preencherSelect(selectMateria, "📖 Todas as Matérias", "materia", questoes);
            aplicarFiltros();

        } catch (erro) {
            showToast('Erro ao processar o JSON. Verifique o formato.', 'erro');
            console.error('[FocoPro] Erro ao importar questões:', erro);
        }
    });
}



// ============================================================
// 14. CARGA INICIAL DA APLICAÇÃO
// ============================================================
async function iniciarApp() {
    // 1. Verifica sessão ativa antes de puxar histórico
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        usuarioAtual = session?.user || null;
    } catch (e) {
        usuarioAtual = null;
    }

    // 2. Carrega histórico (LocalStorage + Supabase historico_respostas)
    try {
        historico = await carregarHistorico();
    } catch (e) {
        console.warn("[FocoPro] Erro ao carregar histórico:", e);
        historico = {};
    }

    // 3. Carrega e mescla questões de todas as fontes (JSON Local + Cache Importadas + Supabase)
    const [daApiLocal, daNuvem] = await Promise.all([
        carregarQuestoes(),
        carregarTodasQuestoes()
    ]);
    const doCacheImportadas = carregarQuestoesLocais();

    const mescladas = mesclarQuestoes(daApiLocal, doCacheImportadas, daNuvem);
    questoes = mescladas.length > 0 ? mescladas : mesclarQuestoes(questoesPadrao);

    // 4. Índice por ID
    porId = new Map(questoes.map(q => [String(q.id), q]));

    // 5. Prepara a Interface
    preencherSelect(selectBanca, "🏛️ Todas as Bancas", "banca", questoes);
    preencherSelect(selectMateria, "📖 Todas as Matérias", "materia", questoes);
    atualizarPlacar(historico, questoes);
    aplicarFiltros();
}

iniciarApp();