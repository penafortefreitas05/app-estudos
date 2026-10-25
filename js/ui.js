// ============================================================
// js/ui.js - Renderização e Manipulação da Interface (FocoPro)
// ============================================================

import { carregarDiasDeEstudo, diaLocal } from './storage.js';

// Matéria "a reforçar": abaixo deste % de acerto, com pelo menos esta quantidade de respostas
// (sem o mínimo, 1 erro em 1 questão já marcaria a matéria como crítica)
const LIMITE_CRITICO = 60;
const MIN_RESPOSTAS_CRITICO = 5;

// ---------- 1. UTILITÁRIOS DE TEXTO E SEGURANÇA ----------
export function esc(texto) {
    if (texto === null || texto === undefined) return "";
    return String(texto)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

export function formatarTempo(segundos) {
    if (isNaN(segundos) || segundos < 0) return "00:00";
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    return String(min).padStart(2, '0') + ":" + String(seg).padStart(2, '0');
}

// ---------- 2. NORMALIZADOR UNIVERSAL DE ALTERNATIVAS E GABARITO ----------
export function obterOpcoes(q) {
    const fonteAlternativas = q ? (q.alternativas || q.opcoes) : null;
    if (!fonteAlternativas) return [];

    // Caso 1: Alternativas em formato de Array
    if (Array.isArray(fonteAlternativas)) {
        const textosLimpos = fonteAlternativas.map(x => String(x).trim());
        const lowers = textosLimpos.map(x => x.toLowerCase());

        // Detecta questões de Certo / Errado em Array
        const ehCertoErrado = textosLimpos.length === 2 &&
            lowers.every(l => l === "certo" || l === "correto" || l === "errado" || l === "incorreto");

        if (ehCertoErrado) {
            return textosLimpos.map(texto => {
                const l = (texto.toLowerCase() === "certo" || texto.toLowerCase() === "correto") ? "C" : "E";
                return { letra: l, texto };
            });
        }

        // Múltipla escolha em Array (com ou sem prefixo "A) ")
        return textosLimpos.map((texto, i) => {
            const matchPrefixo = /^([A-Ea-e])\s*[\)\.\-:]\s+(.*)$/.exec(texto);
            if (matchPrefixo) {
                return { letra: matchPrefixo[1].toUpperCase(), texto: matchPrefixo[2].trim() };
            }
            return { letra: String.fromCharCode(65 + i), texto };
        });
    }

    // Caso 2: Alternativas em formato de Objeto { A: "...", B: "..." }
    if (typeof fonteAlternativas === "object") {
        return Object.entries(fonteAlternativas).map(([letra, texto]) => ({
            letra: String(letra).trim().toUpperCase(),
            texto: String(texto).trim()
        }));
    }

    return [];
}

export function letraDe(alt) {
    if (!alt) return "";
    const str = String(alt).trim();
    const lower = str.toLowerCase();

    if (lower === "certo" || lower === "correto" || lower === "c") return "C";
    if (lower === "errado" || lower === "incorreto" || lower === "e") return "E";

    const primeiraLetra = str.charAt(0).toUpperCase();
    if (primeiraLetra >= "A" && primeiraLetra <= "Z") {
        return primeiraLetra;
    }
    return str.toUpperCase();
}

export function gabaritoDe(q) {
    if (!q) return "A";
    const gabFonte = q.gabarito || q.resposta_correta;
    if (!gabFonte) return "A";

    const opcoes = obterOpcoes(q);
    const gabRaw = String(gabFonte).trim();
    const gabLower = gabRaw.toLowerCase();

    // 1. Compara pelo texto completo da alternativa
    const porTexto = opcoes.find(op => op.texto.toLowerCase() === gabLower);
    if (porTexto) return porTexto.letra;

    // 2. Compara pela letra exata da opção
    const porLetra = opcoes.find(op => op.letra === gabRaw.toUpperCase());
    if (porLetra) return porLetra.letra;

    // 3. Sinônimos de Certo / Errado
    if (gabLower === "certo" || gabLower === "correto" || gabLower === "c") {
        const opC = opcoes.find(op => op.letra === "C" || op.texto.toLowerCase() === "certo");
        return opC ? opC.letra : "C";
    }
    if (gabLower === "errado" || gabLower === "incorreto" || gabLower === "e") {
        const opE = opcoes.find(op => op.letra === "E" || op.texto.toLowerCase() === "errado");
        return opE ? opE.letra : "E";
    }

    // 4. Fallback caso o gabarito venha como "A) Texto"
    const matchPrefixo = /^([A-Ea-e])\s*[\)\.\-:]/.exec(gabRaw);
    if (matchPrefixo) return matchPrefixo[1].toUpperCase();

    return gabRaw.charAt(0).toUpperCase();
}

