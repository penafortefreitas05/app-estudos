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
    preencherSelectAssunto,
    textoGabaritoDe
} from './ui.js';
import { montarTrilha, proximoAssunto, resumoDasTrilhas, questaoPonte } from './aprender.js';
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
    corrigirResposta,
    enviarReporteDeQuestao,
    listarReportesAbertos,
    fecharReporte,
    exportarBackupDoBanco,
    carregarRespostasRecentes
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
    diaLocal,
    carregarDiasDeEstudo
} from './storage.js';

// ---------- 1.45 Revisão espaçada ----------
import { resumirPorDia, renderizarMeuDia } from './meu-dia.js';
import { renderizarDetalhesDaConta } from './conta.js';
import { aplicarResposta, novoRegistro, venceHoje, formatarDiaCurto, somarDias } from './revisao.js';

// ---------- 1.5 Simulado (cronômetro e finalização) ----------
import {
    iniciarCronometro,
    pararCronometro,
    adicionarBotaoFinalizar,
    finalizarSimulado
} from './simulado.js';

// ---------- 1.6 Notificações (toast e modal) ----------
import { showToast, showConfirmModal } from './notifications.js';
import {
    carregarPerfil,
    salvarPerfil,
    obterPerfilAtivo,
    abrirBoasVindas,
    mostrarDica,
    marcarTodasDicasComoVistas,
    dicasJaForamDecididas,
    atualizarMetaNaTela,
    metaBatidaAgora
} from './primeiros-passos.js';

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
let foco = null; // Modo Foco (U1): { lista, indice, cards } — ver seção 12
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

function criarBotaoSidebar(texto) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-sidebar";
    btn.innerHTML = `<span>${texto}</span>`;
    return btn;
}

// Gaveta "Ferramentas e Backup": só dois botões de histórico, os dois com nome claro.
// ("Importar Histórico" e "Zerar (local)" saíram: o primeiro sobrescrevia tudo sem aviso do
// que se perdia e o segundo parecia apagar tudo, mas só limpava o cache deste aparelho.)
const gavetaFerramentas = document.querySelector(".gaveta-ferramentas-conteudo");
const btnExportar = criarBotaoSidebar("💾 Exportar meus dados (LGPD)");
btnExportar.title = "Baixa um arquivo com todo o seu histórico de estudo";
// Ficam antes do "Sair", que é sempre o último item de "Minha conta"
const antesDoSair = document.getElementById("btn-auth-acao");
if (gavetaFerramentas) gavetaFerramentas.insertBefore(btnExportar, antesDoSair);

// Backup do banco de questões: só o admin vê (a RLS também barra os outros no servidor)
const btnBackupBanco = criarBotaoSidebar("🗄️ Backup do banco de questões");
btnBackupBanco.title = "Baixa todas as questões, gabaritos e reportes num arquivo .json";
btnBackupBanco.hidden = true;
if (gavetaFerramentas) gavetaFerramentas.insertBefore(btnBackupBanco, antesDoSair);

// Botão "de verdade": apaga a nuvem inteira, não só o cache deste navegador
const btnApagarTudo = criarBotaoSidebar("🔥 Apagar TUDO (nuvem + local)");
btnApagarTudo.classList.add("danger");
if (gavetaFerramentas) gavetaFerramentas.insertBefore(btnApagarTudo, antesDoSair);
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
// Primeiro o que vence hoje na revisão, depois as ainda não feitas (Iniciante primeiro),
// por último as já feitas.
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
    // Entre as ainda não feitas, o nível mais básico vem antes: Iniciante → Intermediário →
    // prova. Um iniciante não cai mais numa questão do BACEN na 1ª tela; quem quer prova
    // escolhe "Avançado" no filtro de nível. Dentro de cada nível, as matérias seguem misturadas.
    // Quem disse nas boas-vindas que já trabalha na área vê todos os níveis misturados.
    const porNivel = !(obterPerfilAtivo() && obterPerfilAtivo().experiencia === 'trabalho');
    const nivelDe = (q) => porNivel ? (Number(q.nivel) || 3) : 0;
    const chaves = new Map(lista.map(q => {
        const g = grupo(q);
        return [q, [g, g === 1 ? nivelDe(q) : 0, misturar ? posicaoDoDia(String(q.id)) : 0]];
    }));
    // sort estável: com uma matéria escolhida, cada grupo mantém a ordem do banco (em bloco)
    return [...lista].sort((a, b) => {
        const ka = chaves.get(a), kb = chaves.get(b);
        return (ka[0] - kb[0]) || (ka[1] - kb[1]) || (ka[2] - kb[2]);
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
    // Modo Foco (U1) ativo: a lista nova vira a fila do foco, sem sair dele
    if (foco) {
        atualizarListaFoco(filtradas);
    } else {
        const mensagem = algumFiltroAtivo()
            ? "Nenhuma questão com esses filtros."
            : "Nenhuma questão encontrada.";
        renderizarQuestoes(container, filtradas, historico, mensagem, { paginar: true });
        // Estado vazio que ensina: diz o próximo passo em vez de só "nada aqui"
        if (!filtradas.length && algumFiltroAtivo()) {
            const aviso = container.querySelector(".aviso-vazio");
            if (aviso) aviso.insertAdjacentHTML("beforeend",
                ` <button type="button" class="btn-link btn-limpar-vazio">Limpar filtros</button>`);
        }
    }
    atualizarPlacar(historico, questoes);
    atualizarBadgeFiltros();
    atualizarTituloDaBarra(filtradas);
    sincronizarFiltrosRapidos();
    if (!foco) colocarCartaoHoje();
}

// ==================== INÍCIO: 6c. BARRA DE CIMA (título, contagem e filtros rápidos) ====================
// Linha 1 diz onde você está ("Banco de Dados & Dados · 92 questões · 33 respondidas").
// Linha 2 tem nível e situação como botões. Eles não guardam estado: só mexem nos campos
// (selectNivel, selectStatus, checkFavoritas) e o resto do app continua lendo esses campos.
const LETRA_NIVEL_BARRA = { "1": "I", "2": "M", "3": "A", "4": "E" };
const STATUS_RAPIDOS = [
    { valor: "", texto: "Todas" },
    { valor: "nao-respondida", texto: "Não respondidas" },
    { valor: "acertei", texto: "Acertei" },
    { valor: "errei", texto: "Errei" }
];
const chipsNivel = document.getElementById("chips-nivel");
const chipsStatus = document.getElementById("chips-status");

function atualizarTituloDaBarra(filtradas) {
    const titulo = document.getElementById("barra-titulo");
    const contagem = document.getElementById("barra-contagem");
    if (!titulo || !contagem) return;
    titulo.textContent = (selectMateria && selectMateria.value) || "Todas as matérias";
    const respondidas = filtradas.filter(q => {
        const h = historico[String(q.id)];
        return h && Number(h.tentativas) > 0;
    }).length;
    const n = filtradas.length;
    contagem.textContent = `${n} ${n === 1 ? "questão" : "questões"} · ${respondidas} ${respondidas === 1 ? "respondida" : "respondidas"}`;
}

function criarChip(classe, html, ativo, dados) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = `chip-filtro ${classe}`;
    b.innerHTML = html;
    b.setAttribute("aria-pressed", String(ativo));
    if (dados.favoritas) { b.title = "Só favoritas"; b.setAttribute("aria-label", "Só favoritas"); }
    Object.entries(dados).forEach(([k, v]) => { b.dataset[k] = v; });
    return b;
}

function sincronizarFiltrosRapidos() {
    // Nível: um botão por nível que existe no banco (some se houver um só)
    if (chipsNivel && selectNivel) {
        const niveis = [...selectNivel.options].filter(o => o.value);
        chipsNivel.hidden = niveis.length < 2;
        const assinatura = niveis.map(o => o.value).join(",");
        if (chipsNivel.dataset.assinatura !== assinatura) {
            chipsNivel.dataset.assinatura = assinatura;
            chipsNivel.replaceChildren(...niveis.map(o => {
                const nome = o.textContent.replace(/^[^\p{L}]+/u, "").replace(/\s*\(\d+\)\s*$/, "").trim();
                return criarChip(`nv-chip-btn nv-${o.value}`,
                    `<b class="nv-letra nv-${o.value}">${LETRA_NIVEL_BARRA[o.value] || o.value}</b>${esc(nome)}`, false, { nivel: o.value });
            }));
        }
        chipsNivel.querySelectorAll(".chip-filtro").forEach(b =>
            b.setAttribute("aria-pressed", String(selectNivel.value === b.dataset.nivel)));
    }
    // Situação: Todas / Não respondidas / Acertei / Errei, e Favoritas à parte
    if (chipsStatus && selectStatus) {
        if (!chipsStatus.children.length) {
            chipsStatus.replaceChildren(
                ...STATUS_RAPIDOS.map(st => criarChip("chip-status", esc(st.texto), false, { status: st.valor })),
                criarChip("chip-status chip-favoritas", "⭐", false, { favoritas: "1" })
            );
        }
        chipsStatus.querySelectorAll(".chip-filtro").forEach(b => {
            const ativo = b.dataset.favoritas
                ? Boolean(checkFavoritas && checkFavoritas.checked)
                : selectStatus.value === b.dataset.status;
            b.setAttribute("aria-pressed", String(ativo));
        });
    }
}

