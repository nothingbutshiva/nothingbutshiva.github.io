/* =============================================
   Nothing But Shiva — Main JavaScript
   ============================================= */

(function () {
  'use strict';

  // ---------- Theme Toggle ----------
  var THEME_KEY = 'nbs-theme';

  function getPreferredTheme() {
    var stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    var btn = document.querySelector('.theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function initTheme() {
    applyTheme(getPreferredTheme());
    var btn = document.querySelector('.theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var current = document.documentElement.getAttribute('data-theme');
        applyTheme(current === 'dark' ? 'light' : 'dark');
      });
    }
  }

  // ---------- Mobile Nav Toggle ----------
  function initMobileNav() {
    var toggle = document.querySelector('.nav-toggle');
    var links = document.querySelector('.nav-links');
    var backdrop = document.querySelector('.mobile-backdrop');
    if (!toggle || !links) return;

    function closeNav() {
      links.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
      if (backdrop) backdrop.classList.remove('visible');
    }

    toggle.addEventListener('click', function () {
      var isOpen = links.classList.toggle('open');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      if (backdrop) {
        if (isOpen) { backdrop.classList.add('visible'); }
        else { backdrop.classList.remove('visible'); }
      }
    });

    if (backdrop) {
      backdrop.addEventListener('click', closeNav);
    }

    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', closeNav);
    });
  }

  // ---------- Active Nav Link ----------
  function highlightActiveNav() {
    var path = window.location.pathname;
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      var href = a.getAttribute('href');
      if (!href) return;
      // Resolve relative href
      var linkPath = new URL(href, window.location.origin).pathname;
      if (path === linkPath || (linkPath !== '/' && path.startsWith(linkPath))) {
        a.classList.add('active');
      }
    });
  }

  // ---------- Book Catalog Rendering ----------
  function renderBookCatalog(containerId, catalogUrl) {
    var container = document.getElementById(containerId);
    if (!container) return;

    // Show spinner
    container.innerHTML = '<div class="spinner"></div>';

    fetch(catalogUrl)
      .then(function (res) {
        if (!res.ok) throw new Error('Failed to load catalog');
        return res.json();
      })
      .then(function (books) {
        if (!books.length) {
          container.innerHTML =
            '<div class="empty-state">' +
            '<div class="empty-icon">📚</div>' +
            '<p>No books available yet. Check back soon!</p>' +
            '</div>';
          return;
        }

        var html = '';
        books.forEach(function (book, i) {
          var coverHtml = book.cover
            ? '<img src="' + escapeHtml(book.cover) + '" alt="' + escapeHtml(book.title) + ' cover" loading="lazy">'
            : '<div class="cover-placeholder"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M21 5c-1.11-.35-2.33-.5-3.5-.5-1.95 0-4.05.4-5.5 1.5-1.45-1.1-3.55-1.5-5.5-1.5S2.45 4.9 1 6v14.65c0 .25.25.5.5.5.1 0 .15-.05.25-.05C3.1 20.45 5.05 20 6.5 20c1.95 0 4.05.4 5.5 1.5 1.35-.85 3.8-1.5 5.5-1.5 1.65 0 3.35.3 4.75 1.05.1.05.15.05.25.05.25 0 .5-.25.5-.5V6c-.6-.45-1.25-.75-2-1z"/></svg><span>No Cover</span></div>';

          var readerUrl = 'reader/?file=' + encodeURIComponent('../' + book.pdf);
          if (book.title) {
            readerUrl += '&title=' + encodeURIComponent(book.title);
          }

          html +=
            '<article class="book-card" style="animation-delay:' + (i * 0.1) + 's">' +
            '<div class="cover-wrapper">' + coverHtml + '</div>' +
            '<div class="card-content">' +
            '<div class="card-body">' +
            '<h3>' + escapeHtml(book.title) + '</h3>' +
            (book.author ? '<div class="author">by ' + escapeHtml(book.author) + '</div>' : '') +
            (book.description ? '<p class="description">' + escapeHtml(book.description) + '</p>' : '') +
            '</div>' +
            '<div class="card-actions">' +
            '<a href="' + readerUrl + '" class="btn-read">📖 Read Online</a>' +
            '</div>' +
            '</div>' +
            '</article>';
        });

        container.innerHTML = html;

        // Append static books (non-PDF, like Shiv Puran slokas)
        var shivPuranCard =
          '<article class="book-card">' +
          '<div class="cover-wrapper"><img src="books/covers/shiv-puran-slokas.svg" alt="Shiv Puran cover" loading="lazy"></div>' +
          '<div class="card-content">' +
          '<div class="card-body">' +
          '<h3>Shiv Puran — Selected Slokas</h3>' +
          '<div class="author">by Nothing But Shiva</div>' +
          '<p class="description">28 important slokas from the Shiv Puran across 5 chapters — Shiva Tattva, Bhakti, Linga, Shakti &amp; Moksha.</p>' +
          '</div>' +
          '<div class="card-actions">' +
          '<a href="pages/shiv-puran-slokas.html" class="btn-read">📖 Read Online</a>' +
          '</div>' +
          '</div>' +
          '</article>';
        container.innerHTML += shivPuranCard;
      })
      .catch(function (err) {
        console.error('Catalog load error:', err);
        container.innerHTML =
          '<div class="empty-state">' +
          '<div class="empty-icon">⚠️</div>' +
          '<p>Could not load book catalog.</p>' +
          '</div>';
      });
  }

  // ---------- Helpers ----------
  function escapeHtml(str) {
    if (!str) return '';
    var div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  // ---------- Reading Progress Bar ----------
  function initReadingProgress() {
    var bar = document.getElementById('reading-progress');
    if (!bar) return;
    var ticking = false;

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          var docHeight = document.documentElement.scrollHeight - window.innerHeight;
          var scrolled = (window.scrollY / docHeight) * 100;
          bar.style.width = Math.min(scrolled, 100) + '%';
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // ---------- Scroll-Aware Nav ----------
  function initScrollNav() {
    var nav = document.querySelector('nav.site-nav');
    if (!nav) return;
    var scrollThreshold = 80;
    var ticking = false;

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          if (window.scrollY > scrollThreshold) {
            nav.classList.add('scrolled');
          } else {
            nav.classList.remove('scrolled');
          }
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  // ---------- Scroll-to-Top Button ----------
  function initScrollToTop() {
    var btn = document.querySelector('.scroll-top-btn');
    if (!btn) return;
    var showThreshold = 400;
    var ticking = false;

    window.addEventListener('scroll', function () {
      if (!ticking) {
        window.requestAnimationFrame(function () {
          if (window.scrollY > showThreshold) {
            btn.classList.add('visible');
          } else {
            btn.classList.remove('visible');
          }
          ticking = false;
        });
        ticking = true;
      }
    });

    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // ---------- Scroll-Triggered Reveal (with stagger) ----------
  function initScrollReveal() {
    var elements = document.querySelectorAll('.fade-in');
    if (!elements.length) return;

    if (!('IntersectionObserver' in window)) {
      elements.forEach(function (el) { el.classList.add('visible'); });
      return;
    }

    var pendingBatch = [];
    var batchTimer = null;
    var STAGGER_DELAY = 80;

    function flushBatch() {
      var batch = pendingBatch.slice();
      pendingBatch = [];
      batchTimer = null;
      batch.forEach(function (el, i) {
        setTimeout(function () {
          el.classList.add('visible');
        }, i * STAGGER_DELAY);
      });
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          pendingBatch.push(entry.target);
          observer.unobserve(entry.target);
        }
      });
      if (pendingBatch.length && !batchTimer) {
        batchTimer = setTimeout(flushBatch, 50);
      }
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(function (el) { observer.observe(el); });
  }

  // ---------- Typing Effect for Hero Sanskrit ----------
  function initTypingEffect() {
    var el = document.querySelector('.hero-sanskrit');
    if (!el) return;
    var fullText = el.textContent;
    var charIndex = 0;
    el.textContent = '';
    el.classList.add('typing-cursor');

    function typeNext() {
      if (charIndex < fullText.length) {
        el.textContent += fullText.charAt(charIndex);
        charIndex++;
        setTimeout(typeNext, 100);
      } else {
        setTimeout(function () {
          el.classList.remove('typing-cursor');
        }, 1500);
      }
    }

    setTimeout(typeNext, 500);
  }

  // ---------- Animated Number Counter ----------
  function initCounterAnimation() {
    var el = document.querySelector('.highlight-number');
    if (!el) return;
    var text = el.textContent.trim();
    // Only animate elements that contain a number like "20+"
    var match = text.match(/^(\d+)(\+?)$/);
    if (!match) return;
    var target = parseInt(match[1], 10);
    var suffix = match[2] || '';

    if (!('IntersectionObserver' in window)) {
      return; // keep static text as fallback
    }

    var animated = false;
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting && !animated) {
          animated = true;
          observer.unobserve(entry.target);
          animateCount(el, target, suffix, 1500);
        }
      });
    }, { threshold: 0.3 });

    observer.observe(el);
  }

  function animateCount(el, target, suffix, duration) {
    var start = null;
    function step(timestamp) {
      if (!start) start = timestamp;
      var progress = Math.min((timestamp - start) / duration, 1);
      // Ease-out curve
      var eased = 1 - Math.pow(1 - progress, 3);
      var current = Math.round(eased * target);
      el.textContent = current + (progress >= 1 ? suffix : '');
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    }
    el.textContent = '0';
    requestAnimationFrame(step);
  }

  // ---------- Stotra Search / Filter ----------
  function initStotraSearch() {
    var input = document.getElementById('stotra-search');
    if (!input) return;
    var cards = document.querySelectorAll('.stotra-card');
    if (!cards.length) return;

    input.addEventListener('input', function () {
      var query = input.value.toLowerCase().trim();
      cards.forEach(function (card) {
        var h3 = card.querySelector('h3');
        var p = card.querySelector('p');
        var title = h3 ? h3.textContent.toLowerCase() : '';
        var desc = p ? p.textContent.toLowerCase() : '';
        if (!query || title.indexOf(query) !== -1 || desc.indexOf(query) !== -1) {
          card.style.display = '';
        } else {
          card.style.display = 'none';
        }
      });
    });
  }

  // ---------- Mantra Rotator ----------
  function initMantraRotator() {
    var container = document.querySelector('.highlight-mantra');
    if (!container) return;
    var mantraEl = container.querySelector('.highlight-number');
    var labelEl = container.querySelector('.highlight-label');
    if (!mantraEl || !labelEl) return;

    var mantras = [
      '\u0950 \u0928\u092E\u0903 \u0936\u093F\u0935\u093E\u092F',
      '\u0939\u0930 \u0939\u0930 \u092E\u0939\u093E\u0926\u0947\u0935',
      '\u0950 \u0924\u094D\u0930\u094D\u092F\u092E\u094D\u092C\u0915\u0902 \u092F\u091C\u093E\u092E\u0939\u0947',
      '\u0936\u093F\u0935\u0902 \u0936\u0902\u0915\u0930\u0902',
      '\u0950 \u0928\u092E\u094B \u092D\u0917\u0935\u0924\u0947 \u0930\u0941\u0926\u094D\u0930\u093E\u092F'
    ];
    var translations = [
      'Om Namah Shivaya',
      'Hail Lord Mahadeva',
      'Om Tryambakam Yajamahe',
      'Shivam Shankaram',
      'Om Namo Bhagavate Rudraya'
    ];
    var index = 0;
    var INTERVAL = 8000;
    var FADE_DURATION = 400;

    function rotate() {
      index = (index + 1) % mantras.length;
      // Fade out
      mantraEl.style.transition = 'opacity ' + FADE_DURATION + 'ms ease';
      labelEl.style.transition = 'opacity ' + FADE_DURATION + 'ms ease';
      mantraEl.style.opacity = '0';
      labelEl.style.opacity = '0';

      setTimeout(function () {
        mantraEl.textContent = mantras[index];
        labelEl.textContent = translations[index];
        mantraEl.style.opacity = '1';
        labelEl.style.opacity = '1';
      }, FADE_DURATION);
    }

    setInterval(rotate, INTERVAL);
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initMobileNav();
    highlightActiveNav();
    initScrollNav();
    initScrollToTop();
    initScrollReveal();
    initReadingProgress();
    initTypingEffect();
    initCounterAnimation();
    initStotraSearch();
    initMantraRotator();

    // Render book catalog if container exists
    var catalogEl = document.getElementById('book-catalog');
    if (catalogEl) {
      var catalogUrl = catalogEl.getAttribute('data-catalog') || 'books/catalog.json';
      renderBookCatalog('book-catalog', catalogUrl);
    }
  });

  // Expose for use in other scripts
  window.NBS = {
    applyTheme: applyTheme,
    renderBookCatalog: renderBookCatalog,
    escapeHtml: escapeHtml
  };
})();
