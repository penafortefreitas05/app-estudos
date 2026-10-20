// ============================================================
// js/ui.js - Renderização e Manipulação da Interface (FocoPro)
// ============================================================

// ---------- UTILITÁRIOS DE TEXTO E SEGURANÇA ----------
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

// ---------- EXTRATORES DE LETRA E GABARITO (SEM REGEX FRÁGIL) ----------
export function letraDe(alt) {
    if (!alt) return "";
    const str = String(alt).trim();
    const lower = str.toLowerCase();

    if (lower === "certo" || lower === "correto") return "CERTO";
    if (lower === "errado" || lower === "incorreto") return "ERRADO";

    const primeiraLetra = str.charAt(0).toUpperCase();
    if (primeiraLetra >= "A" && primeiraLetra <= "Z") {
        return primeiraLetra;
    }

    return str.toUpperCase();
}

export function gabaritoDe(q) {
    if (!q || !q.gabarito) return "";
    const g = String(q.gabarito).trim();
    const lower = g.toLowerCase();

    if (lower === "certo" || lower === "correto") return "CERTO";
    if (lower === "errado" || lower === "incorreto") return "ERRADO";

    const eCertoErrado = q.alternativas && q.alternativas.some(alt => {
        const l = String(alt).trim().toLowerCase();
        return l === "certo" || l === "errado";
    });

    if (eCertoErrado) {
        if (lower === "c") return "CERTO";
        if (lower === "e") return "ERRADO";
    }

    const primeiraLetra = g.charAt(0).toUpperCase();
    if (primeiraLetra >= "A" && primeiraLetra <= "Z") {
        return primeiraLetra;
    }

    return g.toUpperCase();
}

// ---------- COMPONENTES DE INTERFACE ----------
export function preencherSelect(selectElement, textoPadrao, propriedade, listaQuestoes) {
    if (!selectElement) return;
    const valoresUnicos = [...new Set(listaQuestoes.map(q => q[propriedade]).filter(Boolean))].sort();
    
    selectElement.innerHTML = '<option value="">' + esc(textoPadrao) + '</option>';
    valoresUnicos.forEach(valor => {
        const opt = document.createElement("option");
        opt.value = valor;
        opt.textContent = valor;
        selectElement.appendChild(opt);
    });
}

export function atualizarChipTag(chipTagElement, tag) {
    if (!chipTagElement) return;
    if (!tag) {
        chipTagElement.hidden = true;
        chipTagElement.innerHTML = "";
        return;
    }
    chipTagElement.hidden = false;
    chipTagElement.innerHTML = 'Filtro por tag: <strong>#' + esc(tag) + '</strong> <button type="button" id="btn-limpar-tag" class="btn-limpar-tag">✖ Remover</button>';
}

export function classificarStatus(qId, historico) {
    const h = historico[qId];
    if (!h || !h.tentativas) return { texto: "Não Respondida", classe: "badge-neutro" };

    if (h.status === 'superado') return { texto: "Superada ⚡", classe: "badge-sucesso" };

    const recentes = Array.isArray(h.recentes) ? h.recentes : [];
    const ultimosCinco = recentes.slice(-5);
    const taxaRecente = ultimosCinco.length > 0
        ? (ultimosCinco.reduce((acc, v) => acc + v, 0) / ultimosCinco.length) * 100
        : 0;

    if (h.tentativas >= 3 && taxaRecente >= 80) return { texto: "Dominada 🎯", classe: "badge-sucesso" };
    if (taxaRecente <= 40 || h.status === 'erro' || h.ultimaResposta === 'errado') return { texto: "Alerta ⚠️", classe: "badge-perigo" };
    return { texto: "Em Aprendizado 📘", classe: "badge-alerta" };
}

// ---------- ATUALIZAÇÃO DO PLACAR E DASHBOARD ----------
export function atualizarPlacar(historico, questoes) {
    if (!historico) historico = {};
    if (!questoes) questoes = [];

    let totalAcertos = 0;
    let totalErros = 0;
    let qtdCadernoErros = 0;
    const materiasMap = {};

    const histMap = new Map();
    Object.entries(historico).forEach(([k, v]) => {
        histMap.set(String(k), v);
    });

    questoes.forEach(q => {
        const idStr = String(q.id);
        const h = histMap.get(idStr);
        const mat = q.materia || "Geral";

        if (!materiasMap[mat]) {
            materiasMap[mat] = { respondidas: 0, acertos: 0, erros: 0, total: 0 };
        }
        materiasMap[mat].total++;

        if (h) {
            const ac = Number(h.acertos || 0);
            const er = Number(h.erros || 0);
            const tent = Number(h.tentativas || 0);

            if (tent > 0 || ac > 0 || er > 0 || h.ultimaResposta) {
                totalAcertos += ac;
                totalErros += er;

                materiasMap[mat].respondidas++;
                materiasMap[mat].acertos += ac;
                materiasMap[mat].erros += er;
            }

            // Regra do Caderno de Erros Ativos:
            // Permanece na revisão se estiver marcado como 'erro' OU se o último resultado foi 'errado' E não foi 'superado'.
            const ehErroAtivo = h.status === 'erro' || (h.ultimaResposta === 'errado' && h.status !== 'superado');
            const temAnotacao = h.anotacao && String(h.anotacao).trim().length > 0;

            if (ehErroAtivo || temAnotacao) {
                qtdCadernoErros++;
            }
        }
    });

    const elAcertos = document.getElementById("stat-acertos");
    const elErros = document.getElementById("stat-erros");
    const elContadorRevisao = document.getElementById("contador-revisao");

    if (elAcertos) elAcertos.innerText = totalAcertos;
    if (elErros) elErros.innerText = totalErros;
    if (elContadorRevisao) elContadorRevisao.innerText = qtdCadernoErros;

    renderizarDesempenhoMaterias(materiasMap);
}

