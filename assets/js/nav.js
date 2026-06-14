function normalizeNavHref(href) {
  const isIndex = window.location.pathname.endsWith('/') || window.location.pathname.endsWith('/index.html');
  if (isIndex && href.startsWith('index.html#')) return href.replace('index.html', '');
  return href;
}

function renderNav(items) {
  document.querySelectorAll('[data-nav]').forEach(nav => {
    nav.innerHTML = items
      .map(item => `<a href="${normalizeNavHref(item.href)}">${item.label}</a>`)
      .join('');
  });
}

fetch('assets/nav.json')
  .then(response => {
    if (!response.ok) throw new Error('Could not load navigation.');
    return response.json();
  })
  .then(renderNav)
  .catch(() => {
    // Leave any static fallback nav in place if the shared nav config fails to load.
  });
