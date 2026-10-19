// ============================================================
// js/notifications.js - Toasts e Modais Premium (ES6 + Promises)
// ============================================================

// Garante o container de toasts no DOM
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

/**
 * Exibe uma notificação estilo Toast no canto inferior direito
 * @param {string} mensagem - Texto da notificação
 * @param {'sucesso'|'erro'|'alerta'|'info'} tipo - Tipo do toast
 * @param {number} duracao - Tempo de exibição em ms
 */
export function showToast(mensagem, tipo = 'info', duracao = 3500) {
    const container = obterToastContainer();
    
    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;
    
    const icones = {
        sucesso: '✔',
        erro: '✖',
        alerta: '⚠',
        info: 'ℹ'
    };

    toast.innerHTML = `
        <span class="toast-icone">${icones[tipo] || 'ℹ'}</span>
        <span class="toast-mensagem">${mensagem}</span>
    `;

    container.appendChild(toast);

    // Entrada suave
    requestAnimationFrame(() => toast.classList.add("visible"));

    // Saída automática
    setTimeout(() => {
        toast.classList.remove("visible");
        toast.addEventListener("transitionend", () => toast.remove());
    }, duracao);
}

/**
 * Exibe um Modal de Confirmação customizado e retorna uma Promise<boolean>
 */
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
                <h3 class="modal-titulo">${titulo}</h3>
                <p class="modal-mensagem">${mensagem}</p>
                <div class="modal-acoes">
                    <button type="button" class="btn-secondary btn-modal-cancelar">${textoCancelar}</button>
                    <button type="button" class="btn-primary ${corPerigo ? 'btn-danger' : ''} btn-modal-confirmar">${textoConfirmar}</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        requestAnimationFrame(() => overlay.classList.add("visible"));

        const fechar = (resultado) => {
            overlay.classList.remove("visible");
            overlay.addEventListener("transitionend", () => {
                overlay.remove();
                resolve(resultado);
            });
        };

        overlay.querySelector(".btn-modal-confirmar").addEventListener("click", () => fechar(true));
        overlay.querySelector(".btn-modal-cancelar").addEventListener("click", () => fechar(false));
        
        // Fechar se clicar fora do cartão
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) fechar(false);
        });
    });
}