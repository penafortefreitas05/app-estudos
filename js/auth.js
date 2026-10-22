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

// Encerra a sessão
export async function sair() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showToast("Erro ao sair: " + error.message, "erro");
    } else {
        showToast("Você saiu da conta de forma segura.", "info");
    }
}