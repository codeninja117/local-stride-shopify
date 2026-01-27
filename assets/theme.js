document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const targetId = this.getAttribute('href');
    const targetElement = document.querySelector(targetId);

    if (targetElement) {
      const headerOffset = 200; // Match this to your sticky header height
      const elementPosition = targetElement.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth', // Enables smooth scrolling
      });

      // Update URL without jumping (optional)
      history.pushState(null, null, targetId);
    }
  });
});

/**
 * Overlays
 */

class UIHeader extends HTMLElement {
  // uncomment this.breakpointEnabled & this.shouldUpdateColors to enable header colorchanges
  constructor() {
    super();
    this.sections = [];
    this.observers = [];
    this.currentSection = null;
    this.headerHeight = 0;
    // this.breakpointEnabled = this.hasAttribute('data-breakpoint');
    this.mediaQuery = window.matchMedia('(min-width: 1024px)');
    this.isWideScreen = this.mediaQuery.matches;
    // this.shouldUpdateColors = this.breakpointEnabled ? this.isWideScreen : true;

    this.headerGroup = document.querySelector('.header-group');
    this.announcementBar = document.querySelector('announcement-bar');
  }

  connectedCallback() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init());
    } else {
      this.init();
    }
  }

  disconnectedCallback() {
    // Clean up all observers
    this.observers.forEach((observer) => observer.disconnect());

    // Remove media query listener if we were using breakpoints
    if (this.breakpointEnabled) {
      this.mediaQuery.removeEventListener('change', this.handleMediaChange);
    }

    // Remove resize event listener if we added one
    window.removeEventListener('resize', this.handleResize);
  }

  init() {
    // Setup media query listener if breakpoint is enabled
    if (this.breakpointEnabled) {
      this.handleMediaChange = this.handleMediaChange.bind(this);
      this.mediaQuery.addEventListener('change', this.handleMediaChange);
    }

    // Bind the resize handler and set initial heights
    this.handleResize = this.handleResize.bind(this);
    window.addEventListener('resize', this.handleResize);
    this.setHeaderHeight();

    // Find all sections within the main tag
    // this.sections = Array.from(document.querySelectorAll('main > section'));
    this.sections = Array.from(document.querySelectorAll('.js-section-color'));
    if (this.sections.length === 0) return;

    // Only proceed if we should update colors (either no breakpoint constraint or we're above the breakpoint)
    if (this.shouldUpdateColors) {
      // Create a ResizeObserver to track header height changes
      this.createResizeObserver();

      // Create individual observers for each section
      this.setupSectionObservers();

      // Initial check
      this.checkInitialState();
    }

    // Set active class on current page link
    this.setActiveLinks();
  }

  // Add this new method to calculate and set heights
  setHeaderHeight() {
    // Set header group height (includes both header and announcement bar)
    const headerGroupHeight = this.headerGroup ? this.headerGroup.offsetHeight : this.offsetHeight;
    document.documentElement.style.setProperty('--header-height', `${headerGroupHeight}px`);

    // Set announcement bar height if it exists
    if (this.announcementBar) {
      document.documentElement.style.setProperty('--announcement-bar-height', `${this.announcementBar.offsetHeight}px`);
    } else {
      document.documentElement.style.setProperty('--announcement-bar-height', '0px');
    }

    // Update the headerHeight property for intersection observers
    this.headerHeight = headerGroupHeight;
  }

  // Add this method to handle resize events
  handleResize() {
    this.setHeaderHeight();

    // If any IntersectionObservers are active, update them with the new height
    if (this.shouldUpdateColors && this.observers.some((obs) => obs instanceof IntersectionObserver)) {
      // Disconnect existing IntersectionObservers
      this.observers.forEach((observer) => {
        if (observer instanceof IntersectionObserver) {
          observer.disconnect();
        }
      });

      // Filter out IntersectionObservers but keep ResizeObserver
      this.observers = this.observers.filter((observer) => !(observer instanceof IntersectionObserver));

      // Recreate the IntersectionObservers with updated heights
      this.setupSectionObservers();
    }
  }

  createResizeObserver() {
    const resizeObserver = new ResizeObserver((entries) => {
      // Only process if we should update colors
      if (!this.shouldUpdateColors) return;

      for (const entry of entries) {
        // Update header heights
        this.setHeaderHeight();

        // Re-initialize section observers with new header height
        this.observers.forEach((observer) => {
          if (observer instanceof IntersectionObserver) {
            observer.disconnect();
          }
        });

        // Filter out the resize observer to keep it
        this.observers = this.observers.filter((observer) => !(observer instanceof IntersectionObserver));

        this.setupSectionObservers();
      }
    });

    resizeObserver.observe(this);
    if (this.headerGroup && this.headerGroup !== this) {
      resizeObserver.observe(this.headerGroup);
    }
    if (this.announcementBar) {
      resizeObserver.observe(this.announcementBar);
    }
    this.observers.push(resizeObserver);
  }

  setActiveLinks() {
    const currentPath = window.location.pathname;
    const links = this.querySelectorAll('a');

    links.forEach((link) => {
      const linkPath = link.getAttribute('href');

      // Check if this link matches the current path
      if (linkPath === currentPath || (currentPath !== '/' && linkPath !== '/' && currentPath.startsWith(linkPath))) {
        link.classList.add('active');
      }
    });
  }

  handleMediaChange(e) {
    this.isWideScreen = e.matches;
    this.shouldUpdateColors = this.breakpointEnabled ? this.isWideScreen : true;

    if (this.shouldUpdateColors) {
      // We've crossed above the breakpoint - initialize everything
      if (this.observers.length === 0) {
        this.createResizeObserver();
        this.setupSectionObservers();
        this.checkInitialState();
      }
    } else {
      // We've crossed below the breakpoint - disconnect observers and reset colors
      this.observers.forEach((observer) => {
        if (observer instanceof IntersectionObserver) {
          observer.disconnect();
        }
      });
      this.observers = this.observers.filter((observer) => !(observer instanceof IntersectionObserver));
      this.resetHeaderColors();
      this.currentSection = null;
    }
  }

  createResizeObserver() {
    const resizeObserver = new ResizeObserver((entries) => {
      // Only process if we should update colors
      if (!this.shouldUpdateColors) return;

      for (const entry of entries) {
        // Update header height when it changes
        this.headerHeight = entry.contentRect.height;

        // Re-initialize section observers with new header height
        this.observers.forEach((observer) => {
          if (observer instanceof IntersectionObserver) {
            observer.disconnect();
          }
        });

        // Filter out the resize observer to keep it
        this.observers = this.observers.filter((observer) => !(observer instanceof IntersectionObserver));

        this.setupSectionObservers();
      }
    });

    resizeObserver.observe(this);
    this.observers.push(resizeObserver);
  }

  setupSectionObservers() {
    if (!this.shouldUpdateColors) return;

    this.headerHeight = this.getBoundingClientRect().height;

    this.sections.forEach((section, index) => {
      // Create observer for top edge (for scrolling down)
      const topObserver = this.createIntersectionObserver('top', section);

      // Create observer for bottom edge (for scrolling up)
      const bottomObserver = this.createIntersectionObserver('bottom', section);

      this.observers.push(topObserver, bottomObserver);
    });
  }

  createIntersectionObserver(edge, section) {
    let rootMargin;

    if (edge === 'top') {
      // For detecting when section top hits header bottom
      rootMargin = `-${this.headerHeight}px 0px -100% 0px`;
    } else {
      // For detecting when section bottom hits header top (when scrolling up)
      rootMargin = `0px 0px -${this.headerHeight}px 0px`;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        // Only process if we should update colors
        if (!this.shouldUpdateColors) return;

        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (edge === 'top') {
              // Section top has hit header bottom - change to this section's color
              this.updateHeaderColors(section);
              this.currentSection = section;
            } else if (this.currentSection === section) {
              // We're scrolling up and the bottom of this section has hit the header top
              // Find previous section
              const sectionIndex = this.sections.indexOf(section);
              if (sectionIndex > 0) {
                this.updateHeaderColors(this.sections[sectionIndex - 1]);
                this.currentSection = this.sections[sectionIndex - 1];
              } else {
                // We've scrolled up past the first section
                this.resetHeaderColors();
                this.currentSection = null;
              }
            }
          }
        });
      },
      {
        threshold: [0],
        rootMargin,
      },
    );

    observer.observe(section);
    return observer;
  }

  checkInitialState() {
    if (!this.shouldUpdateColors) return;

    const headerBottom = this.getBoundingClientRect().bottom;
    let activeSection = null;
    let minDistance = Infinity;

    for (const section of this.sections) {
      const sectionTop = section.getBoundingClientRect().top;
      const distance = Math.abs(sectionTop - headerBottom);

      if (sectionTop <= headerBottom && distance < minDistance) {
        minDistance = distance;
        activeSection = section;
      }
    }

    if (activeSection) {
      this.updateHeaderColors(activeSection);
      this.currentSection = activeSection;
    } else if (this.sections[0]?.getBoundingClientRect().top > headerBottom) {
      this.resetHeaderColors();
    }
  }

  updateHeaderColors(section) {
    if (!section || !this.shouldUpdateColors) return;

    if (!section.cachedTextColor) {
      section.cachedTextColor = getComputedStyle(section).getPropertyValue('--text-color').trim();
    }

    const textColor = section.cachedTextColor;

    // Set the color as a CSS variable on the header element
    this.style.setProperty('--header-text-color', textColor);
  }

  resetHeaderColors() {
    // Remove the CSS variable to revert to default value
    this.style.removeProperty('--header-text-color');
  }
}

