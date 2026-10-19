// ============================================================
// js/notifications.js - Toasts e Modais Assíncronos (Sem Travamentos)
// ============================================================

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

// ---------- TOASTS DE NOTIFICAÇÃO ----------
export function showToast(mensagem, tipo = 'info', duracao = 3500) {
    const container = obterToastContainer();
    const toast = document.createElement("div");
    toast.className = `toast toast-${tipo}`;
    
    const icones = { sucesso: '✔', erro: '✖', alerta: '⚠', info: 'ℹ' };

    toast.innerHTML = `
        <span class="toast-icone">${icones[tipo] || 'ℹ'}</span>
        <span class="toast-mensagem">${mensagem}</span>
    `;

    container.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("visible"));

    setTimeout(() => {
        toast.classList.remove("visible");
        setTimeout(() => toast.remove(), 300);
    }, duracao);
}

// ---------- MODAL DE CONFIRMAÇÃO (PROMISE ROBUSTA) ----------
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

        let resolvido = false;
        const fechar = (resultado) => {
            if (resolvido) return;
            resolvido = true;
            overlay.classList.remove("visible");
            
            // Garante a remoção do DOM e resolve a Promise sem travar
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