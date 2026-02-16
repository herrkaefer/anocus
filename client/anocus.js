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

  function encodeAttrValue(input) {
    return encodeURIComponent(String(input || ''));
  }

  function formatDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString();
  }

  function sanitizeProfileUrl(input) {
    const raw = String(input || '').trim();
    if (!raw) return '';
    try {
      const url = new URL(raw);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return '';
      return url.toString();
    } catch (_) {
      return '';
    }
  }

  function buildDicebearAvatarUrl(seed) {
    return `https://api.dicebear.com/9.x/croodles/svg?seed=${encodeURIComponent(String(seed || 'guest'))}`;
  }

  function buildCommentTree(comments) {
    const byId = new Map();
    const byParent = new Map();
    const roots = [];
    (comments || []).forEach((comment) => {
      byId.set(comment.id, comment);
      const key = comment.parentId || '';
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(comment);
    });
    byParent.forEach((items) => {
      items.sort((a, b) => String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
    });

    function walk(node, depth, seen) {
      if (seen.has(node.id)) {
        return { comment: node, depth, children: [] };
      }
      const nextSeen = new Set(seen);
      nextSeen.add(node.id);
      const children = (byParent.get(node.id) || []).map((child) => walk(child, depth + 1, nextSeen));
      return { comment: node, depth, children };
    }

    const rootNodes = (comments || []).filter((comment) => !comment.parentId || !byId.has(comment.parentId));
    roots.push(...rootNodes.map((node) => walk(node, 0, new Set())));
    return roots;
  }

  function renderCommentNode(node) {
    const comment = node.comment;
    const depth = Math.min(node.depth || 0, 4);
    const rawName = comment.author && comment.author.name ? comment.author.name : 'guest';
    const rawProfileUrl = comment.author && comment.author.profileUrl ? String(comment.author.profileUrl) : '';
    const profileUrl = sanitizeProfileUrl(rawProfileUrl);
    const avatarUrl = buildDicebearAvatarUrl(rawName);
    const avatarHtml = `<img class="anocus-avatar" src="${escapeHtml(avatarUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" />`;
    const name = escapeHtml(rawName);
    const displayName = profileUrl
      ? `<a href="${escapeHtml(profileUrl)}" target="_blank" rel="noopener noreferrer nofollow ugc">${name}</a>`
      : name;
    const content = escapeHtml(comment.content || '').replace(/\n/g, '<br>');
    const createdAt = formatDate(comment.createdAt || '');
    const childrenHtml = (node.children || []).map(renderCommentNode).join('');
    const replyAction =
      depth === 0
        ? `<div class="anocus-comment-actions"><button type="button" class="anocus-reply-btn" data-reply-id="${escapeHtml(comment.id)}" data-reply-parent-id="${escapeHtml(comment.parentId || '')}" data-reply-name="${encodeAttrValue(rawName)}">Reply</button></div>`
        : '';

    return [
      `<article class="anocus-comment depth-${depth}" data-comment-id="${escapeHtml(comment.id)}">`,
      '  <header class="anocus-comment-header">',
      `    <span class="anocus-author" data-author-name="${name}">${avatarHtml}${displayName}</span>`,
      `    <time class="anocus-time">${escapeHtml(createdAt)}</time>`,
      '  </header>',
      `  <div class="anocus-comment-body">${content}</div>`,
      replyAction,
      childrenHtml ? `<div class="anocus-replies">${childrenHtml}</div>` : '',
      '</article>',
    ].join('');
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

    const tree = buildCommentTree(comments);
    const html = tree.map(renderCommentNode).join('');

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
      provider: '',
      comments: [],
      turnstileToken: '',
      turnstileWidgetId: null,
      replyToCommentId: '',
      replyToName: '',
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
      '    <div class="anocus-row anocus-reply-context" data-role="reply-context" style="display:none;">',
      '      <span data-role="reply-label"></span>',
      '      <button type="button" data-role="reply-cancel">Cancel</button>',
      '    </div>',
      '    <div class="anocus-row">',
      '      <label>Name</label>',
      '      <input type="text" name="guest_name" maxlength="80" required />',
      '    </div>',
      '    <div class="anocus-row">',
      '      <label>Link (optional)</label>',
      '      <input type="url" name="guest_link" maxlength="500" placeholder="https://example.com" />',
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
    const replyContextNode = root.querySelector('[data-role="reply-context"]');
    const replyLabelNode = root.querySelector('[data-role="reply-label"]');
    const replyCancelNode = root.querySelector('[data-role="reply-cancel"]');

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
        state.provider = String(payload.provider || '');
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

    function clearReplyTarget() {
      state.replyToCommentId = '';
      state.replyToName = '';
      replyLabelNode.textContent = '';
      replyContextNode.style.display = 'none';
    }

    function setReplyTarget(commentId, authorName) {
      state.replyToCommentId = String(commentId || '').trim();
      state.replyToName = String(authorName || '').trim() || 'guest';
      if (!state.replyToCommentId) {
        clearReplyTarget();
        return;
      }
      replyLabelNode.textContent = `Replying to ${state.replyToName}`;
      replyContextNode.style.display = '';
      formNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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
      const guestLink = String(formData.get('guest_link') || '').trim();
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
            guest_link: guestLink,
            content,
            parent_comment_id: state.replyToCommentId || undefined,
            turnstile_token: state.turnstileToken,
          }),
        });

        state.provider = String(payload.provider || state.provider || '');
        state.thread = payload.thread;
        state.comments = state.comments.concat(payload.comment);
        renderCommentsList(listNode, state.comments);
        formNode.reset();
        clearReplyTarget();
        resetTurnstile();
        setFeedback('Comment posted.', 'success');
      } catch (error) {
        setFeedback(error.message || 'Unable to post comment', 'error');
      }
    });

    listNode.addEventListener('click', function (event) {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const button = target.closest('.anocus-reply-btn');
      if (!button) return;
      const replyId = button.getAttribute('data-reply-id') || '';
      const replyParentId = button.getAttribute('data-reply-parent-id') || '';
      const encodedReplyName = button.getAttribute('data-reply-name') || '';
      let replyName = 'guest';
      try {
        replyName = decodeURIComponent(encodedReplyName) || 'guest';
      } catch (_) {
        replyName = encodedReplyName || 'guest';
      }
      const targetReplyId = state.provider === 'github' && replyParentId ? replyParentId : replyId;
      setReplyTarget(targetReplyId, replyName);
    });

    replyCancelNode.addEventListener('click', function () {
      clearReplyTarget();
    });

    setupTurnstile();
    loadComments();
  }

  window.Anocus = {
    mount,
  };
})();
