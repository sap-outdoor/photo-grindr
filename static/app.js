'use strict';
function gesture({dx, dy, x, width}) {
  if (Math.abs(dx) >= 55 && Math.abs(dx) > Math.abs(dy) * 1.5) return dx > 0 ? 'liked' : 'disliked';
  if (Math.abs(dx) > 10 || Math.abs(dy) > 10 || !width) return null;
  return x < width * .22 ? 'previous' : x > width * .78 ? 'next' : null;
}
function nextPosition(position, delta, total) { return Math.max(0, Math.min(Math.max(0, total - 1), position + delta)); }
// Return original server indices; never filter/reindex the package itself.
function pendingPosition(items, position = 0, delta = 0) {
  const indices = items.map((item, index) => item.decision == null ? index : -1).filter(index => index >= 0);
  if (!indices.length) return -1;
  const current = indices.includes(position) ? position : indices.find(index => index >= position) ?? indices[0];
  return indices[nextPosition(indices.indexOf(current), delta, indices.length)];
}
if (typeof module !== 'undefined') module.exports = {gesture, nextPosition, pendingPosition};
if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
  const $ = id => document.getElementById(id);
  const csrf = document.querySelector('meta[name="csrf-token"]').content;
  let state = null, pkg = null, busy = false, view = 'home', galleryStatus = 'liked', galleryPage = 1, galleryPages = 1;
  let galleryItems = [], selection = new Map(), pendingReturn = new Map(), pendingUndo = null, searchSequence = 0, pointer = null, searchTimer;
  const number = n => Number(n || 0).toLocaleString(PhotoI18n.language === 'en' ? 'en-US' : 'cs-CZ');
  const t = PhotoI18n.t;
  const text = (id, value, vars = {}) => PhotoI18n.bind($(id), value, vars);
  let noticeExpiryKey = null;
  const seenExpiries = new Set();
  function notice(message, type = '', vars = {}, expiryKey = null) {
    noticeExpiryKey = expiryKey;
    text('notice-message', message, vars); $('notice').className = `notice ${type}`; $('notice').hidden = !message;
    $('notice-dismiss').hidden = !expiryKey;
  }
  function expiryNotice(message, packageId, force = false) {
    const key = state?.player && packageId != null ? `photo-grindr:expiry:${state.player.id}:${packageId}` : null;
    let dismissed = false;
    try { dismissed = key && sessionStorage.getItem(key) === 'dismissed'; } catch (_) { /* Storage may be unavailable. */ }
    if (!force && key && (dismissed || seenExpiries.has(key))) return;
    if (key) seenExpiries.add(key);
    notice(message, 'warning', {}, key);
  }
  PhotoI18n.bind($('notice-dismiss'), 'Dismiss package expiry notice', {}, 'aria-label');
  $('notice-dismiss').addEventListener('click', () => {
    if (busy || pendingUndo || !noticeExpiryKey) return;
    try { sessionStorage.setItem(noticeExpiryKey, 'dismissed'); } catch (_) { /* In-memory suppression still works. */ }
    notice('');
  });
  function setBusy(value) {
    busy = value; document.body.classList.toggle('busy', value);
    document.querySelectorAll('button, input, select').forEach(el => { el.disabled = el.id === 'language-toggle' ? false : value || !!pendingUndo; });
    if (!value) { renderControls(); $('return-selected').disabled = !!pendingUndo || selection.size === 0; }
    $('saving').hidden = !value;
  }
  async function api(path, body) {
    let response;
    try { response = await fetch(path, {method: body === undefined ? 'GET' : 'POST', credentials:'same-origin', headers: body === undefined ? {} : {'Content-Type':'application/json','X-CSRF-Token':csrf}, body:body === undefined ? undefined : JSON.stringify(body)}); } catch (_) { throw new Error(t('Network error. Please try again.')); }
    if (response.status === 401) { location.assign('/enter'); throw new Error(t('Please enter the shared PIN again.')); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.error || t('Request failed ({status}). Please try again.', {status:response.status})); error.code = data.code; error.status = response.status; if (!data.error) { error.messageKey='Request failed ({status}). Please try again.'; error.messageVars={status:response.status}; } throw error; }
    return data;
  }
  async function refresh() {
    const reviewingPackage = view === 'review' ? pkg?.id : null;
    state = await api('/api/state'); pkg = state.package;
    const reviewExpired = !!reviewingPackage && (pkg?.status === 'expired' || (state.expired && (!pkg || pkg.id !== reviewingPackage)));
    if (state.expired || pkg?.status === 'expired') {
      if (pkg?.status === 'expired') pkg = null;
      if (reviewExpired) show('home');
      expiryNotice('Your package expired after 10 minutes without an operation. Saved decisions are safe. Choose a fresh package.', state.expired_package_id, reviewExpired);
    }
    renderHome();
    return reviewExpired;
  }
  async function run(action, retryUndo = false) {
    if (busy) return;
    if (pendingUndo && !retryUndo) { notice('Undo outcome is unresolved. Retry Undo before another operation.', 'warning'); return; }
    setBusy(true); notice('');
    try { await action(); }
    catch (error) {
      if (error.code === 'expired') {
        const expiredPackageId = pkg?.id;
        pkg = null; show('home');
        try { await refresh(); } catch (_) { /* Original error remains visible. */ }
        expiryNotice('Package expired. Unanswered photos were released; saved decisions are safe. Choose a fresh package.', state?.expired_package_id ?? expiredPackageId, true);
      } else if (error.status === 409) {
        try { await refresh(); if (view === 'review') renderReview(); if (view === 'gallery') await loadGallery(); } catch (_) { /* Keep conflict message. */ }
        notice('{error} Latest data has been requested. Review it before trying again.', 'warning', {error:error.message});
      } else notice(error.messageKey || error.message, 'error', error.messageVars);
    } finally { setBusy(false); }
  }
  function show(next) {
    if (view !== next) window.scrollTo({top:0, behavior:'instant'});
    view = next;
    for (const id of ['home','review','gallery']) $(id).hidden = id !== next;
    $('nav-operate').setAttribute('aria-current', next !== 'gallery' ? 'page' : 'false');
    $('nav-explore').setAttribute('aria-current', next === 'gallery' ? 'page' : 'false');
    if (next !== 'review') pointer = null;
  }
  function renderHome() {
    if (state?.player) PhotoI18n.raw($('player-name'),state.player.username); else text('player-name','Choose your player');
    if (state?.player) PhotoI18n.raw($('active-player'),state.player.username); else text('active-player','No player selected');
    $('identity-form').hidden = !!state?.player;
    $('switch-player').hidden = !state?.player;
    $('package-options').hidden = !state?.player;
    for (const name of ['pending','assigned','liked','disliked','total']) text(`count-${name}`, number(state?.counts?.[name]));
    const resumable = pkg && pkg.status !== 'expired';
    $('resume-card').hidden = !resumable;
    if (resumable) {
      text('resume-title', pkg.status === 'complete' || pkg.answered === pkg.total ? 'Package complete' : 'Pick up where you left off');
      text('resume-detail', '{answered} of {total} decisions saved', {answered:pkg.answered,total:pkg.total});
      text('resume', pkg.answered === pkg.total ? 'Review this package →' : 'Resume review →');
    }
    text('queue-note', !state?.counts?.pending ? state?.counts?.assigned ? 'The remaining photos are reserved by other players. Come back when they finish or their reservations expire.' : 'The queue is clear. Explore the shared selections, or return photos for another look.' : 'A smaller package is offered when fewer photos are available.');
  }
  function current() { const item = pkg?.items?.[pkg.position]; return item?.decision == null ? item : undefined; }
  function renderControls() {
    const item = current(), valid = !pendingUndo && !!item && pkg.status !== 'expired' && view === 'review';
    for (const id of ['like','dislike']) $(id).disabled = busy || !valid;
    $('previous').disabled = busy || !valid || pendingPosition(pkg.items, pkg.position, -1) === pkg.position;
    $('next').disabled = busy || !valid || pendingPosition(pkg.items, pkg.position, 1) === pkg.position;
    $('undo').disabled = busy || !state?.player;
    $('gallery-undo').disabled = busy || !state?.player;
    $('gallery-prev').disabled = busy || !!pendingUndo || galleryPage <= 1;
    $('gallery-next').disabled = busy || !!pendingUndo || galleryPage >= galleryPages;
  }
  function renderReview() {
    if (!pkg || pkg.status === 'expired') { show('home'); renderHome(); return; }
    pkg.position = pendingPosition(pkg.items, pkg.position);
    const item = current(), remaining = pkg.items.filter(item => item.decision == null).length;
    show('review');
    $('photo-stage').hidden = !item;
    $('complete-card').hidden = !!item;
    text('review-position', 'Remaining: {count} photos', {count:remaining});
    text('review-progress', '{answered} of {total} decisions saved', {answered:pkg.answered,total:pkg.total});
    $('progress').max = pkg.total || 1; $('progress').value = pkg.answered;
    PhotoI18n.raw($('review-player'),state.player.username);
    if (!item) {
      $('photo').removeAttribute('src'); $('photo').alt = '';
      text('filename', 'Package complete'); text('photo-path', ''); text('saved-state', '');
      renderControls(); return;
    }
    PhotoI18n.raw($('filename'),item.filename); $('filename').title = item.relative_path;
    PhotoI18n.raw($('photo-path'),item.relative_path);
    text('saved-state', 'Awaiting your decision');
    $('saved-state').className = `save-state ${item.decision || ''}`;
    $('photo-error').hidden = true;
    const photo = $('photo'); photo.alt = item.filename;
    if (photo.getAttribute('src') !== item.preview_url) photo.src = item.preview_url;
    renderControls();
    const next = pkg.items[pendingPosition(pkg.items, pkg.position, 1)]; if (next) { const preload = new Image(); preload.src = next.preview_url; }
  }
  async function navigate(delta) {
    if (!pkg || !current()) return;
    const position = pendingPosition(pkg.items, pkg.position, delta);
    if (position === pkg.position) return;
    await run(async () => { const data = await api('/api/navigate', {package_id:pkg.id,position}); pkg = data.package; renderReview(); });
  }
  async function decide(value) {
    if (!current()) return;
    await run(async () => {
      const item = current();
      const data = await api('/api/decision',{package_id:pkg.id,photo_id:item.id,value,version:item.version,request_id:crypto.randomUUID()});
      pkg = data.package; renderReview();
      notice(data.complete ? 'Package complete. Every decision is saved.' : 'Decision saved.', 'success');
    });
  }
  async function undo() {
    await run(async () => {
      pendingUndo ||= {request_id:crypto.randomUUID()};
      let data;
      try { data = await api('/api/undo', pendingUndo); }
      catch (error) { if (error.status && error.status < 500) pendingUndo = null; throw error; }
      if (!Object.hasOwn(data, 'package')) throw new Error(t('Undo response was incomplete. Retry Undo to confirm its outcome.'));
      pkg = data.package; const reviewExpired = await refresh();
      if (pkg) renderReview(); else if (view === 'gallery') await loadGallery();
      pendingUndo = null;
      if (!reviewExpired) notice('Last eligible action undone.', 'success');
    }, true);
  }
  async function searchPlayers() {
    const sequence = ++searchSequence, query = $('username').value.trim();
    try {
      const data = await api(`/api/players?q=${encodeURIComponent(query)}`);
      if (sequence !== searchSequence) return;
      $('players').replaceChildren();
      text('suggestion-note', query ? 'Existing or similar players — select a name to use it.' : 'Known players — select your name, or enter a new one.');
      for (const player of data.players) {
        const button = document.createElement('button'); button.type='button'; button.className='player-option'; button.textContent=player.username; button.disabled=busy;
        button.addEventListener('click', () => selectPlayer(player.username)); $('players').append(button);
      }
      if (!data.players.length) text('suggestion-note', query ? 'No matching players. Continue to create this name.' : 'No players yet. Enter your name to get started.');
    } catch(error) { notice(error.messageKey || error.message, 'error', error.messageVars); }
  }
  async function selectPlayer(username) {
    if (!username.trim()) { $('username').focus(); return; }
    await run(async () => { state = await api('/api/player',{username:username.trim()}); pkg = state.package; renderHome(); await refresh(); notice('Playing as {name}.', 'success', {name:state.player.username}); });
  }
  async function loadGallery() {
    const data = await api(`/api/gallery?status=${galleryStatus}&page=${galleryPage}`);
    galleryItems=data.items; galleryPage=data.page; galleryPages=data.pages; selection.clear();
    text('gallery-total', galleryStatus === 'liked' ? '{count} shared liked photos' : '{count} shared disliked photos', {count:data.total});
    text('gallery-page', data.pages ? 'Page {page} of {pages}' : 'No pages', {page:data.page,pages:data.pages});
    $('gallery-grid').replaceChildren(); $('gallery-empty').hidden=!!data.items.length;
    for (const item of data.items) {
      const card=document.createElement('article'); card.className='gallery-card';
      const label=document.createElement('label'); label.className='gallery-select';
      const image=document.createElement('img'); image.src=item.preview_url; image.alt=item.filename; image.loading='lazy';
      image.addEventListener('error', () => { PhotoI18n.bind(image,'Preview unavailable: {filename}',{filename:item.filename},'alt'); card.classList.add('unavailable'); });
      const check=document.createElement('input'); check.type='checkbox'; PhotoI18n.bind(check,'Select {path}',{path:item.relative_path},'aria-label');
      check.addEventListener('change', () => run(async () => { await api('/api/activity',{}); if(check.checked) selection.set(item.id,item.version); else selection.delete(item.id); updateSelection(); }));
      const title=document.createElement('strong'); title.textContent=item.filename;
      const path=document.createElement('span'); path.className='gallery-path'; path.textContent=item.relative_path;
      const actor=document.createElement('span'); actor.className='muted'; PhotoI18n.bind(actor,item.judged_by ? 'Reviewed by {name}' : 'Shared decision',{name:typeof item.judged_by === 'object' ? item.judged_by?.username : item.judged_by});
      label.append(image,check,title,path,actor);
      const back=document.createElement('button'); back.className='quiet'; PhotoI18n.bind(back,'Send back for review ↗'); back.addEventListener('click', () => returnPhotos(new Map([[item.id,item.version]])));
      card.append(label,back); $('gallery-grid').append(card);
    }
    updateSelection();
    $('gallery-prev').disabled=galleryPage<=1; $('gallery-next').disabled=galleryPage>=galleryPages;
  }
  function updateSelection() { text('selected-count', '{count} selected', {count:selection.size}); $('return-selected').disabled=busy || !selection.size; }
  async function explore(status=galleryStatus, page=1) {
    await run(async () => {
      if (!state?.player) { show('home'); $('identity-form').hidden=false; $('username').focus(); notice('Choose a player before exploring so returns can be attributed.'); return; }
      await api('/api/activity',{}); galleryStatus=status; galleryPage=page; show('gallery');
      for(const name of ['liked','disliked']) $(`tab-${name}`).setAttribute('aria-selected',name===status?'true':'false');
      await loadGallery();
    });
  }
  function returnPhotos(chosen) {
    if (busy || pendingUndo || !chosen.size) return;
    pendingReturn = new Map(chosen);
    text('return-confirm-title', 'Send {count} photos back?', {count:chosen.size});
    $('return-confirm').showModal();
  }
  $('return-cancel').addEventListener('click', () => $('return-confirm').close());
  $('return-confirm-save').addEventListener('click', () => {
    const chosen = new Map(pendingReturn); $('return-confirm').close();
    run(async () => { await api('/api/return',{photo_ids:[...chosen.keys()],versions:Object.fromEntries(chosen),request_id:crypto.randomUUID()}); await loadGallery(); await refresh(); notice('Photos returned to the shared review queue.', 'success'); });
  });
  $('identity-form').addEventListener('submit', event => { event.preventDefault(); selectPlayer($('username').value); });
  $('username').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer=setTimeout(searchPlayers,180); });
  $('switch-player').addEventListener('click', () => { $('identity-form').hidden=false; $('username').value=''; $('username').focus(); searchPlayers(); });
  document.querySelectorAll('[data-size]').forEach(button => button.addEventListener('click', () => run(async () => { const data = await api('/api/packages',{size:Number(button.dataset.size)}); pkg=data.package; if(!pkg?.items?.length) { await refresh(); notice('No photos are available right now. Other players may have reserved the remaining work.'); return; } renderReview(); })));
  $('resume').addEventListener('click', () => run(async () => { if (!pkg) return; const latest=await api(`/api/packages/${pkg.id}`); pkg=latest.package; if (pkg.status==='expired') { const error=new Error(t('Package expired.')); error.code='expired'; throw error; } const position=pendingPosition(pkg.items,pkg.position); if(position<0) { renderReview(); return; } const data=await api('/api/navigate',{package_id:pkg.id,position}); pkg=data.package; renderReview(); }));
  for (const id of ['nav-operate','review-home','complete-home']) $(id).addEventListener('click', () => run(async () => { show('home'); await refresh(); }));
  $('nav-explore').addEventListener('click', () => explore());
  $('explore-liked').addEventListener('click', () => explore('liked'));
  $('explore-disliked').addEventListener('click', () => explore('disliked'));
  for (const status of ['liked','disliked']) $(`tab-${status}`).addEventListener('click', () => explore(status));
  $('gallery-prev').addEventListener('click', () => explore(galleryStatus,galleryPage-1));
  $('gallery-next').addEventListener('click', () => explore(galleryStatus,galleryPage+1));
  $('return-selected').addEventListener('click', () => returnPhotos(selection));
  $('select-page').addEventListener('click', () => run(async () => { await api('/api/activity',{}); const select=selection.size!==galleryItems.length; selection.clear(); if(select) for(const item of galleryItems) selection.set(item.id,item.version); document.querySelectorAll('.gallery-select input').forEach(input=>{input.checked=select;}); updateSelection(); }));
  $('like').addEventListener('click', () => decide('liked')); $('dislike').addEventListener('click', () => decide('disliked'));
  $('previous').addEventListener('click', () => navigate(-1)); $('next').addEventListener('click', () => navigate(1));
  $('undo').addEventListener('click',undo); $('gallery-undo').addEventListener('click',undo);
  $('photo').addEventListener('error', () => { $('photo-error').hidden=false; });
  $('retry-photo').addEventListener('click', () => { if(current()) { $('photo-error').hidden=true; $('photo').src=current().preview_url; } });
  const stage=$('photo-stage');
  stage.addEventListener('pointerdown', event => { if(busy || !event.isPrimary || event.button !== 0 || event.target.closest('button')) return; pointer={id:event.pointerId,x:event.clientX,y:event.clientY}; stage.setPointerCapture(event.pointerId); });
  stage.addEventListener('pointercancel', () => {pointer=null;});
  stage.addEventListener('pointerup', event => {
    if(!pointer || pointer.id!==event.pointerId || busy) {pointer=null;return;}
    const start=pointer; pointer=null; const rect=stage.getBoundingClientRect();
    const action=gesture({dx:event.clientX-start.x,dy:event.clientY-start.y,x:start.x-rect.left,width:rect.width});
    if(action==='liked'||action==='disliked') decide(action); else if(action) navigate(action==='next'?1:-1);
  });
  document.addEventListener('keydown', event => {
    if(busy || event.repeat || $('return-confirm').open || event.altKey || event.ctrlKey || event.metaKey || /INPUT|TEXTAREA|SELECT|BUTTON|A/.test(event.target.tagName) || event.target.isContentEditable) return;
    const key=event.key.toLowerCase();
    if(key==='u' && state?.player) { event.preventDefault(); undo(); }
    else if(view==='review' && ['l','d','arrowleft','arrowright'].includes(key)) { event.preventDefault(); if(key==='l'||key==='d') decide(key==='l'?'liked':'disliked'); else navigate(key==='arrowright'?1:-1); }
  });
  run(async () => { await refresh(); if(!state.player) await searchPlayers(); });
});
