if (sessionStorage.getItem('navigatedFromHome') === 'true') {
  document.body.classList.add('slide-in-active');
  sessionStorage.removeItem('navigatedFromHome');
}

const clearSubpageExitClasses = () => {
  document.body.classList.remove('slide-out-right', 'slide-out-left');
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
      sessionStorage.setItem('openMenuOnHome', 'true');
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

  // Contact Form Submission Handler (Keeps Details & Shows Confirmation)
  const contactForm = document.querySelector('.contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = document.getElementById('submitBtn') || contactForm.querySelector('.submit-btn');
      const successMsg = document.getElementById('formSuccessMsg');

      // Send form data in the background (for Netlify Forms compatibility)
      const formData = new FormData(contactForm);
      const urlEncoded = new URLSearchParams(formData).toString();

      fetch('/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: urlEncoded
      }).catch(() => {}); // Graceful offline/local handler

      // Button state change for immediate visual feedback
      if (submitBtn) {
        submitBtn.textContent = 'SUBMITTED ✓';
        submitBtn.style.pointerEvents = 'none';
        submitBtn.style.backgroundColor = '#D81700';
        submitBtn.style.color = '#ffffff';
        submitBtn.style.opacity = '1';
        submitBtn.style.boxShadow = '0 5px 15px rgba(216, 23, 0, 0.4)';
      }

      // Show confirmation message below the submit button in #D81700
      if (successMsg) {
        successMsg.style.display = 'block';
      }
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

  scrollContainers.forEach(container => {
    container.addEventListener('scroll', () => {
      const scrollTop = container === window ? (window.pageYOffset || document.documentElement.scrollTop) : container.scrollTop;
      updateHeaderVisibility(scrollTop);
    }, { passive: true });
  });

  // Touch move listener for direct gesture tracking
  document.addEventListener('touchmove', () => {
    if (window.innerWidth > 768) return;
    const container = document.querySelector('.subpage-container') || document.documentElement;
    const currentScroll = container.scrollTop || window.pageYOffset || 0;
    updateHeaderVisibility(currentScroll);
  }, { passive: true });

  // Elastic Scroll Resistance Animation for Subpages (Single trigger per scroll gesture, no repeat/after-bounce)
  const subContainer = document.querySelector('.subpage-container');
  let isSubpageBouncing = false;
  let subWheelCooldownTimer = null;
  let subTouchHasTriggered = false;
  let subTouchStartY = 0;

  function triggerSubpageScrollBounce(direction) {
    if (isSubpageBouncing || !subContainer) return;
    if (sideMenu && sideMenu.classList.contains('open')) return;

    isSubpageBouncing = true;
    const animationClass = direction === 'down' ? 'scroll-bounce-down' : 'scroll-bounce-up';

    subContainer.classList.remove('scroll-bounce-down', 'scroll-bounce-up');
    void subContainer.offsetWidth; // Force CSS reflow
    subContainer.classList.add(animationClass);

    setTimeout(() => {
      subContainer.classList.remove(animationClass);
    }, 450);
  }

  // Wheel / Trackpad listener with momentum lockout
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

  // Touch swipe listener for Mobile & Tablet (strictly once per touch contact)
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      subTouchStartY = e.touches[0].clientY;
      subTouchHasTriggered = false;
    }
  }, { passive: true });

  window.addEventListener('touchmove', (e) => {
    if (!subContainer) return;
    if (e.touches.length === 1 && !subTouchHasTriggered && subTouchStartY !== 0) {
      const touchDiff = subTouchStartY - e.touches[0].clientY;
      if (Math.abs(touchDiff) > 15) {
        const isScrollable = subContainer.scrollHeight > subContainer.clientHeight + 8;
        // On non-scrollable pages, trigger custom subtle bounce. On scrollable pages, native mobile momentum handles boundary smoothly without lifting container
        if (!isScrollable) {
          triggerSubpageScrollBounce(touchDiff > 0 ? 'down' : 'up');
          subTouchHasTriggered = true;
        }
      }
    }
  }, { passive: true });

  window.addEventListener('touchend', () => {
    subTouchStartY = 0;
    setTimeout(() => {
      isSubpageBouncing = false;
      subTouchHasTriggered = false;
    }, 150);
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
});
