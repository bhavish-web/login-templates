(function(){
  const FORMS = window.FORMS || [];
  const grid = document.getElementById('card-grid');
  const emptyState = document.getElementById('empty-state');
  const resultCount = document.getElementById('result-count');
  const searchInput = document.getElementById('search');
  const layoutChipsEl = document.getElementById('layout-chips');
  const paletteChipsEl = document.getElementById('palette-chips');
  document.getElementById('stat-count').textContent = FORMS.length;

  const state = { query: '', layout: null, palette: null };

  // ---- build filter chips from data ----
  const layouts = [...new Map(FORMS.map(f => [f.layout_key, f.layout])).entries()];
  const palettes = [...new Map(FORMS.map(f => [f.palette_key, f.palette])).entries()];

  function buildChips(container, items, key){
    items.forEach(([val, label]) => {
      const chip = document.createElement('button');
      chip.className = 'chip';
      chip.textContent = label;
      chip.addEventListener('click', () => {
        state[key] = state[key] === val ? null : val;
        render();
        [...container.children].forEach(c => c.classList.toggle('active', c === chip && state[key] === val));
      });
      container.appendChild(chip);
    });
  }
  buildChips(layoutChipsEl, layouts, 'layout');
  buildChips(paletteChipsEl, palettes, 'palette');

  function matches(f){
    const q = state.query.trim().toLowerCase();
    const hay = (f.title + ' ' + f.layout + ' ' + f.palette + ' ' + f.blurb).toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(state.layout && f.layout_key !== state.layout) return false;
    if(state.palette && f.palette_key !== state.palette) return false;
    return true;
  }

  function cardHTML(f){
    return `
      <div class="card" data-id="${f.id}">
        <div class="card-preview" data-action="preview" data-id="${f.id}">
          <span class="num">${String(f.n).padStart(2,'0')}</span>
          <iframe src="${f.file}" loading="lazy" tabindex="-1"></iframe>
        </div>
        <div class="card-body">
          <div class="card-title">${f.title}</div>
          <div class="card-blurb">${f.blurb}</div>
          <div class="card-tags"><span class="tag">${f.layout}</span><span class="tag">${f.palette}</span></div>
          <div class="card-actions">
            <button data-action="preview" data-id="${f.id}">Preview</button>
            <button class="primary" data-action="code" data-id="${f.id}">Code</button>
          </div>
        </div>
      </div>
    `;
  }

  function render(){
    const results = FORMS.filter(matches);
    resultCount.textContent = results.length;
    grid.innerHTML = results.map(cardHTML).join('');
    emptyState.hidden = results.length !== 0;
  }

  searchInput.addEventListener('input', (e) => { state.query = e.target.value; render(); });
  document.getElementById('reset-filters').addEventListener('click', () => {
    state.query = ''; state.layout = null; state.palette = null;
    searchInput.value = '';
    [...layoutChipsEl.children, ...paletteChipsEl.children].forEach(c => c.classList.remove('active'));
    render();
  });

  // ---- modal ----
  const backdrop = document.getElementById('modal-backdrop');
  const modalTitle = document.getElementById('modal-title');
  const modalBlurb = document.getElementById('modal-blurb');
  const modalIframe = document.getElementById('modal-iframe');
  const modalCode = document.getElementById('modal-code');
  const openNew = document.getElementById('open-new');
  const tabBtns = [...document.querySelectorAll('.tab-btn')];
  const panels = {
    preview: document.querySelector('[data-panel="preview"]'),
    code: document.querySelector('[data-panel="code"]'),
  };

  function openModal(id, tab){
    const f = FORMS.find(x => x.id === id);
    if(!f) return;
    modalTitle.textContent = f.title;
    modalBlurb.textContent = f.blurb;
    modalIframe.src = f.file;
    modalCode.textContent = f.code;
    openNew.href = f.file;
    backdrop.classList.add('open');
    switchTab(tab || 'preview');
  }
  function closeModal(){
    backdrop.classList.remove('open');
    modalIframe.src = '';
  }
  function switchTab(tab){
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
    panels.preview.hidden = tab !== 'preview';
    panels.code.hidden = tab !== 'code';
  }

  grid.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if(!btn) return;
    openModal(btn.dataset.id, btn.dataset.action);
  });

  document.getElementById('modal-close').addEventListener('click', closeModal);
  backdrop.addEventListener('click', (e) => { if(e.target === backdrop) closeModal(); });
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') closeModal(); });
  tabBtns.forEach(b => b.addEventListener('click', () => switchTab(b.dataset.tab)));

  document.getElementById('copy-code').addEventListener('click', async () => {
    const btn = document.getElementById('copy-code');
    try{
      await navigator.clipboard.writeText(modalCode.textContent);
      const original = btn.textContent;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = original, 1400);
    }catch(err){
      // fallback for environments without clipboard API
      const range = document.createRange();
      range.selectNode(modalCode);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    }
  });

  // ---- hero rotating preview ----
  const heroPreview = document.getElementById('hero-preview');
  if(FORMS.length){
    let idx = 0;
    function showHero(){
      const f = FORMS[idx % FORMS.length];
      heroPreview.innerHTML = `<iframe src="${f.file}" tabindex="-1"></iframe><div class="hp-label"><span>${f.title}</span><span>#${String(f.n).padStart(2,'0')}</span></div>`;
      idx++;
    }
    showHero();
    setInterval(showHero, 4000);
  }

  render();
})();
