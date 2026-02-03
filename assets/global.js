function handleize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // remove unwanted chars
    .trim()
    .replace(/[\s_-]+/g, '-') // collapse whitespace and underscores into hyphen
    .replace(/^-+|-+$/g, ''); // trim leading/trailing hyphens
}

function getFocusableElements(container) {
  return Array.from(
    container.querySelectorAll(
      "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe",
    ),
  );
}

class SectionId {
  static #separator = '__';

  // for a qualified section id (e.g. 'template--22224696705326__main'), return just the section id (e.g. 'template--22224696705326')
  static parseId(qualifiedSectionId) {
    return qualifiedSectionId.split(SectionId.#separator)[0];
  }

  // for a qualified section id (e.g. 'template--22224696705326__main'), return just the section name (e.g. 'main')
  static parseSectionName(qualifiedSectionId) {
    return qualifiedSectionId.split(SectionId.#separator)[1];
  }

  // for a section id (e.g. 'template--22224696705326') and a section name (e.g. 'recommended-products'), return a qualified section id (e.g. 'template--22224696705326__recommended-products')
  static getIdForSection(sectionId, sectionName) {
    return `${sectionId}${SectionId.#separator}${sectionName}`;
  }
}

class HTMLUpdateUtility {
  /**
   * Used to swap an HTML node with a new node.
   * The new node is inserted as a previous sibling to the old node, the old node is hidden, and then the old node is removed.
   *
   * The function currently uses a double buffer approach, but this should be replaced by a view transition once it is more widely supported https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API
   */
  static viewTransition(oldNode, newContent, preProcessCallbacks = [], postProcessCallbacks = []) {
    preProcessCallbacks?.forEach((callback) => callback(newContent));

    const newNodeWrapper = document.createElement('div');
    HTMLUpdateUtility.setInnerHTML(newNodeWrapper, newContent.outerHTML);
    const newNode = newNodeWrapper.firstChild;

    // dedupe IDs
    const uniqueKey = Date.now();
    oldNode.querySelectorAll('[id], [form]').forEach((element) => {
      element.id && (element.id = `${element.id}-${uniqueKey}`);
      element.form && element.setAttribute('form', `${element.form.getAttribute('id')}-${uniqueKey}`);
    });

    oldNode.parentNode.insertBefore(newNode, oldNode);
    oldNode.style.display = 'none';

    postProcessCallbacks?.forEach((callback) => callback(newNode));

    setTimeout(() => oldNode.remove(), 500);
  }

  // Sets inner HTML and reinjects the script tags to allow execution. By default, scripts are disabled when using element.innerHTML.
  static setInnerHTML(element, html) {
    element.innerHTML = html;
    element.querySelectorAll('script').forEach((oldScriptTag) => {
      const newScriptTag = document.createElement('script');
      Array.from(oldScriptTag.attributes).forEach((attribute) => {
        newScriptTag.setAttribute(attribute.name, attribute.value);
      });
      newScriptTag.appendChild(document.createTextNode(oldScriptTag.innerHTML));
      oldScriptTag.parentNode.replaceChild(newScriptTag, oldScriptTag);
    });
  }
}

document.querySelectorAll('[id^="Details-"] summary').forEach((summary) => {
  summary.setAttribute('role', 'button');
  summary.setAttribute('aria-expanded', summary.parentNode.hasAttribute('open'));

  if (summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
  });

  if (summary.closest('header-drawer, menu-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (event.target !== container && event.target !== last && event.target !== first) return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function () {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function (event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if ((event.target === container || event.target === first) && event.shiftKey) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();

  if (
    elementToFocus.tagName === 'INPUT' &&
    ['search', 'text', 'email', 'url'].includes(elementToFocus.type) &&
    elementToFocus.value
  ) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(':focus-visible');
} catch (e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = [
    'ARROWUP',
    'ARROWDOWN',
    'ARROWLEFT',
    'ARROWRIGHT',
    'TAB',
    'ENTER',
    'SPACE',
    'ESCAPE',
    'HOME',
    'END',
    'PAGEUP',
    'PAGEDOWN',
  ];
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if (navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener(
    'focus',
    () => {
      if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

      if (mouseClick) return;

      currentFocusedElement = document.activeElement;
      currentFocusedElement.classList.add('focused');
    },
    true,
  );
}

function pauseAllMedia() {
  document.querySelectorAll('.js-youtube').forEach((video) => {
    video.contentWindow.postMessage('{"event":"command","func":"' + 'pauseVideo' + '","args":""}', '*');
  });
  document.querySelectorAll('.js-vimeo').forEach((video) => {
    video.contentWindow.postMessage('{"method":"pause"}', '*');
  });
  document.querySelectorAll('video').forEach((video) => video.pause());
  document.querySelectorAll('product-model').forEach((model) => {
    if (model.modelViewerUI) model.modelViewerUI.pause();
  });
}

function removeTrapFocus(elementToFocus = null) {
  document.removeEventListener('focusin', trapFocusHandlers.focusin);
  document.removeEventListener('focusout', trapFocusHandlers.focusout);
  document.removeEventListener('keydown', trapFocusHandlers.keydown);

  if (elementToFocus) elementToFocus.focus();
}

function onKeyUpEscape(event) {
  if (event.code.toUpperCase() !== 'ESCAPE') return;

  const openDetailsElement = event.target.closest('details[open]');
  if (!openDetailsElement) return;

  const summaryElement = openDetailsElement.querySelector('summary');
  openDetailsElement.removeAttribute('open');
  summaryElement.setAttribute('aria-expanded', false);
  summaryElement.focus();
}

class QuantityInput extends HTMLElement {
  constructor() {
    super();
    this.input = this.querySelector('input');
    this.changeEvent = new Event('change', { bubbles: true });
    this.input.addEventListener('change', this.onInputChange.bind(this));
    this.querySelectorAll('button').forEach((button) =>
      button.addEventListener('click', this.onButtonClick.bind(this)),
    );
  }

  quantityUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.validateQtyRules();
    this.quantityUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.quantityUpdate, this.validateQtyRules.bind(this));
  }

  disconnectedCallback() {
    if (this.quantityUpdateUnsubscriber) {
      this.quantityUpdateUnsubscriber();
    }
  }

  onInputChange(event) {
    this.validateQtyRules();
  }

  onButtonClick(event) {
    event.preventDefault();
    const previousValue = this.input.value;

    if (event.target.name === 'plus') {
      if (parseInt(this.input.dataset.min) > parseInt(this.input.step) && this.input.value == 0) {
        this.input.value = this.input.dataset.min;
      } else {
        this.input.stepUp();
      }
    } else {
      this.input.stepDown();
    }

    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);

    if (this.input.dataset.min === previousValue && event.target.name === 'minus') {
      this.input.value = parseInt(this.input.min);
    }
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle('disabled', parseInt(value) <= parseInt(this.input.min));
    }
    if (this.input.max) {
      const max = parseInt(this.input.max);
      const buttonPlus = this.querySelector(".quantity__button[name='plus']");
      buttonPlus.classList.toggle('disabled', value >= max);
    }
  }
}

customElements.define('quantity-input', QuantityInput);

function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}

function throttle(fn, delay) {
  let lastCall = 0;
  return function (...args) {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return fn(...args);
  };
}

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: `application/${type}` },
  };
}

/*
 * Shopify Common JS
 *
 */
