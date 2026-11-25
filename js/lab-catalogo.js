// Catálogo do Laboratório: qual assunto do Aprender tem experimento "Ver na prática".
// Só o piloto por enquanto (parecer da sala Design: catálogo completo depois que o piloto for validado).
import { abrirLabSubrede, labSubredeConcluidoEm } from './lab-subrede-tela.js';

const LABS = [
    {
        id: 'subrede',
        materia: 'Redes & Segurança da Informação',
        assunto: 'Fundamentos de redes (OSI, TCP/IP, equipamentos, tipos de rede)',
        titulo: 'Laboratório de sub-redes',
        descricao: 'Mude a máscara e o gateway e veja quem passa a se comunicar.',
        duracao: '10–15 min',
        concluidoEm: labSubredeConcluidoEm,
        abrir: (opcoes) => abrirLabSubrede(opcoes)
    }
];

export function labDoAssunto(materia, assunto) {
    return LABS.find(l => l.materia === materia && l.assunto === assunto) || null;
}
