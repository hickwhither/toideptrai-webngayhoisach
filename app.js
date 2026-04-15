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

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeToggleBtn.textContent = theme === 'dark' ? '☀️ Light mode' : '🌙 Dark mode';
  localStorage.setItem('theme', theme);
}

function initTheme() {
  applyTheme(localStorage.getItem('theme') || 'light');
}

function renderCategoryBar() {
  categoryBar.innerHTML = '';

  for (const category of categories) {
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
  const bodyContent = doc.body?.innerHTML?.trim();
  reviewText.innerHTML = bodyContent || content;
}

async function openBook(book) {
  reader.hidden = false;
  readerTitle.textContent = book.title;
  readerMeta.textContent = `${book.author} · ${book.category}`;
  showReviewText('Đang tải nội dung...');

  const pdfFile = await findAvailableFile(book.pdfCandidates);
  if (pdfFile) {
    showPdf(pdfFile);
    reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }

  try {
    const reviewFile = await findAvailableFile(book.reviewCandidates);
    if (!reviewFile) throw new Error('missing review');
    const response = await fetch(reviewFile);
    if (!response.ok) throw new Error('missing review');
    const content = await response.text();
    showReviewHtml(content.trim() ? content : '<p>File review trống.</p>');
  } catch {
    showReviewText('Không có file PDF hoặc review .html cho sách này.');
  }

  reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
        <button type="button" class="btn primary">Đọc sách</button>
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

initTheme();
renderCategoryBar();
renderBooks();
