# Anocus Hugo Example

Add these lines to a Hugo template:

```html
<link rel="stylesheet" href="/anocus/anocus.css">
<div id="anocus-comments"></div>
<script src="/anocus/anocus.js" defer></script>
<script>
window.addEventListener('DOMContentLoaded', function () {
  window.Anocus.mount({
    container: '#anocus-comments',
    apiBase: '/api/anocus',
    pathname: location.pathname,
    pageTitle: document.title,
    turnstileSiteKey: '{{ .Site.Params.anocus.turnstile_site_key }}'
  });
});
</script>
```