if (typeof window.Shopify == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function (fn, scope) {
  return function () {
    return fn.apply(scope, arguments);
  };
};

Shopify.setSelectorByValue = function (selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function (target, eventName, callback) {
  target.addEventListener
    ? target.addEventListener(eventName, callback, false)
    : target.attachEvent('on' + eventName, callback);
};

Shopify.postLink = function (path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement('form');
  form.setAttribute('method', method);
  form.setAttribute('action', path);

  for (var key in params) {
    var hiddenField = document.createElement('input');
    hiddenField.setAttribute('type', 'hidden');
    hiddenField.setAttribute('name', key);
    hiddenField.setAttribute('value', params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function (country_domid, province_domid, options) {
  this.countryEl = document.getElementById(country_domid);
  this.provinceEl = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler, this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function () {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function () {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function (e) {
    var opt = this.countryEl.options[this.countryEl.selectedIndex];
    var raw = opt.getAttribute('data-provinces');
    var provinces = JSON.parse(raw);

    this.clearOptions(this.provinceEl);
    if (provinces && provinces.length == 0) {
      this.provinceContainer.style.display = 'none';
    } else {
      for (var i = 0; i < provinces.length; i++) {
        var opt = document.createElement('option');
        opt.value = provinces[i][0];
        opt.innerHTML = provinces[i][1];
        this.provinceEl.appendChild(opt);
      }

      this.provinceContainer.style.display = '';
    }
  },

  clearOptions: function (selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function (selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  },
};

class MenuDrawer extends HTMLElement {
  constructor() {
    super();

    this.mainDetailsToggle = this.querySelector('details');

    this.addEventListener('keyup', this.onKeyUp.bind(this));
    this.addEventListener('focusout', this.onFocusOut.bind(this));
    this.bindEvents();
  }

  bindEvents() {
    this.querySelectorAll('summary').forEach((summary) =>
      summary.addEventListener('click', this.onSummaryClick.bind(this)),
    );
    this.querySelectorAll(
      'button:not(.localization-selector):not(.country-selector__close-button):not(.country-filter__reset-button)',
    ).forEach((button) => button.addEventListener('click', this.onCloseButtonClick.bind(this)));
  }

  onKeyUp(event) {
    if (event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if (!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle
      ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary'))
      : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest('.has-submenu');
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function addTrapFocus() {
      trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'));
      summaryElement.nextElementSibling.removeEventListener('transitionend', addTrapFocus);
    }

    if (detailsElement === this.mainDetailsToggle) {
      if (isOpen) event.preventDefault();
      isOpen ? this.closeMenuDrawer(event, summaryElement) : this.openMenuDrawer(summaryElement);

      if (window.matchMedia('(max-width: 990px)')) {
        document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      }
    } else {
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        summaryElement.setAttribute('aria-expanded', true);
        parentMenuElement && parentMenuElement.classList.add('submenu-open');
        !reducedMotion || reducedMotion.matches
          ? addTrapFocus()
          : summaryElement.nextElementSibling.addEventListener('transitionend', addTrapFocus);
      }, 100);
    }
  }

  openMenuDrawer(summaryElement) {
    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });
    summaryElement.setAttribute('aria-expanded', true);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus = false) {
    if (event === undefined) return;

    this.mainDetailsToggle.classList.remove('menu-opening');
    this.mainDetailsToggle.querySelectorAll('details').forEach((details) => {
      details.removeAttribute('open');
      details.classList.remove('menu-opening');
    });
    this.mainDetailsToggle.querySelectorAll('.submenu-open').forEach((submenu) => {
      submenu.classList.remove('submenu-open');
    });
    document.body.classList.remove(`overflow-hidden-${this.dataset.breakpoint}`);
    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);

    if (event instanceof KeyboardEvent) elementToFocus?.setAttribute('aria-expanded', false);
  }

  onFocusOut() {
    setTimeout(() => {
      if (this.mainDetailsToggle.hasAttribute('open') && !this.mainDetailsToggle.contains(document.activeElement))
        this.closeMenuDrawer();
    });
  }

  onCloseButtonClick(event) {
    const detailsElement = event.currentTarget.closest('details');
    this.closeSubmenu(detailsElement);
  }

  closeSubmenu(detailsElement) {
    const parentMenuElement = detailsElement.closest('.submenu-open');
    parentMenuElement && parentMenuElement.classList.remove('submenu-open');
    detailsElement.classList.remove('menu-opening');
    detailsElement.querySelector('summary').setAttribute('aria-expanded', false);
    removeTrapFocus(detailsElement.querySelector('summary'));
    this.closeAnimation(detailsElement);
  }

  closeAnimation(detailsElement) {
    let animationStart;

    const handleAnimation = (time) => {
      if (animationStart === undefined) {
        animationStart = time;
      }

      const elapsedTime = time - animationStart;

      if (elapsedTime < 400) {
        window.requestAnimationFrame(handleAnimation);
      } else {
        detailsElement.removeAttribute('open');
        if (detailsElement.closest('details[open]')) {
          trapFocus(detailsElement.closest('details[open]'), detailsElement.querySelector('summary'));
        }
      }
    };

    window.requestAnimationFrame(handleAnimation);
  }
}

customElements.define('menu-drawer', MenuDrawer);

class HeaderDrawer extends MenuDrawer {
  constructor() {
    super();
  }

  openMenuDrawer(summaryElement) {
    this.header = this.header || document.querySelector('.section-header');
    // this.borderOffset =
    //   this.borderOffset || this.closest('.header-wrapper').classList.contains('header-wrapper--border-bottom') ? 1 : 0;
    // document.documentElement.style.setProperty(
    //   '--header-bottom-position',
    //   `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`,
    // );
    this.header.classList.add('menu-open');

    setTimeout(() => {
      this.mainDetailsToggle.classList.add('menu-opening');
    });

    summaryElement.setAttribute('aria-expanded', true);
    window.addEventListener('resize', this.onResize);
    trapFocus(this.mainDetailsToggle, summaryElement);
    document.body.classList.add(`overflow-hidden-${this.dataset.breakpoint}`);
  }

  closeMenuDrawer(event, elementToFocus) {
    if (!elementToFocus) return;
    super.closeMenuDrawer(event, elementToFocus);
    this.header.classList.remove('menu-open');
    window.removeEventListener('resize', this.onResize);
  }

  onResize = () => {
    this.header &&
      document.documentElement.style.setProperty(
        '--header-bottom-position',
        `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`,
      );
    document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
  };
}

customElements.define('header-drawer', HeaderDrawer);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener('click', this.hide.bind(this, false));
    this.addEventListener('keyup', (event) => {
      if (event.code.toUpperCase() === 'ESCAPE') this.hide();
    });
    if (this.classList.contains('media-modal')) {
      this.addEventListener('pointerup', (event) => {
        if (event.pointerType === 'mouse' && !event.target.closest('deferred-media, product-model')) this.hide();
      });
    } else {
      this.addEventListener('click', (event) => {
        if (event.target === this) this.hide();
      });
    }
  }

  connectedCallback() {
    if (this.moved) return;
    this.moved = true;
    this.dataset.section = this.closest('.shopify-section').id.replace('shopify-section-', '');
    document.body.appendChild(this);
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');

    if (popup) popup.loadContent();

    trapFocus(this, this.querySelector('[role="dialog"]'));

    // Check if we should pause all media or play video
    if (this.hasAttribute('data-play-on-open')) {
      // Find the video element in the modal
      const videoElement = this.querySelector('video');

      // Play the video if it exists
      if (videoElement) {
        setTimeout(() => {
          videoElement.play().catch((error) => {
            console.log('Could not autoplay video:', error);
          });
        }, 300);
      }
    } else {
      // Default behavior
      window.pauseAllMedia();
    }
  }

  hide() {
    // Pause the video when closing the modal
    const videoElement = this.querySelector('video');
    if (videoElement) {
      videoElement.pause();
    }

    document.body.classList.remove('overflow-hidden');
    document.body.dispatchEvent(new CustomEvent('modalClosed'));
    this.removeAttribute('open');
    removeTrapFocus(this.openedBy);
    // window.pauseAllMedia();
  }
}
customElements.define('modal-dialog', ModalDialog);

class BulkModal extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);
      if (this.innerHTML.trim() === '') {
        const productUrl = this.dataset.url.split('?')[0];
        fetch(`${productUrl}?section_id=bulk-quick-order-list`)
          .then((response) => response.text())
          .then((responseText) => {
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            const sourceQty = html.querySelector('.quick-order-list-container').parentNode;
            this.innerHTML = sourceQty.innerHTML;
          })
          .catch((e) => {
            console.error(e);
          });
      }
    };

    new IntersectionObserver(handleIntersection.bind(this)).observe(
      document.querySelector(`#QuickBulk-${this.dataset.productId}-${this.dataset.sectionId}`),
    );
  }
}

customElements.define('bulk-modal', BulkModal);

class ModalOpener extends HTMLElement {
  constructor() {
    super();

    const button = this.querySelector('button');

    if (!button) return;
    button.addEventListener('click', () => {
      const modal = document.querySelector(this.getAttribute('data-modal'));
      if (modal) modal.show(button);
    });
  }
}
customElements.define('modal-opener', ModalOpener);

class DeferredMedia extends HTMLElement {
  constructor() {
    super();
    const poster = this.querySelector('[id^="Deferred-Poster-"]');
    if (!poster) return;
    poster.addEventListener('click', this.loadContent.bind(this));
  }

  loadContent(focus = true) {
    window.pauseAllMedia();
    if (!this.getAttribute('loaded')) {
      const content = document.createElement('div');
      content.appendChild(this.querySelector('template').content.firstElementChild.cloneNode(true));

      this.setAttribute('loaded', true);
      const deferredElement = this.appendChild(content.querySelector('video, model-viewer, iframe'));
      if (focus) deferredElement.focus();
      if (deferredElement.nodeName == 'VIDEO' && deferredElement.getAttribute('autoplay')) {
        // force autoplay for safari
        deferredElement.play();
      }

      // Workaround for safari iframe bug
      const formerStyle = deferredElement.getAttribute('style');
      deferredElement.setAttribute('style', 'display: block;');
      window.setTimeout(() => {
        deferredElement.setAttribute('style', formerStyle);
      }, 0);
    }
  }
}

customElements.define('deferred-media', DeferredMedia);

class SliderComponent extends HTMLElement {
  constructor() {
    super();
    this.slider = this.querySelector('[id^="Slider-"]');
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.enableSliderLooping = false;
    this.currentPageElement = this.querySelector('.slider-counter--current');
    this.pageTotalElement = this.querySelector('.slider-counter--total');
    this.prevButton = this.querySelector('button[name="previous"]');
    this.nextButton = this.querySelector('button[name="next"]');

    if (!this.slider || !this.nextButton) return;

    this.initPages();
    const resizeObserver = new ResizeObserver((entries) => this.initPages());
    resizeObserver.observe(this.slider);

    this.slider.addEventListener('scroll', this.update.bind(this));
    this.prevButton.addEventListener('click', this.onButtonClick.bind(this));
    this.nextButton.addEventListener('click', this.onButtonClick.bind(this));
  }

  initPages() {
    this.sliderItemsToShow = Array.from(this.sliderItems).filter((element) => element.clientWidth > 0);
    if (this.sliderItemsToShow.length < 2) return;
    this.sliderItemOffset = this.sliderItemsToShow[1].offsetLeft - this.sliderItemsToShow[0].offsetLeft;
    this.slidesPerPage = Math.floor(
      (this.slider.clientWidth - this.sliderItemsToShow[0].offsetLeft) / this.sliderItemOffset,
    );
    this.totalPages = this.sliderItemsToShow.length - this.slidesPerPage + 1;
    this.update();
  }

  resetPages() {
    this.sliderItems = this.querySelectorAll('[id^="Slide-"]');
    this.initPages();
  }

  update() {
    // Temporarily prevents unneeded updates resulting from variant changes
    // This should be refactored as part of https://github.com/Shopify/dawn/issues/2057
    if (!this.slider || !this.nextButton) return;

    const previousPage = this.currentPage;
    this.currentPage = Math.round(this.slider.scrollLeft / this.sliderItemOffset) + 1;

    if (this.currentPageElement && this.pageTotalElement) {
      this.currentPageElement.textContent = this.currentPage;
      this.pageTotalElement.textContent = this.totalPages;
    }

    if (this.currentPage != previousPage) {
      this.dispatchEvent(
        new CustomEvent('slideChanged', {
          detail: {
            currentPage: this.currentPage,
            currentElement: this.sliderItemsToShow[this.currentPage - 1],
          },
        }),
      );
    }

    if (this.enableSliderLooping) return;

    if (this.isSlideVisible(this.sliderItemsToShow[0]) && this.slider.scrollLeft === 0) {
      this.prevButton.setAttribute('disabled', 'disabled');
    } else {
      this.prevButton.removeAttribute('disabled');
    }

    if (this.isSlideVisible(this.sliderItemsToShow[this.sliderItemsToShow.length - 1])) {
      this.nextButton.setAttribute('disabled', 'disabled');
    } else {
      this.nextButton.removeAttribute('disabled');
    }
  }

  isSlideVisible(element, offset = 0) {
    const lastVisibleSlide = this.slider.clientWidth + this.slider.scrollLeft - offset;
    return element.offsetLeft + element.clientWidth <= lastVisibleSlide && element.offsetLeft >= this.slider.scrollLeft;
  }

  onButtonClick(event) {
    event.preventDefault();
    const step = event.currentTarget.dataset.step || 1;
    this.slideScrollPosition =
      event.currentTarget.name === 'next'
        ? this.slider.scrollLeft + step * this.sliderItemOffset
        : this.slider.scrollLeft - step * this.sliderItemOffset;
    this.setSlidePosition(this.slideScrollPosition);
  }

  setSlidePosition(position) {
    this.slider.scrollTo({
      left: position,
    });
  }
}

customElements.define('slider-component', SliderComponent);

