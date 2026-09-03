(function(){
  const FORMS = window.FORMS || [];
  const grid = document.getElementById('card-grid');
  const emptyState = document.getElementById('empty-state');
  const resultCount = document.getElementById('result-count');
  const searchInput = document.getElementById('search');
  const layoutChipsEl = document.getElementById('layout-chips');
  const paletteChipsEl = document.getElementById('palette-chips');
  const favoritesChip = document.getElementById('favorites-chip');
  document.getElementById('stat-count').textContent = FORMS.length;

  const state = { query: '', layout: null, palette: null, favoritesOnly: false };
  const compareSet = new Set();

  // ---------------- favorites ----------------
  const FAV_KEY = 'loginkit-favorites';
  function getFavorites(){
    try{ return JSON.parse(localStorage.getItem(FAV_KEY) || '[]'); }catch(e){ return []; }
  }
  function setFavorites(list){
    try{ localStorage.setItem(FAV_KEY, JSON.stringify(list)); }catch(e){}
  }
  function isFavorite(id){ return getFavorites().includes(id); }
  function toggleFavorite(id){
    const favs = getFavorites();
    const idx = favs.indexOf(id);
    if(idx === -1) favs.push(id); else favs.splice(idx, 1);
    setFavorites(favs);
    return favs.includes(id);
  }

  // ---------------- filter chips ----------------
  const layouts = [...new Map(FORMS.map(f => [f.layout_key, f.layout])).entries()];
  const palettes = [...new Map(FORMS.map(f => [f.palette_key, f.palette])).entries()];

  function buildChips(container, items, key){
    items.forEach(([val, label]) => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.type = 'button';
      chip.textContent = label;
      chip.addEventListener('click', () => {
        state[key] = state[key] === val ? null : val;
        [...container.children].forEach(c => c.classList.toggle('active', c === chip && state[key] === val));
        render();
      });
      container.appendChild(chip);
    });
  }
  buildChips(layoutChipsEl, layouts, 'layout');
  buildChips(paletteChipsEl, palettes, 'palette');

  favoritesChip.addEventListener('click', () => {
    state.favoritesOnly = !state.favoritesOnly;
    favoritesChip.classList.toggle('active', state.favoritesOnly);
    render();
  });

  function matches(f){
    const q = state.query.trim().toLowerCase();
    const hay = (f.title + ' ' + f.layout + ' ' + f.palette + ' ' + f.blurb).toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(state.layout && f.layout_key !== state.layout) return false;
    if(state.palette && f.palette_key !== state.palette) return false;
    if(state.favoritesOnly && !isFavorite(f.id)) return false;
    return true;
  }

  function cardHTML(f){
    const fav = isFavorite(f.id);
    const cmp = compareSet.has(f.id);
    return `
      <div class="card" data-id="${f.id}" tabindex="-1">
        <div class="card-preview" data-action="preview" data-id="${f.id}">
          <span class="num">${String(f.n).padStart(2,'0')}</span>
          <button class="fav-btn${fav ? ' active' : ''}" data-action="fav" data-id="${f.id}" aria-label="Favorite" title="Favorite">
            <svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 00-7.8 0L12 5.6l-1-1a5.5 5.5 0 00-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 000-7.8z"/></svg>
          </button>
          <span class="card-a11y" data-a11y-badge="${f.id}"><span class="dot"></span><span class="score"></span></span>
          <iframe data-src="${f.file}" loading="lazy" tabindex="-1"></iframe>
        </div>
        <div class="card-body">
          <div class="card-title">${f.title}</div>
          <div class="card-blurb">${f.blurb}</div>
          <div class="card-tags"><span class="tag">${f.layout}</span><span class="tag">${f.palette}</span></div>
          <div class="card-actions">
            <button data-action="preview" data-id="${f.id}">Preview</button>
            <button class="primary" data-action="code" data-id="${f.id}">Code</button>
            <button class="compare-btn${cmp ? ' active' : ''}" data-action="compare" data-id="${f.id}" title="Add to compare">⇄</button>
          </div>
        </div>
      </div>
    `;
  }

  // ---------------- accessibility audit ----------------
  const a11yCache = new Map();
  function auditAccessibility(doc){
    const checks = [];
    const inputs = [...doc.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"])')];
    const labelsOk = inputs.length > 0 && inputs.every(inp => inp.id && doc.querySelector(`label[for="${inp.id}"]`));
    checks.push({ label: 'Every field has a matching <label for>', pass: labelsOk });

    const relevantInputs = [...doc.querySelectorAll('input[type="email"], input[type="password"], input[type="text"]')];
    const autocompleteOk = relevantInputs.length > 0 && relevantInputs.every(inp => inp.hasAttribute('autocomplete'));
    checks.push({ label: 'autocomplete attributes present', pass: autocompleteOk });

    const iconButtons = [...doc.querySelectorAll('button')].filter(b => !b.textContent.trim() && b.querySelector('svg'));
    const iconAriaOk = iconButtons.length === 0 || iconButtons.every(b => b.hasAttribute('aria-label') && b.getAttribute('aria-label').trim().length > 0);
    checks.push({ label: 'Icon-only buttons carry aria-label', pass: iconAriaOk });

    const styleText = [...doc.querySelectorAll('style')].map(s => s.textContent).join('\n');
    checks.push({ label: 'Visible :focus-visible state defined', pass: /:focus-visible/.test(styleText) });
    checks.push({ label: 'Respects prefers-reduced-motion', pass: /prefers-reduced-motion/.test(styleText) });

    const eyeBtns = [...doc.querySelectorAll('.eye-btn')];
    const eyeAriaOk = eyeBtns.length === 0 || eyeBtns.every(b => b.hasAttribute('aria-pressed'));
    checks.push({ label: 'Password toggle exposes aria-pressed', pass: eyeAriaOk });

    const passing = checks.filter(c => c.pass).length;
    return { score: passing, total: checks.length, checks };
  }

  function runAudit(f, iframe){
    if(a11yCache.has(f.id)) return a11yCache.get(f.id);
    try{
      const doc = iframe.contentDocument;
      if(!doc) return null;
      const result = auditAccessibility(doc);
      a11yCache.set(f.id, result);
      applyCardBadge(f.id, result);
      return result;
    }catch(e){
      return null;
    }
  }

  function applyCardBadge(id, result){
    const badge = grid.querySelector(`[data-a11y-badge="${id}"]`);
    if(!badge) return;
    badge.classList.add('show');
    badge.classList.toggle('pass', result.score === result.total);
    badge.classList.toggle('warn', result.score < result.total);
    badge.querySelector('.score').textContent = `A11y ${result.score}/${result.total}`;
  }

  let io;
  function setupLazyIframes(){
    if(io) io.disconnect();
    io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          const iframe = entry.target;
          if(iframe.dataset.src && !iframe.src){
            iframe.src = iframe.dataset.src;
            iframe.addEventListener('load', () => {
              iframe.classList.add('loaded');
              const card = iframe.closest('.card');
              const f = card ? FORMS.find(x => x.id === card.dataset.id) : null;
              if(f) runAudit(f, iframe);
            }, { once: true });
          }
          io.unobserve(iframe);
        }
      });
    }, { rootMargin: '200px' });
    grid.querySelectorAll('iframe[data-src]').forEach(f => io.observe(f));
  }

  function render(){
    const results = FORMS.filter(matches);
    resultCount.textContent = results.length;
    grid.innerHTML = results.map(cardHTML).join('');
    emptyState.hidden = results.length !== 0;
    setupLazyIframes();
    kbdIndex = -1;
  }

  searchInput.addEventListener('input', (e) => { state.query = e.target.value; render(); });
  document.getElementById('reset-filters').addEventListener('click', () => {
    state.query = ''; state.layout = null; state.palette = null; state.favoritesOnly = false;
    searchInput.value = '';
    favoritesChip.classList.remove('active');
    [...layoutChipsEl.children, ...paletteChipsEl.children].forEach(c => c.classList.remove('active'));
    render();
  });

  // ---------------- card interactions ----------------
  grid.addEventListener('click', (e) => {
    const favBtn = e.target.closest('[data-action="fav"]');
    if(favBtn){
      e.stopPropagation();
      const active = toggleFavorite(favBtn.dataset.id);
      favBtn.classList.toggle('active', active);
      if(state.favoritesOnly) render();
      return;
    }
    const cmpBtn = e.target.closest('[data-action="compare"]');
    if(cmpBtn){
      e.stopPropagation();
      toggleCompare(cmpBtn.dataset.id, cmpBtn);
      return;
    }
    const btn = e.target.closest('[data-action]');
    if(!btn) return;
    openModal(btn.dataset.id, btn.dataset.action);
  });

  // ---------------- compare ----------------
  const compareBar = document.getElementById('compare-bar');
  const compareSlots = document.getElementById('compare-slots');
  const compareCount = document.getElementById('compare-count');
  const compareBackdrop = document.getElementById('compare-backdrop');
  const compareGrid = document.getElementById('compare-grid');

  function toggleCompare(id, btnEl){
    if(compareSet.has(id)){
      compareSet.delete(id);
    } else {
      if(compareSet.size >= 3){
        compareSet.delete([...compareSet][0]);
      }
      compareSet.add(id);
    }
    if(btnEl) btnEl.classList.toggle('active', compareSet.has(id));
    const cardEl = grid.querySelector(`.card[data-id="${id}"]`);
    if(cardEl) cardEl.classList.toggle('compare-selected', compareSet.has(id));
    renderCompareBar();
  }

  function renderCompareBar(){
    compareCount.textContent = compareSet.size;
    document.body.classList.toggle('has-compare-bar', compareSet.size > 0);
    compareBar.hidden = compareSet.size === 0;
    compareSlots.innerHTML = [...compareSet].map(id => {
      const f = FORMS.find(x => x.id === id);
      return `<span class="compare-slot">${f ? f.title : id}<button data-remove="${id}" aria-label="Remove">✕</button></span>`;
    }).join('');
  }
  compareSlots.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-remove]');
    if(!rm) return;
    const id = rm.dataset.remove;
    compareSet.delete(id);
    const cardEl = grid.querySelector(`.card[data-id="${id}"]`);
    if(cardEl) cardEl.classList.remove('compare-selected');
    const btnEl = grid.querySelector(`.compare-btn[data-id="${id}"]`);
    if(btnEl) btnEl.classList.remove('active');
    renderCompareBar();
  });
  document.getElementById('compare-clear').addEventListener('click', () => {
    compareSet.forEach(id => {
      const cardEl = grid.querySelector(`.card[data-id="${id}"]`);
      if(cardEl) cardEl.classList.remove('compare-selected');
    });
    compareSet.clear();
    grid.querySelectorAll('.compare-btn.active').forEach(b => b.classList.remove('active'));
    renderCompareBar();
  });
  document.getElementById('compare-open').addEventListener('click', () => {
    if(compareSet.size === 0) return;
    compareGrid.innerHTML = [...compareSet].map(id => {
      const f = FORMS.find(x => x.id === id);
      if(!f) return '';
      return `<div class="compare-col"><div class="compare-col-header">${f.title}</div><iframe src="${f.file}" tabindex="-1"></iframe></div>`;
    }).join('');
    compareBackdrop.classList.add('open');
  });
  document.getElementById('compare-close').addEventListener('click', () => {
    compareBackdrop.classList.remove('open');
    compareGrid.innerHTML = '';
  });
  compareBackdrop.addEventListener('click', (e) => { if(e.target === compareBackdrop){ compareBackdrop.classList.remove('open'); compareGrid.innerHTML = ''; } });

  // ---------------- modal ----------------
  const backdrop = document.getElementById('modal-backdrop');
  const modalTitle = document.getElementById('modal-title');
  const modalBlurb = document.getElementById('modal-blurb');
  const modalIframe = document.getElementById('modal-iframe');
  const modalCode = document.getElementById('modal-code');
  const modalFav = document.getElementById('modal-fav');
  const openNew = document.getElementById('open-new');
  const modalOpenFull = document.getElementById('modal-open-full');
  const tabBtns = [...document.querySelectorAll('.tab-btn')];
  const panels = {
    preview: document.querySelector('[data-panel="preview"]'),
    code: document.querySelector('[data-panel="code"]'),
    connect: document.querySelector('[data-panel="connect"]'),
  };
  const colorRow = document.getElementById('color-row');
  const customColor = document.getElementById('custom-color');
  const a11yBadge = document.getElementById('a11y-badge');
  const a11yPanel = document.getElementById('a11y-panel');
  const connectProvider = document.getElementById('connect-provider');
  const connectCode = document.getElementById('connect-code');

  const SWATCHES = ['#3346ff', '#e8a33d', '#7ce7c4', '#c1512f', '#ef4899', '#22c55e', '#0ea5e9', '#111111'];
  let currentId = null;

  function buildSwatches(){
    colorRow.querySelectorAll('.swatch').forEach(s => s.remove());
    SWATCHES.forEach(color => {
      const s = document.createElement('button');
      s.type = 'button';
      s.className = 'swatch';
      s.style.background = color;
      s.title = color;
      s.addEventListener('click', () => applyAccent(color, s));
      colorRow.insertBefore(s, customColor);
    });
  }
  buildSwatches();

  function applyAccent(color, swatchEl){
    colorRow.querySelectorAll('.swatch').forEach(s => s.classList.toggle('active', s === swatchEl));
    if(modalIframe.contentWindow){
      modalIframe.contentWindow.postMessage({ type: 'loginkit-accent', color }, '*');
    }
  }
  customColor.addEventListener('input', (e) => applyAccent(e.target.value, null));

  function openModal(id, tab){
    const f = FORMS.find(x => x.id === id);
    if(!f) return;
    currentId = id;
    modalTitle.textContent = f.title;
    modalBlurb.textContent = f.blurb;
    modalIframe.src = f.file;
    modalCode.textContent = f.code;
    openNew.href = f.file;
    modalOpenFull.href = f.file;
    modalFav.classList.toggle('active', isFavorite(id));
    colorRow.querySelectorAll('.swatch').forEach(s => s.classList.remove('active'));
    a11yBadge.hidden = true;
    a11yPanel.classList.remove('open');
    a11yPanel.hidden = true;
    modalIframe.addEventListener('load', function onLoad(){
      modalIframe.removeEventListener('load', onLoad);
      const result = runAudit(f, modalIframe) || a11yCache.get(f.id);
      if(!result) return;
      a11yBadge.hidden = false;
      a11yBadge.classList.toggle('pass', result.score === result.total);
      a11yBadge.classList.toggle('warn', result.score < result.total);
      a11yBadge.innerHTML = `<span class="dot"></span> Accessibility ${result.score}/${result.total}`;
      a11yPanel.innerHTML = '<ul>' + result.checks.map(c =>
        `<li class="${c.pass ? 'pass' : 'fail'}"><span class="mark">${c.pass ? '✓' : '✕'}</span>${c.label}</li>`
      ).join('') + '</ul>';
    });
    renderConnectSnippet(f);
    backdrop.classList.add('open');
    switchTab(tab || 'preview');
  }
  function closeModal(){
    backdrop.classList.remove('open');
    modalIframe.src = '';
    currentId = null;
  }
  function switchTab(tab){
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    panels.preview.hidden = tab !== 'preview';
    panels.code.hidden = tab !== 'code';
    panels.connect.hidden = tab !== 'connect';
  }
  a11yBadge.addEventListener('click', () => {
    a11yPanel.hidden = false;
    a11yPanel.classList.toggle('open');
  });

  modalFav.addEventListener('click', () => {
    if(!currentId) return;
    const active = toggleFavorite(currentId);
    modalFav.classList.toggle('active', active);
    const cardBtn = grid.querySelector(`.fav-btn[data-id="${currentId}"]`);
    if(cardBtn) cardBtn.classList.toggle('active', active);
  });

  document.getElementById('modal-close').addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => { if(e.target === backdrop) closeModal(); });
  document.addEventListener('keydown', (e) => {
    if(e.key !== 'Escape') return;
    if(backdrop.classList.contains('open')) closeModal();
    if(compareBackdrop.classList.contains('open')){ compareBackdrop.classList.remove('open'); compareGrid.innerHTML = ''; }
  });
  tabBtns.forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  document.getElementById('copy-code').addEventListener('click', async () => {
    const btn = document.getElementById('copy-code');
    try{
      await navigator.clipboard.writeText(modalCode.textContent);
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = original, 1400);
    }catch(err){
      const range = document.createRange();
      range.selectNode(modalCode);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }
  });

  document.getElementById('download-code').addEventListener('click', () => {
    if(!currentId) return;
    const f = FORMS.find(x => x.id === currentId);
    if(!f) return;
    const blob = new Blob([f.code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${f.id}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  document.getElementById('export-theme').addEventListener('click', () => {
    if(!currentId) return;
    const f = FORMS.find(x => x.id === currentId);
    if(!f) return;
    const match = f.code.match(/:root\{[^}]*\}/);
    const themeCss = match
      ? `/* ${f.palette} — exported from LoginKit */\n${match[0].replace(/;/g, ';\n  ').replace('{', '{\n  ').replace(/\s*\}$/, '\n}')}`
      : `/* ${f.palette} */\n:root{ --accent: #3346ff; }`;
    const blob = new Blob([themeCss], { type: 'text/css' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${f.palette_key}-theme.css`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  // ---------------- connect / backend snippet generator ----------------
  function detectFields(code){
    const emailIds = [...code.matchAll(/type="email"[^>]*id="([^"]+)"/g)].map(m => m[1]);
    const pwIds = [...code.matchAll(/type="password"[^>]*id="((?!confirm)[a-zA-Z]+)"/g)].map(m => m[1]);
    return {
      email: emailIds[0] || 'emailInput',
      password: pwIds[0] || 'pwInput',
      hasTwoForms: emailIds.length > 1,
    };
  }

  function connectSnippet(provider, f){
    const { email, password, hasTwoForms } = detectFields(f.code);
    const modeLine = `const mode = document.querySelector("#tabs button.active")?.dataset.tab || "signin";`;
    const formNote = hasTwoForms
      ? `// Note: this template uses two separate forms (sign-in / sign-up) with their own field IDs.\n// Repeat the relevant block below for the second form's ids.\n`
      : '';

    if(provider === 'firebase'){
      return `${formNote}import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";

const app = initializeApp({ /* your Firebase config */ });
const auth = getAuth(app);

document.querySelector("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("${email}").value;
  const password = document.getElementById("${password}").value;
  ${modeLine}

  try {
    if (mode === "signup") {
      await createUserWithEmailAndPassword(auth, email, password);
    } else {
      await signInWithEmailAndPassword(auth, email, password);
    }
    window.location.href = "/dashboard";
  } catch (err) {
    console.error(err.code, err.message);
  }
});`;
    }

    if(provider === 'supabase'){
      return `${formNote}import { createClient } from "@supabase/supabase-js";

const supabase = createClient("YOUR_SUPABASE_URL", "YOUR_SUPABASE_ANON_KEY");

document.querySelector("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("${email}").value;
  const password = document.getElementById("${password}").value;
  ${modeLine}

  const { data, error } = mode === "signup"
    ? await supabase.auth.signUp({ email, password })
    : await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    console.error(error.message);
    return;
  }
  window.location.href = "/dashboard";
});`;
    }

    return `${formNote}document.querySelector("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("${email}").value;
  const password = document.getElementById("${password}").value;
  ${modeLine}

  const res = await fetch(mode === "signup" ? "/api/signup" : "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error(err.message || res.statusText);
    return;
  }

  const { token } = await res.json();
  localStorage.setItem("token", token);
  window.location.href = "/dashboard";
});`;
  }

  function renderConnectSnippet(f){
    connectCode.textContent = connectSnippet(connectProvider.value, f);
  }
  connectProvider.addEventListener('change', () => {
    if(!currentId) return;
    const f = FORMS.find(x => x.id === currentId);
    if(f) renderConnectSnippet(f);
  });
  document.getElementById('copy-connect').addEventListener('click', async () => {
    const btn = document.getElementById('copy-connect');
    try{
      await navigator.clipboard.writeText(connectCode.textContent);
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = original, 1400);
    }catch(err){
      const range = document.createRange();
      range.selectNode(connectCode);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }
  });

  // ---------------- surprise me ----------------
  document.getElementById('surprise-btn').addEventListener('click', () => {
    if(!FORMS.length) return;
    const pick = FORMS[Math.floor(Math.random() * FORMS.length)];
    openModal(pick.id, 'preview');
  });

  // ---------------- keyboard navigation ----------------
  let kbdIndex = -1;
  function cardEls(){ return [...grid.querySelectorAll('.card')]; }
  function setKbdFocus(idx){
    const cards = cardEls();
    if(!cards.length) return;
    cards.forEach(c => c.classList.remove('kbd-focus'));
    kbdIndex = Math.max(0, Math.min(idx, cards.length - 1));
    const el = cards[kbdIndex];
    el.classList.add('kbd-focus');
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  document.addEventListener('keydown', (e) => {
    const tag = (e.target.tagName || '').toLowerCase();
    const typing = tag === 'input' || tag === 'textarea';
    if(e.key === '/' && !typing){
      e.preventDefault();
      searchInput.focus();
      return;
    }
    if(typing) return;
    if(backdrop.classList.contains('open') || compareBackdrop.classList.contains('open')) return;
    if(e.key === 'j' || e.key === 'ArrowDown'){ e.preventDefault(); setKbdFocus(kbdIndex + 1); }
    else if(e.key === 'k' || e.key === 'ArrowUp'){ e.preventDefault(); setKbdFocus(kbdIndex - 1); }
    else if(e.key === 'Enter' && kbdIndex >= 0){
      const cards = cardEls();
      if(cards[kbdIndex]) openModal(cards[kbdIndex].dataset.id, 'preview');
    }
  });

  // ---------------- hero rotating preview ----------------
  const heroPreview = document.getElementById('hero-preview');
  if(FORMS.length){
    let idx = 0;
    function showHero(){
      const f = FORMS[idx % FORMS.length];
      heroPreview.innerHTML = `<iframe src="${f.file}" tabindex="-1"></iframe><div class="hp-label"><span>${f.title}</span><span>#${String(f.n).padStart(2,'0')}</span></div>`;
      const iframe = heroPreview.querySelector('iframe');
      iframe.addEventListener('load', () => iframe.classList.add('loaded'), { once: true });
      idx++;
    }
    showHero();
    setInterval(showHero, 4500);
  }

  render();
})();

/* ================= crazy mode ================= */
(function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarsePointer = window.matchMedia('(hover: none), (pointer: coarse)').matches;
  const fine = !reduceMotion && !coarsePointer;

  // ---------------- synthesized sound effects (no external assets) ----------------
  let audioCtx = null;
  function getCtx(){
    if(!audioCtx){
      try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){ return null; }
    }
    return audioCtx;
  }
  function playClink(big){
    const ctx = getCtx();
    if(!ctx) return;
    const now = ctx.currentTime;
    const freqs = big ? [880, 1318.5, 1760] : [1046.5, 1568];
    freqs.forEach((f, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = f;
      gain.gain.setValueAtTime(0, now + i * 0.03);
      gain.gain.linearRampToValueAtTime(big ? 0.09 : 0.05, now + i * 0.03 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.03 + (big ? 0.5 : 0.3));
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(now + i * 0.03);
      osc.stop(now + i * 0.03 + (big ? 0.55 : 0.35));
    });
  }
  document.addEventListener('click', (e) => {
    if(e.target.closest('[data-action="preview"], [data-action="code"]')) playClink(false);
    const fav = e.target.closest('.fav-btn, #modal-fav');
    if(fav) playClink(false);
  });

  // ---------------- custom cursor ----------------
  if(fine){
    document.documentElement.classList.add('cursor-active');
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    let mx = window.innerWidth/2, my = window.innerHeight/2, rx = mx, ry = my;
    document.addEventListener('mousemove', (e) => { mx = e.clientX; my = e.clientY; dot.style.transform = `translate(${mx}px, ${my}px)`; });
    (function ringLoop(){
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(ringLoop);
    })();
    document.addEventListener('mouseover', (e) => {
      if(e.target.closest('a, button, .card, input')) ring.classList.add('hovering');
    });
    document.addEventListener('mouseout', (e) => {
      if(e.target.closest('a, button, .card, input')) ring.classList.remove('hovering');
    });
  }

  // ---------------- card 3D tilt + shine ----------------
  const grid = document.getElementById('card-grid');
  if(grid){
    grid.addEventListener('mousemove', (e) => {
      const card = e.target.closest('.card');
      if(!card) return;
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rotY = (px - 0.5) * 14;
      const rotX = (0.5 - py) * 14;
      card.style.setProperty('--rx', rotX.toFixed(2) + 'deg');
      card.style.setProperty('--ry', rotY.toFixed(2) + 'deg');
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    });
    grid.addEventListener('mouseleave', (e) => {
      grid.querySelectorAll('.card').forEach(c => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
    }, true);
  }

  // ---------------- mouse-reactive hero glow ----------------
  const hero = document.querySelector('.hero');
  if(hero && fine){
    hero.addEventListener('mousemove', (e) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty('--hx', (e.clientX - r.left) + 'px');
      hero.style.setProperty('--hy', (e.clientY - r.top) + 'px');
    });
  }

  // ---------------- gold-dust sparkle trail ----------------
  if(fine){
    const canvas = document.getElementById('sparkle-canvas');
    const ctx2d = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth, H = canvas.height = window.innerHeight;
    window.addEventListener('resize', () => { W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; });
    let particles = [];
    let lastSpawn = 0;
    document.addEventListener('mousemove', (e) => {
      const t = performance.now();
      if(t - lastSpawn < 45) return;
      lastSpawn = t;
      particles.push({
        x: e.clientX, y: e.clientY,
        vx: (Math.random() - 0.5) * 0.4, vy: -Math.random() * 0.6 - 0.2,
        r: Math.random() * 1.6 + 0.6, life: 1,
      });
      if(particles.length > 140) particles.splice(0, particles.length - 140);
    });
    (function particleLoop(){
      ctx2d.clearRect(0, 0, W, H);
      particles.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.life -= 0.018;
        ctx2d.globalAlpha = Math.max(p.life, 0);
        ctx2d.fillStyle = '#e7cb8a';
        ctx2d.beginPath();
        ctx2d.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx2d.fill();
      });
      particles = particles.filter(p => p.life > 0);
      ctx2d.globalAlpha = 1;
      requestAnimationFrame(particleLoop);
    })();
  }

  // ---------------- gold rush event ----------------
  const rushLayer = document.getElementById('goldRush');
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  function showToast(msg){
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  }
  function goldRush(){
    playClink(true);
    showToast('✦ The Vault is open ✦');
    const flash = document.createElement('div');
    flash.className = 'rush-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 1200);
    const count = reduceMotion ? 0 : 70;
    for(let i = 0; i < count; i++){
      const piece = document.createElement('div');
      piece.className = 'rush-piece';
      const left = Math.random() * 100;
      const dur = 2.2 + Math.random() * 1.8;
      const delay = Math.random() * 0.6;
      const size = 6 + Math.random() * 8;
      piece.style.left = left + 'vw';
      piece.style.width = size + 'px';
      piece.style.height = size + 'px';
      piece.style.animationDuration = dur + 's';
      piece.style.animationDelay = delay + 's';
      rushLayer.appendChild(piece);
      setTimeout(() => piece.remove(), (dur + delay) * 1000 + 200);
    }
  }

  // Konami code
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let konamiIndex = 0;
  document.addEventListener('keydown', (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if(key === KONAMI[konamiIndex]){
      konamiIndex++;
      if(konamiIndex === KONAMI.length){ konamiIndex = 0; goldRush(); }
    } else {
      konamiIndex = (key === KONAMI[0]) ? 1 : 0;
    }
  });

  // logo click easter egg (5 rapid clicks)
  const logo = document.getElementById('logoMark');
  if(logo){
    let clicks = 0, clickTimer = null;
    logo.addEventListener('click', () => {
      clicks++;
      clearTimeout(clickTimer);
      clickTimer = setTimeout(() => { clicks = 0; }, 900);
      if(clicks >= 5){ clicks = 0; goldRush(); }
    });
  }
})();
