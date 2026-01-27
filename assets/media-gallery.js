// class MediaGallery extends HTMLElement {
//   constructor() {
//     super();
//     this.currentSlide = 0;
//     this.isMobile = window.innerWidth <= 768;
//   }

//   connectedCallback() {
//     // Initialize only on mobile
//     if (this.isMobile) {
//       this.initCarousel();
//     }

//     // Handle resize events
//     this.resizeHandler = this.handleResize.bind(this);
//     window.addEventListener('resize', this.resizeHandler);
//   }

//   disconnectedCallback() {
//     // Clean up event listeners
//     window.removeEventListener('resize', this.resizeHandler);
//     this.cleanupCarousel();
//   }

//   handleResize() {
//     const wasMobile = this.isMobile;
//     this.isMobile = window.innerWidth <= 768;

//     // If switching between mobile and desktop modes
//     if (wasMobile !== this.isMobile) {
//       if (this.isMobile) {
//         this.initCarousel();
//       } else {
//         this.cleanupCarousel();
//       }
//     }
//   }

//   initCarousel() {
//     // Get relevant elements
//     this.slidesContainer = this.querySelector('ul');
//     this.slides = this.querySelectorAll('li');

//     // Find the pagination container
//     // Look for the media-gallery-pagination as a sibling element
//     this.paginationContainer = this.parentNode.querySelector('media-gallery-pagination');

//     if (!this.paginationContainer) {
//       return;
//     }

//     this.paginationButtons = this.paginationContainer.querySelectorAll('button');

//     if (!this.slidesContainer || !this.slides.length || !this.paginationButtons.length) {
//       console.log('Missing required elements for carousel');
//       return;
//     }

//     // Add click events to pagination buttons
//     this.paginationButtons.forEach((button) => {
//       // Remove any existing event listeners by cloning and replacing
//       const newButton = button.cloneNode(true);
//       button.parentNode.replaceChild(newButton, button);

//       // Add new event listener
//       newButton.addEventListener('click', () => {
//         // The HTML data-index might be 1-based (from the template's forloop.index)
//         const index = parseInt(newButton.getAttribute('data-index'));
//         const slideIndex = isNaN(index) ? 0 : Math.max(0, index - 1);

//         console.log('Button clicked with data-index:', index, 'navigating to slide:', slideIndex);
//         this.goToSlide(slideIndex);
//       });
//     });

//     // Set up scroll detection
//     this.scrollHandler = this.handleScroll.bind(this);
//     this.slidesContainer.addEventListener('scroll', this.scrollHandler);

//     // Initialize with first slide
//     this.updateActiveDot();
//   }

//   cleanupCarousel() {
//     if (this.slidesContainer) {
//       this.slidesContainer.removeEventListener('scroll', this.scrollHandler);
//     }

//     if (this.paginationButtons) {
//       this.paginationButtons.forEach((button) => {
//         const newButton = button.cloneNode(true);
//         button.parentNode.replaceChild(newButton, button);
//       });
//     }
//   }

//   goToSlide(index) {
//     if (index < 0 || index >= this.slides.length) {
//       console.log('Invalid slide index:', index);
//       return;
//     }

//     this.currentSlide = index;
//     console.log('Navigating to slide:', index);

//     // Scroll to the selected slide
//     const slideElement = this.slides[this.currentSlide];

//     // Use scrollIntoView for carousel navigation
//     if (slideElement && typeof slideElement.scrollIntoView === 'function') {
//       slideElement.scrollIntoView({
//         behavior: 'smooth',
//         block: 'nearest',
//         inline: 'start',
//       });

//       // Update active dot
//       this.updateActiveDot();
//     } else {
//       console.log('Unable to scroll to slide element:', slideElement);
//     }
//   }

//   updateActiveDot() {
//     this.paginationButtons.forEach((button, i) => {
//       const dotElement = button.querySelector('div');
//       if (!dotElement) return;

//       if (i === this.currentSlide) {
//         dotElement.classList.add('active');
//         dotElement.style.backgroundColor = '#333333';
//       } else {
//         dotElement.classList.remove('active');
//         dotElement.style.backgroundColor = '#C2C2C2';
//       }
//     });
//   }

//   handleScroll() {
//     // Clear timeout if it exists
//     if (this.scrollTimeout) {
//       clearTimeout(this.scrollTimeout);
//     }

//     // Set a timeout to run after scrolling ends
//     this.scrollTimeout = setTimeout(() => {
//       // Find most visible slide
//       let mostVisibleSlideIndex = 0;
//       let maxVisibleArea = 0;

//       this.slides.forEach((slide, index) => {
//         const rect = slide.getBoundingClientRect();
//         const containerRect = this.slidesContainer.getBoundingClientRect();

//         // Calculate visible area
//         const visibleLeft = Math.max(rect.left, containerRect.left);
//         const visibleRight = Math.min(rect.right, containerRect.right);
//         const visibleWidth = Math.max(0, visibleRight - visibleLeft);

//         if (visibleWidth > maxVisibleArea) {
//           maxVisibleArea = visibleWidth;
//           mostVisibleSlideIndex = index;
//         }
//       });

//       // Update current slide without scrolling
//       if (this.currentSlide !== mostVisibleSlideIndex) {
//         this.currentSlide = mostVisibleSlideIndex;
//         this.updateActiveDot();
//       }
//     }, 100);
//   }
// }

