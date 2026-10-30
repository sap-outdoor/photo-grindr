const { test } = require('node:test');
const assert = require('node:assert/strict');
const { gesture, nextPosition, pendingPosition } = require('./app.js');
test('home and gallery cannot vote or Undo, including keyboard U; review U retries unresolved request', async () => {
 const browser=undoBrowser({review:true}); await browser.settle();
 const key=()=>browser.events.keydown({key:'u',target:{tagName:'BODY'},preventDefault(){}});
 key(); await browser.settle();
 assert.equal(browser.calls.some(c=>c.path==='/api/undo'),false);
 await browser.click('resume'); await browser.click('nav-explore');
 const before=browser.calls.length;
 key(); await browser.click('like'); await browser.click('dislike'); await browser.settle();
 assert.equal(browser.calls.length,before);
 assert.equal(browser.element('undo').disabled,true);
 await browser.click('nav-operate'); await browser.click('resume');
 key(); await browser.settle(); key(); await browser.settle();
 const undos=browser.calls.filter(c=>c.path==='/api/undo');
 assert.equal(undos.length,2); assert.deepEqual(undos[0].body,undos[1].body);
 const template=require('node:fs').readFileSync(require('node:path').join(__dirname,'..','templates','index.html'),'utf8');
 assert.doesNotMatch(template,/id="gallery-undo"/);
});
test('decisions use compact live status, not routine success banners; bulk actions appear only with selection', async () => {
 const browser=undoBrowser({review:true,loseResponse:false}); await browser.settle(); await browser.click('resume');
 await browser.click('like');
 assert.equal(browser.element('notice').hidden,true);
 assert.match(browser.element('saved-state').textContent,/uloženo/i);
 await browser.click('nav-explore');
 assert.equal(browser.element('bulk-actions').hidden,true);
 await browser.click('select-page'); assert.equal(browser.element('bulk-actions').hidden,false);
 await browser.click('select-page'); assert.equal(browser.element('bulk-actions').hidden,true);
});
test('workspace is controls-first with collapsed bilingual help, modest PIN/gallery and one CSV action', () => {
 const fs=require('node:fs'),path=require('node:path');
 const html=fs.readFileSync(path.join(__dirname,'..','templates','index.html'),'utf8');
 const entry=fs.readFileSync(path.join(__dirname,'..','templates','enter.html'),'utf8');
 assert.match(html,/<details class="how-card">\s*<summary>\{\{ "How it works" if lang == 'en' else "Jak to funguje"/);
 assert.doesNotMatch(html,/<details[^>]*\bopen\b/);
 assert.match(html,/Like Tinder: swipe right/);
 assert.doesNotMatch(html,/edition-mark|class="eyebrow"|class="section-label"/);
 assert.ok(html.indexOf('id="package-options"')<html.indexOf('class="counts-grid"'));
 assert.equal((html.match(/href="\/export.csv"/g)||[]).length,1);
 assert.match(html,/"Selected" if lang == 'en' else "Vybrané"/);
 assert.match(html,/"Rejected" if lang == 'en' else "Zamítnuté"/);
 assert.doesNotMatch(entry,/A good shot|class="eyebrow"|entry-copy/);
 for(const id of ['review-home','undo','like','dislike','select-page','return-selected']) assert.match(html,new RegExp(`id="${id}"`));
 assert.match(html,/id="saved-state"[^>]*aria-live="polite"/);
 assert.match(html,/_footer.html/); assert.match(entry,/_footer.html/);
 const css=fs.readFileSync(require.resolve('./style.css'),'utf8');
 assert.match(css,/grid-template-rows:[^}]*minmax\(0,1fr\)/);
 assert.match(css,/summary:focus-visible/);
});
test('literal photo paths stay available as tooltips without repeated gallery path rows', async () => {
 const browser=undoBrowser({review:true,loseResponse:false}); await browser.settle(); await browser.click('resume');
 assert.equal(browser.element('photo-path').title,'1.jpg');
 await browser.click('nav-explore');
 const label=browser.element('gallery-grid').children[0].children[0];
 assert.equal(label.children[2].title,'Like');
 assert.equal(label.children[3].className,'gallery-path');
});
test('pending navigation preserves server indices, normalizes decided positions and restores undone items', () => {
 const items = [{decision:'liked'},{decision:null},{decision:'disliked'},{decision:null}];
 assert.equal(pendingPosition(items,0),1);
 assert.equal(pendingPosition(items,1,1),3);
 assert.equal(pendingPosition(items,3,-1),1);
 assert.equal(pendingPosition(items,3,1),3);
 items[3].decision='liked';
 assert.equal(pendingPosition(items,3),1);
 items[1].decision='liked';
 assert.equal(pendingPosition(items,1),-1);
 items[2].decision=null;
 assert.equal(pendingPosition(items,1),2);
 assert.equal(pendingPosition([],0),-1);
});
test('horizontal swipe decides while vertical motion never does', () => {
 assert.equal(gesture({dx:90,dy:10,x:100,width:400}), 'liked');
 assert.equal(gesture({dx:-90,dy:10,x:100,width:400}), 'disliked');
 assert.equal(gesture({dx:70,dy:95,x:10,width:400}), null);
});
test('edge taps navigate, drags and center taps do not', () => {
 assert.equal(gesture({dx:1,dy:1,x:10,width:400}), 'previous');
 assert.equal(gesture({dx:1,dy:1,x:390,width:400}), 'next');
 assert.equal(gesture({dx:1,dy:1,x:200,width:400}), null);
 assert.equal(gesture({dx:30,dy:1,x:390,width:400}), null);
});
test('navigation clamps at either end and handles an empty package', () => {
 assert.equal(nextPosition(0,-1,5),0);
 assert.equal(nextPosition(4,1,5),4);
 assert.equal(nextPosition(2,1,5),3);
 assert.equal(nextPosition(0,1,0),0);
});

function undoBrowser({loseResponse = true, loseRefresh = false, review = false, cookie = '', startPosition = 0, initialDecisions = null, failNavigation = false, serverState = null, storage = new Map(), expireDecision = false, decisionGate = null, failDecision = false, reducedMotion = false, animationAPI = true} = {}) {
 const vm = require('node:vm');
 const fs = require('node:fs');
 const elements = new Map(), calls = [], replays = new Map(), animations = [];
 let ready = [], answered = 2, serial = 0, undoCalls = 0, position = startPosition;
 const decisions = initialDecisions || ['liked', null, 'disliked', null];
 if (review) answered=decisions.filter(value=>value!=null).length;
 const element = id => {
  if (!elements.has(id)) elements.set(id, {id, hidden:false, disabled:false, textContent:'', value:'Alice',
   classList:{toggle(){}, add(){}}, children:[], listeners:{}, addEventListener(name, fn){this.listeners[name]=fn;},
   attrs:{}, setAttribute(name,value){this.attrs[name]=value;}, getAttribute(name){return this.attrs[name] || '';}, removeAttribute(name){delete this.attrs[name]; if(name==='src') this.src='';}, replaceChildren(){this.children=[];}, append(...children){this.children.push(...children);}, focus(){}, showModal(){this.open=true;}, close(){this.open=false;}, setPointerCapture(){}, style:{setProperty(name,value){this[name]=value;}}, naturalWidth:400, naturalHeight:300, complete:true, remove(){this.removed=true;}, getBoundingClientRect(){return {left:20,top:150,width:400,height:300};}, animate:animationAPI ? function(frames,options){const animation={node:this,frames,options,cancel(){this.cancelled=true;this.oncancel?.();}}; animations.push(animation);return animation;} : undefined});
  return elements.get(id);
 };
 const packageState = () => ({id:1,status:'active',position,answered,total:review?4:2,items:(review?decisions:[0,1].map(id=>id<answered?'liked':null)).map((decision,id)=>({id,version:1,filename:`${id}.jpg`,relative_path:`${id}.jpg`,preview_url:`/${id}`,decision}))});
 const events={};
 const document = {cookie, documentElement:{lang:'cs'}, getElementById:element, createElement:tag=>{const node=element(`created-${elements.size}`);node.tagName=tag.toUpperCase();return node;}, querySelector:()=>({content:'csrf'}), querySelectorAll:selector=>selector==='[data-size]' || selector==='.gallery-select input' ? [] : [...elements.values()],
  body:{children:[],append(node){this.children.push(node);},classList:{toggle(){}}}, addEventListener(name, fn){if(name==='DOMContentLoaded') ready.push(fn); else events[name]=fn;}};
 const fetch = async (path, options) => {
  const body = options.body && JSON.parse(options.body); calls.push({path,body});
  if (path === '/api/activity' || path === '/api/return') return {ok:true,status:200,json:async()=>({})};
  if (path.startsWith('/api/gallery')) return {ok:true,status:200,json:async()=>({items:[{id:99,version:1,filename:'Photo',relative_path:'Like',preview_url:'/gallery/99',decision:path.includes('disliked')?'disliked':'liked',judged_by:'Like'}],page:1,pages:1,total:1})};
  if (review && path.startsWith('/api/packages/')) return {ok:true,status:200,json:async()=>({package:packageState()})};
  if (review && path === '/api/navigate') { if(failNavigation) return {ok:false,status:typeof failNavigation === 'number' ? failNavigation : 503,json:async()=>({})}; position=body.position; return {ok:true,status:200,json:async()=>({package:packageState()})}; }
  if (review && path === '/api/decision' && expireDecision) {
   Object.assign(serverState,{package:null,expired:true,expired_package_id:1});
   return {ok:false,status:409,json:async()=>({code:'expired',error:'Package expired.'})};
  }
  if (review && path === '/api/decision') { if(decisionGate) await decisionGate; if(failDecision==='network') throw new TypeError('Network unavailable'); if(failDecision) return {ok:false,status:failDecision,json:async()=>({error:'Not saved'})}; decisions[body.photo_id]=body.value; answered++; return {ok:true,status:200,json:async()=>({package:packageState(),complete:answered===4})}; }
  if (path === '/api/undo') {
   undoCalls++;
   if (!replays.has(body.request_id)) { answered--; if(review) {decisions[3]=null; position=3;} replays.set(body.request_id,{package:packageState()}); }
   if (loseResponse && undoCalls === 1) throw new TypeError('Response lost after commit');
   return {ok:true,status:200,json:async()=>replays.get(body.request_id)};
  }
  if (path === '/api/state') {
   if (loseRefresh && undoCalls === 1) throw new TypeError('Refresh unavailable');
   return {ok:true,status:200,json:async()=>serverState || ({player:{id:1,username:'Alice'},package:packageState(),counts:{liked:answered},expired:false})};
  }
  throw new Error(`Unexpected intervening request: ${path}`);
 };
 const sessionStorage={getItem:key=>storage.get(key) ?? null,setItem:(key,value)=>storage.set(key,String(value))};
 const context = vm.createContext({document,fetch,sessionStorage,crypto:{randomUUID:()=>`undo-${++serial}`},window:{scrollTo(){},innerWidth:1000,matchMedia:()=>({matches:reducedMotion}),addEventListener(name,fn){events[name]=fn;}},Image:class {},setTimeout,clearTimeout});
 if(fs.existsSync(require('node:path').join(__dirname,'i18n.js'))) vm.runInContext(fs.readFileSync(require.resolve('./i18n.js'),'utf8'),context);
 vm.runInContext(fs.readFileSync(require.resolve('./app.js'),'utf8'),context);
 ready.forEach(fn=>fn());
 return {element,calls,document,events,animations,ghosts:()=>document.body.children.filter(node=>!node.removed),answered:()=>answered,click:async id=>{await element(id).listeners.click();},settle:()=>new Promise(resolve=>setImmediate(resolve))};
}

test('Undo retries the same committed request after a lost response, blocking intervening operations', async () => {
 const browser = undoBrowser(); await browser.settle();
 await browser.click('undo');
 assert.equal(browser.answered(),1);
 await browser.click('like');
 await browser.click('nav-explore');
 assert.deepEqual(browser.calls.map(call=>call.path),['/api/state','/api/undo']);
 await browser.click('undo');
 const undos = browser.calls.filter(call=>call.path==='/api/undo');
 assert.deepEqual(undos[1].body,undos[0].body);
 assert.equal(browser.answered(),1);
 assert.equal(browser.element('review-progress').textContent,'Uloženo 1 z 2 rozhodnutí');
 assert.equal(browser.element('undo').disabled,false);
});

test('Undo retains its request until UI resynchronization succeeds', async () => {
 const browser = undoBrowser({loseResponse:false,loseRefresh:true}); await browser.settle();
 await browser.click('undo');
 await browser.click('undo');
 const undos = browser.calls.filter(call=>call.path==='/api/undo');
 assert.deepEqual(undos[1].body,undos[0].body);
 assert.equal(browser.answered(),1);
 assert.equal(browser.element('review-progress').textContent,'Uloženo 1 z 2 rozhodnutí');
});


test('actual review skips decided photos on resume, arrows and decisions; completion clears preview; undo reinserts', async () => {
 const browser = undoBrowser({review:true,loseResponse:false}); await browser.settle();
 await browser.click('resume');
 assert.equal(browser.element('photo').src,'/1');
 assert.equal(browser.calls.find(call=>call.path==='/api/navigate').body.position,1);
 await browser.click('next');
 assert.equal(browser.element('photo').src,'/3');
 assert.equal(browser.calls.filter(call=>call.path==='/api/navigate').at(-1).body.position,3);
 await browser.click('previous');
 await browser.click('like');
 assert.equal(browser.element('photo').src,'/3');
 await browser.click('dislike');
 assert.equal(browser.element('photo-stage').hidden,true);
 assert.equal(browser.element('photo').src,'');
 assert.equal(browser.element('complete-card').hidden,false);
 assert.equal(browser.element('like').disabled,true);
 await browser.click('undo');
 assert.equal(browser.element('photo').src,'/3');
 assert.equal(browser.element('photo-stage').hidden,false);
 assert.equal(browser.element('complete-card').hidden,true);
});


test('Czech is default, live EN switch preserves unresolved Undo request and review state', async () => {
 const browser = undoBrowser(); await browser.settle();
 assert.equal(browser.element('player-name').textContent,'Alice');
 await browser.click('undo');
 await browser.click('language-toggle');
 assert.match(browser.document.cookie,/lang=en; Path=\/; SameSite=Lax/);
 await browser.click('undo');
 const undos=browser.calls.filter(call=>call.path==='/api/undo');
 assert.deepEqual(undos[0].body,undos[1].body);
 assert.equal(browser.element('review-progress').textContent,'1 of 2 decisions saved');
 assert.equal(browser.element('review-position').textContent,'Remaining: 1 photo');
 await browser.click('language-toggle');
 assert.match(browser.document.cookie,/lang=cs/);
 assert.equal(browser.element('review-position').textContent,'Zbývá 1 fotka');
 assert.equal(browser.element('review-progress').textContent,'Uloženo 1 z 2 rozhodnutí');
});


test('pastel brand tokens, neutral stage and prominent remaining count have readable contrast', () => {
 const css=require('node:fs').readFileSync(require.resolve('./style.css'),'utf8');
 const tokens=Object.fromEntries([...css.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6})\b/gi)].map(match=>[match[1],match[2].toLowerCase()]));
 assert.equal(tokens.ink,'#244a63'); assert.equal(tokens.paper,'#f8f6ef');
 assert.equal(tokens.blue,'#dceaf1'); assert.equal(tokens.lime,'#f4dfa0'); assert.equal(tokens.dark,'#202327');
 assert.match(css,/#review-position\s*\{[^}]*font-size:clamp/);
 function luminance(hex) { const channels=hex.slice(1).match(/../g).map(c=>parseInt(c,16)/255).map(c=>c<=.04045?c/12.92:((c+.055)/1.055)**2.4); return channels[0]*.2126+channels[1]*.7152+channels[2]*.0722; }
 function contrast(a,b) {const x=luminance(a),y=luminance(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
 for(const [fg,bg] of [['ink','paper'],['ink','blue'],['ink','lime'],['muted','panel'],['success-ink','success-fill'],['danger-ink','danger-fill']]) assert.ok(contrast(tokens[fg],tokens[bg])>=4.5,`${fg}/${bg} must be AA`);
 for(const bg of ['paper','panel','blue','lime']) assert.ok(contrast(tokens.focus,tokens[bg])>=3,`focus/${bg} must be visible`);
});

test('literal user data is never translated on language toggle', () => {
 const i18n=require('./i18n.js'), node={textContent:''};
 i18n.setLanguage('cs'); i18n.raw(node,'Photo');
 assert.equal(node.textContent,'Photo');
 i18n.setLanguage('en'); assert.equal(node.textContent,'Photo');
});


test('pending review edge taps and keyboard arrows use original mixed-package indices', async () => {
 const browser=undoBrowser({review:true,loseResponse:false,startPosition:2}); await browser.settle();
 await browser.click('resume'); assert.equal(browser.element('photo').src,'/3');
 const stage=browser.element('photo-stage');
 stage.listeners.pointerdown({isPrimary:true,button:0,pointerId:1,clientX:10,clientY:0,target:{closest:()=>null}});
 stage.listeners.pointerup({pointerId:1,clientX:10,clientY:0}); await browser.settle();
 assert.equal(browser.element('photo').src,'/1');
 browser.events.keydown({key:'ArrowRight',target:{tagName:'BODY'},preventDefault(){}}); await browser.settle();
 assert.equal(browser.element('photo').src,'/3');
 assert.deepEqual(browser.calls.filter(call=>call.path==='/api/navigate').map(call=>call.body.position),[3,1,3]);
});

test('completed package resume never loads a decided preview', async () => {
 const browser=undoBrowser({review:true,loseResponse:false,initialDecisions:['liked','disliked','liked','disliked']}); await browser.settle();
 await browser.click('resume');
 assert.equal(browser.element('photo-stage').hidden,true); assert.equal(browser.element('photo').src,'');
 assert.equal(browser.element('review-position').textContent,'Zbývá 0 fotek');
 assert.equal(browser.calls.some(call=>call.path==='/api/navigate'),false);
});

test('shared outcome galleries remain visible, switch language locally and preserve literal filenames', async () => {
 const browser=undoBrowser({cookie:'lang=en'}); await browser.settle();
 await browser.click('explore-liked');
 assert.equal(browser.element('gallery-grid').children.length,1);
 assert.equal(browser.element('gallery-total').textContent,'1 shared liked photos');
 const count=browser.calls.length;
 await browser.click('language-toggle');
 assert.equal(browser.calls.length,count);
 assert.equal(browser.element('gallery-total').textContent,'Společné fotky Líbí se: 1');
 const label=browser.element('gallery-grid').children[0].children[0];
 assert.equal(label.children[2].textContent,'Photo'); assert.equal(label.children[3].textContent,'Like');
 assert.equal(label.children[4].textContent,'Vybral/a Like');
 assert.equal(label.children[1].attrs['aria-label'],'Vybrat Like');
 browser.element('gallery-grid').children[0].children[1].listeners.click();
 assert.equal(browser.element('return-confirm-title').textContent,'Vrátit tuto fotku k výběru?');
 await browser.click('language-toggle');
 assert.equal(browser.element('return-confirm-title').textContent,'Send this photo back?');
 await browser.click('return-cancel'); await browser.click('language-toggle');
 await browser.click('explore-disliked');
 assert.equal(browser.element('gallery-grid').children.length,1);
 assert.equal(browser.element('gallery-total').textContent,'Společné fotky Nelíbí se: 1');
});


test('server-rendered template pairs match local dictionary; PIN remains password-only', () => {
 const fs=require('node:fs'),path=require('node:path'),i18n=require('./i18n.js');
 i18n.setLanguage('cs');
 for(const name of ['index.html','enter.html']) {
  const source=fs.readFileSync(path.join(__dirname,'..','templates',name),'utf8');
  assert.match(source,/lang \| default\('cs'\)/);
  for(const match of source.matchAll(/\{\{ ("(?:[^"\\]|\\.)*") if lang == 'en' else ("(?:[^"\\]|\\.)*") \}\}/g)) {
   const en=JSON.parse(match[1]),cs=JSON.parse(match[2]);
   assert.equal(i18n.t(en),cs,`${name}: ${en}`);
  }
 }
 const entry=fs.readFileSync(path.join(__dirname,'..','templates','enter.html'),'utf8');
 const pin=entry.match(/<input id="pin"[^>]*>/)[0];
 assert.match(pin,/type="password"/); assert.doesNotMatch(pin,/\bvalue=/);
});

test('static language bindings translate title, mixed text whitespace and aria without losing child markup', () => {
 const vm=require('node:vm'),fs=require('node:fs');
 const parent={tagName:'BUTTON',getAttribute:()=>null};
 const textNode={textContent:' Líbí se ',parentElement:parent};
 const outcomeNode={textContent:'Líbí se ',parentElement:{tagName:'SPAN',getAttribute:name=>name==='data-i18n-text'?'Liked':null}};
 const titleNode={textContent:'Photo Grindr · Společný výběr fotek',parentElement:{tagName:'TITLE',getAttribute:()=>null}};
 const timeoutNode={textContent:' se nerozhodnuté fotky vrátí do fronty. Uložená rozhodnutí zůstávají.',parentElement:{tagName:'P',getAttribute:()=>null}};
 const aria={attrs:{'aria-label':'Další fotka'},getAttribute(name){return this.attrs[name];},setAttribute(name,value){this.attrs[name]=value;}};
 const explicitTitle={textContent:'Browser prefix: Photo Grindr · Společný výběr fotek',getAttribute:name=>name==='data-i18n-title'?'Photo Grindr · The shared photo desk':null,setAttribute(){}};
 const toggle={addEventListener(name,fn){this.click=fn;},setAttribute(){}};
 let ready;
 const document={cookie:'',documentElement:{},getElementById:()=>toggle,querySelectorAll:selector=>selector==='[data-i18n-title]'?[explicitTitle]:[aria],addEventListener(name,fn){ready=fn;},createTreeWalker(){const nodes=[textNode,outcomeNode,titleNode,timeoutNode];return {nextNode:()=>nodes.shift()};}};
 vm.runInNewContext(fs.readFileSync(require.resolve('./i18n.js'),'utf8'),{document}); ready();
 toggle.click();
 assert.equal(textNode.textContent,' Like '); assert.equal(outcomeNode.textContent,'Liked ');
 assert.equal(titleNode.textContent,'Photo Grindr · The shared photo desk'); assert.equal(explicitTitle.textContent,'Photo Grindr · The shared photo desk'); assert.equal(aria.attrs['aria-label'],'Next photo');
 assert.match(timeoutNode.textContent,/unanswered photos return to the queue/);
 toggle.click(); assert.equal(textNode.textContent,' Líbí se ');
});


test('fallback request errors translate with language without another request', async () => {
 const browser=undoBrowser({review:true,failNavigation:true}); await browser.settle(); await browser.click('resume');
 assert.equal(browser.element('notice-message').textContent,'Požadavek selhal (503). Zkuste to prosím znovu.');
 const calls=browser.calls.length; await browser.click('language-toggle');
 assert.equal(browser.element('notice-message').textContent,'Request failed (503). Please try again.'); assert.equal(browser.calls.length,calls);
});


test('old expired package allows direct Explore, gallery activity and returns without repeated home redirects', async () => {
 const serverState={player:{id:1,username:'Alice'},package:null,expired:true,expired_package_id:2,counts:{liked:1}};
 const browser=undoBrowser({serverState}); await browser.settle();
 assert.equal(browser.element('notice').hidden,false);
 assert.equal(browser.element('home').hidden,false);
 await browser.click('nav-explore');
 assert.equal(browser.element('gallery').hidden,false);
 await browser.click('select-page');
 assert.equal(browser.element('selected-count').textContent,'Vybráno: 1');
 await browser.click('return-selected'); await browser.click('return-confirm-save'); await browser.settle();
 assert.equal(browser.element('gallery').hidden,false,'historical expiry must not exit Explore after return refresh');
 assert.equal(browser.calls.some(call=>call.path==='/api/packages'),false);
 await browser.click('nav-operate'); await browser.click('nav-explore');
 assert.equal(browser.element('gallery').hidden,false);
});

test('expiry notice has a localized explicit dismiss button and stays dismissed per player and expired package', async () => {
 const fs=require('node:fs'),path=require('node:path');
 const template=fs.readFileSync(path.join(__dirname,'..','templates','index.html'),'utf8');
 assert.match(template,/<span id="notice-message"><\/span>/);
 assert.match(template,/<button id="notice-dismiss"[^>]*type="button"[^>]*aria-label=[^>]*>[\s\S]*?×[\s\S]*?<\/button>/);
 const serverState={player:{id:1,username:'Alice'},package:null,expired:true,expired_package_id:2,counts:{}};
 const storage=new Map();
 let browser=undoBrowser({serverState,storage}); await browser.settle();
 assert.equal(browser.element('notice-dismiss').hidden,false);
 assert.equal(browser.element('notice-dismiss').attrs['aria-label'],'Zavřít oznámení o vypršení balíčku');
 assert.match(browser.element('notice-message').textContent,/10 minutách/);
 await browser.click('language-toggle');
 assert.equal(browser.element('notice-dismiss').attrs['aria-label'],'Dismiss package expiry notice');
 assert.match(browser.element('notice-message').textContent,/10 minutes/);
 await browser.click('notice-dismiss'); assert.equal(browser.element('notice').hidden,true);
 await browser.click('nav-operate'); assert.equal(browser.element('notice').hidden,true);
 browser=undoBrowser({serverState,storage}); await browser.settle();
 assert.equal(browser.element('notice').hidden,true,'dismissal survives page refresh');
 serverState.expired_package_id=3;
 await browser.click('nav-operate'); assert.equal(browser.element('notice').hidden,false,'new expiry warns again');
 await browser.click('notice-dismiss');
 serverState.player={id:2,username:'Bob'};
 await browser.click('nav-operate'); assert.equal(browser.element('notice').hidden,false,'other player has separate dismissal');
});

test('real expiry during review exits stale package and leaves an explicit dismissible warning', async () => {
 const serverState={player:{id:1,username:'Alice'},package:{id:1,status:'active',answered:2,total:4},expired:false,expired_package_id:null,counts:{}};
 const browser=undoBrowser({serverState,review:true,expireDecision:true}); await browser.settle();
 await browser.click('resume'); assert.equal(browser.element('review').hidden,false);
 await browser.click('like');
 assert.equal(browser.element('review').hidden,true); assert.equal(browser.element('home').hidden,false);
 assert.equal(browser.element('like').disabled,true);
 assert.match(browser.element('notice-message').textContent,/Platnost balíčku vypršela/);
 assert.equal(browser.element('notice-dismiss').hidden,false);
 await browser.click('language-toggle'); assert.match(browser.element('notice-message').textContent,/Package expired/);
 await browser.click('notice-dismiss'); await browser.click('nav-operate');
 assert.equal(browser.element('notice').hidden,true);
});

test('refresh discovering real expiry leaves review with expiry warning rather than Undo success', async () => {
 const serverState={player:{id:1,username:'Alice'},package:{id:1,status:'active',answered:2,total:4},expired:false,expired_package_id:null,counts:{}};
 const browser=undoBrowser({serverState,review:true,loseResponse:false}); await browser.settle();
 await browser.click('resume');
 Object.assign(serverState,{package:null,expired:true,expired_package_id:1});
 await browser.click('undo');
 assert.equal(browser.element('review').hidden,true); assert.equal(browser.element('home').hidden,false);
 assert.equal(browser.element('like').disabled,true);
 assert.match(browser.element('notice-message').textContent,/platnost balíčku vypršela/);
 assert.equal(browser.element('notice-dismiss').hidden,false);
});

test('expiry dismiss control cannot hide errors, conflicts, saving or unresolved Undo warnings', async () => {
 for (const status of [503,409]) {
  const browser=undoBrowser({review:true,failNavigation:status}); await browser.settle();
  const saving=browser.click('resume');
  assert.equal(browser.element('saving').hidden,false);
  await browser.click('notice-dismiss'); assert.equal(browser.element('saving').hidden,false);
  await saving;
  assert.equal(browser.element('notice-dismiss').hidden,true);
  const message=browser.element('notice-message').textContent;
  assert.ok(message); await browser.click('notice-dismiss'); await browser.settle();
  assert.equal(browser.element('notice').hidden,false); assert.equal(browser.element('notice-message').textContent,message);
 }
 const browser=undoBrowser(); await browser.settle(); await browser.click('undo'); await browser.click('nav-explore');
 assert.equal(browser.element('notice-dismiss').hidden,true);
 await browser.click('notice-dismiss'); assert.equal(browser.element('notice').hidden,false);
 assert.match(browser.element('notice-message').textContent,/Výsledek vrácení/);
 const count=browser.calls.length; await browser.click('language-toggle');
 assert.equal(browser.calls.length,count); assert.match(browser.element('notice-message').textContent,/Undo outcome is unresolved/);
});

test('committed Like tosses the captured old photo right only after saving, without awaiting motion', async () => {
 let release; const decisionGate=new Promise(resolve=>{release=resolve;});
 const browser=undoBrowser({review:true,loseResponse:false,decisionGate}); await browser.settle(); await browser.click('resume');
 const saving=browser.click('like'); await browser.settle();
 assert.equal(browser.animations.length,0); assert.equal(browser.element('photo').src,'/1');
 release(); await saving; await browser.settle();
 assert.equal(browser.animations.length,1);
 const {node,frames,options}=browser.animations[0];
 assert.equal(node.children[0].src,'/1'); assert.equal(node.attrs['aria-hidden'],'true');
 assert.equal(node.style.left,'20px'); assert.equal(node.style.top,'150px');
 assert.match(frames[1].transform,/translateX\([1-9]/);
 assert.equal(frames[0].opacity,.85); assert.equal(frames[1].opacity,0);
 assert.ok(options.duration>=220 && options.duration<=280);
 assert.equal(browser.element('photo').src,'/3'); assert.equal(browser.element('like').disabled,false);
});

test('swipes, decision buttons and L/D share committed mirrored toss directions, including the last photo', async () => {
 for(const input of ['swipe','button','key']) {
  const browser=undoBrowser({review:true,loseResponse:false}); await browser.settle(); await browser.click('resume');
  for(const [value,sign] of [['liked',1],['disliked',-1]]) {
   if(input==='button') await browser.click(sign===1?'like':'dislike');
   if(input==='key') browser.events.keydown({key:sign===1?'l':'d',target:{tagName:'BODY'},preventDefault(){}});
   if(input==='swipe') {const stage=browser.element('photo-stage'); stage.listeners.pointerdown({isPrimary:true,button:0,pointerId:1,clientX:200,clientY:0,target:{closest:()=>null}}); stage.listeners.pointerup({pointerId:1,clientX:200+sign*100,clientY:0});}
   await browser.settle();
   const animation=browser.animations.at(-1);
   assert.ok(animation); assert.match(animation.frames[1].transform,sign===1?/translateX\([1-9].*rotate\(10deg\)/:/translateX\(-[1-9].*rotate\(-10deg\)/);
  }
  assert.equal(browser.element('photo-stage').hidden,true);
  assert.equal(browser.animations.at(-1).node.children[0].src,'/3');
  assert.equal(browser.element('complete-card').hidden,false);
 }
});

test('reduced motion and missing animation API save normally with no ghost', async () => {
 for(const options of [{reducedMotion:true},{animationAPI:false}]) {
  const browser=undoBrowser({review:true,...options}); await browser.settle(); await browser.click('resume'); await browser.click('like');
  assert.equal(browser.ghosts().length,0); assert.equal(browser.animations.length,0);
  assert.equal(browser.element('photo').src,'/3'); assert.equal(browser.element('like').disabled,false);
  assert.equal(browser.element('notice').hidden,true);
 }
});

test('toss cleanup handles finish, cancel, fast decisions, navigation, Undo and page exit', async () => {
 for(const action of ['finish','cancel','fast','next','nav-explore','undo','pagehide']) {
  const browser=undoBrowser({review:true,loseResponse:false,initialDecisions:[null,null,null,null]}); await browser.settle(); await browser.click('resume'); await browser.click('like');
  const first=browser.animations[0]; assert.equal(browser.ghosts().length,1);
  if(action==='finish') first.onfinish();
  else if(action==='cancel') first.cancel();
  else if(action==='pagehide') browser.events.pagehide();
  else await browser.click(action==='fast'?'dislike':action);
  assert.equal(browser.ghosts().length,action==='fast'?1:0,action);
  if(action==='fast') {assert.equal(first.cancelled,true); first.onfinish?.(); assert.equal(browser.ghosts().length,1); browser.animations.at(-1).onfinish(); assert.equal(browser.ghosts().length,0);}
 }
});

test('unavailable photo or failed animation never leaves a ghost or reports a saved decision as failed', async () => {
 for(const unavailable of [true,false]) {
  const browser=undoBrowser({review:true}); await browser.settle(); await browser.click('resume');
  if(unavailable) {browser.element('photo').naturalWidth=0; browser.element('photo').naturalHeight=0;}
  else {const create=browser.document.createElement; browser.document.createElement=tag=>{const el=create(tag); el.animate=()=>{throw new Error('Animation unavailable');};return el;};}
  await browser.click('like');
  assert.equal(browser.ghosts().length,0); assert.equal(browser.element('notice').hidden,true);
  assert.equal(browser.element('photo').src,'/3');
 }
});

test('failed saves, expiry, navigation, Undo and galleries never toss', async () => {
 for(const failDecision of [503,409]) {
  const browser=undoBrowser({review:true,failDecision}); await browser.settle(); await browser.click('resume'); await browser.click('dislike');
  assert.equal(browser.animations.length,0); assert.equal(browser.element('photo').src,'/1'); assert.equal(browser.answered(),2);
 }
 const serverState={player:{id:1,username:'Alice'},package:null,counts:{}};
 const expired=undoBrowser({review:true,expireDecision:true,serverState}); await expired.settle();
 // Resume requires a current package in state.
 serverState.package={id:1,status:'active',answered:2,total:4}; await expired.click('nav-operate'); await expired.click('resume'); await expired.click('like');
 assert.equal(expired.animations.length,0); assert.equal(expired.element('home').hidden,false);
 const browser=undoBrowser({review:true,loseResponse:false}); await browser.settle(); await browser.click('resume');
 await browser.click('next'); await browser.click('previous');
 const stage=browser.element('photo-stage'); stage.listeners.pointerdown({isPrimary:true,button:0,pointerId:1,clientX:410,clientY:0,target:{closest:()=>null}});stage.listeners.pointerup({pointerId:1,clientX:410,clientY:0});await browser.settle();
 browser.events.keydown({key:'ArrowLeft',target:{tagName:'BODY'},preventDefault(){}});await browser.settle();
 await browser.click('undo'); await browser.click('nav-explore'); await browser.click('like'); await browser.click('dislike');
 browser.events.keydown({key:'l',target:{tagName:'BODY'},preventDefault(){}});await browser.settle();
 assert.equal(browser.animations.length,0);
});

function dragEvent(x=200,y=250,id=1) {return {isPrimary:true,button:0,pointerId:id,clientX:x,clientY:y,target:{closest:()=>null}};}
test('pickup immediately copies the photo; pointermove follows signed displacement with mirrored clamped surround glow', async () => {
 const b=undoBrowser({review:true}); await b.settle(); await b.click('resume');
 const s=b.element('photo-stage'); s.listeners.pointerdown(dragEvent());
 assert.equal(b.ghosts().length,1); assert.equal(b.element('photo').style.visibility,'hidden');
 const paper=b.ghosts()[0].children[0]; assert.equal(paper.attrs['aria-hidden'],'true');
 const levels=[];
 for(const x of [220,255,310,1200]) {s.listeners.pointermove(dragEvent(x,270)); levels.push(Number(s.style['--drag-strength'])); assert.match(paper.style.transform,new RegExp(`translate\\(${x-200}px, 7px\\)`));}
 assert.ok(levels[0]>0 && levels[1]>levels[0] && levels[2]>levels[1]); assert.equal(levels[3],1);
 s.listeners.pointermove(dragEvent(-800,270)); assert.equal(Number(s.style['--drag-strength']),1); assert.equal(s.style['--drag-color'],'220, 66, 74');
 assert.equal(s.style['--drag-side'],'-1', 'left drag must light the left edge, not the whole frame');
 assert.equal(b.ghosts()[0].children[1]?.className,'photo-drag-feedback', 'edge lighting must remain visible above the moving copy');
 assert.equal(b.ghosts()[0].style['--drag-side'],'-1');
 assert.equal(s.children.at(-1).textContent,'Nelíbí se');
 s.listeners.pointermove(dragEvent(1200,270)); assert.equal(s.style['--drag-color'],'46, 166, 92');
 assert.equal(s.style['--drag-side'],'1');
 const css=require('node:fs').readFileSync(require.resolve('./style.css'),'utf8');
 assert.match(css,/inset calc\(var\(--drag-side\) \* -30px\) 0 32px -12px/);
 assert.equal(s.children.at(-1).textContent,'Líbí se'); assert.equal(b.animations.length,0);
});

test('release freezes the pose until confirmation then tosses exactly from that pose once', async () => {
 let release; const gate=new Promise(r=>release=r);
 const b=undoBrowser({review:true,decisionGate:gate}); await b.settle(); await b.click('resume');
 const s=b.element('photo-stage'); s.listeners.pointerdown(dragEvent()); s.listeners.pointermove(dragEvent(300,270));
 const pose=b.ghosts()[0].children[0].style.transform;
 s.listeners.pointerup(dragEvent(300,270)); s.listeners.pointerup(dragEvent(300,270)); s.listeners.lostpointercapture?.(dragEvent());
 await b.settle(); assert.equal(b.ghosts().length,1); assert.equal(b.ghosts()[0].children[0].style.transform,pose);
 assert.equal(b.animations.length,0); assert.equal(b.calls.filter(c=>c.path==='/api/decision').length,1);
 release(); await b.settle(); await b.settle();
 assert.equal(b.animations.length,1); assert.equal(b.animations[0].frames[0].transform,pose);
 assert.equal(b.ghosts().length,1); assert.equal(b.element('photo').style.visibility,''); assert.equal(b.element('photo').src,'/3');
 assert.equal(Number(s.style['--drag-strength']),0);
});

test('cancel, lost capture, Escape, short/vertical release, page exit and view changes clear pickup without a vote', async () => {
 for(const action of ['pointercancel','lostpointercapture','Escape','short','vertical','pagehide','nav-explore','next']) {
  const b=undoBrowser({review:true}); await b.settle(); await b.click('resume'); const s=b.element('photo-stage');
  s.listeners.pointerdown(dragEvent()); s.listeners.pointermove(dragEvent(220,260));
  if(action==='Escape') b.events.keydown({key:'Escape',preventDefault(){}});
  else if(action==='pagehide') b.events.pagehide();
  else if(action==='short'||action==='vertical') s.listeners.pointerup(dragEvent(action==='short'?220:270,action==='short'?260:350));
  else if(s.listeners[action]) s.listeners[action](dragEvent()); else await b.click(action);
  await b.settle(); assert.equal(b.ghosts().length,0,action); assert.equal(b.element('photo').style.visibility,'',action);
  assert.equal(Number(s.style['--drag-strength']),0); assert.equal(b.calls.filter(c=>c.path==='/api/decision').length,0,action);
 }
});

test('secondary pointers cannot take over or release a pickup; save input cannot create another', async () => {
 let release; const b=undoBrowser({review:true,decisionGate:new Promise(r=>release=r)}); await b.settle(); await b.click('resume'); const s=b.element('photo-stage');
 s.listeners.pointerdown({...dragEvent(),isPrimary:false}); assert.equal(b.ghosts().length,0);
 s.listeners.pointerdown({...dragEvent(),button:2}); assert.equal(b.ghosts().length,0);
 s.listeners.pointerdown(dragEvent()); const paper=b.ghosts()[0].children[0];
 s.listeners.pointerdown(dragEvent(0,0,2)); s.listeners.pointermove(dragEvent(500,0,2)); s.listeners.pointerup(dragEvent(500,0,2)); s.listeners.pointercancel(dragEvent(0,0,2));
 assert.equal(b.ghosts().length,1); assert.equal(paper.style.transform,'translate(0px, 0px) rotate(0deg)');
 s.listeners.pointerup(dragEvent(300)); s.listeners.pointerdown(dragEvent()); await b.click('like');
 b.events.keydown({key:'d',target:{tagName:'BODY'},preventDefault(){}}); await b.settle();
 assert.equal(b.calls.filter(c=>c.path==='/api/decision').length,1); assert.equal(b.ghosts().length,1);
 release(); await b.settle(); await b.settle(); assert.equal(b.ghosts().length,1);
});

test('failed drag saves restore the photo and error without toss, including network errors and expiry', async () => {
 for(const failDecision of [503,409,'network','expired']) {
  const serverState={player:{id:1,username:'Alice'},package:{id:1,status:'active',answered:2,total:4},counts:{}};
  const b=undoBrowser({review:true,failDecision:failDecision==='expired'?false:failDecision,expireDecision:failDecision==='expired',serverState:failDecision==='expired'?serverState:null});
  await b.settle(); await b.click('resume'); const s=b.element('photo-stage'); s.listeners.pointerdown(dragEvent()); s.listeners.pointerup(dragEvent(100));
  await b.settle(); await b.settle(); assert.equal(b.ghosts().length,0); assert.equal(b.animations.length,0);
  assert.equal(b.element('photo').style.visibility,''); assert.equal(Number(s.style['--drag-strength']),0); assert.equal(b.answered(),2); assert.equal(b.element('notice').hidden,false);
 }
});

test('reduced-motion pickup tracks directly without rotation, easing or decorative toss', async () => {
 const b=undoBrowser({review:true,reducedMotion:true}); await b.settle(); await b.click('resume'); const s=b.element('photo-stage');
 s.listeners.pointerdown(dragEvent()); s.listeners.pointermove(dragEvent(320,500));
 assert.equal(b.ghosts()[0].children[0].style.transform,'translate(120px, 28px) rotate(0deg)');
 s.listeners.pointercancel(dragEvent()); assert.equal(b.animations.length,0); assert.equal(b.ghosts().length,0);
 s.listeners.pointerdown(dragEvent()); s.listeners.pointermove(dragEvent(300,270)); s.listeners.pointerup(dragEvent(300,270)); await b.settle(); await b.settle();
 assert.equal(b.animations.length,0); assert.equal(b.ghosts().length,0); assert.equal(b.element('photo').src,'/3');
});

test('transient labels translate live and release their language binding when pickup ends', async () => {
 const b=undoBrowser({review:true}); await b.settle(); await b.click('resume'); const s=b.element('photo-stage');
 s.listeners.pointerdown(dragEvent()); s.listeners.pointermove(dragEvent(300)); const label=s.children.at(-1);
 assert.equal(label.textContent,'Líbí se'); await b.click('language-toggle'); assert.equal(label.textContent,'Like');
 s.listeners.pointercancel(dragEvent()); assert.equal(label.textContent,'');
 await b.click('language-toggle'); assert.equal(label.textContent,'','removed transient nodes must not retain translation bindings');
});

test('remaining counter uses Czech and English count grammar', () => {
 const i18n=require('./i18n.js'); i18n.setLanguage('cs');
 assert.equal(i18n.t('Remaining: {count} photos',{count:1}),'Zbývá 1 fotka');
 assert.equal(i18n.t('Remaining: {count} photos',{count:2}),'Zbývají 2 fotky');
 assert.equal(i18n.t('Remaining: {count} photos',{count:5}),'Zbývá 5 fotek');
 assert.equal(i18n.t('Remaining: {count} photos',{count:0}),'Zbývá 0 fotek');
 i18n.setLanguage('en'); assert.equal(i18n.t('Remaining: {count} photos',{count:1}),'Remaining: 1 photo');
});