if (chipsNivel && selectNivel) {
    chipsNivel.addEventListener("click", (e) => {
        const b = e.target.closest(".chip-filtro[data-nivel]");
        if (!b) return;
        // Tocar no nível ativo tira o filtro
        selectNivel.value = selectNivel.value === b.dataset.nivel ? "" : b.dataset.nivel;
        selectNivel.dispatchEvent(new Event("change"));
    });
}
if (chipsStatus && selectStatus) {
    chipsStatus.addEventListener("click", (e) => {
        const b = e.target.closest(".chip-filtro");
        if (!b) return;
        if (b.dataset.favoritas) {
            if (checkFavoritas) { checkFavoritas.checked = !checkFavoritas.checked; checkFavoritas.dispatchEvent(new Event("change")); }
            return;
        }
        selectStatus.value = b.dataset.status;
        selectStatus.dispatchEvent(new Event("change"));
    });
}

// Tecla / abre a busca (fora do Modo Foco e sem estar digitando em outro campo)
document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey || e.isComposing || foco) return;
    if (e.target.closest && e.target.closest("textarea, select, input, [contenteditable='true']")) return;
    if (document.querySelector(".modal-overlay.visible, .modal.visible")) return;
    if (!inputBusca) return;
    e.preventDefault();
    inputBusca.focus();
    inputBusca.select();
});

const btnAprenderBarra = document.getElementById("btn-aprender-barra");
if (btnAprenderBarra) btnAprenderBarra.addEventListener("click", () => {
    if (!usuarioAtual) { mostrarEntradaVisitante(); return; }
    abrirEscolhaAprender();
});
// ==================== FIM: 6c. BARRA DE CIMA ====================

