class CartRemoveButton extends HTMLElement {
  constructor() {
    super();

    this.addEventListener('click', (event) => {
      event.preventDefault();
      const cartItems = this.closest('cart-items') || this.closest('cart-drawer-items');
      cartItems.updateQuantity(this.dataset.index, 0, event);
    });
  }
}

customElements.define('cart-remove-button', CartRemoveButton);

class CartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement =
      document.getElementById('shopping-cart-line-item-status') || document.getElementById('CartDrawer-LineItemStatus');

    const debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, ON_CHANGE_DEBOUNCE_TIMER);

    this.addEventListener('change', debouncedOnChange.bind(this));
  }

  cartUpdateUnsubscriber = undefined;

  connectedCallback() {
    this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
      if (event.source === 'cart-items') {
        return;
      }
      return this.onCartUpdate();
    });
  }

  disconnectedCallback() {
    if (this.cartUpdateUnsubscriber) {
      this.cartUpdateUnsubscriber();
    }
  }

  resetQuantityInput(id) {
    const input = this.querySelector(`#Quantity-${id}`);
    if (input) {
      input.value = input.getAttribute('value');
      this.isEnterPressed = false;
    }
  }

  setValidity(event, index, message) {
    event.target.setCustomValidity(message);
    event.target.reportValidity();
    this.resetQuantityInput(index);
    event.target.select();
  }

  // Function to re-inject quiz link from data attribute
  reInjectQuizLink() {
    // Get the retake quiz URL from the cart-items data attribute
    const retakeUrl = document.body.getAttribute('data-retake-quiz-url');

    if (!retakeUrl) {
      console.log('No retake quiz URL found in data attribute');
      return;
    }

    // Find the cart customization section
    const cartCustomization = document.querySelector('.cart-item__customization');

    if (!cartCustomization) {
      console.log('No cart customization section found');
      return;
    }

    // Remove existing link if it exists
    const existingLink = cartCustomization.querySelector('.retake-quiz-link');
    if (existingLink) {
      existingLink.remove();
    }

    // Create new link element
    const quizLink = document.createElement('a');
    quizLink.className = 'retake-quiz-link';
    quizLink.href = retakeUrl;
    quizLink.textContent = 'Edit';

    // Insert the link into the customization element
    cartCustomization.appendChild(quizLink);
    console.log('Injected quiz link with URL:', retakeUrl);
  }

  validateQuantity(event) {
    const inputValue = parseInt(event.target.value);
    const index = event.target.dataset.index;
    let message = '';

    if (inputValue < event.target.dataset.min) {
      message = window.quickOrderListStrings.min_error.replace('[min]', event.target.dataset.min);
    } else if (inputValue > parseInt(event.target.max)) {
      message = window.quickOrderListStrings.max_error.replace('[max]', event.target.max);
    } else if (inputValue % parseInt(event.target.step) !== 0) {
      message = window.quickOrderListStrings.step_error.replace('[step]', event.target.step);
    }

    if (message) {
      this.setValidity(event, index, message);
    } else {
      event.target.setCustomValidity('');
      event.target.reportValidity();
      this.updateQuantity(
        index,
        inputValue,
        event,
        document.activeElement.getAttribute('name'),
        event.target.dataset.quantityVariantId,
      );
    }
  }

  onChange(event) {
    // Only run quantity validation on actual quantity inputs
    if (event.target.id && event.target.id.startsWith('Quantity-')) {
      this.validateQuantity(event);
      return;
    }

    // Distinguish between variant and selling plan radios
    if (event.target.type === 'radio') {
      // Check if this is a selling plan radio (has data-radio-type)
      const isSellingPlanRadio =
        event.target.dataset.radioType === 'selling_plan' || event.target.dataset.radioType === 'one_time_purchase';

      // Check if this is a variant radio (has variant-id but NO radio-type)
      const isVariantRadio = event.target.dataset.variantId && !isSellingPlanRadio;

      if (isSellingPlanRadio) {
        console.log('🔘 Selling plan radio - letting SellingPlanSelector handle it');
        return; // EXIT - don't call handleVariantChange!
      }

      if (isVariantRadio) {
        console.log('🔘 Variant radio - handling size change');
        this.handleVariantChange(event);
        return;
      }
    }
  }

  // Get current cart state
  async getCurrentCart() {
    try {
      const response = await fetch(routes.cart_url + '.js');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching cart:', error);
      return null;
    }
  }

  // Handle line item variant change
  async handleVariantChange(event) {
    const radioInput = event.target;
    const cartItem = radioInput.closest('.cart-item');

    if (!cartItem) {
      console.error('Could not find cart item');
      return;
    }

    if (cartItem.dataset.updating === 'true') {
      console.log('Cart item is already updating, ignoring change');
      return;
    }

    const fieldset = radioInput.closest('fieldset');
    const fieldsetId = fieldset.id;

    // Get the OLD line key from fieldset ID as fallback
    const fallbackLineKey = fieldsetId.split('-')[1];

    // Get variant ID directly from data attribute
    const newVariantId = radioInput.dataset.variantId;

    // Use your existing method to get fresh cart
    const currentCart = await this.getCurrentCart();

    if (!currentCart) {
      console.error('Failed to get current cart');
      return;
    }

    // First try to find by the fallback line key
    let currentItem = currentCart.items.find((item) => item.key === fallbackLineKey);

    // If not found by line key, find the first item (assuming single item cart for now)
    if (!currentItem) {
      console.log('Line key not found, using first cart item as fallback');
      currentItem = currentCart.items[0];
    }

    const lineKey = currentItem ? currentItem.key : fallbackLineKey;
    const currentQuantity = 1;

    // *** KEY FIX: Use fresh cart properties instead of DOM data ***
    const properties = currentItem ? currentItem.properties : {};

    console.log('Variant change detected:', {
      lineKey,
      newVariantId,
      currentItem: currentItem ? { key: currentItem.key, variant_id: currentItem.variant_id } : null,
      selectedOption: radioInput.value,
      properties, // This will now have the latest shoe type changes
    });

    // Dispatch event BEFORE updating cart so selling-plan-selector can prepare
    cartItem.dispatchEvent(
      new CustomEvent('variant-changed', {
        bubbles: true,
        detail: {
          variant: {
            id: newVariantId,
            // Add more variant data if available from currentItem
            title: radioInput.value,
            option1: radioInput.value,
          },
        },
      }),
    );

    this.updateVariant(lineKey, newVariantId, currentQuantity, cartItem, properties);
  }

  getLineItemProperties(cartItem) {
    const propertiesData = cartItem.dataset.properties;

    if (!propertiesData || propertiesData === '{}') {
      return {};
    }

    try {
      // First decode HTML entities before parsing JSON
      const decodedData = this.decodeHTMLEntities(propertiesData);
      console.log('Original properties data:', propertiesData);
      console.log('Decoded properties data:', decodedData);

      const parsedData = JSON.parse(decodedData);

      // Check if it's an array of arrays (Shopify's default format)
      if (Array.isArray(parsedData)) {
        // Convert array of arrays to object
        const propertiesObject = {};
        parsedData.forEach(([key, value]) => {
          // Decode HTML entities in both key and value
          const cleanKey = this.decodeHTMLEntities(key);
          const cleanValue = this.decodeHTMLEntities(value);
          propertiesObject[cleanKey] = cleanValue;
        });
        return propertiesObject;
      }

      // If it's already an object, decode HTML entities in values
      const cleanedProperties = {};
      Object.entries(parsedData).forEach(([key, value]) => {
        const cleanKey = this.decodeHTMLEntities(key);
        const cleanValue = this.decodeHTMLEntities(value);
        cleanedProperties[cleanKey] = cleanValue;
      });

      return cleanedProperties;
    } catch (e) {
      console.error('Error parsing properties from data attribute:', e);
      console.error('Raw properties data:', propertiesData);
      return {};
    }
  }

  // Add this helper method to decode HTML entities
  decodeHTMLEntities(text) {
    if (typeof text !== 'string') {
      return text;
    }

    // Create a temporary element to decode HTML entities
    const textArea = document.createElement('textarea');
    textArea.innerHTML = text;
    return textArea.value;
  }

  /**
   * Both updateVariant methods are working.
   * The first one is the one that's in production.
   * The second one is the one that's in the dev.
   *
   */
  // Update variant/cart
  // async updateVariant(lineKey, newVariantId, quantity, cartItem, properties = {}) {
  //   // Check if already updating to prevent race conditions
  //   if (cartItem.dataset.updating === 'true') {
  //     console.log('Update already in progress, skipping');
  //     return;
  //   }

  //   // Set updating flag
  //   cartItem.dataset.updating = 'true';

  //   // Find loading elements
  //   const loadingSpinners = cartItem?.querySelectorAll('.loading__spinner');
  //   const priceWrappers = cartItem?.querySelectorAll('.cart-item__price-wrapper');
  //   const variantLoadingSpinner = cartItem.querySelector('.variant-loading__spinner');
  //   const radioButtons = cartItem.querySelectorAll('input[type="radio"]');

  //   try {
  //     // Show loading state
  //     loadingSpinners?.forEach((spinner) => spinner.classList.remove('hidden'));
  //     priceWrappers?.forEach((wrapper) => wrapper.classList.add('hidden'));

  //     if (variantLoadingSpinner) {
  //       variantLoadingSpinner.classList.remove('hidden');
  //     }

  //     // Disable radio buttons
  //     radioButtons.forEach((radio) => {
  //       radio.disabled = true;
  //     });

  //     // Disable shoe type selectors
  //     this.disableShoeTypeSelectors();

  //     // Step 1: Get current cart state to find the item index
  //     const cartResponse = await fetch(routes.cart_url + '.js', {
  //       ...fetchConfig('javascript'),
  //       method: 'GET',
  //     });

  //     if (!cartResponse.ok) {
  //       throw new Error(`Failed to fetch cart: ${cartResponse.status}`);
  //     }

  //     const currentCart = await cartResponse.json();
  //     console.log('Current cart:', currentCart);

  //     // Step 2: Find the index of the item we're updating
  //     const itemIndex = currentCart.items.findIndex((item) => item.key === lineKey);

  //     if (itemIndex === -1) {
  //       throw new Error('Item not found in cart');
  //     }

  //     console.log(`Found item at index ${itemIndex}:`, currentCart.items[itemIndex]);

  //     // Step 3: Build new items array with the updated variant
  //     const newItems = currentCart.items.map((item, index) => {
  //       if (index === itemIndex) {
  //         // Replace this item with the new variant
  //         return {
  //           id: newVariantId,
  //           quantity: parseInt(quantity),
  //           properties: properties,
  //         };
  //       } else {
  //         // Keep existing items as-is
  //         return {
  //           id: item.variant_id,
  //           quantity: item.quantity,
  //           properties: item.properties || {},
  //         };
  //       }
  //     });

  //     // Reverse the items array to maintain correct order after cart/add.js
  //     const reversedItems = newItems.reverse();

  //     console.log('New items array (reversed):', reversedItems);

  //     // Step 4: Clear the entire cart
  //     const clearResponse = await fetch(routes.cart_clear_url, {
  //       ...fetchConfig('javascript'),
  //       method: 'POST',
  //     });

  //     if (!clearResponse.ok) {
  //       throw new Error(`Failed to clear cart: ${clearResponse.status}`);
  //     }

  //     console.log('Cart cleared successfully');

  //     // Step 5: Add all items back in the correct order (using reversed array)
  //     const addBody = JSON.stringify({
  //       items: reversedItems,
  //       sections: this.getSectionsToRender().map((section) => section.section),
  //       sections_url: window.location.pathname,
  //     });

  //     console.log('Adding items back to cart (reversed):', addBody);

  //     const addResponse = await fetch(routes.cart_add_url, {
  //       ...fetchConfig('javascript'),
  //       method: 'POST',
  //       body: addBody,
  //     });

  //     if (!addResponse.ok) {
  //       throw new Error(`Failed to add items back: ${addResponse.status}`);
  //     }

  //     const state = await addResponse.text();
  //     const parsedState = JSON.parse(state);

  //     console.log('Cart rebuilt successfully:', parsedState);

  //     // Step 6: Sync cart attributes with line item properties
  //     const attributesUpdatePayload = {
  //       attributes: {
  //         ...parsedState.attributes, // Keep existing attributes
  //         ...properties, // Overwrite with current line item properties
  //       },
  //     };

  //     console.log('Syncing cart attributes with line item properties:', attributesUpdatePayload);

  //     const attributesResponse = await fetch('/cart/update.js', {
  //       method: 'POST',
  //       headers: {
  //         'Content-Type': 'application/json',
  //       },
  //       body: JSON.stringify(attributesUpdatePayload),
  //     });

  //     if (!attributesResponse.ok) {
  //       console.error('Failed to sync cart attributes');
  //     } else {
  //       console.log('Cart attributes synced successfully');
  //     }

  //     // Verify the updated item has properties
  //     if (parsedState.items && parsedState.items[itemIndex]) {
  //       const updatedItem = parsedState.items[itemIndex];
  //       console.log(`Updated item at index ${itemIndex}:`, {
  //         variant_id: updatedItem.variant_id,
  //         properties: updatedItem.properties,
  //         key: updatedItem.key,
  //       });
  //     }

  //     if (parsedState.errors) {
  //       // Hide loading state on error
  //       loadingSpinners?.forEach((spinner) => spinner.classList.add('hidden'));
  //       priceWrappers?.forEach((wrapper) => wrapper.classList.remove('hidden'));

  //       if (variantLoadingSpinner) {
  //         variantLoadingSpinner.classList.add('hidden');
  //       }

  //       this.updateLiveRegions(lineKey, parsedState.errors);
  //       return;
  //     }

  //     // Update all sections
  //     this.getSectionsToRender().forEach((section) => {
  //       const elementToReplace =
  //         document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
  //       elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
  //     });

  //     // Re-inject quiz link after DOM update
  //     setTimeout(() => {
  //       this.reInjectQuizLink();
  //     }, 100);

  //     publish(PUB_SUB_EVENTS.cartUpdate, {
  //       source: 'cart-items',
  //       cartData: parsedState,
  //       variantId: newVariantId,
  //     });
  //   } catch (error) {
  //     console.error('Error during variant update:', {
  //       error,
  //       lineKey,
  //       newVariantId,
  //       quantity,
  //       properties,
  //     });

  //     // Hide loading state on error
  //     loadingSpinners?.forEach((spinner) => spinner.classList.add('hidden'));
  //     priceWrappers?.forEach((wrapper) => wrapper.classList.remove('hidden'));

  //     if (variantLoadingSpinner) {
  //       variantLoadingSpinner.classList.add('hidden');
  //     }

  //     // Re-enable radio buttons on error
  //     radioButtons.forEach((radio) => {
  //       radio.disabled = false;
  //     });

  //     // Re-enable ShoeTypeSelectors on error too
  //     this.enableShoeTypeSelectors();

  //     const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
  //     if (errors) {
  //       errors.textContent = window.cartStrings.error;
  //     }
  //   } finally {
  //     // Always clear the updating flag
  //     cartItem.dataset.updating = 'false';
  //   }
  // }

  // Update variant/cart - OPTIMIZED VERSION
  async updateVariant(lineKey, newVariantId, quantity, cartItem, properties = {}) {
    // Check if already updating to prevent race conditions
    if (cartItem.dataset.updating === 'true') {
      console.log('Update already in progress, skipping');
      return;
    }

    // Set updating flag
    cartItem.dataset.updating = 'true';

    // Find loading elements
    const loadingSpinners = cartItem?.querySelectorAll('.loading__spinner');
    const priceWrappers = cartItem?.querySelectorAll('.cart-item__price-wrapper');
    const variantLoadingSpinner = cartItem.querySelector('.variant-loading__spinner');
    const radioButtons = cartItem.querySelectorAll('input[type="radio"]');

    try {
      // Show loading state
      loadingSpinners?.forEach((spinner) => spinner.classList.remove('hidden'));
      priceWrappers?.forEach((wrapper) => wrapper.classList.add('hidden'));

      if (variantLoadingSpinner) {
        variantLoadingSpinner.classList.remove('hidden');
      }

      // Disable radio buttons
      radioButtons.forEach((radio) => {
        radio.disabled = true;
      });

      // Disable shoe type selectors
      this.disableShoeTypeSelectors();

      // Get current cart to check item count
      const cartResponse = await fetch(routes.cart_url + '.js', {
        ...fetchConfig('javascript'),
        method: 'GET',
      });

      if (!cartResponse.ok) {
        throw new Error(`Failed to fetch cart: ${cartResponse.status}`);
      }

      const currentCart = await cartResponse.json();
      console.log('Current cart:', currentCart);

      // Find the item we're updating
      const itemIndex = currentCart.items.findIndex((item) => item.key === lineKey);

      if (itemIndex === -1) {
        throw new Error('Item not found in cart');
      }

      const currentItem = currentCart.items[itemIndex];
      console.log('Found item to update:', currentItem);

      // Extract selling plan if it exists
      const currentSellingPlan = currentItem.selling_plan_allocation?.selling_plan?.id || null;
      console.log('Current selling plan:', currentSellingPlan);

      // CHECK: Are we changing to the SAME variant? (just selling plan change)
      if (currentItem.variant_id === parseInt(newVariantId)) {
        console.log('⚠️ Same variant detected - this is a selling plan change only, not a variant change');
        console.log('Skipping variant update - selling plan should be handled separately by selling-plan-selector');
        return; // Exit early - let the selling plan widget handle it
      }

      // OPTIMIZATION: Use change.js + add.js for faster updates
      // Step 1: Remove the old variant using change.js
      const removeBody = JSON.stringify({
        id: lineKey, // Use line key for precision
        quantity: 0, // Set to 0 to remove
      });

      console.log('Removing old variant:', removeBody);

      const removeResponse = await fetch(routes.cart_change_url, {
        ...fetchConfig('javascript'),
        method: 'POST',
        body: removeBody,
      });

      if (!removeResponse.ok) {
        const errorText = await removeResponse.text();
        console.error('Remove response error:', errorText);
        throw new Error(`Failed to remove old variant: ${removeResponse.status}`);
      }

      const removeState = await removeResponse.json();
      console.log('Old variant removed:', removeState);

      // Step 2: Add the new variant with properties AND selling plan
      const newItem = {
        id: newVariantId,
        quantity: parseInt(quantity),
        properties: properties,
      };

      // Include selling plan if one exists
      if (currentSellingPlan) {
        newItem.selling_plan = currentSellingPlan;
        console.log('Preserving selling plan:', currentSellingPlan);
      }

      const addBody = JSON.stringify({
        items: [newItem],
        sections: this.getSectionsToRender().map((section) => section.section),
        sections_url: window.location.pathname,
      });

      console.log('Adding new variant:', addBody);

      const addResponse = await fetch(routes.cart_add_url, {
        ...fetchConfig('javascript'),
        method: 'POST',
        body: addBody,
      });

      if (!addResponse.ok) {
        const errorText = await addResponse.text();
        console.error('Add response error:', errorText);
        throw new Error(`Failed to add new variant: ${addResponse.status}`);
      }

      const state = await addResponse.text();
      const parsedState = JSON.parse(state);

      console.log('New variant added successfully:', parsedState);

      // Step 3: Sync cart attributes with line item properties
      const attributesUpdatePayload = {
        attributes: {
          ...parsedState.attributes,
          ...properties,
        },
      };

      console.log('Syncing cart attributes with line item properties:', attributesUpdatePayload);

      const attributesResponse = await fetch('/cart/update.js', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(attributesUpdatePayload),
      });

      if (!attributesResponse.ok) {
        console.error('Failed to sync cart attributes');
      } else {
        console.log('Cart attributes synced successfully');
      }

      if (parsedState.errors) {
        loadingSpinners?.forEach((spinner) => spinner.classList.add('hidden'));
        priceWrappers?.forEach((wrapper) => wrapper.classList.remove('hidden'));
        if (variantLoadingSpinner) {
          variantLoadingSpinner.classList.add('hidden');
        }
        this.updateLiveRegions(lineKey, parsedState.errors);
        return;
      }

      // Update all sections
      this.getSectionsToRender().forEach((section) => {
        const elementToReplace =
          document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
        elementToReplace.innerHTML = this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
      });

      // Re-inject quiz link after DOM update
      setTimeout(() => {
        this.reInjectQuizLink();
      }, 100);

      publish(PUB_SUB_EVENTS.cartUpdate, {
        source: 'cart-items',
        cartData: parsedState,
        variantId: newVariantId,
      });
    } catch (error) {
      console.error('Error during variant update:', {
        error,
        lineKey,
        newVariantId,
        quantity,
        properties,
      });

      // Hide loading state on error
      loadingSpinners?.forEach((spinner) => spinner.classList.add('hidden'));
      priceWrappers?.forEach((wrapper) => wrapper.classList.remove('hidden'));

      if (variantLoadingSpinner) {
        variantLoadingSpinner.classList.add('hidden');
      }

      // Re-enable radio buttons on error
      radioButtons.forEach((radio) => {
        radio.disabled = false;
      });

      // Re-enable ShoeTypeSelectors on error
      this.enableShoeTypeSelectors();

      const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
      if (errors) {
        errors.textContent = window.cartStrings.error;
      }
    } finally {
      // Always clear the updating flag
      cartItem.dataset.updating = 'false';
    }
  }

  onCartUpdate() {
    if (this.tagName === 'CART-DRAWER-ITEMS') {
      return fetch(`${routes.cart_url}?section_id=cart-drawer`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const selectors = ['cart-drawer-items', '.cart-drawer__footer'];
          for (const selector of selectors) {
            const targetElement = document.querySelector(selector);
            const sourceElement = html.querySelector(selector);
            if (targetElement && sourceElement) {
              targetElement.replaceWith(sourceElement);
            }
          }
        })
        .catch((e) => {
          console.error(e);
        });
    } else {
      return fetch(`${routes.cart_url}?section_id=main-cart`)
        .then((response) => response.text())
        .then((responseText) => {
          const html = new DOMParser().parseFromString(responseText, 'text/html');
          const sourceQty = html.querySelector('cart-items');
          this.innerHTML = sourceQty.innerHTML;
        })
        .catch((e) => {
          console.error(e);
        });
    }
  }

  getSectionsToRender() {
    return [
      {
        id: 'main-cart', // this finds a el with the id of main-cart-items, it's not the reference to the section nameitems
        section: document.getElementById('main-cart').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section',
      },
      {
        id: 'cart-live-region-text',
        section: 'cart-live-region-text',
        selector: '.shopify-section',
      },
    ];
  }

  updateQuantity(line, quantity, event, name, variantId) {
    this.enableLoading(line);

    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname,
    });
    const eventTarget = event.currentTarget instanceof CartRemoveButton ? 'clear' : 'change';

    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), ...{ body } })
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);

        CartPerformance.measure(`${eventTarget}:paint-updated-sections"`, () => {
          const quantityElement =
            document.getElementById(`Quantity-${line}`) || document.getElementById(`Drawer-quantity-${line}`);
          const items = document.querySelectorAll('.cart-item');

          if (parsedState.errors) {
            quantityElement.value = quantityElement.getAttribute('value');
            this.updateLiveRegions(line, parsedState.errors);
            return;
          }

          this.classList.toggle('is-empty', parsedState.item_count === 0);
          const cartDrawerWrapper = document.querySelector('cart-drawer');
          const cartFooter = document.getElementById('main-cart-footer');

          if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
          if (cartDrawerWrapper) cartDrawerWrapper.classList.toggle('is-empty', parsedState.item_count === 0);

          this.getSectionsToRender().forEach((section) => {
            const elementToReplace =
              document.getElementById(section.id).querySelector(section.selector) ||
              document.getElementById(section.id);
            elementToReplace.innerHTML = this.getSectionInnerHTML(
              parsedState.sections[section.section],
              section.selector,
            );
          });
          const updatedValue = parsedState.items[line - 1] ? parsedState.items[line - 1].quantity : undefined;
          let message = '';
          if (items.length === parsedState.items.length && updatedValue !== parseInt(quantityElement.value)) {
            if (typeof updatedValue === 'undefined') {
              message = window.cartStrings.error;
            } else {
              message = window.cartStrings.quantityError.replace('[quantity]', updatedValue);
            }
          }
          this.updateLiveRegions(line, message);

          const lineItem =
            document.getElementById(`CartItem-${line}`) || document.getElementById(`CartDrawer-Item-${line}`);
          if (lineItem && lineItem.querySelector(`[name="${name}"]`)) {
            cartDrawerWrapper
              ? trapFocus(cartDrawerWrapper, lineItem.querySelector(`[name="${name}"]`))
              : lineItem.querySelector(`[name="${name}"]`).focus();
          } else if (parsedState.item_count === 0 && cartDrawerWrapper) {
            trapFocus(cartDrawerWrapper.querySelector('.drawer__inner-empty'), cartDrawerWrapper.querySelector('a'));
          } else if (document.querySelector('.cart-item') && cartDrawerWrapper) {
            trapFocus(cartDrawerWrapper, document.querySelector('.cart-item__name'));
          }
        });

        CartPerformance.measureFromEvent(`${eventTarget}:user-action`, event);

        publish(PUB_SUB_EVENTS.cartUpdate, { source: 'cart-items', cartData: parsedState, variantId: variantId });
      })
      .catch(() => {
        this.querySelectorAll('.loading__spinner').forEach((overlay) => overlay.classList.add('hidden'));
        const errors = document.getElementById('cart-errors') || document.getElementById('CartDrawer-CartErrors');
        errors.textContent = window.cartStrings.error;
      })
      .finally(() => {
        this.disableLoading(line);
      });
  }

  updateLiveRegions(line, message) {
    const lineItemError =
      document.getElementById(`Line-item-error-${line}`) || document.getElementById(`CartDrawer-LineItemError-${line}`);
    if (lineItemError) lineItemError.querySelector('.cart-item__error-text').textContent = message;

    this.lineItemStatusElement.setAttribute('aria-hidden', true);

    const cartStatus =
      document.getElementById('cart-live-region-text') || document.getElementById('CartDrawer-LiveRegionText');
    cartStatus.setAttribute('aria-hidden', false);

    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }

  getSectionInnerHTML(html, selector) {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  enableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.add('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    [...cartItemElements, ...cartDrawerItemElements].forEach((overlay) => overlay.classList.remove('hidden'));

    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }

  disableLoading(line) {
    const mainCartItems = document.getElementById('main-cart-items') || document.getElementById('CartDrawer-CartItems');
    mainCartItems.classList.remove('cart__items--disabled');

    const cartItemElements = this.querySelectorAll(`#CartItem-${line} .loading__spinner`);
    const cartDrawerItemElements = this.querySelectorAll(`#CartDrawer-Item-${line} .loading__spinner`);

    cartItemElements.forEach((overlay) => overlay.classList.add('hidden'));
    cartDrawerItemElements.forEach((overlay) => overlay.classList.add('hidden'));
  }

  disableShoeTypeSelectors() {
    const shoeTypeUpdater = document.querySelector('shoe-type-cart-updater');
    if (shoeTypeUpdater) {
      // Disable all selects
      const selects = shoeTypeUpdater.querySelectorAll('.shoe-type-dropdown select');
      selects.forEach((select) => {
        select.disabled = true;
      });

      // Add loading indicator
      //   const loadingIndicator = document.createElement('div');
      //   loadingIndicator.className = 'shoe-type-loading';
      //   loadingIndicator.innerHTML = `
      //   <div class="flex items-center justify-center p-2 text-sm text-gray-500 mt-2">
      //     <svg class="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
      //       <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      //       <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      //     </svg>
      //     Updating cart...
      //   </div>
      // `;
      //   shoeTypeUpdater.appendChild(loadingIndicator);

      console.log('Disabled shoe type selectors during variant update');
    }
  }

  enableShoeTypeSelectors() {
    const shoeTypeUpdater = document.querySelector('shoe-type-cart-updater');
    if (shoeTypeUpdater) {
      // Enable all selects
      const selects = shoeTypeUpdater.querySelectorAll('.shoe-type-dropdown select');
      selects.forEach((select) => {
        select.disabled = false;
      });

      // Remove loading indicator
      const loadingIndicator = shoeTypeUpdater.querySelector('.shoe-type-loading');
      if (loadingIndicator) {
        loadingIndicator.remove();
      }

      console.log('Re-enabled shoe type selectors after variant update');
    }
  }
}