window.customElements.define('ui-header', UIHeader);

class UIHeaderToggle extends HTMLElement {
  constructor() {
    super();
    this.header = null;
    this.overlay = null;
    this.isOpen = false;
  }

  connectedCallback() {
    // Find the closest ui-header parent
    this.header = this.closest('ui-header');

    if (!this.header) {
      console.error('UIHeaderToggle must be a child of UIHeader');
      return;
    }

    // Find the header overlay element
    this.overlay = document.querySelector('ui-header-overlay');

    if (!this.overlay) {
      console.warn('UIHeaderOverlay element not found');
    }

    // Add click event to toggle header state
    this.addEventListener('click', this.toggleHeader.bind(this));

    // Make sure the toggle is accessible
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'button');
    }

    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }

    if (!this.hasAttribute('aria-label')) {
      this.setAttribute('aria-label', 'Toggle menu');
    }

    // Add keyboard support
    this.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggleHeader();
      }
    });
  }

  toggleHeader() {
    if (!this.header) return;

    this.isOpen = !this.isOpen;

    if (this.isOpen) {
      // Open the header and overlay
      this.header.setAttribute('open', '');
      if (this.overlay) {
        this.overlay.setAttribute('open', '');
      }
      this.setAttribute('aria-expanded', 'true');
      // Prevent body scrolling when menu is open
      document.body.style.overflow = 'hidden';
    } else {
      // Close the header and overlay
      this.header.removeAttribute('open');
      if (this.overlay) {
        this.overlay.removeAttribute('open');
      }
      this.setAttribute('aria-expanded', 'false');
      // Restore body scrolling
      document.body.style.overflow = '';
    }
  }
}

customElements.define('ui-header-toggle', UIHeaderToggle);

class UIHeaderOverlay extends HTMLElement {
  constructor() {
    super();
    this.animatedElements = [];
    this.header = null;
    this.toggle = null;
  }

  connectedCallback() {
    // Find related elements
    this.header = document.querySelector('ui-header');
    this.toggle = this.header ? this.header.querySelector('ui-header-toggle') : null;

    // Find elements to animate
    this.logoElement = this.querySelector('.w-28.text-black'); // Your logo div
    this.menuItems = Array.from(this.querySelectorAll('ul li'));
    this.buttonElement = this.querySelector('button.btn-primary, [class*="button"][class*="primary"]'); // More flexible selector

    // Combine all animated elements in order
    this.animatedElements = [this.logoElement, ...this.menuItems, this.buttonElement].filter((el) => el);

    // Set initial state for animated elements
    this.resetAnimations();

    // Add click event to close the menu when clicking the overlay background
    this.addEventListener('click', this.closeMenu.bind(this));

    // Find and add click event to close button
    const closeButton = this.querySelector('[data-js="close"]');
    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event from bubbling to overlay
        this.closeAll();
      });
    }

    // Add keydown event listener for ESC key
    document.addEventListener('keydown', this.handleKeydown.bind(this));

    // Set up mutation observer to detect open attribute changes
    this.setupAttributeObserver();
  }

  setupAttributeObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'open') {
          if (this.hasAttribute('open')) {
            this.playAnimations();
          } else {
            this.resetAnimations();
          }
        }
      });
    });

    observer.observe(this, { attributes: true });
  }

  handleKeydown(e) {
    // Close menu when ESC key is pressed and overlay is open
    if (e.key === 'Escape' && this.hasAttribute('open')) {
      this.closeAll();
      e.preventDefault();
    }
  }

  // Method to close all related UI components
  closeAll() {
    if (this.header) {
      this.header.removeAttribute('open');
    }

    this.removeAttribute('open');

    if (this.toggle && this.toggle.isOpen) {
      this.toggle.isOpen = false;
      this.toggle.setAttribute('aria-expanded', 'false');
    }

    // Restore body scrolling
    document.body.style.overflow = '';
  }

  playAnimations() {
    // Apply animation styles to each element with increasing delay
    this.animatedElements.forEach((element, index) => {
      if (!element) return;

      // Remove any existing transition styles
      element.style.transition = '';

      // Apply initial state
      element.style.opacity = '0';
      element.style.transform = 'translateX(-3px)';

      // Force a reflow to ensure the initial state is applied
      element.offsetHeight;

      // Calculate staggered delay
      const delay = 50 + index * 80; // 50ms base delay, 80ms between elements

      // Apply animation
      element.style.transition = `opacity 200ms ease ${delay}ms, transform 200ms ease ${delay}ms`;
      element.style.opacity = '1';
      element.style.transform = 'translateX(0)';
    });
  }

  resetAnimations() {
    // Reset all animated elements to their initial state
    this.animatedElements.forEach((element) => {
      if (!element) return;

      // Clear transition to avoid animation on initial load
      element.style.transition = 'none';
      element.style.opacity = '0';
      element.style.transform = 'translateX(-20px)';
    });
  }

  closeMenu(e) {
    // Only close if clicking the overlay background (not its children)
    if (e.target === this) {
      this.closeAll();
    }
  }

  // Clean up event listeners when element is removed
  disconnectedCallback() {
    document.removeEventListener('keydown', this.handleKeydown);

    const closeButton = this.querySelector('[data-js="close"]');
    if (closeButton) {
      closeButton.removeEventListener('click', this.closeAll);
    }
  }
}