function algumFiltroAtivo() {
    return Boolean((selectBanca && selectBanca.value) || (selectMateria && selectMateria.value) ||
        tagSelecionada || (selectAno && selectAno.value) || (selectNivel && selectNivel.value) ||
        (selectStatus && selectStatus.value) || (checkFavoritas && checkFavoritas.checked) ||
        (inputBusca && inputBusca.value.trim()));
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

// Número no botão "Mais filtros" = quantos filtros do painel (matéria, banca, assunto, ano) estão ativos
function atualizarBadgeFiltros() {
    const badge = document.getElementById("badge-filtros");
    if (!badge) return;
    const ativos = [
        selectMateria && selectMateria.value,
        selectBanca && selectBanca.value,
        tagSelecionada,
        selectAno && selectAno.value
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
        elemTentativas.hidden = false;
    }

    atualizarPlacar(historico, questoes);
    reagirAPrimeirosPassos({ acertou, confianca });

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

    // Modo Foco: a irmã vira a próxima da fila (não cabe "logo abaixo" com uma questão por vez)
    if (foco) {
        if (botao) {
            botao.disabled = true;
            botao.textContent = "→ É a próxima";
        }
        colocarIrmaNoFoco(irma);
        return;
    }

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

// ---------- 8. EXPORTAÇÃO DO HISTÓRICO (LGPD) ----------
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

async function baixarBackupDoBanco() {
    if (!ehAdministrador()) return;
    btnBackupBanco.disabled = true;
    showToast("Gerando o backup... pode levar alguns segundos.", "info");
    try {
        const backup = await exportarBackupDoBanco();
        const t = backup.tabelas;
        const blob = new Blob([JSON.stringify(backup)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `focopro-backup-banco-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        const resumo = `${t.questoes.length} questões, ${t.questoes_gabarito.length} gabaritos, ${t.reportes_questao.length} reportes`;
        showToast(backup.avisos.length ? `Backup baixado com avisos: ${backup.avisos.join("; ")}` : `Backup baixado: ${resumo}.`, backup.avisos.length ? "erro" : "sucesso");
    } catch (e) {
        showToast("Não foi possível gerar o backup agora.", "erro");
    } finally {
        btnBackupBanco.disabled = false;
    }
}
btnBackupBanco.addEventListener("click", baixarBackupDoBanco);

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
        if (foco) sairFoco({ silencioso: true }); // simulado é sempre em lista, com correção no fim

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
            if (foco) sairFoco({ silencioso: true });
            renderizarQuestoes(container, [], historico, msg);
            showToast(msg, "info", 4000);
            return;
        }

        // No Modo Foco, a revisão do dia vira a fila do foco (uma por vez)
        if (foco) entrarFoco(paraHoje, { silencioso: true });
        else renderizarQuestoes(container, paraHoje, historico, "", { restaurarRespostas: false });
        const atrasadas = paraHoje.filter(q => historico[String(q.id)].revisaoEm < hoje).length;
        showToast(`${paraHoje.length} para revisar hoje${atrasadas ? ` (${atrasadas} atrasada${atrasadas > 1 ? 's' : ''})` : ''}. Responda sem olhar o gabarito.`, "info");
    });
}

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

// Backup (Exportar)
btnExportar.addEventListener("click", exportarHistorico);

// ==================== INÍCIO: 12. MODO FOCO (U1) ====================
// Uma questão por vez, sem a barra de filtros. Usa a mesma lista que estaria na tela
// (filtros + ordem de estudo) ou a revisão do dia. Teclado:
//   A–E (ou 1–5) escolhe · Enter = "Tenho certeza" · Shift+Enter = "Na dúvida"
//   Enter de novo (depois de responder) ou → = próxima · ← = anterior · Esc = sair
// Cada card desenhado fica guardado (foco.cards): voltar para uma questão já respondida
// mostra ela como ficou, sem responder de novo.
const btnModoFoco = document.getElementById("btn-modo-foco");

function entrarFoco(lista, opcoes = {}) {
    if (!lista || lista.length === 0) {
        showToast("Nenhuma questão com esses filtros para o Modo Foco.", "alerta");
        return;
    }
    if (simulado) {
        if (!simulado.finalizado) showToast("Simulado encerrado sem correção.", "alerta");
        simulado = null;
        pararCronometro(displayCronometro);
    }
    foco = {
        lista: [...lista], indice: 0, cards: new Map(),
        titulo: opcoes.titulo || "", guiada: Boolean(opcoes.guiada),
        exemplos: opcoes.exemplos || new Set(), // ids mostrados como exemplo resolvido (Aprender)
        aprender: opcoes.aprender || null       // { materia, nome } do assunto em estudo
    };
    document.body.classList.add("modo-foco");
    if (btnModoFoco) btnModoFoco.setAttribute("aria-pressed", "true");
    fecharPaineis();
    desenharFoco();
    if (!opcoes.silencioso) showToast("Modo Foco: uma questão por vez. Esc para sair.", "info", 2200);
}

function sairFoco(opcoes = {}) {
    if (!foco) return;
    const idAtual = foco.lista[foco.indice] ? String(foco.lista[foco.indice].id) : "";
    foco = null;
    document.body.classList.remove("modo-foco");
    if (btnModoFoco) btnModoFoco.setAttribute("aria-pressed", "false");
    if (opcoes.silencioso) return; // quem chamou vai desenhar outra coisa no lugar
    aplicarFiltros();
    // Volta a lista no ponto onde o foco parou, se a questão estiver no primeiro lote
    const card = idAtual && container.querySelector(`.card-questao[data-id="${CSS.escape(idAtual)}"]`);
    if (card) card.scrollIntoView({ block: "start" });
}

// Filtro mudou com o foco aberto (ex.: tocar numa matéria do painel): troca a fila e
// continua na mesma questão se ela ainda estiver na lista nova.
function atualizarListaFoco(lista) {
    if (!lista.length) {
        sairFoco({ silencioso: true });
        renderizarQuestoes(container, [], historico, undefined, { paginar: true });
        showToast("Nenhuma questão com esses filtros.", "alerta");
        return;
    }
    const idAtual = foco.lista[foco.indice] ? String(foco.lista[foco.indice].id) : "";
    foco.lista = [...lista];
    const pos = foco.lista.findIndex(q => String(q.id) === idAtual);
    foco.indice = pos >= 0 ? pos : 0;
    desenharFoco();
}

function cardDoFoco(q) {
    const id = String(q.id);
    if (!foco.cards.has(id) && q.resumo) {
        foco.cards.set(id, cardResumo(q.resumo));
    }
    if (!foco.cards.has(id) && foco.exemplos.has(id)) {
        foco.cards.set(id, cardExemplo(q));
    }
    if (!foco.cards.has(id)) {
        const temp = document.createElement("div");
        // Em branco: no foco a questão é sempre para responder agora (como na revisão)
        renderizarQuestoes(temp, [q], historico, "", { restaurarRespostas: false });
        const card = temp.firstElementChild;
        if (card) card.classList.add("card-foco");
        foco.cards.set(id, card);
    }
    return foco.cards.get(id);
}

// "Questão 2 de 4": conta só as questões de verdade (o resumo e o exemplo resolvido não entram)
function rotuloPosicaoFoco() {
    const atual = foco.lista[foco.indice];
    if (atual && foco.exemplos.has(String(atual.id))) return atual.resumo ? "Entenda em 1 minuto" : "Exemplo resolvido";
    const reais = foco.lista.filter(q => !foco.exemplos.has(String(q.id)));
    const numero = reais.indexOf(atual) + 1;
    return `Questão ${numero} de ${reais.length}`;
}

function desenharFoco() {
    if (!foco) return;
    const total = foco.lista.length;
    const fim = foco.indice >= total;

    const barra = document.createElement("div");
    barra.className = "foco-barra";
    barra.innerHTML = `
        <button type="button" class="btn-painel foco-anterior" ${foco.indice === 0 ? "disabled" : ""} aria-label="Questão anterior">←</button>
        <span class="foco-posicao" aria-live="polite">${foco.titulo ? `<span class="foco-titulo">${esc(foco.titulo)}</span>` : ""}${fim ? "Fim da lista" : rotuloPosicaoFoco()}</span>
        <button type="button" class="btn-painel foco-proxima" ${fim ? "disabled" : ""} aria-label="Próxima questão">→</button>
        <button type="button" class="btn-painel foco-sair">✕ Sair do foco</button>`;

    // Barrinha de avanço da lista: enche a cada questão e dá a vontade de chegar ao fim
    const avanco = document.createElement("div");
    avanco.className = "foco-avanco";
    avanco.setAttribute("aria-hidden", "true");
    avanco.innerHTML = `<span style="width:${total ? Math.round((fim ? total : foco.indice) * 100 / total) : 0}%"></span>`;

    const partes = [barra, avanco];
    if (fim) {
        partes.push(resumoFoco());
    } else {
        partes.push(cardDoFoco(foco.lista[foco.indice]));
        const rodape = document.createElement("div");
        rodape.className = "foco-rodape";
        rodape.innerHTML = `
            <button type="button" class="btn-primary btn-largo foco-proxima">Próxima questão →</button>
            <p class="foco-atalhos">Teclado: <kbd>A</kbd>–<kbd>E</kbd> escolhe · <kbd>Enter</kbd> tenho certeza · <kbd>Shift</kbd>+<kbd>Enter</kbd> na dúvida · <kbd>→</kbd> próxima · <kbd>Esc</kbd> sai</p>`;
        partes.push(rodape);
    }
    container.replaceChildren(...partes);
    if (foco.aprender && !fim && !foco.exemplos.has(String(foco.lista[foco.indice].id))) mostrarDica("antes-de-responder");
    // Rola para o topo nos dois casos: no computador quem rola é a lista; no celular, a página
    container.scrollTop = 0;
    const mainContent = document.querySelector(".main-content");
    if (mainContent) mainContent.scrollTop = 0;
}

// Tela final: quantas desta sessão de foco foram respondidas e quantas certas
function resumoFoco() {
    let respondidas = 0, acertos = 0, voltamAmanha = 0;
    const amanha = somarDias(diaLocal(), 1);
    foco.cards.forEach((card, id) => {
        if (!card || card.dataset.respondida !== "1" || card.dataset.exemplo === "1") return;
        respondidas++;
        if (!card.querySelector(".opcao-item.incorreta")) acertos++;
        const h = historico[id];
        if (h && h.revisaoEm === amanha) voltamAmanha++;
    });
    // Diz o que acontece amanhã: era o elo que faltava entre a 1ª sessão e a revisão
    const textoAmanha = voltamAmanha
        ? `<p>${voltamAmanha === 1 ? "<strong>1 questão volta</strong>" : `<strong>${voltamAmanha} questões voltam</strong>`} amanhã em <strong>🔁 Revisar hoje</strong>: as que você errou ou acertou na dúvida.</p>`
        : (respondidas ? "<p>Nenhuma volta amanhã: você acertou todas com certeza.</p>" : "");
    const textoGuiada = foco.guiada && respondidas
        ? "<p>Amanhã é só abrir o app: primeiro a revisão, depois as questões novas, até bater a meta do dia.</p>"
        : "";
    if (foco.guiada && respondidas) setTimeout(() => mostrarDica("tres-numeros"), 400);
    const caixa = document.createElement("div");
    caixa.className = "foco-resumo";
    caixa.innerHTML = `
        <p class="foco-resumo-titulo">${foco.aprender ? "📖 Fim do assunto" : "🎯 Fim da lista"}</p>
        <p>${respondidas
            ? `Você respondeu <strong>${respondidas}</strong> nesta sessão e acertou <strong>${acertos}</strong> (${Math.round(acertos * 100 / respondidas)}%).`
            : "Nenhuma questão respondida nesta sessão."}</p>
        ${textoAmanha}${textoGuiada}${textoAprender()}
        <div class="foco-resumo-acoes">
            <button type="button" class="btn-painel foco-anterior">← Voltar para a última</button>
            <button type="button" class="btn-primary foco-sair">Sair do foco</button>
        </div>`;
    return caixa;
}

function irPara(indice) {
    if (!foco) return;
    foco.indice = Math.max(0, Math.min(indice, foco.lista.length)); // == length é a tela final
    desenharFoco();
}

// Questão-irmã no foco: entra logo depois da atual (sai de onde estava, se já estava na fila)
function colocarIrmaNoFoco(irma) {
    const id = String(irma.id);
    const atual = foco.lista[foco.indice];
    foco.lista = foco.lista.filter(q => String(q.id) !== id);
    const posAtual = foco.lista.indexOf(atual);
    foco.lista.splice(posAtual + 1, 0, irma);
    foco.indice = posAtual;
    foco.cards.delete(id); // sempre em branco, mesmo que já tenha aparecido antes
    showToast("A questão do mesmo assunto é a próxima (→).", "info", 1800);
    // Atualiza só a barra (contador), sem perder o feedback da questão atual
    const posicao = container.querySelector(".foco-posicao");
    if (posicao) posicao.textContent = rotuloPosicaoFoco();
}

if (btnModoFoco) {
    btnModoFoco.addEventListener("click", () => {
        if (foco) sairFoco();
        else entrarFoco(ordenarParaEstudo(filtrarQuestoes()));
    });
}

if (container) {
    container.addEventListener("click", (e) => {
        if (!foco) return;
        if (e.target.closest(".foco-proxima")) irPara(foco.indice + 1);
        else if (e.target.closest(".foco-anterior")) irPara(foco.indice - 1);
        else if (e.target.closest(".foco-sair")) sairFoco();
    });
}

function cardAtualDoFoco() {
    return foco ? container.querySelector(".card-questao.card-foco") : null;
}

// Marca a alternativa pela letra (A–E, ou C/E nas de Certo/Errado) ou pela posição (1–5)
function escolherAlternativa(card, tecla) {
    if (!card || card.dataset.respondida === "1") return false;
    const radios = [...card.querySelectorAll(".radio-opcao:not(:disabled)")];
    let alvo = radios.find(r => r.value === tecla.toUpperCase());
    if (!alvo && /^[1-9]$/.test(tecla)) alvo = radios[Number(tecla) - 1];
    if (!alvo) return false;
    alvo.checked = true;
    alvo.focus({ preventScroll: true });
    return true;
}

function responderPeloTeclado(card, naDuvida) {
    const botao = card.querySelector(`.btn-responder[data-confianca="${naDuvida ? "duvida" : "certeza"}"]`);
    if (botao && !botao.disabled) responder(card, botao);
}

document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || e.isComposing) return;
    const alvo = e.target;
    // Digitando (anotação, busca, login...) ou com um aviso aberto: o teclado é do campo
    if (alvo.closest && alvo.closest("textarea, select, [contenteditable='true'], input:not(.radio-opcao)")) return;
    if (document.querySelector(".modal-overlay.visible, .modal.visible, #modalImportar[style*='flex']")) return;

    // Item 23 (fora do foco): Enter numa alternativa focada responde aquela questão
    if (!foco) {
        if (e.key === "Enter" && alvo.classList && alvo.classList.contains("radio-opcao")) {
            const card = alvo.closest(".card-questao");
            if (card && !simulado) {
                e.preventDefault();
                responderPeloTeclado(card, e.shiftKey);
            }
        }
        return;
    }

    // Enter/Espaço num botão focado (ex.: "Entender meu erro com IA") fica com o botão.
    // Só se o botão estiver ativo: depois de um clique em "Tenho certeza" ou em "Outra do mesmo
    // assunto", o botão fica desativado e o navegador às vezes deixa o foco nele — antes, isso
    // engolia o Enter e o Foco não avançava.
    if (alvo.closest && alvo.closest("button:not(:disabled), a, summary") && (e.key === "Enter" || e.key === " ")) return;

    const card = cardAtualDoFoco();
    if (e.key === "Escape") {
        e.preventDefault();
        sairFoco();
    } else if (e.key === "ArrowRight") {
        e.preventDefault();
        irPara(foco.indice + 1);
    } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        irPara(foco.indice - 1);
    } else if (e.key === "Enter") {
        e.preventDefault();
        const corrigida = card && (card.dataset.exemplo === "1" || card.querySelector(".btn-refazer:not([hidden])"));
        if (card && card.dataset.respondida === "1" && !corrigida) return; // ainda corrigindo no servidor
        if (!card || corrigida) irPara(foco.indice + 1);
        else if (!card.querySelector(".radio-opcao:checked")) showToast("Escolha uma alternativa (A–E) antes de responder.", "alerta", 1800);
        else responderPeloTeclado(card, e.shiftKey);
    } else if (e.key.length === 1 && escolherAlternativa(card, e.key)) {
        e.preventDefault();
    }
});
// ==================== FIM: 12. MODO FOCO (U1) ====================

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
            authSubtitulo.innerText = "Você começa pelo nível Iniciante e o app guarda seu progresso.";
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
            authSubtitulo.innerText = "Entre para continuar de onde parou.";
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
        if (modalAuth) modalAuth.classList.remove('visible');
    } else {
        if (userEmail) userEmail.innerText = "Visitante";
        if (userAvatar) userAvatar.innerText = "?";
        const conta = document.getElementById("conta");
        if (conta) conta.open = false;
    }
    const contaDica = document.getElementById("conta-dica");
    if (contaDica) contaDica.textContent = usuarioAtual ? "Minha conta" : "Entrar ou criar conta";

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

// ============================================================
// 12c. MEU DIA: acertos de hoje (revisão x novas) e dos últimos 7 dias
// ============================================================
const btnMeuDia = document.getElementById('btn-meu-dia');
const modalMeuDia = document.getElementById('modal-meu-dia');
const conteudoMeuDia = document.getElementById('conteudo-meu-dia');
if (btnMeuDia && modalMeuDia) {
    btnMeuDia.addEventListener('click', async () => {
        conteudoMeuDia.innerHTML = '<p class="modal-mensagem">Carregando…</p>';
        modalMeuDia.classList.add('visible');
        const dados = await carregarRespostasRecentes(7);
        if (!dados) {
            conteudoMeuDia.innerHTML = '<p class="modal-mensagem">Entre na sua conta (e confira a internet) para ver o seu dia. Os números vêm do histórico guardado na nuvem.</p>';
            return;
        }
        renderizarMeuDia(conteudoMeuDia, resumirPorDia(dados.linhas, dados.jaVistas, 7));
    });
    document.getElementById('btn-fechar-meu-dia')?.addEventListener('click', () => modalMeuDia.classList.remove('visible'));
    modalMeuDia.addEventListener('click', (e) => { if (e.target === modalMeuDia) modalMeuDia.classList.remove('visible'); });
}

// 12d. NÍVEL DA CONTA: tela com a regra e a escada de níveis
const botoesNivelConta = document.querySelectorAll('.js-nivel-abrir');
const modalNivelConta = document.getElementById('modal-nivel-conta');
if (botoesNivelConta.length && modalNivelConta) {
    botoesNivelConta.forEach(b => b.addEventListener('click', () => {
        renderizarDetalhesDaConta(document.getElementById('conteudo-nivel-conta'));
        modalNivelConta.classList.add('visible');
    }));
    document.getElementById('btn-fechar-nivel-conta')?.addEventListener('click', () => modalNivelConta.classList.remove('visible'));
    modalNivelConta.addEventListener('click', (e) => { if (e.target === modalNivelConta) modalNivelConta.classList.remove('visible'); });
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
    btnBackupBanco.hidden = !ehAdministrador();
    atualizarBotaoReportesAdmin();

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
        mostrarEntradaVisitante();
        return;
    }
    document.body.classList.remove("visitante");

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

    carregarPerfil(usuarioAtual.id);
    atualizarPlacar(historico, questoes);
    aplicarFiltros();
    iniciarPrimeirosPassos();
}

// ---------- Tela de entrada do visitante ----------
// Antes era só "Faça login..." e, no celular, nenhum botão na tela (o login ficava no menu ☰).
// Agora diz o que é o FocoPro e tem as duas ações à vista. A barra de busca/filtros some
// (body.visitante), porque sem login não há questões para filtrar.
function mostrarEntradaVisitante() {
    document.body.classList.add("visitante");
    container.innerHTML = `
        <section class="entrada-visitante" aria-labelledby="entrada-titulo">
            <p class="entrada-marca">FocoPro ✦</p>
            <h1 id="entrada-titulo" class="entrada-titulo">Estude para concursos de TI, do zero até o nível da prova.</h1>
            <ul class="entrada-lista">
                <li><strong>Comece pelo básico.</strong> As questões vêm em níveis: Iniciante, Intermediário e de prova.</li>
                <li><strong>Revisão no dia certo.</strong> O que você errar volta amanhã, depois em 3, 7 e 21 dias.</li>
                <li><strong>Entenda o erro.</strong> Toda questão tem explicação, e a IA explica o seu erro quando você pedir.</li>
            </ul>
            <div class="entrada-acoes">
                <button type="button" class="btn-primary btn-entrada" data-modo-auth="cadastro">Criar conta</button>
                <button type="button" class="btn-secondary btn-entrada" data-modo-auth="login">Já tenho conta</button>
            </div>
        </section>`;
}

if (container) {
    container.addEventListener("click", (e) => {
        const botao = e.target.closest(".btn-entrada[data-modo-auth]");
        if (!botao || !modalAuth) return;
        aplicarModoAuth(botao.dataset.modoAuth);
        modalAuth.classList.add("visible");
        if (inputAuthEmail) inputAuthEmail.focus();
    });
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
// ==================== INÍCIO: 13. REPORTAR PROBLEMA NA QUESTÃO (U5) ====================
// Qualquer pessoa logada reporta; o admin vê a fila em "Ferramentas e Backup > Reportes".
const NOMES_TIPO_REPORTE = {
    gabarito: "Gabarito errado",
    enunciado: "Enunciado",
    alternativas: "Alternativas",
    desatualizada: "Desatualizada",
    outro: "Outro"
};
const modalReporte = document.getElementById("modal-reporte");
const formReporte = document.getElementById("form-reporte");
const selectTipoReporte = document.getElementById("reporte-tipo");
const textoReporte = document.getElementById("reporte-comentario");
let questaoEmReporte = null;
let enviandoReporte = false;

function resumoDaQuestao(q, tamanho = 110) {
    const enunciado = String(q.enunciado || q.pergunta || "").replace(/\s+/g, " ").trim();
    return enunciado.length > tamanho ? enunciado.slice(0, tamanho) + "…" : enunciado;
}

function abrirReporte(q) {
    if (!usuarioAtual) {
        showToast("Entre na sua conta para reportar um problema.", "alerta");
        return;
    }
    questaoEmReporte = q;
    document.getElementById("reporte-questao-resumo").textContent = `${q.id} · ${resumoDaQuestao(q)}`;
    if (selectTipoReporte) selectTipoReporte.value = "gabarito";
    if (textoReporte) textoReporte.value = "";
    document.getElementById("reporte-contador").textContent = "0";
    modalReporte.classList.add("visible");
    if (selectTipoReporte) selectTipoReporte.focus();
}

function fecharReporteModal() {
    modalReporte.classList.remove("visible");
    questaoEmReporte = null;
}

const MENSAGEM_ERRO_REPORTE = {
    duplicado: "Você já reportou esse problema nesta questão. Obrigado, já está na fila.",
    "sem-tabela": "O envio de reportes ainda não foi ativado no banco. Avise o administrador.",
    "sem-login": "Sua sessão expirou. Entre de novo e tente outra vez.",
    rede: "Não foi possível enviar agora. Confira a internet e tente de novo."
};

if (modalReporte && formReporte) {
    // O botão 🚩 está dentro do card; pelo foco ou pela lista, a delegação serve aos dois
    document.addEventListener("click", (e) => {
        const botao = e.target.closest(".btn-reportar");
        if (!botao) return;
        const q = porId.get(String(botao.dataset.id));
        if (q) abrirReporte(q);
    });

    textoReporte.addEventListener("input", () => {
        document.getElementById("reporte-contador").textContent = textoReporte.value.length;
    });
    document.getElementById("btn-reporte-cancelar").addEventListener("click", fecharReporteModal);
    modalReporte.addEventListener("click", (e) => { if (e.target === modalReporte) fecharReporteModal(); });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modalReporte.classList.contains("visible")) fecharReporteModal();
    });

    formReporte.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (enviandoReporte || !questaoEmReporte) return;
        enviandoReporte = true;
        const botaoEnviar = document.getElementById("btn-reporte-enviar");
        botaoEnviar.disabled = true;
        botaoEnviar.textContent = "Enviando...";
        const resultado = await enviarReporteDeQuestao({
            questaoId: questaoEmReporte.id,
            tipo: selectTipoReporte.value,
            comentario: textoReporte.value
        });
        enviandoReporte = false;
        botaoEnviar.disabled = false;
        botaoEnviar.textContent = "Enviar";
        if (resultado.ok) {
            fecharReporteModal();
            showToast("Reporte enviado. Obrigado por ajudar a melhorar o banco!", "sucesso");
            atualizarBotaoReportesAdmin();
        } else {
            showToast(MENSAGEM_ERRO_REPORTE[resultado.motivo] || MENSAGEM_ERRO_REPORTE.rede,
                resultado.motivo === "duplicado" ? "info" : "erro", 4000);
            if (resultado.motivo === "duplicado") fecharReporteModal();
        }
    });
}

// ---- Fila do admin ----
const btnReportesAdmin = document.getElementById("btn-reportes-admin");
const modalReportesAdmin = document.getElementById("modal-reportes-admin");
const listaReportesAdmin = document.getElementById("lista-reportes-admin");

async function atualizarBotaoReportesAdmin() {
    if (!btnReportesAdmin) return;
    btnReportesAdmin.hidden = !ehAdministrador();
    if (!ehAdministrador()) return;
    const r = await listarReportesAbertos();
    const contador = document.getElementById("contador-reportes");
    if (contador) contador.textContent = r.ok ? r.reportes.length : "–";
}

async function abrirReportesAdmin() {
    modalReportesAdmin.classList.add("visible");
    listaReportesAdmin.innerHTML = `<p class="modal-mensagem">Carregando...</p>`;
    const r = await listarReportesAbertos();
    if (!r.ok) {
        listaReportesAdmin.innerHTML = `<p class="modal-mensagem">${esc(r.motivo === "sem-tabela"
            ? "A tabela reportes_questao ainda não existe. Rode docs/sql/u5-reportes-questao.sql no Supabase."
            : "Não foi possível carregar agora.")}</p>`;
        return;
    }
    desenharReportesAdmin(r.reportes);
}

function desenharReportesAdmin(reportes) {
    const contador = document.getElementById("contador-reportes");
    if (contador) contador.textContent = reportes.length;
    if (!reportes.length) {
        listaReportesAdmin.innerHTML = `<p class="modal-mensagem">Nenhum reporte aberto. 🎉</p>`;
        return;
    }
    // Várias pessoas reportando a mesma questão ficam juntas: é o sinal mais forte de problema
    const porQuestao = new Map();
    reportes.forEach(r => {
        if (!porQuestao.has(r.questao_id)) porQuestao.set(r.questao_id, []);
        porQuestao.get(r.questao_id).push(r);
    });
    const grupos = [...porQuestao.entries()].sort((a, b) => b[1].length - a[1].length);
    listaReportesAdmin.innerHTML = grupos.map(([questaoId, lista]) => {
        const q = porId.get(String(questaoId));
        const itens = lista.map(r => `
            <li class="reporte-item" data-reporte="${esc(r.id)}">
                <div>
                    <strong>${esc(NOMES_TIPO_REPORTE[r.tipo] || r.tipo)}</strong>
                    <small>${esc(new Date(r.criado_em).toLocaleDateString("pt-BR"))}</small>
                    ${r.comentario ? `<p>${esc(r.comentario)}</p>` : ""}
                </div>
                <div class="reporte-acoes">
                    <button type="button" class="btn-sidebar btn-reporte-fechar" data-status="resolvido" data-id="${esc(r.id)}">✔ Resolvido</button>
                    <button type="button" class="btn-sidebar btn-reporte-fechar" data-status="descartado" data-id="${esc(r.id)}">Descartar</button>
                </div>
            </li>`).join("");
        return `
            <section class="reporte-grupo">
                <h4>${esc(questaoId)} <span class="badge-count">${lista.length}</span></h4>
                <p class="reporte-enunciado">${q ? esc(`${q.materia || ""} · ${resumoDaQuestao(q, 160)}`) : "(questão não está mais no banco)"}</p>
                <ul class="reporte-lista">${itens}</ul>
            </section>`;
    }).join("");
}

if (btnReportesAdmin && modalReportesAdmin) {
    btnReportesAdmin.addEventListener("click", abrirReportesAdmin);
    document.getElementById("btn-fechar-reportes").addEventListener("click", () => modalReportesAdmin.classList.remove("visible"));
    modalReportesAdmin.addEventListener("click", (e) => { if (e.target === modalReportesAdmin) modalReportesAdmin.classList.remove("visible"); });
    listaReportesAdmin.addEventListener("click", async (e) => {
        const botao = e.target.closest(".btn-reporte-fechar");
        if (!botao || botao.disabled) return;
        botao.disabled = true;
        const r = await fecharReporte(botao.dataset.id, botao.dataset.status);
        if (!r.ok) {
            botao.disabled = false;
            showToast("Não foi possível atualizar o reporte.", "erro");
            return;
        }
        const item = botao.closest(".reporte-item");
        const grupo = botao.closest(".reporte-grupo");
        if (item) item.remove();
        if (grupo && !grupo.querySelector(".reporte-item")) grupo.remove();
        const restantes = listaReportesAdmin.querySelectorAll(".reporte-item").length;
        const contador = document.getElementById("contador-reportes");
        if (contador) contador.textContent = restantes;
        if (!restantes) listaReportesAdmin.innerHTML = `<p class="modal-mensagem">Nenhum reporte aberto. 🎉</p>`;
    });
}
// ==================== FIM: 13. REPORTAR PROBLEMA NA QUESTÃO (U5) ====================

// ==================== INÍCIO: 14. PRIMEIRA SESSÃO (boas-vindas, sessão guiada, dicas, meta) ====================
// Itens B, C, D e Q da Análise da primeira experiência. As telas ficam em js/primeiros-passos.js;
// aqui fica o que depende das questões, do histórico e do Modo Foco.
const MATERIAS_PARA_COMECAR = [
    "Banco de Dados & Dados",
    "Redes & Segurança da Informação",
    "Engenharia de Software & Agilidade"
];
let boasVindasAbertaNestaCarga = false;

function jaRespondeu(id) {
    const h = historico[String(id)];
    return Boolean(h && Number(h.tentativas) > 0);
}

function temHistorico() {
    return Object.values(historico).some(h => h && Number(h.tentativas) > 0);
}

// Matérias com pelo menos 5 questões de Iniciante ainda não feitas, a recomendada primeiro
function materiasParaPrimeiraSessao() {
    const contagem = {};
    questoes.forEach(q => {
        if (Number(q.nivel) === 1 && !jaRespondeu(q.id)) contagem[q.materia] = (contagem[q.materia] || 0) + 1;
    });
    const ordem = [...MATERIAS_PARA_COMECAR, ...ORDEM_MACROS.filter(m => !MATERIAS_PARA_COMECAR.includes(m))];
    return ordem.filter(m => (contagem[m] || 0) >= 5).map(nome => ({ nome, disponiveis: contagem[nome] }));
}

// Chamado ao fim de cada carga do banco (usuário logado)
function iniciarPrimeirosPassos() {
    if (!usuarioAtual) return;
    // Quem já estudava antes deste pacote não recebe as dicas de iniciante
    if (temHistorico() && !dicasJaForamDecididas()) marcarTodasDicasComoVistas();
    if (obterPerfilAtivo() || temHistorico() || boasVindasAbertaNestaCarga) return;
    boasVindasAbertaNestaCarga = true;
    abrirBoasVindasCompleta();
}

function abrirBoasVindasCompleta() {
    abrirBoasVindas({
        materias: materiasParaPrimeiraSessao(),
        onConcluir: ({ perfil, materia }) => {
            salvarPerfil(usuarioAtual.id, perfil);
            aplicarFiltros(); // a ordem das questões depende do perfil
            if (materia) iniciarAprender(materia, null, { guiada: true });
            else mostrarDica("antes-de-responder");
        }
    });
}

// Depois de cada resposta no modo estudo: dicas da primeira vez e aviso da meta batida
function reagirAPrimeirosPassos({ acertou, confianca }) {
    if (!foco) colocarCartaoHoje();
    if (!acertou) mostrarDica("primeiro-erro");
    else if (confianca === "duvida") mostrarDica("primeira-duvida");
    if (Object.values(historico).filter(h => h && Number(h.tentativas) > 0).length >= 10) mostrarDica("tres-numeros");

    const estado = atualizarMetaNaTela(historico);
    if (metaBatidaAgora(estado)) {
        showToast(`🎯 Meta de hoje batida: ${estado.feitas} questões. Pode parar por aqui ou continuar.`, "sucesso", 5000);
    }
}

// "Meta diária e perfil" na gaveta: as 3 perguntas de novo, com as respostas atuais marcadas
const btnPerfilMeta = document.getElementById("btn-perfil-meta");
if (btnPerfilMeta) {
    btnPerfilMeta.addEventListener("click", () => {
        if (!usuarioAtual) {
            showToast("Entre na sua conta para definir sua meta.", "alerta");
            return;
        }
        abrirBoasVindas({
            materias: [],
            perfilAtual: obterPerfilAtivo(),
            onConcluir: ({ perfil }) => {
                salvarPerfil(usuarioAtual.id, perfil);
                aplicarFiltros();
                showToast(`Perfil salvo. Meta: ${perfil.meta} questões por dia.`, "sucesso");
            }
        });
    });
}
// ==================== FIM: 14. PRIMEIRA SESSÃO ====================

// ==================== INÍCIO: 15. BARRA LATERAL (Minha conta e Meu desempenho) ====================
// Visitante: tocar no cartão do avatar abre o login, em vez de abrir uma gaveta vazia
const cartaoConta = document.getElementById("user-profile-container");
if (cartaoConta) {
    cartaoConta.addEventListener("click", (e) => {
        if (usuarioAtual || !modalAuth) return;
        e.preventDefault();
        aplicarModoAuth("login");
        modalAuth.classList.add("visible");
        if (inputAuthEmail) inputAuthEmail.focus();
    });
}

// "Meu desempenho" lembra se você deixou aberto ou fechado (neste aparelho)
const gavetaDesempenho = document.getElementById("gaveta-desempenho");
const CHAVE_GAVETA_DESEMPENHO = "appEstudos_GavetaDesempenhoAberta";
if (gavetaDesempenho) {
    try {
        const salvo = localStorage.getItem(CHAVE_GAVETA_DESEMPENHO);
        if (salvo !== null) gavetaDesempenho.open = salvo === "1";
    } catch (e) { /* sem localStorage: fica aberta */ }
    gavetaDesempenho.addEventListener("toggle", () => {
        try { localStorage.setItem(CHAVE_GAVETA_DESEMPENHO, gavetaDesempenho.open ? "1" : "0"); } catch (e) { /* segue */ }
    });
}
// ==================== FIM: 15. BARRA LATERAL ====================

// ==================== INÍCIO: 16. HOJE (cartão "Hoje", resumo da semana, explicações no toque) ====================
// Itens E, N, O e U da Análise da primeira experiência. O cartão fica no topo da lista e diz
// o que fazer agora: primeiro a revisão, depois as novas, até a meta. "Continuar" abre o Foco.
const CHAVE_SEMANA_DISPENSADA = "appEstudos_ResumoSemanaDispensado";

function questoesParaRevisarHoje() {
    const hoje = diaLocal();
    return questoes
        .filter(q => venceHoje(historico[String(q.id)], hoje))
        .sort((a, b) => historico[String(a.id)].revisaoEm.localeCompare(historico[String(b.id)].revisaoEm));
}

// Semana passada (segunda a domingo), com o que o histórico guarda: dias estudados (exato) e
// as questões cuja última resposta caiu naquela semana. Aparece até ser dispensado ou a semana virar.
function resumoSemanaPassada() {
    const agora = new Date();
    const diaDaSemana = (agora.getDay() + 6) % 7; // 0 = segunda
    const inicioEsta = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - diaDaSemana);
    const inicioPassada = new Date(inicioEsta);
    inicioPassada.setDate(inicioPassada.getDate() - 7);
    const chave = diaLocal(inicioEsta);
    try { if (localStorage.getItem(CHAVE_SEMANA_DISPENSADA) === chave) return null; } catch (e) { /* segue */ }

    const de = inicioPassada.getTime(), ate = inicioEsta.getTime();
    let diasEstudados = 0;
    for (let i = 0; i < 7; i++) {
        const d = new Date(inicioPassada);
        d.setDate(d.getDate() + i);
        if (carregarDiasDeEstudo().has(diaLocal(d))) diasEstudados++;
    }
    let trabalhadas = 0, certas = 0, dominadas = 0;
    Object.values(historico).forEach(h => {
        if (!h || !h.ultimaData || h.ultimaData < de || h.ultimaData >= ate) return;
        trabalhadas++;
        if (h.ultimaResposta === "certo") certas++;
        if (h.status === "dominada") dominadas++;
    });
    if (!diasEstudados && !trabalhadas) return null;
    return { chave, diasEstudados, trabalhadas, pct: trabalhadas ? Math.round(certas * 100 / trabalhadas) : 0, dominadas };
}

function colocarCartaoHoje() {
    if (!container) return;
    const antigo = container.querySelector(".cartao-hoje");
    if (!usuarioAtual || foco || simulado || !questoes.length) {
        if (antigo) antigo.remove();
        return;
    }
    const revisar = questoesParaRevisarHoje();
    const meta = atualizarMetaNaTela(historico);
    const semana = resumoSemanaPassada();

    let titulo, texto;
    if (revisar.length) {
        titulo = revisar.length === 1 ? "Comece pela revisão: 1 questão" : `Comece pela revisão: ${revisar.length} questões`;
        texto = "São as que você errou ou acertou na dúvida. Depois vêm as questões novas.";
    } else if (meta && meta.batida) {
        titulo = "Meta de hoje batida 🎯";
        texto = "Pode parar por aqui ou continuar com questões novas.";
    } else if (meta) {
        const faltam = meta.meta - meta.feitas;
        titulo = faltam === 1 ? "Falta 1 questão para a meta de hoje" : `Faltam ${faltam} questões para a meta de hoje`;
        texto = "Nada para revisar hoje. Siga com as questões novas, uma por vez.";
    } else {
        titulo = "Pronto para estudar?";
        texto = "Nada para revisar hoje. Siga com as questões novas, uma por vez.";
    }

    const textoSemana = semana ? `
        <div class="hoje-semana">
            <p><strong>Semana passada:</strong> você estudou ${semana.diasEstudados} de 7 dias e trabalhou ${semana.trabalhadas} ${semana.trabalhadas === 1 ? "questão" : "questões"}${semana.trabalhadas ? ` (${semana.pct}% certas na última tentativa)` : ""}.${semana.dominadas ? ` ${semana.dominadas} ${semana.dominadas === 1 ? "virou Dominada" : "viraram Dominadas"}.` : ""}</p>
            <button type="button" class="btn-fechar-aviso hoje-semana-fechar" data-chave="${esc(semana.chave)}" aria-label="Dispensar o resumo da semana">✕</button>
        </div>` : "";

    const caixa = document.createElement("section");
    caixa.className = "cartao-hoje";
    caixa.setAttribute("aria-label", "Hoje");
    caixa.innerHTML = `
        <div class="hoje-topo">
            <div>
                <p class="hoje-rotulo">Hoje</p>
                <h2 class="hoje-titulo">${esc(titulo)}</h2>
                <p class="hoje-texto">${esc(texto)}</p>
            </div>
            <div class="hoje-botoes">
                <button type="button" class="btn-primary hoje-continuar">▶ Continuar</button>
            </div>
        </div>
        ${textoSemana}`;
    if (antigo) antigo.replaceWith(caixa);
    else container.prepend(caixa);
}

// "Continuar": a revisão do dia primeiro, depois as novas da lista atual (filtros e ordem de estudo)
function continuarHoje() {
    const revisar = questoesParaRevisarHoje();
    const idsRevisar = new Set(revisar.map(q => String(q.id)));
    const novas = ordenarParaEstudo(filtrarQuestoes()).filter(q => !jaRespondeu(q.id) && !idsRevisar.has(String(q.id)));
    const lista = [...revisar, ...novas];
    if (!lista.length) {
        showToast("Você já respondeu todas as questões desta lista. Mude os filtros ou use Resolver Novamente.", "info", 4000);
        return;
    }
    entrarFoco(lista, { titulo: revisar.length ? "Hoje · revisão primeiro" : "Hoje", silencioso: true });
}

if (container) {
    container.addEventListener("click", (e) => {
        if (e.target.closest(".hoje-continuar")) { continuarHoje(); return; }
        const fechar = e.target.closest(".hoje-semana-fechar");
        if (fechar) {
            try { localStorage.setItem(CHAVE_SEMANA_DISPENSADA, fechar.dataset.chave); } catch (err) { /* segue */ }
            const caixa = fechar.closest(".hoje-semana");
            if (caixa) caixa.remove();
            return;
        }
        if (e.target.closest(".btn-limpar-vazio") && btnTodas) btnTodas.click();
    });
}

// ---- Explicações que funcionam no toque (antes eram só dicas de mouse) ----
const explicacoesDesempenho = document.querySelectorAll("[data-explicacao]");
const textoExplicacao = document.getElementById("explicacao-desempenho");
let explicacaoAberta = null;
const TEXTO_DICA_TOQUE = textoExplicacao ? textoExplicacao.textContent : "";
explicacoesDesempenho.forEach(el => {
    const alternar = () => {
        if (!textoExplicacao) return;
        if (explicacaoAberta === el) {
            textoExplicacao.textContent = TEXTO_DICA_TOQUE;
            textoExplicacao.classList.add("dica-toque");
            el.setAttribute("aria-expanded", "false");
            explicacaoAberta = null;
            return;
        }
        if (explicacaoAberta) explicacaoAberta.setAttribute("aria-expanded", "false");
        textoExplicacao.textContent = el.dataset.explicacao;
        textoExplicacao.classList.remove("dica-toque");
        el.setAttribute("aria-expanded", "true");
        explicacaoAberta = el;
    };
    el.addEventListener("click", alternar);
    el.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); alternar(); }
    });
});
// ==================== FIM: 16. HOJE ====================

// ==================== INÍCIO: 17. APRENDER (cartão de dois lados por assunto) ====================
// Lado 1, Aprenda: a 1ª questão do assunto, já resolvida, com o comentário.
// Lado 2, Prove: as outras questões Iniciante do mesmo assunto, uma por vez, no Modo Foco.
// As regras (ordem, estado de cada assunto, ponte para a prova) ficam em js/aprender.js.
const CHAVE_ULTIMA_MATERIA_APRENDER = "appEstudos_UltimaMateriaAprender";

async function iniciarAprender(materia, nomeAssunto = null, opcoes = {}) {
    const trilha = montarTrilha(materia, questoes, historico);
    const assunto = nomeAssunto ? trilha.find(a => a.nome === nomeAssunto) : proximoAssunto(trilha);
    if (!assunto) {
        showToast(trilha.length ? `Você já aprendeu todos os assuntos de ${materia}. 🎉` : "Essa matéria ainda não tem questões de Iniciante.", "info", 4000);
        return;
    }
    try { localStorage.setItem(CHAVE_ULTIMA_MATERIA_APRENDER, materia); } catch (e) { /* segue */ }
    // Fase 2: "Entenda em 1 minuto" abre o assunto, se já existir texto para ele
    const resumo = await obterResumoDoAssunto(materia, assunto.nome);
    const cartaoResumo = resumo ? { id: `resumo:${materia}|${assunto.nome}`, resumo } : null;
    const lista = [...(cartaoResumo ? [cartaoResumo] : []), ...(assunto.exemplo ? [assunto.exemplo] : []), ...assunto.prova];
    const idsDeLeitura = [cartaoResumo, assunto.exemplo].filter(Boolean).map(x => String(x.id));
    entrarFoco(lista, {
        titulo: `Aprender · ${assunto.nome}`,
        exemplos: new Set(idsDeLeitura),
        aprender: { materia, nome: assunto.nome },
        guiada: Boolean(opcoes.guiada),
        silencioso: true
    });
    setTimeout(() => mostrarDica("aprender"), 300);
}

// "Entenda em 1 minuto" (Fase 2): um texto curto por assunto, em data/resumos-assunto.json.
// Arquivo estático (não tem gabarito, não precisa de banco). Se não carregar, o Aprender
// segue sem o cartão, como na Fase 1.
let resumosPorAssunto = null;
async function obterResumoDoAssunto(materia, nome) {
    if (!resumosPorAssunto) {
        try {
            const resp = await fetch("./data/resumos-assunto.json");
            const lista = resp.ok ? await resp.json() : [];
            resumosPorAssunto = new Map(lista.map(r => [`${r.materia}|${r.assunto}`, r]));
        } catch (e) {
            return null; // tenta de novo na próxima vez
        }
    }
    return resumosPorAssunto.get(`${materia}|${nome}`) || null;
}

// Molde v2 (aprovado em 28/10): resumo + nao_confundir + palavras_chave + pegadinha.
// O campo "modelo" troca só os rótulos: "conceito" (matérias de TI) ou "regra" (Português, RLM).
// Textos no formato antigo (ideia_central/exemplo) continuam funcionando.
const ROTULOS_RESUMO = {
    conceito: { comparar: "🔀 Não confundir", chave: "🔑 Palavras-chave", pegadinha: "⚠️ Pegadinha" },
    regra: { comparar: "✅ Certo × errado", chave: "💡 Teste rápido", pegadinha: "⚠️ Erro mais comum" }
};

function cardResumo(r) {
    const card = document.createElement("article");
    card.className = "card-questao card-foco card-exemplo card-resumo";
    card.dataset.exemplo = "1";
    card.dataset.respondida = "1";
    const bloco = (rotulo, texto) => texto && String(texto).trim()
        ? `<div class="resumo-bloco"><p class="resumo-rotulo">${rotulo}</p><p>${esc(texto)}</p></div>` : "";
    const faixa = `<p class="exemplo-faixa">💡 Entenda em 1 minuto · leia e siga para o exemplo.</p>`;

    if (typeof r.resumo !== "string") {
        card.innerHTML = `${faixa}
            <p class="resumo-central">${esc(r.ideia_central)}</p>
            ${bloco("Exemplo", r.exemplo)}
            ${bloco("⚠️ Pegadinha", r.pegadinha)}`;
        return card;
    }

    const rotulos = ROTULOS_RESUMO[r.modelo] || ROTULOS_RESUMO.conceito;
    // A frase central vem em destaque; o "Ex.:" do resumo fica logo abaixo, em texto normal
    const corte = r.resumo.indexOf(" Ex.:");
    const central = corte > 0 ? r.resumo.slice(0, corte) : r.resumo;
    const exemplo = corte > 0 ? r.resumo.slice(corte + 1) : "";
    const pares = Array.isArray(r.nao_confundir) ? r.nao_confundir.filter(p => p && p.conceito) : [];
    const comparar = pares.length
        ? `<div class="resumo-bloco"><p class="resumo-rotulo">${rotulos.comparar}</p>
            <ul class="resumo-pares">${pares.map(p =>
                `<li><strong>${esc(p.conceito)}</strong> → ${esc(p.faz)}</li>`).join("")}</ul></div>`
        : "";
    card.innerHTML = `${faixa}
        <p class="resumo-central">${esc(central)}</p>
        ${exemplo ? `<p class="resumo-exemplo">${esc(exemplo)}</p>` : ""}
        ${comparar}
        ${bloco(rotulos.chave, r.palavras_chave)}
        ${bloco(rotulos.pegadinha, r.pegadinha)}`;
    return card;
}

// Exemplo resolvido: a questão com a resposta certa marcada e o comentário, sem botões de resposta.
// O gabarito vem do servidor só desta questão (U9: o app não recebe o banco com gabaritos).
function cardExemplo(q) {
    const temp = document.createElement("div");
    renderizarQuestoes(temp, [q], historico, "", { restaurarRespostas: false });
    const card = temp.firstElementChild;
    if (!card) return card;
    card.classList.add("card-foco", "card-exemplo");
    card.dataset.exemplo = "1";
    card.dataset.respondida = "1";
    card.querySelectorAll(".radio-opcao").forEach(r => { r.disabled = true; });
    const botoes = card.querySelector(".botoes-resposta");
    if (botoes) botoes.hidden = true;
    const tentativas = card.querySelector(".tentativas");
    if (tentativas) tentativas.hidden = true;
    card.insertAdjacentHTML("afterbegin",
        `<p class="exemplo-faixa">📖 Exemplo resolvido · leia com calma. Depois é a sua vez.</p>`);

    const fb = card.querySelector(".feedback-container");
    const gabaritoDiv = fb && fb.querySelector(".gabarito-resposta");
    if (fb) {
        fb.classList.remove("oculta");
        fb.classList.add("neutro");
        fb.style.display = "block";
    }
    if (gabaritoDiv) gabaritoDiv.textContent = "Carregando a resolução...";

    const letraQualquer = (obterOpcoes(q)[0] || {}).letra || "A";
    corrigirResposta(q, letraQualquer).then(({ gabarito }) => {
        q.gabarito = gabarito;
        revelar(card, q, gabarito);
        const div = card.querySelector(".gabarito-resposta");
        if (div) div.innerHTML = `📖 <strong>Resposta certa:</strong> ${esc(textoGabaritoDe(q))}`;
        const refazer = card.querySelector(".btn-refazer");
        if (refazer) refazer.hidden = true;
    }).catch(() => {
        // Sem o gabarito, o comentário ainda ensina (ele explica cada alternativa)
        const div = card.querySelector(".gabarito-resposta");
        if (div) div.textContent = "Não foi possível carregar a resposta agora. Leia o comentário:";
        const explicacao = card.querySelector(".explicacao-texto");
        if (explicacao) explicacao.innerHTML = `<div style="margin-top: 8px;"><strong>📘 Comentário:</strong> ${esc(q.explicacao || "")}</div>`;
    });
    return card;
}

// Texto do fim da sessão de Aprender: o estado do assunto e o que fazer em seguida
function textoAprender() {
    if (!foco || !foco.aprender) return "";
    const { materia, nome } = foco.aprender;
    const trilha = montarTrilha(materia, questoes, historico);
    const assunto = trilha.find(a => a.nome === nome);
    if (!assunto) return "";
    const proximo = trilha.find(a => a.estado === "nao-visto" && a.nome !== nome);
    const aprendidos = trilha.filter(a => a.estado === "aprendido").length;
    const ponte = assunto.estado === "aprendido" ? questaoPonte(assunto, questoes, historico) : null;

    const estado = assunto.estado === "aprendido"
        ? `<p class="aprender-estado ok">✓ <strong>${esc(nome)}</strong>: aprendido. Acerte as questões dele de novo, com certeza, em outro dia, e elas viram Dominadas.</p>`
        : `<p class="aprender-estado"><strong>${esc(nome)}</strong>: ${assunto.certas} de ${assunto.total} certas. Com ${assunto.minimo} certas ele conta como aprendido. As que você errou voltam amanhã.</p>`;
    const progresso = `<p class="aprender-progresso">${esc(materia)}: ${aprendidos} de ${trilha.length} assuntos aprendidos.</p>`;
    const botoes = [
        ponte ? `<button type="button" class="btn-secondary aprender-ponte" data-id="${esc(ponte.id)}">🎯 Tentar 1 questão ${Number(ponte.nivel) === 2 ? "do Intermediário" : "de prova"} desse assunto</button>` : "",
        proximo ? `<button type="button" class="btn-primary aprender-proximo" data-materia="${esc(materia)}" data-assunto="${esc(proximo.nome)}">📖 Próximo: ${esc(proximo.nome)}</button>` : ""
    ].join("");
    return `${estado}${progresso}${botoes ? `<div class="foco-resumo-acoes">${botoes}</div>` : ""}`;
}

if (container) {
    container.addEventListener("click", (e) => {
        const proximo = e.target.closest(".aprender-proximo");
        if (proximo) { iniciarAprender(proximo.dataset.materia, proximo.dataset.assunto); return; }
        const ponte = e.target.closest(".aprender-ponte");
        if (ponte) {
            const q = porId.get(String(ponte.dataset.id));
            if (q) entrarFoco([q], { titulo: `Desafio · ${q.assunto || q.materia}`, silencioso: true });
        }
    });
}

// "📖 Aprender" no cartão Hoje: escolher a matéria (a última usada vem primeiro)
function abrirEscolhaAprender() {
    const resumo = resumoDasTrilhas(questoes, historico);
    let ultima = null;
    try { ultima = localStorage.getItem(CHAVE_ULTIMA_MATERIA_APRENDER); } catch (e) { /* segue */ }
    const ordem = [...new Set([ultima, ...MATERIAS_PARA_COMECAR, ...ORDEM_MACROS, ...Object.keys(resumo)])]
        .filter(m => m && resumo[m] && resumo[m].total > 0);
    if (!ordem.length) {
        showToast("Ainda não há questões de Iniciante para aprender.", "info");
        return;
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay boas-vindas escolha-aprender";
    overlay.innerHTML = `
        <div class="modal-card boas-vindas-card" role="dialog" aria-modal="true" aria-labelledby="ea-titulo">
            <h3 id="ea-titulo" class="modal-titulo">📖 O que aprender agora?</h3>
            <p class="modal-mensagem">Um assunto por vez: um exemplo resolvido e depois a sua vez.</p>
            <div class="bv-opcoes">${ordem.map(m => {
                const r = resumo[m];
                const detalhe = r.proximo
                    ? `Próximo: ${r.proximo.nome} · ${r.aprendidos} de ${r.total} assuntos`
                    : `Tudo aprendido ✓ · ${r.total} assuntos`;
                const bolas = Math.min(r.total, 24);
                const feitas = r.total ? Math.round(r.aprendidos * bolas / r.total) : 0;
                const caminho = Array.from({ length: bolas }, (_, i) => `<i class="trilha-bola${i < feitas ? " feita" : (i === feitas && r.proximo ? " atual" : "")}"></i>`).join("");
                return `<button type="button" class="bv-opcao" data-materia="${esc(m)}" ${r.proximo ? "" : "disabled"}>
                    <span class="bv-opcao-texto">${esc(m)}</span><span class="trilha-caminho" aria-hidden="true">${caminho}</span><span class="bv-opcao-detalhe">${esc(detalhe)}</span></button>`;
            }).join("")}</div>
            <div class="modal-acoes"><button type="button" class="btn-secondary ea-cancelar">Cancelar</button></div>
        </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("visible"));
    const primeira = overlay.querySelector(".bv-opcao:not([disabled])");
    if (primeira) primeira.focus({ preventScroll: true });

    const fechar = () => {
        overlay.classList.remove("visible");
        document.removeEventListener("keydown", aoTeclar);
        setTimeout(() => overlay.remove(), 200);
    };
    const aoTeclar = (e) => { if (e.key === "Escape") fechar(); };
    document.addEventListener("keydown", aoTeclar);
    overlay.addEventListener("click", (e) => {
        const op = e.target.closest(".bv-opcao[data-materia]");
        if (op && !op.disabled) { fechar(); iniciarAprender(op.dataset.materia); return; }
        if (e.target === overlay || e.target.closest(".ea-cancelar")) fechar();
    });
}
// ==================== FIM: 17. APRENDER ====================

// ==================== INÍCIO: 18. BARRA RECOLHÍVEL (computador) ====================
// Um clique recolhe a barra inteira (fica só a área das questões); o botão "F" traz de volta.
// O app lembra a escolha. No celular a barra já é uma gaveta (☰), então isto só vale no computador.
const CHAVE_BARRA_RECOLHIDA = "appEstudos_BarraRecolhida";
const btnRecolherBarra = document.getElementById("btn-recolher-barra");
const btnAbrirBarra = document.getElementById("btn-abrir-barra");

function aplicarBarraRecolhida(recolhida) {
    document.body.classList.toggle("barra-recolhida", recolhida);
    if (btnAbrirBarra) btnAbrirBarra.hidden = !recolhida;
    try { localStorage.setItem(CHAVE_BARRA_RECOLHIDA, recolhida ? "1" : "0"); } catch (e) { /* segue */ }
}
try { aplicarBarraRecolhida(localStorage.getItem(CHAVE_BARRA_RECOLHIDA) === "1"); } catch (e) { /* segue aberta */ }
if (btnRecolherBarra) btnRecolherBarra.addEventListener("click", () => aplicarBarraRecolhida(true));
if (btnAbrirBarra) btnAbrirBarra.addEventListener("click", () => aplicarBarraRecolhida(false));
// ==================== FIM: 18. BARRA RECOLHÍVEL ====================
