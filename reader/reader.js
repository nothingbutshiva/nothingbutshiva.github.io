/* =============================================
   Nothing But Shiva — Book Reader (PDF.js)
   Two-page spread with page-turn animations
   ============================================= */

(function () {
  'use strict';

  var PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174';

  // State
  var pdfDoc = null;
  var totalPages = 0;
  var currentSpread = 1; // left page number (right = left + 1)
  var baseScale = 1;
  var userZoom = 1;
  var rendering = false;
  var singleMode = false;
  var isMobile = window.innerWidth <= 768;
  var animating = false;

  // Page render cache
  var pageCache = {};

  // DOM
  var canvasLeft, ctxLeft, canvasRight, ctxRight;
  var pageLeftEl, pageRightEl, spineEl;
  var prevBtn, nextBtn, pageInput, pageCountEl;
  var zoomInBtn, zoomOutBtn, zoomLevelEl;
  var fullscreenBtn, viewModeBtn;
  var loadingOverlay, progressFill, loadingText;
  var bookTitleEl, bookViewport, bookReader, bookSpread;
  var navPrev, navNext;
  var pagenumLeft, pagenumRight;

  // ---------- URL Params ----------
  function getParams() {
    var params = new URLSearchParams(window.location.search);
    return {
      file: params.get('file'),
      title: params.get('title') || ''
    };
  }

  // ---------- Determine if single-page mode ----------
  function isSinglePage() {
    return singleMode || isMobile;
  }

  // ---------- Calculate scale to fit pages in viewport ----------
  function calcFitScale(pageWidth, pageHeight) {
    var vw = bookViewport.clientWidth;
    var vh = bookViewport.clientHeight - 20; // padding
    var pagesShown = isSinglePage() ? 1 : 2;
    var availWidth = (vw - 40) / pagesShown; // gap
    var scaleW = availWidth / pageWidth;
    var scaleH = vh / pageHeight;
    return Math.min(scaleW, scaleH, 2.5);
  }

  // ---------- Load PDF ----------
  function loadPDF(url) {
    showLoading('Loading PDF\u2026');

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
      pageCountEl.textContent = totalPages;
      pageInput.max = totalPages;

      // Calculate initial scale from first page
      pdf.getPage(1).then(function (page) {
        var vp = page.getViewport({ scale: 1 });
        baseScale = calcFitScale(vp.width, vp.height);
        hideLoading();
        renderSpread(1);
        updateUI();
      });
    }).catch(function (err) {
      console.error('PDF load error:', err);
      hideLoading();
      showError('Failed to load PDF. The file may not exist or may be corrupted.');
    });
  }

  // ---------- Render a single page to a canvas ----------
  function renderPageToCanvas(pageNum, canvas, ctx, callback) {
    if (pageNum < 1 || pageNum > totalPages) {
      canvas.width = 0;
      canvas.height = 0;
      canvas.style.width = '0';
      canvas.style.height = '0';
      if (callback) callback();
      return;
    }

    pdfDoc.getPage(pageNum).then(function (page) {
      var scale = baseScale * userZoom;
      var vp = page.getViewport({ scale: scale });
      var dpr = window.devicePixelRatio || 1;

      canvas.width = vp.width * dpr;
      canvas.height = vp.height * dpr;
      canvas.style.width = vp.width + 'px';
      canvas.style.height = vp.height + 'px';

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      page.render({ canvasContext: ctx, viewport: vp }).promise.then(function () {
        if (callback) callback();
      });
    });
  }

  // ---------- Render current spread ----------
  function renderSpread(leftPage, direction) {
    if (rendering || !pdfDoc) return;
    rendering = true;

    var single = isSinglePage();
    var leftNum = single ? 0 : leftPage;
    var rightNum = single ? leftPage : leftPage + 1;

    // Clamp
    if (!single) {
      if (leftNum < 1) leftNum = 1;
      if (leftNum > totalPages) leftNum = totalPages;
      if (rightNum > totalPages) rightNum = 0;
    } else {
      if (rightNum > totalPages) rightNum = totalPages;
      if (rightNum < 1) rightNum = 1;
    }

    currentSpread = single ? rightNum : leftNum;

    // Trigger page turn animation
    if (direction && !animating) {
      animating = true;
      var animEl = direction === 'next' ? pageRightEl : pageLeftEl;
      var animClass = direction === 'next' ? 'turning' : 'turning-back';

      // For single mode, always animate the right page
      if (single) {
        animEl = pageRightEl;
        animClass = direction === 'next' ? 'turning' : 'turning-back';
      }

      animEl.classList.add(animClass);
      setTimeout(function () {
        animEl.classList.remove(animClass);
        animating = false;
      }, 450);
    }

    var done = 0;
    var total = single ? 1 : 2;

    function checkDone() {
      done++;
      if (done >= total) {
        rendering = false;
        updateUI();
      }
    }

    // Render left page (spread mode only)
    if (!single && leftNum >= 1) {
      pageLeftEl.style.display = '';
      pagenumLeft.textContent = leftNum;
      renderPageToCanvas(leftNum, canvasLeft, ctxLeft, checkDone);
    } else if (!single) {
      pageLeftEl.style.display = '';
      canvasLeft.width = 0;
      canvasLeft.style.width = '0';
      pagenumLeft.textContent = '';
      checkDone();
    } else {
      checkDone();
    }

    // Render right page
    if (rightNum >= 1 && rightNum <= totalPages) {
      pagenumRight.textContent = rightNum;
      renderPageToCanvas(rightNum, canvasRight, ctxRight, checkDone);
    } else {
      canvasRight.width = 0;
      canvasRight.style.width = '0';
      pagenumRight.textContent = '';
      checkDone();
    }
  }

  // ---------- Navigation ----------
  function getDisplayPage() {
    if (isSinglePage()) return currentSpread;
    return currentSpread;
  }

  function nextSpread() {
    if (animating) return;
    var step = isSinglePage() ? 1 : 2;
    var next = currentSpread + step;
    if (isSinglePage()) {
      if (next > totalPages) return;
    } else {
      if (currentSpread + step > totalPages) return;
    }
    renderSpread(next, 'next');
  }

  function prevSpread() {
    if (animating) return;
    var step = isSinglePage() ? 1 : 2;
    var prev = currentSpread - step;
    if (prev < 1) return;
    renderSpread(prev, 'prev');
  }

  function goToPage(num) {
    num = parseInt(num, 10);
    if (isNaN(num) || num < 1 || num > totalPages) return;
    if (isSinglePage()) {
      renderSpread(num);
    } else {
      // Go to the spread that contains this page
      var leftPage = num % 2 === 1 ? num : num - 1;
      renderSpread(leftPage);
    }
  }

  function updateUI() {
    var single = isSinglePage();
    var step = single ? 1 : 2;
    var displayPage = single ? currentSpread : currentSpread;
    var displayEnd = single ? currentSpread : Math.min(currentSpread + 1, totalPages);

    if (prevBtn) prevBtn.disabled = currentSpread <= 1;
    if (nextBtn) nextBtn.disabled = (single ? currentSpread >= totalPages : currentSpread + step > totalPages);

    if (pageInput) pageInput.value = displayEnd;
    if (zoomLevelEl) zoomLevelEl.textContent = Math.round(baseScale * userZoom * 100) + '%';

    // View mode button state
    if (viewModeBtn) {
      if (singleMode) {
        viewModeBtn.classList.add('active');
      } else {
        viewModeBtn.classList.remove('active');
      }
    }
  }

  // ---------- Zoom ----------
  function zoomIn() {
    if (userZoom >= 3) return;
    userZoom = Math.min(3, userZoom + 0.2);
    renderSpread(currentSpread);
  }

  function zoomOut() {
    if (userZoom <= 0.4) return;
    userZoom = Math.max(0.4, userZoom - 0.2);
    renderSpread(currentSpread);
  }

  // ---------- View Mode Toggle ----------
  function toggleViewMode() {
    if (isMobile) return; // mobile is always single
    singleMode = !singleMode;

    if (singleMode) {
      bookReader.classList.add('single-mode');
      // Convert spread to single page (show right page)
      var pageToShow = currentSpread;
      recalcScale();
      renderSpread(pageToShow);
    } else {
      bookReader.classList.remove('single-mode');
      // Convert single to spread
      var leftPage = currentSpread % 2 === 1 ? currentSpread : currentSpread - 1;
      recalcScale();
      renderSpread(leftPage);
    }
  }

  function recalcScale() {
    if (!pdfDoc) return;
    pdfDoc.getPage(1).then(function (page) {
      var vp = page.getViewport({ scale: 1 });
      baseScale = calcFitScale(vp.width, vp.height);
      renderSpread(currentSpread);
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
        prevSpread();
        break;
      case 'ArrowRight':
      case 'ArrowDown':
      case ' ':
        e.preventDefault();
        nextSpread();
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

  // ---------- Touch/Swipe Support ----------
  function initTouchSupport() {
    var startX = 0;
    var startY = 0;
    var threshold = 50;

    bookViewport.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    }, { passive: true });

    bookViewport.addEventListener('touchend', function (e) {
      var dx = e.changedTouches[0].clientX - startX;
      var dy = e.changedTouches[0].clientY - startY;

      // Only horizontal swipes
      if (Math.abs(dx) > threshold && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) {
          nextSpread();
        } else {
          prevSpread();
        }
      }
    }, { passive: true });
  }

  // ---------- Loading State ----------
  function showLoading(text) {
    if (!loadingOverlay) return;
    loadingOverlay.style.display = 'flex';
    if (loadingText) loadingText.textContent = text || 'Loading\u2026';
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
    if (loadingText) loadingText.textContent = 'Loading\u2026 ' + pct + '%';
  }

  function showError(msg) {
    var el = document.getElementById('reader-error');
    if (el) {
      el.innerHTML = '<div style="padding-top:40vh;">' +
        '<div style="font-size:2.5rem;margin-bottom:1rem;">&#x26A0;&#xFE0F;</div>' +
        '<p>' + msg + '</p>' +
        '<a href="../" style="color:var(--brand-accent);">&larr; Return home</a>' +
        '</div>';
      el.style.display = 'block';
    }
  }

  // ---------- Init ----------
  function init() {
    // Cache DOM
    canvasLeft = document.getElementById('canvas-left');
    ctxLeft = canvasLeft.getContext('2d');
    canvasRight = document.getElementById('canvas-right');
    ctxRight = canvasRight.getContext('2d');
    pageLeftEl = document.getElementById('page-left');
    pageRightEl = document.getElementById('page-right');
    spineEl = document.getElementById('book-spine');
    bookViewport = document.getElementById('book-viewport');
    bookReader = document.getElementById('book-reader');
    bookSpread = document.getElementById('book-spread');
    prevBtn = document.getElementById('prev-page');
    nextBtn = document.getElementById('next-page');
    pageInput = document.getElementById('page-input');
    pageCountEl = document.getElementById('page-count');
    zoomInBtn = document.getElementById('zoom-in');
    zoomOutBtn = document.getElementById('zoom-out');
    zoomLevelEl = document.getElementById('zoom-level');
    fullscreenBtn = document.getElementById('fullscreen-btn');
    viewModeBtn = document.getElementById('view-mode');
    loadingOverlay = document.getElementById('loading-overlay');
    progressFill = document.getElementById('progress-fill');
    loadingText = document.getElementById('loading-text');
    bookTitleEl = document.getElementById('book-title-el');
    navPrev = document.getElementById('nav-prev');
    navNext = document.getElementById('nav-next');
    pagenumLeft = document.getElementById('pagenum-left');
    pagenumRight = document.getElementById('pagenum-right');

    // Get URL params
    var params = getParams();
    if (!params.file) {
      showError('No PDF file specified. Use ?file=path/to/file.pdf');
      if (loadingOverlay) loadingOverlay.style.display = 'none';
      return;
    }

    // Set title
    if (params.title && bookTitleEl) {
      bookTitleEl.textContent = params.title;
      document.title = params.title + ' \u2014 Nothing But Shiva Reader';
    }

    // Check mobile
    isMobile = window.innerWidth <= 768;
    if (isMobile) {
      bookReader.classList.add('single-mode');
    }

    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_CDN + '/pdf.worker.min.js';

    // Bind toolbar events
    if (prevBtn) prevBtn.addEventListener('click', prevSpread);
    if (nextBtn) nextBtn.addEventListener('click', nextSpread);
    if (zoomInBtn) zoomInBtn.addEventListener('click', zoomIn);
    if (zoomOutBtn) zoomOutBtn.addEventListener('click', zoomOut);
    if (fullscreenBtn) fullscreenBtn.addEventListener('click', toggleFullscreen);
    if (viewModeBtn) viewModeBtn.addEventListener('click', toggleViewMode);

    // Click zones
    if (navPrev) navPrev.addEventListener('click', prevSpread);
    if (navNext) navNext.addEventListener('click', nextSpread);

    // Page input
    if (pageInput) {
      pageInput.addEventListener('change', function () { goToPage(this.value); });
      pageInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          goToPage(this.value);
        }
      });
    }

    // Keyboard
    document.addEventListener('keydown', handleKeyboard);

    // Touch/swipe
    initTouchSupport();

    // Resize handler (debounced)
    var resizeTimeout;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        var wasMobile = isMobile;
        isMobile = window.innerWidth <= 768;

        if (isMobile && !wasMobile) {
          bookReader.classList.add('single-mode');
        } else if (!isMobile && wasMobile && !singleMode) {
          bookReader.classList.remove('single-mode');
        }

        recalcScale();
      }, 200);
    });

    // Load the PDF
    loadPDF(params.file);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