customElements.define('ui-header-overlay', UIHeaderOverlay);

class AnnouncementBar extends HTMLElement {
  constructor() {
    super();
    this.resizeObserver = null;
  }

  connectedCallback() {
    // Set up a ResizeObserver to track height changes
    this.setupResizeObserver();

    // Initial measurement and CSS variable setting
    this.updateHeight();
  }

  disconnectedCallback() {
    // Clean up the ResizeObserver when component is removed
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    // If any attributes change that might affect height, update the measurement
    this.updateHeight();
  }

  adoptedCallback() {
    // If the element is moved to a new document, update the measurement
    this.updateHeight();
  }

  setupResizeObserver() {
    // Create a ResizeObserver to detect height changes
    this.resizeObserver = new ResizeObserver((entries) => {
      // Update the CSS variable when the size changes
      this.updateHeight();
    });

    // Start observing this element
    this.resizeObserver.observe(this);
  }

  updateHeight() {
    // Get the current height in pixels
    const height = this.offsetHeight;

    // Set the height as a CSS variable on the document root (html element)
    document.documentElement.style.setProperty('--announcement-bar-height', `${height}px`);

    // Also set a fallback value of 0px when the bar is not present
    if (height === 0) {
      document.documentElement.style.setProperty('--announcement-bar-height', '0px');
    }

    // Dispatch a custom event that other components might want to listen for
    window.dispatchEvent(
      new CustomEvent('announcement-bar-height-changed', {
        detail: { height },
      }),
    );
  }
}

window.customElements.define('announcement-bar', AnnouncementBar);

class UIBaseOverlay extends HTMLElement {
  // Shared methods
  constructor() {
    super();
    this.overlay = this.querySelector('.overlay');
    this.closeButtons = this.querySelectorAll('[data-close]');
    this.openAttribute = 'open';
  }

  connectedCallback() {
    this.setAttribute('role', 'dialog');
    this.setAttribute('aria-modal', 'true');
    this.setAttribute('aria-hidden', 'true');
    this.init();
  }

  init() {
    this.addEventListeners();
    this.setupAccessibility();
  }

  setupAccessibility() {
    const toggles = document.querySelectorAll(`[aria-controls="${this.id}"]`);
    toggles.forEach((toggle) => {
      toggle.setAttribute('aria-expanded', 'false');
    });
  }

  addEventListeners() {
    // Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.close();
    });

    // Close buttons
    this.closeButtons.forEach((btn) => {
      btn.addEventListener('click', () => this.close());
    });
  }

  toggle() {
    this.isOpen ? this.close() : this.open();
  }

  open() {
    this.setAttribute(this.openAttribute, '');
    this.setAttribute('aria-hidden', 'false');
    this.setAttribute('aria-expanded', 'true');

    document.body.classList.add('overflow-hidden');
    trapFocus(this);
    this.focus();
  }

  close() {
    this.removeAttribute(this.openAttribute);
    this.setAttribute('aria-hidden', 'true');
    this.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('overflow-hidden');
    removeTrapFocus();
    this.activeTrigger?.focus();
  }

  get isOpen() {
    return this.hasAttribute('open');
  }
}

customElements.define('ui-base-overlay', UIBaseOverlay);

class UIDrawer extends UIBaseOverlay {
  static get observedAttributes() {
    return ['data-direction'];
  }

  constructor() {
    super();
    this.direction = this.getAttribute('data-direction') || 'left';
    console.log('HI');
  }

  connectedCallback() {
    super.connectedCallback();
    this.classList.add(`drawer--${this.direction}`);
    this.setupDrawerSpecifics();
  }

  setupDrawerSpecifics() {
    // Drawer-specific logic
    this.overlay?.addEventListener('click', () => this.close());
    this.addEventListener('transitionend', this.handleTransitionEnd);
  }

  handleTransitionEnd = () => {
    // Handle any drawer-specific transitions
  };

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'data-direction') {
      this.classList.remove(`drawer--${oldValue}`);
      this.classList.add(`drawer--${newValue}`);
    }
  }
}

customElements.define('ui-drawer', UIDrawer);

class UIHeaderDrawer extends UIDrawer {
  static get observedAttributes() {
    return ['open']; // Observe open state changes
  }

  constructor() {
    super();
    // Override direction for header-specific styling
    this.direction = 'top';
    this.classList.add('header-drawer');
  }

  connectedCallback() {
    super.connectedCallback();
    // Header drawer specific initialization
    this.style.setProperty('--drawer-height', '0%');
    this.setupHeaderPositioning();
  }

  setupHeaderPositioning() {
    // Add specific positioning logic
    this.style.top = '0';
    this.style.left = '0';
    this.style.right = '0';
    // this.style.height = 'auto'; // Reset base drawer height
  }

  open() {
    super.open();
    this.style.setProperty('--drawer-height', '100%');
  }

  close() {
    super.close();
    this.style.setProperty('--drawer-height', '0%');
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === 'open') {
      this.style.setProperty('--drawer-height', newValue ? '100%' : '0%');
    }
  }
}

customElements.define('ui-header-drawer', UIHeaderDrawer);

class UIModal extends UIBaseOverlay {
  connectedCallback() {
    super.connectedCallback();
    this.classList.add('modal');
    this.setupModalSpecifics();
  }

  setupModalSpecifics() {
    this.addEventListener('click', (e) => {
      if (e.target === this) this.close();
    });
  }

  open() {
    super.open();
    window.pauseAllMedia(); // Shopify-specific media handling
  }

  close() {
    super.close();
    window.pauseAllMedia();
  }
}

customElements.define('ui-modal', UIModal);

/**
 * Custom Accordion Web Component
 * Features:
 * - Smooth height animations
 * - Single-open functionality
 * - Immediate color transitions when switching accordions
 * - Resize handling with debouncing
 * - Proper cleanup of event listeners
 */

class UIAccordion extends HTMLElement {
  connectedCallback() {
    const details = this.querySelector('details');
    const content = details.querySelector('.ui-accordion__content');
    const summary = details.querySelector('summary');

    // Initialize height based on open state
    if (details.open) {
      this.classList.add('active');
      content.style.height = 'auto';
    } else {
      content.style.height = '0';
    }

    summary.addEventListener('click', (e) => {
      e.preventDefault();

      if (details.open) {
        // Closing animation
        this.closeAccordion(content, details);
      } else {
        // Close other accordions in the same parent container
        this.closeOtherAccordions();

        // Opening animation
        this.openAccordion(content, details);
      }
    });
  }

  openAccordion(content, details) {
    // Opening animation
    details.open = true;
    this.classList.add('active');
    const endHeight = content.scrollHeight;

    content.style.height = '0';
    void content.offsetHeight; // Force reflow
    content.style.height = `${endHeight}px`;

    content.addEventListener(
      'transitionend',
      () => {
        content.style.height = 'auto';
      },
      { once: true },
    );
  }

  closeAccordion(content, details) {
    this.classList.remove('active');
    const startHeight = content.scrollHeight;
    content.style.height = `${startHeight}px`;

    void content.offsetHeight; // Force reflow
    content.style.height = '0';

    content.addEventListener(
      'transitionend',
      () => {
        details.open = false;
      },
      { once: true },
    );
  }