customElements.define('cart-items', CartItems);

if (!customElements.get('cart-note')) {
  customElements.define(
    'cart-note',
    class CartNote extends HTMLElement {
      constructor() {
        super();

        this.addEventListener(
          'input',
          debounce((event) => {
            const body = JSON.stringify({ note: event.target.value });
            fetch(`${routes.cart_update_url}`, { ...fetchConfig(), ...{ body } }).then(() =>
              CartPerformance.measureFromEvent('note-update:user-action', event),
            );
          }, ON_CHANGE_DEBOUNCE_TIMER),
        );
      }
    },
  );
}

class CartDiscount extends HTMLElement {
  constructor() {
    super();
    this.form = null;
    this.input = null;
    this.submitButton = null;
    this.errorContainer = null;
    this.successContainer = null;
    this.appliedDiscountsContainer = null;
    this.debug = true; // Enable logging
  }

  log(...args) {
    if (this.debug) {
      console.log('[CartDiscount]', ...args);
    }
  }

  connectedCallback() {
    this.log('Component connected');
    this.initializeElements();
    this.attachEventListeners();
  }

  initializeElements() {
    this.form = this.querySelector('.discount-form');
    this.input = this.querySelector('.discount-input');
    this.submitButton = this.querySelector('.discount-submit');
    this.errorContainer = this.querySelector('.discount-error');
    this.successContainer = this.querySelector('.discount-success');
    this.appliedDiscountsContainer = this.querySelector('.applied-discounts');

    this.log('Elements initialized:', {
      form: !!this.form,
      input: !!this.input,
      submitButton: !!this.submitButton,
      errorContainer: !!this.errorContainer,
      successContainer: !!this.successContainer,
      appliedDiscountsContainer: !!this.appliedDiscountsContainer,
    });
  }

