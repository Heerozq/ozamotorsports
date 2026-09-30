// Logic to handle always-on audio and side menu
document.addEventListener('DOMContentLoaded', () => {
  const bgVideo = document.querySelector('.bg-video');
  const openMenuBtn = document.querySelector('.action-btn');
  const closeMenuBtn = document.getElementById('closeMenuBtn');
  const sideMenu = document.getElementById('sideMenu');

  // Always-On Audio Configuration
  if (bgVideo) {
    bgVideo.muted = false;
    bgVideo.volume = 1.0;
    const playPromise = bgVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // If browser autoplay policy requires initial user gesture, unmute on first interaction
        const enableSound = () => {
          bgVideo.muted = false;
          bgVideo.volume = 1.0;
          bgVideo.play().catch(() => {});
          window.removeEventListener('click', enableSound);
          window.removeEventListener('keydown', enableSound);
          window.removeEventListener('touchstart', enableSound);
        };
        window.addEventListener('click', enableSound, { once: true });
        window.addEventListener('keydown', enableSound, { once: true });
        window.addEventListener('touchstart', enableSound, { once: true });
      });
    }
  }

  // Toggle Side Menu
  if (openMenuBtn && closeMenuBtn && sideMenu) {
    openMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sideMenu.classList.add('open');
    });

    closeMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sideMenu.classList.remove('open');
    });
  }

  // Close side menu when clicking outside
  document.addEventListener('click', (e) => {
    if (sideMenu && sideMenu.classList.contains('open')) {
      if (!e.target.closest('.side-menu') && !e.target.closest('.action-btn')) {
        sideMenu.classList.remove('open');
      }
    }
  });

  // Close side menu on Escape key press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sideMenu && sideMenu.classList.contains('open')) {
      sideMenu.classList.remove('open');
    }
  });

  // Automatic Mute/Pause when switching tabs or windows
  document.addEventListener('visibilitychange', () => {
    if (bgVideo) {
      if (document.hidden) {
        bgVideo.pause();
        bgVideo.muted = true;
      } else {
        bgVideo.muted = false;
        bgVideo.play().catch(() => {});
      }
    }
  });

  window.addEventListener('blur', () => {
    if (bgVideo) {
      bgVideo.pause();
      bgVideo.muted = true;
    }
  });

  window.addEventListener('focus', () => {
    if (bgVideo && !document.hidden) {
      bgVideo.muted = false;
      bgVideo.play().catch(() => {});
    }
  });

  window.addEventListener('beforeunload', () => {
    if (bgVideo) {
      bgVideo.pause();
      bgVideo.muted = true;
    }
  });

  window.addEventListener('pagehide', () => {
    if (bgVideo) {
      bgVideo.pause();
      bgVideo.muted = true;
    }
  });

  // Intercept navigation links for smooth page transition and sound cut-off
  const navLinks = document.querySelectorAll('.nav-links a, .nav-dropdown-content a, .dropdown-content a');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetUrl = link.href;

      // Stop home audio immediately on navigating away
      if (bgVideo) {
        bgVideo.pause();
        bgVideo.muted = true;
      }

      // Exclude external links or the Founder portfolio link
      if (link.getAttribute('target') === '_blank' || !targetUrl.startsWith(window.location.origin) || targetUrl.includes('portfolio.html') || targetUrl === window.location.href || targetUrl.endsWith('#')) {
        return;
      }
      
      e.preventDefault();
      document.body.classList.add('slide-out-left');
      sessionStorage.setItem('navigatedFromHome', 'true');
      
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 550);
    });
  });

  // Mobile dropdown toggle logic
  const dropdownBtns = document.querySelectorAll('.drop-btn, .nav-drop-btn');
  dropdownBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const parent = btn.closest('.custom-dropdown, .nav-dropdown');
      if (parent) {
        parent.classList.toggle('show-dropdown');
      }
    });
  });
});
