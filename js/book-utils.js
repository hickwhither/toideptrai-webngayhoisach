export function normalizeTextForPath(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

export function slugifyForFile(text) {
  return normalizeTextForPath(text)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const pdfOverrides = {
  'Đọc vị bất kỳ ai': 'books/Doc vi bat ky ai.pdf'
};

export function getThumbnailCandidates(title) {
  const extList = ['jpg', 'jpeg', 'png', 'webp', 'avif'];
  const rawName = title.trim();
  const normalizedName = normalizeTextForPath(rawName);
  const names = [...new Set([rawName, normalizedName])];
  return names.flatMap((name) => extList.map((ext) => `thumbnail/${name}.${ext}`));
}

function getPdfPath(title) {
  return pdfOverrides[title] ?? `books/${title}.pdf`;
}

export function mapBooks(rawBooks) {
  return Object.entries(rawBooks).flatMap(([category, items]) =>
    items.map(([title, author]) => ({
      category,
      title,
      author,
      pdfFile: getPdfPath(title),
      reviewFile: `reviews/${slugifyForFile(title)}.txt`
    }))
  );
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
