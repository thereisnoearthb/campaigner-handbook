// Tiny two-page spread renderer using PDF.js (ESM from CDN).
// Renders pairs (1|2, 3|4, …); the last spread shows a single page if total is odd.

const PDFJS_VERSION = '4.7.76';
const PDF_URL = 'handbook.pdf';

const viewer = document.getElementById('pdfViewer');
if (viewer) initViewer().catch(showError);

async function initViewer() {
  const pdfjsLib = await import(
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.mjs`
  );
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument(PDF_URL).promise;
  const total = pdf.numPages;

  const leftCanvas  = document.getElementById('pdfLeft');
  const rightCanvas = document.getElementById('pdfRight');
  const spread      = document.getElementById('pdfSpread');
  const loading     = document.getElementById('pdfLoading');
  const info        = document.getElementById('pdfPageInfo');
  const prev        = document.getElementById('pdfPrev');
  const next        = document.getElementById('pdfNext');
  const cover       = document.getElementById('pdfCover');

  loading.remove();

  // The PDF has a blank dummy at index 1 so that two-up pairs as (blank | cover, p2 | p3, …).
  // In single-page mode we skip the blank entirely: the cover (page 2) is the floor.
  const mqSpread = window.matchMedia('(min-width: 720px)');
  let pagesPerSpread = mqSpread.matches ? 2 : 1;
  const coverPage = () => pagesPerSpread === 2 ? 1 : 2;
  const minPage   = () => coverPage();
  let firstPage = coverPage();

  const clampFirst = () => {
    const lo = minPage();
    if (firstPage < lo) firstPage = lo;
    if (firstPage > total) firstPage = total;
  };

  async function renderPage(num, canvas) {
    const page = await pdf.getPage(num);
    const baseViewport = page.getViewport({ scale: 1 });

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const gap = parseFloat(getComputedStyle(spread).columnGap) || 0;
    const slotWidth = pagesPerSpread === 2
      ? (spread.clientWidth - gap) / 2
      : spread.clientWidth;
    const cssScale = slotWidth / baseViewport.width;
    const renderViewport = page.getViewport({ scale: cssScale * dpr });

    canvas.width  = Math.floor(renderViewport.width);
    canvas.height = Math.floor(renderViewport.height);
    canvas.style.width  = `${Math.floor(baseViewport.width * cssScale)}px`;
    canvas.style.height = `${Math.floor(baseViewport.height * cssScale)}px`;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport: renderViewport }).promise;
  }

  async function renderSpread() {
    clampFirst();
    const leftNum  = firstPage;
    const rightNum = leftNum + 1;
    const showRight = pagesPerSpread === 2 && rightNum <= total;

    spread.classList.toggle('is-single', !showRight);

    await renderPage(leftNum, leftCanvas);
    if (showRight) await renderPage(rightNum, rightCanvas);

    info.innerHTML = showRight
      ? `<span class="pdf-info-label">Pages </span>${leftNum}–${rightNum} of ${total}`
      : `<span class="pdf-info-label">Page </span>${leftNum} of ${total}`;

    prev.disabled  = leftNum <= minPage();
    next.disabled  = leftNum + pagesPerSpread > total;
    cover.disabled = leftNum === coverPage();
  }

  prev.addEventListener('click', () => {
    firstPage -= pagesPerSpread;
    renderSpread();
  });
  next.addEventListener('click', () => {
    firstPage += pagesPerSpread;
    renderSpread();
  });
  cover.addEventListener('click', () => {
    firstPage = coverPage();
    renderSpread();
  });

  mqSpread.addEventListener('change', (e) => {
    pagesPerSpread = e.matches ? 2 : 1;
    // Switching to two-up: align to the start of a spread (odd page).
    if (pagesPerSpread === 2 && firstPage % 2 === 0) firstPage -= 1;
    // Switching to single-page: never show the blank dummy.
    if (pagesPerSpread === 1 && firstPage < 2)       firstPage = 2;
    renderSpread();
  });

  document.addEventListener('keydown', (e) => {
    if (e.target.matches('input, textarea, select')) return;
    if (e.key === 'ArrowLeft')  prev.click();
    if (e.key === 'ArrowRight') next.click();
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderSpread, 180);
  });

  await renderSpread();
}

function showError(err) {
  console.error('PDF viewer failed:', err);
  const loading = document.getElementById('pdfLoading');
  if (loading) {
    loading.textContent = "Couldn't load the preview. Use the link below to open the PDF.";
  }
}
