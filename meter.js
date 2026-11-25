(() => {
  'use strict';
  const settings = window.ELF_MAGIC_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const githubPagesHost = /^([a-z0-9-]+)\.github\.io$/i.exec(location.hostname);
  const parts = location.pathname.split('/').filter(Boolean);
  const owner = githubPagesHost ? githubPagesHost[1] : settings.owner;
  const repo = githubPagesHost && parts.length ? decodeURIComponent(parts[0]) : settings.repo;
  const branch = settings.branch || 'main';
  const dataPath = settings.dataPath || 'data/magic.json';
  const interval = Math.max(20000, Number(settings.refreshMs) || 30000);
  let latestUpdatedAt = 0;
  let loadedOnce = false;
  let busy = false;

  function statusFor(level) {
    if (level >= 90) return 'SANTA-LEVEL MAGIC!';
    if (level >= 65) return 'SPARKLING STRONG!';
    if (level >= 35) return 'MAGIC IS BUILDING';
    return 'NEEDS CHRISTMAS CHEER';
  }
  function isValid(data) {
    return data && Number.isInteger(data.value) && data.value >= 0 && data.value <= 100 &&
      typeof data.message === 'string' && data.message.length <= 220;
  }
  function apply(data) {
    if (!isValid(data)) throw new Error('Unexpected magic meter data');
    // If the alternate feed is temporarily stale, never move the meter backwards.
    const time = data.updated_at ? Date.parse(data.updated_at) : 0;
    if (Number.isFinite(time) && time && latestUpdatedAt && time < latestUpdatedAt) return;
    if (Number.isFinite(time) && time) latestUpdatedAt = time;
    const level = data.value;
    $('meter-number').textContent = `${level}%`;
    $('arc-progress').setAttribute('stroke-dasharray', `${level} 100`);
    $('arc-progress-glow').setAttribute('stroke-dasharray', `${level} 100`);
    const angle = Math.PI - level * Math.PI / 100;
    $('needle').setAttribute('x2', String(300 + 176 * Math.cos(angle)));
    $('needle').setAttribute('y2', String(322 - 176 * Math.sin(angle)));
    $('magic-status').textContent = statusFor(level);
    $('elf-message').textContent = data.message || 'Keep spreading Christmas cheer!';
    document.querySelector('.meter-stage')?.classList.toggle('celebrate', level >= 90);
  }
  function setIndicator(label, ok) {
    $('source-indicator').textContent = label;
    document.querySelector('.live-dot')?.classList.toggle('live', Boolean(ok));
    const status = $('connection-message');
    if (status) status.textContent = ok ? 'Magic level synchronized.' : 'Showing the last available magic level.';
  }
  async function fetchJSON(url) {
    const result = await fetch(url, {cache: 'no-store', credentials: 'omit', redirect: 'follow'});
    if (!result.ok) throw new Error(`HTTP ${result.status}`);
    return result.json();
  }
  async function refresh() {
    if (busy) return;
    busy = true;
    try {
      // Fast path: get the latest public commit without waiting for a Pages rebuild.
      // GitHub Raw's CDN can still cache content, so updates are not guaranteed instant.
      const raw = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${dataPath}?t=${Date.now()}`;
      let response;
      let source = 'GITHUB · SYNCED';
      try {
        response = await fetchJSON(raw);
        if (!isValid(response)) throw new Error('Invalid raw data');
      } catch (rawError) {
        // GitHub Pages is the fallback, without depending on external services.
        const local = new URL(`./${dataPath}`, document.baseURI);
        local.searchParams.set('t', String(Date.now()));
        response = await fetchJSON(local);
        source = 'PAGES · SYNCED';
      }
      apply(response);
      loadedOnce = true;
      setIndicator(source, true);
    } catch (error) {
      setIndicator(loadedOnce ? 'RECONNECTING' : 'PREVIEW MODE', false);
      console.warn('Unable to refresh Elf Magic Meter:', error);
    } finally {
      busy = false;
    }
  }
  apply({value:75,message:'Nikki Nik says the Christmas magic is growing!',updated_at:null});
  refresh();
  setInterval(refresh, interval);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
