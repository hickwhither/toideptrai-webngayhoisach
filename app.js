import { books as rawBooks } from './data.js';
import {
  findAvailableFile,
  findAvailableImage,
  getThumbnailCandidates,
  mapBooks
} from './js/book-utils.js';
import { createPdfReader } from './js/pdf-reader.js';

const categoryBar = document.getElementById('category-bar');
const bookGrid = document.getElementById('book-grid');
const empty = document.getElementById('empty');
const reader = document.getElementById('reader');
const readerTitle = document.getElementById('reader-title');
const readerMeta = document.getElementById('reader-meta');
const reviewText = document.getElementById('review-text');
const pdfFrame = document.getElementById('pdf-frame');
const closeReaderBtn = document.getElementById('close-reader');
const pdfNav = document.getElementById('pdf-nav');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const zoomOutBtn = document.getElementById('zoom-out');
const zoomInBtn = document.getElementById('zoom-in');
const pageLabel = document.getElementById('page-label');
const zoomLabel = document.getElementById('zoom-label');
const closeReaderTextBtn = document.getElementById('close-reader-text');
const readerCloseWrap = document.getElementById('reader-close-wrap');
const themeToggleBtn = document.getElementById('theme-toggle');

const books = mapBooks(rawBooks);
const categories = ['Tất cả', ...new Set(books.map((book) => book.category))];
let activeCategory = 'Tất cả';
let isCategoryCompact = false;
let isCategoryExpanded = false;

const MOBILE_MEDIA_QUERY = '(max-width: 768px)';
const CATEGORY_COMPACT_SCROLL_Y = 80;

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeToggleBtn.textContent = theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode';
  localStorage.setItem('theme', theme);
}

function initTheme() {
  applyTheme(localStorage.getItem('theme') || 'light');
}

function getCurrentTheme() {
  return document.body.dataset.theme || localStorage.getItem('theme') || 'light';
}

function renderCategoryBar() {
  categoryBar.innerHTML = '';
  categoryBar.classList.toggle('compact', isCategoryCompact);
  categoryBar.classList.toggle('expanded', isCategoryExpanded);

  const hasOverflowCategories = categories.length > 4;
  const collapsedCategories = hasOverflowCategories
    ? [
      'Tất cả',
      ...categories.filter((category) => category !== 'Tất cả' && category === activeCategory),
      ...categories.filter((category) => category !== 'Tất cả' && category !== activeCategory).slice(0, 2),
    ]
    : categories;
  const categoriesToRender = isCategoryCompact && !isCategoryExpanded
    ? Array.from(new Set(collapsedCategories))
    : categories;

  for (const category of categoriesToRender) {
    const button = document.createElement('button');
    button.className = `chip ${activeCategory === category ? 'active' : ''}`;
    button.type = 'button';
    button.textContent = category;
    button.addEventListener('click', () => {
      activeCategory = category;
      renderCategoryBar();
      renderBooks();
    });
    categoryBar.appendChild(button);
  }

  if (isCategoryCompact && hasOverflowCategories) {
    const moreBtn = document.createElement('button');
    moreBtn.type = 'button';
    moreBtn.className = `chip more-chip ${isCategoryExpanded ? 'active' : ''}`;
    moreBtn.setAttribute('aria-label', isCategoryExpanded ? 'Thu gọn thể loại' : 'Mở rộng thể loại');
    moreBtn.textContent = isCategoryExpanded ? 'Thu gọn' : '⋯';
    moreBtn.addEventListener('click', () => {
      isCategoryExpanded = !isCategoryExpanded;
      renderCategoryBar();
    });
    categoryBar.appendChild(moreBtn);
  }
}

function getVisibleBooks() {
  return activeCategory === 'Tất cả'
    ? books
    : books.filter((book) => book.category === activeCategory);
}

async function buildCoverMarkup(title) {
  const thumbnail = await findAvailableImage(getThumbnailCandidates(title));
  if (thumbnail) return `<img alt="Bìa sách ${title}" src="${encodeURI(thumbnail)}">`;

  return '<div class="cover-fallback"><span>Không có thumbnail</span></div>';
}

