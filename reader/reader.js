/* =============================================
   Nothing But Shiva — PDF Reader (PDF.js)
   ============================================= */

(function () {
  'use strict';

  var PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379';

  // State
  var pdfDoc = null;
  var currentPage = 1;
  var totalPages = 0;
  var scale = 1.5;
  var rendering = false;
  var pendingPage = null;

  // DOM elements (cached after init)
  var canvas, ctx, viewport;
  var prevBtn, nextBtn, pageInput, pageCount;
  var zoomInBtn, zoomOutBtn, zoomLevel;
  var fullscreenBtn, fitWidthBtn;
  var loadingOverlay, progressFill, loadingText;
  var bookTitleEl;

  // ---------- URL Params ----------
  function getParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      file: params.get('file'),
      title: params.get('title') || ''
    };
  }

  // ---------- Load PDF ----------
  function loadPDF(url) {
    showLoading('Loading PDF…');

    var loadingTask = pdfjsLib.getDocument({
      url: url,
      cMapUrl: PDFJS_CDN + '/cmaps/',
      cMapPacked: true
    });

    loadingTask.onProgress = function (progress) {
      if (progress.total > 0) {
        var pct = Math.round((progress.loaded / progress.total) * 100);
        updateProgress(pct);
      }
    };

    loadingTask.promise.then(function (pdf) {
      pdfDoc = pdf;
      totalPages = pdf.numPages;
      pageCount.textContent = totalPages;
      pageInput.max = totalPages;
      hideLoading();
      updateButtons();
      renderPage(currentPage);
    }).catch(function (err) {
      console.error('PDF load error:', err);
      hideLoading();
      showError('Failed to load PDF. The file may not exist or may be corrupted.');
    });
  }

  // ---------- Render Page ----------
  function renderPage(num) {
    if (rendering) {
      pendingPage = num;
      return;
    }
    rendering = true;

    pdfDoc.getPage(num).then(function (page) {
      var vp = page.getViewport({ scale: scale });
      var dpr = window.devicePixelRatio || 1;

      canvas.width = vp.width * dpr;
      canvas.height = vp.height * dpr;
      canvas.style.width = vp.width + 'px';
      canvas.style.height = vp.height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var renderContext = {
        canvasContext: ctx,
        viewport: vp
      };

      page.render(renderContext).promise.then(function () {
        rendering = false;
        if (pendingPage !== null) {
          var p = pendingPage;
          pendingPage = null;
          renderPage(p);
        }
      });
    });

    currentPage = num;
    pageInput.value = num;
    updateButtons();

    // Scroll viewport to top when changing pages
    if (viewport) viewport.scrollTop = 0;
  }

  // ---------- Navigation ----------
  function prevPage() {
    if (currentPage <= 1) return;
    renderPage(currentPage - 1);
  }

  function nextPage() {
    if (currentPage >= totalPages) return;
    renderPage(currentPage + 1);
  }

  function goToPage(num) {
    num = parseInt(num, 10);
    if (isNaN(num) || num < 1 || num > totalPages) return;
    renderPage(num);
  }

  function updateButtons() {
    if (prevBtn) prevBtn.disabled = currentPage <= 1;
    if (nextBtn) nextBtn.disabled = currentPage >= totalPages;
    if (zoomLevel) zoomLevel.textContent = Math.round(scale * 100) + '%';
  }

  // ---------- Zoom ----------
  function zoomIn() {
    if (scale >= 5) return;
    scale = Math.min(5, scale + 0.25);
    renderPage(currentPage);
  }

  function zoomOut() {
    if (scale <= 0.25) return;
    scale = Math.max(0.25, scale - 0.25);
    renderPage(currentPage);
  }

  function fitWidth() {
    if (!pdfDoc) return;
    pdfDoc.getPage(currentPage).then(function (page) {
      var vp = page.getViewport({ scale: 1 });
      var containerWidth = viewport.clientWidth - 32; // padding
      scale = containerWidth / vp.width;
      renderPage(currentPage);
    });
  }

  // ---------- Fullscreen ----------
  function toggleFullscreen() {
    var el = document.documentElement;
    if (!document.fullscreenElement) {
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
  }

  // ---------- Keyboard Shortcuts ----------
  function handleKeyboard(e) {
    if (e.target.tagName === 'INPUT') return;

    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        prevPage();
        break;
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        nextPage();
        break;
      case '+':
      case '=':
        e.preventDefault();
        zoomIn();
        break;
      case '-':
        e.preventDefault();
        zoomOut();
        break;
      case 'f':
        e.preventDefault();
        toggleFullscreen();
        break;
      case 'Home':
        e.preventDefault();
        goToPage(1);
        break;
      case 'End':
        e.preventDefault();
        goToPage(totalPages);
        break;
    }
  }

  // ---------- Loading State ----------
  function showLoading(text) {
    if (!loadingOverlay) return;
    loadingOverlay.style.display = 'flex';
    if (loadingText) loadingText.textContent = text || 'Loading…';
    if (progressFill) progressFill.style.width = '0%';
  }

  function hideLoading() {
    if (!loadingOverlay) return;
    if (progressFill) progressFill.style.width = '100%';
    setTimeout(function () {
      loadingOverlay.style.display = 'none';
    }, 300);
  }

  function updateProgress(pct) {
    if (progressFill) progressFill.style.width = pct + '%';
    if (loadingText) loadingText.textContent = 'Loading… ' + pct + '%';
  }

  function showError(msg) {
    var el = document.getElementById('reader-error');
    if (el) {
      el.textContent = msg;
      el.style.display = 'block';
    }
  }

  // ---------- Init ----------
  function init() {
    // Cache DOM
    canvas = document.getElementById('pdf-canvas');
    ctx = canvas.getContext('2d');
    viewport = document.querySelector('.reader-viewport');
    prevBtn = document.getElementById('prev-page');
    nextBtn = document.getElementById('next-page');
    pageInput = document.getElementById('page-input');
    pageCount = document.getElementById('page-count');
    zoomInBtn = document.getElementById('zoom-in');
    zoomOutBtn = document.getElementById('zoom-out');
    zoomLevel = document.getElementById('zoom-level');
    fullscreenBtn = document.getElementById('fullscreen-btn');
    fitWidthBtn = document.getElementById('fit-width-btn');
    loadingOverlay = document.querySelector('.reader-loading');
    progressFill = document.querySelector('.progress-fill');
    loadingText = document.querySelector('.loading-text');
    bookTitleEl = document.querySelector('.book-title');

    // Get URL params
    var params = getParams();
    if (!params.file) {
      showError('No PDF file specified. Use ?file=path/to/file.pdf');
      return;
    }

    // Set title
    if (params.title && bookTitleEl) {
      bookTitleEl.textContent = params.title;
      document.title = params.title + ' — Nothing But Shiva Reader';
    }

    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_CDN + '/pdf.worker.min.mjs';

    // Bind events
    if (prevBtn) prevBtn.addEventListener('click', prevPage);
    if (nextBtn) nextBtn.addEventListener('click', nextPage);
    if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);
    if (fitWidthBtn) fitWidthBtn.addEventListener('click', fitWidth);

    if (pageInput) {
      pageInput.addEventListener('change', function () {
        goToPage(this.value);
      });
      pageInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          goToPage(this.value);
        }
      });
    }

    document.addEventListener('keydown', handleKeyboard);

    // Fit width on resize (debounced)
    var resizeTimeout;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        if (pdfDoc) renderPage(currentPage);
      }, 200);
    });

    // Load the PDF
    loadPDF(params.file);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