export function textoGabaritoDe(q) {
    const opcoes = obterOpcoes(q);
    const letra = gabaritoDe(q);
    const opCorreta = opcoes.find(op => op.letra === letra);
    if (opCorreta) {
        return (opCorreta.texto === "Certo" || opCorreta.texto === "Errado")
            ? opCorreta.texto
            : `${opCorreta.letra}) ${opCorreta.texto}`;
    }
    return String(q.gabarito || q.resposta_correta || letra);
}

// ---------- 3. COMPONENTES DE INTERFACE ----------
export function preencherSelect(selectElement, textoPadrao, propriedade, listaQuestoes) {
    if (!selectElement) return;
    const contagem = {};
    listaQuestoes.forEach(q => {
        const val = q[propriedade];
        if (val) contagem[val] = (contagem[val] || 0) + 1;
    });

    selectElement.innerHTML = `<option value="">${esc(textoPadrao)} (${listaQuestoes.length})</option>`;
    Object.keys(contagem)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .forEach(valor => {
            const opt = document.createElement("option");
            opt.value = valor;
            opt.textContent = `${valor} (${contagem[valor]})`;
            selectElement.appendChild(opt);
        });
}


// Preenche um <select> a partir de um campo que é uma LISTA por questão (como "tags"),
// contando quantas vezes cada valor aparece no total.
export function preencherSelectTags(selectElement, textoPadrao, listaQuestoes) {
    if (!selectElement) return;
    const contagem = {};
    listaQuestoes.forEach(q => {
        (q.tags || []).forEach(t => {
            const val = String(t).trim();
            if (val) contagem[val] = (contagem[val] || 0) + 1;
        });
    });

    selectElement.innerHTML = `<option value="">${esc(textoPadrao)}</option>`;
    Object.keys(contagem)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .forEach(valor => {
            const opt = document.createElement("option");
            opt.value = valor;
            opt.textContent = `${valor} (${contagem[valor]})`;
            selectElement.appendChild(opt);
        });
}

// Classifica a questão em 3 categorias simples para o filtro de status:
// "nao-respondida", "acertei" ou "errei" (questão superada depois de errar conta como "acertei").
export function obterCategoriaStatus(qId, historico) {
    const h = historico[String(qId)] || historico[qId];
    if (!h || !h.tentativas) return 'nao-respondida';
    const ehErroAtivo = h.status === 'erro' || (h.ultimaResposta === 'errado' && h.status !== 'superado');
    return ehErroAtivo ? 'errei' : 'acertei';
}
// ==================== FIM ====================

export function atualizarChipTag(chipTagElement, tag) {
    if (!chipTagElement) return;
    if (!tag) {
        chipTagElement.hidden = true;
        chipTagElement.innerHTML = "";
        return;
    }
    chipTagElement.hidden = false;
    chipTagElement.innerHTML = `<span>Filtro ativo por tag: <strong>#${esc(tag)}</strong></span> <button type="button" id="btn-limpar-tag" class="btn-limpar-tag">✖ Remover</button>`;
}

export function classificarStatus(qId, historico) {
    const h = historico[String(qId)] || historico[qId];
    if (!h || !h.tentativas) return { texto: "Não Respondida", classe: "badge-neutro" };

    if (h.status === 'superado') return { texto: "Superada ⚡", classe: "badge-sucesso" };

    const recentes = Array.isArray(h.recentes) ? h.recentes : [];
    const ultimosCinco = recentes.slice(-5);
    const taxaRecente = ultimosCinco.length > 0
        ? (ultimosCinco.reduce((acc, v) => acc + v, 0) / ultimosCinco.length) * 100
        : ((h.acertos || 0) / h.tentativas) * 100;

    if (h.tentativas >= 3 && taxaRecente >= 80) return { texto: "Dominada 🎯", classe: "badge-sucesso" };
    if (taxaRecente <= 40 || h.status === 'erro' || h.ultimaResposta === 'errado') return { texto: "Caderno de Erros ❌", classe: "badge-perigo" };
    return { texto: "Em Aprendizado 📘", classe: "badge-alerta" };
}

