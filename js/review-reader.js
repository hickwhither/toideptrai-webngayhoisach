function applyTheme(theme) {
  document.body.dataset.theme = theme === 'dark' ? 'dark' : 'light';
}

function sanitizeReviewHtml(content) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const body = doc.body;

  if (!body) return [document.createTextNode(content)];

  const blockedTags = new Set(['META', 'STYLE', 'SCRIPT', 'LINK', 'TITLE']);
  return Array.from(body.childNodes).filter((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent?.trim();
    }

    return !blockedTags.has(node.nodeName);
  });
}

export async function mountStandaloneReviewReader({ title, meta, content }) {
  const params = new URLSearchParams(window.location.search);
  const file = params.get('file');
  const titleText = params.get('title');
  const metaText = params.get('meta');
  const theme = params.get('theme') || localStorage.getItem('theme') || 'light';

  applyTheme(theme);

  if (titleText) title.textContent = titleText;
  if (metaText) meta.textContent = metaText;

  if (!file) {
    content.textContent = 'Thiếu tham số ?file=... để mở review.';
    return;
  }

  try {
    const response = await fetch(file);
    if (!response.ok) throw new Error('missing review');
    const reviewHtml = await response.text();
    const nodes = sanitizeReviewHtml(reviewHtml);

    if (!nodes.length) {
      content.innerHTML = '<p>File review trống.</p>';
      return;
    }

    content.replaceChildren(...nodes);
  } catch {
    content.textContent = 'Không thể tải file review.';
  }
}