class SlideshowComponent extends SliderComponent {
  constructor() {
    super();
    this.sliderControlWrapper = this.querySelector('.slider-buttons');
    this.enableSliderLooping = true;

    if (!this.sliderControlWrapper) return;

    this.sliderFirstItemNode = this.slider.querySelector('.slideshow__slide');
    if (this.sliderItemsToShow.length > 0) this.currentPage = 1;

    this.announcementBarSlider = this.querySelector('.announcement-bar-slider');
    // Value below should match --duration-announcement-bar CSS value
    this.announcerBarAnimationDelay = this.announcementBarSlider ? 250 : 0;

    this.sliderControlLinksArray = Array.from(this.sliderControlWrapper.querySelectorAll('.slider-counter__link'));
    this.sliderControlLinksArray.forEach((link) => link.addEventListener('click', this.linkToSlide.bind(this)));
    this.slider.addEventListener('scroll', this.setSlideVisibility.bind(this));
    this.setSlideVisibility();

    if (this.announcementBarSlider) {
      this.announcementBarArrowButtonWasClicked = false;

      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion.addEventListener('change', () => {
        if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
      });

      [this.prevButton, this.nextButton].forEach((button) => {
        button.addEventListener(
          'click',
          () => {
            this.announcementBarArrowButtonWasClicked = true;
          },
          { once: true },
        );
      });
    }

    if (this.slider.getAttribute('data-autoplay') === 'true') this.setAutoPlay();
  }

  setAutoPlay() {
    this.autoplaySpeed = this.slider.dataset.speed * 1000;
    this.addEventListener('mouseover', this.focusInHandling.bind(this));
    this.addEventListener('mouseleave', this.focusOutHandling.bind(this));
    this.addEventListener('focusin', this.focusInHandling.bind(this));
    this.addEventListener('focusout', this.focusOutHandling.bind(this));

    if (this.querySelector('.slideshow__autoplay')) {
      this.sliderAutoplayButton = this.querySelector('.slideshow__autoplay');
      this.sliderAutoplayButton.addEventListener('click', this.autoPlayToggle.bind(this));
      this.autoplayButtonIsSetToPlay = true;
      this.play();
    } else {
      this.reducedMotion.matches || this.announcementBarArrowButtonWasClicked ? this.pause() : this.play();
    }
  }

  onButtonClick(event) {
    super.onButtonClick(event);
    this.wasClicked = true;

    const isFirstSlide = this.currentPage === 1;
    const isLastSlide = this.currentPage === this.sliderItemsToShow.length;

    if (!isFirstSlide && !isLastSlide) {
      this.applyAnimationToAnnouncementBar(event.currentTarget.name);
      return;
    }

    if (isFirstSlide && event.currentTarget.name === 'previous') {
      this.slideScrollPosition =
        this.slider.scrollLeft + this.sliderFirstItemNode.clientWidth * this.sliderItemsToShow.length;
    } else if (isLastSlide && event.currentTarget.name === 'next') {
      this.slideScrollPosition = 0;
    }

    this.setSlidePosition(this.slideScrollPosition);

    this.applyAnimationToAnnouncementBar(event.currentTarget.name);
  }

  setSlidePosition(position) {
    if (this.setPositionTimeout) clearTimeout(this.setPositionTimeout);
    this.setPositionTimeout = setTimeout(() => {
      this.slider.scrollTo({
        left: position,
      });
    }, this.announcerBarAnimationDelay);
  }

  update() {
    super.update();
    this.sliderControlButtons = this.querySelectorAll('.slider-counter__link');
    this.prevButton.removeAttribute('disabled');

    if (!this.sliderControlButtons.length) return;

    this.sliderControlButtons.forEach((link) => {
      link.classList.remove('slider-counter__link--active');
      link.removeAttribute('aria-current');
    });
    this.sliderControlButtons[this.currentPage - 1].classList.add('slider-counter__link--active');
    this.sliderControlButtons[this.currentPage - 1].setAttribute('aria-current', true);
  }

  autoPlayToggle() {
    this.togglePlayButtonState(this.autoplayButtonIsSetToPlay);
    this.autoplayButtonIsSetToPlay ? this.pause() : this.play();
    this.autoplayButtonIsSetToPlay = !this.autoplayButtonIsSetToPlay;
  }

  focusOutHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
      if (!this.autoplayButtonIsSetToPlay || focusedOnAutoplayButton) return;
      this.play();
    } else if (!this.reducedMotion.matches && !this.announcementBarArrowButtonWasClicked) {
      this.play();
    }
  }

  focusInHandling(event) {
    if (this.sliderAutoplayButton) {
      const focusedOnAutoplayButton =
        event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
      if (focusedOnAutoplayButton && this.autoplayButtonIsSetToPlay) {
        this.play();
      } else if (this.autoplayButtonIsSetToPlay) {
        this.pause();
      }
    } else if (this.announcementBarSlider.contains(event.target)) {
      this.pause();
    }
  }

  play() {
    this.slider.setAttribute('aria-live', 'off');
    clearInterval(this.autoplay);
    this.autoplay = setInterval(this.autoRotateSlides.bind(this), this.autoplaySpeed);
  }

  pause() {
    this.slider.setAttribute('aria-live', 'polite');
    clearInterval(this.autoplay);
  }

  togglePlayButtonState(pauseAutoplay) {
    if (pauseAutoplay) {
      this.sliderAutoplayButton.classList.add('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.playSlideshow);
    } else {
      this.sliderAutoplayButton.classList.remove('slideshow__autoplay--paused');
      this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.pauseSlideshow);
    }
  }

  autoRotateSlides() {
    const slideScrollPosition =
      this.currentPage === this.sliderItems.length ? 0 : this.slider.scrollLeft + this.sliderItemOffset;

    this.setSlidePosition(slideScrollPosition);
    this.applyAnimationToAnnouncementBar();
  }

  setSlideVisibility(event) {
    this.sliderItemsToShow.forEach((item, index) => {
      const linkElements = item.querySelectorAll('a');
      if (index === this.currentPage - 1) {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.removeAttribute('tabindex');
          });
        item.setAttribute('aria-hidden', 'false');
        item.removeAttribute('tabindex');
      } else {
        if (linkElements.length)
          linkElements.forEach((button) => {
            button.setAttribute('tabindex', '-1');
          });
        item.setAttribute('aria-hidden', 'true');
        item.setAttribute('tabindex', '-1');
      }
    });
    this.wasClicked = false;
  }

  applyAnimationToAnnouncementBar(button = 'next') {
    if (!this.announcementBarSlider) return;

    const itemsCount = this.sliderItems.length;
    const increment = button === 'next' ? 1 : -1;

    const currentIndex = this.currentPage - 1;
    let nextIndex = (currentIndex + increment) % itemsCount;
    nextIndex = nextIndex === -1 ? itemsCount - 1 : nextIndex;

    const nextSlide = this.sliderItems[nextIndex];
    const currentSlide = this.sliderItems[currentIndex];

    const animationClassIn = 'announcement-bar-slider--fade-in';
    const animationClassOut = 'announcement-bar-slider--fade-out';

    const isFirstSlide = currentIndex === 0;
    const isLastSlide = currentIndex === itemsCount - 1;

    const shouldMoveNext = (button === 'next' && !isLastSlide) || (button === 'previous' && isFirstSlide);
    const direction = shouldMoveNext ? 'next' : 'previous';

    currentSlide.classList.add(`${animationClassOut}-${direction}`);
    nextSlide.classList.add(`${animationClassIn}-${direction}`);

    setTimeout(() => {
      currentSlide.classList.remove(`${animationClassOut}-${direction}`);
      nextSlide.classList.remove(`${animationClassIn}-${direction}`);
    }, this.announcerBarAnimationDelay * 2);
  }

  linkToSlide(event) {
    event.preventDefault();
    const slideScrollPosition =
      this.slider.scrollLeft +
      this.sliderFirstItemNode.clientWidth *
        (this.sliderControlLinksArray.indexOf(event.currentTarget) + 1 - this.currentPage);
    this.slider.scrollTo({
      left: slideScrollPosition,
    });
  }
}

customElements.define('slideshow-component', SlideshowComponent);

class VariantSelects extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    this.addEventListener('change', (event) => {
      const target = this.getInputForEventTarget(event.target);
      this.updateSelectionMetadata(event);

      // Get variant data
      let variantData = null;
      const selectedVariantJson = this.querySelector('[data-selected-variant]')?.textContent.trim();
      if (selectedVariantJson) {
        try {
          variantData = JSON.parse(selectedVariantJson);
        } catch (e) {
          console.error('Error parsing variant JSON:', e);
        }
      }

      // // Log everything in a single, structured object
      // console.log('Variant Selection Changed:', {
      //   selectedValue: target.value,
      //   optionValueId: target.dataset.optionValueId,
      //   selectedOptionValues: this.selectedOptionValues,
      //   variant: variantData
      //     ? {
      //         id: variantData.id,
      //         title: variantData.title,
      //         price: `$${(variantData.price / 100).toFixed(2)}`,
      //         options: variantData.options,
      //         available: variantData.available,
      //       }
      //     : 'No variant data available',
      // });

      publish(PUB_SUB_EVENTS.optionValueSelectionChange, {
        data: {
          event,
          target,
          selectedOptionValues: this.selectedOptionValues,
        },
      });
    });
  }

  updateSelectionMetadata({ target }) {
    const { value, tagName } = target;

    if (tagName === 'SELECT' && target.selectedOptions.length) {
      Array.from(target.options)
        .find((option) => option.getAttribute('selected'))
        .removeAttribute('selected');
      target.selectedOptions[0].setAttribute('selected', 'selected');
      const swatchValue = target.selectedOptions[0].dataset.optionSwatchValue;
      const selectedDropdownSwatchValue = target
        .closest('.product-form__input')
        .querySelector('[data-selected-value] > .swatch');
      if (!selectedDropdownSwatchValue) return;
      if (swatchValue) {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', swatchValue);
        selectedDropdownSwatchValue.classList.remove('swatch--unavailable');
      } else {
        selectedDropdownSwatchValue.style.setProperty('--swatch--background', 'unset');
        selectedDropdownSwatchValue.classList.add('swatch--unavailable');
      }
      selectedDropdownSwatchValue.style.setProperty(
        '--swatch-focal-point',
        target.selectedOptions[0].dataset.optionSwatchFocalPoint || 'unset',
      );
    } else if (tagName === 'INPUT' && target.type === 'radio') {
      const selectedSwatchValue = target.closest(`.product-form__input`).querySelector('[data-selected-value]');
      if (selectedSwatchValue) selectedSwatchValue.innerHTML = value;
    }
  }

  getInputForEventTarget(target) {
    return target.tagName === 'SELECT' ? target.selectedOptions[0] : target;
  }

  get selectedOptionValues() {
    return Array.from(this.querySelectorAll('select option[selected], fieldset input:checked')).map(
      ({ dataset }) => dataset.optionValueId,
    );
  }

  // Simple utility method to trigger logs on demand
  logCurrentSelection() {
    const selectedInputs = Array.from(this.querySelectorAll('select option[selected], fieldset input:checked'));
    const selectedVariantJson = this.querySelector('[data-selected-variant]')?.textContent.trim();
    let variantData = null;

    if (selectedVariantJson) {
      try {
        variantData = JSON.parse(selectedVariantJson);
      } catch (e) {
        console.error('Error parsing variant JSON');
      }
    }

    console.log('Current Variant Selection:', {
      inputs: selectedInputs.map((input) => ({
        name: input.name || 'unnamed',
        value: input.value,
        optionValueId: input.dataset.optionValueId,
      })),
      variant: variantData
        ? {
            id: variantData.id,
            title: variantData.title,
            price: `$${(variantData.price / 100).toFixed(2)}`,
            options: variantData.options,
            available: variantData.available,
          }
        : 'No variant data available',
    });
  }
}

