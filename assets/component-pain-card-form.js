class PainCardForm extends HTMLElement {
  constructor() {
    super();
    this.form = null;
    this.painCards = null;
    this.submitButton = null;
    this.activeCard = null; // Track the currently active card
  }

  connectedCallback() {
    // Initialize references to existing elements
    this.form = this.querySelector('#pain-form');
    this.painCards = this.querySelectorAll('.pain-card');
    this.submitButton = this.querySelector('#pain-form-submit') || document.querySelector('#pain-form-submit');

    // Setup interactions
    this.setupCardInteractions();

    // Setup form submission handling if submit button exists
    if (this.submitButton) {
      this.setupFormHandling();
    }
  }

  disconnectedCallback() {
    // Clean up event listeners when element is removed
    if (this.submitButton) {
      this.submitButton.removeEventListener('click', this.handleSubmit);
    }

    this.painCards.forEach((card) => {
      card.removeEventListener('click', this.handleCardClick);

      const content = card.querySelector('.pain-card-content');
      if (content) {
        content.removeEventListener('focus', this.handleCardFocus);
        content.removeEventListener('blur', this.handleCardBlur);
        content.removeEventListener('keydown', this.handleCardKeydown);
      }

      const checkboxes = card.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((checkbox) => {
        checkbox.removeEventListener('change', this.handleCheckboxChange);
      });
    });
  }

  setupCardInteractions() {
    // Define event handlers with proper context binding
    this.handleCardClick = this.handleCardClick.bind(this);
    this.handleCardFocus = this.handleCardFocus.bind(this);
    this.handleCardBlur = this.handleCardBlur.bind(this);
    this.handleCardKeydown = this.handleCardKeydown.bind(this);
    this.handleCheckboxChange = this.handleCheckboxChange.bind(this);

    // Add event listeners to all pain cards
    this.painCards.forEach((card) => {
      // Handle click to set active state
      card.addEventListener('click', this.handleCardClick);

      // Add focus handlers to the focusable content inside card
      const content = card.querySelector('.pain-card-content');
      if (content) {
        content.addEventListener('focus', this.handleCardFocus);
        content.addEventListener('blur', this.handleCardBlur);
        content.addEventListener('keydown', this.handleCardKeydown);
      }

      // Add listeners to checkboxes
      const checkboxes = card.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach((checkbox) => {
        checkbox.addEventListener('change', this.handleCheckboxChange);
      });
    });
  }

  handleCardClick(event) {
    // Only handle clicks on the card itself, not on checkboxes
    if (!event.target.closest('.pain-option')) {
      const card = event.currentTarget;
      this.setActiveCard(card);
    }
  }

  setActiveCard(card) {
    // Remove active class from previous active card (if any)
    if (this.activeCard && this.activeCard !== card) {
      this.activeCard.classList.remove('is-active');
    }

    // Set the new card as active
    card.classList.add('is-active');
    this.activeCard = card;
  }

  // handleCheckboxChange(event) {
  //   // Get the parent fieldset
  //   const card = event.target.closest('.pain-card');

  //   // If a checkbox is checked, make the card active
  //   if (event.target.checked) {
  //     this.setActiveCard(card);
  //   } else {
  //     // Check if any checkbox in this card is still checked
  //     const hasCheckedBox = Array.from(card.querySelectorAll('input[type="checkbox"]')).some(
  //       (checkbox) => checkbox.checked,
  //     );

  //     // If no checkboxes are checked, remove active state
  //     if (!hasCheckedBox) {
  //       card.classList.remove('is-active');

  //       // If this was the active card, clear the active card reference
  //       if (this.activeCard === card) {
  //         this.activeCard = null;
  //       }
  //     }
  //   }
  // }

  handleCheckboxChange(event) {
    // Get the parent fieldset
    const card = event.target.closest('.pain-card');

    // Special handling for "No Foot Pain" option
    if (card.hasAttribute('data-no-pain') && event.target.checked) {
      // Clear all other selections when "No Foot Pain" is checked
      this.painCards.forEach((otherCard) => {
        if (otherCard !== card) {
          // Uncheck all checkboxes in other cards
          const checkboxes = otherCard.querySelectorAll('input[type="checkbox"]');
          checkboxes.forEach((checkbox) => {
            checkbox.checked = false;
          });

          // Remove active state
          otherCard.classList.remove('is-active');
        }
      });

      // Set the "No Foot Pain" card as active
      this.setActiveCard(card);
      return;
    }

    // For other pain areas, uncheck "No Foot Pain" if it's checked
    if (event.target.checked) {
      const noPainCard = this.querySelector('[data-no-pain="true"]');
      if (noPainCard) {
        const noPainCheckbox = noPainCard.querySelector('input[type="checkbox"]');
        if (noPainCheckbox && noPainCheckbox.checked) {
          noPainCheckbox.checked = false;
          noPainCard.classList.remove('is-active');
        }
      }

      // Set this card as active
      this.setActiveCard(card);
    } else {
      // Check if any checkbox in this card is still checked
      const hasCheckedBox = Array.from(card.querySelectorAll('input[type="checkbox"]')).some(
        (checkbox) => checkbox.checked,
      );

      // If no checkboxes are checked, remove active state
      if (!hasCheckedBox) {
        card.classList.remove('is-active');

        // If this was the active card, clear the active card reference
        if (this.activeCard === card) {
          this.activeCard = null;
        }
      }
    }
  }

  handleCardFocus(event) {
    // Add focus style to card
    const card = event.currentTarget.closest('.pain-card');
    const focusIndicator = card.querySelector('.card-focus-indicator');
    if (focusIndicator) {
      focusIndicator.classList.add('border-yellow-400');
    }
  }

  handleCardBlur(event) {
    // Remove focus style from card
    const card = event.currentTarget.closest('.pain-card');
    const focusIndicator = card.querySelector('.card-focus-indicator');
    if (focusIndicator) {
      focusIndicator.classList.remove('border-yellow-400');
    }
  }

  handleCardKeydown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const card = event.currentTarget.closest('.pain-card');
      this.setActiveCard(card);
    }
  }

  setupFormHandling() {
    this.handleSubmit = this.handleSubmit.bind(this);
    this.submitButton.addEventListener('click', this.handleSubmit);
  }

  handleSubmit(event) {
    // Prevent default form submission if needed
    event.preventDefault();

    // Collect form data
    const formData = new FormData(this.form);
    const painSelections = {};

    // Process the form data
    for (const [name, value] of formData.entries()) {
      painSelections[name] = value === 'on';
    }

    // Store selections in localStorage for persistence between pages
    localStorage.setItem('painSelections', JSON.stringify(painSelections));

    // Dispatch a custom event that parent components can listen for
    const submitEvent = new CustomEvent('pain-form-submitted', {
      detail: { painSelections },
      bubbles: true,
    });
    this.dispatchEvent(submitEvent);

    // Log for debugging
    console.log('Pain selections:', painSelections);
  }
}

window.customElements.define('pain-card-form', PainCardForm);
