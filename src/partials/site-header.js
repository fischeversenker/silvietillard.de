(function () {
  'use strict';

  const menuButton = document.querySelector('.site-header__menu-button');
  const menu = document.querySelector('.site-header__menu');

  menuButton.addEventListener('click', () => {
    const isOpen = menu.classList.toggle('open');
    menuButton.classList.toggle('is-cross', isOpen);
    document.body.classList.toggle('prevent-scroll', isOpen);
  });
})();