customElements.define('variant-selects', VariantSelects);

class ProductRecommendations extends HTMLElement {
  observer = undefined;

  constructor() {
    super();
  }

  connectedCallback() {
    this.initializeRecommendations(this.dataset.productId);
  }

  initializeRecommendations(productId) {
    this.observer?.unobserve(this);
    this.observer = new IntersectionObserver(
      (entries, observer) => {
        if (!entries[0].isIntersecting) return;
        observer.unobserve(this);
        this.loadRecommendations(productId);
      },
      { rootMargin: '0px 0px 400px 0px' },
    );
    this.observer.observe(this);
  }

  loadRecommendations(productId) {
    fetch(`${this.dataset.url}&product_id=${productId}&section_id=${this.dataset.sectionId}`)
      .then((response) => response.text())
      .then((text) => {
        const html = document.createElement('div');
        html.innerHTML = text;
        const recommendations = html.querySelector('product-recommendations');

        if (recommendations?.innerHTML.trim().length) {
          this.innerHTML = recommendations.innerHTML;
        }

        if (!this.querySelector('slideshow-component') && this.classList.contains('complementary-products')) {
          this.remove();
        }

        if (html.querySelector('.grid__item')) {
          this.classList.add('product-recommendations--loaded');
        }
      })
      .catch((e) => {
        console.error(e);
      });
  }
}

customElements.define('product-recommendations', ProductRecommendations);

class AccountIcon extends HTMLElement {
  constructor() {
    super();

    this.icon = this.querySelector('.icon');
  }

  connectedCallback() {
    document.addEventListener('storefront:signincompleted', this.handleStorefrontSignInCompleted.bind(this));
  }

  handleStorefrontSignInCompleted(event) {
    if (event?.detail?.avatar) {
      this.icon?.replaceWith(event.detail.avatar.cloneNode());
    }
  }
}

customElements.define('account-icon', AccountIcon);

class BulkAdd extends HTMLElement {
  constructor() {
    super();
    this.queue = [];
    this.requestStarted = false;
    this.ids = [];
  }

  startQueue(id, quantity) {
    this.queue.push({ id, quantity });
    const interval = setInterval(() => {
      if (this.queue.length > 0) {
        if (!this.requestStarted) {
          this.sendRequest(this.queue);
        }
      } else {
        clearInterval(interval);
      }
    }, 250);
  }

  sendRequest(queue) {
    this.requestStarted = true;
    const items = {};
    queue.forEach((queueItem) => {
      items[parseInt(queueItem.id)] = queueItem.quantity;
    });
    this.queue = this.queue.filter((queueElement) => !queue.includes(queueElement));
    const quickBulkElement = this.closest('quick-order-list') || this.closest('quick-add-bulk');
    quickBulkElement.updateMultipleQty(items);
  }

  resetQuantityInput(id) {
    const input = this.querySelector(`#Quantity-${id}`);
    input.value = input.getAttribute('value');
    this.isEnterPressed = false;
  }

  setValidity(event, index, message) {
    event.target.setCustomValidity(message);
    event.target.reportValidity();
    this.resetQuantityInput(index);
    event.target.select();
  }

  validateQuantity(event) {
    const inputValue = parseInt(event.target.value);
    const index = event.target.dataset.index;

    if (inputValue < event.target.dataset.min) {
      this.setValidity(event, index, window.quickOrderListStrings.min_error.replace('[min]', event.target.dataset.min));
    } else if (inputValue > parseInt(event.target.max)) {
      this.setValidity(event, index, window.quickOrderListStrings.max_error.replace('[max]', event.target.max));
    } else if (inputValue % parseInt(event.target.step) != 0) {
      this.setValidity(event, index, window.quickOrderListStrings.step_error.replace('[step]', event.target.step));
    } else {
      event.target.setCustomValidity('');
      event.target.reportValidity();
      this.startQueue(index, inputValue);
    }
  }

  getSectionsUrl() {
    if (window.pageNumber) {
      return `${window.location.pathname}?page=${window.pageNumber}`;
    } else {
      return `${window.location.pathname}`;
    }
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }
}

if (!customElements.get('bulk-add')) {
  customElements.define('bulk-add', BulkAdd);
}

class UISlider extends HTMLElement {
  static get observedAttributes() {
    return ['direction', 'auto-height'];
  }

  constructor() {
    super();
    this.init = this.init.bind(this);
  }

  connectedCallback() {
    if (window.Swiper) {
      this.init();
    } else {
      window.addEventListener('swiperLoaded', this.init);
    }
  }

  init() {
    let userOptions = {};
    try {
      userOptions = this.dataset.options ? JSON.parse(this.dataset.options) : {};
    } catch (e) {
      console.error('Error parsing slider options:', e);
      console.log('Raw options:', this.dataset.options);
    }

    const direction = this.getAttribute('direction') || 'horizontal';
    const autoHeight = this.hasAttribute('auto-height');

    const options = {
      direction,
      autoHeight,
      loop: false,
      slidesPerView: 1,
      spaceBetween: 10,
      ...userOptions,

      navigation: userOptions.navigation
        ? {
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          }
        : false,

      pagination: userOptions.pagination
        ? {
            el: '.swiper-pagination',
            clickable: true,
          }
        : false,

      // Event handling
      on: {
        init: (swiper) => {
          this.dispatchEvent(
            new CustomEvent('slider:initialized', {
              bubbles: true,
              detail: {
                swiper,
                isLoop: swiper.params.loop,
              },
            }),
          );
        },
        slideChange: (swiper) => {
          this.dispatchEvent(
            new CustomEvent('slider:slideChange', {
              bubbles: true,
              detail: {
                activeIndex: swiper.activeIndex,
                realIndex: swiper.realIndex,
                isLoop: swiper.params.loop,
              },
            }),
          );
        },
      },
    };

    // Initialize Swiper with merged options
    this.swiper = new Swiper(this.querySelector('.swiper'), options);

    // Dispatch initialization event
    this.dispatchEvent(
      new CustomEvent('slider:initialized', {
        bubbles: true,
        detail: { swiper: this.swiper },
      }),
    );
  }

  disconnectedCallback() {
    if (this.swiper) {
      this.swiper.destroy();
      this.swiper = null;
    }
    window.removeEventListener('swiperLoaded', this.init);
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.swiper) return;

    switch (name) {
      case 'direction':
        this.swiper.changeDirection(newValue);
        break;
      case 'auto-height':
        this.swiper.updateAutoHeight();
        break;
    }
  }
}

customElements.define('ui-slider', UISlider);

class AddToCartButton extends HTMLElement {
  constructor() {
    super();
    this.variantId = this.dataset.variant;
    this.quizBase = this.dataset.quizBase;
    this.checkoutBase = this.dataset.checkoutBase;
    this.updateUrls = this.debounce(this.updateUrls.bind(this), 100);
    this.pairs = this.dataset.pairs;
    this.cartItemCount = parseInt(this.dataset.cartCount) || 0;
  }

  connectedCallback() {
    this.cacheElements();
    this.initializeUrls();
    this.setupEventListeners();
    this.checkCartState();
  }

  debounce(fn, delay) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  cacheElements() {
    this.quizContainer = this.querySelector('.add-to-cart-button__quiz');
    this.checkoutContainer = this.querySelector('.add-to-cart-button__checkout');
    this.quizLink = this.querySelector('.add-to-cart-button__quiz a');
    this.checkoutButton =
      this.querySelector('.add-to-cart-button__checkout button') ||
      this.querySelector('.add-to-cart-button__checkout a');
    this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
  }

  checkCartState() {
    const hasItemsInCart = this.cartItemCount > 0;

    console.log('Cart state check:', {
      itemCount: this.cartItemCount,
      showCheckout: hasItemsInCart,
    });

    if (hasItemsInCart) {
      // Show checkout button, hide quiz button
      this.quizContainer.classList.add('hidden');
      this.checkoutContainer.classList.remove('hidden');
    } else {
      // Show quiz button, hide checkout button
      this.quizContainer.classList.remove('hidden');
      this.checkoutContainer.classList.add('hidden');
    }
  }

  initializeUrls() {
    this.updateUrls(this.variantId, this.pairs);
  }

