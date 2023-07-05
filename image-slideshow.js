// 
// Program Name:          image-slideshow.js
// Date Last Modified:    07/04/2023
// Last Modified By:      Lauren Escobedo
// Language:              JavaScript
//
//  Program Description:  This file configures a slideshow using the Swiper slideshow library.
//                        HTML structure for the slideshow is:
//
//                        <swiper-container>
//                          <swiper-wrapper>
//                            <swiper-slide>
//                              <img src="source_here">
//                            </swiper-slide>
//                          </swiper-wrapper>
//                        </swiper-container>
//

document.addEventListener("DOMContentLoaded", function () {
  // Gather slide elements
  const slides = document.querySelectorAll('.swiper-container .swiper-slide');
  let currentSlideIndex = 0;

  // Show a slide by index
  function showSlide(index) {
    slides.forEach(function (slide) {
      slide.style.display = 'none';
    });

    slides[index].style.display = 'block';
    currentSlideIndex = index;
  }

  // Show next slide
  function showNextSlide() {
    currentSlideIndex++;
    if (currentSlideIndex >= slides.length) {
      currentSlideIndex = 0;
    }
    showSlide(currentSlideIndex);
  }

  // Show previous slide
  function showPreviousSlide() {
    currentSlideIndex--;
    if (currentSlideIndex < 0) {
      currentSlideIndex = slides.length - 1;
    }
    showSlide(currentSlideIndex);
  }

  // Run the slideshow
  function startSlideshow() {
    // Show the first slide initially
    showSlide(currentSlideIndex);

    // Set an interval to automatically move to the next slide every 3 seconds
    setInterval(showNextSlide, 3000);
  }

  // Add event listeners to the navigation buttons
  const nextButton = document.querySelector('.next-arrow');
  nextButton.addEventListener('click', function () {
    clearInterval(slideshowInterval); // Clear the automatic slideshow interval
    showNextSlide();
  });

  const prevButton = document.querySelector('.prev-arrow');
  prevButton.addEventListener('click', function () {
    clearInterval(slideshowInterval); // Clear the automatic slideshow interval
    showPreviousSlide();
  });

  // Start the slideshow
  const slideshowInterval = startSlideshow();
});