// Carrega o histórico salvo no navegador
let historico = JSON.parse(localStorage.getItem('appEstudos_Historico')) || {};

const container = document.getElementById("container-questoes");
const selectBanca = document.getElementById("filtro-banca");
const selectMateria = document.getElementById("filtro-materia");
const inputBusca = document.getElementById("filtro-busca"); 
let tagSelecionada = ""; 

// NOVO: Variável global do relógio
let intervaloCronometro; 

function carregarFiltroMaterias() {
    // Limpa o select mantendo a opção padrão inicial
    selectMateria.innerHTML = '<option value="">📖 Todas as Matérias</option>';
    
    // Faz a contagem de questões por matéria
    const contagem = {};
    questoes.forEach(q => {
        contagem[q.materia] = (contagem[q.materia] || 0) + 1;
    });

    // Ordena as matérias em ordem alfabética e adiciona ao menu
    const materiasUnicas = Object.keys(contagem).sort();
    materiasUnicas.forEach(materia => {
        const option = document.createElement("option");
        option.value = materia; // O valor invisível mantém o nome exato para o filtro não quebrar
        option.innerText = `${materia} (${contagem[materia]})`; // O texto visível exibe a quantidade
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

        let htmlTags = "";
        if (q.tags && q.tags.length > 0) {
            htmlTags = `<div class="container-tags">` +
                q.tags.map(tag => `<span class="tag-item" style="cursor: pointer;" onclick="filtrarPorTag('${tag}')">${tag}</span>`).join("") +
            `</div>`;
        }

        div.innerHTML = `
            <div class="questao-header">
                <span><strong>Banca:</strong> ${q.banca} | <strong>Matéria:</strong> ${q.materia}</span>
                <span class="badge ${status.classe}">${status.texto}</span>
            </div>
            ${htmlTags}
            <p>${q.enunciado}</p>
            <div class="opcoes-resposta">${botoesAlternativas}</div>
            <small style="color: #64748b; font-size: 0.75rem;">Tentativas: ${dados.tentativas}</small>
            <div id="feedback-${q.id}"></div>
        `;
        container.appendChild(div);
    });
}

function aplicarFiltros() {
    pararCronometro(); // Desliga o relógio se mudar os filtros manualmente
    
    const bancaSelecionada = selectBanca.value;
    const materiaSelecionada = selectMateria.value;
    const termoBusca = inputBusca.value.toLowerCase(); 

    const filtradas = questoes.filter(q => {
        const bateBanca = bancaSelecionada === "" || q.banca === bancaSelecionada;
        const bateMateria = materiaSelecionada === "" || q.materia === materiaSelecionada;
        const bateTag = tagSelecionada === "" || (q.tags && q.tags.includes(tagSelecionada));
        const bateBusca = termoBusca === "" || q.enunciado.toLowerCase().includes(termoBusca) || q.alternativas.join(" ").toLowerCase().includes(termoBusca);
        
        return bateBanca && bateMateria && bateTag && bateBusca;
    });

    renderizarQuestoes(filtradas);
}

function embaralharArray(array) {
    let arrayEmbaralhado = [...array]; 
    for (let i = arrayEmbaralhado.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arrayEmbaralhado[i], arrayEmbaralhado[j]] = [arrayEmbaralhado[j], arrayEmbaralhado[i]];
    }
    return arrayEmbaralhado;
}

// NOVO: Funções do Cronômetro
function iniciarCronometro(minutos) {
    clearInterval(intervaloCronometro);
    const display = document.getElementById("display-cronometro");
    const spanTempo = document.getElementById("tempo-restante");
    display.style.display = "block";
    spanTempo.style.color = "#ea580c"; // Reseta a cor para laranja

    let tempoEmSegundos = minutos * 60;

    function atualizarTela() {
        const min = Math.floor(tempoEmSegundos / 60);
        const seg = tempoEmSegundos % 60;
        spanTempo.innerText = `${min.toString().padStart(2, '0')}:${seg.toString().padStart(2, '0')}`;

        if (tempoEmSegundos <= 0) {
            clearInterval(intervaloCronometro);
            spanTempo.innerText = "00:00 - TEMPO ESGOTADO!";
            spanTempo.style.color = "#ef4444"; // Vermelho
            alert("O tempo do seu simulado acabou! Verifique seu desempenho.");
        }
        tempoEmSegundos--;
    }

    atualizarTela(); 
    intervaloCronometro = setInterval(atualizarTela, 1000);
}

function pararCronometro() {
    clearInterval(intervaloCronometro);
    document.getElementById("display-cronometro").style.display = "none";
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
    
    // ATUALIZADO: Só limpa a questão se NÃO estiver no modo simulado ativo
    if (document.getElementById("display-cronometro").style.display === "none") {
        setTimeout(aplicarFiltros, 1500);
    }
};

window.filtrarPorTag = function(tag) {
    tagSelecionada = tag;
    aplicarFiltros();
};

// Eventos
inputBusca.addEventListener("input", aplicarFiltros);
selectBanca.addEventListener("change", aplicarFiltros);
selectMateria.addEventListener("change", aplicarFiltros);

document.getElementById("btn-simulado").addEventListener("click", () => {
    const bancaSelecionada = selectBanca.value;
    const materiaSelecionada = selectMateria.value;
    const termoBusca = inputBusca.value.toLowerCase();
    const qtd = parseInt(document.getElementById("qtd-simulado").value) || 10; 
    const tempo = parseInt(document.getElementById("tempo-simulado").value); // NOVO

    const filtradas = questoes.filter(q => {
        const bateBanca = bancaSelecionada === "" || q.banca === bancaSelecionada;
        const bateMateria = materiaSelecionada === "" || q.materia === materiaSelecionada;
        const bateTag = tagSelecionada === "" || (q.tags && q.tags.includes(tagSelecionada));
        const bateBusca = termoBusca === "" || q.enunciado.toLowerCase().includes(termoBusca);
        return bateBanca && bateMateria && bateTag && bateBusca;
    });

    const sorteadas = embaralharArray(filtradas);
    renderizarQuestoes(sorteadas.slice(0, qtd));

    // Inicia o cronômetro se o usuário digitou os minutos
    if (tempo > 0) {
        iniciarCronometro(tempo);
    } else {
        pararCronometro();
    }
});

document.getElementById("btn-todas").addEventListener("click", () => {
    selectBanca.value = "";
    selectMateria.value = "";
    inputBusca.value = "";
    document.getElementById("qtd-simulado").value = "";
    document.getElementById("tempo-simulado").value = "";
    tagSelecionada = ""; 
    aplicarFiltros(); // O aplicarFiltros já chama o pararCronometro()
});

document.getElementById("btn-modo-revisao").addEventListener("click", () => {
    pararCronometro();
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