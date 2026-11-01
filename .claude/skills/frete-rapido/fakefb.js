/* Firebase de mentira para testar o mural e o painel sem internet.
   Entra no lugar do firebase-firestore-compat.js (os outros scripts do gstatic voltam vazios).
   Antes de abrir a página dá para escolher:
     window.__quem  = 'bruno' (padrão) | 'entregador' | 'vendedor'
     window.__extra = { entregas:{id:{...}}, config:{...}, ... }  (junta com os dados de exemplo)
   Depois de abrir: window.__store tem tudo o que foi gravado. */
(function(){
const dia=n=>{const d=new Date();d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
const hoje=dia(0),agora=Date.now();
const thumb='data:image/svg+xml;base64,'+btoa('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="#bbb"/></svg>');
const E=(o)=>({data:hoje,status:'pendente',criadoEm:agora-3600e3,criadoPorNome:'Ana',criadoPorUid:'u-ana',thumb,turno:'qualquer',
  obs:'',postits:[],contatos:[],fotosExtras:0,...o});
const store={
 entregas:{
  // nova (campos rua/numero), só depois das 15:00, frete na nota, com AP
  a:E({cliente:'Maria Souza',clienteNome:'Maria',clienteSobrenome:'Souza',fone:'(51) 99876-5432',bairro:'Zona Nova',rua:'Rua Sepé',numero:'1450',semNumero:false,
      endereco:'Rua Sepé, 1450',complemento:'Ap 302, Bloco B',turno:'apos',hora:'15:00',frete:70,freteBase:70,freteTabela:70,freteAjuste:0,pagamento:'nota',fretePago:true,
      notasLoja:1,notasDeposito:0,itens:[{nome:'Geladeira',local:'loja',qtd:1}]}),
  // cobrar na entrega com ajuste +10 da Ana, condomínio, loja + depósito, 2 notas, outro contato, nome em maiúsculas, lançada ontem
  b:E({cliente:'JOÃO LIMA',clienteNome:'JOÃO',clienteSobrenome:'LIMA',fone:'(51) 98111-2222',contatos:[{nome:'Filha',fone:'(51) 98222-3333'}],bairro:'Guará',
      rua:'Rua das Gaivotas',numero:'88',semNumero:false,endereco:'Rua das Gaivotas, 88',complemento:'',condominio:true,turno:'manha',
      frete:110,freteBase:100,freteTabela:80,freteAjuste:10,ajustePor:'Ana',pagamento:'entrega',fretePago:false,
      notasLoja:1,notasDeposito:1,itens:[{nome:'Sofá',local:'deposito',qtd:1},{nome:'TV',local:'loja',qtd:2}],criadoEm:agora-26*3600e3,observacao:'Ligar antes'}),
  // prioridade + depois das 17:30 + frete na nota + quem carregou; endereço antigo (sem rua/numero)
  c:E({cliente:'Pedro Alves',fone:'(51) 3665-1234',bairro:'Araçá',endereco:'Av. Paraguassu, 3020',turno:'apos',hora:'17:30',prioridade:true,
      frete:70,pagamento:'nota',fretePago:true,notasDeposito:1,itens:[{nome:'Fogão',local:'deposito',qtd:1}],carregadoPor:'Tiago'}),
  // já entregue (aparece minimizada)
  d:E({cliente:'Carla Dias',fone:'(51) 98000-3333',bairro:'Zona Nova',rua:'Rua C',numero:'9',endereco:'Rua C, 9',turno:'tarde',status:'entregue',carregadoPor:'Bruno',
      frete:70,pagamento:'pix',fretePago:true,notasDeposito:1,itens:[{nome:'Colchão',local:'deposito',qtd:1}]}),
  // com problema
  e:E({cliente:'Luiz Prado',fone:'(51) 98000-1111',bairro:'Girassol',rua:'Rua B',numero:'5',endereco:'Rua B, 5',status:'problema',obs:'Cliente ausente',
      frete:70,pagamento:'entrega',notasLoja:1,itens:[{nome:'TV',local:'loja',qtd:1}]}),
  // antigas: número no complemento / depois de "casa"
  f:E({cliente:'Marisete Mathes',criadoPorUid:'u-bruno',fone:'(51) 99905-2258',bairro:'Capão Novo (Centro)',endereco:'Rua das tulipa',complemento:'3252- germinado',turno:'tarde',
      frete:90,freteBase:90,freteTabela:90,freteAjuste:0,pagamento:'junto',fretePago:true,notasDeposito:1,itens:[{nome:'Máquina de lavar',local:'deposito',qtd:1}],observacao:'Frete na nota.'}),
  g:E({cliente:'Rosa Lemes',fone:'(51) 99905-2200',bairro:'Praia do Barco',endereco:'Rua das Garças casa 1234',frete:80,pagamento:'pix',fretePago:true,
      notasLoja:1,itens:[{nome:'Cama box',local:'loja',qtd:1}]}),
  // por conta do vendedor
  h:E({cliente:'Sônia Reis',fone:'(51) 98000-4444',bairro:'Zona Nova',rua:'Rua D',numero:'12',endereco:'Rua D, 12',turno:'tarde',frete:70,freteBase:70,freteTabela:70,freteAjuste:0,
      pagamento:'vendedor',fretePor:'Carlos',notasLoja:1,itens:[{nome:'Rack / painel',local:'loja',qtd:1}]}),
  // amanhã
  i:E({data:dia(1),cliente:'Ivo Nunes',fone:'(51) 98000-5555',bairro:'Atlântida',rua:'Rua E',numero:'300',endereco:'Rua E, 300',frete:80,pagamento:'entrega',
      notasLoja:1,itens:[{nome:'Freezer',local:'loja',qtd:1}]})
 },
 usuarios:{
  'tiago@gmail.com':{nome:'Tiago',ativo:true,funcao:'entregador',naLista:false,perms:{lancar:false,editarTodas:false,apagar:false,marcar:true,verValores:false,pasta:false}},
  'ana@gmail.com':{nome:'Ana Santos',ativo:true,funcao:'vendedor',naLista:true,perms:{lancar:true,editarTodas:false,apagar:false,marcar:false,verValores:true,pasta:true}}
 },
 config:{equipe:{vendedores:['Ana Santos','Carlos','Josiane']},mensagem:{pix:'12.345.678/0001-90'}},
 notasjuntas:{n1:{data:hoje,texto:'Vai com a nota da Maria',fotos:[thumb],em:agora,porNome:'Ana'}},
 fotos:{},uso:{}
};
for(const [c,docs] of Object.entries(window.__extra||{}))store[c]={...(store[c]||{}),...docs};
window.__store=store;

const listeners=[];
const notify=()=>setTimeout(()=>listeners.forEach(l=>l()),0);
const snap=(c,id)=>({id,exists:!!(store[c]||{})[id],data:()=>store[c][id],ref:docRef(c,id)});
const cmp={'==':(a,b)=>a===b,'!=':(a,b)=>a!==b,'>=':(a,b)=>a>=b,'<=':(a,b)=>a<=b,'<':(a,b)=>a<b,'>':(a,b)=>a>b};
function query(c,f){
  const run=()=>Object.keys(store[c]||{}).map(id=>snap(c,id)).filter(d=>f.every(([k,op,v])=>cmp[op](d.data()[k],v)));
  const res=()=>{const d=run();return {docs:d,size:d.length,empty:!d.length,docChanges:()=>d,forEach:fn=>d.forEach(fn)}};
  return {where:(k,op,v)=>query(c,[...f,[k,op,v]]),get:async()=>res(),doc:id=>docRef(c,id),
    onSnapshot(cb){const l=()=>cb(res());listeners.push(l);setTimeout(l,0);return()=>{const i=listeners.indexOf(l);if(i>=0)listeners.splice(i,1)}}};
}
// FieldValue.increment de verdade, para o contador de uso
const INC=Symbol('inc');
function aplicar(old,d){const o={...(old||{})};for(const [k,v] of Object.entries(d))o[k]=v&&v[INC]!==undefined?(Number(o[k])||0)+v[INC]:v;return o}
function docRef(c,id){return {id,get:async()=>snap(c,id),
  set:async(d,o)=>{store[c]=store[c]||{};store[c][id]=aplicar(o&&o.merge?store[c][id]:{},d);notify()},
  update:async d=>{if(!store[c]||!store[c][id])throw Object.assign(new Error('not-found'),{code:'not-found'});store[c][id]=aplicar(store[c][id],d);notify()},
  delete:async()=>{if(store[c])delete store[c][id];notify()},
  onSnapshot(cb){const l=()=>cb(snap(c,id));listeners.push(l);setTimeout(l,0);return()=>{}}}}

const QUEM={bruno:{uid:'u-bruno',email:'brunolemosxd@gmail.com',emailVerified:true,displayName:'Bruno Lemos'},
  entregador:{uid:'u-tiago',email:'tiago@gmail.com',emailVerified:true,displayName:'Tiago'},
  vendedor:{uid:'u-ana',email:'ana@gmail.com',emailVerified:true,displayName:'Ana Santos'}};
const user=QUEM[window.__quem||'bruno'];
const auth={currentUser:user,onAuthStateChanged(cb){setTimeout(()=>cb(user),0)},signOut:async()=>{},signInWithPopup:async()=>({user}),signInWithRedirect:async()=>{}};
window.firebase={initializeApp(){},
  auth:Object.assign(()=>auth,{GoogleAuthProvider:function(){this.setCustomParameters=()=>{}}}),
  firestore:Object.assign(()=>({collection:c=>query(c,[])}),{FieldValue:{increment:n=>({[INC]:n}),serverTimestamp:()=>Date.now()}})};
})();
