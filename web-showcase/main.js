import './tracker.js';

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

  // 0. Cookie Consent Gate & Guaranteed Continuous Autoplay & Audio Controller
  if (bgVideo) {
    // Detect Windows desktop
    const isWindows = /Windows/i.test(navigator.userAgent || navigator.platform || '');
    let userManuallyMuted = false;

    // Ensure adaptive video src is assigned if not already set by inline script
    if (!bgVideo.getAttribute('src')) {
      const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      const isMobile = (window.innerWidth <= 768) || (('ontouchstart' in window) && window.innerWidth <= 1024);
      const saveData = conn && conn.saveData;
      const effectiveType = conn ? conn.effectiveType : '4g';
      const downlink = conn && typeof conn.downlink === 'number' ? conn.downlink : 10;

      let targetSrc = '/bg-video.mp4';
      if (saveData || effectiveType === '2g' || effectiveType === '3g' || downlink < 2.0) {
        targetSrc = '/bg-video-720p.mp4';
      } else if (isMobile) {
        targetSrc = (downlink >= 4.0) ? '/bg-video-1080p.mp4' : '/bg-video-720p.mp4';
      } else if (downlink < 6.0) {
        targetSrc = '/bg-video-1080p.mp4';
      }
      bgVideo.src = targetSrc;
    }

    // Smooth invisible network downgrade fallback if 1440p buffers unexpectedly
    let hasFallbackSwitched = false;
    bgVideo.addEventListener('stalled', () => {
      if (!hasFallbackSwitched && bgVideo.src && bgVideo.src.endsWith('/bg-video.mp4')) {
        hasFallbackSwitched = true;
        const curTime = bgVideo.currentTime;
        const wasMuted = bgVideo.muted;
        bgVideo.src = '/bg-video-1080p.mp4';
        bgVideo.currentTime = curTime;
        bgVideo.muted = wasMuted;
        if (sessionStorage.getItem('oza_consent_interacted') === 'true') {
          bgVideo.play().catch(() => {});
        } else {
          bgVideo.pause();
        }
      }
    });

    // Ensure critical mobile & cross-browser attributes
    bgVideo.setAttribute('playsinline', '');
    bgVideo.setAttribute('webkit-playsinline', '');

    // Unbreakable playback lock: Video NEVER plays before cookies are accepted
    bgVideo.addEventListener('play', () => {
      const isConsentedNow = (localStorage.getItem('oza_consent_interacted') === 'true') ||
                             (sessionStorage.getItem('oza_consent_interacted') === 'true');
      if (!isConsentedNow) {
        bgVideo.pause();
        bgVideo.muted = true;
      }
    });

    // Detect page reload vs subpage navigation
    const navEntries = window.performance && performance.getEntriesByType && performance.getEntriesByType('navigation');
    const isReload = (navEntries && navEntries.length > 0 && navEntries[0].type === 'reload') ||
                     (window.performance && window.performance.navigation && window.performance.navigation.type === 1);
    const isNavigatedToHome = sessionStorage.getItem('navigatedToHome') === 'true';

    if (isReload) {
      sessionStorage.removeItem('homeVideoTime');
      sessionStorage.removeItem('homeVideoAudioMuted');
      userManuallyMuted = false;
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

    let hasConsented = (localStorage.getItem('oza_consent_interacted') === 'true') ||
                       (sessionStorage.getItem('oza_consent_interacted') === 'true');

    // Function to ensure video is continuously playing without interrupting stream
    const ensureVideoPlaying = () => {
      const isConsentedNow = (localStorage.getItem('oza_consent_interacted') === 'true') ||
                             (sessionStorage.getItem('oza_consent_interacted') === 'true');
      if (!bgVideo || !isConsentedNow) return;
      if (bgVideo.paused) {
        const playPromise = bgVideo.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            if (!bgVideo.muted) {
              bgVideo.muted = true;
              const retryPromise = bgVideo.play();
              if (retryPromise !== undefined) retryPromise.catch(() => {});
            }
          });
        }
      }
    };

    let postConsentActivated = false;
    const activatePostConsentPlayback = () => {
      if (postConsentActivated) return;
      postConsentActivated = true;

      // 2. Smooth, Freeze-Free Mute / Unmute Toggle on Horse / Video Tap
      let lastAudioToggleTime = 0;
      let justAutoUnlocked = false;

      // On Windows: If unmuted play was restricted by browser MEI, turn on audio upon first interaction
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

      // Fallback: If autoplay was blocked, start playing on first gesture
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

        if (justAutoUnlocked) {
          justAutoUnlocked = false;
          return;
        }

        if (sideMenu && sideMenu.classList.contains('open')) {
          return;
        }

        if (e.target.closest('.side-menu') ||
            e.target.closest('.logo-container') ||
            e.target.closest('.hero-text-container') ||
            e.target.closest('.action-container') ||
            e.target.closest('a') ||
            e.target.closest('button')) {
          return;
        }

        if (bgVideo.paused) {
          bgVideo.play().catch(() => {});
        }

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

      // Desktop Hover-to-Unmute
      const hasHoverCapability = window.matchMedia('(hover: hover) and (pointer: fine)').matches || (window.innerWidth > 1024);
      const handleHoverUnmute = () => {
        if (!bgVideo) return;
        if (Date.now() - lastAudioToggleTime < 350) return;
        if (bgVideo.muted) {
          bgVideo.muted = false;
          bgVideo.volume = 1.0;
          userManuallyMuted = false;
          sessionStorage.setItem('homeVideoAudioMuted', 'false');
          if (bgVideo.paused) {
            bgVideo.play().catch(() => {});
          }
        }
      };

      if (hasHoverCapability) {
        window.addEventListener('mousemove', handleHoverUnmute, { passive: true });
        window.addEventListener('pointermove', handleHoverUnmute, { passive: true });
        window.addEventListener('mouseenter', () => {
          userManuallyMuted = false;
          handleHoverUnmute();
        }, { passive: true });
      }
    };

    const consentModal = document.getElementById('consentModal');
    const btnAcceptCookies = document.getElementById('btnAcceptCookies');

    // If cookies were already accepted in this session or previously:
    if (hasConsented) {
      if (consentModal) {
        consentModal.classList.add('hidden');
        consentModal.style.display = 'none';
        try { consentModal.remove(); } catch(e) {}
      }
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
        if (isWindows && !userManuallyMuted) {
          bgVideo.muted = false;
          bgVideo.volume = 1.0;
        } else {
          bgVideo.muted = true;
        }
      }
      ensureVideoPlaying();
      activatePostConsentPlayback();
    } else {
      // Cookies NOT yet accepted: Keep background video strictly paused and muted
      bgVideo.pause();
      bgVideo.muted = true;
    }

    // Google Identity Services (One Tap & Sign In) Integration
    const GOOGLE_CLIENT_ID = '77996263716-16p6ccup6hr51jnilp3rmq9dob3tq2dr.apps.googleusercontent.com';

    function parseJwt(token) {
      try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
      } catch (e) {
        return {};
      }
    }

    const dismissConsent = () => {
      if (consentModal) consentModal.classList.add('hidden');
      localStorage.setItem('oza_consent_interacted', 'true');
      localStorage.setItem('oza_cookies_accepted', 'true');
      sessionStorage.setItem('oza_consent_interacted', 'true');
      sessionStorage.setItem('oza_cookies_accepted', 'true');
      setTimeout(() => {
        try { if (consentModal) consentModal.remove(); } catch(e) {}
      }, 400);
    };

    const handleSuccessfulAccess = (userName, userEmail) => {
      const name = userName || 'Verified Google Visitor';
      const email = userEmail || 'Verified Google Account';

      localStorage.setItem('oza_user_name', name);
      localStorage.setItem('oza_user_email', email);
      localStorage.setItem('oza_consent_interacted', 'true');
      localStorage.setItem('oza_cookies_accepted', 'true');
      sessionStorage.setItem('oza_user_name', name);
      sessionStorage.setItem('oza_user_email', email);
      sessionStorage.setItem('oza_consent_interacted', 'true');
      sessionStorage.setItem('oza_cookies_accepted', 'true');

      if (window.__ozaRecordConsent) {
        window.__ozaRecordConsent('Cookies & Google Verified', 'Google 1-Tap Entry', name, email);
      }

      dismissConsent();

      // Start background video AND sound simultaneously upon accepting
      if (bgVideo) {
        bgVideo.muted = false;
        bgVideo.volume = 1.0;
        sessionStorage.setItem('homeVideoAudioMuted', 'false');
        userManuallyMuted = false;
        const playPromise = bgVideo.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            bgVideo.muted = true;
            bgVideo.play().catch(() => {});
          });
        }
      }

      // Activate video controls, audio un-muter, and interactions
      activatePostConsentPlayback();
    };

    let tokenClient = null;
    const initGoogleAuth = () => {
      try {
        if (window.google && window.google.accounts) {
          if (window.google.accounts.id) {
            window.google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: (response) => {
                if (response && response.credential) {
                  const profile = parseJwt(response.credential);
                  handleSuccessfulAccess(profile.name, profile.email);
                }
              },
              auto_select: false,
              cancel_on_tap_outside: false
            });
          }

          if (window.google.accounts.oauth2) {
            tokenClient = window.google.accounts.oauth2.initTokenClient({
              client_id: GOOGLE_CLIENT_ID,
              scope: 'https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email openid',
              callback: async (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                  try {
                    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                      headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                    });
                    const info = await res.json();
                    handleSuccessfulAccess(info.name, info.email);
                  } catch (e) {
                    handleSuccessfulAccess('Verified Google User', 'Google Verified Account');
                  }
                } else if (tokenResponse && tokenResponse.error) {
                  handleSuccessfulAccess('Website Visitor', 'Cookies Accepted');
                }
              },
              error_callback: (err) => {
                console.warn('Google Auth Notice:', err);
                handleSuccessfulAccess('Website Visitor', 'Cookies Accepted');
              }
            });
          }
        }
      } catch (err) {}
    };

    if (window.google && window.google.accounts) {
      initGoogleAuth();
    } else {
      window.addEventListener('load', () => {
        setTimeout(initGoogleAuth, 350);
      });
    }

    if (consentModal && !hasConsented) {
      consentModal.classList.remove('hidden');

      if (btnAcceptCookies) {
        btnAcceptCookies.addEventListener('click', (e) => {
          e.preventDefault();

          // 1. If Google Token Client is ready, request access token with Account Chooser
          if (tokenClient) {
            try {
              tokenClient.requestAccessToken({ prompt: 'select_account' });
              return;
            } catch (err) {
              console.warn('Google request failed:', err);
              handleSuccessfulAccess('Direct Visitor', 'Cookies Accepted');
              return;
            }
          }

          // 2. If Google One Tap is ready, show One Tap prompt
          if (window.google && window.google.accounts && window.google.accounts.id) {
            window.google.accounts.id.prompt((notification) => {
              if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                handleSuccessfulAccess('Direct Visitor', 'Cookies Accepted');
              }
            });
            return;
          }

          // 3. Fallback if client blocks Google scripts (e.g. adblocker)
          handleSuccessfulAccess('Direct Visitor', 'Cookies Accepted');
        });
      }
    }
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
    const isConsentedNow = (localStorage.getItem('oza_consent_interacted') === 'true') ||
                           (sessionStorage.getItem('oza_consent_interacted') === 'true');
    if (!isConsentedNow) {
      if (bgVideo) {
        bgVideo.pause();
        bgVideo.muted = true;
      }
      return;
    }
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
    const isConsentedNow = (localStorage.getItem('oza_consent_interacted') === 'true') ||
                           (sessionStorage.getItem('oza_consent_interacted') === 'true');
    if (!isConsentedNow) {
      if (bgVideo) {
        bgVideo.pause();
        bgVideo.muted = true;
      }
      return;
    }
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