  closeOtherAccordions() {
    const parentContainer = this.closest('div'); // Adjust selector to your parent container
    if (parentContainer) {
      const otherAccordions = parentContainer.querySelectorAll('ui-accordion:not(:scope)');
      otherAccordions.forEach((accordion) => {
        const otherDetails = accordion.querySelector('details');
        const otherContent = accordion.querySelector('.ui-accordion__content');
        if (otherDetails.open) {
          accordion.closeAccordion(otherContent, otherDetails);
        }
      });
    }
  }
}

customElements.define('ui-accordion', UIAccordion);

class UICarousel extends HTMLElement {
  constructor() {
    super();
    this.validPaginationTypes = ['progressbar', 'bullets', 'fraction', 'custom'];
    this.validEffects = ['fade', 'slide', 'cube', 'coverflow', 'flip', 'creative'];
    this.defaultConfig = {
      loop: false,
      slidesPerView: this.dataset.slidesPerView || 1,
      spaceBetween: this.dataset.spaceBetween || 30,
      centeredSlides: this.dataset.centeredSlides === 'true',
      watchOverflow: true,
    };
  }

  connectedCallback() {
    this.initializeSwiper(this.getMergedConfig());
  }

  getMergedConfig() {
    const config = {
      ...this.defaultConfig,
      ...this.getNavigationConfig(),
      ...this.getPaginationConfig(),
      ...this.getCustomConfig(),
      ...this.getEffectConfig(),
    };

    return config;
  }

  getNavigationConfig() {
    // Simple presence check for the attribute
    if (this.hasAttribute('data-navigation')) {
      return {
        navigation: {
          nextEl: this.querySelector('.ui-carousel-next'),
          prevEl: this.querySelector('.ui-carousel-prev'),
          // These classes will be added automatically when buttons should be hidden/disabled
          disabledClass: 'swiper-button-disabled',
          hiddenClass: 'swiper-button-hidden',
        },
      };
    }
    return {};
  }

  getPaginationConfig() {
    const paginationType = this.dataset.pagination;

    if (!paginationType) return {};

    if (!this.validPaginationTypes.includes(paginationType)) {
      console.warn(
        `Invalid pagination type "${paginationType}". Using default "bullets" type. ` +
          `Valid types are: ${this.validPaginationTypes.join(', ')}`,
      );
      return {
        pagination: {
          el: this.querySelector('.swiper-pagination'),
          clickable: true,
          type: 'bullets',
        },
      };
    }

    return {
      pagination: {
        el: this.querySelector('.swiper-pagination'),
        clickable: true,
        type: paginationType,
      },
    };
  }

  getEffectConfig() {
    const effect = this.dataset.effect;
    if (!effect) return {};

    if (!this.validEffects.includes(effect)) {
      console.warn(
        `Invalid effect type "${effect}". Using default slide effect. ` +
          `Valid effects are: ${this.validEffects.join(', ')}`,
      );
      return {};
    }

    // Basic effect config
    const config = {
      effect: effect,
    };

    // Add effect-specific options
    if (effect === 'fade') {
      config.fadeEffect = {
        crossFade: true,
      };
    } else if (effect === 'cube') {
      config.cubeEffect = {
        shadow: true,
        slideShadows: true,
        shadowOffset: 20,
        shadowScale: 0.94,
      };
    } else if (effect === 'coverflow') {
      config.coverflowEffect = {
        rotate: 50,
        stretch: 0,
        depth: 100,
        modifier: 1,
        slideShadows: true,
      };
    } else if (effect === 'flip') {
      config.flipEffect = {
        slideShadows: true,
        limitRotation: true,
      };
    }

    return config;
  }

  getCustomConfig() {
    // Method to be overridden by child classes for custom configuration
    return {};
  }

  initializeSwiper(config) {
    this.swiper = new Swiper(this, config);
  }

  disconnectedCallback() {
    if (this.swiper) {
      this.swiper.destroy();
      this.swiper = null;
    }
  }
}

customElements.define('ui-carousel', UICarousel);

class ReviewMulticolumnCarousel extends UICarousel {
  getCustomConfig() {
    return {
      slidesPerView: 1,
      loop: true,
      pagination: {
        el: '.swiper-pagination',
        type: 'bullets',
      },
      breakpoints: {
        1024: {
          slidesPerView: 3,
        },
      },
      observer: true,
      observeParents: true,
    };
  }
}

window.customElements.define('review-multicolumn-carousel', ReviewMulticolumnCarousel);

class AnnouncementCarousel extends UICarousel {
  getCustomConfig() {
    return {
      loop: this.dataset.loop === 'true',
      autoplay: this.dataset.autoplay
        ? {
            delay: parseInt(this.dataset.autoplay),
            disableOnInteraction: false,
          }
        : false,
      slidesPerView: parseInt(this.dataset.slidesPerView) || 1,
      centeredSlides: this.dataset.centeredSlides === 'true',
      spaceBetween: 0,
    };
  }
}

window.customElements.define('announcement-carousel', AnnouncementCarousel);

class ThumbnailGallery extends HTMLElement {
  constructor() {
    super();
    this.mainSwiper = null;
    this.thumbsSwiper = null;
  }

  connectedCallback() {
    // Get references to the swiper containers
    const thumbsContainer = this.querySelector('[data-js="thumbs"]');
    const mainContainer = this.querySelector('[data-js="main-gallery"]');

    if (!thumbsContainer || !mainContainer) {
      console.error('Thumbnail gallery requires both main gallery and thumbs elements');
      return;
    }

    // Initialize thumbnails swiper first (just like in the example)
    this.thumbsSwiper = new Swiper(thumbsContainer, {
      spaceBetween: 8,
      slidesPerView: 4,
      freeMode: true,
      watchSlidesProgress: true,
      threshold: 10,
      breakpoints: {
        320: {
          slidesPerView: 4,
        },
        768: {
          slidesPerView: 5,
        },
        1024: {
          slidesPerView: 6,
        },
      },
    });

    // Then initialize main swiper with thumbs
    this.mainSwiper = new Swiper(mainContainer, {
      spaceBetween: 8,
      navigation: {
        nextEl: '.swiper-button-next',
        prevEl: '.swiper-button-prev',
      },
      pagination: {
        el: '.swiper-pagination',
        type: 'bullets',
        clickable: true,
      },
      thumbs: {
        swiper: this.thumbsSwiper,
      },
    });
  }

  disconnectedCallback() {
    if (this.mainSwiper) {
      this.mainSwiper.destroy();
      this.mainSwiper = null;
    }

    if (this.thumbsSwiper) {
      this.thumbsSwiper.destroy();
      this.thumbsSwiper = null;
    }
  }
}

customElements.define('thumbnail-gallery', ThumbnailGallery);

class ReviewsCarousel extends UICarousel {
  getCustomConfig() {
    return {
      slidesPerView: 1.25,
      spaceBetween: 13,
      breakpoints: {
        768: {
          slidesPerView: 2,
          spaceBetween: 32,
        },
      },
    };
  }
}

customElements.define('reviews-carousel', ReviewsCarousel);

class ReviewsCarouselText extends UICarousel {
  getCustomConfig() {
    return {
      slidesPerView: 1.1,
      spaceBetween: 16,
      centeredSlides: this.dataset.centeredSlides === 'true',
      loop: true,
      breakpoints: {
        768: {
          slidesPerView: 2.1,
        },
        1024: {
          slidesPerView: 3.1,
        },
        1280: {
          slidesPerView: this.dataset.slidesPerView || 3.6,
        },
      },
    };
  }
}