  setupEventListeners() {
    // Handle checkout button clicks
    if (this.checkoutButton) {
      this.checkoutButton.addEventListener('click', this.handleCheckoutClick.bind(this));
    }

    this.variantChangeUnsubscribe = subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
      const variant = event.data.variant;
      if (variant) {
        console.log('variant change', variant);
        this.variantId = variant.id;

        const match = variant.title.match(/\d+/);
        this.pairs = match ? match[0] : '';

        console.log('pairs', this.pairs);
        this.updateUrls(variant.id, this.pairs);
        this.checkCartState();
      }
    });

    this.cartChangeUnsubscribe = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      console.log('Cart update event received:', event);
      if (event.data && typeof event.data.item_count !== 'undefined') {
        this.cartItemCount = event.data.item_count;
        this.dataset.cartCount = this.cartItemCount;
        this.checkCartState();
      }
    });
  }

  async handleCheckoutClick(evt) {
    evt.preventDefault();

    // Check if cart is empty - if so, redirect to quiz
    if (this.cartItemCount === 0) {
      window.location.href = this.quizLink.href;
      return;
    }

    // Check if variant already in cart before adding
    const variantInCart = await this.checkIfVariantInCart();

    if (variantInCart) {
      console.log('Variant already in cart, redirecting to cart page...');
      window.location.href = routes.cart_url;
      return;
    }

    // If not in cart, add current variant to cart
    await this.addToCart();
  }

  async checkIfVariantInCart() {
    try {
      const response = await fetch('/cart.json');
      const cartData = await response.json();

      console.log('Checking cart for variant:', this.variantId);
      console.log('Current cart items:', cartData.items);

      // Check if current variant ID exists in any cart item
      const variantExists = cartData.items.some((item) => item.variant_id === parseInt(this.variantId));

      console.log(`Variant ${this.variantId} already in cart:`, variantExists);

      return variantExists;
    } catch (error) {
      console.error('Error fetching cart data:', error);
      // On error, default to false to allow add to cart
      return false;
    }
  }

  async addToCart() {
    if (!this.variantId) {
      console.error('No variant selected');
      return;
    }

    // Get quiz data from localStorage if available
    const quizData = this.getQuizData();

    // Show loading state
    this.setLoadingState(true);

    try {
      const config = fetchConfig('javascript');
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
      delete config.headers['Content-Type'];

      const formData = new FormData();
      formData.append('id', this.variantId);
      formData.append('quantity', '1');

      // Add quiz data as line item properties if available
      if (quizData) {
        Object.entries(quizData).forEach(([key, value]) => {
          formData.append(`properties[${key}]`, value);
        });
      }

      // Add pairs data if available
      if (this.pairs) {
        formData.append('properties[Pairs]', this.pairs);
      }

      // Add cart sections for rendering
      if (this.cart) {
        formData.append(
          'sections',
          this.cart.getSectionsToRender().map((section) => section.id),
        );
        formData.append('sections_url', window.location.pathname);
        this.cart.setActiveElement(document.activeElement);
      }

      config.body = formData;

      const response = await fetch(`${routes.cart_add_url}`, config);
      const responseData = await response.json();

      if (responseData.status) {
        // Handle error
        console.error('Add to cart error:', responseData);
        publish(PUB_SUB_EVENTS.cartError, {
          source: 'add-to-cart-button',
          productVariantId: this.variantId,
          errors: responseData.errors || responseData.description,
          message: responseData.message,
        });
        this.handleError(responseData.description);
      } else {
        // Success - simple promise pattern with performance tracking
        const startMarker = CartPerformance.createStartingMarker('add:wait-for-subscribers');

        Promise.resolve(
          publish(PUB_SUB_EVENTS.cartUpdate, {
            source: 'add-to-cart-button',
            productVariantId: this.variantId,
            cartData: responseData,
          }),
        ).then(() => {
          CartPerformance.measureFromMarker('add:wait-for-subscribers', startMarker);
        });

        // Render cart contents if cart component exists
        if (this.cart) {
          CartPerformance.measure('add:paint-updated-sections', () => {
            this.cart.renderContents(responseData);
          });
        }

        console.log('Successfully added to cart with quiz data:', quizData);

        // Redirect to cart after successful add
        setTimeout(() => {
          window.location.href = routes.cart_url;
        }, 500); // Small delay to let cart update finish
      }
    } catch (error) {
      console.error('Add to cart fetch error:', error);
      this.handleError('An error occurred while adding to cart');
    } finally {
      this.setLoadingState(false);
    }
  }

  getQuizData() {
    try {
      const quizDataString = localStorage.getItem('quiz_data');
      if (quizDataString) {
        const quizData = JSON.parse(quizDataString);
        console.log('Found quiz data in localStorage:', quizData);
        return quizData;
      }
    } catch (error) {
      console.error('Error parsing quiz data from localStorage:', error);
    }
    return null;
  }

  setLoadingState(isLoading) {
    if (this.checkoutButton) {
      if (isLoading) {
        this.checkoutButton.setAttribute('aria-disabled', 'true');
        this.checkoutButton.classList.add('loading');

        // Add spinner if it exists
        const spinner = this.checkoutButton.querySelector('.loading__spinner');
        if (spinner) {
          spinner.classList.remove('hidden');
        }
      } else {
        this.checkoutButton.removeAttribute('aria-disabled');
        this.checkoutButton.classList.remove('loading');

        // Hide spinner if it exists
        const spinner = this.checkoutButton.querySelector('.loading__spinner');
        if (spinner) {
          spinner.classList.add('hidden');
        }
      }
    }
  }

  handleError(errorMessage) {
    console.error('Cart error:', errorMessage);

    // Show error message to user
    const errorContainer = this.querySelector('.error-message');
    if (errorContainer) {
      errorContainer.textContent = errorMessage;
      errorContainer.classList.remove('hidden');

      // Hide error after 5 seconds
      setTimeout(() => {
        errorContainer.classList.add('hidden');
      }, 5000);
    } else {
      // Fallback to alert if no error container
      alert(errorMessage);
    }
  }

  updateUrls(variantId, pairs) {
    if (!variantId) return;

    // Update quiz URL (still needed for empty cart scenario)
    if (this.quizLink) {
      // this.quizLink.href = `${this.quizBase}?variant=${variantId}${pairs ? `&pairs=${pairs}` : ''}`;
      this.quizLink.href = `${this.quizBase}?${pairs ? `pairs=${pairs}` : ''}`;
    }

    // Update component's data attribute
    this.dataset.variant = variantId;
    this.dataset.pairs = pairs;

    // Re-check cart state after URL update
    this.checkCartState();
  }

  disconnectedCallback() {
    if (this.variantChangeUnsubscriber) {
      this.variantChangeUnsubscriber();
    }
    if (this.cartChangeUnsubscribe) {
      this.cartChangeUnsubscribe();
    }
  }
}

customElements.define('add-to-cart-button', AddToCartButton);

/**
/**
 * BuyAgainAddToCartButton
 *
 * This custom element handles the "Buy Again" add-to-cart button functionality.
 * - It listens for click events on its button and adds the selected product variant to the cart.
 * - It subscribes to variant change events to update the variant ID as the user selects different options.
 * - It manages loading and error states for the button, providing user feedback.
 * - It can retrieve quiz data from localStorage if needed for the add-to-cart action.
 * - When quiz data is present, it adds this data to both the line item properties and the cart attributes.
 * - It interacts with cart notification/drawer components to show cart updates.
 */

class BuyAgainAddToCartButton extends HTMLElement {
  constructor() {
    super();
    this.variantId = this.dataset.variant;
  }

  connectedCallback() {
    this.cacheElements();
    this.setupEventListeners();
  }

  cacheElements() {
    this.button = this.querySelector('button') || this.querySelector('a');
    this.cart = document.querySelector('cart-notification') || document.querySelector('cart-drawer');
  }