  attachEventListeners() {
    if (this.form) {
      this.form.addEventListener('submit', this.handleSubmit.bind(this));
    }

    // Listen for remove discount button clicks (event delegation)
    if (this.appliedDiscountsContainer) {
      this.appliedDiscountsContainer.addEventListener('click', this.handleRemoveDiscount.bind(this));
    }

    // Listen for cart updates from other components
    document.addEventListener('cart:updated', this.handleCartUpdate.bind(this));

    this.log('Event listeners attached');
  }

  async getCurrentCart() {
    try {
      this.log('Fetching current cart...');
      const response = await fetch('/cart.js');
      const cart = await response.json();
      this.log('Current cart fetched:', cart);
      return cart;
    } catch (error) {
      this.log('Error fetching current cart:', error);
      throw error;
    }
  }

  async handleSubmit(event) {
    event.preventDefault();

    const discountCode = this.input.value.trim();
    if (!discountCode) {
      this.showError('Please enter a discount code');
      return;
    }

    this.log('Applying discount code:', discountCode);
    this.setLoadingState(true);
    this.hideMessages();

    try {
      // Get current cart to check existing discounts
      const currentCart = await this.getCurrentCart();

      // Get existing discount codes from the cart
      const existingDiscountCodes = (currentCart.discount_codes || [])
        .filter((discount) => discount && discount.code)
        .map((discount) => discount.code);

      this.log('Existing discount codes:', existingDiscountCodes);

      // Check if discount already exists
      if (existingDiscountCodes.some((code) => code && code.toLowerCase() === discountCode.toLowerCase())) {
        this.showError('This discount code is already applied');
        return;
      }

      // Combine existing and new discount codes
      const allDiscountCodes = [...existingDiscountCodes, discountCode];
      const discountString = allDiscountCodes.join(',');

      this.log('Applying discount string:', discountString);

      const response = await this.applyDiscount(discountString);
      this.log('Apply discount response status:', response.status);

      if (response.ok) {
        const cartData = await response.json();
        this.log('Cart data after applying discount:', cartData);

        // Add a small delay to ensure Shopify processes the discount
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Fetch updated cart to get the latest state
        const updatedCart = await this.getCurrentCart();
        this.log('Updated cart after delay:', updatedCart);

        // Check the status of the newly added discount code
        const newDiscountEntry = (updatedCart.discount_codes || []).find(
          (discount) => discount && discount.code && discount.code.toLowerCase() === discountCode.toLowerCase(),
        );

        this.log('New discount entry:', newDiscountEntry);

        if (newDiscountEntry) {
          if (newDiscountEntry.applicable === true) {
            // Discount was successfully applied
            this.showSuccess(`Discount "${discountCode}" applied successfully!`);
            this.input.value = '';

            // Use cart_level_discount_applications for display (shows savings amounts)
            const discountApplications = updatedCart.cart_level_discount_applications || [];
            this.updateDiscountDisplay(discountApplications);

            // Trigger cart update event for other components
            this.dispatchCartUpdateEvent(updatedCart);
          } else {
            // Discount code exists but is not applicable
            // Need to determine if it's invalid or conflicting with existing discounts
            this.log('Discount code not applicable, determining reason...');

            // Check if we had existing applicable codes before this attempt
            const hadExistingDiscounts = existingApplicableCodes.length > 0;

            if (hadExistingDiscounts) {
              // There were existing discounts, so this is likely a conflict
              this.showError(`"${discountCode}" couldn't be used with your existing discounts`);
            } else {
              // No existing discounts, so the code is likely invalid
              this.showError('Discount code is not valid');
            }

            // Remove the non-applicable discount code to keep cart clean
            const cleanDiscountCodes = (updatedCart.discount_codes || [])
              .filter((discount) => discount && discount.code && discount.applicable === true)
              .map((discount) => discount.code);

            const cleanDiscountString = cleanDiscountCodes.join(',');
            this.log('Cleaning cart with applicable discounts only:', cleanDiscountString);

            // Apply only the applicable discounts
            await this.applyDiscount(cleanDiscountString);
          }
        } else {
          // Discount code was rejected completely
          this.showError('Discount code is not valid');
        }
      } else {
        const errorData = await response.json();
        this.log('Error response:', errorData);
        this.showError(errorData.message || 'Invalid discount code');
      }
    } catch (error) {
      this.log('Error applying discount:', error);
      this.showError('Something went wrong. Please try again.');
    } finally {
      this.setLoadingState(false);
    }
  }