customElements.define('reviews-carousel-text', ReviewsCarouselText);

class ModalVideoTrigger extends HTMLElement {
  constructor() {
    super();

    this.template = this.querySelector('template');
    this.videoId = this.getAttribute('data-video-id');

    if (!this.template) return;

    // Make the entire element clickable
    this.addEventListener('click', this.handleClick.bind(this));
    this.addEventListener('keydown', this.handleKeydown.bind(this));
  }

  handleKeydown(e) {
    // Handle Enter and Space key for accessibility
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.handleClick();
    }
  }

  handleClick() {
    // Create or get existing modal
    let modal = document.querySelector('#video-modal');
    if (!modal) {
      modal = this.createModal();
      document.body.appendChild(modal);
    }

    // Load video content into modal
    this.loadVideoIntoModal(modal);

    // Show modal with animation
    this.showModal(modal);
  }

  createModal() {
    const modal = document.createElement('div');
    modal.id = 'video-modal';
    modal.className = 'video-modal';
    modal.setAttribute('aria-label', 'Video player');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    modal.innerHTML = `
      <div class="video-modal__backdrop"></div>
      <div class="video-modal__content">
        <button class="video-modal__close" aria-label="Close video">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M15 5L5 15M5 5L15 15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
        <div class="video-modal__media"></div>
      </div>
    `;

    // Add close functionality
    const closeBtn = modal.querySelector('.video-modal__close');
    const backdrop = modal.querySelector('.video-modal__backdrop');

    closeBtn.addEventListener('click', () => this.closeModal(modal));
    backdrop.addEventListener('click', () => this.closeModal(modal));

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('video-modal--active')) {
        this.closeModal(modal);
      }
    });

    return modal;
  }

  showModal(modal) {
    // Disable page scroll
    document.body.style.overflow = 'hidden';

    // Show modal
    modal.style.display = 'flex';

    // Force reflow before adding active class for animation
    modal.offsetHeight;

    // Add active class for animation
    modal.classList.add('video-modal--active');

    // Focus trap
    this.trapFocus(modal);
  }

  closeModal(modal) {
    // Remove active class for fade out animation
    modal.classList.remove('video-modal--active');

    // Wait for animation to complete before hiding
    setTimeout(() => {
      modal.style.display = 'none';

      // Re-enable page scroll
      document.body.style.overflow = '';

      // Pause and remove media
      const mediaContainer = modal.querySelector('.video-modal__media');
      const videoElement = mediaContainer.querySelector('video, iframe');

      if (videoElement) {
        if (videoElement.nodeName === 'VIDEO') {
          videoElement.pause();
          videoElement.currentTime = 0;
        }
        mediaContainer.innerHTML = '';
      }

      // Return focus to the trigger element
      this.focus();
    }, 300); // Match CSS transition duration
  }

  loadVideoIntoModal(modal) {
    const mediaContainer = modal.querySelector('.video-modal__media');

    // Clear existing content
    mediaContainer.innerHTML = '';

    // Pause all other media
    this.pauseAllMedia();

    // Clone and append video content
    const videoContent = this.template.content.cloneNode(true);
    const videoElement = videoContent.querySelector('video, iframe');

    if (videoElement) {
      mediaContainer.appendChild(videoElement);

      // Auto-focus and play after a brief delay for smooth animation
      setTimeout(() => {
        if (videoElement.nodeName === 'VIDEO') {
          videoElement.play().catch((e) => {
            console.log('Autoplay prevented:', e);
          });
        }
      }, 400);
    }
  }

  trapFocus(modal) {
    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement.focus();

    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    });
  }

  pauseAllMedia() {
    // Pause all videos on the page
    document.querySelectorAll('video').forEach((video) => {
      video.pause();
    });

    // Stop YouTube/Vimeo if needed
    document.querySelectorAll('iframe[src*="youtube"], iframe[src*="vimeo"]').forEach((iframe) => {
      const src = iframe.src;
      if (src.includes('autoplay=1')) {
        iframe.src = src.replace('autoplay=1', 'autoplay=0');
        iframe.src = src;
      }
    });
  }
}

// Register the custom element
customElements.define('modal-video-trigger', ModalVideoTrigger);

// class ShoeTypeCartUpdater extends HTMLElement {
//   constructor() {
//     super();
//     this.handleShoeTypeChange = this.handleShoeTypeChange.bind(this);
//   }

//   connectedCallback() {
//     this.setupEventListeners();
//   }

//   disconnectedCallback() {
//     this.removeEventListeners();
//   }

//   setupEventListeners() {
//     const selects = this.querySelectorAll('.shoe-type-dropdown select');
//     selects.forEach((select) => {
//       select.addEventListener('change', this.handleShoeTypeChange);
//     });
//     console.log(`ShoeTypeCartUpdater: Setup ${selects.length} listeners`);
//   }

//   removeEventListeners() {
//     const selects = this.querySelectorAll('.shoe-type-dropdown select');
//     selects.forEach((select) => {
//       select.removeEventListener('change', this.handleShoeTypeChange);
//     });
//   }

//   async handleShoeTypeChange(event) {
//     const selectElement = event.target;
//     const pairNumber = parseInt(selectElement.dataset.pair);
//     const selectedValue = selectElement.value;

//     console.log(`Shoe type changed: Pair ${pairNumber} = "${selectedValue}"`);

//     try {
//       // Get current cart to access items
//       const cartResponse = await fetch('/cart.js');
//       const currentCart = await cartResponse.json();

//       // Update cart attributes first
//       const attributesPayload = {
//         attributes: this.buildCartAttributes(currentCart, pairNumber, selectedValue),
//       };

//       console.log('Updating attributes:', attributesPayload);

//       // First update cart attributes
//       const attributesResponse = await fetch('/cart/update.js', {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(attributesPayload),
//       });

//       if (!attributesResponse.ok) {
//         throw new Error(`Failed to update attributes: ${attributesResponse.status}`);
//       }

//       // Then update each line item's properties individually using /cart/change.js
//       await this.updateLineItemProperties(currentCart, pairNumber, selectedValue);

//       console.log('Cart updated successfully');
//       this.showUpdateFeedback(selectElement, 'success');
//     } catch (error) {
//       console.error('Error updating cart:', error);
//       this.showUpdateFeedback(selectElement, 'error');
//     }
//   }

//   buildCartAttributes(currentCart, pairNumber, selectedValue) {
//     // Start with existing attributes
//     const attributes = { ...currentCart.attributes };

//     // Simple logic: always update the specific attribute for the pair number
//     if (pairNumber === 1) {
//       attributes['Shoe Type'] = selectedValue;
//     } else {
//       attributes[`Shoe Type ${pairNumber}`] = selectedValue;
//     }

//     return attributes;
//   }

//   async updateLineItemProperties(currentCart, pairNumber, selectedValue) {
//     // For each line item with properties, we need to use cart/change.js
//     for (const item of currentCart.items) {
//       if (item.properties && Object.keys(item.properties).length > 0) {
//         // Build new properties for this item
//         const newProperties = { ...item.properties };

//         // Update the specific property for the pair number
//         if (pairNumber === 1) {
//           newProperties['Shoe Type'] = selectedValue;
//         } else {
//           newProperties[`Shoe Type ${pairNumber}`] = selectedValue;
//         }

//         console.log(`Updating line item ${item.key} with properties:`, newProperties);

