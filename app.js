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

  let io;
  function setupLazyIframes(){
    if(io) io.disconnect();
    io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          const iframe = entry.target;
          if(iframe.dataset.src && !iframe.src){
            iframe.src = iframe.dataset.src;
            iframe.addEventListener('load', () => iframe.classList.add('loaded'), { once: true });
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
  };
  const colorRow = document.getElementById('color-row');
  const customColor = document.getElementById('custom-color');

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
  }

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
