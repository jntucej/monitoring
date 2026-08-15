/* ═══════════════════════════════════════════════════════════
   JNTUHCEJ — Main JavaScript
   Navigation, Tabs, Gallery, Reveal Animations
   ═══════════════════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileDrawer();
  initTabs();
  initGallery();
  initReveal();
  initActiveNav();
});

/* ── Navbar scroll effect ─────────────────────────────────── */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const onScroll = () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ── Mobile drawer ────────────────────────────────────────── */
function initMobileDrawer() {
  const hamburger = document.getElementById('hamburger');
  const drawer = document.getElementById('mobileDrawer');
  const overlay = document.getElementById('drawerOverlay');
  if (!hamburger || !drawer || !overlay) return;

  const openDrawer = () => {
    hamburger.classList.add('open');
    drawer.classList.add('open');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  const closeDrawer = () => {
    hamburger.classList.remove('open');
    drawer.classList.remove('open');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  };

  hamburger.addEventListener('click', () => {
    if (drawer.classList.contains('open')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  });

  overlay.addEventListener('click', closeDrawer);

  // Close drawer when a link is clicked
  drawer.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', closeDrawer);
  });
}

/* ── Tabs ─────────────────────────────────────────────────── */
function initTabs() {
  document.querySelectorAll('.tab-list').forEach(tabList => {
    const buttons = tabList.querySelectorAll('.tab-btn');

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const tabName = btn.dataset.tab;

        // Deactivate all buttons in this list
        buttons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Find the parent tabs container
        const tabsContainer = tabList.closest('.tabs');
        if (!tabsContainer) return;

        // Toggle panels
        tabsContainer.querySelectorAll('.tab-panel').forEach(panel => {
          panel.classList.remove('active');
        });

        const targetPanel = tabsContainer.querySelector(`#tab-${tabName}`);
        if (targetPanel) {
          targetPanel.classList.add('active');
        }
      });
    });
  });
}

/* ── Gallery lightbox ─────────────────────────────────────── */
function initGallery() {
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightboxImg');
  if (!lightbox || !lightboxImg) return;

  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (!img) return;
      lightboxImg.src = img.src;
      lightboxImg.alt = img.alt;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.classList.contains('lb-close')) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}

function closeLightbox() {
  const lightbox = document.getElementById('lightbox');
  if (!lightbox) return;
  lightbox.classList.remove('open');
  document.body.style.overflow = '';
}

/* ── Reveal on scroll ─────────────────────────────────────── */
function initReveal() {
  const revealElements = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    revealElements.forEach(el => el.classList.add('visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}

/* ── Active nav link based on current page ────────────────── */
function initActiveNav() {
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-drawer a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    }
  });
}