function renderizarDesempenhoMaterias(materiasMap) {
    const containerMaterias = document.getElementById("dashboard-materias");
    if (!containerMaterias) return;

    const materiasComAtividade = Object.keys(materiasMap).filter(mat => materiasMap[mat].respondidas > 0);

    if (materiasComAtividade.length === 0) {
        containerMaterias.innerHTML = '<p class="aviso-vazio" style="color: #64748b; font-size: 0.8rem; margin-top: 1.2rem; text-align: center;">Sem dados de desempenho acumulados.</p>';
        return;
    }

    let html = '<div class="painel-desempenho-materias">';
    materiasComAtividade.sort().forEach(mat => {
        const dados = materiasMap[mat];
        const somaResp = dados.acertos + dados.erros;
        const taxa = somaResp > 0 
            ? ((dados.acertos / somaResp) * 100).toFixed(0) 
            : 0;
        
        html += '<div class="materia-stat-item">' +
                    '<div class="materia-stat-header">' +
                        '<span class="materia-nome">📖 ' + esc(mat) + '</span>' +
                        '<span class="materia-taxa">' + taxa + '% (' + dados.acertos + '/' + dados.respondidas + ')</span>' +
                    '</div>' +
                    '<div class="barra-progresso-bg">' +
                        '<div class="barra-progresso-fill" style="width: ' + taxa + '%;"></div>' +
                    '</div>' +
                '</div>';
    });
    html += '</div>';
    containerMaterias.innerHTML = html;
}

// ---------- RENDERIZAÇÃO DE QUESTÕES ----------
export function renderizarQuestoes(container, lista, historico, mensagemVazia = "Nenhuma questão encontrada.") {
    container.innerHTML = "";
    if (lista.length === 0) {
        container.innerHTML = '<p class="aviso-vazio">' + esc(mensagemVazia) + '</p>';
        return;
    }

    lista.forEach(q => {
        const status = classificarStatus(q.id, historico);
        const h = historico[q.id] || {};
        const tentativas = h.tentativas || 0;
        const anotacao = h.anotacao || "";

        const botoes = q.alternativas.map(alt => {
            const letra = letraDe(alt);
            return '<button type="button" class="btn-opcao" data-letra="' + esc(letra) + '">' + esc(alt) + '</button>';
        }).join("");

        const tags = (q.tags && q.tags.length)
            ? '<div class="container-tags">' + q.tags.map(t => '<span class="tag-item" data-tag="' + esc(t) + '">' + esc(t) + '</span>').join("") + '</div>'
            : "";

        const card = document.createElement("div");
        card.className = "questao-card";
        card.dataset.id = q.id;
        card.innerHTML = 
            '<div class="questao-header">' +
                '<span><strong>Banca:</strong> ' + esc(q.banca) + ' | <strong>Matéria:</strong> ' + esc(q.materia) + '</span>' +
                '<span class="badge ' + status.classe + '">' + status.texto + '</span>' +
            '</div>' +
            tags +
            '<p class="enunciado">' + esc(q.enunciado) + '</p>' +
            '<div class="opcoes-resposta">' + botoes + '</div>' +
            '<small class="tentativas">Tentativas: ' + tentativas + '</small>' +
            '<div class="feedback-area"></div>' +
            '<div class="area-anotacao">' +
                '<button type="button" class="btn-anotacao-toggle">' +
                    '📝 <span>' + (anotacao ? 'Editar Anotação Pessoal' : 'Adicionar Anotação Pessoal') + '</span>' +
                '</button>' +
                '<div class="box-anotacao"' + (anotacao ? '' : ' hidden') + '>' +
                    '<textarea class="input-anotacao" placeholder="Escreva aqui seu resumo, motivo do erro ou regra teórica...">' + esc(anotacao) + '</textarea>' +
                    '<div class="acoes-anotacao">' +
                        '<button type="button" class="btn-sidebar btn-salvar-anotacao">💾 Salvar Anotação</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        container.appendChild(card);
    });
}

export function revelar(card, q, letraEscolhida) {
    const gabaritoLetra = gabaritoDe(q);
    const acertou = (letraEscolhida === gabaritoLetra);
    const fb = card.querySelector(".feedback-area");

    const altCorretaObj = (q.alternativas || []).find(alt => letraDe(alt) === gabaritoLetra);
    const textoCorreto = altCorretaObj ? altCorretaObj : q.gabarito;

    if (acertou) {
        fb.className = "feedback-area feedback correto";
        fb.innerHTML = '✔ <strong>Resposta Correta!</strong>' + (q.explicacao ? '<br><small>' + esc(q.explicacao) + '</small>' : '');
    } else {
        fb.className = "feedback-area feedback incorreto";
        fb.innerHTML = '✖ <strong>Resposta Incorreta.</strong> O gabarito é: <strong>' + esc(textoCorreto) + '</strong>' + (q.explicacao ? '<br><small>' + esc(q.explicacao) + '</small>' : '');
    }

    card.querySelectorAll(".btn-opcao").forEach(btn => {
        const btnLetra = letraDe(btn.dataset.letra || btn.innerText);
        if (btnLetra === gabaritoLetra) {
            btn.classList.add("correta");
        } else if (btnLetra === letraEscolhida && !acertou) {
            btn.classList.add("incorreta");
        }
        btn.disabled = true;
    });
}