// // Register the custom elements
// customElements.define('media-gallery', MediaGallery);

// class MediaGalleryPagination extends HTMLElement {
//   constructor() {
//     super();
//   }
// }

// customElements.define('media-gallery-pagination', MediaGalleryPagination);
class MediaGallery extends HTMLElement {
  constructor() {
    super();
    this.currentSlide = 0;
    this.isMobile = window.innerWidth <= 768;
  }

  connectedCallback() {
    // Initialize only on mobile
    if (this.isMobile) {
      this.initCarousel();
    }

    // Handle resize events
    this.resizeHandler = this.handleResize.bind(this);
    window.addEventListener('resize', this.resizeHandler);
  }

  disconnectedCallback() {
    // Clean up event listeners
    window.removeEventListener('resize', this.resizeHandler);
    this.cleanupCarousel();
  }

  handleResize() {
    const wasMobile = this.isMobile;
    this.isMobile = window.innerWidth <= 768;

    // If switching between mobile and desktop modes
    if (wasMobile !== this.isMobile) {
      if (this.isMobile) {
        this.initCarousel();
      } else {
        this.cleanupCarousel();
      }
    }
  }

  initCarousel() {
    // Get relevant elements
    this.slidesContainer = this.querySelector('ul');
    this.slides = this.querySelectorAll('li');

    // Find the pagination container - it's a child in your HTML, not a sibling
    this.paginationContainer = this.querySelector('media-gallery-pagination');

    if (!this.paginationContainer) {
      console.log('Pagination container not found');
      return;
    }

    this.paginationButtons = this.paginationContainer.querySelectorAll('button');

    if (!this.slidesContainer || !this.slides.length || !this.paginationButtons.length) {
      console.log('Missing required elements for carousel');
      return;
    }

    // Add click events to pagination buttons
    this.paginationButtons.forEach((button) => {
      // Remove any existing event listeners by cloning and replacing
      const newButton = button.cloneNode(true);
      button.parentNode.replaceChild(newButton, button);

      // Add new event listener
      newButton.addEventListener('click', (e) => {
        e.preventDefault();
        // The HTML data-index is 1-based (from the template's forloop.index)
        const index = parseInt(newButton.getAttribute('data-index'));
        const slideIndex = isNaN(index) ? 0 : Math.max(0, index - 1);

        console.log('Button clicked with data-index:', index, 'navigating to slide:', slideIndex);
        this.goToSlide(slideIndex);
      });
    });

    // Set up scroll detection
    this.scrollHandler = this.handleScroll.bind(this);
    this.slidesContainer.addEventListener('scroll', this.scrollHandler);

    // Initialize with first slide
    this.updateActiveDot();
  }

  cleanupCarousel() {
    if (this.slidesContainer && this.scrollHandler) {
      this.slidesContainer.removeEventListener('scroll', this.scrollHandler);
    }

    if (this.paginationButtons) {
      this.paginationButtons.forEach((button) => {
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
      });
    }
  }

  goToSlide(index) {
    if (index < 0 || index >= this.slides.length) {
      console.log('Invalid slide index:', index);
      return;
    }

    this.currentSlide = index;
    console.log('Navigating to slide:', index);

    // Scroll to the selected slide
    const slideElement = this.slides[this.currentSlide];

    // Use scrollIntoView for carousel navigation
    if (slideElement && typeof slideElement.scrollIntoView === 'function') {
      slideElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'start',
      });

      // Update active dot
      this.updateActiveDot();
    } else {
      console.log('Unable to scroll to slide element:', slideElement);
    }
  }

  updateActiveDot() {
    if (!this.paginationButtons) return;

    this.paginationButtons.forEach((button, i) => {
      const dotElement = button.querySelector('div');

      if (!dotElement) return;

      if (i === this.currentSlide) {
        dotElement.classList.add('active');
        dotElement.style.backgroundColor = '#333333';
      } else {
        dotElement.classList.remove('active');
        dotElement.style.backgroundColor = '#C2C2C2';
      }
    });
  }

  handleScroll() {
    // Clear timeout if it exists
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
    }

    // Set a timeout to run after scrolling ends
    this.scrollTimeout = setTimeout(() => {
      // Find most visible slide
      let mostVisibleSlideIndex = 0;
      let maxVisibleArea = 0;

      this.slides.forEach((slide, index) => {
        const rect = slide.getBoundingClientRect();
        const containerRect = this.slidesContainer.getBoundingClientRect();

        // Calculate visible area
        const visibleLeft = Math.max(rect.left, containerRect.left);
        const visibleRight = Math.min(rect.right, containerRect.right);
        const visibleWidth = Math.max(0, visibleRight - visibleLeft);

        if (visibleWidth > maxVisibleArea) {
          maxVisibleArea = visibleWidth;
          mostVisibleSlideIndex = index;
        }
      });

      // Update current slide without scrolling
      if (this.currentSlide !== mostVisibleSlideIndex) {
        this.currentSlide = mostVisibleSlideIndex;
        this.updateActiveDot();
      }
    }, 100);
  }
}

// Register the custom elements
customElements.define('media-gallery', MediaGallery);

class MediaGalleryPagination extends HTMLElement {
  constructor() {
    super();
  }
}

customElements.define('media-gallery-pagination', MediaGalleryPagination);
