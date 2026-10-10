if (sessionStorage.getItem('navigatedToHome') === 'true') {
  document.documentElement.classList.add('slide-in-left-active');
  if (document.body) document.body.classList.add('slide-in-left-active');
  sessionStorage.removeItem('navigatedToHome');
  setTimeout(() => {
    document.documentElement.classList.remove('slide-in-left-active');
    if (document.body) document.body.classList.remove('slide-in-left-active');
  }, 600);
}

const clearHomeExitClasses = () => {
  document.documentElement.classList.remove('slide-in-left-active', 'slide-in-active');
  if (document.body) {
    document.body.classList.remove('slide-out-left', 'slide-out-right', 'slide-in-left-active', 'slide-in-active');
  }
};
window.addEventListener('pageshow', clearHomeExitClasses);
window.addEventListener('popstate', clearHomeExitClasses);

// Logic to handle always-on audio and side menu on Home Page
document.addEventListener('DOMContentLoaded', () => {
  clearHomeExitClasses();
  const bgVideo = document.querySelector('.bg-video');
  const openMenuBtn = document.querySelector('.action-btn');
  const closeMenuBtn = document.getElementById('closeMenuBtn');
  const sideMenu = document.getElementById('sideMenu');

  // 1. Guaranteed Continuous Autoplay & Audio Controller for Horse Video
  if (bgVideo) {
    // Detect Windows desktop
    const isWindows = /Windows/i.test(navigator.userAgent || navigator.platform || '');
    let userManuallyMuted = false;

    // Ensure critical mobile & cross-browser attributes
    bgVideo.setAttribute('playsinline', '');
    bgVideo.setAttribute('webkit-playsinline', '');

    // Detect page reload vs subpage navigation
    const navEntries = window.performance && performance.getEntriesByType && performance.getEntriesByType('navigation');
    const isReload = (navEntries && navEntries.length > 0 && navEntries[0].type === 'reload') ||
                     (window.performance && window.performance.navigation && window.performance.navigation.type === 1);

    if (isReload) {
      // On page reload: Horse video restarts from the very beginning (0s)
      sessionStorage.removeItem('homeVideoTime');
      try { bgVideo.currentTime = 0; } catch (err) {}
    } else {
      // Restore saved playback position ONLY when returning from a subpage
      const savedTime = sessionStorage.getItem('homeVideoTime');
      if (savedTime) {
        sessionStorage.removeItem('homeVideoTime');
        const timeNum = parseFloat(savedTime);
        if (!isNaN(timeNum) && isFinite(timeNum) && timeNum > 0 && timeNum < (bgVideo.duration || 30)) {
          if (bgVideo.readyState >= 2) {
            try { bgVideo.currentTime = timeNum; } catch(err) {}
          } else {
            bgVideo.addEventListener('canplay', () => {
              try { bgVideo.currentTime = timeNum; } catch(err) {}
            }, { once: true });
          }
        }
      }
    }

    // Set initial audio configuration (with cross-page memory):
    const savedAudioState = sessionStorage.getItem('homeVideoAudioMuted');
    if (savedAudioState !== null) {
      if (savedAudioState === 'true') {
        userManuallyMuted = true;
        bgVideo.muted = true;
      } else {
        userManuallyMuted = false;
        bgVideo.muted = false;
        bgVideo.volume = 1.0;
      }
    } else {
      // First visit: On Windows enable audio; on Mobile/Mac default to muted.
      if (isWindows && !userManuallyMuted) {
        bgVideo.muted = false;
        bgVideo.volume = 1.0;
      } else {
        bgVideo.muted = true;
      }
    }

    // Function to ensure video is continuously playing without interrupting stream
    const ensureVideoPlaying = () => {
      if (!bgVideo) return;
      if (bgVideo.paused) {
        const playPromise = bgVideo.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            // If browser policy blocked unmuted autoplay (e.g. Chrome MEI threshold):
            // Fallback immediately to muted play so the video still plays 100% of the time!
            if (!bgVideo.muted) {
              bgVideo.muted = true;
              const retryPromise = bgVideo.play();
              if (retryPromise !== undefined) retryPromise.catch(() => {});
            }
          });
        }
      }
    };

    // Immediate play trigger on DOMContentLoaded
    ensureVideoPlaying();

    // 2. Smooth, Freeze-Free Mute / Unmute Toggle on Horse / Video Tap
    let lastAudioToggleTime = 0;
    let justAutoUnlocked = false;

    // On Windows: If initial unmuted play was restricted by browser MEI,
    // turn on audio immediately upon the user's first interaction anywhere on Windows (unless user muted it)
    if (isWindows) {
      const unlockAudioOnWindows = (e) => {
        const savedState = sessionStorage.getItem('homeVideoAudioMuted');
        if (savedState === 'true' || userManuallyMuted || !bgVideo) return;
        if (bgVideo.muted) {
          bgVideo.muted = false;
          bgVideo.volume = 1.0;
          sessionStorage.setItem('homeVideoAudioMuted', 'false');
          justAutoUnlocked = true;
          setTimeout(() => { justAutoUnlocked = false; }, 400);
        }
        if (bgVideo.paused) {
          bgVideo.play().catch(() => {});
        }
        removeWindowsAudioUnlockers();
      };

      const winEvents = ['pointerdown', 'mousedown', 'keydown', 'click', 'wheel', 'touchstart'];
      const removeWindowsAudioUnlockers = () => {
        winEvents.forEach(evt => window.removeEventListener(evt, unlockAudioOnWindows, { capture: true }));
      };
      winEvents.forEach(evt => window.addEventListener(evt, unlockAudioOnWindows, { capture: true, passive: true }));
    }

    // Fallback: If autoplay was blocked initially by strict browser policies (e.g. Low Power Mode),
    // start playing immediately upon the first user interaction anywhere
    const startOnFirstGesture = () => {
      ensureVideoPlaying();
      ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(evt => {
        window.removeEventListener(evt, startOnFirstGesture, { capture: true });
      });
    };
    ['pointerdown', 'touchstart', 'click', 'keydown'].forEach(evt => {
      window.addEventListener(evt, startOnFirstGesture, { capture: true, passive: true });
    });

    const toggleVideoAudio = (e) => {
      if (!bgVideo) return;

      // Debounce rapid multi-taps (within 300ms)
      const now = Date.now();
      if (now - lastAudioToggleTime < 300) return;
      lastAudioToggleTime = now;

      // If audio was just unlocked on this gesture, don't immediately mute it
      if (justAutoUnlocked) {
        justAutoUnlocked = false;
        return;
      }

      // If side menu is open, clicking outside closes the drawer; do not toggle audio
      if (sideMenu && sideMenu.classList.contains('open')) {
        return;
      }

      // Do not toggle audio when clicking on interactive UI elements
      if (e.target.closest('.side-menu') ||
          e.target.closest('.logo-container') ||
          e.target.closest('.hero-text-container') ||
          e.target.closest('.action-container') ||
          e.target.closest('a') ||
          e.target.closest('button')) {
        return;
      }

      // If video was somehow paused, ensure it runs
      if (bgVideo.paused) {
        bgVideo.play().catch(() => {});
      }

      // Smoothly toggle audio and persist preference across pages
      if (bgVideo.muted) {
        userManuallyMuted = false;
        bgVideo.muted = false;
        bgVideo.volume = 1.0;
        sessionStorage.setItem('homeVideoAudioMuted', 'false');
      } else {
        userManuallyMuted = true;
        bgVideo.muted = true;
        sessionStorage.setItem('homeVideoAudioMuted', 'true');
      }
    };

    document.addEventListener('click', toggleVideoAudio);
  }

  // Toggle Side Menu
  let ignoreOutsideClickUntil = 0;

  function openDrawer(fromReturn = false) {
    if (!sideMenu) return;
    sideMenu.classList.add('open');
    if (fromReturn) {
      ignoreOutsideClickUntil = Date.now() + 1500; // Ignore accidental/spurious clicks or gesture residue on return
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
    sessionStorage.removeItem('openMenuOnHome');
    sessionStorage.removeItem('navigatedFromMenu');
  }

  if (sideMenu) {
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

    // If returning from a page visited through the slide menu, open the drawer
    if (sessionStorage.getItem('openMenuOnHome') === 'true' || sessionStorage.getItem('navigatedFromMenu') === 'true') {
      openDrawer(true);
    }
  }

  // Handle bfcache or browser/phone back navigation (ensures page is never blank on back)
  const handlePageRestore = (e) => {
    document.body.classList.remove('slide-out-left', 'slide-out-right');
    const savedAudioState = sessionStorage.getItem('homeVideoAudioMuted');
    if (bgVideo) {
      if (savedAudioState === 'true') {
        bgVideo.muted = true;
      } else if (savedAudioState === 'false') {
        bgVideo.muted = false;
        bgVideo.volume = 1.0;
      }
      if (bgVideo.paused) {
        bgVideo.play().catch(() => {});
      }
    }
    if (sessionStorage.getItem('openMenuOnHome') === 'true' || sessionStorage.getItem('navigatedFromMenu') === 'true') {
      openDrawer(true);
    } else {
      closeDrawer();
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

  // Handle tab visibility changes cleanly (pause only when tab is genuinely hidden, never on window blur)
  document.addEventListener('visibilitychange', () => {
    if (bgVideo) {
      if (document.hidden) {
        if (bgVideo.currentTime > 0) {
          sessionStorage.setItem('homeVideoTime', bgVideo.currentTime.toString());
        }
        sessionStorage.setItem('homeVideoAudioMuted', bgVideo.muted ? 'true' : 'false');
        bgVideo.pause();
      } else {
        if (bgVideo.paused) {
          bgVideo.play().catch(() => {});
        }
      }
    }
  });

  window.addEventListener('beforeunload', () => {
    if (bgVideo) {
      if (bgVideo.currentTime > 0) {
        sessionStorage.setItem('homeVideoTime', bgVideo.currentTime.toString());
      }
      sessionStorage.setItem('homeVideoAudioMuted', bgVideo.muted ? 'true' : 'false');
    }
  });

  window.addEventListener('pagehide', () => {
    if (bgVideo) {
      if (bgVideo.currentTime > 0) {
        sessionStorage.setItem('homeVideoTime', bgVideo.currentTime.toString());
      }
      sessionStorage.setItem('homeVideoAudioMuted', bgVideo.muted ? 'true' : 'false');
    }
  });

  // Intercept navigation links for smooth page transition, sound cut-off, and origin tracking
  const navLinks = document.querySelectorAll('.nav-links a, .nav-dropdown-content a, .dropdown-content a, .logo-container a');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetUrl = link.href;

      // Track if navigating from Slide Menu vs Hero Dropdown/Logo
      const isInsideSideMenu = !!link.closest('.side-menu');
      if (isInsideSideMenu) {
        sessionStorage.setItem('navigatedFromMenu', 'true');
        sessionStorage.setItem('openMenuOnHome', 'true');
      } else {
        sessionStorage.setItem('navigatedFromMenu', 'false');
        sessionStorage.removeItem('openMenuOnHome');
      }

      // Save exact video time and audio muted state on navigating away
      if (bgVideo) {
        sessionStorage.setItem('homeVideoTime', bgVideo.currentTime.toString());
        sessionStorage.setItem('homeVideoAudioMuted', bgVideo.muted ? 'true' : 'false');
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
        const heroContainer = btn.closest('.hero-text-container');
        if (heroContainer) {
          heroContainer.classList.toggle('dropdown-open', parent.classList.contains('show-dropdown'));
        }
      }
    });
  });

  // Also allow clicking on "OUR" (hero-primary) on mobile to toggle innovations dropdown
  const heroPrimary = document.querySelector('.hero-primary');
  if (heroPrimary) {
    heroPrimary.addEventListener('click', (e) => {
      e.stopPropagation();
      const heroDrop = document.querySelector('.custom-dropdown.hero-secondary');
      const heroContainer = document.querySelector('.hero-text-container');
      if (heroDrop && heroContainer) {
        heroDrop.classList.toggle('show-dropdown');
        heroContainer.classList.toggle('dropdown-open', heroDrop.classList.contains('show-dropdown'));
      }
    });
  }

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-dropdown') && !e.target.closest('.custom-dropdown') && !e.target.closest('.hero-primary')) {
      document.querySelectorAll('.nav-dropdown.show-dropdown, .custom-dropdown.show-dropdown').forEach(el => {
        el.classList.remove('show-dropdown');
      });
      const heroContainer = document.querySelector('.hero-text-container');
      if (heroContainer) {
        heroContainer.classList.remove('touch-active', 'dropdown-open');
      }
    }
  });

  // Elastic Scroll Resistance Animation (Desktop Mouse Wheel / Keyboard Only - Never blocks mobile pull-to-refresh)
  const uiLayer = document.querySelector('.ui-layer');
  let isBouncing = false;
  let wheelCooldownTimer = null;
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 1024);

  function triggerScrollBounce(direction) {
    if (isTouchDevice || isBouncing || !uiLayer) return;
    if (sideMenu && sideMenu.classList.contains('open')) return;

    isBouncing = true;
    const animationClass = direction === 'down' ? 'scroll-bounce-down' : 'scroll-bounce-up';

    requestAnimationFrame(() => {
      uiLayer.classList.remove('scroll-bounce-down', 'scroll-bounce-up');
      requestAnimationFrame(() => {
        uiLayer.classList.add(animationClass);
      });
    });

    setTimeout(() => {
      uiLayer.classList.remove(animationClass);
    }, 450);
  }

  // Desktop-only mouse wheel & keyboard listeners
  if (!isTouchDevice) {
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
  }

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
