// Logic to handle always-on audio and side menu
document.addEventListener('DOMContentLoaded', () => {
  document.body && document.body.classList.remove('slide-out-left', 'slide-out-right');
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

    // Start video playing immediately and continuously
    bgVideo.muted = true;
    bgVideo.play().catch(() => {});

    // Try unmuting directly if browser allows (e.g. returning user or site permission)
    bgVideo.muted = false;
    bgVideo.volume = 1.0;
    const playPromise = bgVideo.play();

    const unlockSound = () => {
      if (bgVideo) {
        bgVideo.muted = false;
        bgVideo.volume = 1.0;
        bgVideo.play().catch(() => {});
      }
      ['click', 'pointerdown', 'touchstart', 'keydown'].forEach(evt => {
        window.removeEventListener(evt, unlockSound);
        document.removeEventListener(evt, unlockSound);
      });
    };

    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // If unmuted autoplay blocked by browser policy, keep video playing muted
        bgVideo.muted = true;
        bgVideo.play().catch(() => {});

        // Unmute safely on the first user interaction (click, touch, tap, key) without interrupting playback
        ['click', 'pointerdown', 'touchstart', 'keydown'].forEach(evt => {
          window.addEventListener(evt, unlockSound, { once: true });
          document.addEventListener(evt, unlockSound, { once: true });
        });
      });
    }
  }

  // Toggle Side Menu
  let ignoreOutsideClickUntil = 0;

  function openDrawer(fromReturn = false) {
    if (!sideMenu) return;
    sideMenu.classList.add('open');
    if (fromReturn) {
      ignoreOutsideClickUntil = Date.now() + 800; // Ignore accidental/spurious clicks or gesture residue on return
      setTimeout(() => {
        document.documentElement.classList.remove('menu-preset-open');
      }, 50);
    }
  }

  function closeDrawer() {
    if (!sideMenu) return;
    sideMenu.classList.remove('open');
    document.documentElement.classList.remove('menu-preset-open');
    document.querySelectorAll('.nav-dropdown.show-dropdown').forEach(el => el.classList.remove('show-dropdown'));
  }

  if (sideMenu) {
    // If user returned from a subpage, keep slide drawer open
    if (sessionStorage.getItem('openMenuOnHome') === 'true' || document.documentElement.classList.contains('menu-preset-open')) {
      openDrawer(true);
      sessionStorage.removeItem('openMenuOnHome');
    }

    if (openMenuBtn && closeMenuBtn) {
      openMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openDrawer(false);
      });

      closeMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        closeDrawer();
      });
    }
  }

  // Handle bfcache or browser/phone back navigation (ensures page is never blank on back)
  const handlePageRestore = (e) => {
    document.body.classList.remove('slide-out-left', 'slide-out-right');
    if (bgVideo && bgVideo.paused) {
      bgVideo.play().catch(() => {});
    }
    if (sessionStorage.getItem('openMenuOnHome') === 'true' || (e && e.persisted)) {
      openDrawer(true);
      sessionStorage.removeItem('openMenuOnHome');
    }
  };

  window.addEventListener('pageshow', handlePageRestore);
  window.addEventListener('popstate', handlePageRestore);

  // Close side menu when clicking outside (protected from trailing clicks on return)
  document.addEventListener('click', (e) => {
    if (Date.now() < ignoreOutsideClickUntil) return;
    if (sideMenu && sideMenu.classList.contains('open')) {
      if (!e.target.closest('.side-menu') && !e.target.closest('.action-btn')) {
        closeDrawer();
      }
    }
  });

  // Close side menu on Escape key press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sideMenu && sideMenu.classList.contains('open')) {
      closeDrawer();
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
      sessionStorage.setItem('openMenuOnHome', 'true');
      
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
      const heroContainer = document.querySelector('.hero-text-container');
      if (heroContainer) heroContainer.classList.remove('touch-active');
    }
  });

  // Mobile Touch Glow Interaction for OUR / hero container
  const heroContainer = document.querySelector('.hero-text-container');
  if (heroContainer) {
    heroContainer.addEventListener('touchstart', () => {
      heroContainer.classList.add('touch-active');
    }, { passive: true });

    heroContainer.addEventListener('touchend', () => {
      setTimeout(() => {
        if (!document.querySelector('.custom-dropdown.show-dropdown')) {
          heroContainer.classList.remove('touch-active');
        }
      }, 500);
    }, { passive: true });
  }

  // Elastic Scroll Resistance Animation (Single trigger per scroll gesture, no repeat/after-bounce)
  const uiLayer = document.querySelector('.ui-layer');
  let isBouncing = false;
  let wheelCooldownTimer = null;
  let touchHasTriggered = false;
  let touchStartY = 0;

  function triggerScrollBounce(direction) {
    if (isBouncing || !uiLayer) return;
    if (sideMenu && sideMenu.classList.contains('open')) return;

    isBouncing = true;
    const animationClass = direction === 'down' ? 'scroll-bounce-down' : 'scroll-bounce-up';

    uiLayer.classList.remove('scroll-bounce-down', 'scroll-bounce-up');
    void uiLayer.offsetWidth; // Force CSS reflow
    uiLayer.classList.add(animationClass);

    setTimeout(() => {
      uiLayer.classList.remove(animationClass);
    }, 450);
  }

  // Mouse wheel / Trackpad listener with momentum lockout
  window.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaY) > 5) {
      if (!isBouncing) {
        triggerScrollBounce(e.deltaY > 0 ? 'down' : 'up');
      }
      clearTimeout(wheelCooldownTimer);
      wheelCooldownTimer = setTimeout(() => {
        isBouncing = false;
      }, 350);
    }
  }, { passive: true });

  // Touch gesture listener (strictly once per touch contact)
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      touchStartY = e.touches[0].clientY;
      touchHasTriggered = false;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && !touchHasTriggered && touchStartY !== 0) {
      const touchDiff = touchStartY - e.touches[0].clientY;
      if (Math.abs(touchDiff) > 15) {
        triggerScrollBounce(touchDiff > 0 ? 'down' : 'up');
        touchHasTriggered = true; // Locks until touch ends
      }
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    touchStartY = 0;
    setTimeout(() => {
      isBouncing = false;
      touchHasTriggered = false;
    }, 150);
  }, { passive: true });

  // Arrow Keys / Space
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
      triggerScrollBounce('down');
      setTimeout(() => { isBouncing = false; }, 350);
    } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
      triggerScrollBounce('up');
      setTimeout(() => { isBouncing = false; }, 350);
    }
  });

  // Fast hover prefetch for innovation links
  const videoMap = {
    'v-odne1s': '/num3.mp4',
    'bobart': '/num6.mp4',
    'ltb-valve': '/num9.mp4'
  };

  const preloadedVideos = new Set();
  function preloadVideo(src) {
    if (!src || preloadedVideos.has(src)) return;
    preloadedVideos.add(src);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'video';
    link.href = src;
    document.head.appendChild(link);
  }

  // Preload only when user hovers/touches an innovation link
  document.querySelectorAll('a[href*="v-odne1s"], a[href*="bobart"], a[href*="ltb-valve-techno"]').forEach(link => {
    ['mouseenter', 'touchstart'].forEach(evt => {
      link.addEventListener(evt, () => {
        Object.entries(videoMap).forEach(([key, src]) => {
          if (link.href.includes(key)) preloadVideo(src);
        });
      }, { passive: true, once: true });
    });
  });
});
