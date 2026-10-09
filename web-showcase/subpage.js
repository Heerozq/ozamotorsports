if (sessionStorage.getItem('navigatedFromHome') === 'true') {
  document.documentElement.classList.add('slide-in-active');
  if (document.body) document.body.classList.add('slide-in-active');
  sessionStorage.removeItem('navigatedFromHome');
  setTimeout(() => {
    document.documentElement.classList.remove('slide-in-active');
    if (document.body) document.body.classList.remove('slide-in-active');
  }, 600);
}

const clearSubpageExitClasses = () => {
  document.documentElement.classList.remove('slide-in-active');
  if (document.body) {
    document.body.classList.remove('slide-out-right', 'slide-out-left', 'slide-in-active');
  }
};
window.addEventListener('pageshow', clearSubpageExitClasses);
window.addEventListener('popstate', clearSubpageExitClasses);

document.addEventListener('DOMContentLoaded', () => {
  clearSubpageExitClasses();
  const homeBtn = document.querySelector('.home-btn');
  if (homeBtn) {
    homeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetUrl = homeBtn.href;

      // Only open menu on Home if the user originally navigated via the slide menu
      if (sessionStorage.getItem('navigatedFromMenu') === 'true') {
        sessionStorage.setItem('openMenuOnHome', 'true');
      } else {
        sessionStorage.removeItem('openMenuOnHome');
      }

      // Mark returning to Home for smooth slide-in-left landing
      sessionStorage.setItem('navigatedToHome', 'true');

      document.body.classList.add('slide-out-right');
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 550);
    });
  }

  // Side Menu Toggle for Subpages
  const openMenuBtn = document.getElementById('openMenuBtn') || document.querySelector('.subpage-action-btn');
  const closeMenuBtn = document.getElementById('closeMenuBtn');
  const sideMenu = document.getElementById('sideMenu');

  if (openMenuBtn && closeMenuBtn && sideMenu) {
    openMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sideMenu.classList.add('open');
    });

    closeMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sideMenu.classList.remove('open');
    });

    document.addEventListener('click', (e) => {
      if (sideMenu.classList.contains('open')) {
        if (!e.target.closest('.side-menu') && !e.target.closest('#openMenuBtn') && !e.target.closest('.subpage-action-btn')) {
          sideMenu.classList.remove('open');
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && sideMenu.classList.contains('open')) {
        sideMenu.classList.remove('open');
      }
    });
  }

  // Subpage navigation links smooth transition and origin tracking
  const allSubpageLinks = document.querySelectorAll('.side-menu a[href], .subpage-header a[href], .subpage-container a[href]');
  allSubpageLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetUrl = link.href;
      if (link.getAttribute('target') === '_blank' || !targetUrl.startsWith(window.location.origin) || targetUrl.includes('portfolio.html') || targetUrl === window.location.href || targetUrl.endsWith('#')) {
        return;
      }

      const isInsideSideMenu = !!link.closest('.side-menu');
      if (isInsideSideMenu) {
        sessionStorage.setItem('navigatedFromMenu', 'true');
        sessionStorage.setItem('openMenuOnHome', 'true');
      }

      // Mark navigating to next page for smooth slide-in landing
      sessionStorage.setItem('navigatedFromHome', 'true');

      e.preventDefault();
      document.body.classList.add('slide-out-left');
      setTimeout(() => {
        window.location.href = targetUrl;
      }, 550);
    });
  });

  // Contact Form Submission Handler (Direct Email to ozamotorsports@gmail.com)
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submitBtn') || contactForm.querySelector('.submit-btn');
      const successMsg = document.getElementById('formSuccessMsg');

      // Direct immediate visual state change - directly show SUBMITTED
      if (submitBtn) {
        submitBtn.classList.add('submitted');
        submitBtn.textContent = 'SUBMITTED';
        submitBtn.style.pointerEvents = 'none';
        submitBtn.style.backgroundColor = '#D81700';
        submitBtn.style.color = '#ffffff';
        submitBtn.style.opacity = '1';
        submitBtn.style.boxShadow = '0 5px 15px rgba(216, 23, 0, 0.4)';
      }

      if (successMsg) {
        successMsg.style.display = 'block';
      }

      const formData = new FormData(contactForm);
      const dataObj = Object.fromEntries(formData.entries());

      // Send direct email dispatch to ozamotorsports@gmail.com in background
      fetch('https://formsubmit.co/ajax/ozamotorsports@gmail.com', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(dataObj)
      })
      .then(() => {
        // Also forward in background for Netlify forms compatibility
        const urlEncoded = new URLSearchParams(formData).toString();
        fetch('/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: urlEncoded
        }).catch(() => {});
      })
      .catch(() => {});
    });
  }

  // Smart Mobile Header Hide on Scroll (Only reveals when completely back at the top)
  const scrollContainers = [
    document.querySelector('.subpage-container'),
    window
  ].filter(Boolean);

  let lastScrollTop = 0;

  function updateHeaderVisibility(currentScrollTop) {
    if (window.innerWidth > 768) {
      document.body.classList.remove('header-hidden');
      return;
    }

    if (currentScrollTop <= 15) {
      // ONLY when user is completely back at the top -> gently reveal header
      document.body.classList.remove('header-hidden');
    } else if (currentScrollTop > 20) {
      // While scrolled anywhere down -> keep header hidden
      document.body.classList.add('header-hidden');
    }
    lastScrollTop = Math.max(0, currentScrollTop);
  }

  let ticking = false;
  const onScrollThrottled = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const container = document.querySelector('.subpage-container') || document.documentElement;
        const currentScroll = container.scrollTop || window.pageYOffset || 0;
        updateHeaderVisibility(currentScroll);
        ticking = false;
      });
      ticking = true;
    }
  };

  scrollContainers.forEach(container => {
    container.addEventListener('scroll', onScrollThrottled, { passive: true });
  });

  // Elastic Scroll Resistance Animation for Subpages (Desktop Only - Never blocks mobile pull-to-refresh)
  const subContainer = document.querySelector('.subpage-container');
  let isSubpageBouncing = false;
  let subWheelCooldownTimer = null;
  const isSubTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (window.innerWidth <= 1024);

  function triggerSubpageScrollBounce(direction) {
    if (isSubTouchDevice || isSubpageBouncing || !subContainer) return;
    if (sideMenu && sideMenu.classList.contains('open')) return;

    isSubpageBouncing = true;
    const animationClass = direction === 'down' ? 'scroll-bounce-down' : 'scroll-bounce-up';

    requestAnimationFrame(() => {
      subContainer.classList.remove('scroll-bounce-down', 'scroll-bounce-up');
      requestAnimationFrame(() => {
        subContainer.classList.add(animationClass);
      });
    });

    setTimeout(() => {
      subContainer.classList.remove(animationClass);
    }, 450);
  }

  // Desktop wheel / keyboard listeners (Never blocks mobile pull-to-refresh)
  if (!isSubTouchDevice) {
    window.addEventListener('wheel', (e) => {
      if (!subContainer) return;
      if (Math.abs(e.deltaY) > 5) {
        const isScrollable = subContainer.scrollHeight > subContainer.clientHeight + 8;
        if (!isScrollable) {
          if (!isSubpageBouncing) triggerSubpageScrollBounce(e.deltaY > 0 ? 'down' : 'up');
        }

        clearTimeout(subWheelCooldownTimer);
        subWheelCooldownTimer = setTimeout(() => {
          isSubpageBouncing = false;
        }, 350);
      }
    }, { passive: true });

    // Keyboard navigation
    window.addEventListener('keydown', (e) => {
      if (!subContainer) return;
      const isScrollable = subContainer.scrollHeight > subContainer.clientHeight + 8;
      if (!isScrollable) {
        if (['ArrowDown', 'PageDown', ' '].includes(e.key)) {
          triggerSubpageScrollBounce('down');
          setTimeout(() => { isSubpageBouncing = false; }, 350);
        } else if (['ArrowUp', 'PageUp'].includes(e.key)) {
          triggerSubpageScrollBounce('up');
          setTimeout(() => { isSubpageBouncing = false; }, 350);
        }
      }
    });
  }

  // Fast Video Auto-Play & Rendering Initialization
  const innovationVideo = document.querySelector('.innovation-video');
  if (innovationVideo) {
    innovationVideo.preload = 'auto';
    const startPlay = () => {
      innovationVideo.play().catch(() => {});
    };
    if (innovationVideo.readyState >= 2) {
      startPlay();
    } else {
      innovationVideo.addEventListener('canplay', startPlay, { once: true });
      innovationVideo.addEventListener('loadeddata', startPlay, { once: true });
    }

    // Special loop range for num3.mp4 (starts from 0.10s and loops at 9.41s)
    const isNum3 = innovationVideo.classList.contains('video-num3') ||
                   (innovationVideo.src && innovationVideo.src.includes('num3.mp4')) ||
                   (innovationVideo.getAttribute('src') && innovationVideo.getAttribute('src').includes('num3.mp4'));

    if (isNum3) {
      innovationVideo.loop = false;
      const NUM3_START_POINT = 0.10;
      const NUM3_END_POINT = 9.41;

      const setStartPoint = () => {
        if (innovationVideo.currentTime < NUM3_START_POINT) {
          innovationVideo.currentTime = NUM3_START_POINT;
        }
      };

      if (innovationVideo.readyState >= 1) {
        setStartPoint();
      } else {
        innovationVideo.addEventListener('loadedmetadata', setStartPoint, { once: true });
        innovationVideo.addEventListener('loadeddata', setStartPoint, { once: true });
      }

      const checkLoop = () => {
        if (innovationVideo.currentTime >= NUM3_END_POINT) {
          innovationVideo.currentTime = NUM3_START_POINT;
          if (innovationVideo.paused) {
            innovationVideo.play().catch(() => {});
          }
        }
      };

      // Frame-accurate check for smooth 60fps/120fps looping on desktop and mobile
      const onFrame = () => {
        checkLoop();
        requestAnimationFrame(onFrame);
      };
      requestAnimationFrame(onFrame);

      // Event-based fallbacks (when tab is backgrounded / throttled)
      innovationVideo.addEventListener('timeupdate', checkLoop);
      innovationVideo.addEventListener('ended', () => {
        innovationVideo.currentTime = NUM3_START_POINT;
        innovationVideo.play().catch(() => {});
      });
    }

    // Ensure num6 and num9 use native hardware-accelerated continuous looping
    const isPingPongVideo = innovationVideo.classList.contains('video-num6') ||
                            innovationVideo.classList.contains('video-num9') ||
                            (innovationVideo.src && (innovationVideo.src.includes('num6.mp4') || innovationVideo.src.includes('num9.mp4'))) ||
                            (innovationVideo.getAttribute('src') && (innovationVideo.getAttribute('src').includes('num6.mp4') || innovationVideo.getAttribute('src').includes('num9.mp4')));

    if (isPingPongVideo) {
      innovationVideo.loop = true;
    }
  }

  // Preload on link hover or touch
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

  // Career Page: Proximity lighting & pulse animation on Apply Now button with smooth seamless exit
  const careerHeading = document.querySelector('.career-page .career-heading');
  const careerApplyBtn = document.querySelector('.career-page .apply-now-btn');
  if (careerHeading && careerApplyBtn) {
    let isTargetActive = false;
    let currentScale = 1.0;
    let currentGlow = 0.0;
    let animPhase = 0; // In radians: 0 to 2*Math.PI represents one 1s cycle
    let lastTime = null;
    let rafId = null;

    const updateAnimation = (time) => {
      if (!lastTime) lastTime = time;
      const dt = Math.min((time - lastTime) / 1000, 0.1);
      lastTime = time;

      if (isTargetActive) {
        // Frequency: 1 full cycle (2*PI) per 1.0 second (matching 1s keyframes cycle)
        animPhase = (animPhase + dt * Math.PI * 2) % (Math.PI * 2);
        const wave = (1 - Math.cos(animPhase)) / 2; // Smooth 0 -> 1 -> 0
        const targetScale = 1.0 + 0.045 * wave;
        const targetGlow = wave;

        currentScale += (targetScale - currentScale) * Math.min(1, dt * 18);
        currentGlow += (targetGlow - currentGlow) * Math.min(1, dt * 18);
      } else {
        // Cursor left: Smoothly ease back to resting state from current scale & glow
        currentScale += (1.0 - currentScale) * Math.min(1, dt * 8);
        currentGlow += (0.0 - currentGlow) * Math.min(1, dt * 8);
      }

      // Render styles
      careerApplyBtn.style.transform = `translate3d(0, 0, 0) scale(${currentScale.toFixed(4)})`;
      if (currentGlow > 0.005) {
        careerApplyBtn.style.boxShadow = `0 0 ${(14 * currentGlow).toFixed(1)}px rgba(255, 50, 25, ${(0.85 * currentGlow).toFixed(3)}), 0 0 ${(28 * currentGlow).toFixed(1)}px rgba(216, 23, 0, ${(0.45 * currentGlow).toFixed(3)}), inset 0 0 ${(6 * currentGlow).toFixed(1)}px rgba(255, 120, 90, ${(0.4 * currentGlow).toFixed(3)})`;
      } else {
        careerApplyBtn.style.boxShadow = 'none';
      }

      // Keep animating if active OR still returning smoothly to resting state
      if (isTargetActive || Math.abs(currentScale - 1.0) > 0.001 || currentGlow > 0.005) {
        rafId = requestAnimationFrame(updateAnimation);
      } else {
        // Fully returned to resting position
        currentScale = 1.0;
        currentGlow = 0.0;
        careerApplyBtn.style.transform = '';
        careerApplyBtn.style.boxShadow = '';
        rafId = null;
        lastTime = null;
      }
    };

    const startAnim = () => {
      if (!rafId) {
        lastTime = null;
        rafId = requestAnimationFrame(updateAnimation);
      }
    };

    const checkProximity = (e) => {
      const headingRect = careerHeading.getBoundingClientRect();
      const btnRect = careerApplyBtn.getBoundingClientRect();
      const proximity = 70; // 70px around the title area

      const isAroundTitle =
        e.clientX >= headingRect.left - proximity &&
        e.clientX <= headingRect.right + proximity &&
        e.clientY >= headingRect.top - proximity &&
        e.clientY <= headingRect.bottom + proximity;

      const isOverBtn =
        e.clientX >= btnRect.left &&
        e.clientX <= btnRect.right &&
        e.clientY >= btnRect.top &&
        e.clientY <= btnRect.bottom;

      const shouldBeActive = isAroundTitle || isOverBtn;
      if (shouldBeActive !== isTargetActive) {
        isTargetActive = shouldBeActive;
        startAnim();
      }
    };

    window.addEventListener('mousemove', checkProximity, { passive: true });
    window.addEventListener('mouseleave', () => {
      if (isTargetActive) {
        isTargetActive = false;
        startAnim();
      }
    });
  }
});
