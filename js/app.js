// ============================================================
// js/app.js - Orquestrador Principal do FocoPro
// ============================================================

// ==================== INÍCIO: 1. IMPORTAÇÕES DE MÓDULOS ====================

// ==================== INÍCIO: SUBSTITUIR O IMPORT DE './ui.js' ====================
import {
    esc,                    // escapa HTML (usado em formatarExplicacaoIA)
    obterOpcoes,
    preencherSelect,
    atualizarChipTag,
    atualizarPlacar,
    renderizarQuestoes,
    revelar,
    classificarStatus,
    obterCategoriaStatus,
    renderizarCoberturaEdital,
    temGabarito,
    preencherSelectAssunto
} from './ui.js';
// ==================== FIM ====================

// ---------- 1.2 Supabase (banco e cliente) ----------
import {
    supabaseClient,
    salvarRespostaNoHistorico,
    enviarFilaPendente,
    limparFilaPendente,
    salvarQuestoesEmMassa,
    carregarTodasQuestoes,
    apagarHistoricoDoUsuario,
    salvarFavoritoNaNuvem,
    salvarAnotacaoNaNuvem,
    apagarFavoritosDoUsuario,
    limparFilaFavoritosPendente,
    corrigirResposta
} from './supabase.js';

// ---------- 1.3 Autenticação ----------
import { criarConta, entrar, sair, enviarLinkRedefinicao, redefinirSenha } from './auth.js';

// ---------- 1.4 Armazenamento local (localStorage) ----------
import {
    carregarHistorico,
    salvarHistorico,
    limparCacheAntigoDeQuestoes,
    registrarDiaDeEstudo,
    apagarDiasDeEstudo,
    apagarCacheNuvem,
    diaLocal
} from './storage.js';

// ---------- 1.45 Revisão espaçada ----------
import { aplicarResposta, novoRegistro, venceHoje, formatarDiaCurto } from './revisao.js';

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
import { normalizarQuestao, ORDEM_MACROS, NIVEIS, nivelInformadoEhInvalido } from './api.js';

// Filtro de nível: mostra o nome ("Iniciante") e ordena 1→4
const OPCOES_SELECT_NIVEL = { rotulo: (v) => NIVEIS[v] || v, numerico: true, mostrarTotal: true };

// ==================== FIM: 1. IMPORTAÇÕES DE MÓDULOS ====================
// ---------- 2. ESTADO GLOBAL ----------
let historico = {};
let questoes = [];
let porId = new Map();
let tagSelecionada = "";
let simulado = null;
const ADMIN_UID = '82cc7c31-2be4-4aba-8eb9-80067f545f3e'; // mesmo UUID usado nas políticas de RLS da tabela questoes

export let usuarioAtual = null;

// Só serve para mostrar/esconder botões. Quem bloqueia de verdade é a RLS no Supabase.
function ehAdministrador() {
    return Boolean(usuarioAtual && usuarioAtual.id === ADMIN_UID);
}

// ---------- 3. ELEMENTOS DO DOM ----------

const container = document.getElementById("container-questoes");
const selectBanca = document.getElementById("filtro-banca");
const selectMateria = document.getElementById("filtro-materia");
const selectTag = document.getElementById("filtro-tag");
const selectAno = document.getElementById("filtro-ano");
const selectNivel = document.getElementById("filtro-nivel");
const selectStatus = document.getElementById("filtro-status");
const checkFavoritas = document.getElementById("filtro-favoritas");
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

// Botão "de verdade": apaga a nuvem inteira, não só o cache deste navegador
const btnApagarTudo = criarBotaoSidebar("🔥 Apagar TUDO (nuvem + local)");
btnApagarTudo.classList.add("danger");
if (btnLimpar) btnLimpar.after(btnApagarTudo);
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
            // Erros e tudo que vence hoje na revisão (inclui acertos na dúvida)
            if (h && (h.status === "erro" || venceHoje(h))) comErro.push(q);
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

// ==================== INÍCIO: SUBSTITUIR filtrarQuestoes E definirTag ====================
// ---------- 6. GERENCIAMENTO DE FILTROS ----------
function filtrarQuestoes() {
    const banca = selectBanca ? selectBanca.value : "";
    const materia = selectMateria ? selectMateria.value : "";
    const termo = inputBusca ? inputBusca.value.trim().toLowerCase() : "";
    const tag = tagSelecionada.toLowerCase();
    const ano = selectAno ? selectAno.value : "";
    const nivel = selectNivel ? selectNivel.value : "";
    const statusFiltro = selectStatus ? selectStatus.value : "";
    const soFavoritas = checkFavoritas ? checkFavoritas.checked : false;

    return questoes.filter(q => {
        if (banca && (q.bancaExibida || q.banca) !== banca) return false;
        if (materia && q.materia !== materia) return false;
        // "tag" aqui é o assunto padronizado (U11), não mais a tag livre — ver js/api.js
        // (clicar numa #tag do card também cai aqui: vale a tag livre da questão)
        if (tag && String(q.assunto || "").toLowerCase() !== tag
            && !(q.tags || []).some(t => String(t).toLowerCase() === tag)) return false;
        if (ano && String(q.ano || "") !== ano) return false;
        if (nivel && String(q.nivel || "") !== nivel) return false;

        if (statusFiltro) {
            const categoria = obterCategoriaStatus(q.id, historico);
            if (categoria !== statusFiltro) return false;
        }

        if (soFavoritas) {
            const h = historico[String(q.id)];
            if (!h || !h.favorito) return false;
        }

        if (termo) {
            const textoOpcoes = obterOpcoes(q).map(op => op.texto).join(" ");
            const textoTags = (q.tags || []).join(" ");
            const alvoBusca = `${q.enunciado || q.pergunta || ""} ${textoOpcoes} ${textoTags} ${q.bancaExibida || q.banca || ""} ${q.orgao || ""}`.toLowerCase();
            if (!alvoBusca.includes(termo)) return false;
        }
        return true;
    });
}

