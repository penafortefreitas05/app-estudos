// Nosso banco de dados de questões com alternativas
let questoes = [
    { id: 1, banca: "Cesgranrio", materia: "Português", enunciado: "Assinale a alternativa correta sobre concordância verbal...", alternativas: ["A) Errado", "B) Incorreto", "C) Correto", "D) Nenhuma"], gabarito: "C" },
    { id: 2, banca: "FGV", materia: "Raciocínio Lógico", enunciado: "Se todo A é B e nenhum B é C...", alternativas: ["A) Verdadeiro", "B) Falso", "C) Indeterminado", "D) Talvez"], gabarito: "B" },
    { id: 3, banca: "Cesgranrio", materia: "Python", enunciado: "Qual é o tipo de dado resultante da expressão 3 / 2 em Python 3?", alternativas: ["A) float", "B) int", "C) str", "D) bool"], gabarito: "A" }
];

// Controle de estado do usuário
let acertos = 0;
let erros = 0;
let idsErros = []; // Guarda os IDs das questões erradas para revisão
let respondidas = {}; // Guarda quais questões já foram respondidas para travar novos cliques

const container = document.getElementById("container-questoes");
const btnFiltrar = document.getElementById("btn-filtrar");
const btnTodas = document.getElementById("btn-todas");
const btnModoRevisao = document.getElementById("btn-modo-revisao");
const selectBanca = document.getElementById("filtro-banca");

const txtAcertos = document.getElementById("stat-acertos");
const txtErros = document.getElementById("stat-erros");
const contadorRevisao = document.getElementById("contador-revisao");

function renderizarQuestoes(lista) {
    container.innerHTML = "";
    
    if (lista.length === 0) {
        container.innerHTML = "<p>Nenhuma questão encontrada.</p>";
        return;
    }

    lista.forEach(q => {
        const div = document.createElement("div");
        div.classList.add("questao-card");
        if (respondidas[q.id] === 'certo') div.classList.add("correta");
        if (respondidas[q.id] === 'errado') div.classList.add("incorreta");

        // Criação das alternativas em botões
        let botoesAlternativas = q.alternativas.map(alt => {
            const letra = alt.charAt(0); // Pega 'A', 'B', 'C' ou 'D'
            const desabilitado = respondidas[q.id] ? "disabled" : "";
            return `<button class="btn-opcao" ${desabilitado} onclick="responder(${q.id}, '${letra}')">${alt}</button>`;
        }).join(" ");

        div.innerHTML = `
            <small><strong>Banca:</strong> ${q.banca} | <strong>Matéria:</strong> ${q.materia}</small>
            <p>${q.enunciado}</p>
            <div class="opcoes-resposta">${botoesAlternativas}</div>
            <div id="feedback-${q.id}"></div>
        `;
        
        // Se já foi respondida, mostra o feedback salvo
        if (respondidas[q.id] === 'certo') {
            document.getElementById(`feedback-${q.id}`)?.classList.add('feedback', 'certo');
        }

        container.appendChild(div);
    });
}

// Função executada ao clicar em uma alternativa
window.responder = function(idQuestao, alternativaEscolhida) {
    if (respondidas[idQuestao]) return; // Impede responder duas vezes a mesma

    const questao = questoes.find(q => q.id === idQuestao);
    const feedbackDiv = document.getElementById(`feedback-${idQuestao}`);
    
    if (alternativaEscolhida === questao.gabarito) {
        respondidas[idQuestao] = 'certo';
        acertos++;
        feedbackDiv.className = "feedback certo";
        feedbackDiv.innerHTML = "✔ Resposta Correta!";
    } else {
        respondidas[idQuestao] = 'errado';
        erros++;
        if (!idsErros.includes(idQuestao)) {
            idsErros.push(idQuestao);
        }
        feedbackDiv.className = "feedback errado";
        feedbackDiv.innerHTML = `✖ Resposta Incorreta. O gabarito é: ${questao.gabarito}`;
    }

    // Atualiza o painel de estatísticas
    txtAcertos.innerText = acertos;
    txtErros.innerText = erros;
    contadorRevisao.innerText = idsErros.length;

    // Recarrega para desabilitar os botões daquela questão
    renderizarQuestoes(questoes.filter(q => {
        // Mantém a visualização atual (filtro ou todas)
        return true;
    }));
};

// Eventos de Filtro
btnFiltrar.addEventListener("click", () => {
    const bancaSelecionada = selectBanca.value;
    if (bancaSelecionada === "") {
        renderizarQuestoes(questoes);
    } else {
        renderizarQuestoes(questoes.filter(q => q.banca === bancaSelecionada));
    }
});

btnTodas.addEventListener("click", () => {
    selectBanca.value = "";
    renderizarQuestoes(questoes);
});

// Botão de Modo Revisão (Filtra só o que errou)
btnModoRevisao.addEventListener("click", () => {
    const questoesParaRevisar = questoes.filter(q => idsErros.includes(q.id));
    renderizarQuestoes(questoesParaRevisar);
});

// Carga inicial
renderizarQuestoes(questoes);