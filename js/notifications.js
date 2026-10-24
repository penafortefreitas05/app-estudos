// ============================================================
// js/notifications.js - Toasts e Modais Assíncronos
// ============================================================
// Todo texto entra por textContent: mensagens (inclusive as de erro vindas do servidor)
// nunca são interpretadas como HTML.

function obterToastContainer() {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.className = "toast-container";
        document.body.appendChild(container);
    }
    return container;
}

export function showToast(mensagem, tipo = 'info', duracao = 3500) {
    const container = obterToastContainer();
    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;

    const icones = { sucesso: '✔', erro: '✖', alerta: '⚠', info: 'ℹ' };

    const icone = document.createElement("span");
    icone.className = "toast-icone";
    icone.textContent = icones[tipo] || 'ℹ';

    const texto = document.createElement("span");
    texto.className = "toast-mensagem";
    texto.textContent = String(mensagem ?? "");

    toast.append(icone, texto);
    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("visible"));

    setTimeout(() => {
        toast.classList.remove("visible");
        setTimeout(() => toast.remove(), 300);
    }, duracao);
}

export function showConfirmModal({
    titulo = "Confirmação",
    mensagem = "Tem certeza que deseja prosseguir?",
    textoConfirmar = "Confirmar",
    textoCancelar = "Cancelar",
    corPerigo = false
}) {
    return new Promise((resolve) => {
        const overlay = document.createElement("div");
        overlay.className = "modal-overlay";

        overlay.innerHTML = `
            <div class="modal-card">
                <h3 class="modal-titulo"></h3>
                <p class="modal-mensagem"></p>
                <div class="modal-acoes">
                    <button type="button" class="btn-secondary btn-modal-cancelar"></button>
                    <button type="button" class="btn-primary ${corPerigo ? 'btn-danger' : ''} btn-modal-confirmar"></button>
                </div>
            </div>
        `;
        overlay.querySelector(".modal-titulo").textContent = titulo;
        overlay.querySelector(".modal-mensagem").textContent = mensagem;
        overlay.querySelector(".btn-modal-cancelar").textContent = textoCancelar;
        overlay.querySelector(".btn-modal-confirmar").textContent = textoConfirmar;

        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add("visible"));

        let resolvido = false;
        const fechar = (resultado) => {
            if (resolvido) return;
            resolvido = true;
            overlay.classList.remove("visible");
            setTimeout(() => {
                if (overlay.parentNode) overlay.remove();
            }, 200);
            resolve(resultado);
        };

        overlay.querySelector(".btn-modal-confirmar").addEventListener("click", () => fechar(true));
        overlay.querySelector(".btn-modal-cancelar").addEventListener("click", () => fechar(false));
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) fechar(false);
        });
    });
}