// Reconstrói o filtro de assunto para a matéria escolhida. Se o assunto marcado não
// pertence à matéria nova, ele é desmarcado (senão a lista ficaria vazia sem explicação).
function atualizarSelectAssunto() {
    const materia = selectMateria ? selectMateria.value : "";
    const aindaExiste = preencherSelectAssunto(selectTag, questoes, materia, ORDEM_MACROS, tagSelecionada);
    const ehTagLivre = tagSelecionada && questoes.some(q =>
        (!materia || q.materia === materia) &&
        (q.tags || []).some(t => String(t).toLowerCase() === tagSelecionada.toLowerCase()));
    if (tagSelecionada && !aindaExiste && !ehTagLivre) {
        tagSelecionada = "";
        atualizarChipTag(chipTag, tagSelecionada);
    }
}

function definirTag(tag) {
    tagSelecionada = tag;
    atualizarChipTag(chipTag, tagSelecionada);
    if (selectTag && selectTag.value !== tag) selectTag.value = tag;
    aplicarFiltros();
}


// ==================== FIM ====================

// ---------- 6c. ORDEM DA LISTA ----------
// Primeiro o que vence hoje na revisão, depois as inéditas, por último as já feitas.
// Sem matéria (ou assunto) escolhido, as matérias vêm MISTURADAS: alternar temas treina
// a reconhecer o tipo de questão, como na prova (interleaving). A mistura muda uma vez
// por dia, para a lista não pular de lugar a cada filtro ou busca.
function posicaoDoDia(id) {
    let hash = 2166136261; // FNV-1a
    const texto = `${diaLocal()}|${id}`;
    for (let i = 0; i < texto.length; i++) {
        hash ^= texto.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
}

function ordenarParaEstudo(lista) {
    const hoje = diaLocal();
    const misturar = !(selectMateria && selectMateria.value) && !tagSelecionada;
    const grupo = (q) => {
        const h = historico[String(q.id)];
        if (venceHoje(h, hoje)) return 0;
        if (!h || !h.tentativas) return 1;
        return 2;
    };
    const chaves = new Map(lista.map(q => [q, [grupo(q), misturar ? posicaoDoDia(String(q.id)) : 0]]));
    // sort estável: com uma matéria escolhida, cada grupo mantém a ordem do banco (em bloco)
    return [...lista].sort((a, b) => {
        const ka = chaves.get(a), kb = chaves.get(b);
        return (ka[0] - kb[0]) || (ka[1] - kb[1]);
    });
}

function aplicarFiltros() {
    // Trocar filtro, limpar filtros etc. redesenha a lista: o simulado em curso não sobrevive a isso.
    // Antes ele continuava "ativo" por trás (cronômetro correndo, respostas sumindo).
    if (simulado) {
        if (!simulado.finalizado) showToast("Simulado encerrado sem correção.", "alerta");
        simulado = null;
        pararCronometro(displayCronometro);
    }
    const filtradas = ordenarParaEstudo(filtrarQuestoes());
    renderizarQuestoes(container, filtradas, historico, undefined, { paginar: true });
    atualizarPlacar(historico, questoes);
    atualizarBadgeFiltros();
}

// ---------- 6a. TOCAR NUMA MATÉRIA DO PAINEL DE DESEMPENHO = TREINAR ELA ----------
const dashboardMaterias = document.getElementById("dashboard-materias");
if (dashboardMaterias) {
    dashboardMaterias.addEventListener("click", (e) => {
        const item = e.target.closest(".materia-stat-item[data-materia]");
        if (!item || !selectMateria) return;
        const materia = item.dataset.materia;
        // Só filtra se a matéria existir no filtro (questões de outra lista não têm opção)
        if (![...selectMateria.options].some(opt => opt.value === materia)) return;
        simulado = null;
        pararCronometro(displayCronometro);
        selectMateria.value = materia;
        atualizarSelectAssunto();
        aplicarFiltros();
        const mainContent = document.querySelector(".main-content");
        if (mainContent) mainContent.scrollTo({ top: 0, behavior: "smooth" });
        showToast(`Treinando: ${materia}`, "info", 1800);
    });
}

// ---------- 6b. PAINÉIS DO TOPO (Filtros / Simulado) ----------
// Só um painel aberto por vez; tocar no mesmo botão fecha.
const paineisTopo = [
    { botao: document.getElementById("btn-painel-filtros"), painel: document.getElementById("painel-filtros") },
    { botao: document.getElementById("btn-painel-simulado"), painel: document.getElementById("painel-simulado") }
].filter(p => p.botao && p.painel);

function alternarPainel(alvo, abrir) {
    paineisTopo.forEach(p => {
        const deveAbrir = p === alvo && (abrir ?? p.painel.hidden);
        p.painel.hidden = !deveAbrir;
        p.botao.setAttribute("aria-expanded", String(deveAbrir));
    });
}

function fecharPaineis() {
    alternarPainel(null, false);
}

paineisTopo.forEach(p => p.botao.addEventListener("click", () => alternarPainel(p)));

// Número no botão "Filtros" = quantos filtros escondidos no painel estão ativos
function atualizarBadgeFiltros() {
    const badge = document.getElementById("badge-filtros");
    if (!badge) return;
    const ativos = [
        selectBanca && selectBanca.value,
        tagSelecionada,
        selectAno && selectAno.value,
        selectNivel && selectNivel.value,
        selectStatus && selectStatus.value,
        checkFavoritas && checkFavoritas.checked
    ].filter(Boolean).length;
    badge.textContent = ativos;
    badge.hidden = ativos === 0;
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
    // Qual botão foi tocado: "Tenho certeza" ou "Na dúvida"
    const confianca = (botao && botao.dataset.confianca === 'duvida') ? 'duvida' : 'certeza';

    // 1. MODO SIMULADO: registra sem revelar o gabarito (a correção roda ao finalizar — simulado.js)
    if (simulado) {
        simulado.respostas[idChave] = letraEscolhida;
        if (q.id) simulado.respostas[q.id] = letraEscolhida;
        if (!simulado.confiancas) simulado.confiancas = {};
        // Trocar só a alternativa mantém a confiança já escolhida
        if (botao) simulado.confiancas[idChave] = confianca;
        const confiancaAtual = simulado.confiancas[idChave] || 'certeza';

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
                gabaritoDiv.innerHTML = `📌 Alternativa <strong>(${esc(letraEscolhida)})</strong> registrada${confiancaAtual === 'duvida' ? ' <strong>na dúvida</strong>' : ''}. Você pode alterar antes de finalizar.`;
            }
        }
        showToast(`Questão registrada: alternativa ${letraEscolhida}`, "info", 1800);
        return;
    }

    // 2. MODO ESTUDO / REVISÃO: corrige no servidor antes de revelar qualquer coisa (U9) —
    // o front não guarda mais o gabarito de uma questão que ainda não foi respondida.
    // Trava já (antes do await) pra um segundo clique ("Tenho certeza"/"Na dúvida") não
    // disparar duas correções em paralelo pro mesmo card.
    card.dataset.respondida = "1";
    if (botao) botao.disabled = true;

    let resultado;
    try {
        resultado = await corrigirResposta(q, letraEscolhida);
    } catch (erro) {
        console.warn("[FocoPro] Não foi possível corrigir a resposta agora:", erro.message);
        showToast(erro.semGabarito
            ? "Esta questão está sem gabarito cadastrado. Avise o administrador."
            : "Não foi possível corrigir agora. Confira a internet e tente de novo.", "erro");
        card.dataset.respondida = ""; // libera pra tentar de novo
        if (botao) botao.disabled = false;
        return;
    }
    const { acertou, gabarito: gabaritoOficial } = resultado;
    q.gabarito = gabaritoOficial; // fica em memória: revelar() e qualquer novo render usam isto

    // 3. ATUALIZAÇÃO DO HISTÓRICO LOCAL IMEDIATA (Garante persistência no F5)
    // A regra de revisão espaçada (agenda, status) fica toda em js/revisao.js
    if (!historico[idChave]) historico[idChave] = novoRegistro();
    const h = historico[idChave];
    aplicarResposta(h, { acertou, confianca, momento: Date.now(), letra: letraEscolhida });
    h.materia = q.materia || 'Geral';
    h.gabaritoRevelado = gabaritoOficial; // sobrevive ao F5 e viaja pra nuvem (U9)

    salvarHistorico(historico);
    registrarDiaDeEstudo();

    // 4. REVELAR O GABARITO NA TELA E ATUALIZAR PLACAR
    revelar(card, q, letraEscolhida, { confianca });
    if (!acertou) oferecerQuestaoIrma(card, q);

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
        respostaEscolhida: letraEscolhida,
        momento: h.ultimaData,
        confianca,
        gabarito: gabaritoOficial
    });
}

