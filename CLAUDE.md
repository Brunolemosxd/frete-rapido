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
- Nova entrega: foto da nota OPCIONAL (desde 18/11; cartão sem foto mostra "sem foto") + fotos extras; contagem de notas na loja/depósito
  (mínimo 1); prioridade (cartão vermelho no topo); dia padrão Hoje; turno padrão "Qualquer turno";
  nome e sobrenome como na nota (obrigatórios); telefone com DDD; contatos extras; bloqueia mesmo telefone no mesmo dia.
- Formulário de nova entrega em blocos (caixas com faixa colorida em cima): "📄 Nota e produtos" (foto, notas, produtos),
  "👤 Cliente" (nome, telefone, contatos, bairro, condomínio, rua, número, AP), "🚚 Dia e turno da entrega" (prioridade,
  dia, turno) e "💰 Frete" (valor, ajuste, pagamento); observação por último.
- Painel → Ajustes → "Loja e entregas" (`config/geral`, `geralDe`/`GERAL_PADRAO` no comum.js): nome da loja, valor do
  condomínio (padrão 100), quem carrega (padrão Tiago, Bruno) e os botões de produtos. Mural lê ao abrir.
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
  (número que estava no complemento vai para o Número). Mapa (Google Maps/Waze) usa só rua e número.