const pdfReader = createPdfReader({
  frame: pdfFrame,
  nav: pdfNav,
  closeBtn: closeReaderBtn,
  prevBtn: prevPageBtn,
  nextBtn: nextPageBtn,
  zoomOutBtn: zoomOutBtn,
  zoomInBtn: zoomInBtn,
  pageLabel,
  zoomLabel,
  onClose: () => {
    reader.hidden = true;
  },
});

function showPdf(pdfPath) {
  reviewText.hidden = true;
  readerCloseWrap.hidden = true;
  const mode = pdfReader.open(pdfPath);
  if (mode === 'new-page') {
    reader.hidden = true;
  }
}

function showReviewText(content) {
  pdfReader.close(false);
  reviewText.hidden = false;
  readerCloseWrap.hidden = false;
  reviewText.textContent = content;
}

function showReviewHtml(content) {
  pdfReader.close(false);
  reviewText.hidden = false;
  readerCloseWrap.hidden = false;

  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const body = doc.body;

  if (!body) {
    reviewText.innerHTML = content;
    return;
  }

  const blockedTags = new Set(['META', 'STYLE', 'SCRIPT', 'LINK', 'TITLE']);
  const nodes = Array.from(body.childNodes).filter((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent?.trim();
    }

    return !blockedTags.has(node.nodeName);
  });

  if (!nodes.length) {
    reviewText.textContent = 'File review trống.';
    return;
  }

  reviewText.replaceChildren(...nodes);
}

async function openBook(book) {
  const reviewFile = await findAvailableFile(book.reviewCandidates);
  if (!reviewFile) {
    reader.hidden = false;
    readerTitle.textContent = book.title;
    readerMeta.textContent = `${book.author} · ${book.category}`;
    showReviewText('Không có file review .html cho sách này.');
    reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  if (!window.matchMedia(MOBILE_MEDIA_QUERY).matches) {
    const url = new URL('./review-reader.html', window.location.href);
    url.searchParams.set('file', reviewFile);
    url.searchParams.set('title', book.title);
    url.searchParams.set('meta', `${book.author} · ${book.category}`);
    url.searchParams.set('theme', getCurrentTheme());
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
    return;
  }

  reader.hidden = false;
  readerTitle.textContent = book.title;
  readerMeta.textContent = `${book.author} · ${book.category}`;
  showReviewText('Đang tải nội dung...');

  try {
    const response = await fetch(reviewFile);
    if (!response.ok) throw new Error('missing review');
    const content = await response.text();
    showReviewHtml(content.trim() ? content : '<p>File review trống.</p>');
  } catch {
    showReviewText('Không thể tải file review .html cho sách này.');
  }

  reviewText.setAttribute('tabindex', '-1');
  reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
  reviewText.focus({ preventScroll: true });
}

async function renderBookCard(book) {
  const card = document.createElement('article');
  card.className = 'book';
  card.innerHTML = `
    <div class="cover-wrap"><span class="meta">Đang tải bìa...</span></div>
    <div class="content">
      <h3 class="title">${book.title}</h3>
      <p class="meta">${book.author} · ${book.category}</p>
      <div class="actions">
        <button type="button" class="btn primary">Đọc review</button>
      </div>
    </div>
  `;

  card.querySelector('.cover-wrap').innerHTML = await buildCoverMarkup(book.title);
  card.querySelector('.btn.primary').addEventListener('click', () => openBook(book));
  return card;
}

async function renderBooks() {
  const visibleBooks = getVisibleBooks();
  empty.hidden = visibleBooks.length > 0;
  bookGrid.innerHTML = '';

  for (const book of visibleBooks) {
    bookGrid.appendChild(await renderBookCard(book));
  }
}


closeReaderTextBtn.addEventListener('click', () => {
  reader.hidden = true;
  pdfReader.close(false);
});
themeToggleBtn.addEventListener('click', () => {
  applyTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
});
window.addEventListener('scroll', () => {
  const shouldCompact = window.scrollY > CATEGORY_COMPACT_SCROLL_Y;
  if (shouldCompact === isCategoryCompact) return;
  isCategoryCompact = shouldCompact;
  isCategoryExpanded = false;
  renderCategoryBar();
});

initTheme();
renderCategoryBar();
renderBooks();