//         // Use cart/change.js with the line item key (must be string)
//         const changePayload = {
//           id: String(item.key), // Ensure it's a string
//           quantity: item.quantity,
//           properties: newProperties,
//         };

//         const response = await fetch('/cart/change.js', {
//           method: 'POST',
//           headers: {
//             'Content-Type': 'application/json',
//           },
//           body: JSON.stringify(changePayload),
//         });

//         if (!response.ok) {
//           console.error(`Failed to update line item ${item.key}:`, response.status);
//           const errorText = await response.text();
//           console.error('Error response:', errorText);
//         } else {
//           const updatedCart = await response.json();
//           console.log(`Successfully updated line item ${item.key}`);
//           console.log('Line item properties updated successfully');
//         }
//       }
//     }
//   }

//   showUpdateFeedback(selectElement, type) {
//     const dropdown = selectElement.closest('.shoe-type-dropdown');
//     if (!dropdown) return;

//     const originalBg = dropdown.style.backgroundColor;
//     const color = type === 'success' ? '#dcfce7' : '#fef2f2';
//     const duration = type === 'success' ? 1000 : 2000;

//     dropdown.style.backgroundColor = color;
//     dropdown.style.transition = 'background-color 0.3s ease';

//     setTimeout(() => {
//       dropdown.style.backgroundColor = originalBg;
//       setTimeout(() => (dropdown.style.transition = ''), 300);
//     }, duration);
//   }

//   // Public method for debugging
//   refresh() {
//     this.removeEventListeners();
//     this.setupEventListeners();
//   }
// }

// // Register the custom element
// if (!customElements.get('shoe-type-cart-updater')) {
//   customElements.define('shoe-type-cart-updater', ShoeTypeCartUpdater);
//   console.log('ShoeTypeCartUpdater registered');
// }

class ShoeTypeCartUpdater extends HTMLElement {
  constructor() {
    super();
    this.handleShoeTypeChange = this.handleShoeTypeChange.bind(this);
  }

  connectedCallback() {
    this.setupEventListeners();
  }

  disconnectedCallback() {
    this.removeEventListeners();
  }

  setupEventListeners() {
    const selects = this.querySelectorAll('.shoe-type-dropdown select');
    selects.forEach((select) => {
      select.addEventListener('change', this.handleShoeTypeChange);
    });
    console.log(`ShoeTypeCartUpdater: Setup ${selects.length} listeners`);
  }

  removeEventListeners() {
    const selects = this.querySelectorAll('.shoe-type-dropdown select');
    selects.forEach((select) => {
      select.removeEventListener('change', this.handleShoeTypeChange);
    });
  }

  // Add method to disable variant selectors in CartItems
  disableVariantSelectors() {
    const cartItems = document.querySelector('cart-items');
    if (cartItems) {
      // Disable all variant radio buttons
      const variantRadios = cartItems.querySelectorAll('input[type="radio"][data-variant-id]');
      variantRadios.forEach((radio) => {
        radio.disabled = true;
      });

      // Add loading indicator to variant section
      const variantFieldsets = cartItems.querySelectorAll('fieldset[id*="CartItemVariantSelect"]');
      variantFieldsets.forEach((fieldset) => {
        if (!fieldset.querySelector('.variant-loading-indicator')) {
          const loadingIndicator = document.createElement('div');
          loadingIndicator.className =
            'variant-loading-indicator absolute inset-0 white bg-opacity-90 flex items-center justify-center z-10 rounded';
          loadingIndicator.innerHTML = `
            <div class="flex items-center text-sm text-gray-500">
              <svg class="animate-spin h-4 w-4 mr-2 text-blue-fitness" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span class="sr-only">Updating cart...</span>
            </div>
          `;
          fieldset.style.position = 'relative';
          fieldset.appendChild(loadingIndicator);
        }
      });

      console.log('Disabled variant selectors during shoe type update');
    }
  }

  // Add method to enable variant selectors
  enableVariantSelectors() {
    const cartItems = document.querySelector('cart-items');
    if (cartItems) {
      // Enable all variant radio buttons
      const variantRadios = cartItems.querySelectorAll('input[type="radio"][data-variant-id]');
      variantRadios.forEach((radio) => {
        radio.disabled = false;
      });

      // Remove loading indicators
      const loadingIndicators = cartItems.querySelectorAll('.variant-loading-indicator');
      loadingIndicators.forEach((indicator) => {
        indicator.remove();
      });

      console.log('Re-enabled variant selectors after shoe type update');
    }
  }

  // Add method to disable shoe type selectors
  disableShoeTypeSelectors() {
    // Disable all selects within this component
    const selects = this.querySelectorAll('.shoe-type-dropdown select');
    selects.forEach((select) => {
      select.disabled = true;
    });

    // Add loading indicator
    // if (!this.querySelector('.shoe-type-loading')) {
    //   const loadingIndicator = document.createElement('div');
    //   loadingIndicator.className =
    //     'shoe-type-loading  bg-transparent bg-opacity-90 flex items-center justify-center z-10 rounded-lg mt-4';
    //   loadingIndicator.innerHTML = `
    //     <div class="flex items-center text-sm text-gray-500">
    //       <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
    //         <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
    //         <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    //       </svg>
    //       Updating cart...
    //     </div>
    //   `;
    //   this.style.position = 'relative';
    //   this.appendChild(loadingIndicator);
    // }

    console.log('Disabled shoe type selectors during update');
  }

  // Add method to enable shoe type selectors
  enableShoeTypeSelectors() {
    // Enable all selects within this component
    const selects = this.querySelectorAll('.shoe-type-dropdown select');
    selects.forEach((select) => {
      select.disabled = false;
    });

    // Remove loading indicator
    const loadingIndicator = this.querySelector('.shoe-type-loading');
    if (loadingIndicator) {
      loadingIndicator.remove();
    }

    console.log('Re-enabled shoe type selectors after update');
  }

