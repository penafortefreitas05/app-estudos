# Ritmo de trabalho (a partir de domingo, 02/11/2026)

Definido pelo Nathan em 30/10. O limite semanal renova **domingo às 16h**.

## Regras combinadas
1. **Orçamento por dia: cerca de 14% do limite semanal.** 7 dias x 14% = 98%. Quem controla é o Nathan, que lê o painel de uso. Domingo sobra uma folga para ajustes pequenos.
2. **Chat novo todo domingo.** Abre-se por `docs/retomada-novo-chat.md`. Antes de fechar a semana: atualizar a retomada, o Checklist e os próximos passos.
3. **Trabalho dividido com o GPT.** Ele rascunha (textos, conceitos visuais, dúvidas de estudo); o Claude escreve código, testa, faz commit e escreve o SQL final. Para o GPT entender o projeto: `docs/prompt-gpt.md`.
4. **Sem trabalho redundante.** Não reler o projeto inteiro nem rodar todas as suítes de teste a cada mudança. Revisão completa só quando for necessário (antes de uma mudança grande, de importar lote no banco ou de mexer em segurança).
5. **Problemas em lote.** O Nathan junta o que achou e manda numa mensagem só.
6. **Meta: usar a semana inteira com segurança até o reset.** Limite não usado não passa para a semana seguinte, mas também não vale estourar e ficar travado no meio.

## Sugestões do Claude (para decidir)
- **Tamanho do pedido em 3 faixas:** P (ajuste de texto, cor, bug pequeno: ~1 a 2%), M (tela ou função nova pequena: ~3 a 5%), G (sistema novo, SQL, mexe em vários arquivos: 6% ou mais). Eu digo a faixa antes de começar; o Nathan decide se cabe no dia.
- **Dia de G é dia sem mais nada.** Item G não divide o dia com outros; assim não trava no meio.
- **Ponto de controle na quarta:** se passou de 50% do semanal, os itens G da semana são adiados.
- **Máximo de uma melhoria G por semana.** O app é ferramenta; o concurso é o objetivo. A melhor métrica de que o app funciona é o seu "Meu dia" mostrando estudo constante.
- **Teste enxuto:** teste só o que mudou (um arquivo de teste), e a bateria completa só antes de merge grande.
- **Conteúdo de estudo (questões, resumos) é feito no chat do banco ou com o GPT,** e o Claude só importa, valida formato e confere gabarito. Gerar conteúdo em volume aqui gasta limite caro.
- **Fechamento de domingo (5 min):** checklist atualizado, retomada atualizada, itens da semana seguinte já em ordem, assim o chat novo começa direto.