  setupEventListeners() {
    if (this.button) {
      this.button.addEventListener('click', this.handleClick.bind(this));
    }

    // Listen for variant changes if needed
    this.variantChangeUnsubscribe = subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
      const variant = event.data.variant;
      if (variant) {
        console.log('Variant change in buy-again button:', variant);
        this.variantId = variant.id;
        this.dataset.variant = this.variantId;
      }
    });
  }

  async handleClick(evt) {
    evt.preventDefault();
    await this.addToCart();
  }

  async addToCart() {
    if (!this.variantId) {
      console.error('No variant selected');
      this.handleError('Please select a product variant');
      return;
    }

    // Get quiz data from localStorage if available
    const quizData = this.getQuizData();

    // Show loading state
    this.setLoadingState(true);

    try {
      // Step 1: Clear existing cart attributes
      await this.clearCartAttributes();

      // Prepare cart add data with both line item properties and order attributes with fresh quiz data
      const cartData = {
        items: [
          {
            id: this.variantId,
            quantity: 1,
            properties: this.formatLineItemProperties(quizData),
          },
        ],
        attributes: this.formatOrderAttributes(quizData),
      };

      console.log('Adding to cart with data:', cartData);

      const response = await fetch(`${routes.cart_add_url}.js`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cartData),
      });

      const responseData = await response.json();

      if (!response.ok) {
        // Handle error
        console.error('Add to cart error:', responseData);
        this.handleError(responseData.description || responseData.message || 'Failed to add to cart');
      } else {
        // Success
        console.log('Successfully added to cart with quiz data:', quizData);

        // Publish cart update event
        publish(PUB_SUB_EVENTS.cartUpdate, {
          source: 'buy-again-add-to-cart-button',
          productVariantId: this.variantId,
          cartData: responseData,
        });

        // Render cart contents if cart component exists
        if (this.cart && this.cart.renderContents) {
          this.cart.renderContents(responseData);
        }

        // Redirect to cart after successful add
        setTimeout(() => {
          window.location.href = routes.cart_url;
        }, 500);
      }
    } catch (error) {
      console.error('Add to cart fetch error:', error);
      this.handleError('An error occurred while adding to cart');
    } finally {
      this.setLoadingState(false);
    }
  }

  async clearCartAttributes() {
    try {
      console.log('Clearing existing cart attributes...');

      // First, get current cart to see what attributes exist
      const cartResponse = await fetch(`${routes.cart_url}.js`);
      const cart = await cartResponse.json();

      console.log('Current cart attributes:', cart.attributes);

      if (cart.attributes && Object.keys(cart.attributes).length > 0) {
        // Create an object to clear all existing attributes by setting them to empty strings
        const attributesToClear = {};
        Object.keys(cart.attributes).forEach((key) => {
          attributesToClear[key] = '';
        });

        console.log('Clearing these attributes:', attributesToClear);

        const response = await fetch(`${routes.cart_update_url}.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attributes: attributesToClear }),
        });

        if (response.ok) {
          console.log('Cart attributes cleared successfully');
        } else {
          console.error('Failed to clear cart attributes:', response.status);
        }
      } else {
        console.log('No cart attributes to clear');
      }
    } catch (error) {
      console.error('Error clearing cart attributes:', error);
    }
  }

  getQuizData() {
    // Priority 1: Check localStorage
    try {
      const quizDataString = localStorage.getItem('quiz_data');
      if (quizDataString) {
        const quizData = JSON.parse(quizDataString);
        console.log('Found quiz data in localStorage:', quizData);
        return quizData;
      }
    } catch (error) {
      console.error('Error parsing quiz data from localStorage:', error);
    }

    // Priority 2: Check customer data from data-quiz-data attribute
    try {
      const customerDataString = this.dataset.quizData;
      if (customerDataString) {
        const customerData = JSON.parse(customerDataString);
        console.log('Found customer data from data-quiz-data attribute:', customerData);
        return customerData;
      }
    } catch (error) {
      console.error('Error parsing customer data from data-quiz-data attribute:', error);
    }

    console.log('No quiz data found from localStorage or customer data');
    return null;
  }

  formatLineItemProperties(quizData) {
    const properties = {};

    // Add quiz data as line item properties
    if (quizData) {
      Object.entries(quizData).forEach(([key, value]) => {
        if (value && value.toString().trim() !== '') {
          // Format key: capitalize first letter, replace underscores with spaces
          const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
          properties[formattedKey] = value;
        }
      });
    }

    console.log('Line item properties formatted:', properties);
    return properties;
  }

  formatOrderAttributes(quizData) {
    const attributes = {};

    // Add quiz data as order attributes
    if (quizData) {
      Object.entries(quizData).forEach(([key, value]) => {
        if (value && value.toString().trim() !== '') {
          // Format key: capitalize first letter, replace underscores with spaces
          const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
          attributes[formattedKey] = value;
        }
      });
    }

    console.log('Order attributes formatted:', attributes);
    return attributes;
  }

  setLoadingState(isLoading) {
    if (this.button) {
      if (isLoading) {
        this.button.setAttribute('aria-disabled', 'true');
        this.button.classList.add('loading');

        // Update button text if it has text content
        const textElements = this.button.querySelectorAll('.btn-primary__text');
        if (textElements.length > 0) {
          // Store original text from the first element
          this.originalText = textElements[0].textContent;

          // Update all text elements
          textElements.forEach((textElement) => {
            textElement.textContent = 'Adding...';
          });
        }

        // Add spinner if it exists
        const spinner = this.button.querySelector('.loading__spinner');
        if (spinner) {
          spinner.classList.remove('hidden');
        }
      } else {
        this.button.removeAttribute('aria-disabled');
        this.button.classList.remove('loading');

        // Restore button text
        const textElements = this.button.querySelectorAll('.btn-primary__text');
        if (textElements.length > 0 && this.originalText) {
          textElements.forEach((textElement) => {
            textElement.textContent = this.originalText;
          });
        }

        // Hide spinner if it exists
        const spinner = this.button.querySelector('.loading__spinner');
        if (spinner) {
          spinner.classList.add('hidden');
        }
      }
    }
  }

  handleError(errorMessage) {
    console.error('Cart error:', errorMessage);

    // Show error message to user
    const errorContainer = this.querySelector('.error-message');
    if (errorContainer) {
      errorContainer.textContent = errorMessage;
      errorContainer.classList.remove('hidden');

      // Hide error after 5 seconds
      setTimeout(() => {
        errorContainer.classList.add('hidden');
      }, 5000);
    } else {
      // Fallback to alert if no error container
      alert(errorMessage);
    }

    // Publish error event
    publish(PUB_SUB_EVENTS.cartError, {
      source: 'buy-again-add-to-cart-button',
      productVariantId: this.variantId,
      errors: errorMessage,
      message: errorMessage,
    });
  }

  disconnectedCallback() {
    if (this.variantChangeUnsubscribe) {
      this.variantChangeUnsubscribe();
    }
  }
}

customElements.define('buy-again-add-to-cart-button', BuyAgainAddToCartButton);

/**
 * BuyAgainTakeQuizButton Web Component
 *
 * A custom element that renders a "Take The Quiz" button which navigates users to a quiz page
 * with the currently selected product variant ID as a URL parameter.
 *
 * Features:
 * - Listens to variant changes via Shopify's pub/sub system
 * - Dynamically updates data attributes when variant changes
 * - Constructs and navigates to quiz URL with variant parameter
 */
class BuyAgainTakeQuizButton extends HTMLElement {
  constructor() {
    super();

    this.variantId = this.dataset.variant;
    this.baseUrl = this.dataset.baseUrl;
  }

  connectedCallback() {
    this.cacheElements();
    this.setupEventListeners();
  }

  cacheElements() {
    this.button = this.querySelector('button');
  }

  /**
   * Set up all event listeners for the component
   * - Click handler for button navigation
   * - Pub/sub subscription for variant changes
   */
  setupEventListeners() {
    // Add click handler to the button
    if (this.button) {
      this.button.addEventListener('click', this.handleClick.bind(this));
    }

    // Subscribe to variant change events from Shopify's pub/sub system
    this.variantChangeUnsubscribe = subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
      const variant = event.data.variant;
      if (variant) {
        this.updateVariant(variant.id);
      }
    });
  }

  /**
   * Update the component when a new variant is selected
   * Updates both the internal state and data attributes for external access
   */
  updateVariant(variantId) {
    // Update internal variant ID
    this.variantId = variantId;

    // Update data-variant attribute (visible in DOM)
    this.dataset.variant = variantId;

    // Update data-final-url attribute with new variant parameter
    this.dataset.finalUrl = `${this.baseUrl}?variant=${variantId}`;

    // Log the update for debugging purposes
    console.log('Variant updated:', {
      variantId: this.variantId,
      finalUrl: this.dataset.finalUrl,
    });
  }

  /**
   * Handle button click event
   * Constructs the quiz URL with the current variant and navigates to it
   */
  handleClick(evt) {
    // Prevent default link/button behavior
    evt.preventDefault();

    // Ensure we have a variant selected before navigating
    if (!this.variantId) {
      console.error('No variant selected');
      return;
    }

    // Construct the full quiz URL with variant parameter
    const quizUrl = `${this.baseUrl}?variant=${this.variantId}`;
    console.log('Navigating to quiz:', quizUrl);

    // Navigate to the quiz page
    window.location.href = quizUrl;
  }

  /**
   * Lifecycle callback - called when element is removed from the DOM
   * Clean up event listeners to prevent memory leaks
   */
  disconnectedCallback() {
    // Unsubscribe from variant change events
    if (this.variantChangeUnsubscribe) {
      this.variantChangeUnsubscribe();
    }
  }
}

window.customElements.define('buy-again-take-quiz-button', BuyAgainTakeQuizButton);

class CartPerformance {
  static #metric_prefix = 'cart-performance';

  static createStartingMarker(benchmarkName) {
    const metricName = `${CartPerformance.#metric_prefix}:${benchmarkName}`;
    return performance.mark(`${metricName}:start`);
  }

  static measureFromEvent(benchmarkName, event) {
    const metricName = `${CartPerformance.#metric_prefix}:${benchmarkName}`;
    const startMarker = performance.mark(`${metricName}:start`, {
      startTime: event.timeStamp,
    });

    const endMarker = performance.mark(`${metricName}:end`);

    performance.measure(benchmarkName, `${metricName}:start`, `${metricName}:end`);
  }

  static measureFromMarker(benchmarkName, startMarker) {
    const metricName = `${CartPerformance.#metric_prefix}:${benchmarkName}`;
    const endMarker = performance.mark(`${metricName}:end`);

    performance.measure(benchmarkName, startMarker.name, `${metricName}:end`);
  }

  static measure(benchmarkName, callback) {
    const metricName = `${CartPerformance.#metric_prefix}:${benchmarkName}`;
    const startMarker = performance.mark(`${metricName}:start`);

    callback();

    const endMarker = performance.mark(`${metricName}:end`);

    performance.measure(benchmarkName, `${metricName}:start`, `${metricName}:end`);
  }
}

/**
 * SellingPlanSelector Custom Element
 *
 * Manages subscription/selling plan selection for Shopify products.
 * Works on both product pages and cart pages.
 *
 * Features:
 * - Shows/hides correct selling plan options based on selected variant
 * - Updates prices when subscription options change
 * - Syncs selection with hidden input for cart submission
 * - Integrates with add-to-cart-button via data attributes
 * - Updates cart in real-time when plans change on cart page
 *
 * @extends HTMLElement
 */
class SellingPlanSelector extends HTMLElement {
  constructor() {
    super();
    this.hiddenClass = 'hidden';
    // Detect context: are we on cart page or product page?
    this.isCartPage = this.closest('cart-items') !== null;
  }

  connectedCallback() {
    // NEW: Initialize from cart item if on cart page
    if (this.isCartPage) {
      this.initializeFromCartItem();
    }

    // Initialize the component when it's added to the DOM
    this.updateSellingPlanInputsValues();
    this.listenToVariantChange();
    this.listenToSellingPlanFormRadioButtonChange();
    this.setupFrequencyDropdownListeners();
    this.updatePrice();
  }

  // ============================================================================
  // GETTERS - Properties that derive values from the DOM
  // ============================================================================

  /**
   * Gets the section ID from the data attribute
   * Used to scope queries to the correct Shopify section
   */
  get sectionId() {
    return this.getAttribute('data-section-id');
  }

  /**
   * Gets the Shopify section element containing this component
   * Used for finding price elements and other section-specific content
   */
  get shopifySection() {
    return document.querySelector(`#shopify-section-${this.sectionId}`);
  }

  /**
   * Gets the add-to-cart-button custom element on the page
   * Used to sync selling plan ID for cart submission
   */
  get addToCartButton() {
    return document.querySelector('add-to-cart-button');
  }

  /**
   * Gets the current variant ID
   * Priority: stored value (from variant change) → add-to-cart-button fallback
   *
   * @returns {string} The variant ID
   */
  get currentVariantId() {
    const variantId = this._currentVariantId || this.addToCartButton?.dataset.variant;
    console.log('📍 currentVariantId:', variantId);
    return variantId;
  }

  /**
   * Gets the price element in the section
   * Used for updating price display when subscription is selected
   */
  get priceElement() {
    return this.shopifySection?.querySelector('.price');
  }

  /**
   * Gets the visible selling plan form for the current variant
   * Only one form should be visible at a time
   *
   * @returns {HTMLElement|null} The section element for current variant
   */
  get visibleSellingPlanForm() {
    const form = this.querySelector(`section[data-variant-id="${this.currentVariantId}"]`);
    console.log('👁️ visibleSellingPlanForm:', form ? `Found for ${this.currentVariantId}` : 'NOT FOUND');
    return form;
  }

  /**
   * Gets the hidden input that stores the selected selling plan ID
   * This input is submitted with the cart form
   */
  get sellingPlanInput() {
    return this.querySelector('.selected-selling-plan-id');
  }

  /**
   * Gets the regular price element (non-sale price display)
   */
  get regularPriceElement() {
    return this.shopifySection?.querySelector('.price__regular');
  }

  /**
   * Gets the sale price container element
   */
  get salePriceElement() {
    return this.shopifySection?.querySelector('.price__sale');
  }

  /**
   * Gets the sale price value element (discounted price)
   */
  get salePriceValue() {
    return this.salePriceElement?.querySelector('.price-item--sale');
  }

  /**
   * Gets the regular price value element (shown when there's a sale)
   */
  get regularPriceValue() {
    return this.salePriceElement?.querySelector('.price-item--regular');
  }

  /**
   * Gets the price from the selected purchase option's data attribute
   * This is the subscription price (potentially discounted)
   */
  get selectedPurchaseOptionPrice() {
    return this.selectedPurchaseOption?.dataset.variantPrice;
  }

  /**
   * Gets the compare-at price from the selected option
   * This is the original price before subscription discount
   */
  get selectedPurchaseOptionComparedAtPrice() {
    return this.selectedPurchaseOption?.dataset.variantCompareAtPrice;
  }

  /**
   * Gets the selling plan ID value to store in the hidden input
   * Returns empty string if one-time purchase is selected
   *
   * @returns {string} The selling plan ID or empty string
   */
  get sellingPlanInputValue() {
    return this.selectedPurchaseOption?.dataset.sellingPlanId ?? '';
  }

  /**
   * Gets the currently selected purchase option (radio button)
   * This could be "one-time purchase" or a subscription option
   *
   * @returns {HTMLInputElement|null} The checked radio button
   */
  get selectedPurchaseOption() {
    const option = this.visibleSellingPlanForm?.querySelector('input[type="radio"]:checked');
    console.log('🔘 selectedPurchaseOption:', option?.dataset);
    return option;
  }

  /**
   * Setter for selectedPurchaseOption (used internally for state management)
   */
  set selectedPurchaseOption(selectedPurchaseOption) {
    this._selectedPurchaseOption = selectedPurchaseOption;
  }

  // ============================================================================
  // INITIALIZATION METHODS
  // ============================================================================

  /**
   * Initializes the component with the current variant from the cart item
   * Called on cart pages to set initial state before any variant changes
   */
  initializeFromCartItem() {
    // Only initialize once
    if (this._initialized) {
      console.log('ℹ️ Already initialized, skipping');
      return;
    }

    const cartItem = this.closest('.cart-item');
    if (!cartItem) {
      console.warn('⚠️ Could not find parent cart-item');
      return;
    }

    // Find the checked radio button (the currently selected variant option)
    const checkedRadio = cartItem.querySelector('input[type="radio"]:checked');

    if (checkedRadio && checkedRadio.dataset.variantId) {
      const variantId = checkedRadio.dataset.variantId;
      console.log('🛒 Initialized cart page with variant:', variantId);
      this._currentVariantId = variantId;

      // Show the correct section immediately
      this.handleSellingPlanFormVisibility();

      // Mark as initialized
      this._initialized = true;
    } else {
      console.warn('⚠️ Could not find checked radio button with variant ID');
    }
  }

  // ============================================================================
  // VISIBILITY METHODS - Show/hide selling plan sections
  // ============================================================================

  /**
   * Shows the selling plan form for the selected variant
   * Removes the hidden class to make it visible
   *
   * @param {HTMLElement} sellingPlanFormForSelectedVariant - The section to show
   */
  showSellingPlanForm(sellingPlanFormForSelectedVariant) {
    console.log('✅ Showing form:', sellingPlanFormForSelectedVariant?.dataset.variantId);
    sellingPlanFormForSelectedVariant?.classList?.remove(this.hiddenClass);
  }

  /**
   * Hides all selling plan forms that don't match the current variant
   * Adds the hidden class to make them invisible
   *
   * @param {NodeList} sellingPlanFormsForUnselectedVariants - Forms to hide
   */
  hideSellingPlanForms(sellingPlanFormsForUnselectedVariants) {
    sellingPlanFormsForUnselectedVariants.forEach((element) => {
      console.log('❌ Hiding form:', element.dataset.variantId);
      element.classList.add(this.hiddenClass);
    });
  }

  /**
   * Handles showing the correct selling plan section and hiding others
   * Called when variant changes to swap which subscription options are visible
   */
  handleSellingPlanFormVisibility() {
    console.log('🔍 handleSellingPlanFormVisibility called');
    console.log('   currentVariantId:', this.currentVariantId, typeof this.currentVariantId);

    if (!this.currentVariantId) {
      console.log('   ⚠️ No current variant ID');
      return;
    }

    // Debug: log all available sections
    const allSections = this.querySelectorAll('section[data-variant-id]');
    console.log(
      '   All sections:',
      Array.from(allSections).map((s) => s.dataset.variantId),
    );

    // Find the section for the current variant
    const sellingPlanFormForSelectedVariant = this.querySelector(`section[data-variant-id="${this.currentVariantId}"]`);

    // Find all other sections (to hide them)
    const sellingPlanFormsForUnselectedVariants = this.querySelectorAll(
      `.selling_plan_theme_integration:not([data-variant-id="${this.currentVariantId}"])`,
    );

    console.log('   Showing variant:', this.currentVariantId);
    console.log('   Found section to show:', !!sellingPlanFormForSelectedVariant);
    console.log('   Sections to hide:', sellingPlanFormsForUnselectedVariants.length);

    // Show the correct section, hide all others
    this.showSellingPlanForm(sellingPlanFormForSelectedVariant);
    this.hideSellingPlanForms(sellingPlanFormsForUnselectedVariants);
  }

  // ============================================================================
  // VARIANT CHANGE HANDLING
  // ============================================================================

  /**
   * Main handler for variant changes
   * Called when user selects a different variant (e.g., different "Pairs" option)
   *
   * Flow:
   * 1. Store the new variant ID
   * 2. Show/hide correct selling plan sections
   * 3. Update hidden input values
   * 4. Sync with add-to-cart-button
   * 5. Re-attach radio button listeners
   * 6. Update price display
   *
   * @param {Object} variant - The variant object from Shopify
   * @param {number} variant.id - The variant ID
   */
  handleVariantChange(variant) {
    console.log('🎯 handleVariantChange called with variant:', variant);

    // Store the variant ID for immediate access (avoids timing issues)
    this._currentVariantId = variant.id.toString();

    // Execute all updates in sequence
    this.handleSellingPlanFormVisibility();
    this.updateSellingPlanInputsValues();
    this.updateAddToCartButtonSellingPlan();
    this.listenToSellingPlanFormRadioButtonChange();
    this.setupFrequencyDropdownListeners();
    this.updatePrice();
  }

  /**
   * Sets up variant change listeners based on context (product vs cart page)
   *
   * Product page: Listens to optionValueSelectionChange (from variant-selects)
   * Cart page: Listens to cart line item changes
   */
  listenToVariantChange() {
    console.log('👂 Setting up variant change listener');
    console.log('   Context:', this.isCartPage ? 'Cart Page' : 'Product Page');

    if (this.isCartPage) {
      // Cart page: listen to line item variant changes
      this.listenToCartLineItemChanges();
    } else {
      // Product page: listen to variant-selects changes
      this.listenToProductPageVariantChanges();
    }
  }

  /**
   * Listens to variant changes on product pages
   * Subscribes to the optionValueSelectionChange event from variant-selects
   */
  listenToProductPageVariantChanges() {
    this.variantChangeUnsubscribe = subscribe(PUB_SUB_EVENTS.optionValueSelectionChange, (event) => {
      console.log('🔔 optionValueSelectionChange received:', event);

      // Get the selected variant data from variant-selects element
      const variantSelects = document.querySelector('variant-selects');
      const selectedVariantJson = variantSelects?.querySelector('[data-selected-variant]')?.textContent.trim();

      if (selectedVariantJson) {
        try {
          const variant = JSON.parse(selectedVariantJson);
          console.log('🎯 Variant parsed:', variant);
          this.handleVariantChange(variant);
        } catch (e) {
          console.error('Error parsing variant:', e);
        }
      }
    });
  }

  /**
   * Listens to variant changes on cart pages
   * Sets up a listener for the custom 'variant-changed' event from line items
   */
  listenToCartLineItemChanges() {
    // Find the cart item this selector belongs to
    const cartItem = this.closest('.cart-item');
    if (!cartItem) {
      console.error('Could not find parent cart-item');
      return;
    }

    // Listen for the custom variant-changed event dispatched by line item selector
    cartItem.addEventListener('variant-changed', (event) => {
      console.log('🛒 Cart variant changed:', event.detail);

      if (event.detail && event.detail.variant) {
        this.handleVariantChange(event.detail.variant);
      }
    });
  }

  // ============================================================================
  // PRICE UPDATE METHODS
  // ============================================================================

  /**
   * Updates the price display based on selected subscription option
   *
   * Logic:
   * - If compare-at price exists and differs from selling price → show sale price
   * - Otherwise → show regular price
   *
   * This handles subscription discounts (e.g., "Subscribe & Save 10%")
   */
  updatePrice() {
    console.log('💰 updatePrice called');

    // Skip price updates on cart page
    if (this.isCartPage) {
      console.log('ℹ️ Skipping price update on cart page');
      return;
    }

    // Validation: need both a selected option and price element
    if (!this.selectedPurchaseOption) {
      console.log('⚠️ No selected purchase option');
      return;
    }

    if (!this.priceElement) {
      console.log('⚠️ No price element');
      return;
    }

    console.log('Price:', this.selectedPurchaseOptionPrice);
    console.log('Compare at:', this.selectedPurchaseOptionComparedAtPrice);

    // Determine if there's a discount (compare-at price exists and is different)
    if (
      !this.selectedPurchaseOptionComparedAtPrice ||
      this.selectedPurchaseOptionComparedAtPrice === this.selectedPurchaseOptionPrice
    ) {
      // No discount: show regular price
      this.showRegularPrice();
      this.hideSalePrice();
      this.priceElement.classList.remove('price--on-sale');
    } else {
      // Has discount: show sale price
      this.showSalePrice();
      this.hideRegularPrice();
      this.priceElement.classList.add('price--on-sale');
    }
  }

  /**
   * Hides the sale price element
   */
  hideSalePrice() {
    if (this.salePriceElement) {
      this.salePriceElement.style.display = 'none';
    }
  }

  /**
   * Hides the regular price element
   */
  hideRegularPrice() {
    if (this.regularPriceElement) {
      this.regularPriceElement.style.display = 'none';
    }
  }

  /**
   * Shows the regular price and hides sale pricing
   */
  showRegularPrice() {
    if (this.regularPriceElement) {
      this.regularPriceElement.style.display = 'block';
    }
    // Also ensure sale element is hidden
    const saleElement = this.shopifySection?.querySelector('.price__sale');
    if (saleElement) {
      saleElement.style.display = 'none';
    }
  }

  /**
   * Shows the sale price with both the discounted and original prices
   * Updates the HTML content to display the correct values
   */
  showSalePrice() {
    if (this.salePriceElement) {
      this.salePriceElement.style.display = 'block';
    }
    // Update the original (crossed-out) price
    if (this.regularPriceValue) {
      this.regularPriceValue.innerHTML = this.selectedPurchaseOptionComparedAtPrice;
    }
    // Update the sale (discounted) price
    if (this.salePriceValue) {
      this.salePriceValue.innerHTML = this.selectedPurchaseOptionPrice;
    }
  }

  // ============================================================================
  // HIDDEN INPUT & SYNC METHODS
  // ============================================================================

  /**
   * Updates the hidden input value with the selected selling plan ID
   * This input is submitted with the form when adding to cart
   *
   * Value is empty string for one-time purchase, or selling plan ID for subscriptions
   */
  updateSellingPlanInputsValues() {
    const value = this.sellingPlanInputValue;
    if (this.sellingPlanInput) {
      this.sellingPlanInput.value = value;
      console.log('📝 Updated hidden input to:', value);
    }
  }

  /**
   * Syncs the selling plan ID to the add-to-cart-button element
   * The add-to-cart-button reads this when submitting to cart
   */
  updateAddToCartButtonSellingPlan() {
    if (!this.addToCartButton) return;

    const sellingPlanId = this.sellingPlanInputValue;
    this.addToCartButton.dataset.sellingPlanId = sellingPlanId;
    console.log('🛒 Updated add-to-cart-button selling plan to:', sellingPlanId);
  }

  // ============================================================================
  // RADIO BUTTON EVENT HANDLING
  // ============================================================================

  /**
   * Handles when user clicks a different subscription option radio button
   *
   * Flow:
   * 1. Store the new selection
   * 2. Update hidden input value
   * 3. Sync with add-to-cart-button (product page) OR update cart (cart page)
   * 4. Update price display
   *
   * @param {HTMLInputElement} selectedPurchaseOption - The radio button that was clicked
   */
  handleRadioButtonChange(selectedPurchaseOption) {
    console.log('🔘 Radio button changed:', selectedPurchaseOption.dataset);

    this.selectedPurchaseOption = selectedPurchaseOption;
    this.updateSellingPlanInputsValues();

    if (this.isCartPage) {
      // On cart page: update the actual cart
      this.handleCartSellingPlanUpdate();
    } else {
      // On product page: sync with add-to-cart button
      this.updateAddToCartButtonSellingPlan();
    }

    this.updatePrice();
  }

  /**
   * Handles updating the cart item when selling plan changes
   * Only applicable on cart pages
   */
  async handleCartSellingPlanUpdate() {
    if (!this.isCartPage) return;

    const cartItem = this.closest('.cart-item');
    const cartItemsElement = document.querySelector('cart-items');

    if (!cartItem || !cartItemsElement) {
      console.error('Missing required elements');
      return;
    }

    const sellingPlanId = this.sellingPlanInputValue;
    console.log('🔄 Updating cart with selling plan:', sellingPlanId);

    const fieldset = cartItem.querySelector('fieldset[id^="CartItemVariantSelect-"]');
    if (!fieldset) {
      console.error('Could not find fieldset');
      return;
    }

    const lineKey = fieldset.id.split('-')[1];

    // Get current cart to preserve properties
    const currentCart = await cartItemsElement.getCurrentCart();
    if (!currentCart) {
      console.error('Failed to get current cart');
      return;
    }

    const currentItem = currentCart.items.find((item) => item.key === lineKey);
    if (!currentItem) {
      console.error('Could not find current item in cart');
      return;
    }

    // Show loading state
    this.showLoadingState();

    try {
      // Get section ID for rendering
      const mainCartElement = document.getElementById('main-cart');
      const sectionId = mainCartElement?.dataset.id;

      // Update cart with selling plan
      const body = JSON.stringify({
        id: lineKey,
        quantity: currentItem.quantity,
        selling_plan: sellingPlanId || null,
        properties: currentItem.properties || {},
        sections: sectionId, // Request updated section HTML
        sections_url: window.location.pathname,
      });

      const response = await fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
      });

      if (!response.ok) {
        throw new Error(`Failed to update cart: ${response.status}`);
      }

      const parsedState = await response.json();
      console.log('✅ Cart updated successfully with selling plan:', sellingPlanId);

      // Update ONLY .js-contents to preserve selling-plan-selector state
      if (parsedState.sections && parsedState.sections[sectionId]) {
        const parser = new DOMParser();
        const html = parser.parseFromString(parsedState.sections[sectionId], 'text/html');
        const newJsContents = html.querySelector('.js-contents');

        if (newJsContents) {
          const currentJsContents = mainCartElement.querySelector('.js-contents');
          if (currentJsContents) {
            currentJsContents.innerHTML = newJsContents.innerHTML;
            console.log('✅ Updated .js-contents');

            // Re-inject quiz link
            setTimeout(() => {
              if (typeof cartItemsElement.reInjectQuizLink === 'function') {
                cartItemsElement.reInjectQuizLink();
              }
            }, 100);
          }
        }
      }

      // Update cart icon bubble
      const cartIconBubble = document.getElementById('cart-icon-bubble');
      if (cartIconBubble && parsedState.sections && parsedState.sections['cart-icon-bubble']) {
        const parser = new DOMParser();
        const html = parser.parseFromString(parsedState.sections['cart-icon-bubble'], 'text/html');
        const newBubble = html.querySelector('.shopify-section');
        if (newBubble) {
          cartIconBubble.innerHTML = newBubble.innerHTML;
        }
      }

      // Publish cart update event
      publish(PUB_SUB_EVENTS.cartUpdate, {
        source: 'selling-plan-selector',
        cartData: parsedState,
      });

      this.hideLoadingState();
    } catch (error) {
      console.error('Error updating cart with selling plan:', error);
      // this.hideLoadingState();

      // Show error to user
      this.showErrorState(error.message || 'Failed to update subscription');
    }
  }

  /**
   * Refreshes cart sections using Shopify's section rendering API
   * This updates both cart items and summary with new prices
   */
  async refreshCartDisplay() {
    try {
      const sections = ['main-cart'].filter((section) => document.getElementById(section)).join(',');

      if (!sections) {
        console.warn('No cart sections found to refresh');
        return;
      }

      const response = await fetch(`${window.location.pathname}?sections=${sections}`);
      const data = await response.json();

      // Update each section
      Object.entries(data).forEach(([sectionId, html]) => {
        const sectionElement = document.getElementById(sectionId);
        if (sectionElement) {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = html;
          const newContent = tempDiv.querySelector(`#${sectionId}`);

          if (newContent) {
            sectionElement.innerHTML = newContent.innerHTML;
            console.log(`✅ Updated section: ${sectionId}`);
          }
        }
      });

      // Publish cart update event for other listeners
      publish(PUB_SUB_EVENTS.cartUpdate, {
        source: 'selling-plan-selector',
      });
    } catch (error) {
      console.error('Error refreshing cart sections:', error);
    }
  }

  /**
   * Attaches change listeners to all radio buttons in the visible section
   * Called when variant changes to ensure new radio buttons are interactive
   *
   * Note: Removes old listeners first to prevent duplicates
   */
  listenToSellingPlanFormRadioButtonChange() {
    const radios = this.visibleSellingPlanForm?.querySelectorAll('input[type="radio"]');
    console.log('👂 Setting up radio listeners, found:', radios?.length || 0, 'radios');

    radios?.forEach((radio) => {
      // Remove old listener if it exists (prevents duplicates)
      if (radio._sellingPlanChangeHandler) {
        radio.removeEventListener('change', radio._sellingPlanChangeHandler);
      }

      // Create and store the handler
      radio._sellingPlanChangeHandler = (event) => {
        this.handleRadioButtonChange(event.target);
      };

      // Add the listener
      radio.addEventListener('change', radio._sellingPlanChangeHandler);
    });
  }

  // ============================================================================
  // FREQUENCY DROPDOWN HANDLING
  // ============================================================================

  /**
   * Sets up listeners for frequency dropdown changes
   * Updates pricing, discount badge, and hidden input when user selects different frequency
   */
  setupFrequencyDropdownListeners() {
    const dropdowns = this.querySelectorAll('.selling-plan-frequency-select');

    dropdowns.forEach((dropdown) => {
      dropdown.addEventListener('change', (event) => {
        this.handleFrequencyChange(event);
      });
    });

    console.log('📦 Frequency dropdown listeners setup:', dropdowns.length);
  }

  /**
   * Handles when user changes the delivery frequency dropdown
   * @param {Event} event - The change event from the select element
   */
  handleFrequencyChange(event) {
    const dropdown = event.target;
    const selectedOption = dropdown.options[dropdown.selectedIndex];

    // Get data from selected option
    const sellingPlanId = selectedOption.value;
    const newPrice = selectedOption.dataset.price;
    const newComparePrice = selectedOption.dataset.comparePrice;
    const newDiscount = selectedOption.dataset.discount;

    console.log('📅 Frequency changed:', {
      sellingPlanId,
      newPrice,
      newComparePrice,
      newDiscount,
    });

    // Find the parent subscription card
    const subscriptionCard = dropdown.closest('.selling-plan-option--subscription');
    if (!subscriptionCard) {
      console.error('Could not find parent subscription card');
      return;
    }

    // Update the radio button's data attributes
    const radioButton = subscriptionCard.querySelector('.selling-plan-radio--group');
    if (radioButton) {
      radioButton.dataset.sellingPlanId = sellingPlanId;
      radioButton.dataset.variantPrice = newPrice;
      radioButton.dataset.variantCompareAtPrice = newComparePrice;
    }

    // Update the displayed price
    const priceElement = subscriptionCard.querySelector('.selling-plan-price--dynamic');
    if (priceElement) {
      priceElement.textContent = newPrice;
    }

    // Update the compare-at price
    const comparePriceElement = subscriptionCard.querySelector('.selling-plan-compare-price--dynamic');
    if (comparePriceElement) {
      if (newComparePrice && newPrice !== newComparePrice) {
        comparePriceElement.textContent = newComparePrice;
        comparePriceElement.style.display = '';
      } else {
        comparePriceElement.style.display = 'none';
      }
    }

    // Update the discount badge
    const badgeElement = subscriptionCard.querySelector('.selling-plan-badge--dynamic');
    if (badgeElement && newDiscount > 0) {
      badgeElement.textContent = `${newDiscount}% OFF`;
      badgeElement.style.display = '';
    } else if (badgeElement) {
      badgeElement.style.display = 'none';
    }

    // Update hidden input value
    this.updateSellingPlanInputsValues();

    // If this subscription option is currently selected, update the cart
    if (radioButton && radioButton.checked) {
      if (this.isCartPage) {
        this.handleCartSellingPlanUpdate();
      } else {
        this.updateAddToCartButtonSellingPlan();
      }
    }
  }

  /**
   * Shows loading state on the cart summary
   */

  showLoadingState() {
    const cartItem = this.closest('.cart-item');

    // Disable all radio buttons
    const radios = this.querySelectorAll('input[type="radio"]');
    radios.forEach((radio) => {
      radio.disabled = true;
    });

    // Show loading spinner
    const loadingSpinner = cartItem?.querySelector('.variant-loading__spinner');
    if (loadingSpinner) {
      loadingSpinner.classList.remove('hidden');
    }

    // Dim the selling plan form
    const visibleForm = this.visibleSellingPlanForm;
    if (visibleForm) {
      visibleForm.style.opacity = '0.6';
      visibleForm.style.pointerEvents = 'none';
    }

    // Dim cart summary
    const cartSummary = document.querySelector('.main-cart-summary');
    if (cartSummary) {
      cartSummary.style.opacity = '0.6';
      cartSummary.style.pointerEvents = 'none';
    }

    console.log('🔄 Loading state: ACTIVE');
  }

  /**
   * Hides loading state on the cart summary
   */
  hideLoadingState() {
    const cartItem = this.closest('.cart-item');

    // Re-enable all radio buttons
    const radios = this.querySelectorAll('input[type="radio"]');
    radios.forEach((radio) => {
      radio.disabled = false;
    });

    // Hide loading spinner
    const loadingSpinner = cartItem?.querySelector('.variant-loading__spinner');
    if (loadingSpinner) {
      loadingSpinner.classList.add('hidden');
    }

    // Restore selling plan form
    const visibleForm = this.visibleSellingPlanForm;
    if (visibleForm) {
      visibleForm.style.opacity = '1';
      visibleForm.style.pointerEvents = 'auto';
    }

    // Restore cart summary
    const cartSummary = document.querySelector('.main-cart-summary');
    if (cartSummary) {
      cartSummary.style.opacity = '1';
      cartSummary.style.pointerEvents = 'auto';
    }

    console.log('✅ Loading state: CLEARED');
  }

  showErrorState(errorMessage = 'Failed to update subscription') {
    this.hideLoadingState();

    // Show error message near the radio buttons
    const visibleForm = this.visibleSellingPlanForm;
    if (!visibleForm) return;

    // Remove existing error message
    const existingError = visibleForm.querySelector('.selling-plan-error');
    if (existingError) {
      existingError.remove();
    }

    // Create and insert error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'selling-plan-error';
    errorDiv.style.cssText = 'color: rgb(239, 68, 68); font-size: 0.875rem; margin-top: 0.5rem;';
    errorDiv.textContent = errorMessage;

    visibleForm.appendChild(errorDiv);

    // Auto-remove error after 5 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);

    console.error('❌ Error state:', errorMessage);
  }

  // ============================================================================
  // LIFECYCLE METHODS
  // ============================================================================

  /**
   * Cleanup when element is removed from DOM
   * Unsubscribes from PubSub events to prevent memory leaks
   */
  disconnectedCallback() {
    if (this.variantChangeUnsubscribe) {
      this.variantChangeUnsubscribe();
    }
  }
}

// Register the custom element
customElements.define('selling-plan-selector', SellingPlanSelector);
