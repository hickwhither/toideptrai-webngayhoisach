const DEFAULT_ZOOM = 100;
const ZOOM_STEP = 10;
const MIN_ZOOM = 50;
const MAX_ZOOM = 250;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function buildPdfUrl(path, page, zoom) {
  return `${encodeURI(path)}#page=${page}&zoom=${zoom}`;
}

function isDesktopViewport() {
  return window.matchMedia('(min-width: 1024px) and (pointer: fine)').matches;
}

export function createPdfReader({
  frame,
  nav,
  closeBtn,
  prevBtn,
  nextBtn,
  zoomOutBtn,
  zoomInBtn,
  pageLabel,
  zoomLabel,
  onClose,
}) {
  const state = {
    pdfPath: '',
    page: 1,
    zoom: DEFAULT_ZOOM,
  };

  function render() {
    if (!state.pdfPath) return;
    frame.src = buildPdfUrl(state.pdfPath, state.page, state.zoom);
    pageLabel.textContent = `Trang ${state.page}`;
    zoomLabel.textContent = `${state.zoom}%`;
    prevBtn.disabled = state.page <= 1;
  }

  function openInline(pdfPath) {
    state.pdfPath = pdfPath;
    state.page = 1;
    state.zoom = DEFAULT_ZOOM;

    frame.hidden = false;
    nav.hidden = false;
    nav.classList.add('active');
    render();
  }

  function openInNewPage(pdfPath) {
    const url = new URL('./pdf-reader.html', window.location.href);
    url.searchParams.set('file', pdfPath);
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  }

  function open(pdfPath) {
    if (isDesktopViewport()) {
      openInNewPage(pdfPath);
      return 'new-page';
    }

    openInline(pdfPath);
    return 'inline';
  }

  function close(shouldNotify = true) {
    state.pdfPath = '';
    state.page = 1;
    state.zoom = DEFAULT_ZOOM;
    frame.src = '';
    frame.hidden = true;
    nav.hidden = true;
    nav.classList.remove('active');
    if (shouldNotify) onClose?.();
  }

  closeBtn.addEventListener('click', close);

  prevBtn.addEventListener('click', () => {
    if (state.page <= 1) return;
    state.page -= 1;
    render();
  });

  nextBtn.addEventListener('click', () => {
    state.page += 1;
    render();
  });

  zoomOutBtn.addEventListener('click', () => {
    state.zoom = clamp(state.zoom - ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
    render();
  });

  zoomInBtn.addEventListener('click', () => {
    state.zoom = clamp(state.zoom + ZOOM_STEP, MIN_ZOOM, MAX_ZOOM);
    render();
  });

  return {
    open,
    close,
  };
}

export function mountStandalonePdfReader({
  frame,
  closeBtn,
  prevBtn,
  nextBtn,
  zoomOutBtn,
  zoomInBtn,
  pageLabel,
  zoomLabel,
  title,
  source,
}) {
  const params = new URLSearchParams(window.location.search);
  const file = params.get('file');

  if (!file) {
    title.textContent = 'Không tìm thấy file PDF.';
    source.textContent = 'Thiếu tham số ?file=... trong URL.';
    return;
  }

  const reader = createPdfReader({
    frame,
    nav: document.getElementById('pdf-nav'),
    closeBtn,
    prevBtn,
    nextBtn,
    zoomOutBtn,
    zoomInBtn,
    pageLabel,
    zoomLabel,
    onClose: () => {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }
      window.close();
    },
  });

  const fileName = decodeURIComponent(file.split('/').pop() || file);
  title.textContent = fileName.replace(/\.pdf$/i, '');
  source.textContent = file;
  reader.openInline(file);
}