// ---------- 7b. QUESTÃO-IRMÃ: depois de um erro, outra do mesmo assunto ----------
// Corrigir o conceito logo após o erro, numa questão diferente (transferência), antes que a
// ideia errada se fixe. Critério principal (U11): o assunto padronizado bater; as tags livres
// continuam como reforço, pra distinguir dentro do mesmo assunto (ex.: "pegadinha").
const irmasJaMostradas = new Set();

function escolherQuestaoIrma(q) {
    const assuntoQ = String(q.assunto || "").trim().toLowerCase();
    const tagsQ = (q.tags || []).map(t => String(t).trim().toLowerCase()).filter(Boolean);
    let melhor = null;
    let melhorPontos = 3; // precisa de mais que 1 tag solta em comum (ex.: "pegadinha")

    questoes.forEach(o => {
        const idO = String(o.id);
        if (idO === String(q.id) || irmasJaMostradas.has(idO)) return;
        const tagsO = (o.tags || []).map(t => String(t).trim().toLowerCase());
        let pontos = 0;
        if (assuntoQ && String(o.assunto || "").trim().toLowerCase() === assuntoQ) pontos += 10;
        if (tagsQ[0] && tagsO.includes(tagsQ[0])) pontos += 5;
        pontos += tagsO.filter(t => tagsQ.includes(t)).length * 2;
        if (o.materia === q.materia) pontos += 1;
        const h = historico[idO];
        if (!h || !h.tentativas) pontos += 2;          // prefere inédita
        else if (h.status === 'dominada') pontos -= 2; // e evita a que você já domina
        if (pontos > melhorPontos) {
            melhor = o;
            melhorPontos = pontos;
        }
    });
    return melhor;
}