  async handleShoeTypeChange(event) {
    const selectElement = event.target;
    const pairNumber = parseInt(selectElement.dataset.pair);
    const selectedValue = selectElement.value;

    console.log(`Shoe type changed: Pair ${pairNumber} = "${selectedValue}"`);

    try {
      // ADD THIS: Disable both shoe type and variant selectors
      this.disableShoeTypeSelectors();
      this.disableVariantSelectors();

      // Get current cart to access items
      const cartResponse = await fetch('/cart.js');
      const currentCart = await cartResponse.json();

      // Update cart attributes first
      const attributesPayload = {
        attributes: this.buildCartAttributes(currentCart, pairNumber, selectedValue),
      };

      console.log('Updating attributes:', attributesPayload);

      // First update cart attributes
      const attributesResponse = await fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attributesPayload),
      });

      if (!attributesResponse.ok) {
        throw new Error(`Failed to update attributes: ${attributesResponse.status}`);
      }

      // Then update each line item's properties individually using /cart/change.js
      await this.updateLineItemProperties(currentCart, pairNumber, selectedValue);

      console.log('Cart updated successfully');
      this.showUpdateFeedback(selectElement, 'success');
    } catch (error) {
      console.error('Error updating cart:', error);
      this.showUpdateFeedback(selectElement, 'error');
    } finally {
      // ADD THIS: Always re-enable both shoe type and variant selectors
      this.enableShoeTypeSelectors();
      this.enableVariantSelectors();
    }
  }

  buildCartAttributes(currentCart, pairNumber, selectedValue) {
    // Start with existing attributes
    const attributes = { ...currentCart.attributes };

    // Simple logic: always update the specific attribute for the pair number
    if (pairNumber === 1) {
      attributes['Shoe Type'] = selectedValue;
    } else {
      attributes[`Shoe Type ${pairNumber}`] = selectedValue;
    }

    return attributes;
  }

  async updateLineItemProperties(currentCart, pairNumber, selectedValue) {
    // For each line item with properties, we need to use cart/change.js
    for (const item of currentCart.items) {
      if (item.properties && Object.keys(item.properties).length > 0) {
        // Build new properties for this item
        const newProperties = { ...item.properties };

        // Update the specific property for the pair number
        if (pairNumber === 1) {
          newProperties['Shoe Type'] = selectedValue;
        } else {
          newProperties[`Shoe Type ${pairNumber}`] = selectedValue;
        }

        console.log(`Updating line item ${item.key} with properties:`, newProperties);

        // Use cart/change.js with the line item key (must be string)
        const changePayload = {
          id: String(item.key), // Ensure it's a string
          quantity: item.quantity,
          properties: newProperties,
        };

        const response = await fetch('/cart/change.js', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(changePayload),
        });

        if (!response.ok) {
          console.error(`Failed to update line item ${item.key}:`, response.status);
          const errorText = await response.text();
          console.error('Error response:', errorText);
        } else {
          const updatedCart = await response.json();
          console.log(`Successfully updated line item ${item.key}`);
          console.log('Line item properties updated successfully');
        }
      }
    }
  }

  showUpdateFeedback(selectElement, type) {
    const dropdown = selectElement.closest('.shoe-type-dropdown');
    if (!dropdown) return;

    const originalBg = dropdown.style.backgroundColor;
    const color = type === 'success' ? '#dcfce7' : '#fef2f2';
    const duration = type === 'success' ? 1000 : 2000;

    dropdown.style.backgroundColor = color;
    dropdown.style.transition = 'background-color 0.3s ease';

    setTimeout(() => {
      dropdown.style.backgroundColor = originalBg;
      setTimeout(() => (dropdown.style.transition = ''), 300);
    }, duration);
  }

  // Public method for debugging
  refresh() {
    this.removeEventListeners();
    this.setupEventListeners();
  }
}

// Register the custom element
if (!customElements.get('shoe-type-cart-updater')) {
  customElements.define('shoe-type-cart-updater', ShoeTypeCartUpdater);
  console.log('ShoeTypeCartUpdater registered');
}

/**
 * <pdp-customizations>
 *
 * This custom element displays the user's quiz-based customizations on the product page.
 *
 * Data priority:
 *   1. Uses quiz data from localStorage (if available and recent).
 *   2. Falls back to customer metafields if no quiz data is found.
 *   3. Shows a fallback message if neither is available.
 *
 * Listens for 'quiz-data-found' events from the <get-quiz-data-from-url-params> component
 * to update its display when quiz data is parsed from the URL.
 *
 * Usage: <pdp-customizations></pdp-customizations>
 */

class PdpCustomizations extends HTMLElement {
  connectedCallback() {
    // Listen for quiz data events from URL parser component
    document.addEventListener('quiz-data-found', this.handleQuizDataFound.bind(this));

    this.loadCustomizations();
  }

  handleQuizDataFound(event) {
    const { data } = event.detail;
    console.log('Quiz data found from URL parser:', data);

    // Use the URL data directly (it's already stored in localStorage by the URL parser)
    this.populateFromQuizData(data);

    // Hide the fallback message if it's showing
    const fallbackMessage = this.querySelector('.no-customizations-message');
    if (fallbackMessage) {
      fallbackMessage.classList.add('hidden');
    }

    // Show any hidden list items that now have data
    const fields = this.querySelectorAll('[data-field]');
    fields.forEach((dd) => {
      const listItem = dd.closest('li');
      if (listItem && dd.textContent !== '_____') {
        listItem.style.display = 'block';
      }
    });
  }

  loadCustomizations() {
    // Priority 1: Check localStorage for quiz_data
    const quizData = this.getQuizDataFromLocalStorage();

    if (quizData && Object.keys(quizData).length > 0) {
      console.log('Using quiz data from localStorage:', quizData);
      this.populateFromQuizData(quizData);
      return;
    }

    // Priority 2: Check customer metafields
    console.log('No localStorage quiz data, checking customer metafields...');
    const hasMetafieldData = this.populateFromMetafields();

    if (hasMetafieldData) {
      console.log('Using customer metafield data');
      return;
    }

    // Priority 3: Show fallback message
    console.log('No customization data available, showing fallback message');
    this.showFallbackMessage();
  }

  getQuizDataFromLocalStorage() {
    try {
      const storedData = localStorage.getItem('quiz_data');
      return storedData ? JSON.parse(storedData) : null;
    } catch (error) {
      console.error('Error reading quiz_data from localStorage:', error);
      return null;
    }
  }

  populateFromQuizData(quizData) {
    const fields = this.querySelectorAll('[data-field]');
    let hasAnyData = false;

    fields.forEach((dd) => {
      const fieldName = dd.dataset.field;
      const value = quizData[fieldName];

      if (value && value.trim() !== '' && value !== '_____') {
        dd.textContent = value;
        hasAnyData = true;
      }
    });

    this.toggleEditNote(hasAnyData);

    return hasAnyData;
  }

  populateFromMetafields() {
    const fields = this.querySelectorAll('[data-field]');
    let hasAnyData = false;

    fields.forEach((dd) => {
      const metafieldValue = dd.dataset.metafield;

      if (metafieldValue && metafieldValue.trim() !== '' && metafieldValue !== '_____') {
        dd.textContent = metafieldValue;
        hasAnyData = true;
      }
    });

    this.toggleEditNote(hasAnyData);

    return hasAnyData;
  }

  showFallbackMessage() {
    // Hide all placeholder values
    const fields = this.querySelectorAll('[data-field]');
    fields.forEach((dd) => {
      const listItem = dd.closest('li');
      if (listItem) {
        listItem.style.display = 'none';
      }
    });

    this.toggleEditNote(false);

    // Show fallback message
    const fallbackMessage = this.querySelector('.no-customizations-message');
    if (fallbackMessage) {
      fallbackMessage.classList.remove('hidden');
    }
  }

  toggleEditNote(show) {
    const editNote = this.querySelector('.pdp-customizations-note');
    if (editNote) {
      if (show) {
        editNote.classList.remove('hidden');
      } else {
        editNote.classList.add('hidden');
      }
    }
  }
}

customElements.define('pdp-customizations', PdpCustomizations);

// https://www.stridesoles.com/pages/your-fit?quiz_complete=true&variant=40646980370496&checkout[email]=andrewhkim01%40gmail.com&checkout[shipping_address][first_name]=Andrew&Reason=Improving%20Posture&Arch=Normal%20Arch&Pain%20Frequency=All%20the%20time&Condition=Arthritis&Pain%20Region%20(R)=Inside%20Ankle%2C%20Back%20of%20Ankle%20(Achilles%20Tendon)%2C%20Outer%20Ankle&Pain%20Region%20(L)=Top%20of%20Foot%2C%20Big%20Toe&Size=Mens%2023&Shoe%20Type=Running%20Shoes&Additional%20Info=Lorem%20ipsum%20dolor%20sit%20amet%2C%20consectetur%20adipiscing%20elit%2C%20sed%20do%20eiusmod%20tempor%20incididunt%20ut%20labore%20et%20dolore%20magna%20aliqua.