  async handleRemoveDiscount(event) {
    if (!event.target.closest('.remove-discount')) return;

    event.preventDefault();

    const button = event.target.closest('.remove-discount');
    const discountCode = button.dataset.discountCode;

    this.log('Removing discount code:', discountCode);
    this.setLoadingState(true);
    this.hideMessages();

    try {
      // Get current cart
      const currentCart = await this.getCurrentCart();
      this.log('Current cart for removal:', currentCart);

      // Get current applied discount codes from cart_level_discount_applications
      const currentAppliedCodes = (currentCart.cart_level_discount_applications || [])
        .filter((discount) => discount && discount.title)
        .map((discount) => discount.title);

      this.log('Current applied discount codes for removal:', currentAppliedCodes);

      if (currentAppliedCodes.length === 0) {
        this.log('No applied discount codes found to remove');
        this.showError('No discounts found to remove');
        return;
      }

      // Filter out the discount to remove (case-insensitive)
      const remainingDiscounts = currentAppliedCodes.filter(
        (code) => code.toLowerCase() !== discountCode.toLowerCase(),
      );

      this.log('Remaining discounts after filter:', remainingDiscounts);

      // Apply remaining discounts (or empty string to remove all)
      const discountString = remainingDiscounts.length > 0 ? remainingDiscounts.join(',') : '';
      this.log('Applying remaining discount string:', discountString);

      const response = await this.applyDiscount(discountString);
      this.log('Remove discount response status:', response.status);

      if (response.ok) {
        const cartData = await response.json();
        this.log('Cart data after removing discount:', cartData);

        // Add a small delay to ensure Shopify processes the change
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Fetch updated cart to get the latest state
        const updatedCart = await this.getCurrentCart();
        this.log('Updated cart after removal delay:', updatedCart);

        this.showSuccess(`Discount "${discountCode}" removed successfully!`);

        // Use cart_level_discount_applications for display
        const discountApplications = updatedCart.cart_level_discount_applications || [];
        this.updateDiscountDisplay(discountApplications);

        // Trigger cart update event for other components
        this.dispatchCartUpdateEvent(updatedCart);
      } else {
        const errorData = await response.json();
        this.log('Error removing discount:', errorData);
        this.showError('Failed to remove discount code');
      }
    } catch (error) {
      this.log('Error removing discount:', error);
      this.showError('Something went wrong. Please try again.');
    } finally {
      this.setLoadingState(false);
    }
  }

