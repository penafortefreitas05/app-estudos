// ============================================================
// js/auth.js - Gerenciador de Autenticação do FocoPro
// ============================================================

import { supabase } from './supabase.js';
import { showToast } from './notifications.js';


// Cria uma nova conta no Supabase
export async function criarConta(email, senha) {
    const { data, error } = await supabase.auth.signUp({
        email: email,
        password: senha,
    });

    if (error) {
        showToast("Erro ao criar conta: " + error.message, "erro");
        return null;
    }

    // Com a confirmação de e-mail ativada, o cadastro não gera sessão até o link ser confirmado.
    if (data.user && !data.session) {
        showToast("Quase lá! Enviamos um link de confirmação para o seu e-mail. Confirme e depois faça login.", "info", 7000);
        return "confirmacao_pendente";
    }

    showToast("Conta criada com sucesso! Bem-vindo ao FocoPro.", "sucesso");
    return data.user;
}


// Faz o login do usuário existente
export async function entrar(email, senha) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: senha,
    });

    if (error) {
        showToast("E-mail ou senha incorretos.", "erro");
        return null;
    }
    showToast("Login realizado com sucesso!", "sucesso");
    return data.user;
}

// Envia um e-mail com o link para redefinir a senha (fluxo "Esqueci minha senha").
// Por segurança, o Supabase responde com sucesso mesmo se o e-mail não existir,
// para não revelar quais e-mails têm conta.
export async function enviarLinkRedefinicao(email) {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname,
    });

    if (error) {
        showToast("Erro ao enviar o link: " + error.message, "erro");
        return false;
    }

    showToast("Se este e-mail tiver uma conta no FocoPro, enviamos um link para redefinir a senha.", "info", 7000);
    return true;
}

// Troca a senha do usuário autenticado. Usado só depois que o link do e-mail
// trouxe a pessoa de volta numa sessão de recuperação (evento PASSWORD_RECOVERY).
export async function redefinirSenha(novaSenha) {
    const { error } = await supabase.auth.updateUser({ password: novaSenha });

    if (error) {
        showToast("Erro ao salvar a nova senha: " + error.message, "erro");
        return false;
    }

    showToast("Senha redefinida com sucesso! Você já está logado.", "sucesso");
    return true;
}

// Encerra a sessão
export async function sair() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showToast("Erro ao sair: " + error.message, "erro");
    } else {
        showToast("Você saiu da conta de forma segura.", "info");
    }
}