class GetQuizDataFromUrlParams extends HTMLElement {
  constructor() {
    super();
    this.config = {
      quizDataKey: 'quiz_data',

      // What fields to include from url params
      includedParams: [
        'Reason',
        'Arch',
        'Pain Frequency',
        'Condition',
        'Pain Region (L)',
        'Pain Region (R)',
        'Size',
        'Shoe Type',
        'Additional Info',
      ],
    };
  }

  connectedCallback() {
    this.parseAndStoreUrlData();
  }

  parseAndStoreUrlData() {
    const urlData = this.parseUrlParameters();

    if (urlData && Object.keys(urlData).length > 0) {
      console.log('Quiz data found in URL parameters:', urlData);

      // Store in localStorage
      this.storeQuizData(urlData);

      // Dispatch custom event so other components can react
      this.dispatchDataFoundEvent(urlData);
    } else {
      console.log('No quiz data found in URL parameters');
      this.dispatchNoDataEvent();
    }
  }

  parseUrlParameters() {
    // Handle malformed URLs with multiple ? characters
    let searchString = window.location.search;

    if (searchString.includes('?')) {
      const parts = window.location.href.split('?');
      if (parts.length > 2) {
        searchString = '?' + parts.slice(1).join('&');
        console.log('Fixed malformed URL search string:', searchString);
      }
    }

    const params = new URLSearchParams(searchString);
    const data = {};

    for (let [key, value] of params.entries()) {
      if (this.isValidQuizParameter(key)) {
        const decodedValue = decodeURIComponent(value);

        // Skip empty values and placeholder values
        if (this.isValidValue(decodedValue)) {
          data[key] = decodedValue;
        }
      }
    }

    return data;
  }

  isValidQuizParameter(key) {
    // Only process parameters that are in our included list
    return this.config.includedParams.includes(key);
  }

  isValidValue(value) {
    if (!value || value.trim() === '') {
      return false;
    }

    // Skip placeholder values (underscores)
    if (/^_+(\s+_+)*$/.test(value.trim())) {
      return false;
    }

    return true;
  }

  storeQuizData(data) {
    try {
      localStorage.setItem(this.config.quizDataKey, JSON.stringify(data));
      console.log('Quiz data stored in localStorage:', data);
    } catch (error) {
      console.error('Failed to store quiz data:', error);
    }
  }

  dispatchDataFoundEvent(data) {
    const event = new CustomEvent('quiz-data-found', {
      detail: {
        data: data,
        source: 'url-params',
      },
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  dispatchNoDataEvent() {
    const event = new CustomEvent('quiz-data-not-found', {
      detail: {
        source: 'url-params',
      },
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  // Public methods for external access
  getStoredQuizData() {
    try {
      const data = localStorage.getItem(this.config.quizDataKey);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error retrieving stored quiz data:', error);
      return null;
    }
  }

  clearStoredData() {
    try {
      localStorage.removeItem(this.config.quizDataKey);
      console.log('Quiz data cleared from localStorage');
    } catch (error) {
      console.error('Failed to clear quiz data:', error);
    }
  }
}

customElements.define('get-quiz-data-from-url-params', GetQuizDataFromUrlParams);

// Arch height: {{ person|lookup:"Which type of arch best represents your feet?" }}
// Condition/s: {{ person.conditions_string|default:'' }}
// Left Pain Areas: {{ person|lookup:"Left"|default:'None' }}
// Right Pain Areas: {{ person|lookup:"Right"|default:'None' }}
// Shoe Size: {{ person.Gender|default:'' }} {{ person.Size|default:'' }}
// Desired shoe: {{ person|lookup:'shoe_type_string'|default:'' }}

// Reason: {{ person|lookup:"Reason"|default:'' }}

// Pain Frequency: {{ person|lookup:"How often do your feet hurt?"|default:'' }}

// Additional Info: {{ person.Open|default:'' }}

// https://www.stridesoles.com/products/buy-again?Reason={{ person|lookup:"Reason"|default:''|urlencode}}&Arch={{ person|lookup:"Which type of arch best represents your feet?"|urlencode}}&Pain%20Frequency={{ person|lookup:"How often do your feet hurt?"|default:''|urlencode}}&Condition={{ person.conditions_string|default:''|urlencode}}&Pain%20Region%20%28L%29={{ person|lookup:"Left"|default:'None'|urlencode}}&Pain%20Region%20%28R%29={{ person|lookup:"Right"|default:'None'|urlencode}}&Size={{ person.Gender|default:''|urlencode}}%20{{ person.Size|default:''|urlencode}}&Shoe%20Type={{ person|lookup:'shoe_type_string'|default:''|urlencode}}&Additional%20Info={{ person.Open|default:''|urlencode}}

// https://www.stridesoles.com/products/buy-again?Reason=Foot%20Pain&Arch=Flat%20Foot&Pain%20Frequency=All%20the%20time&Condition=Flat%20Feet&Pain%20Region%20%28L%29=Inside%20Ankle%2C%20%0AOuter%20Ankle%2C%20%0ABall%20of%20Foot%2C%20%0AMidfoot%2C%20%0AInside%20of%20Arch&Pain%20Region%20%28R%29=Inside%20Ankle%2C%20%0AOuter%20Ankle%2C%20%0ABall%20of%20Foot%2C%20%0AMidfoot%2C%20%0AInside%20of%20Arch&Size=Mens%209&Shoe%20Type=Sneakers%20%28Also%20known%20as%20%27Tennis%20Shoes%27%29&Additional%20Info=My%20feet%20are%20extremely%20flat%20-%20they%20have%20no%20arch%20at%20all.

// https://34uq0whtjn72a5sd-57840664640.shopifypreview.com/products/buy-again?view=buy-again&Reason=Foot%20Pain&Arch=Flat%20Foot&Pain%20Frequency=All%20the%20time&Condition=Flat%20Feet&Pain%20Region%20%28L%29=Inside%20Ankle%2C%20%0AOuter%20Ankle%2C%20%0ABall%20of%20Foot%2C%20%0AMidfoot%2C%20%0AInside%20of%20Arch&Pain%20Region%20%28R%29=Inside%20Ankle%2C%20%0AOuter%20Ankle%2C%20%0ABall%20of%20Foot%2C%20%0AMidfoot%2C%20%0AInside%20of%20Arch&Size=Mens%209&Shoe%20Type=Sneakers%20%28Also%20known%20as%20%27Tennis%20Shoes%27%29&Additional%20Info=My%20feet%20are%20extremely%20flat%20-%20they%20have%20no%20arch%20at%20all.

// https://34uq0whtjn72a5sd-57840664640.shopifypreview.com/products/buy-again?view=buy-again&Reason=Foot%20Pain&Arch=Flat%20Foot&Pain%20Frequency=All%20the%20time&Condition=Flat%20Feet&Pain%20Region%20%28L%29=Inside%20Ankle%2C%20%0AOuter%20Ankle%2C%20%0ABall%20of%20Foot%2C%20%0AMidfoot%2C%20%0AInside%20of%20Arch&Pain%20Region%20%28R%29=Inside%20Ankle%2C%20%0AOuter%20Ankle%2C%20%0ABall%20of%20Foot%2C%20%0AMidfoot%2C%20%0AInside%20of%20Arch&Size=Mens%209&Shoe%20Type=Sneakers%20%28Also%20known%20as%20%27Tennis%20Shoes%27%29&Additional%20Info=DONNA.