- Cartão organizado em blocos: no alto turno + situação; bloco "👤 Cliente" (nome, "📍 endereço · complemento — Bairro"
  com bairro em azul, 🏢 condomínio, botões "📋 Copiar endereço" e "🗺️ Maps", telefone e outros contatos, cada um com
  "📋 Copiar"); bloco "📦 Nota e produtos" (notas na loja/depósito e um produto por linha com o lugar); depois Obs.,
  post-its, caixa do valor e "por Ana · às 14:32". Coluna da esquerda: foto, frete na nota, flecha, quem carregou.
  REGRA: copiar endereço leva SÓ rua e número (`enderecoRua`): nunca AP/complemento nem bairro, também no detalhe.
  Telefone e contatos: botão verde do WhatsApp (`waLink`: https://wa.me/55+DDD+número, abre conversa nova) + "📋 Copiar", no cartão e no detalhe.
  O WhatsApp abre com a mensagem já escrita (`msgWA` → `montarMsg` do comum.js, `?text=`); a pessoa revisa e aperta enviar.
  O TEXTO É EDITÁVEL PELO BRUNO no painel → Ajustes → "Mensagem do WhatsApp" (`config/mensagem`: pix, texto, textoCobrar,
  textoOutro; vazio = texto padrão `MSG_PADRAO`). Palavras trocadas: {nome} {cliente} {apresentacao} {loja} {valor} {pix}
  {cobrar} (linha da parte de cobrança; some se o frete já está pago; linhas com {pix} somem sem chave). Prévia e contador
  de letras no painel (aviso acima de 700). {apresentacao} = "Meu nome é {quem manda}, freteiro da {loja}." ("freteiro" para
  o Bruno e função entregador; os outros só "da {loja}"). Nunca pôr valores internos (ajuste/vendedor) no texto padrão.
  Pix de cada freteiro (`config/mensagem.pixPor` {Nome: chave}, um campo por nome de "Quem carrega"): na mensagem de quem
  manda vai o Pix dele (`pixDoFreteiro`, pelo primeiro nome); vazio = Pix da loja.
  O Maps/Waze também pesquisa SÓ rua e número (`enderecoMapa` = `enderecoRua`), sem bairro; se cair longe, põem o bairro na hora.
  Entregas antigas (sem `rua`): se o número ficou depois de "casa" ou no complemento, `enderecoRua` acha e junta; número de quadra/lote não conta. Detalhe da entrega tem botão fixo "← Voltar para o mural" no alto.
  Botão voltar do celular: com uma janela aberta (detalhe, formulário, menus) ele fecha a janela e fica no mural
  (`abrirSheet` põe um passo no histórico; `fechar` desfaz; `popstate` fecha). Sem janela aberta: 1º voltar mostra "Toque em voltar
  de novo para sair do mural" (passo `frBase` criado no 1º toque na tela, `baseArmada`), 2º voltar sai.
- Flecha de direção embaixo da foto: ← azul (Araçá até Terra de Areia), → vermelha (Guará até Nova Tramandaí),
  ↑ cinza (centro e resto; Zona Nova é cinza). Pendentes com mesma flecha ficam juntas em cada turno. Editável na tabela.
- Caixa grande do valor no pé do cartão (pendente/problema; entregue fica como antes), cor pela forma de pagamento:
  "💰 Cobrar R$ X" (todos veem), "R$ X pago no Pix", "junto com a nota", "frete na nota", "por conta do vendedor Fulano".
  Embaixo: "Tabela R$ 70 + R$ 10 de Ana" (ajuste em amarelo), condomínio ou valor combinado. Sem "Ver valores": só a forma
  de pagamento, sem valor (e sem ajuste). Valor/ajuste/pagamento saíram das etiquetas do meio nesses cartões.
- Linha "por Ana · às 14:32" no cartão: hora em que foi lançada (`criadoEm`; se não foi hoje, "29/10 às 14:32").
- Quem carregou: nomes do painel (padrão Tiago e Bruno), no menu ao segurar o cartão; aparece embaixo da foto.
  Embaixo do "🚚 Tiago" vai, bem pequena, a hora em que marcaram (`carregadoEm`, `horaCurta`; outro dia = "12/11 14:34").
  "🚚 Minhas entregas — Nome": as pendentes que a pessoa marcou com o próprio nome (primeiro nome do cadastro; Thiago = Tiago,
  `ehMinha`) sobem para uma seção no topo, ACIMA DE TUDO (acima de "Ficaram para trás" e da Prioridade; inclui as atrasadas
  dela), SÓ no celular dela; para os outros a ordem não muda.
  Ao marcar "Entregue" sem ninguém em "Quem carregou", grava como carregador quem marcou (se o primeiro nome dele estiver
  na lista de carregadores do painel); se já tinha alguém marcado, não muda.
  Marcar "Entregue" numa entrega de dia que já passou pergunta: "✓ Entreguei hoje" (muda `data` para hoje) ou
  "📅 Entreguei no dia DD/MM (esqueci de marcar)" (mantém a data). Assim o Acerto e os Valores ficam no dia certo.
- Problema: motivo em faixa vermelha grande no topo do cartão; motivos cadastráveis (`config/motivos`).
- "🚛 Vai vir outra nota do caminhão (não entregar ainda)": caixinha no bloco da nota do formulário (`aguardaCaminhao`).
  No cartão, etiqueta amarela/preta "🚛 AGUARDAR CAMINHÃO / NÃO ENTREGAR" embaixo da foto; no detalhe, faixa amarela no alto.
  Marcar entregue pede confirmação; menu ao segurar (quem pode editar): "🚛 Chegou a nota do caminhão (liberar)".
- Botão "🔎 Consultar" no topo do mural: só para o Bruno (admin) e quem está na lista "Quem carrega" do painel (Tiago),
  pelo primeiro nome (`podeConsultar`). Escolhe uma data (atalhos Ontem/Anteontem/Há 1 semana/Há 1 mês) e o mural abre nela;
  datas com mais de 45 dias são buscadas uma vez (`antigas`). Faixa roxa "🔎 Consultando …" com "Voltar para hoje" quando a data
  está fora da faixa de dias. É só esconder o botão: as regras deixam qualquer membro ler as entregas.
- Entregues descem para "Entregues" minimizadas (uma linha: ✓ nome · bairro · quem carregou); um toque abre no tamanho normal, botão "▴ Minimizar" fecha de novo (só na memória da página). Faixa de dias vai até ~3 meses para a frente.
- Pasta "Produtos que vão com outras notas" (`notasjuntas`, por dia): cada item tem várias fotos + detalhe;
  "Entregue, arquivar" leva para "📦 Arquivados".
- Fotos com mais de 60 dias são apagadas quando o Bruno abre o mural/painel.
- Contador de uso do plano grátis (`uso/{dia}`, estimativa): aviso amarelo 70% e vermelho 90%, só para o Bruno.
- Painel → Valores: gráfico por dia (entregues), totais e tabela por pessoa; entrega com problema não conta em nada.
- Painel → Acerto (só o Bruno): escolhe o dia; entregas ENTREGUES desse dia (`data`) agrupadas por quem carregou, com
  cliente, bairro, como pagou e valor. "💵 Para receber dele" = cobrado na entrega em dinheiro + dinheiro junto com a nota;
  nas "Cobrado na entrega" o Bruno toca 💵 Dinheiro ↔ 📲 Pix (`acertoPix`) se o cliente pagou no Pix na hora. Pix antes,
  frete na nota e por conta do vendedor aparecem à parte. Botão "✓ Recebi R$ X de Fulano" grava `acertadoEm` nas entregas
  (Desfazer apaga). Grupo "Sem quem carregou" pede para marcar no mural. Problema/pendente não entram.
  Se o freteiro tem Pix próprio, o "📲 Pix dele" cobrado na entrega também entra no "Para receber dele" (caiu na conta dele).
- Avisos no Telegram e Google Agenda (painel → Ajustes, tudo em `privado/avisos`, coleção só do admin): (1) pessoas = nome → Gmail
  (Bruno, "Quem carrega", Gerente, Estoquista + extras); (2) `regras` por tipo {pessoas:[nomes ou '__criador' = quem lançou a
  nota], agenda, email}: `nova`, `entregue`, `alteracao`, `problema:<motivo>` (um por motivo de config/motivos) e
  `problema:__outro`; (3) `lembrete` (min antes do turno) e `turnos` {manha:['08:00','12:00'],...}.
  Robô `_agenda/Codigo.gs` (Apps Script na conta do Bruno, a cada 5 min, REST do Firestore com o token dele, LÊ TUDO do painel):
  nova = evento no dia/turno (convidados; lembrete só se o Bruno estiver marcado); entregue/alteração/problema = evento que apita
  na hora (evento começa em +10 min, 2 alarmes para o Bruno: 8 e 0 min antes; o celular às vezes demora para baixar o evento
  e o alarme de 2 min já tinha passado, por isso não apitava). SÓ GOOGLE AGENDA: e-mail foi tirado a pedido do Bruno (sem escopo send_mail). Quem fez a alteração não é avisado.
  Botão "🔔 Enviar teste" (painel → Ajustes): grava `privado/teste` {pedidoEm, para}; o robô (`testeDoPainel`) cria o evento
  "🔔 Teste do Mural de Fretes" e responde no mesmo doc {feitoEm, para, erro} (PATCH pelo REST); o painel mostra a resposta
  ou avisa se o robô não respondeu em 7 min. Problema: motivo novo = novo aviso, o
  velho vira "↺ Trocado"; resolvido = "✔ Resolvido". Registro por entrega em propriedades `e_<id>` (st, pb, pev, ev, visto);
  histórico já avisado em `hvistos`; folga de 10 min no "desde" (relógio dos celulares).
  Tirar alguém: botão × ao lado do nome (menos o Bruno) apaga o Gmail e tira de todas as regras, salvando na hora.
  Pôr alguém sem digitar: botões "+ Nome" com os ativos de Pessoas (`usuarios`, id = Gmail) que ainda não estão na lista; preenche a
  linha vazia de mesmo primeiro nome (ou Gerente se a função for gerente) ou cria uma linha nova. "Quem lançou a nota" já é
  automático (Gmail do login de quem lançou, `criadoPorEmail`).
  Quem está DESATIVADO em Painel → Pessoas (`usuarios.ativo == false`) nunca recebe aviso, nem como "quem lançou a nota".
  POR QUE o Bruno não recebia aviso: o lembrete do evento é antes do turno (ex.: 7h30) e as entregas são lançadas depois; e o dono
  da agenda não recebe convite. Solução: os avisos na hora apitam 2 vezes (lembretes 8 e 0 no evento do Bruno, que começa em +10 min).
  TELEGRAM (16/11, porque o Google Agenda não apitava no Xiaomi do Bruno mesmo com tudo certo): `privado/avisos` ganhou
  `canais` {agenda, telegram} (chips "Avisar por"), `tgToken` (código do robô criado no @BotFather, colado no painel) e
  `tgCod` {Nome: código aleatório do link}. Link de cada pessoa: `https://t.me/<bot>?start=<código>` (botões "📲 Mandar no
  WhatsApp" / "📋 Copiar link"; Bruno = "Abrir no meu Telegram"). O robô (`telegramConferir`, a cada 5 min) faz getMe (grava
  `privado/telegram.bot`/`erro`) e getUpdates (offset em `tg_off`): "/start código" liga a pessoa em `privado/telegram.ids`
  {Nome: chat id} e responde "✅ Pronto". `telegramPara` manda a mensagem na hora para os marcados na regra com Telegram ligado
  (nova entrega também, com dia e turno; quem fez a mudança e desativados não recebem). Teste manda `nomes` e o robô responde `tg`.
  × de uma pessoa tira também o código e o Telegram dela. Dados do cliente passam pelo Telegram (escolha do Bruno).
  Projeto no script.google.com: "MuralDeFretes" (17/11; os "Projeto sem título" eram cópias e devem ser apagados). Precisa do
  appsscript.json com os oauthScopes (sem eles: erro 403 ACCESS_TOKEN_SCOPE_INSUFFICIENT) e, ao autorizar, marcar TODAS as caixinhas.
  18/11: o robô NÃO convida mais ninguém na Agenda (os convites chegavam por e-mail): eventos só na agenda do Bruno (quando ele
  está marcado na regra e o canal Agenda ligado); as outras pessoas recebem SÓ pelo Telegram.
  Telegram funcionando desde 17/11 (robô @muralfretes_colombo_bot, Bruno ligado e teste chegou). Mudança no Codigo.gs = Bruno cola de
  novo (link raw do GitHub) e salva; quem recebe = só no painel.
- Histórico de alterações (painel → Histórico, só o Bruno): o mural grava em `historico` (função `registrar`, chamada no `salvar`
  e no apagar) {entregaId, cliente, dia, acao, mudancas:[{campo,antes,depois}], por, porEmail, uid, em}. Compara com a cópia do
  servidor (`servidor`, de cada snapshot), ignora vazio = "não". Regras: cria só em nome próprio, ninguém muda/apaga, só admin lê.
  Entregas novas também gravam `criadoPorEmail` (para o aviso "quem lançou a nota").
- Painel → Ajustes organizado em blocos que abrem e fecham (`details.sec`, lembra os abertos em localStorage `painel_secs`),
  em 3 grupos: 🔔 Avisos (✈ Telegram, 👥 Quem recebe cada aviso, 🧪 Testar, 📅 Google Agenda), 🚚 Mural (💬 Mensagem do
  WhatsApp, 🏪 Loja e entregas, 🗺️ Tabela de fretes, ⚠ Motivos) e ⚙ Sistema (📊 Uso do plano, 🧹 Fotos antigas).
  Os blocos de avisos têm cada um um botão "Salvar avisos" (`data-avsalvar`, todos salvam tudo de privado/avisos).
- Login: SÓ `signInWithPopup` (comum.js `entrarComGoogle`). NÃO usar signInWithRedirect: com site em github.io e login em
  firebaseapp.com os navegadores separam a memória e dá "Não foi possível processar a solicitação devido à falta do estado
  inicial" (aconteceu com um vendedor em 18/11). Popup bloqueado = mensagem pedindo para tocar de novo.
  Plano B (18/11, o Andres no Chrome voltava sempre para a tela de entrar): "Não consegue entrar? Receber um link no e-mail" na
  tela de entrar do mural (`mandarLinkEmail` no comum.js, e-mail guardado em localStorage `fr_email_link`; ao abrir pelo link,
  o comum.js termina o login com signInWithEmailLink e limpa o endereço; sem e-mail guardado, pergunta). Precisa do provedor
  E-mail/senha com "Link do e-mail (login sem senha)" ligado no Firebase (passo do Bruno). Regras: só exigem email_verified (ok).
  DESLIGADO em 18/11 a pedido do Bruno: `LOGIN_POR_EMAIL = false` no comum.js esconde o botão (código e Firebase ficam prontos;
  para religar é só pôr true e trocar o ?v=).
- APK para Android (18/11, para mandar a um vendedor): `MuralDeFretes.apk` na raiz (link
  https://brunolemosxd.github.io/frete-rapido/MuralDeFretes.apk). Projeto em `_apk/` (Gradle, AGP 8.7.3, androidbrowserhelper 2.5.0,
  Trusted Web Activity: abre o mural pelo Chrome, por isso o login do Google funciona; WebView NÃO serve, o Google bloqueia login nela).
  Pacote `io.github.brunolemosxd.muralfretes`. Sem assetlinks.json (ficaria na raiz do site = repositório do OrçaOn, não misturar),
  então aparece uma barrinha com o endereço no alto. Chave de assinatura NÃO está no repo (era temporária): se gerar APK novo com
  outra chave, a pessoa precisa desinstalar o antigo antes. Como gerar: SDK (platforms;android-34, build-tools;34.0.0) +
  `MF_KEYSTORE=... MF_KEYPASS=... gradle assembleRelease` em `_apk/`. Como o app só abre o site, mudanças no mural chegam sozinhas.
- Câmera DENTRO do mural (18/11, Moto G35 "bugava" ao tirar foto: abrir o app da câmera fazia o Chrome ser fechado e a página
  recarregar): `obterFoto(max,q)` abre tela preta com a câmera (getUserMedia, câmera de trás), botão amarelo redondo tira a foto,
  "🖼️ Galeria" escolhe uma pronta (input #file SEM capture), "✕ Cancelar". Usada no formulário (#fbtn, +Outra foto) e na pasta
  (`pegarFoto`). Põe um passo no histórico (frCam): o voltar do celular fecha só a câmera. Sem permissão: explica o cadeado 🔒.
- Tema claro/escuro/automático no topo.
- Ícone e nome na tela de início do celular: "Mural de Fretes", ícone "MF" branco + faixa amarela + 🚚 em fundo azul
  (`mf-32/180/192/512.png`, `manifest.json` com display "standalone": o ícone abre numa janela própria, sem as páginas de outros sites para trás;
  se o login do Google falhar nesse modo, voltar para "browser"). Sem isso o celular
  pegava o ícone do OrçaOn (raiz do mesmo site). O cabeçalho do app continua "Frete Rápido". Nome definitivo/Play Store: o Bruno vai ver.

## Como trabalhar
- Seguir a skill `.claude/skills/frete-rapido/SKILL.md`: teste pronto (`node .claude/skills/frete-rapido/testar.js --saida <pasta>`,
  Firebase de mentira em `fakefb.js` com entregas de exemplo) e lista de conferência antes de subir.
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
