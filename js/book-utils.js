export function normalizeTextForPath(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

function getBookFileNameCandidates(title) {
  const rawName = title.trim();
  const normalizedName = normalizeTextForPath(rawName);
  return [...new Set([rawName, normalizedName])];
}

export function getThumbnailCandidates(title) {
  const extList = ['jpg'];
  const rawName = title.trim();
  const normalizedName = normalizeTextForPath(rawName);
  const names = [...new Set([rawName, normalizedName])];
  return names.flatMap((name) => extList.map((ext) => `thumbnail/${name}.${ext}`));
}

function getPdfCandidates(title) {
  return getBookFileNameCandidates(title).map((name) => `books/${name}.pdf`);
}

function getReviewCandidates(title) {
  return getBookFileNameCandidates(title).map((name) => `books/${name}.html`);
}

export function mapBooks(rawBooks) {
  return Object.entries(rawBooks).flatMap(([category, items]) =>
    items.map(([title, author]) => ({
      category,
      title,
      author,
      pdfCandidates: getPdfCandidates(title),
      reviewCandidates: getReviewCandidates(title)
    }))
  );
}

export async function findAvailableFile(candidates) {
  for (const src of candidates) {
    try {
      const response = await fetch(src);
      if (response.ok) return src;
    } catch {
      // keep checking next candidate
    }
  }

  return null;
}

export async function findAvailableImage(candidates) {
  for (const src of candidates) {
    const ok = await new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve(true);
      image.onerror = () => resolve(false);
      image.src = src;
    });

    if (ok) return src;
  }

  return null;
}
