if (sessionStorage.getItem('navigatedFromHome') === 'true') {
  document.body.classList.add('slide-in-active');
  sessionStorage.removeItem('navigatedFromHome');
}

document.addEventListener('DOMContentLoaded', () => {
  const homeBtn = document.querySelector('.home-btn');
  if (homeBtn) {
    homeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const targetUrl = homeBtn.href;
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
        submitBtn.style.opacity = '0.85';
      }

      // Show confirmation message below the submit button in #D81700
      if (successMsg) {
        successMsg.style.display = 'block';
      }
    });
  }
});
