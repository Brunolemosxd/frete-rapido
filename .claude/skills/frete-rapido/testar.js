#!/usr/bin/env node
/* Teste do Frete Rápido sem internet (Firebase de mentira + Playwright).
   Uso:   node .claude/skills/frete-rapido/testar.js [--saida PASTA]
   Faz:   1) confere a sintaxe do comum.js e dos <script> do index.html e painel.html
          2) confere se o comum.js?v=... é o mesmo nos dois arquivos
          3) abre o mural como Bruno, entregador e vendedor (claro) e Bruno (escuro), e o painel em cada aba
          4) tira fotos de tela e mostra, de cada cartão, o que o Copiar endereço / Maps / WhatsApp levam
   Sai com código 1 se achar erro.
   Para testes próprios:  const {abrir,resumoMural}=require('./.claude/skills/frete-rapido/testar.js') */
const fs=require('fs'),path=require('path'),os=require('os'),{execFileSync}=require('child_process');
const RAIZ=path.resolve(__dirname,'../../..');
const FAKE=fs.readFileSync(path.join(__dirname,'fakefb.js'),'utf8');

function checarCodigo(){
  const prob=[],tmp=fs.mkdtempSync(path.join(os.tmpdir(),'fr-'));
  const check=(arq,nome)=>{try{execFileSync(process.execPath,['--check',arq],{stdio:'pipe'})}catch(e){prob.push(`Sintaxe em ${nome}: ${String(e.stderr).split('\n').slice(0,5).join(' ')}`)}};
  check(path.join(RAIZ,'comum.js'),'comum.js');
  const versoes={};
  for(const f of ['index.html','painel.html']){
    const html=fs.readFileSync(path.join(RAIZ,f),'utf8');let n=0;
    for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g)){const a=path.join(tmp,`${f}.${++n}.js`);fs.writeFileSync(a,m[1]);check(a,`${f} (script ${n})`)}
    versoes[f]=(html.match(/comum\.js\?v=([\w.-]+)/)||[])[1];
  }
  if(versoes['index.html']!==versoes['painel.html'])prob.push(`comum.js?v= diferente: index=${versoes['index.html']} painel=${versoes['painel.html']} (regra 1 do CLAUDE.md)`);
  return {prob,versao:versoes['index.html']};
}

// abre index.html ou painel.html com o Firebase de mentira; quem: bruno | entregador | vendedor
async function abrir(browser,{arquivo='index.html',quem='bruno',tema='light',extra=null,largura=400,altura=850}={}){
  const page=await browser.newPage({viewport:{width:largura,height:altura},deviceScaleFactor:2});
  const erros=[];
  page.on('pageerror',e=>erros.push(e.message));
  page.on('console',m=>{if(m.type()==='error'&&!/Failed to load resource/.test(m.text()))erros.push(m.text())});
  await page.route(/^https?:/,r=>{const u=r.request().url();
    if(u.includes('gstatic.com')&&u.endsWith('firestore-compat.js'))return r.fulfill({body:FAKE,contentType:'text/javascript'});
    if(u.includes('gstatic.com'))return r.fulfill({body:'',contentType:'text/javascript'});
    return r.abort()});
  await page.addInitScript(([q,t,x])=>{window.__quem=q;window.__extra=x;try{localStorage.setItem('freterapido_tema',t)}catch{}},[quem,tema,extra]);
  await page.goto('file://'+path.join(RAIZ,arquivo));await page.waitForTimeout(900);
  return {page,erros};
}

// o que cada cartão mostra e o que os botões levam
async function resumoMural(page){
  return page.$$eval('.card',cs=>cs.map(c=>{
    const t=s=>(c.querySelector(s)?.innerText||'').replace(/\s+/g,' ').trim();
    const wa=[...c.querySelectorAll('a.wa')].map(a=>{const u=new URL(a.href);return u.pathname.slice(1)+' | '+(u.searchParams.get('text')||'')});
    return {id:c.dataset.id,mini:c.classList.contains('mini'),nome:t('.who')||t('.mnome'),endereco:t('.end'),
      copiar:c.querySelector('.cbtns [data-copiar]')?.dataset.copiar||'',maps:c.querySelector('.cbtns a')?decodeURIComponent(new URL(c.querySelector('.cbtns a').href).searchParams.get('query')||''):'',
      valor:t('.vbox'),wa};
  }));
}

async function main(){
  const i=process.argv.indexOf('--saida'),saida=i>0?process.argv[i+1]:path.join(os.tmpdir(),'frete-teste');
  fs.mkdirSync(saida,{recursive:true});
  const {prob,versao}=checarCodigo();
  console.log(`comum.js?v=${versao}`);
  const {chromium}=require('playwright'),browser=await chromium.launch();
  for(const [quem,tema] of [['bruno','light'],['entregador','light'],['vendedor','light'],['bruno','dark']]){
    const {page,erros}=await abrir(browser,{quem,tema});
    await page.evaluate(()=>{const f=document.querySelector('#fab');if(f)f.style.display='none'});
    const foto=path.join(saida,`mural-${quem}-${tema}.png`);await page.screenshot({path:foto,fullPage:true});
    if(tema==='light'){console.log(`\n=== Mural como ${quem} ===`);
      for(const c of await resumoMural(page)){console.log(`- [${c.id}] ${c.nome}${c.mini?' (minimizada)':''}`);
        if(!c.mini){console.log(`    copiar: "${c.copiar}" | maps: "${c.maps}"\n    valor: ${c.valor||'-'}`);
          if(quem==='bruno')c.wa.forEach(w=>console.log('    wa: '+w.replace(/\n/g,' ⏎ ').slice(0,160)+'…'))}}}
    erros.forEach(e=>prob.push(`Erro no mural (${quem}/${tema}): ${e}`));await page.close();
  }
  // celular estreito (360 px): nada pode passar da borda do cartão
  {const {page,erros}=await abrir(browser,{largura:360});
    const fora=await page.$$eval('.card:not(.mini)',cs=>cs.flatMap(c=>{const r=c.getBoundingClientRect();
      return [...c.querySelectorAll('.face *')].filter(x=>{const q=x.getBoundingClientRect();return q.width&&q.right>r.right+1}).map(x=>c.dataset.id+':'+(x.className||x.tagName))}));
    if(fora.length)prob.push('Passou da borda do cartão em tela de 360 px: '+[...new Set(fora)].slice(0,8).join(', '));
    erros.forEach(e=>prob.push(`Erro no mural (360 px): ${e}`));await page.close()}
  {const {page,erros}=await abrir(browser,{arquivo:'painel.html'});
    for(const b of await page.$$('.tabs [data-t]')){const t=await b.getAttribute('data-t');await b.click();await page.waitForTimeout(400);
      await page.screenshot({path:path.join(saida,`painel-${t}.png`),fullPage:true})}
    erros.forEach(e=>prob.push(`Erro no painel: ${e}`));await page.close()}
  await browser.close();
  console.log(`\nFotos de tela em: ${saida}`);
  if(prob.length){console.log('\nPROBLEMAS:\n- '+prob.join('\n- '));process.exit(1)}
  console.log('\nTudo certo: sintaxe ok, versão do comum.js igual, sem erros nas páginas.');
}
module.exports={abrir,resumoMural,checarCodigo,RAIZ};
if(require.main===module)main().catch(e=>{console.error(e);process.exit(1)});
