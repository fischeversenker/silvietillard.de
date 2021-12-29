(function () {
  'use strict';

  const story = document.querySelector('.story');

  story.addEventListener('mousemove', (event) => {
    const storyImage = event.target.closest('.story__image');
    // bail if not over image
    if (!storyImage) {
      story.style.cursor = 'auto';
      return;
    }

    const windowWidth = window.innerWidth;
    // bail if small screen
    if (windowWidth < 600) {
      story.style.cursor = 'auto';
      return;
    }

    updateCursor(event.clientX);
  }, { passive: true });

  story.addEventListener('click', (event) => {
    const storyImage = event.target.closest('.story__image');
    // bail if not over image
    if (!storyImage) {
      return;
    }

    const windowWidth = window.innerWidth;
    // bail if small screen
    if (windowWidth < 600) {
      return;
    }

    const cursorIsInRightSide = event.clientX >= windowWidth / 2;

    let scrollLeftDestination = 0;

    if (cursorIsInRightSide) {
      const imageLeftOffset = storyImage.offsetLeft
      scrollLeftDestination = imageLeftOffset - 32;
    } else {
      let previousIntersectingSibling = storyImage.previousElementSibling;
      let siblingRectLeft = previousIntersectingSibling?.getBoundingClientRect().left;
      while (siblingRectLeft > 0) {
        previousIntersectingSibling = previousIntersectingSibling.previousElementSibling;
        siblingRectLeft = previousIntersectingSibling?.getBoundingClientRect().left;
      }

      if (previousIntersectingSibling && previousIntersectingSibling.matches('.story__image')) {
        const siblingOffsetLeft = previousIntersectingSibling.offsetLeft;
        scrollLeftDestination = siblingOffsetLeft - 32;
      } else {
        scrollLeftDestination = 0;
      }
    }
    window.scrollTo({ left: scrollLeftDestination, behavior: 'smooth' });
    updateCursor(event.clientX);
  });

  function updateCursor(xPos) {
    const cursorIsInRightSide = xPos >= window.innerWidth / 2;
    if (cursorIsInRightSide) {
      story.style.cursor = 'url(/assets/arrow-right.svg) 29 12, auto';
    } else {
      story.style.cursor = 'url(/assets/arrow-left.svg) 0 12, auto';
    }
  }
})();
