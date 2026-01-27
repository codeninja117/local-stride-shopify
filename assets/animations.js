class ScrollAnimator {
  constructor() {
    this.observer = new IntersectionObserver(this.handleIntersect, {
      // rootMargin: '0px 0px -50px 0px',
      // threshold: 0.1,

      rootMargin: '0px 0px -50px 0px',
      threshold: [0, 0.1],
    });

    this.init();
    this.setupShopifyListeners();
  }

  init(root = document) {
    const elements = root.querySelectorAll('[data-animate], [data-cascade]');
    elements.forEach((el) => {
      if (el.hasAttribute('data-animate')) {
        // Handle main animation
        const delay = el.dataset.animateDelay || '0';
        el.style.setProperty('--animate-delay', `${delay}s`);
      }

      if (el.hasAttribute('data-cascade')) {
        // Handle cascade timing
        const delay = el.dataset.cascade || '0';
        el.style.setProperty('--cascade-delay', `${delay}s`);
      }

      this.observer.observe(el);
    });
  }

  handleIntersect = (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-inview');
        this.observer.unobserve(entry.target);
      }
    });
  };

  setupShopifyListeners() {
    if (Shopify?.designMode) {
      document.addEventListener('shopify:section:load', (e) => {
        this.init(e.target);
        this.handleDesignMode(e.target);
      });

      document.addEventListener('shopify:section:select', (e) => {
        this.handleDesignMode(e.target);
      });

      this.handleDesignMode(document); // Initial load
    }
  }

  handleDesignMode(root = document) {
    root.querySelectorAll('[data-animate], [data-cascade]').forEach((el) => {
      el.classList.add('is-inview', 'design-mode');
    });
  }
}

// Initialize
new ScrollAnimator();

// class UIAccordion extends HTMLElement {
//   constructor() {
//     super();
//     //implementation
//   }

//   connectedCallback() {
//     //implementation
//   }

//   disconnectedCallback() {
//     //implementation
//   }

//   attributeChangedCallback(name, oldVal, newVal) {
//     //implementation
//   }

//   adoptedCallback() {
//     //implementation
//   }

// }

// window.customElements.define('ui-accordion', UIAccordion);
