import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.min.mjs';
import { books as rawBooks } from './data.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.8.69/pdf.worker.min.mjs';

const categoryBar = document.getElementById('category-bar');
const bookGrid = document.getElementById('book-grid');
const empty = document.getElementById('empty');
const reader = document.getElementById('reader');
const canvas = document.getElementById('reader-canvas');
const ctx = canvas.getContext('2d');
const pageInfo = document.getElementById('page-info');
const closeReaderBtn = document.getElementById('close-reader');
const prevBtn = document.getElementById('prev-page');
const nextBtn = document.getElementById('next-page');
const zoomInBtn = document.getElementById('zoom-in');
const zoomOutBtn = document.getElementById('zoom-out');
const themeToggleBtn = document.getElementById('theme-toggle');

const bookFileMap = {
  'Đắc Nhâm Tâm': 'books/Đắc Nhâm Tâm.pdf',
  'Dám nghĩ lớn': 'books/Dám nghĩ lớn.pdf',
  'Đọc vị bất kỳ ai': 'books/Doc vi bat ky ai.pdf'
};

function resolveBookFile(title) {
  return bookFileMap[title] ?? `books/${title}.pdf`;
}

function mapBooks(bookMap) {
  return Object.entries(bookMap).flatMap(([category, items]) =>
    items.map(([title, author]) => ({
      category,
      title,
      author,
      dataFile: `${title}.js`,
      file: resolveBookFile(title)
    }))
  );
}

const books = mapBooks(rawBooks);

let activeCategory = 'Tất cả';
let currentPdf = null;
let currentBook = null;
let currentPage = 1;
let scale = 1;
let isReaderOnlyMode = false;

const categories = ['Tất cả', ...new Set(books.map((b) => b.category))];

function fitScaleForMobile(viewportWidth) {
  return window.innerWidth <= 768 ? Math.max(window.innerWidth / viewportWidth - 0.08, 0.55) : 1;
}

function isDesktop() {
  return window.innerWidth > 768;
}

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  const isDark = theme === 'dark';
  themeToggleBtn.textContent = isDark ? '☀️ Light mode' : '🌙 Dark mode';
  localStorage.setItem('theme', theme);
}

function initTheme() {
  const storedTheme = localStorage.getItem('theme');
  const initialTheme = storedTheme || 'light';
  applyTheme(initialTheme);
}

async function renderPage(pageNumber = 1) {
  if (!currentPdf) return;
  const page = await currentPdf.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const finalScale = (window.innerWidth <= 768)
    ? fitScaleForMobile(base.width) * scale
    : scale;

  const viewport = page.getViewport({ scale: finalScale });
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(viewport.width * ratio);
  canvas.height = Math.floor(viewport.height * ratio);
  canvas.style.width = `${Math.floor(viewport.width)}px`;
  canvas.style.height = `${Math.floor(viewport.height)}px`;

  const transform = ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null;
  await page.render({ canvasContext: ctx, viewport, transform }).promise;
  pageInfo.textContent = `${currentPage} / ${currentPdf.numPages}`;
  prevBtn.disabled = currentPage <= 1;
  nextBtn.disabled = currentPage >= currentPdf.numPages;
}

async function openBook(book) {
  if (isDesktop()) {
    const url = new URL(window.location.href);
    url.searchParams.set('read', book.file);
    url.searchParams.set('title', book.title);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
    return;
  }

  currentBook = book;
  currentPage = 1;
  scale = 1;
  reader.hidden = false;

  currentPdf = await pdfjsLib.getDocument(book.file).promise;
  await renderPage(currentPage);
  reader.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function getBookFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const readFile = params.get('read');
  if (!readFile) return null;
  const title = params.get('title');
  if (title) {
    const matched = books.find((book) => book.title === title);
    if (matched) return matched;
  }
  return books.find((book) => book.file === readFile) ?? {
    title: title || 'Sách',
    file: readFile
  };
}

