# Trabalho em conjunto: Claude e GPT

Regra de ouro: **o repositório e o Checklist são a única fonte da verdade.** Nada vale até estar em um dos dois.

## Quem faz o quê
| Tarefa | GPT | Claude |
|---|---|---|
| Conceitos de visual e organização (imagens, SVG) | Sim, é bom para ideias | Avalia, aponta o que falta e implementa |
| Rascunho de textos (resumos, comentários, glossário) | Sim | Revisa formato e consistência antes de entrar |
| Código no repositório, commits, merges | Não | Sim, é o único que mexe nos arquivos do site |
| Testes, conferência de números e de gabarito | Não | Sim |
| SQL do Supabase | Pode sugerir | Escreve a final e confere antes de o Nathan rodar |
| Dúvida de estudo (conceito de concurso) | Sim | Também; quando divergir, o Nathan confere na fonte |

## Regras
1. **Um só escritor do código.** O GPT entrega ideias, imagens e textos; quem altera o app é o Claude, para não haver dois commits mexendo no mesmo arquivo nem dois números diferentes de cache.
2. **Conceito não é especificação.** Toda imagem do GPT vem com a pergunta "o que falta?" (botões, estados, contadores). O Claude responde em lista curta o que adotar, o que não e por quê.
3. **Conteúdo de estudo é conferido.** Texto novo (principalmente "Não confundir" e gabaritos) passa por uma fonte antes de ir ao ar. Duas IAs concordando não substitui a fonte.
4. **Um pedido por vez, em lote.** O Nathan junta os ajustes e manda numa mensagem só, para gastar menos limite.
5. **Registrar o que foi decidido** no Checklist (ou neste repositório), com a data. Se uma decisão não está lá, ela não aconteceu.
6. **Chat novo começa por `docs/retomada-novo-chat.md`.**

## Como passar o trabalho de um para o outro
- GPT para Claude: colar a imagem ou o texto e dizer o objetivo ("avaliar", "implementar", "revisar").
- Claude para GPT: eu entrego um resumo de uma linha do que foi decidido e do que falta, para ele não refazer o que já está pronto.

Veja também `docs/ritmo-de-trabalho.md` (orçamento diário, chat de domingo) e `docs/prompt-gpt.md` (texto para apresentar o projeto ao GPT).
