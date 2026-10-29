# Frete Rápido — mural de entregas

Projeto separado do OrçaOn. Site estático (GitHub Pages) + Firebase no plano grátis (Spark).

- `index.html` — o mural (todo mundo entra com o Gmail).
- `painel.html` — painel do Bruno: pessoas, funções, permissões e valores.
- `comum.js` — configuração do Firebase, login e permissões (usado pelos dois).
- `firestore.rules` — regras de segurança. Precisam estar publicadas no Firebase.

## Quem pode o quê

Só entra quem o Bruno cadastrou no painel com o acesso liberado. O Bruno (`brunolemosxd@gmail.com`) é sempre o administrador.

| Permissão | Gerente | Vendedor | Entregador |
|---|---|---|---|
| Lançar entregas (e editar as que lançou) | sim | sim | não |
| Editar entregas de todos | sim | não | não |
| Apagar entregas | sim | não | não |
| Marcar entregue / problema e passar de dia | sim | não | sim |
| Ver valores de frete | sim | sim | não |
| Pôr e tirar fotos na pasta de notas | sim | sim | não |

Qualquer pessoa cadastrada pode colar post-it. As permissões podem ser ajustadas uma por uma no painel.
"Ver valores" só esconde os valores na tela; as outras permissões são garantidas pelo servidor (regras do Firestore).

## Fotos

As fotos vão dentro do banco de dados, diminuídas (plano grátis não guarda arquivos).
O cartão usa uma miniatura; a foto grande fica em `fotos/{id da entrega}`.
Fotos com mais de 60 dias são apagadas quando o Bruno abre o mural ou o painel (uma vez por dia).

## Coleções do Firestore

- `usuarios/{gmail}` — nome, função, permissões, ativo.
- `config/equipe` — nomes que aparecem em "frete por conta do vendedor" e "vendedor pôs a mais".
- `entregas/{id}` — as entregas.
- `fotos/{id}` — foto grande da nota de cada entrega.
- `notasjuntas/{id}` — pasta "Produtos que vão com outras notas".

## Ao mudar o comum.js

Troque o número em `comum.js?v=...` no `index.html` e no `painel.html`.
Sem isso, o celular pode juntar a página nova com o `comum.js` antigo (guardado em cache) e abrir em branco.
