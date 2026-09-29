// Logic to handle audio toggle on click and side menu
document.addEventListener('DOMContentLoaded', () => {
  const bgVideo = document.querySelector('.bg-video');
  const openMenuBtn = document.querySelector('.action-btn');
  const closeMenuBtn = document.getElementById('closeMenuBtn');
  const sideMenu = document.getElementById('sideMenu');

  // Toggle Side Menu
  if (openMenuBtn && closeMenuBtn && sideMenu) {
    openMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering the background click
      sideMenu.classList.add('open');
    });

    closeMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent triggering the background click
      sideMenu.classList.remove('open');
    });
  }

  // Close side menu when clicking outside on blank screen
  document.addEventListener('click', (e) => {
    if (sideMenu && sideMenu.classList.contains('open')) {
      if (!e.target.closest('.side-menu') && !e.target.closest('.action-btn')) {
        sideMenu.classList.remove('open');
        return; // Close menu without triggering audio toggle
      }
    }

    // Audio toggle when clicking blank video background
    if (bgVideo) {
      if (e.target.closest('.action-btn') || e.target.closest('#openMenuBtn') || e.target.closest('.side-menu') || e.target.closest('.custom-dropdown') || e.target.closest('.nav-dropdown')) {
        return;
      }
      
      bgVideo.muted = !bgVideo.muted;
    }
  });

  // Close side menu on Escape key press
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sideMenu && sideMenu.classList.contains('open')) {
      sideMenu.classList.remove('open');
    }
  });

  // Intercept navigation links for page transition
  const navLinks = document.querySelectorAll('.nav-links a, .nav-dropdown-content a');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      const targetUrl = link.href;
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
