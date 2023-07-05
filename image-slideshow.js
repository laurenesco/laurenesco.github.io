document.addEventListener("DOMContentLoaded", function() {
    const slides = document.querySelectorAll('.swiper-container .swiper-slide');
  
    let currentSlideIndex = 0;
  
    function showSlide(index) {
      slides.forEach(function(slide) {
        slide.style.display = 'none';
      });
  
      slides[index].style.display = 'block';
      currentSlideIndex = index;
    }
  
    function showNextSlide() {
      currentSlideIndex++;
      if (currentSlideIndex >= slides.length) {
        currentSlideIndex = 0;
      }
      showSlide(currentSlideIndex);
    }
  
    function showPreviousSlide() {
      currentSlideIndex--;
      if (currentSlideIndex < 0) {
        currentSlideIndex = slides.length - 1;
      }
      showSlide(currentSlideIndex);
    }
  
    // Show the first slide initially
    showSlide(currentSlideIndex);
  
    // Add event listeners to navigation buttons
    const nextButton = document.querySelector('.next-arrow');
    nextButton.addEventListener('click', showNextSlide);
  
    const prevButton = document.querySelector('.prev-arrow');
    prevButton.addEventListener('click', showPreviousSlide);
  });