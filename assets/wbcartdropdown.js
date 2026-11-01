// Cart Dropdown Code Start
function debounce(fn, wait) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), wait);
  };
}
class WebiCartRemoveButton extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', (event) => {
      event.preventDefault();
      this.closest('webi-cart-items').updateQuantity(this.dataset.index, 0);
    });
  }
}
customElements.define('webi-cart-remove-button', WebiCartRemoveButton);

class WebiCartItems extends HTMLElement {
  constructor() {
    super();
    this.lineItemStatusElement = document.getElementById('shopping-cart-line-item-status');
    this.currentItemCount = Array.from(this.querySelectorAll('[name="updates[]"]'))
      .reduce((total, webiquantityInput) => total + parseInt(webiquantityInput.value), 0);
    this.debouncedOnChange = debounce((event) => {
      this.onChange(event);
    }, 300);
    this.addEventListener('change', this.debouncedOnChange.bind(this));
  }
  onChange(event) {
    this.updateQuantity(event.target.dataset.index, event.target.value, document.activeElement.getAttribute('name'));
  }
  getSectionsToRender() {
    return [
      {
        id: 'webi-main-cart-items',
        section: document.getElementById('webi-main-cart-items').dataset.id,
        selector: '.js-contents',
      },
      {
        id: 'cart-icon-bubble',
        section: 'cart-icon-bubble',
        selector: '.shopify-section'
      },
      {
        id: 'webi-cart-live-region-text',
        section: 'webi-cart-live-region-text',
        selector: '.shopify-section'
      },
      {
        id: 'webi-main-cart-footer',
        section: document.getElementById('webi-main-cart-footer').dataset.id,
        selector: '.js-contents',
      }
    ];
  }
  updateQuantity(line, quantity, name) {
    this.enableLoading(line);
    const body = JSON.stringify({
      line,
      quantity,
      sections: this.getSectionsToRender().map((section) => section.section),
      sections_url: window.location.pathname
    });
    fetch(`${routes.cart_change_url}`, {...fetchConfig(), ...{ body }})
      .then((response) => {
        return response.text();
      })
      .then((state) => {
        const parsedState = JSON.parse(state);
        this.classList.toggle('is-empty', parsedState.item_count === 0);
        const cartFooter = document.getElementById('webi-main-cart-footer');
        if (cartFooter) cartFooter.classList.toggle('is-empty', parsedState.item_count === 0);
        this.getSectionsToRender().forEach((section => {
          const elementToReplace =
            document.getElementById(section.id).querySelector(section.selector) || document.getElementById(section.id);
          elementToReplace.innerHTML =
            this.getSectionInnerHTML(parsedState.sections[section.section], section.selector);
        }));
        this.updateLiveRegions(line, parsedState.item_count);
        const lineItem =  document.getElementById(`WbCartItem-${line}`);
        if (lineItem && lineItem.querySelector(`[name="${name}"]`)) lineItem.querySelector(`[name="${name}"]`).focus();
        this.disableLoading();
      }).catch(() => {
        this.querySelectorAll('.loading-overlay').forEach((overlay) => overlay.classList.add('hidden'));
        this.disableLoading();
      });
  }
  updateLiveRegions(line, itemCount) {
    if (this.currentItemCount === itemCount) {
      document.getElementById(`Wb-Line-item-error-${line}`)
        .querySelector('.wb-cart-item__error-text')
        .innerHTML = window.cartStrings.quantityError.replace(
          '[quantity]',
          document.getElementById(`WbQuantity-${line}`).value
        );
    }
    this.currentItemCount = itemCount;
    this.lineItemStatusElement.setAttribute('aria-hidden', true);
    const cartStatus = document.getElementById('webi-cart-live-region-text');
    cartStatus.setAttribute('aria-hidden', false);
    setTimeout(() => {
      cartStatus.setAttribute('aria-hidden', true);
    }, 1000);
  }
  getSectionInnerHTML(html, selector) {
    return new DOMParser()
      .parseFromString(html, 'text/html')
      .querySelector(selector).innerHTML;
  }
  enableLoading(line) {
    document.getElementById('webi-main-cart-items').classList.add('cart__items--disabled');
    this.querySelectorAll(`#WbCartItem-${line} .loading-overlay`).forEach((overlay) => overlay.classList.remove('hidden'));
    document.activeElement.blur();
    this.lineItemStatusElement.setAttribute('aria-hidden', false);
  }
  disableLoading() {
    document.getElementById('webi-main-cart-items').classList.remove('cart__items--disabled');
  }
}
customElements.define('webi-cart-items', WebiCartItems);
// Cart Dropdown Code End
