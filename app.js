import { books as rawBooks } from './data.js';
import { findAvailableImage, getThumbnailCandidates, mapBooks } from './js/book-utils.js';

const categoryBar = document.getElementById('category-bar');
const bookGrid = document.getElementById('book-grid');
const empty = document.getElementById('empty');
const reader = document.getElementById('reader');
const readerTitle = document.getElementById('reader-title');
const readerMeta = document.getElementById('reader-meta');
const reviewText = document.getElementById('review-text');
const closeReaderBtn = document.getElementById('close-reader');
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

  categories.forEach((category) => {
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
  });
}

function getVisibleBooks() {
  return activeCategory === 'Tất cả'
    ? books
    : books.filter((book) => book.category === activeCategory);
}

async function buildCoverMarkup(title) {
  const thumbnail = await findAvailableImage(getThumbnailCandidates(title));
  if (thumbnail) return `<img alt="Bìa sách ${title}" src="${encodeURI(thumbnail)}">`;

  return `
    <div class="cover-fallback">
      <span>Không có thumbnail</span>
    </div>
  `;
}

async function openBook(book) {
  reader.hidden = false;
  readerTitle.textContent = book.title;
  readerMeta.textContent = `${book.author} · ${book.category}`;
  reviewText.textContent = 'Đang tải đoạn review...';

  if (!book.reviewFile.endsWith('.txt')) {
    reviewText.textContent = 'Chỉ hỗ trợ đọc file .txt (review sách), không mở PDF do bản quyền.';
    return;
  }

  try {
    const response = await fetch(book.reviewFile);
    if (!response.ok) throw new Error('Không tìm thấy nội dung review');
    const content = (await response.text()).trim();
    reviewText.textContent = content || 'File review trống.';
  } catch {
    reviewText.textContent = 'Chưa có review cho sách này. Hãy thêm file .txt trong thư mục reviews/.';
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
        <button type="button" class="btn primary">Đọc review</button>
      </div>
    </div>
  `;

  const coverWrap = card.querySelector('.cover-wrap');
  coverWrap.innerHTML = await buildCoverMarkup(book.title);
  card.querySelector('.btn.primary').addEventListener('click', () => openBook(book));

  return card;
}

async function renderBooks() {
  const visibleBooks = getVisibleBooks();
  empty.hidden = visibleBooks.length > 0;
  bookGrid.innerHTML = '';

  for (const book of visibleBooks) {
    const card = await renderBookCard(book);
    bookGrid.appendChild(card);
  }
}

closeReaderBtn.addEventListener('click', () => {
  reader.hidden = true;
});

themeToggleBtn.addEventListener('click', () => {
  applyTheme(document.body.dataset.theme === 'dark' ? 'light' : 'dark');
});

initTheme();
renderCategoryBar();
renderBooks();
