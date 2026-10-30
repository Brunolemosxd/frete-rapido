# Frete Rápido

Mural de entregas (fretes) da loja do Bruno, com painel do administrador.
Projeto SEPARADO do OrçaOn (repositório `brunolemosxd.github.io`): não misturar nada entre os dois.
Dono: Bruno (`brunolemosxd@gmail.com`, único administrador). Idioma de tudo: português do Brasil.
Explicar sempre em linguagem simples, passo a passo, e sempre mandar os links dentro de bloco de código (para ter botão de copiar):
- Mural: `https://brunolemosxd.github.io/frete-rapido/`
- Painel: `https://brunolemosxd.github.io/frete-rapido/painel.html`

## Como o projeto é montado
- GitHub Pages, branch `main`, raiz. O Bruno aprovou subir direto na `main` (o site atualiza em ~5 a 10 min).
- `index.html` (mural), `painel.html` (só o Bruno), `comum.js` (Firebase, login, permissões, tabela de fretes, contador de uso),
  `firestore.rules` (regras), `sw.js` (só se desliga sozinho; os avisos de entrega nova foram retirados a pedido do Bruno).
- Firebase projeto `frete-rapido-5516e`, plano Spark (grátis, sem cartão). NÃO sugerir Blaze sem o Bruno pedir.
  Login só com Google. Firestore em southamerica-east1. Fotos vão dentro do Firestore (base64 diminuído), sem Storage.
- SDK compat 10.14.1 do gstatic.

## Regras que não podem ser quebradas
1. Ao mudar o `comum.js`, trocar o número em `comum.js?v=...` no `index.html` E no `painel.html`.
   Sem isso, o celular junta página nova com `comum.js` velho e abre em branco (já aconteceu).
2. Ao mudar o `firestore.rules`, avisar o Bruno para republicar: Firebase → Firestore → Regras → apagar tudo → colar → Publicar.
   Link: `https://console.firebase.google.com/project/frete-rapido-5516e/firestore/rules`
   Mandar o texto completo das regras num bloco de código (ele cola pelo celular).
3. Valores só para o Bruno: o total "Fretes R$" do dia aparece só para o administrador. Gerente/vendedor veem o valor de
   cada entrega se tiverem "Ver valores"; "💰 Cobrar R$ X" aparece para todos (o freteiro precisa saber).
4. Painel: só abre com o e-mail do Bruno (tela + regras do servidor).

## Como funciona (resumo do que foi combinado)
- Pessoas (`usuarios/{gmail}`): funções gerente, vendedor, entregador ou personalizado; permissões lancar, editarTodas,
  apagar, marcar, verValores, pasta. Nomes ativos com "naLista" vão para `config/equipe`.
- Nova entrega: foto da nota obrigatória (só para entrega nova) + fotos extras; contagem de notas na loja/depósito
  (mínimo 1); prioridade (cartão vermelho no topo); dia padrão Hoje; turno padrão "Qualquer turno";
  nome e sobrenome como na nota (obrigatórios); telefone com DDD; contatos extras; bloqueia mesmo telefone no mesmo dia.
- Formulário de nova entrega em blocos (caixas com faixa colorida em cima): "📄 Nota e produtos" (foto, notas, produtos),
  "👤 Cliente" (nome, telefone, contatos, bairro, condomínio, rua, número, AP), "🚚 Dia e turno da entrega" (prioridade,
  dia, turno) e "💰 Frete" (valor, ajuste, pagamento); observação por último.
- Bairro: precisa ser escolhido da tabela (sugestões sem acento). Valor travado da tabela (`config/fretes`, editável no
  painel; valor null = "a consultar", aí pede valor combinado). Caixinha "É condomínio": tabela até R$ 100 vira R$ 100;
  acima de 100 fica a tabela. Ajuste −50 a +50 sempre com o vendedor que mudou.
- Pagamento do frete: cobrar na entrega, já pago no Pix, dinheiro junto com a nota, frete na nota (Bruno lança; faixa vermelha
  "Frete na nota" embaixo da foto; conta como já pago), por conta do vendedor (com nome).