  async applyDiscount(discountCode) {
    this.log('Making API call to apply discount:', discountCode);

    const requestBody = {
      discount: discountCode,
    };

    this.log('Request body:', requestBody);

    return fetch('/cart/update.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
  }

  updateDiscountDisplay(discountApplications) {
    this.log('Updating discount display with:', discountApplications);

    if (!this.appliedDiscountsContainer) {
      this.log('No applied discounts container found');
      return;
    }

    // Clear existing discount pills
    this.appliedDiscountsContainer.innerHTML = '';

    // Add new discount pills
    if (discountApplications && Array.isArray(discountApplications)) {
      discountApplications.forEach((discount) => {
        this.log('Creating pill for discount:', discount);
        const discountPill = this.createDiscountPill(discount);
        this.appliedDiscountsContainer.appendChild(discountPill);
      });
    } else {
      this.log('No valid discount applications to display');
    }
  }

  createDiscountPill(discount) {
    const pill = document.createElement('div');
    pill.className =
      'discount-pill bg-green-50 border border-green-200 rounded-full px-3 py-1 flex items-center justify-between text-sm';

    pill.innerHTML = `
      <div class="flex items-center space-x-2">
        <svg class="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
        </svg>
        <span class="font-medium text-green-800">${this.escapeHtml(discount.title)}</span>
        <span class="text-green-600">-${this.formatMoney(discount.total_allocated_amount)}</span>
      </div>
      <button 
        type="button" 
        class="remove-discount ml-2 text-green-600 hover:text-green-800 focus:outline-none"
        data-discount-code="${this.escapeHtml(discount.title)}"
        aria-label="Remove discount ${this.escapeHtml(discount.title)}"
      >
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
        </svg>
      </button>
    `;

    return pill;
  }

  setLoadingState(loading) {
    this.log('Setting loading state:', loading);

    if (!this.submitButton) return;

    const submitText = this.submitButton.querySelector('.submit-text');
    const loadingText = this.submitButton.querySelector('.loading-text');

    if (loading) {
      this.submitButton.disabled = true;
      this.input.disabled = true;
      if (submitText) submitText.classList.add('hidden');
      if (loadingText) loadingText.classList.remove('hidden');
    } else {
      this.submitButton.disabled = false;
      this.input.disabled = false;
      if (submitText) submitText.classList.remove('hidden');
      if (loadingText) loadingText.classList.add('hidden');
    }
  }

  showError(message) {
    this.log('Showing error:', message);

    if (!this.errorContainer) return;

    const errorMessage = this.errorContainer.querySelector('.error-message');
    if (errorMessage) {
      errorMessage.textContent = message;
    }
    this.errorContainer.classList.remove('hidden');

    // Hide after 5 seconds
    setTimeout(() => {
      this.hideMessages();
    }, 5000);
  }

  showSuccess(message) {
    this.log('Showing success:', message);

    if (!this.successContainer) return;

    const successMessage = this.successContainer.querySelector('.success-message');
    if (successMessage) {
      successMessage.textContent = message;
    }
    this.successContainer.classList.remove('hidden');

    // Hide after 3 seconds
    setTimeout(() => {
      this.hideMessages();
    }, 3000);
  }

  hideMessages() {
    if (this.errorContainer) {
      this.errorContainer.classList.add('hidden');
    }
    if (this.successContainer) {
      this.successContainer.classList.add('hidden');
    }
  }

  handleCartUpdate(event) {
    this.log('Handling cart update event:', event.detail);

    // Handle cart updates from other components
    if (event.detail && event.detail.cart) {
      // Use cart_level_discount_applications for display
      const discountApplications = event.detail.cart.cart_level_discount_applications || [];
      this.updateDiscountDisplay(discountApplications);
    }
  }

  dispatchCartUpdateEvent(cartData) {
    this.log('Dispatching cart update event with:', cartData);

    // Update order summary sections using section rendering (like cart-items does)
    this.updateOrderSummarySections(cartData);

    // Dispatch custom event for other components to listen to
    const event = new CustomEvent('cart:updated', {
      detail: { cart: cartData },
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  async updateOrderSummarySections(cartData) {
    try {
      this.log('Updating order summary sections...');

      // Get the section ID from the cart element (same pattern as cart-items)
      const mainCart = document.getElementById('main-cart');
      const sectionId = mainCart ? mainCart.dataset.id : 'main-cart';

      // Fetch the updated cart section HTML
      const response = await fetch(`/cart?section_id=${sectionId}`);
      const responseText = await response.text();
      const html = new DOMParser().parseFromString(responseText, 'text/html');

      // Define sections to update (similar to cart-items getSectionsToRender)
      const sectionsToUpdate = [
        {
          selector: '.js-contents',
          sourceSelector: '.js-contents',
        },
        // {
        //   selector: '.totals',
        //   sourceSelector: '.totals',
        // },
        {
          selector: '#cart-icon-bubble',
          sourceSelector: '#cart-icon-bubble',
          replaceEntire: true,
        },
      ];

      // Update each section
      sectionsToUpdate.forEach((section) => {
        const targetElement = document.querySelector(section.selector);
        const sourceElement = html.querySelector(section.sourceSelector);

        if (targetElement && sourceElement) {
          if (section.replaceEntire) {
            targetElement.replaceWith(sourceElement);
          } else {
            targetElement.innerHTML = sourceElement.innerHTML;
          }
          this.log(`Updated section: ${section.selector}`);
        } else {
          this.log(`Could not find elements for section: ${section.selector}`, {
            targetFound: !!targetElement,
            sourceFound: !!sourceElement,
          });
        }
      });
    } catch (error) {
      this.log('Error updating order summary sections:', error);
    }
  }

  // Utility functions
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  formatMoney(cents) {
    // Basic money formatting - you might want to use Shopify's money filters
    const amount = cents / 100;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: window.Shopify?.currency?.active || 'USD',
    }).format(amount);
  }

  disconnectedCallback() {
    this.log('Component disconnected');

    // Clean up event listeners if needed
    if (this.form) {
      this.form.removeEventListener('submit', this.handleSubmit);
    }

    document.removeEventListener('cart:updated', this.handleCartUpdate);
  }
}

// Define the custom element
if (!customElements.get('cart-discount')) {
  customElements.define('cart-discount', CartDiscount);
}

// class CartItemCustomizations extends HTMLElement {
//   constructor() {
//     super();
//     this.isExpanded = false;
//     this.toggleButton = null;
//     this.contentList = null;
//     this.maxHeightCollapsed = '120px'; // Adjust as needed
//   }

//   connectedCallback() {
//     this.initializeReadMore();
//     this.setupResizeObserver();
//   }

//   initializeReadMore() {
//     this.contentList = this.querySelector('ul');

//     if (!this.contentList) return;

//     // Check if content needs read more (only on mobile)
//     if (this.shouldShowReadMore()) {
//       this.createReadMoreButton();
//       this.applyCollapsedState();
//     }
//   }

//   shouldShowReadMore() {
//     // Only show read more on mobile (you can adjust breakpoint)
//     if (window.innerWidth >= 768) return false;

//     // Check if content height exceeds our threshold
//     const contentHeight = this.contentList.scrollHeight;
//     const thresholdHeight = parseInt(this.maxHeightCollapsed);

//     return contentHeight > thresholdHeight;
//   }

//   createReadMoreButton() {
//     // Remove existing button if it exists
//     const existingButton = this.querySelector('.read-more-button');
//     if (existingButton) {
//       existingButton.remove();
//     }

//     this.toggleButton = document.createElement('button');
//     this.toggleButton.className =
//       'read-more-button mt-2 text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:underline';
//     this.toggleButton.textContent = 'Read more';
//     this.toggleButton.setAttribute('aria-expanded', 'false');

//     this.toggleButton.addEventListener('click', this.handleToggle.bind(this));

//     // Insert button after the content list
//     this.contentList.insertAdjacentElement('afterend', this.toggleButton);
//   }

//   applyCollapsedState() {
//     if (!this.contentList) return;

//     this.contentList.style.maxHeight = this.maxHeightCollapsed;
//     this.contentList.style.overflow = 'hidden';
//     this.contentList.style.transition = 'max-height 0.3s ease-in-out';

//     // Add a fade effect at the bottom when collapsed
//     this.contentList.style.position = 'relative';

//     // Create or update the fade overlay
//     let fadeOverlay = this.querySelector('.fade-overlay');
//     if (!fadeOverlay) {
//       fadeOverlay = document.createElement('div');
//       fadeOverlay.className = 'fade-overlay';
//       fadeOverlay.style.cssText = `
//         position: absolute;
//         bottom: 0;
//         left: 0;
//         right: 0;
//         height: 30px;
//         background: linear-gradient(transparent, rgb(239 246 255 / 1));
//         pointer-events: none;
//         transition: opacity 0.3s ease-in-out;
//       `;
//       this.contentList.appendChild(fadeOverlay);
//     }

//     fadeOverlay.style.opacity = this.isExpanded ? '0' : '1';
//   }

//   handleToggle(event) {
//     event.preventDefault();

//     this.isExpanded = !this.isExpanded;

//     if (this.isExpanded) {
//       // Expand
//       this.contentList.style.maxHeight = this.contentList.scrollHeight + 'px';
//       this.toggleButton.textContent = 'Read less';
//       this.toggleButton.setAttribute('aria-expanded', 'true');

//       // Hide fade overlay
//       const fadeOverlay = this.querySelector('.fade-overlay');
//       if (fadeOverlay) {
//         fadeOverlay.style.opacity = '0';
//       }
//     } else {
//       // Collapse
//       this.contentList.style.maxHeight = this.maxHeightCollapsed;
//       this.toggleButton.textContent = 'Read more';
//       this.toggleButton.setAttribute('aria-expanded', 'false');

//       // Show fade overlay
//       const fadeOverlay = this.querySelector('.fade-overlay');
//       if (fadeOverlay) {
//         fadeOverlay.style.opacity = '1';
//       }
//     }
//   }

//   setupResizeObserver() {
//     // Handle window resize to show/hide read more button
//     const resizeHandler = () => {
//       const shouldShow = this.shouldShowReadMore();

//       if (shouldShow && !this.toggleButton) {
//         // Need to add read more
//         this.createReadMoreButton();
//         this.applyCollapsedState();
//       } else if (!shouldShow && this.toggleButton) {
//         // Need to remove read more
//         this.removeReadMore();
//       }
//     };

//     // Debounce resize handler
//     let resizeTimeout;
//     window.addEventListener('resize', () => {
//       clearTimeout(resizeTimeout);
//       resizeTimeout = setTimeout(resizeHandler, 150);
//     });
//   }

//   removeReadMore() {
//     if (this.toggleButton) {
//       this.toggleButton.remove();
//       this.toggleButton = null;
//     }

//     if (this.contentList) {
//       this.contentList.style.maxHeight = '';
//       this.contentList.style.overflow = '';
//       this.contentList.style.transition = '';
//       this.contentList.style.position = '';
//     }

//     const fadeOverlay = this.querySelector('.fade-overlay');
//     if (fadeOverlay) {
//       fadeOverlay.remove();
//     }

//     this.isExpanded = false;
//   }

//   disconnectedCallback() {
//     // Clean up event listeners
//     if (this.toggleButton) {
//       this.toggleButton.removeEventListener('click', this.handleToggle);
//     }
//   }
// }

// // Define the custom element
// if (!customElements.get('cart-item-customizations')) {
//   customElements.define('cart-item-customizations', CartItemCustomizations);
// }

class CartItemCustomizations extends HTMLElement {
  constructor() {
    super();
    this.isExpanded = false;
    this.toggleButton = null;
    this.contentList = null;
    this.maxHeightCollapsed = '120px'; // Adjust as needed
  }

  connectedCallback() {
    this.initializeReadMore();
    this.setupResizeObserver();
  }

  initializeReadMore() {
    this.contentList = this.querySelector('ul');
    this.toggleButton = this.querySelector('.read-more-button');

    if (!this.contentList || !this.toggleButton) return;

    // Check if content needs read more (only on mobile)
    if (this.shouldShowReadMore()) {
      this.showReadMoreButton();
      this.applyCollapsedState();
    }
  }

  shouldShowReadMore() {
    // Only show read more on mobile (you can adjust breakpoint)
    if (window.innerWidth >= 768) return false;

    // Check if content height exceeds our threshold
    const contentHeight = this.contentList.scrollHeight;
    const thresholdHeight = parseInt(this.maxHeightCollapsed);

    return contentHeight > thresholdHeight;
  }

  showReadMoreButton() {
    this.toggleButton.classList.remove('hidden');
    this.toggleButton.addEventListener('click', this.handleToggle.bind(this));
  }

  hideReadMoreButton() {
    this.toggleButton.classList.add('hidden');
    this.toggleButton.removeEventListener('click', this.handleToggle);
  }

  applyCollapsedState() {
    if (!this.contentList) return;

    this.contentList.style.maxHeight = this.maxHeightCollapsed;
    this.contentList.style.overflow = 'hidden';
    this.contentList.style.transition = 'max-height 0.3s ease-in-out';

    // Add a fade effect at the bottom when collapsed
    this.contentList.style.position = 'relative';

    // Create or update the fade overlay
    let fadeOverlay = this.querySelector('.fade-overlay');
    if (!fadeOverlay) {
      fadeOverlay = document.createElement('div');
      fadeOverlay.className = 'fade-overlay';
      fadeOverlay.style.cssText = `
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 30px;
        background: linear-gradient(transparent, rgb(245 246 249 / 1));
        pointer-events: none;
        transition: opacity 0.3s ease-in-out;
      `;
      this.contentList.appendChild(fadeOverlay);
    }

    fadeOverlay.style.opacity = this.isExpanded ? '0' : '1';
  }

  handleToggle(event) {
    event.preventDefault();

    this.isExpanded = !this.isExpanded;

    if (this.isExpanded) {
      // Expand
      this.contentList.style.maxHeight = this.contentList.scrollHeight + 'px';
      this.toggleButton.textContent = 'View less -';
      this.toggleButton.setAttribute('aria-expanded', 'true');

      // Hide fade overlay
      const fadeOverlay = this.querySelector('.fade-overlay');
      if (fadeOverlay) {
        fadeOverlay.style.opacity = '0';
      }
    } else {
      // Collapse
      this.contentList.style.maxHeight = this.maxHeightCollapsed;
      this.toggleButton.textContent = 'View more +';
      this.toggleButton.setAttribute('aria-expanded', 'false');

      // Show fade overlay
      const fadeOverlay = this.querySelector('.fade-overlay');
      if (fadeOverlay) {
        fadeOverlay.style.opacity = '1';
      }
    }
  }

  setupResizeObserver() {
    // Handle window resize to show/hide read more button
    const resizeHandler = () => {
      const shouldShow = this.shouldShowReadMore();

      if (shouldShow && this.toggleButton.classList.contains('hidden')) {
        // Need to show read more
        this.showReadMoreButton();
        this.applyCollapsedState();
      } else if (!shouldShow && !this.toggleButton.classList.contains('hidden')) {
        // Need to hide read more
        this.removeReadMore();
      }
    };

    // Debounce resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeHandler, 150);
    });
  }

