/* =============================================
   Nothing But Shiva — Main JavaScript
   ============================================= */

(function () {
  'use strict';

  // ---------- Theme Toggle ----------
  const THEME_KEY = 'nbs-theme';

  function getPreferredTheme() {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    const btn = document.querySelector('.theme-toggle');
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function initTheme() {
    applyTheme(getPreferredTheme());
    const btn = document.querySelector('.theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        const current = document.documentElement.getAttribute('data-theme');
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
            '<article class="book-card fade-in" style="animation-delay:' + (i * 0.1) + 's">' +
            '<div class="cover-wrapper">' + coverHtml + '</div>' +
            '<div class="card-body">' +
            '<h3>' + escapeHtml(book.title) + '</h3>' +
            (book.author ? '<div class="author">by ' + escapeHtml(book.author) + '</div>' : '') +
            (book.description ? '<p class="description">' + escapeHtml(book.description) + '</p>' : '') +
            '</div>' +
            '<div class="card-actions">' +
            '<a href="' + readerUrl + '" class="btn-read">📖 Read Online</a>' +
            '</div>' +
            '</article>';
        });

        container.innerHTML = html;
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

  // ---------- Scroll-Triggered Reveal ----------
  function initScrollReveal() {
    var elements = document.querySelectorAll('.fade-in');
    if (!elements.length) return;

    if (!('IntersectionObserver' in window)) {
      // Fallback: show all immediately
      elements.forEach(function (el) { el.classList.add('visible'); });
      return;
    }

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    elements.forEach(function (el) { observer.observe(el); });
  }

  // ---------- Init ----------
  document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initMobileNav();
    highlightActiveNav();
    initScrollNav();
    initScrollToTop();
    initScrollReveal();

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