// ---------- 4. ATUALIZAÇÃO DO PLACAR E DASHBOARD ----------
export function atualizarPlacar(historico, questoes) {
    if (!historico) historico = {};
    if (!questoes) questoes = [];

    let totalAcertos = 0;
    let totalErros = 0;
    let qtdCadernoErros = 0;
    const materiasMap = {};

    const questoesPorId = new Map();
    questoes.forEach(q => {
        const idStr = String(q.id);
        questoesPorId.set(idStr, q);
        const mat = q.materia || "Geral";
        if (!materiasMap[mat]) {
            materiasMap[mat] = { respondidas: 0, acertos: 0, erros: 0, total: 0 };
        }
        materiasMap[mat].total++;
    });

    // Contabiliza todo o histórico (mesmo se alguma questão for de outra lista)
    Object.entries(historico).forEach(([idKey, h]) => {
        if (!h || typeof h !== 'object') return;
        const ac = Number(h.acertos || 0);
        const er = Number(h.erros || 0);
        const tent = Number(h.tentativas || 0);

        const qAssociada = questoesPorId.get(String(idKey));
        const mat = qAssociada ? (qAssociada.materia || "Geral") : (h.materia || "Geral");

        if (tent > 0 || ac > 0 || er > 0 || h.ultimaResposta) {
            totalAcertos += ac;
            totalErros += er;

            if (!materiasMap[mat]) {
                materiasMap[mat] = { respondidas: 0, acertos: 0, erros: 0, total: 1 };
            }
            materiasMap[mat].respondidas++;
            materiasMap[mat].acertos += ac;
            materiasMap[mat].erros += er;
        }

        const ehErroAtivo = h.status === 'erro' || (h.ultimaResposta === 'errado' && h.status !== 'superado');
        const temAnotacao = h.anotacao && String(h.anotacao).trim().length > 0;

        if ((ehErroAtivo || temAnotacao) && qAssociada) {
            qtdCadernoErros++;
        }
    });

    const elAcertos = document.getElementById("stat-acertos");
    const elErros = document.getElementById("stat-erros");
    const elContadorRevisao = document.getElementById("contador-revisao");

    if (elAcertos) elAcertos.innerText = totalAcertos;
    if (elErros) elErros.innerText = totalErros;

    // Placar rápido do topo (celular)
    const elMiniAcertos = document.getElementById("mini-acertos");
    const elMiniErros = document.getElementById("mini-erros");
    if (elMiniAcertos) elMiniAcertos.textContent = totalAcertos;
    if (elMiniErros) elMiniErros.textContent = totalErros;
    if (elContadorRevisao) elContadorRevisao.innerText = qtdCadernoErros;

    // --- Os 3 números: sequência, cobertura e matérias a reforçar ---
    const sequencia = calcularSequencia(carregarDiasDeEstudo());
    const cobertura = calcularCobertura(questoes, historico);
    const criticas = Object.keys(materiasMap).filter(mat => ehMateriaCritica(materiasMap[mat]));

    definirTexto("stat-sequencia", sequencia.atual);
    definirTexto("stat-sequencia-detalhe",
        sequencia.atual > 0 && !sequencia.estudouHoje ? "responda hoje!" : `recorde ${sequencia.recorde}`);
    definirTexto("mini-sequencia", sequencia.atual);
    const miniSeq = document.getElementById("mini-sequencia");
    if (miniSeq) miniSeq.classList.toggle("apagada", !sequencia.estudouHoje);

    definirTexto("stat-cobertura", cobertura.total ? `${cobertura.percentual}%` : "—");
    definirTexto("stat-cobertura-detalhe", `${cobertura.feitas} de ${cobertura.total} feitas`);

    definirTexto("stat-criticas", criticas.length);
    definirTexto("stat-criticas-detalhe", criticas.length ? "abaixo de 60%" : "nenhuma");
    const cardCriticas = document.getElementById("card-criticas");
    if (cardCriticas) cardCriticas.classList.toggle("alerta", criticas.length > 0);

    renderizarDesempenhoMaterias(materiasMap);
}

function definirTexto(id, valor) {
    const el = document.getElementById(id);
    if (el) el.textContent = valor;
}

function ehMateriaCritica(dados) {
    const respostas = dados.acertos + dados.erros;
    return respostas >= MIN_RESPOSTAS_CRITICO && (dados.acertos / respostas) * 100 < LIMITE_CRITICO;
}