  removeReadMore() {
    this.hideReadMoreButton();

    if (this.contentList) {
      this.contentList.style.maxHeight = '';
      this.contentList.style.overflow = '';
      this.contentList.style.transition = '';
      this.contentList.style.position = '';
    }

    const fadeOverlay = this.querySelector('.fade-overlay');
    if (fadeOverlay) {
      fadeOverlay.remove();
    }

    this.isExpanded = false;
  }

  disconnectedCallback() {
    // Clean up event listeners
    if (this.toggleButton) {
      this.toggleButton.removeEventListener('click', this.handleToggle);
    }
  }
}

// Define the custom element
if (!customElements.get('cart-item-customizations')) {
  console.log('DH - Defining cart-item-customizations');
  customElements.define('cart-item-customizations', CartItemCustomizations);
}

class CartTimer extends HTMLElement {
  constructor() {
    super();
    this.duration = 10 * 60; // 10 minutes in seconds
    this.interval = null;
    this.debug = false; // Set to true for console logging
  }

  log(...args) {
    if (this.debug) {
      console.log('[CartTimer]', ...args);
    }
  }

  connectedCallback() {
    // Only show timer if cart has items
    if (this.hasCartItems()) {
      this.initializeTimer();
      this.startInterval();
    } else {
      this.hide();
    }

    // Listen for cart updates
    document.addEventListener('cart:updated', this.handleCartUpdate.bind(this));
  }

