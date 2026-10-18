let historico = JSON.parse(localStorage.getItem('appEstudos_Historico')) || {};

const container = document.getElementById("container-questoes");
const selectBanca = document.getElementById("filtro-banca");
const selectMateria = document.getElementById("filtro-materia"); // NOVO

// NOVO: Preenche o filtro de matérias automaticamente baseado no banco de questões
function carregarFiltroMaterias() {
    // Pega o nome de todas as matérias sem repetir
    const materiasUnicas = [...new Set(questoes.map(q => q.materia))];
    
    materiasUnicas.forEach(materia => {
        const option = document.createElement("option");
        option.value = materia;
        option.innerText = materia;
        selectMateria.appendChild(option);
    });
}

function classificarStatus(id) {
    const dados = historico[id];
    if (!dados || dados.tentativas === 0) return { classe: '', texto: 'Nova' };

    const taxaAcerto = (dados.acertos / dados.tentativas) * 100;

    if (taxaAcerto >= 80 && dados.tentativas >= 3) {
        return { classe: 'dominada', texto: `Dominada (${Math.round(taxaAcerto)}%)` };
    } else if (taxaAcerto <= 50 && dados.tentativas >= 2) {
        return { classe: 'alerta', texto: `Alerta: Erro (${Math.round(taxaAcerto)}%)` };
    } else {
        return { classe: 'aprendizado', texto: `Em Aprendizado (${Math.round(taxaAcerto)}%)` };
    }
}

function atualizarDashboardMacro() {
    const painelMaterias = document.getElementById("dashboard-materias");
    const statsPorMateria = {};

    questoes.forEach(q => {
        if (!statsPorMateria[q.materia]) {
            statsPorMateria[q.materia] = { acertos: 0, tentativas: 0 };
        }
        if (historico[q.id]) {
            statsPorMateria[q.materia].acertos += historico[q.id].acertos;
            statsPorMateria[q.materia].tentativas += historico[q.id].tentativas;
        }
    });

    painelMaterias.innerHTML = "<h4>Desempenho por Matéria</h4>";
    let temDados = false;

    for (let materia in statsPorMateria) {
        const dados = statsPorMateria[materia];
        if (dados.tentativas === 0) continue; 
        
        temDados = true;
        const taxa = (dados.acertos / dados.tentativas) * 100;
        
        let classeCor = 'critico';
        if (taxa >= 80) classeCor = 'excelente';
        else if (taxa >= 60) classeCor = 'atencao';

        painelMaterias.innerHTML += `
            <div class="materia-stat">
                <div class="materia-header">
                    <span>${materia}</span>
                    <span>${Math.round(taxa)}%</span>
                </div>
                <div class="barra-fundo">
                    <div class="barra-progresso ${classeCor}" style="width: ${taxa}%"></div>
                </div>
            </div>
        `;
    }

    if (!temDados) {
        painelMaterias.innerHTML += "<p style='font-size: 0.8rem; color: #64748b; text-align: center;'>Responda questões para ver seu gráfico.</p>";
    }
}

function atualizarPlacar() {
    let totalAcertos = 0;
    let totalErros = 0;
    let totalParaRevisar = 0;

    for (let id in historico) {
        totalAcertos += historico[id].acertos;
        totalErros += historico[id].erros;
        if (historico[id].ultimaResposta === 'errado') {
            totalParaRevisar++;
        }
    }

    document.getElementById("stat-acertos").innerText = totalAcertos;
    document.getElementById("stat-erros").innerText = totalErros;
    document.getElementById("contador-revisao").innerText = totalParaRevisar;
    
    atualizarDashboardMacro();
}

function renderizarQuestoes(lista) {
    container.innerHTML = "";
    if (lista.length === 0) {
        container.innerHTML = "<p>Nenhuma questão encontrada para este filtro.</p>";
        return;
    }

    lista.forEach(q => {
        const status = classificarStatus(q.id);
        const dados = historico[q.id] || { tentativas: 0, ultimaResposta: null };
        
        const div = document.createElement("div");
        div.classList.add("questao-card");

        let botoesAlternativas = q.alternativas.map(alt => {
            const letra = alt.charAt(0);
            return `<button class="btn-opcao" onclick="responder(${q.id}, '${letra}')">${alt}</button>`;
        }).join("");

        div.innerHTML = `
            <div class="questao-header">
                <span><strong>Banca:</strong> ${q.banca} | <strong>Matéria:</strong> ${q.materia}</span>
                <span class="badge ${status.classe}">${status.texto}</span>
            </div>
            <p>${q.enunciado}</p>
            <div class="opcoes-resposta">${botoesAlternativas}</div>
            <small style="color: #64748b; font-size: 0.75rem;">Tentativas: ${dados.tentativas}</small>
            <div id="feedback-${q.id}"></div>
        `;
        container.appendChild(div);
    });
}

// NOVO: Função centralizada para aplicar todos os filtros juntos
function aplicarFiltros() {
    const bancaSelecionada = selectBanca.value;
    const materiaSelecionada = selectMateria.value;

    const filtradas = questoes.filter(q => {
        const bateBanca = bancaSelecionada === "" || q.banca === bancaSelecionada;
        const bateMateria = materiaSelecionada === "" || q.materia === materiaSelecionada;
        return bateBanca && bateMateria;
    });

    renderizarQuestoes(filtradas);
}

window.responder = function(idQuestao, alternativaEscolhida) {
    const questao = questoes.find(q => q.id === idQuestao);
    const feedbackDiv = document.getElementById(`feedback-${idQuestao}`);
    
    if (!historico[idQuestao]) {
        historico[idQuestao] = { acertos: 0, erros: 0, tentativas: 0, ultimaResposta: null };
    }

    historico[idQuestao].tentativas++;

    if (alternativaEscolhida === questao.gabarito) {
        historico[idQuestao].acertos++;
        historico[idQuestao].ultimaResposta = 'certo';
        feedbackDiv.className = "feedback certo";
        feedbackDiv.innerHTML = "✔ Resposta Correta!";
    } else {
        historico[idQuestao].erros++;
        historico[idQuestao].ultimaResposta = 'errado';
        feedbackDiv.className = "feedback errado";
        feedbackDiv.innerHTML = `✖ Resposta Incorreta. O gabarito é: ${questao.gabarito}`;
    }

    localStorage.setItem('appEstudos_Historico', JSON.stringify(historico));
    atualizarPlacar();
    
    // Atualiza a tela mantendo os filtros atuais após 1.5s
    setTimeout(aplicarFiltros, 1500);
};

// Eventos de clique agora chamam a nova função aplicarFiltros
document.getElementById("btn-filtrar").addEventListener("click", aplicarFiltros);

document.getElementById("btn-todas").addEventListener("click", () => {
    selectBanca.value = "";
    selectMateria.value = "";
    aplicarFiltros();
});

document.getElementById("btn-modo-revisao").addEventListener("click", () => {
    const questoesParaRevisar = questoes.filter(q => historico[q.id] && historico[q.id].ultimaResposta === 'errado');
    renderizarQuestoes(questoesParaRevisar);
});

document.getElementById("btn-limpar-dados").addEventListener("click", () => {
    if(confirm("Tem certeza que deseja apagar todo o seu progresso?")) {
        localStorage.removeItem('appEstudos_Historico');
        historico = {};
        atualizarPlacar();
        aplicarFiltros();
    }
});

// Carga inicial
carregarFiltroMaterias();
atualizarPlacar();
aplicarFiltros();