// Dias seguidos com pelo menos 1 questão respondida.
// Se hoje ainda não teve resposta, a sequência de ontem continua valendo (até o fim do dia).
export function calcularSequencia(dias, agora = new Date()) {
    const resultado = { atual: 0, recorde: 0, estudouHoje: dias.has(diaLocal(agora)) };
    if (dias.size === 0) return resultado;

    // Recorde: maior corrida de dias consecutivos na lista inteira
    const emDias = (txt) => { const [a, m, d] = txt.split('-').map(Number); return Date.UTC(a, m - 1, d) / 86400000; };
    const ordenados = [...dias].map(emDias).sort((a, b) => a - b);
    let corrida = 1;
    resultado.recorde = 1;
    for (let i = 1; i < ordenados.length; i++) {
        corrida = (ordenados[i] - ordenados[i - 1] === 1) ? corrida + 1 : 1;
        if (corrida > resultado.recorde) resultado.recorde = corrida;
    }

    // Atual: conta para trás a partir de hoje (ou de ontem)
    const cursor = new Date(agora);
    if (!resultado.estudouHoje) cursor.setDate(cursor.getDate() - 1);
    while (dias.has(diaLocal(cursor))) {
        resultado.atual++;
        cursor.setDate(cursor.getDate() - 1);
    }
    return resultado;
}

// % das questões do banco já respondidas pelo menos uma vez.
// (As tags atuais são livres demais para medir "assuntos": 376 tags para 194 questões,
// com marcadores como "pegadinha". Quando o banco tiver um campo de assunto padronizado,
// esta conta passa a ser a cobertura do edital.)
export function calcularCobertura(questoes, historico) {
    const total = questoes.length;
    const feitas = questoes.filter(q => {
        const h = historico[String(q.id)];
        return Boolean(h && (Number(h.tentativas) > 0 || Number(h.acertos) > 0 || Number(h.erros) > 0));
    }).length;
    return { total, feitas, percentual: total ? Math.round((feitas / total) * 100) : 0 };
}

function renderizarDesempenhoMaterias(materiasMap) {
    const containerMaterias = document.getElementById("dashboard-materias");
    if (!containerMaterias) return;

    const materiasComAtividade = Object.keys(materiasMap).filter(mat => materiasMap[mat].respondidas > 0);

    if (materiasComAtividade.length === 0) {
        containerMaterias.innerHTML = '<p class="aviso-vazio" style="color: #64748b; font-size: 0.8rem; margin-top: 1.2rem; text-align: center;">Responda questões para visualizar seu desempenho por matéria.</p>';
        return;
    }

    // Matérias a reforçar primeiro; dentro de cada grupo, ordem alfabética
    materiasComAtividade.sort((a, b) =>
        (ehMateriaCritica(materiasMap[b]) - ehMateriaCritica(materiasMap[a])) || a.localeCompare(b, 'pt-BR'));

    let html = '<div class="painel-desempenho-materias">';
    materiasComAtividade.forEach(mat => {
        const dados = materiasMap[mat];
        const somaResp = dados.acertos + dados.erros;
        const taxa = somaResp > 0
            ? ((dados.acertos / somaResp) * 100).toFixed(0)
            : 0;
        const critica = ehMateriaCritica(dados);

        // Botão: tocar na matéria filtra as questões dela
        html += `
            <button type="button" class="materia-stat-item${critica ? ' critica' : ''}" data-materia="${esc(mat)}" title="Ver questões de ${esc(mat)}">
                <span class="materia-stat-header">
                    <span class="materia-nome">${critica ? '⚠️' : '📖'} ${esc(mat)}</span>
                    <span class="materia-taxa">${taxa}% (${dados.acertos}/${somaResp})</span>
                </span>
                <span class="barra-progresso-bg">
                    <span class="barra-progresso-fill" style="width: ${taxa}%;"></span>
                </span>
                ${critica ? '<span class="materia-reforcar">Reforçar · toque para treinar</span>' : ''}
            </button>
        `;
    });
    html += '</div>';
    containerMaterias.innerHTML = html;
}