- Turno "Depois das HH:MM": faixa roxa com relógio "🕒 Só depois das HH:MM" no cartão e no detalhe (sempre, não muda com a hora).
- Cores de local: Loja = azul fraquinho (#cfe5fb), Depósito = marrom (#7a4a21), iguais nos dois temas (etiquetas, produtos, notas, formulário).
- Endereço em 3 campos: Rua (só letras: números são tirados ao digitar), Número (só números, obrigatório, ou "Sem número")
  e "AP ou quadra e lote" (opcional, letras e números). Grava `rua`, `numero`, `semNumero`, `complemento` e também
  `endereco` = "Rua, Número" (ou "Rua, S/N") para o resto do app. Entregas antigas: `separarEndereco` divide ao editar
  (número que estava no complemento vai para o Número). Mapa (Google Maps/Waze) usa só rua, número e bairro.
- Cartão organizado em blocos: no alto turno + situação; bloco "👤 Cliente" (nome, "📍 endereço · complemento — Bairro"
  com bairro em azul, 🏢 condomínio, botões "📋 Copiar endereço" e "🗺️ Maps", telefone e outros contatos, cada um com
  "📋 Copiar"); bloco "📦 Nota e produtos" (notas na loja/depósito e um produto por linha com o lugar); depois Obs.,
  post-its, caixa do valor e "por Ana · às 14:32". Coluna da esquerda: foto, frete na nota, flecha, quem carregou.
  REGRA: copiar endereço leva SÓ rua e número (`enderecoRua`): nunca AP/complemento nem bairro, também no detalhe.
  O Maps/Waze usa `enderecoMapa` (rua, número e bairro).
  Entregas antigas (sem `rua`): se o número ficou depois de "casa" ou no complemento, `enderecoRua` acha e junta; número de quadra/lote não conta. Detalhe da entrega tem botão fixo "← Voltar para o mural" no alto.
- Flecha de direção embaixo da foto: ← azul (Araçá até Terra de Areia), → vermelha (Guará até Nova Tramandaí),
  ↑ cinza (centro e resto; Zona Nova é cinza). Pendentes com mesma flecha ficam juntas em cada turno. Editável na tabela.
- Caixa grande do valor no pé do cartão (pendente/problema; entregue fica como antes), cor pela forma de pagamento:
  "💰 Cobrar R$ X" (todos veem), "R$ X pago no Pix", "junto com a nota", "frete na nota", "por conta do vendedor Fulano".
  Embaixo: "Tabela R$ 70 + R$ 10 de Ana" (ajuste em amarelo), condomínio ou valor combinado. Sem "Ver valores": só a forma
  de pagamento, sem valor (e sem ajuste). Valor/ajuste/pagamento saíram das etiquetas do meio nesses cartões.
- Linha "por Ana · às 14:32" no cartão: hora em que foi lançada (`criadoEm`; se não foi hoje, "29/10 às 14:32").
- Quem carregou: Tiago (sem H) ou Bruno, no menu ao segurar o cartão; aparece embaixo da foto.
- Problema: motivo em faixa vermelha grande no topo do cartão; motivos cadastráveis (`config/motivos`).
- Entregues descem para "Entregues" minimizadas (uma linha: ✓ nome · bairro · quem carregou); um toque abre no tamanho normal, botão "▴ Minimizar" fecha de novo (só na memória da página). Faixa de dias vai até ~3 meses para a frente.
- Pasta "Produtos que vão com outras notas" (`notasjuntas`, por dia): cada item tem várias fotos + detalhe;
  "Entregue, arquivar" leva para "📦 Arquivados".
- Fotos com mais de 60 dias são apagadas quando o Bruno abre o mural/painel.
- Contador de uso do plano grátis (`uso/{dia}`, estimativa): aviso amarelo 70% e vermelho 90%, só para o Bruno.
- Painel → Valores: gráfico por dia (entregues), totais e tabela por pessoa; entrega com problema não conta em nada.
- Tema claro/escuro/automático no topo.

## Como trabalhar
- Antes de mexer, ler o trecho envolvido. Depois: `node --check` nos scripts e testar com Playwright usando um Firebase
  falso (sem rede): bloquear gstatic/googleapis e injetar um `window.firebase` de mentira com collection/doc/where/
  onSnapshot (com docChanges)/set (merge e FieldValue.increment)/update/delete; abrir com `file://`.
- Não dá para testar aqui: Firebase de verdade, regras no servidor, câmera, Google Maps/Waze, notificações.
  Avisar o Bruno do que não foi testado.
- Ao entregar: dizer em poucas linhas o que mudou, o que NÃO foi testado, o passo manual do Bruno (com link) e os links do mural e do painel.

## Pendências / ideias que o Bruno pode pedir
- Coluna D da planilha de fretes ("FRETE NA …") ficou cortada na foto; só a coluna "FRETE NA HORA" foi usada.
- Linha "Condomínio entre Rainha do Mar e Curumim (Centro)" na tabela ficou redundante com a caixinha (pode apagar no painel).
- Esconder também o valor de cada entrega de gerente/vendedores (hoje só o total do dia é exclusivo do Bruno).
- Mural antigo dentro do Claude (artifact) e a branch `claude/editar-mural-fretes-l4jyqr` no repositório do OrçaOn
  (cópia antiga, pasta `frete-rapido/`) podem ser apagados se o Bruno quiser.
