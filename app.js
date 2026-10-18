// Nosso banco de dados local temporário para testes
const questoes = [
    { id: 1, banca: "Cesgranrio", materia: "Português", enunciado: "Questão 1: Assinale a alternativa correta sobre concordância verbal...", gabarito: "C" },
    { id: 2, banca: "FGV", materia: "Raciocínio Lógico", enunciado: "Questão 2: Se todo A é B e nenhum B é C...", gabarito: "B" },
    { id: 3, banca: "Cesgranrio", materia: "Python", enunciado: "Questão 3: Qual é o tipo de dado resultante da expressão 3 / 2 em Python 3?", gabarito: "A" }
];

const container = document.getElementById("container-questoes");
const btnFiltrar = document.getElementById("btn-filtrar");
const selectBanca = document.getElementById("filtro-banca");

// Função para exibir as questões na tela
function renderizarQuestoes(lista) {
    container.innerHTML = "";
    
    if (lista.length === 0) {
        container.innerHTML = "<p>Nenhuma questão encontrada para este filtro.</p>";
        return;
    }

    lista.forEach(q => {
        const div = document.createElement("div");
        div.classList.add("questao-card");
        div.innerHTML = `
            <small><strong>Banca:</strong> ${q.banca} | <strong>Matéria:</strong> ${q.materia}</small>
            <p>${q.enunciado}</p>
        `;
        container.appendChild(div);
    });
}

// Evento do botão de filtrar
btnFiltrar.addEventListener("click", () => {
    const bancaSelecionada = selectBanca.value;
    
    if (bancaSelecionada === "") {
        renderizarQuestoes(questoes);
    } else {
        const filtradas = questoes.filter(q => q.banca === bancaSelecionada);
        renderizarQuestoes(filtradas);
    }
});

// Renderiza todas ao carregar a página pela primeira vez
renderizarQuestoes(questoes);