// ---------- 5. RENDERIZAÇÃO DE QUESTÕES ----------
// opcoes.restaurarRespostas: no modo estudo, questão já respondida volta com a resposta marcada.
// No simulado e na revisão vem em branco: lá a questão precisa ser respondida de novo
// (antes o simulado mostrava o gabarito em verde/vermelho nas questões já feitas).
export function renderizarQuestoes(container, lista, historico = {}, mensagemVazia = "Nenhuma questão encontrada.", opcoes = {}) {
    const { restaurarRespostas = true } = opcoes;
    if (!container) return;
    container.innerHTML = "";

    if (!lista || lista.length === 0) {
        container.innerHTML = `<p class="aviso-vazio">${esc(mensagemVazia)}</p>`;
        return;
    }

    lista.forEach(q => {
        const idStr = String(q.id);
        const opcoes = obterOpcoes(q);
               const regHist = historico[idStr] || historico[q.id] || {};
        const tentativas = regHist.tentativas || 0;
        const anotacao = regHist.anotacao || "";
        const favorito = regHist.favorito || false;
        const status = classificarStatus(idStr, historico);
        const textoEnunciado = q.enunciado || q.pergunta || q.texto || "Enunciado não disponível.";

        const htmlAlternativas = opcoes.map(({ letra, texto }) => `
            <label class="opcao-item" data-letra="${esc(letra)}">
                <input type="radio" name="questao_${esc(idStr)}" value="${esc(letra)}" class="radio-opcao">
                <span class="letra-badge">${esc(letra)}</span>
                <span class="opcao-texto">${esc(texto)}</span>
            </label>
        `).join('');

        const htmlTags = (q.tags || []).map(t => `<span class="tag-item" data-tag="${esc(t)}">#${esc(t)}</span>`).join('');

        const infoExtra = [
            q.banca ? esc(q.banca) : '',
            q.ano ? esc(q.ano) : '',
            q.orgao ? esc(q.orgao) : ''
        ].filter(Boolean).join(' • ');

        const cardHTML = `
            <article class="card-questao questao-card" data-id="${esc(idStr)}">
               <div class="card-header">
                    <div class="header-info">
                        <span class="badge-materia">${esc(q.materia || 'Geral')}</span>
                        <span class="badge-info">${infoExtra}</span>
                    </div>
                    <div class="header-acoes">
                        <button type="button" class="btn-favoritar ${favorito ? 'ativo' : ''}" data-id="${esc(idStr)}" title="${favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">${favorito ? '★' : '☆'}</button>
                        <span class="badge ${status.classe}">${status.texto}</span>
                    </div>
                </div>

                <p class="enunciado">${esc(textoEnunciado)}</p>

                <div class="opcoes-container">
                    ${htmlAlternativas}
                </div>

                ${htmlTags ? `<div class="tags-container">${htmlTags}</div>` : ''}

                <div class="card-footer">
                    <div class="card-actions-row">
                        <button type="button" class="btn-primary btn-responder" data-id="${esc(idStr)}">✔ Responder</button>
                        <button type="button" class="btn-sidebar btn-refazer" data-id="${esc(idStr)}" hidden style="margin-left: 8px;">🔄 Resolver Novamente</button>
                        <small class="tentativas">Tentativas: ${tentativas}</small>
                    </div>

                    <div class="feedback-container oculta" id="feedback_${esc(idStr)}">
                        <div class="gabarito-resposta"></div>
                        <div class="explicacao-texto"></div>
                    </div>

                    <div class="area-anotacao">
                        <button type="button" class="btn-anotacao-toggle">
                            📝 <span>${anotacao ? 'Editar Anotação Pessoal' : 'Adicionar Anotação Pessoal'}</span>
                        </button>
                        <div class="box-anotacao" ${anotacao ? '' : 'hidden'}>
                            <textarea class="input-anotacao" placeholder="Anote a pegadinha da banca, o motivo do erro ou a regra teórica...">${esc(anotacao)}</textarea>
                            <div class="acoes-anotacao">
                                <button type="button" class="btn-sidebar btn-salvar-anotacao">💾 Salvar Anotação</button>
                            </div>
                        </div>
                    </div>
                </div>
            </article>
        `;

        container.insertAdjacentHTML('beforeend', cardHTML);

        // Se a questão já foi respondida antes (ex: após dar F5), restaura o estado visual na tela!
        if (restaurarRespostas && tentativas > 0 && (regHist.ultimaEscolha || regHist.ultimaResposta)) {
            const cardInserido = container.lastElementChild;
            if (cardInserido) {
                const gabaritoLetra = gabaritoDe(q);
                const letraParaRestaurar = regHist.ultimaEscolha || (regHist.ultimaResposta === 'certo' ? gabaritoLetra : '');
                if (letraParaRestaurar) {
                    const radio = cardInserido.querySelector(`.radio-opcao[value="${CSS.escape(letraParaRestaurar)}"]`);
                    if (radio) radio.checked = true;
                    cardInserido.dataset.respondida = "1";
                    revelar(cardInserido, q, letraParaRestaurar);
                }
            }
        }
    });
}