  hasCartItems() {
    // Check if cart has items - adjust this based on your cart implementation
    const cartItems = document.querySelectorAll('.cart-item');
    return cartItems.length > 0;
  }

  initializeTimer() {
    let startTime = sessionStorage.getItem('cart-timer-start');

    if (!startTime) {
      // No existing timer, start a new one
      this.startNewTimer();
    } else {
      // Use existing timer
      this.startTime = parseInt(startTime);
      this.log('Resuming existing timer from:', new Date(this.startTime));
    }
  }

  startNewTimer() {
    this.startTime = Date.now();
    sessionStorage.setItem('cart-timer-start', this.startTime);
    this.log('Started new timer at:', new Date(this.startTime));
  }

  resetTimer() {
    this.log('Resetting timer');
    this.startNewTimer();
    this.updateDisplay();
  }

  startInterval() {
    this.updateDisplay(); // Update immediately
    this.interval = setInterval(() => this.updateDisplay(), 1000);
  }

  updateDisplay() {
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const remaining = Math.max(0, this.duration - elapsed);

    this.log('Timer update - elapsed:', elapsed, 'remaining:', remaining);

    if (remaining === 0) {
      this.log('Timer hit 0, resetting...');
      this.resetTimer();
      return;
    }

    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;

    this.innerHTML = `
      <div class="flex items-center justify-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-800">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span>Hurry!&nbsp;Your&nbsp;cart&nbsp;is&nbsp;reserved&nbsp;for<strong>&nbsp;${minutes}:${seconds.toString().padStart(2, '0')}&nbsp;</strong>minutes</span>
      </div>
    `;

    this.show();
  }

  handleCartUpdate(event) {
    this.log('Cart updated, checking if timer should be shown');

    if (this.hasCartItems()) {
      // Cart has items, make sure timer is running
      if (!this.interval) {
        this.initializeTimer();
        this.startInterval();
      }
    } else {
      // Cart is empty, hide timer and clear storage
      this.clearTimer();
      this.hide();
    }
  }

  clearTimer() {
    this.log('Clearing timer');

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    sessionStorage.removeItem('cart-timer-start');
  }

  show() {
    this.style.display = 'block';
  }

  hide() {
    this.style.display = 'none';
  }

  disconnectedCallback() {
    if (this.interval) {
      clearInterval(this.interval);
    }

    document.removeEventListener('cart:updated', this.handleCartUpdate);
  }
}

// Define the custom element
if (!customElements.get('cart-timer')) {
  customElements.define('cart-timer', CartTimer);
}
