---
name: frete-rapido
description: Como mexer, testar e entregar mudanças no mural Frete Rápido (index.html, painel.html, comum.js, firestore.rules). Usar em TODO pedido de mudança ou conferência neste repositório, antes de subir para a main.
---

# Frete Rápido: mexer, testar e entregar

O que foi combinado com o Bruno está no `CLAUDE.md` da raiz. Esta skill é o **jeito de trabalhar**: o teste pronto
e a lista de conferência. Tudo em português do Brasil, explicado de forma simples.

## 1. Antes de mexer
- `git pull origin main` (o Bruno às vezes muda coisas pelo celular).
- Ler o trecho envolvido (as funções do cartão são `cardHTML`, `valorHTML`, `msgWA`, `enderecoRua`; o formulário é `abrirForm`).
- Antes de deixar algo fixo no código (texto, lista, valor), ver se não é melhor o Bruno poder mudar no painel → Ajustes (`config/geral`, `config/mensagem`).
- Se o pedido não estiver claro, mas der para entender o objetivo, fazer e explicar a escolha. Perguntar só se for decisão dele.

## 2. Testar (sem internet, com Firebase de mentira)
```bash
cd /caminho/do/frete-rapido
node .claude/skills/frete-rapido/testar.js --saida <pasta-do-scratchpad>/teste
```
O script:
- confere a sintaxe do `comum.js` e de cada `<script>` do `index.html` e `painel.html`;
- confere se `comum.js?v=` é igual nos dois (regra 1);
- abre o mural como **Bruno**, **entregador (Tiago)** e **vendedor (Ana)**, em tema claro e escuro;
- abre o painel em todas as abas;
- tira fotos de tela e lista, por cartão, o que vai no Copiar endereço, no Maps, na caixa de valor e na mensagem do WhatsApp;
- sai com código 1 se achar problema.

Depois, **olhar as fotos** (Read nos .png) das partes que mudaram. Mandar ao Bruno (SendUserFile) só a foto que mostra a mudança.

### Teste próprio (clicar, preencher, conferir o que foi gravado)
```js
const {abrir,resumoMural}=require('/caminho/do/frete-rapido/.claude/skills/frete-rapido/testar.js');
const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch();
  const {page,erros}=await abrir(b,{quem:'bruno',tema:'light',extra:{entregas:{x1:{/* entrega a mais */}}}});
  await page.click('#fab');                      // nova entrega
  // ... preencher, page.click('#fsave') ...
  console.log(await page.evaluate(()=>window.__store.entregas)); // o que foi gravado
  console.log(erros);await b.close()})();
```
- `quem`: `'bruno'` (admin), `'entregador'` (sem ver valores), `'vendedor'` (lança e vê valores).
- `arquivo:'painel.html'` abre o painel (só funciona como Bruno). As abas são `[data-t="pessoas|valores|ajustes"]`.
- Ajustes do painel: `extra:{config:{geral:{...},mensagem:{...}}}` (sem eles valem `GERAL_PADRAO` e `MSG_PADRAO` do comum.js).
- Entregas de exemplo em `fakefb.js`: nova com AP, cobrar com ajuste, prioridade, entregue, problema, endereços antigos, por conta do vendedor, amanhã.
- Foto da nota no formulário: `page.click('#fbtn')` e depois `page.setInputFiles('#file', {name:'a.png',mimeType:'image/png',buffer:...})`.
- Abrir edição: tocar no nome do cartão, depois `[data-a="mais"]` e `[data-a="editar"]`.
- O botão "+ Nova entrega" fica por cima dos cartões na foto de tela; esconder com `#fab{display:none}` antes de fotografar.

## 3. Lista de conferência antes de subir
- [ ] Mudou `comum.js`? Trocar `comum.js?v=AAAAMMDDx` no `index.html` **e** no `painel.html` (o teste avisa).
- [ ] Mudou `firestore.rules`? Avisar o Bruno para republicar e mandar o texto completo num bloco de código (regra 2).
- [ ] Valores: total do dia só para o Bruno; valor de cada entrega só com "Ver valores"; "💰 Cobrar" para todos.
- [ ] Copiar endereço e Maps/Waze: **só rua e número**, nunca AP/complemento nem bairro.
- [ ] Mensagem do WhatsApp: nunca valores internos (ajuste, divisão com vendedor); curta (até ~600 letras).
- [ ] Botões dentro do cartão têm a classe `cbtn` (senão o toque abre o detalhe ou arrasta o cartão).
- [ ] Testou nos dois temas (claro/escuro) e no cartão vermelho de prioridade.
- [ ] Atualizou o `CLAUDE.md` (seção "Como funciona") com o que foi combinado.
- [ ] `testar.js` passou sem problemas.

## 4. Subir
O Bruno aprovou subir direto na `main`:
```bash
git add -A && git commit -m "<o que mudou, em português>" && git push origin main
```
(com as linhas de autoria que o sistema pedir). O site atualiza em ~5 a 10 minutos.

## 5. Responder ao Bruno
Curto e simples, nesta ordem:
1. O que mudou (com exemplo do que aparece na tela).
2. O que **não** foi testado de verdade (Firebase real, celular, câmera, WhatsApp/Maps de verdade).
3. Passo manual dele, se houver (com link em bloco de código).
4. Os dois links, cada um em bloco de código:
```
https://brunolemosxd.github.io/frete-rapido/
```
```
https://brunolemosxd.github.io/frete-rapido/painel.html
```