// ---------- 6. REVELAÇÃO DO GABARITO E FEEDBACK VISUAL ----------
export function revelar(card, q, letraEscolhida) {
    if (!card || !q) return;

    const gabaritoLetra = gabaritoDe(q);
    const textoCorreto = textoGabaritoDe(q);
    const acertou = (letraEscolhida === gabaritoLetra);

    // 1. Destaca as opções visualmente (Verde/Vermelho)
    card.querySelectorAll(".opcao-item").forEach(label => {
        const opLetra = label.dataset.letra;
        const radio = label.querySelector(".radio-opcao");
        if (radio) radio.disabled = true;

        label.classList.remove("selecionada", "correta", "incorreta");
        label.classList.add("desabilitada");

        if (opLetra === gabaritoLetra) {
            label.classList.add("correta");
        } else if (opLetra === letraEscolhida && !acertou) {
            label.classList.add("incorreta");
        }
    });

    // 2. Desabilita o botão Responder e exibe o botão Resolver Novamente
    const btnResponder = card.querySelector(".btn-responder");
    if (btnResponder) {
        btnResponder.disabled = true;
        btnResponder.innerText = acertou ? "✔ Respondida (Acerto)" : "✖ Respondida (Erro)";
    }

    const btnRefazer = card.querySelector(".btn-refazer");
    if (btnRefazer) {
        btnRefazer.hidden = false;
    }

    // 3. Exibe o container de feedback de forma garantida
    const fbContainer = card.querySelector(".feedback-container");
    if (!fbContainer) return;

    fbContainer.classList.remove("oculta", "correto", "incorreto", "neutro");
    fbContainer.classList.add(acertou ? "correto" : "incorreto");
    fbContainer.style.display = "block";

    const gabaritoDiv = fbContainer.querySelector(".gabarito-resposta");
    const explicacaoDiv = fbContainer.querySelector(".explicacao-texto");

    if (gabaritoDiv) {
        if (letraEscolhida === null || letraEscolhida === undefined || letraEscolhida === "") {
            gabaritoDiv.innerHTML = `⚠️ <strong>Questão em branco.</strong> Gabarito oficial: <strong>${esc(textoCorreto)}</strong>`;
        } else if (acertou) {
            gabaritoDiv.innerHTML = `✔ <strong>Resposta Correta!</strong> Gabarito oficial: <strong>${esc(textoCorreto)}</strong>`;
        } else {
            gabaritoDiv.innerHTML = `✖ <strong>Resposta Incorreta.</strong> Você marcou <strong>(${esc(letraEscolhida)})</strong>. O gabarito oficial é: <strong>${esc(textoCorreto)}</strong>`;
        }
        // Injeta o botão de IA apenas quando o utilizador erra a questão
    if (!acertou && letraEscolhida && gabaritoDiv) {
                gabaritoDiv.innerHTML += `
            <div class="ia-acoes">
                <button type="button" class="btn-ia-explicar" data-id="${esc(q.id)}">
                    ✨ Entender meu erro com IA
                </button>
            </div>
            <div class="ia-resposta-container"></div>
        `;
    }
    }

    if (explicacaoDiv) {
        const textoExplicacao = q.explicacao || q.comentario || q.justificativa || "";
        if (String(textoExplicacao).trim() !== "") {
            // Escapa o comentário: o texto vem do banco e NUNCA pode virar HTML/código na tela
            const textoSeguro = esc(String(textoExplicacao)).replace(/\n/g, "<br>");
            explicacaoDiv.innerHTML = `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(148, 163, 184, 0.25);"><strong>📘 Comentário:</strong> ${textoSeguro}</div>`;
            explicacaoDiv.style.display = "block";
        } else {
            explicacaoDiv.innerHTML = `<div style="margin-top: 6px; font-size: 0.85em; opacity: 0.85;">💡 <em>Use "Adicionar Anotação Pessoal" abaixo para registrar seu resumo sobre esta questão.</em></div>`;
            explicacaoDiv.style.display = "block";
        }
    }
}