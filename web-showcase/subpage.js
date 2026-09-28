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
});