function oferecerQuestaoIrma(card, q) {
    if (simulado || !escolherQuestaoIrma(q)) return;
    const fb = card.querySelector(".feedback-container");
    if (!fb || fb.querySelector(".acoes-irma")) return;
    fb.insertAdjacentHTML("beforeend",
        `<div class="acoes-irma"><button type="button" class="btn-irma">↻ Outra do mesmo assunto</button></div>`);
}

function mostrarQuestaoIrma(card) {
    const q = porId.get(String(card.dataset.id));
    const irma = q ? escolherQuestaoIrma(q) : null;
    const botao = card.querySelector(".btn-irma");
    if (!irma) {
        if (botao) botao.closest(".acoes-irma").remove();
        showToast("Não há outra questão desse assunto no banco.", "info");
        return;
    }
    irmasJaMostradas.add(String(irma.id));

    // Desenha a irmã em branco e coloca logo abaixo (se ela já estava na lista, sai de lá)
    const temp = document.createElement("div");
    renderizarQuestoes(temp, [irma], historico, "", { restaurarRespostas: false });
    const novoCard = temp.firstElementChild;
    if (!novoCard) return;
    novoCard.classList.add("card-irma");
    container.querySelectorAll(`.card-questao[data-id="${CSS.escape(String(irma.id))}"]`).forEach(c => c.remove());
    card.after(novoCard);

    if (botao) {
        botao.disabled = true;
        botao.textContent = "↓ Logo abaixo";
    }
    novoCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

if (container) {
    container.addEventListener("click", (e) => {
        const botao = e.target.closest(".btn-irma");
        if (!botao || botao.disabled) return;
        const card = botao.closest(".card-questao");
        if (card) mostrarQuestaoIrma(card);
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

    card.querySelectorAll(".btn-responder").forEach(btn => {
        btn.disabled = false;
        btn.hidden = false;
        btn.innerText = btn.dataset.confianca === 'duvida' ? "🤔 Na dúvida" : "✔ Tenho certeza";
    });
    const irma = card.querySelector(".acoes-irma");
    if (irma) irma.remove();

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
            if (card) responder(card, null); // só a alternativa mudou; a confiança fica a que já era
        }
    });

    container.addEventListener("click", (e) => {
        const btnFavoritar = e.target.closest(".btn-favoritar");
        if (btnFavoritar) {
            const card = btnFavoritar.closest(".card-questao");
            if (!card) return;
            const qId = String(card.dataset.id);

            if (!historico[qId]) {
                historico[qId] = { acertos: 0, erros: 0, tentativas: 0, ultimaResposta: null, recentes: [], status: 'novo', anotacao: "" };
            }
            const novoFavorito = !historico[qId].favorito;
            const agoraFavorito = Date.now();
            historico[qId].favorito = novoFavorito;
            historico[qId].favoritoEm = agoraFavorito;
            salvarHistorico(historico);
            salvarFavoritoNaNuvem(qId, novoFavorito, agoraFavorito); // em segundo plano (U3)

            btnFavoritar.classList.toggle("ativo", historico[qId].favorito);
            btnFavoritar.textContent = historico[qId].favorito ? "★" : "☆";
            showToast(historico[qId].favorito ? "Questão adicionada aos favoritos." : "Questão removida dos favoritos.", "info", 1500);
                       return;
        }

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
    // A chamada nem chegou à função: rede caiu, ou o servidor recusou este endereço do site (CORS)
    if (error && error.name === "FunctionsFetchError") {
        return "Não foi possível falar com o servidor da IA. Se você está numa versão de teste, ela pode não estar autorizada; no app oficial deve funcionar.";
    }
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
        // Só o id e a letra marcada: a função busca enunciado, alternativas e gabarito no banco
        // (não confia no que o navegador manda — isso impede envenenar o cache da IA)
        const { data, error } = await supabaseClient.functions.invoke("super-function", {
            body: {
                questaoId: qId,
                respostaUsuario: h.ultimaEscolha
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
        // Laboratório SQL: o motor (~650 KB) só é baixado quando alguém abre
        const btnLab = e.target.closest(".btn-lab-sql");
        if (btnLab) {
            const card = btnLab.closest(".card-questao");
            const q = card ? porId.get(String(card.dataset.id)) : null;
            if (card && q) {
                import("./laboratorio-sql.js")
                    .then(m => m.alternarLaboratorio(card, q))
                    .catch(err => {
                        console.error("[FocoPro] Laboratório SQL não carregou:", err);
                        showToast("Não foi possível abrir o laboratório SQL. Confira a internet.", "erro");
                    });
            }
            return;
        }

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

            const agoraAnotacao = Date.now();
            historico[qId].anotacao = texto;
            historico[qId].anotacaoEm = agoraAnotacao;
            salvarHistorico(historico);
            salvarAnotacaoNaNuvem(qId, texto, agoraAnotacao); // em segundo plano (U3)
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

// ==================== INÍCIO: SUBSTITUIR OS 3 LISTENERS DE FILTRO ====================
// Busca espera a pausa na digitação (antes redesenhava a lista inteira a cada tecla)
let esperaBusca = null;
if (inputBusca) {
    inputBusca.addEventListener("input", () => {
        clearTimeout(esperaBusca);
        esperaBusca = setTimeout(aplicarFiltros, 250);
    });
}
if (selectBanca) selectBanca.addEventListener("change", aplicarFiltros);
if (selectMateria) selectMateria.addEventListener("change", () => { atualizarSelectAssunto(); aplicarFiltros(); });
if (selectAno) selectAno.addEventListener("change", aplicarFiltros);
if (selectNivel) selectNivel.addEventListener("change", aplicarFiltros);
if (selectStatus) selectStatus.addEventListener("change", aplicarFiltros);
if (checkFavoritas) checkFavoritas.addEventListener("change", aplicarFiltros);
if (selectTag) selectTag.addEventListener("change", () => definirTag(selectTag.value));


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
        renderizarQuestoes(container, sorteadas, historico, undefined, { restaurarRespostas: false });
        adicionarBotaoFinalizar(container);

        fecharPaineis();
        const mainContent = document.querySelector(".main-content");
        if (mainContent) mainContent.scrollTo({ top: 0, behavior: "smooth" });
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
        if (selectAno) selectAno.value = "";
        if (selectNivel) selectNivel.value = "";
        if (selectStatus) selectStatus.value = "";
        if (checkFavoritas) checkFavoritas.checked = false;
        if (inputBusca) inputBusca.value = "";

        const inputQtd = document.getElementById("qtd-simulado");
        const inputTempo = document.getElementById("tempo-simulado");
        if (inputQtd) inputQtd.value = "";
        if (inputTempo) inputTempo.value = "";

        tagSelecionada = "";
        atualizarChipTag(chipTag, tagSelecionada);
        atualizarSelectAssunto();
        aplicarFiltros();
        showToast("Filtros limpos: exibindo todas as questões.", "info");
    });
}
// ==================== FIM ====================

// ---------- 11. MODO REVISÃO / CADERNO DE ERROS ----------
const btnModoRevisao = document.getElementById("btn-modo-revisao");
if (btnModoRevisao) {
    btnModoRevisao.addEventListener("click", () => {
        simulado = null;
        pararCronometro(displayCronometro);

        // Só o que vence hoje (ou já venceu), dos mais atrasados para os mais recentes
        const hoje = diaLocal();
        const paraHoje = questoes
            .filter(q => venceHoje(historico[String(q.id)], hoje))
            .sort((a, b) => historico[String(a.id)].revisaoEm.localeCompare(historico[String(b.id)].revisaoEm));

        if (paraHoje.length === 0) {
            // Mostra quando é a próxima, para não parecer que a revisão sumiu
            const futuras = Object.values(historico).map(h => h && h.revisaoEm).filter(Boolean).sort();
            const msg = futuras.length
                ? `Nada para revisar hoje. Próxima revisão em ${formatarDiaCurto(futuras[0])} (${futuras.filter(d => d === futuras[0]).length} questão(ões)).`
                : "Nada para revisar. Questões que você errar ou acertar na dúvida aparecem aqui no dia certo.";
            renderizarQuestoes(container, [], historico, msg);
            showToast(msg, "info", 4000);
            return;
        }

        renderizarQuestoes(container, paraHoje, historico, "", { restaurarRespostas: false });
        const atrasadas = paraHoje.filter(q => historico[String(q.id)].revisaoEm < hoje).length;
        showToast(`${paraHoje.length} para revisar hoje${atrasadas ? ` (${atrasadas} atrasada${atrasadas > 1 ? 's' : ''})` : ''}. Responda sem olhar o gabarito.`, "info");
    });
}

// Zerar Histórico Geral
if (btnLimpar) {
    btnLimpar.addEventListener("click", async () => {
        const confirmado = await showConfirmModal({
            titulo: "Zerar histórico deste aparelho",
            mensagem: "Limpa o histórico guardado neste aparelho, incluindo favoritos e anotações, que ainda não vão para a nuvem e serão perdidos. Suas respostas salvas na nuvem não são apagadas e voltam ao reabrir o app.",
            textoConfirmar: "Zerar este aparelho",
            textoCancelar: "Cancelar",
            corPerigo: true
        });

        if (confirmado) {
            localStorage.removeItem('appEstudos_Historico');
            apagarDiasDeEstudo();
            historico = {};
           atualizarPlacar(historico, questoes);
            aplicarFiltros();
            showToast("Cache local zerado. Se você estiver logado, seu progresso na nuvem continua intacto.", "alerta", 5000);
        }
    });
}

// Backup (Exportar / Importar)
// Apagar TUDO (nuvem + local) — irreversível, duas confirmações
btnApagarTudo.addEventListener("click", async () => {
    if (!usuarioAtual) {
        showToast("Faça login para apagar o histórico da nuvem.", "alerta");
        return;
    }

    const primeiraConfirmacao = await showConfirmModal({
        titulo: "Apagar TODO o histórico",
        mensagem: "Isso vai apagar seu progresso (acertos, erros, anotações) deste navegador E da nuvem, de forma definitiva — inclusive em outros dispositivos onde você estiver logado. Quer continuar?",
        textoConfirmar: "Continuar",
        textoCancelar: "Cancelar",
        corPerigo: true
    });
    if (!primeiraConfirmacao) return;

    const segundaConfirmacao = await showConfirmModal({
        titulo: "Tem certeza absoluta?",
        mensagem: "Essa ação é IRREVERSÍVEL. Todo o seu histórico de estudo será perdido para sempre, em todos os dispositivos. Confirma mesmo assim?",
        textoConfirmar: "Sim, apagar tudo",
        textoCancelar: "Cancelar",
        corPerigo: true
    });
    if (!segundaConfirmacao) return;

    try {
        await apagarHistoricoDoUsuario();
        await apagarFavoritosDoUsuario();
        limparFilaPendente();
        limparFilaFavoritosPendente();
        apagarCacheNuvem();
        localStorage.removeItem('appEstudos_Historico');
        apagarDiasDeEstudo();
        historico = {};
        atualizarPlacar(historico, questoes);
        aplicarFiltros();
        showToast("Histórico apagado da nuvem e deste navegador.", "alerta");
    } catch (erro) {
        console.error("Erro ao apagar histórico na nuvem:", erro);
        showToast("Não foi possível apagar o histórico na nuvem. Tente novamente.", "erro");
    }
});

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
const authAreaAlternar = document.getElementById('auth-area-alternar');
const campoAuthEmail = document.getElementById('campo-auth-email');
const campoAuthSenha = document.getElementById('campo-auth-senha');
const campoEsqueciLink = document.getElementById('campo-esqueci-link');
const btnEsqueciSenha = document.getElementById('btn-esqueci-senha');
const inputAuthEmail = document.getElementById('auth-email');
const inputAuthSenha = document.getElementById('auth-senha');
const userEmail = document.getElementById('user-email');
const userAvatar = document.getElementById('user-avatar');

// Modo atual do modal de autenticação: 'login' | 'cadastro' | 'esqueci' | 'nova-senha'
let modoAuth = 'login';

// De quem são os dados que estão na tela agora (null = visitante)
let idUsuarioCarregado = undefined;

// Ajusta título, textos e quais campos aparecem no modal de autenticação,
// de acordo com o modo. Centraliza aqui para não espalhar if/else pelos handlers.
function aplicarModoAuth(modo) {
    modoAuth = modo;

    switch (modo) {
        case 'cadastro':
            authTitulo.innerText = "Criar nova conta";
            authSubtitulo.innerText = "Comece a salvar seu progresso na nuvem.";
            btnSubmitAuth.innerText = "Cadastrar";
            authTextoAlternar.innerText = "Já tem uma conta?";
            btnAlternarAuth.innerText = "Fazer login";
            campoAuthEmail.style.display = '';
            campoAuthSenha.style.display = '';
            campoEsqueciLink.style.display = 'none';
            authAreaAlternar.style.display = '';
            inputAuthEmail.required = true;
            inputAuthSenha.required = true;
            break;
        case 'esqueci':
            authTitulo.innerText = "Recuperar senha";
            authSubtitulo.innerText = "Informe seu e-mail e enviaremos um link para redefinir a senha.";
            btnSubmitAuth.innerText = "Enviar link";
            authTextoAlternar.innerText = "Lembrou a senha?";
            btnAlternarAuth.innerText = "Fazer login";
            campoAuthEmail.style.display = '';
            campoAuthSenha.style.display = 'none';
            campoEsqueciLink.style.display = 'none';
            authAreaAlternar.style.display = '';
            inputAuthEmail.required = true;
            inputAuthSenha.required = false;
            break;
        case 'nova-senha':
            authTitulo.innerText = "Defina sua nova senha";
            authSubtitulo.innerText = "O link do e-mail confirmou quem você é. Escolha uma senha nova para continuar.";
            btnSubmitAuth.innerText = "Salvar nova senha";
            campoAuthEmail.style.display = 'none';
            campoAuthSenha.style.display = '';
            campoEsqueciLink.style.display = 'none';
            authAreaAlternar.style.display = 'none';
            inputAuthEmail.required = false;
            inputAuthSenha.required = true;
            break;
        default: // 'login'
            authTitulo.innerText = "Entrar no FocoPro";
            authSubtitulo.innerText = "Sincronize seu histórico e caderno de erros.";
            btnSubmitAuth.innerText = "Entrar";
            authTextoAlternar.innerText = "Não tem uma conta?";
            btnAlternarAuth.innerText = "Criar conta";
            campoAuthEmail.style.display = '';
            campoAuthSenha.style.display = '';
            campoEsqueciLink.style.display = '';
            authAreaAlternar.style.display = '';
            inputAuthEmail.required = true;
            inputAuthSenha.required = true;
    }
}

// O Supabase dispara SIGNED_IN também quando a aba volta a ficar visível e quando renova o token.
// Antes, isso recarregava tudo e apagava o simulado em andamento. Agora só recarrega
// quando a pessoa logada muda de fato (login, logout ou troca de conta).
supabaseClient.auth.onAuthStateChange((event, session) => {
    usuarioAtual = session?.user || null;

    if (usuarioAtual) {
        if (userEmail) userEmail.innerText = usuarioAtual.email;
        if (userAvatar) userAvatar.innerText = usuarioAtual.email.charAt(0).toUpperCase();
        if (btnAuthAcao) btnAuthAcao.innerText = "Sair";
        if (modalAuth) modalAuth.classList.remove('visible');
    } else {
        if (userEmail) userEmail.innerText = "Visitante";
        if (userAvatar) userAvatar.innerText = "?";
        if (btnAuthAcao) btnAuthAcao.innerText = "Fazer Login";
    }

    // O link de "esqueci minha senha" traz a pessoa de volta já autenticada, numa sessão
    // temporária só para isso. Força a troca de senha antes de liberar o resto do app.
    if (event === 'PASSWORD_RECOVERY') {
        aplicarModoAuth('nova-senha');
        if (modalAuth) modalAuth.classList.add('visible');
    }

    // Antes do iniciarApp terminar, quem carrega é ele
    if (idUsuarioCarregado === undefined) return;

    const idAgora = usuarioAtual ? usuarioAtual.id : null;
    if (idAgora === idUsuarioCarregado) return;
    idUsuarioCarregado = idAgora;

    // setTimeout: chamar o Supabase de dentro deste evento pode travar o cliente (aviso da documentação)
    setTimeout(async () => {
        simulado = null;
        pararCronometro(displayCronometro);
        if (idAgora) {
            const questoesChegando = buscarQuestoes();
            await enviarFilaPendente();
            historico = await carregarHistorico();
            await carregarBancoDeQuestoes(questoesChegando);
        } else {
            historico = {};
            await carregarBancoDeQuestoes();
        }
    }, 0);
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
        // De 'login' vai para 'cadastro'; de 'cadastro' ou 'esqueci' volta para 'login'.
        aplicarModoAuth(modoAuth === 'login' ? 'cadastro' : 'login');
    });
}

if (btnEsqueciSenha) {
    btnEsqueciSenha.addEventListener('click', () => aplicarModoAuth('esqueci'));
}

if (formAuth) {
    formAuth.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = inputAuthEmail.value.trim();
        const senha = inputAuthSenha.value;

        btnSubmitAuth.disabled = true;
        btnSubmitAuth.innerText = "Aguarde...";

        try {
            if (modoAuth === 'cadastro') {
                const resultado = await criarConta(email, senha);
                // Já deixa a tela pronta para o login, que é o próximo passo depois de confirmar o e-mail
                if (resultado === "confirmacao_pendente") aplicarModoAuth('login');
            } else if (modoAuth === 'esqueci') {
                const enviado = await enviarLinkRedefinicao(email);
                if (enviado) aplicarModoAuth('login');
            } else if (modoAuth === 'nova-senha') {
                const ok = await redefinirSenha(senha);
                if (ok) {
                    modalAuth.classList.remove('visible');
                    aplicarModoAuth('login');
                }
            } else {
                await entrar(email, senha);
            }
        } finally {
            btnSubmitAuth.disabled = false;
            // Recalcula o texto do botão a partir do modo atual (pode ter mudado acima)
            const textoPorModo = { login: "Entrar", cadastro: "Cadastrar", esqueci: "Enviar link", "nova-senha": "Salvar nova senha" };
            btnSubmitAuth.innerText = textoPorModo[modoAuth];
        }
    });
}

