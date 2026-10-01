// Logic to handle always-on audio and side menu
document.addEventListener('DOMContentLoaded', () => {
  const bgVideo = document.querySelector('.bg-video');
  const openMenuBtn = document.querySelector('.action-btn');
  const closeMenuBtn = document.getElementById('closeMenuBtn');
  const sideMenu = document.getElementById('sideMenu');

  // Always-On Video & Audio Configuration with Position Memory
  if (bgVideo) {
    // Restore saved playback position if returning from a subpage
    const savedTime = sessionStorage.getItem('homeVideoTime');
    if (savedTime) {
      const timeNum = parseFloat(savedTime);
      if (!isNaN(timeNum) && isFinite(timeNum) && timeNum > 0) {
        if (bgVideo.readyState >= 1) {
          bgVideo.currentTime = timeNum;
        } else {
          bgVideo.addEventListener('loadedmetadata', () => {
            bgVideo.currentTime = timeNum;
          }, { once: true });
        }
      }
    }

    // Keep track of current playback position continuously
    bgVideo.addEventListener('timeupdate', () => {
      if (bgVideo.currentTime > 0) {
        sessionStorage.setItem('homeVideoTime', bgVideo.currentTime.toString());
      }
    });

    // Start video playing immediately (muted by default to bypass browser autoplay restrictions)
    bgVideo.muted = true;
    bgVideo.play().catch(() => {});

    // Try unmuting directly if browser policy allows
    bgVideo.muted = false;
    bgVideo.volume = 1.0;
    const playPromise = bgVideo.play();

    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // If unmuted autoplay was blocked by browser policy, keep video playing muted
        bgVideo.muted = true;
        bgVideo.play().catch(() => {});

        // Unmute on the first interaction anywhere on screen
        const enableSound = () => {
          bgVideo.muted = false;
          bgVideo.volume = 1.0;
          bgVideo.play().catch(() => {});
          ['click', 'keydown', 'touchstart', 'pointerdown'].forEach((evt) => {
            window.removeEventListener(evt, enableSound);
          });
        };

        ['click', 'keydown', 'touchstart', 'pointerdown'].forEach((evt) => {
          window.addEventListener(evt, enableSound, { once: true });
        });
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
      document.querySelectorAll('.nav-dropdown.show-dropdown').forEach(el => el.classList.remove('show-dropdown'));
    });
  }

  // Close side menu when clicking outside
  document.addEventListener('click', (e) => {
    if (sideMenu && sideMenu.classList.contains('open')) {
      if (!e.target.closest('.side-menu') && !e.target.closest('.action-btn')) {
        sideMenu.classList.remove('open');
        document.querySelectorAll('.nav-dropdown.show-dropdown').forEach(el => el.classList.remove('show-dropdown'));
      }
    }
  });

  // Close side menu on Escape key press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sideMenu && sideMenu.classList.contains('open')) {
      sideMenu.classList.remove('open');
      document.querySelectorAll('.nav-dropdown.show-dropdown').forEach(el => el.classList.remove('show-dropdown'));
    }
  });

  // Automatic Mute/Pause when switching tabs or windows
  document.addEventListener('visibilitychange', () => {
    if (bgVideo) {
      if (document.hidden) {
        sessionStorage.setItem('homeVideoTime', bgVideo.currentTime.toString());
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
      sessionStorage.setItem('homeVideoTime', bgVideo.currentTime.toString());
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
      sessionStorage.setItem('homeVideoTime', bgVideo.currentTime.toString());
      bgVideo.pause();
      bgVideo.muted = true;
    }
  });

  window.addEventListener('pagehide', () => {
    if (bgVideo) {
      sessionStorage.setItem('homeVideoTime', bgVideo.currentTime.toString());
      bgVideo.pause();
      bgVideo.muted = true;
    }
  });

  // Intercept navigation links for smooth page transition and sound cut-off
  const navLinks = document.querySelectorAll('.nav-links a, .nav-dropdown-content a, .dropdown-content a');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetUrl = link.href;

      // Save exact video time and stop home audio immediately on navigating away
      if (bgVideo) {
        sessionStorage.setItem('homeVideoTime', bgVideo.currentTime.toString());
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
      e.preventDefault();
      e.stopPropagation();
      const parent = btn.closest('.custom-dropdown, .nav-dropdown');
      if (parent) {
        parent.classList.toggle('show-dropdown');
      }
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-dropdown') && !e.target.closest('.custom-dropdown')) {
      document.querySelectorAll('.nav-dropdown.show-dropdown, .custom-dropdown.show-dropdown').forEach(el => {
        el.classList.remove('show-dropdown');
      });
    }
  });
});
