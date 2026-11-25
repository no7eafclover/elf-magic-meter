(() => {
  'use strict';
  const config = window.ELF_MAGIC_CONFIG || {};
  const pagesHost = /^([a-z0-9-]+)\.github\.io$/i.exec(location.hostname);
  const pathParts = location.pathname.split('/').filter(Boolean);
  const owner = pagesHost ? pagesHost[1] : config.owner;
  const repo = pagesHost && pathParts.length ? decodeURIComponent(pathParts[0]) : config.repo;
  const branch = config.branch || 'main';
  const dataPath = config.dataPath || 'data/magic.json';
  const endpoint = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${dataPath}`;
  const $ = id => document.getElementById(id);
  const range = $('level-range');
  const textarea = $('message');
  let token = null; // Only in page memory; never saved in a cookie or local storage.
  let sourceSha = null;
  let isPublishing = false;

  const number = v => Math.min(100, Math.max(0, Math.round(Number(v) || 0)));
  function statusFor(level) {
    if (level >= 90) return 'SANTA-LEVEL MAGIC!';
    if (level >= 65) return 'SPARKLING STRONG!';
    if (level >= 35) return 'MAGIC IS BUILDING';
    return 'NEEDS CHRISTMAS CHEER';
  }
  function setStatus(message, kind) {
    $('save-status').textContent = message;
    $('save-status').className = `save-status ${kind || ''}`;
  }
  function updatePreview() {
    const level = number(range.value);
    range.value = String(level);
    $('level-output').textContent = String(level);
    $('preview-number').textContent = `${level}%`;
    $('preview-bar').style.width = `${level}%`;
    $('preview-status').textContent = statusFor(level);
    $('preview-message').textContent = textarea.value || 'Keep spreading Christmas cheer!';
    $('char-count').textContent = `${textarea.value.length} / 220`;
    $('preview-state').textContent = 'LOCAL PREVIEW';
  }
  function setCurrent(data) {
    if (!Number.isInteger(data.value) || data.value < 0 || data.value > 100 || typeof data.message !== 'string') {
      throw new Error('The repository has invalid magic data.');
    }
    range.value = data.value;
    textarea.value = data.message.slice(0, 220);
    updatePreview();
  }
  function utf8ToBase64(text) {
    const bytes = new TextEncoder().encode(text);
    let binary = '';
    for (let i=0; i<bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  function base64ToUtf8(base64) {
    const binary = atob(base64.replace(/\s/g,''));
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }
  async function github(method, url, body, authorization) {
    const headers = {
      'Accept':'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28',
      'Authorization':`Bearer ${authorization}`
    };
    if (body) headers['Content-Type'] = 'application/json';
    const response = await fetch(url, {method, headers, body:body ? JSON.stringify(body) : undefined, cache:'no-store'});
    const data = await response.json().catch(()=>({}));
    if (!response.ok) {
      const err = new Error(data.message || `GitHub returned HTTP ${response.status}`);
      err.status = response.status;
      throw err;
    }
    return data;
  }
  async function loadFromRepo(authorization) {
    const file = await github('GET', `${endpoint}?ref=${encodeURIComponent(branch)}`, null, authorization);
    if (!file.sha || !file.content) throw new Error('Could not read the magic.json file.');
    return {sha: file.sha, data: JSON.parse(base64ToUtf8(file.content))};
  }
  function connected(yes) {
    $('connect').hidden = yes;
    $('disconnect').hidden = !yes;
    $('token-entry').hidden = yes;
    $('publish').disabled = !yes;
    $('auth-text').textContent = yes ? `Connected to ${owner}/${repo}` : 'Not connected';
    $('auth-dot').classList.toggle('live', yes);
    $('auth-dot').classList.toggle('muted', !yes);
  }
  async function connect() {
    const candidate = $('token').value.trim();
    if (!candidate) { setStatus('Enter your fine-grained GitHub token first.', 'error'); return; }
    $('connect').disabled = true;
    setStatus('Checking repository access…');
    try {
      const file = await loadFromRepo(candidate);
      sourceSha = file.sha;
      token = candidate;
      $('token').value = '';
      setCurrent(file.data);
      connected(true);
      setStatus('Connected. You can now publish changes.', 'success');
    } catch(error) {
      const hint = error.status === 401 ? 'The token was rejected.' :
        error.status === 403 ? 'Check that this token has Contents read/write for this repository.' :
        error.status === 404 ? `Repository or magic.json not found. Confirm ${owner}/${repo} is published.` : error.message;
      setStatus(hint, 'error');
    } finally { $('connect').disabled = false; }
  }
  async function publish() {
    if (!token || isPublishing) return;
    const level = number(range.value);
    const message = textarea.value.trim();
    if (!message || message.length > 220) {setStatus('Write a message of 1–220 characters.', 'error');return;}
    isPublishing = true;
    $('publish').disabled = true;
    setStatus('Checking for other parent updates…');
    try {
      const current = await loadFromRepo(token);
      if (current.sha !== sourceSha) {
        sourceSha = current.sha;
        throw new Error('Another update was published since you connected. Review their changes before publishing; reconnect to load them.');
      }
      const payload = {
        value: level,
        message,
        updated_at: new Date().toISOString()
      };
      setStatus('Saving your magic to GitHub…');
      const saved = await github('PUT', endpoint, {
        message:`✨ Set Nikki Nik magic to ${level}%`,
        content:utf8ToBase64(JSON.stringify(payload,null,2)+'\n'),
        sha: sourceSha,
        branch
      }, token);
      if (!saved.content?.sha) throw new Error('GitHub saved the update, but did not return a file SHA.');
      sourceSha = saved.content.sha;
      $('preview-state').textContent = 'SAVED TO GITHUB';
      setStatus('✨ Published to GitHub! The DAKboard display will pick it up as the new data becomes available.', 'success');
    } catch (error) {
      if (error.status === 409) setStatus('Another parent changed the file. Reconnect and try again.', 'error');
      else setStatus(error.message, 'error');
    } finally {
      $('publish').disabled = !token;
      isPublishing = false;
    }
  }
  range.addEventListener('input', updatePreview);
  textarea.addEventListener('input', updatePreview);
  document.querySelectorAll('[data-step]').forEach(button => button.addEventListener('click', () => {
    range.value = String(number(Number(range.value) + Number(button.dataset.step)));
    updatePreview();
  }));
  document.querySelectorAll('[data-value]').forEach(button => button.addEventListener('click', () => {
    range.value = String(number(button.dataset.value));
    updatePreview();
  }));
  $('connect').addEventListener('click', connect);
  $('disconnect').addEventListener('click', () => {
    token = null; sourceSha = null;
    connected(false);
    setStatus('Disconnected. Your access token is no longer held by this page.');
  });
  $('publish').addEventListener('click', publish);
  $('repo-path').textContent = `${owner}/${repo}`;
  $('settings-token').href = 'https://github.com/settings/personal-access-tokens/new';
  $('repo-link').href = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  connected(false);
  updatePreview();
  // Show published state as a non-authoritative preview even before connecting.
  fetch(new URL('./data/magic.json?t='+Date.now(), document.baseURI), {cache:'no-store'})
    .then(r=>r.ok?r.json():null).then(data=>{if(data && !token) setCurrent(data);}).catch(()=>{});
})();