async function enterReaderOnlyMode(book) {
  isReaderOnlyMode = true;
  document.body.classList.add('reader-only-mode');
  currentBook = book;
  currentPage = 1;
  scale = 1;
  reader.hidden = false;
  currentPdf = await pdfjsLib.getDocument(book.file).promise;
  await renderPage(currentPage);
}

async function renderCover(file, mountEl) {
  try {
    const pdf = await pdfjsLib.getDocument(file).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 0.45 });
    const c = document.createElement('canvas');
    c.width = Math.floor(viewport.width);
    c.height = Math.floor(viewport.height);
    await page.render({ canvasContext: c.getContext('2d'), viewport }).promise;
    mountEl.innerHTML = '';
    mountEl.appendChild(c);
  } catch {
    mountEl.innerHTML = '<img alt="Không thể tải bìa" src="data:image/svg+xml;charset=utf-8,' +
      encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480"><rect width="100%" height="100%" fill="#1d4ed8"/><text x="50%" y="50%" text-anchor="middle" fill="white" font-family="Arial" font-size="28">PDF</text></svg>') + '">';
  }
}

function renderCategoryBar() {
  categoryBar.innerHTML = '';
  categories.forEach((c) => {
    const btn = document.createElement('button');
    btn.className = `chip ${activeCategory === c ? 'active' : ''}`;
    btn.type = 'button';
    btn.textContent = c;
    btn.onclick = () => {
      activeCategory = c;
      renderCategoryBar();
      renderBooks();
    };
    categoryBar.appendChild(btn);
  });
}

function filteredBooks() {
  return activeCategory === 'Tất cả' ? books : books.filter((b) => b.category === activeCategory);
}

function renderBooks() {
  const list = filteredBooks();
  empty.hidden = list.length > 0;
  bookGrid.innerHTML = '';

  list.forEach((book) => {
    const card = document.createElement('article');
    card.className = 'book';
    card.innerHTML = `
      <div class="cover-wrap"><span class="meta">Đang tải bìa...</span></div>
      <div class="content">
        <h3 class="title">${book.title}</h3>
        <p class="meta">${book.author} · ${book.category}</p>
        <div class="actions">
          <button type="button" class="btn primary">Đọc ngay</button>
          <a class="btn" href="${book.file}" download>Tải xuống</a>
        </div>
      </div>
    `;

    card.querySelector('.btn.primary').addEventListener('click', () => openBook(book));
    const coverWrap = card.querySelector('.cover-wrap');
    renderCover(book.file, coverWrap);
    bookGrid.appendChild(card);
  });
}

prevBtn.addEventListener('click', async () => {
  if (currentPage > 1) {
    currentPage -= 1;
    await renderPage(currentPage);
  }
});

nextBtn.addEventListener('click', async () => {
  if (currentPdf && currentPage < currentPdf.numPages) {
    currentPage += 1;
    await renderPage(currentPage);
  }
});

zoomInBtn.addEventListener('click', async () => {
  scale = Math.min(scale + 0.15, 3);
  await renderPage(currentPage);
});

zoomOutBtn.addEventListener('click', async () => {
  scale = Math.max(scale - 0.15, 0.55);
  await renderPage(currentPage);
});

closeReaderBtn.addEventListener('click', () => {
  if (isReaderOnlyMode) {
    const cleanUrl = `${window.location.origin}${window.location.pathname}`;
    window.location.replace(cleanUrl);
    return;
  }
  reader.hidden = true;
});

themeToggleBtn.addEventListener('click', () => {
  const nextTheme = document.body.dataset.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
});

window.addEventListener('resize', async () => {
  if (currentBook && !reader.hidden) await renderPage(currentPage);
});

initTheme();
renderCategoryBar();
renderBooks();

const urlBook = getBookFromUrl();
if (urlBook) {
  enterReaderOnlyMode(urlBook);
}