// ============================================================
// 12b. COBERTURA DO EDITAL (U11)
// ============================================================
const btnCoberturaEdital = document.getElementById('btn-cobertura-edital');
const modalCobertura = document.getElementById('modal-cobertura');
const listaCoberturaEdital = document.getElementById('lista-cobertura-edital');
const btnFecharCobertura = document.getElementById('btn-fechar-cobertura');

if (btnCoberturaEdital) {
    btnCoberturaEdital.addEventListener('click', () => {
        renderizarCoberturaEdital(listaCoberturaEdital, ORDEM_MACROS, questoes);
        if (modalCobertura) modalCobertura.classList.add('visible');
    });
}
if (btnFecharCobertura) {
    btnFecharCobertura.addEventListener('click', () => modalCobertura.classList.remove('visible'));
}
if (modalCobertura) {
    modalCobertura.addEventListener('click', (e) => {
        if (e.target === modalCobertura) modalCobertura.classList.remove('visible');
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

            // Nível inválido (ex.: 7) não vira "Avançado" calado: barra o lote inteiro e diz quais
            const nivelRuim = novasQuestoesBrutas.filter(q => q && nivelInformadoEhInvalido(q.nivel));
            if (nivelRuim.length > 0) {
                const ids = nivelRuim.slice(0, 5).map(q => `${q.id ?? '(sem id)'}: "${q.nivel}"`).join(', ');
                showToast(`${nivelRuim.length} questão(ões) com nível inválido (use 1 a 4 ou Iniciante/Intermediário/Avançado/Especialista): ${ids}. Nada foi salvo.`, 'erro', 9000);
                return;
            }

            // Só o admin publica questões (a RLS da tabela também garante isso no servidor)
            if (!ehAdministrador()) {
                showToast('Só o administrador pode importar questões.', 'erro');
                return;
            }

            const novasNormalizadas = novasQuestoesBrutas.map((q, idx) => normalizarQuestao(q, questoes.length + idx));

            // Sem gabarito não entra: antes virava "A" sem aviso e a questão nascia errada
            const semGabarito = novasNormalizadas.filter(q => !temGabarito(q));
            if (semGabarito.length > 0) {
                showToast(`${semGabarito.length} questão(ões) do JSON estão sem gabarito ("gabarito" ou "resposta_correta"). Corrija e importe de novo — nada foi salvo.`, 'erro', 8000);
                console.warn('[FocoPro] Questões sem gabarito no JSON:', semGabarito.map(q => q.id));
                return;
            }

            // Grava direto na nuvem e recarrega o banco de lá: a nuvem é a única fonte das questões
            try {
                await salvarQuestoesEmMassa(novasNormalizadas);
            } catch (erroNuvem) {
                showToast(`Falha ao salvar na nuvem: ${erroNuvem.message || 'erro desconhecido'}. Nada foi importado.`, 'erro', 6000);
                return;
            }

            modalImportar.style.display = 'none';
            textoJsonQuestoes.value = '';
            await carregarBancoDeQuestoes();
            showToast(`Sucesso! ${novasNormalizadas.length} questões salvas na nuvem.`, 'sucesso');
        } catch (erro) {
            showToast('Erro ao processar o JSON. Verifique o formato.', 'erro');
            console.error('[FocoPro] Erro ao importar questões:', erro);
        }
    });
}



