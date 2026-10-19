// ============================================================
// js/ui.js - Interface do Usuário e Renderização do DOM
// ============================================================

export function esc(texto) {
    return String(texto).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

export function letraDe(alternativa) {
    return String(alternativa).trim().charAt(0).toUpperCase();
}

export function gabaritoDe(q) {
    return String(q.gabarito).trim().toUpperCase();
}

export function formatarTempo(ms) {
    const total = Math.round(ms / 1000);
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function classificarStatus(id, historico) {
    const dados = historico[id];
    if (!dados || !dados.tentativas) return { classe: 'nova', texto: 'Nova' };

    const rec = Array.isArray(dados.recentes) ? dados.recentes : null;
    const n = rec && rec.length ? rec.length : dados.tentativas;
    const taxa = (rec && rec.length ? rec.reduce((s, x) => s + x, 0) / rec.length : dados.acertos / dados.tentativas) * 100;

    if (taxa >= 80 && n >= 3) return { classe: 'dominada', texto: `Dominada (${Math.round(taxa)}%)` };
    if (taxa <= 50 && n >= 2) return { classe: 'alerta', texto: `Alerta: Erro (${Math.round(taxa)}%)` };
    return { classe: 'aprendizado', texto: `Em Aprendizado (${Math.round(taxa)}%)` };
}

export function preencherSelect(select, rotuloPadrao, campo, questoes) {
    const contagem = {};
    questoes.forEach(q => { contagem[q[campo]] = (contagem[q[campo]] || 0) + 1; });

    select.innerHTML = "";
    select.add(new Option(rotuloPadrao, ""));
    Object.keys(contagem)
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .forEach(valor => select.add(new Option(`${valor} (${contagem[valor]})`, valor)));
}

export function atualizarChipTag(chipTag, tagSelecionada) {
    if (!tagSelecionada) {
        chipTag.hidden = true;
        chipTag.innerHTML = "";
        return;
    }
    chipTag.hidden = false;
    chipTag.innerHTML = `<span>Filtrando pela tag: <strong>${esc(tagSelecionada)}</strong></span>
        <button type="button" id="btn-limpar-tag" aria-label="Remover filtro de tag">✕</button>`;
}

export function atualizarDashboardMacro(questoes, historico) {
    const painel = document.getElementById("dashboard-materias");
    if (!painel) return;
    const stats = {};

    questoes.forEach(q => {
        stats[q.materia] = stats[q.materia] || { acertos: 0, tentativas: 0 };
        const h = historico[q.id];
        if (h) {
            stats[q.materia].acertos += h.acertos || 0;
            stats[q.materia].tentativas += h.tentativas || 0;
        }
    });

    let html = "<h4>Desempenho por Matéria</h4>";
    let temDados = false;

    Object.keys(stats).sort((a, b) => a.localeCompare(b, 'pt-BR')).forEach(materia => {
        const { acertos, tentativas } = stats[materia];
        if (tentativas === 0) return;
        temDados = true;
        const taxa = (acertos / tentativas) * 100;
        const cor = taxa >= 80 ? 'excelente' : taxa >= 60 ? 'atencao' : 'critico';

        html += `
            <div class="materia-stat">
                <div class="materia-header"><span>${esc(materia)}</span><span>${Math.round(taxa)}%</span></div>
                <div class="barra-fundo"><div class="barra-progresso ${cor}" style="width: ${taxa}%"></div></div>
            </div>`;
    });

    if (!temDados) {
        html += "<p class='aviso-vazio'>Responda questões para ver seu gráfico.</p>";
    }
    painel.innerHTML = html;
}

export function atualizarPlacar(historico, questoes) {
    let acertos = 0, erros = 0, revisar = 0;
    for (const id in historico) {
        acertos += historico[id].acertos || 0;
        erros += historico[id].erros || 0;
        if (historico[id].ultimaResposta === 'errado') revisar++;
    }
    document.getElementById("stat-acertos").innerText = acertos;
    document.getElementById("stat-erros").innerText = erros;
    document.getElementById("contador-revisao").innerText = revisar;
    atualizarDashboardMacro(questoes, historico);
}

export function renderizarQuestoes(container, lista, historico, mensagemVazia = "Nenhuma questão encontrada para este filtro.") {
    container.innerHTML = "";
    if (lista.length === 0) {
        container.innerHTML = `<p class="aviso-vazio">${esc(mensagemVazia)}</p>`;
        return;
    }

    lista.forEach(q => {
        const status = classificarStatus(q.id, historico);
        const tentativas = (historico[q.id] && historico[q.id].tentativas) || 0;

        const botoes = q.alternativas.map(alt =>
            `<button type="button" class="btn-opcao" data-letra="${esc(letraDe(alt))}">${esc(alt)}</button>`
        ).join("");

        const tags = (q.tags && q.tags.length)
            ? `<div class="container-tags">${q.tags.map(t => `<span class="tag-item" data-tag="${esc(t)}">${esc(t)}</span>`).join("")}</div>`
            : "";

        const card = document.createElement("div");
        card.className = "questao-card";
        card.dataset.id = q.id;
        card.innerHTML = `
            <div class="questao-header">
                <span><strong>Banca:</strong> ${esc(q.banca)} | <strong>Matéria:</strong> ${esc(q.materia)}</span>
                <span class="badge ${status.classe}">${status.texto}</span>
            </div>
            ${tags}
            <p>${esc(q.enunciado)}</p>
            <div class="opcoes-resposta">${botoes}</div>
            <small class="tentativas">Tentativas: ${tentativas}</small>
            <div class="feedback-area"></div>
        `;
        container.appendChild(card);
    });
}

export function revelar(card, q, escolhida) {
    const gab = gabaritoDe(q);
    card.querySelectorAll(".btn-opcao").forEach(btn => {
        btn.disabled = true;
        if (btn.dataset.letra !== escolhida) {
            btn.classList.remove("selecionada");
        }
        if (btn.dataset.letra === gab) {
            btn.classList.add("correta");
        } else if (btn.dataset.letra === escolhida) {
            btn.classList.add("errada");
        }
    });

    const fb = card.querySelector(".feedback-area");
    let html;
    if (escolhida === null) {
        fb.className = "feedback-area feedback errado";
        html = `⚠ Em branco. O gabarito é: ${esc(gab)}`;
    } else if (escolhida === gab) {
        fb.className = "feedback-area feedback certo";
        html = "✔ Resposta Correta!";
    } else {
        fb.className = "feedback-area feedback errado";
        html = `✖ Resposta Incorreta. O gabarito é: ${esc(gab)}`;
    }
    
    if (q.explicacao) html += `<div class="explicacao">${q.explicacao}</div>`;
    fb.innerHTML = html;
}