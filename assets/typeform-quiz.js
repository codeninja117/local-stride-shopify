// // class TypeformQuizTrigger extends HTMLElement {
// //   constructor() {
// //     super();
// //     this.formId = this.getAttribute('form-id') || '';
// //     this.buttonText = this.getAttribute('button-text') || 'Take Quiz';
// //     this.completedButtonText = this.getAttribute('completed-button-text') || 'Add to Cart';
// //     this.variantId = this.getAttribute('variant-id') || '';
// //     this.productId = this.getAttribute('product-id') || '';
// //     this.redirectUrl = this.getAttribute('redirect-url') || '/cart';
// //   }

// //   connectedCallback() {
// //     this.render();
// //     this.setupListeners();
// //   }

// //   render() {
// //     const quizCompleted = this.getCookie('tfQuizCompleted') === 'true';
// //     const buttonText = quizCompleted ? this.completedButtonText : this.buttonText;

// //     this.innerHTML = `
// //       <button class="button button--primary quiz-trigger${quizCompleted ? ' completed' : ''}">${buttonText}</button>
// //     `;
// //   }

// //   setupListeners() {
// //     const button = this.querySelector('.quiz-trigger');
// //     if (button) {
// //       button.addEventListener('click', this.handleClick.bind(this));
// //     }
// //   }

// //   handleClick(e) {
// //     e.preventDefault();

// //     if (this.getCookie('tfQuizCompleted') === 'true') {
// //       // Handle add to cart
// //       this.addToCart();
// //     } else {
// //       // Show the quiz
// //       this.openQuiz();
// //     }
// //   }

// //   openQuiz() {
// //     // Create or get the modal
// //     let modal = document.getElementById('typeform-modal');

// //     // If modal doesn't exist, create it
// //     if (!modal) {
// //       // Create the modal structure
// //       modal = document.createElement('div');
// //       modal.id = 'typeform-modal';

// //       // Apply styles directly to avoid CSS conflicts
// //       Object.assign(modal.style, {
// //         position: 'fixed',
// //         top: '0',
// //         left: '0',
// //         right: '0',
// //         bottom: '0',
// //         width: '100%',
// //         height: '100%',
// //         zIndex: '9999',
// //         backgroundColor: 'rgba(0,0,0,0.8)',
// //         display: 'flex',
// //         justifyContent: 'center',
// //         alignItems: 'center',
// //       });

// //       // Create content container
// //       const content = document.createElement('div');
// //       Object.assign(content.style, {
// //         position: 'relative',
// //         width: '100%',
// //         height: '100%',
// //         backgroundColor: 'white',
// //         overflow: 'hidden',
// //       });

// //       // Create close button
// //       const closeBtn = document.createElement('button');
// //       closeBtn.innerHTML = '×';
// //       Object.assign(closeBtn.style, {
// //         position: 'fixed',
// //         top: '20px',
// //         right: '20px',
// //         zIndex: '10000',
// //         backgroundColor: '#333',
// //         color: 'white',
// //         border: '2px solid white',
// //         borderRadius: '50%',
// //         width: '50px',
// //         height: '50px',
// //         fontSize: '30px',
// //         cursor: 'pointer',
// //         display: 'flex',
// //         alignItems: 'center',
// //         justifyContent: 'center',
// //         boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
// //       });

// //       closeBtn.addEventListener('click', () => {
// //         modal.style.display = 'none';
// //         document.body.style.overflow = 'auto';
// //       });

// //       // Create a container for the Typeform that's isolated
// //       const typeformContainer = document.createElement('div');
// //       typeformContainer.id = 'typeform-container';
// //       Object.assign(typeformContainer.style, {
// //         width: '100%',
// //         height: '100%',
// //         overflow: 'hidden',
// //       });

// //       // Append elements
// //       content.appendChild(typeformContainer);
// //       modal.appendChild(content);
// //       modal.appendChild(closeBtn);
// //       document.body.appendChild(modal);
// //     }

// //     // Show the modal
// //     modal.style.display = 'flex';
// //     document.body.style.overflow = 'hidden';

// //     // Mark as started
// //     this.setCookie('tfQuizStarted', 'true', 30);

// //     // Get the container
// //     const container = document.getElementById('typeform-container');
// //     if (!container) return;

// //     // Clear container and create a fresh embed
// //     container.innerHTML = '';

// //     // Create iframe as a reliable way to embed Typeform
// //     const iframe = document.createElement('iframe');
// //     iframe.style.width = '100%';
// //     iframe.style.height = '100%';
// //     iframe.style.border = 'none';
// //     iframe.frameBorder = '0';
// //     iframe.allowFullscreen = true;

// //     // Build the Typeform URL with parameters
// //     let typeformUrl = `https://form.typeform.com/to/${this.formId}?typeform-medium=embed-sdk&typeform-embed=popup`;

// //     // Add hidden fields as query parameters
// //     if (this.productId) typeformUrl += `&product_id=${this.productId}`;
// //     if (this.variantId) typeformUrl += `&variant_id=${this.variantId}`;

// //     // Set the iframe source
// //     iframe.src = typeformUrl;

// //     // Add event listener for messages from the iframe
// //     window.addEventListener('message', (event) => {
// //       // Check if the message is from Typeform
// //       if (event.data && typeof event.data === 'object') {
// //         // Check for form submit
// //         if (
// //           event.data.type === 'form-submit' ||
// //           event.data.type === 'typeform-submit' ||
// //           (event.data.type === 'typeform-response' && event.data.state === 'submitted')
// //         ) {
// //           this.handleCompletion(event.data);
// //         }
// //       }
// //     });