// ============================================================
// 14. CARGA DO BANCO DE QUESTÕES (SÓ PARA USUÁRIO LOGADO) E CARGA INICIAL
// ============================================================

// Carrega (ou esconde) o banco de questões de acordo com o login.
// Chamada no início do app e sempre que o estado de login mudar (login/logout).
// Começa a baixar as questões já, sem esperar o histórico (as duas buscas correm juntas).
// Devolve { questoes } ou { erro }: nunca rejeita, para não virar erro solto no console.
function buscarQuestoes() {
    return carregarTodasQuestoes().then(
        (lista) => ({ questoes: lista }),
        (erro) => ({ erro })
    );
}

// questoesChegando: a busca já iniciada por buscarQuestoes() (opcional)
async function carregarBancoDeQuestoes(questoesChegando = null) {
    // O botão de importar questões só aparece para o admin
    const botaoImportarQuestoes = document.getElementById('btnAbrirImportar');
    if (botaoImportarQuestoes) botaoImportarQuestoes.hidden = !ehAdministrador();

    // Visitante sem login: nenhuma questão é buscada nem exibida.
    if (!usuarioAtual) {
        questoes = [];
        porId = new Map();

        preencherSelect(selectBanca, "🏛️ Todas as Bancas", "bancaExibida", questoes);
        preencherSelect(selectMateria, "📖 Todas as Matérias", "materia", questoes);
        preencherSelect(selectAno, "📅 Todos os Anos", "ano", questoes);
        preencherSelect(selectNivel, "📶 Todos os Níveis", "nivel", questoes, OPCOES_SELECT_NIVEL);
        atualizarSelectAssunto();

        atualizarPlacar(historico, questoes);
        renderizarQuestoes(
            container,
            [],
            historico,
            "🔒 Faça login para acessar o banco de questões do FocoPro."
        );
        return;
    }

    // Usuário logado: a nuvem (Supabase) é a única fonte das questões.
    // Se ela falhar, o app diz isso (antes mostrava 2 questões de exemplo como se fossem o banco).
    container.innerHTML = '<p class="aviso-vazio">Carregando questões...</p>';
    const resultado = await (questoesChegando || buscarQuestoes());
    if (resultado.erro) {
        console.warn("[FocoPro] Erro ao buscar questões da nuvem:", resultado.erro);
        mostrarErroDeCarga();
        return;
    }
    const daNuvem = resultado.questoes;

    questoes = mesclarQuestoes(daNuvem);

    porId = new Map(questoes.map(q => [String(q.id), q]));

    // U9: o front não traz mais o gabarito de quem ainda não respondeu. Pra quem já respondeu
    // antes (neste aparelho ou em outro, via histórico sincronizado), devolve o gabarito já
    // revelado pra memória — sem isso, reabrir o app faria a revisão/"ver gabarito" sumir.
    questoes.forEach(q => {
        const h = historico[String(q.id)];
        if (h && h.gabaritoRevelado) q.gabarito = h.gabaritoRevelado;
    });

    preencherSelect(selectBanca, "🏛️ Todas as Bancas", "bancaExibida", questoes);
    preencherSelect(selectMateria, "📖 Todas as Matérias", "materia", questoes);
    preencherSelect(selectAno, "📅 Todos os Anos", "ano", questoes);
    preencherSelect(selectNivel, "📶 Todos os Níveis", "nivel", questoes, OPCOES_SELECT_NIVEL);
    atualizarSelectAssunto();
    // Filtro de ano só aparece quando alguma questão tem ano cadastrado
    if (selectAno) selectAno.hidden = selectAno.options.length <= 1;
    // Nível: só aparece quando o banco tiver mais de um nível (antes disso, todo mundo é "Avançado")
    if (selectNivel) selectNivel.hidden = selectNivel.options.length <= 2;

    atualizarPlacar(historico, questoes);
    aplicarFiltros();
}

