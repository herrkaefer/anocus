(function () {
  const DEFAULTS = {
    apiBase: '/api/anocus',
    pathname: window.location.pathname,
    pageTitle: document.title,
    lang: 'en',
    theme: 'auto',
    maxLength: 5000,
    turnstileSiteKey: '',
  };

  function normalizePathname(pathname) {
    const raw = String(pathname || '').trim();
    if (!raw) return '/';
    let decoded = raw;
    try {
      decoded = decodeURI(raw);
    } catch (_) {
      decoded = raw;
    }
    const path = decoded.startsWith('/') ? decoded : '/' + decoded;
    if (path.length > 1 && path.endsWith('/')) return path.slice(0, -1);
    return path;
  }

  function escapeHtml(input) {
    return String(input)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const text = await response.text();
    let payload = null;
    try {
      payload = text ? JSON.parse(text) : null;
    } catch (_) {
      payload = null;
    }

    if (!response.ok) {
      const message = payload && payload.error ? payload.error : `HTTP ${response.status}`;
      throw new Error(message);
    }
    return payload;
  }

  let turnstileScriptPromise = null;
  function ensureTurnstileScript() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (turnstileScriptPromise) return turnstileScriptPromise;

    turnstileScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => reject(new Error('Failed to load Turnstile script'));
      document.head.appendChild(script);
    });

    return turnstileScriptPromise;
  }

  function renderCommentsList(container, comments) {
    if (!comments || comments.length === 0) {
      container.innerHTML = '<div class="anocus-empty">No comments yet.</div>';
      return;
    }

    const html = comments
      .map((comment) => {
        const name = escapeHtml(comment.author && comment.author.name ? comment.author.name : 'guest');
        const badge = comment.author && comment.author.kind === 'github' ? '<span class="anocus-author-badge">GitHub</span>' : '<span class="anocus-author-badge anocus-author-badge-guest">Guest</span>';
        const content = escapeHtml(comment.content || '').replace(/\n/g, '<br>');
        const createdAt = formatDate(comment.createdAt || '');
        return [
          '<article class="anocus-comment">',
          '  <header class="anocus-comment-header">',
          `    <span class="anocus-author">${name}</span>${badge}`,
          `    <time class="anocus-time">${escapeHtml(createdAt)}</time>`,
          '  </header>',
          `  <div class="anocus-comment-body">${content}</div>`,
          '</article>',
        ].join('');
      })
      .join('');

    container.innerHTML = html;
  }

  function mount(options) {
    const opts = Object.assign({}, DEFAULTS, options || {});
    const root = typeof opts.container === 'string' ? document.querySelector(opts.container) : opts.container;
    if (!root) {
      throw new Error('Anocus container not found');
    }

    const state = {
      thread: null,
      comments: [],
      turnstileToken: '',
      turnstileWidgetId: null,
    };

    root.classList.add('anocus-root');
    root.innerHTML = [
      '<section class="anocus">',
      '  <div class="anocus-head">',
      '    <h3>Comments</h3>',
      '  </div>',
      '  <div class="anocus-feedback" data-role="feedback"></div>',
      '  <div class="anocus-list" data-role="list"></div>',
      '  <form class="anocus-form" data-role="form">',
      '    <div class="anocus-row">',
      '      <label>Name</label>',
      '      <input type="text" name="guest_name" maxlength="80" required />',
      '    </div>',
      '    <div class="anocus-row">',
      '      <label>Email (optional)</label>',
      '      <input type="email" name="guest_email" maxlength="254" />',
      '    </div>',
      '    <div class="anocus-row">',
      '      <label>Comment</label>',
      `      <textarea name="content" rows="5" maxlength="${opts.maxLength}" required></textarea>`,
      '    </div>',
      '    <div class="anocus-row anocus-turnstile" data-role="turnstile"></div>',
      '    <div class="anocus-row">',
      '      <button type="submit">Post Comment</button>',
      '    </div>',
      '  </form>',
      '</section>',
    ].join('');

    const listNode = root.querySelector('[data-role="list"]');
    const formNode = root.querySelector('[data-role="form"]');
    const feedbackNode = root.querySelector('[data-role="feedback"]');
    const turnstileNode = root.querySelector('[data-role="turnstile"]');

    function setFeedback(message, type) {
      feedbackNode.textContent = message || '';
      feedbackNode.className = 'anocus-feedback' + (type ? ` ${type}` : '');
    }

    async function loadComments() {
      try {
        setFeedback('Loading comments...', 'info');
        const pathname = normalizePathname(opts.pathname);
        const query = new URLSearchParams({ pathname });
        const payload = await requestJson(`${opts.apiBase}/thread?${query.toString()}`, {
          method: 'GET',
          credentials: 'same-origin',
        });
        state.thread = payload.thread;
        state.comments = payload.comments || [];
        renderCommentsList(listNode, state.comments);
        setFeedback('', '');
      } catch (error) {
        setFeedback(error.message || 'Unable to load comments', 'error');
      }
    }

    function resetTurnstile() {
      if (window.turnstile && state.turnstileWidgetId !== null) {
        window.turnstile.reset(state.turnstileWidgetId);
      }
      state.turnstileToken = '';
    }

    async function setupTurnstile() {
      if (!opts.turnstileSiteKey) return;
      try {
        const turnstile = await ensureTurnstileScript();
        state.turnstileWidgetId = turnstile.render(turnstileNode, {
          sitekey: opts.turnstileSiteKey,
          callback: function (token) {
            state.turnstileToken = token;
          },
          'expired-callback': function () {
            state.turnstileToken = '';
          },
        });
      } catch (error) {
        setFeedback(error.message || 'Unable to load Turnstile', 'error');
      }
    }

    formNode.addEventListener('submit', async function (event) {
      event.preventDefault();
      const formData = new FormData(formNode);
      const guestName = String(formData.get('guest_name') || '').trim();
      const guestEmail = String(formData.get('guest_email') || '').trim();
      const content = String(formData.get('content') || '').trim();

      if (!guestName || !content) {
        setFeedback('Name and comment are required.', 'error');
        return;
      }

      if (opts.turnstileSiteKey && !state.turnstileToken) {
        setFeedback('Please complete human verification.', 'error');
        return;
      }

      try {
        setFeedback('Posting comment...', 'info');
        const payload = await requestJson(`${opts.apiBase}/comment`, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            pathname: normalizePathname(opts.pathname),
            page_title: String(opts.pageTitle || document.title || '').trim(),
            guest_name: guestName,
            guest_email: guestEmail,
            content,
            turnstile_token: state.turnstileToken,
          }),
        });

        state.thread = payload.thread;
        state.comments = state.comments.concat(payload.comment);
        renderCommentsList(listNode, state.comments);
        formNode.reset();
        resetTurnstile();
        setFeedback('Comment posted.', 'success');
      } catch (error) {
        setFeedback(error.message || 'Unable to post comment', 'error');
      }
    });

    setupTurnstile();
    loadComments();
  }

  window.Anocus = {
    mount,
  };
})();