// //     // Add the iframe to the container
// //     container.appendChild(iframe);
// //   }

// //   handleCompletion(data) {
// //     console.log('Quiz completed', data);

// //     // Mark as completed
// //     this.setCookie('tfQuizCompleted', 'true', 365);

// //     // Fetch the full response data using the response_id
// //     if (data && data.response_id) {
// //       fetch(`https://api.typeform.com/forms/${data.formId}/responses/${data.response_id}`, {
// //         headers: {
// //           // You'll need to replace this with your actual Typeform API token
// //           Authorization: 'Bearer YOUR_TYPEFORM_API_TOKEN',
// //         },
// //       })
// //         .then((response) => response.json())
// //         .then((fullResponseData) => {
// //           console.log('Full response data:', fullResponseData);

// //           // Store the full response data
// //           localStorage.setItem('tfResponseData', JSON.stringify(fullResponseData));

// //           // Add to cart
// //           if (this.variantId) {
// //             this.addToCart(fullResponseData);
// //           }
// //         })
// //         .catch((error) => {
// //           console.error('Error fetching response data:', error);

// //           // Fallback to adding to cart without response data
// //           if (this.variantId) {
// //             this.addToCart();
// //           }
// //         });
// //     } else {
// //       // If no response_id, just add to cart
// //       if (this.variantId) {
// //         this.addToCart();
// //       }
// //     }

// //     // Hide modal
// //     const modal = document.getElementById('typeform-modal');
// //     if (modal) {
// //       modal.style.display = 'none';
// //       document.body.style.overflow = 'auto';
// //     }

// //     // Update button
// //     this.render();
// //     this.setupListeners();
// //   }

// //   addToCart(responseData) {
// //     if (!this.variantId) return;

// //     // Prepare line item properties
// //     const lineItemProperties = {};

// //     // If we have response data, add Typeform answers as properties
// //     if (responseData && responseData.answers) {
// //       responseData.answers.forEach((answer) => {
// //         // Convert Typeform's complex answer structure to a string
// //         let propertyValue = '';

// //         if (answer.type === 'choice') {
// //           propertyValue = answer.choice.label;
// //         } else if (answer.type === 'text') {
// //           propertyValue = answer.text;
// //         } else if (answer.type === 'number') {
// //           propertyValue = answer.number.toString();
// //         } else if (answer.type === 'email') {
// //           propertyValue = answer.email;
// //         } else if (answer.type === 'date') {
// //           propertyValue = answer.date;
// //         }

// //         // Use the human-readable question title as the property key
// //         const propertyKey = answer.field.title || 'Question';

// //         lineItemProperties[propertyKey] = propertyValue;
// //       });
// //     }

// //     // Prepare the cart addition payload according to Shopify's cart/add.js API
// //     const cartPayload = {
// //       items: [
// //         {
// //           quantity: 1,
// //           id: this.variantId,
// //           properties: lineItemProperties,
// //         },
// //       ],
// //     };

// //     fetch('/cart/add.js', {
// //       method: 'POST',
// //       headers: { 'Content-Type': 'application/json' },
// //       body: JSON.stringify(cartPayload),
// //     })
// //       .then((response) => {
// //         if (!response.ok) {
// //           throw new Error('Failed to add to cart');
// //         }
// //         return response.json();
// //       })
// //       .then((data) => {
// //         // Clear stored response data after successful cart addition
// //         localStorage.removeItem('tfResponseData');
// //         // window.location.href = this.redirectUrl || '/cart';
// //       })
// //       .catch((error) => {
// //         console.error('Error adding to cart:', error);
// //         alert('Unable to add product to cart. Please try again.');
// //       });
// //   }

// //   // Cookie utilities
// //   setCookie(name, value, days) {
// //     const date = new Date();
// //     date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
// //     const expires = `expires=${date.toUTCString()}`;
// //     // document.cookie = `${name}=${value};${expires};path=/`;
// //     document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
// //   }

// //   getCookie(name) {
// //     const cookieName = `${name}=`;
// //     const cookies = document.cookie.split(';');
// //     for (let i = 0; i < cookies.length; i++) {
// //       let cookie = cookies[i].trim();
// //       if (cookie.indexOf(cookieName) === 0) {
// //         return cookie.substring(cookieName.length, cookie.length);
// //       }
// //     }
// //     return '';
// //   }

// //   static get observedAttributes() {
// //     return ['variant-id', 'product-id'];
// //   }

// //   attributeChangedCallback(name, oldValue, newValue) {
// //     if (oldValue !== newValue) {
// //       this[name.replace(/-([a-z])/g, (g) => g[1].toUpperCase())] = newValue;
// //     }
// //   }
// // }

// // // Register the custom element
// // customElements.define('typeform-quiz-trigger', TypeformQuizTrigger);

// // Cookie handling with variant awareness
// function setQuizCookies() {
//   const options = ';path=/;Secure;SameSite=Lax;max-age=604800'; // 7 days

//   // Set variant-specific cookies
//   document.cookie = `quiz_variant`;
//   document.cookie = `quiz_started`;
// }

// function onQuizStarted() {
//   console.log('quiz started');
//   const variantId =
//     // new URLSearchParams(window.location.search).get('variant') || '{{ section.settings.default_variant }}';
//     setQuizCookies();
// }

// function onQuizCompleted() {
//   // const variantId =
//   //   new URLSearchParams(window.location.search).get('variant') || '{{ section.settings.default_variant }}';
//   document.cookie = `quiz_completed=true;path=/;Secure;SameSite=Lax;max-age=604800`;
// }