// Falha ao buscar o banco: aviso + botão para tentar de novo
function mostrarErroDeCarga() {
    questoes = [];
    porId = new Map();
    container.innerHTML = `
        <div class="aviso-erro-carga">
            <p><strong>Não foi possível carregar as questões.</strong></p>
            <p>Confira sua internet e tente de novo. Seu histórico continua salvo.</p>
            <button type="button" class="btn-primary" id="btn-tentar-carregar">Tentar de novo</button>
        </div>`;
    const botao = document.getElementById("btn-tentar-carregar");
    if (botao) {
        botao.addEventListener("click", async () => {
            botao.disabled = true;
            botao.textContent = "Carregando...";
            await carregarBancoDeQuestoes();
        });
    }
}

async function iniciarApp() {
    // 0. Remove do navegador o cache antigo de questões importadas (não é mais usado)
    limparCacheAntigoDeQuestoes();

    // 1. Verifica sessão ativa antes de puxar histórico/questões
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        usuarioAtual = session?.user || null;
    } catch (e) {
        usuarioAtual = null;
    }

    // 2. As questões começam a chegar já; enquanto isso, reenvia respostas pendentes
    //    (sem internet) e lê o histórico. Antes era tudo em fila, um depois do outro.
    const questoesChegando = usuarioAtual ? buscarQuestoes() : null;
    if (usuarioAtual) container.innerHTML = '<p class="aviso-vazio">Carregando questões...</p>';
    await enviarFilaPendente();

    // 3. Carrega histórico (LocalStorage + Supabase historico_respostas)
    try {
        historico = await carregarHistorico();
    } catch (e) {
        console.warn("[FocoPro] Erro ao carregar histórico:", e);
        historico = {};
    }

    // 4. Desenha o banco de questões (ou mostra o aviso de login)
    await carregarBancoDeQuestoes(questoesChegando);
    idUsuarioCarregado = usuarioAtual ? usuarioAtual.id : null;
}

iniciarApp();