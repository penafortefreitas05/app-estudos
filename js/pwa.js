// ============================================================
// js/pwa.js - Menu do celular, Service Worker e botão "Instalar App"
// (antes ficava embutido no index.html; em arquivo próprio ele é compatível
// com a Política de Segurança de Conteúdo (CSP) configurada no vercel.json)
// ============================================================
(function () {
    // Fecha a gaveta do menu (celular) ao tocar num botão dela
    const sidebar = document.querySelector('.sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    if (sidebar && menuToggle) {
        sidebar.addEventListener('click', function (e) {
            if (e.target.closest('button')) menuToggle.checked = false;
        });
    }

    // Registra o Service Worker: necessário para o navegador considerar o app "instalável"
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .catch((erro) => console.error('Falha ao registrar Service Worker:', erro));
        });
    }

    // Lógica do botão "Instalar App no Celular"
    let deferredPrompt = null;
    const btnInstalar = document.getElementById('btn-instalar-app');
    const ehIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    const jaInstalado = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

    // Android/Chrome/Edge: o navegador avisa quando pode instalar
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        if (btnInstalar && !jaInstalado) btnInstalar.hidden = false;
    });

    // iPhone/iPad: não existe esse aviso automático, então mostramos o botão sempre (com instrução manual)
    if (ehIOS && !jaInstalado && btnInstalar) {
        btnInstalar.hidden = false;
    }

    if (btnInstalar) {
        btnInstalar.addEventListener('click', async () => {
            if (ehIOS) {
                alert('Para instalar no iPhone/iPad:\n\n1. Toque no ícone de Compartilhar (□ com seta para cima) na barra do Safari.\n2. Toque em "Adicionar à Tela de Início".');
                return;
            }
            if (!deferredPrompt) {
                alert('Seu navegador não ofereceu a instalação automática aqui. Procure no menu do navegador por "Instalar app" ou "Adicionar à tela inicial".');
                return;
            }
            deferredPrompt.prompt();
            await deferredPrompt.userChoice;
            deferredPrompt = null;
            btnInstalar.hidden = true;
        });
    }

    window.addEventListener('appinstalled', () => {
        if (btnInstalar) btnInstalar.hidden = true;
        deferredPrompt = null;
    });
})();
