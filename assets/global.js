function getFocusableElements(container) {
  return Array.from(
      container.querySelectorAll(
          "summary, a[href], button:enabled, [tabindex]:not([tabindex^='-']), [draggable], area, input:not([type=hidden]):enabled, select:enabled, textarea:enabled, object, iframe"
      )
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

  if(summary.nextElementSibling.getAttribute('id')) {
    summary.setAttribute('aria-controls', summary.nextElementSibling.id);
  }

  summary.addEventListener('click', (event) => {
    event.currentTarget.setAttribute('aria-expanded', !event.currentTarget.closest('details').hasAttribute('open'));
  });

  if (summary.closest('header-drawer')) return;
  summary.parentElement.addEventListener('keyup', onKeyUpEscape);
});

const trapFocusHandlers = {};

function trapFocus(container, elementToFocus = container) {
  var elements = getFocusableElements(container);
  var first = elements[0];
  var last = elements[elements.length - 1];

  removeTrapFocus();

  trapFocusHandlers.focusin = (event) => {
    if (
        event.target !== container &&
        event.target !== last &&
        event.target !== first
    )
      return;

    document.addEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.focusout = function() {
    document.removeEventListener('keydown', trapFocusHandlers.keydown);
  };

  trapFocusHandlers.keydown = function(event) {
    if (event.code.toUpperCase() !== 'TAB') return; // If not TAB key
    // On the last focusable element and tab forward, focus the first element.
    if (event.target === last && !event.shiftKey) {
      event.preventDefault();
      first.focus();
    }

    //  On the first focusable element and tab backward, focus the last element.
    if (
        (event.target === container || event.target === first) &&
        event.shiftKey
    ) {
      event.preventDefault();
      last.focus();
    }
  };

  document.addEventListener('focusout', trapFocusHandlers.focusout);
  document.addEventListener('focusin', trapFocusHandlers.focusin);

  elementToFocus.focus();

  if (elementToFocus.tagName === 'INPUT' &&
      ['search', 'text', 'email', 'url'].includes(elementToFocus.type) &&
      elementToFocus.value) {
    elementToFocus.setSelectionRange(0, elementToFocus.value.length);
  }
}

// Here run the querySelector to figure out if the browser supports :focus-visible or not and run code based on it.
try {
  document.querySelector(":focus-visible");
} catch(e) {
  focusVisiblePolyfill();
}

function focusVisiblePolyfill() {
  const navKeys = ['ARROWUP', 'ARROWDOWN', 'ARROWLEFT', 'ARROWRIGHT', 'TAB', 'ENTER', 'SPACE', 'ESCAPE', 'HOME', 'END', 'PAGEUP', 'PAGEDOWN']
  let currentFocusedElement = null;
  let mouseClick = null;

  window.addEventListener('keydown', (event) => {
    if(navKeys.includes(event.code.toUpperCase())) {
      mouseClick = false;
    }
  });

  window.addEventListener('mousedown', (event) => {
    mouseClick = true;
  });

  window.addEventListener('focus', () => {
    if (currentFocusedElement) currentFocusedElement.classList.remove('focused');

    if (mouseClick) return;

    currentFocusedElement = document.activeElement;
    currentFocusedElement.classList.add('focused');

  }, true);
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
    this.querySelectorAll('button').forEach(
        (button) => button.addEventListener('click', this.onButtonClick.bind(this))
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

    event.target.name === 'plus' ? this.input.stepUp() : this.input.stepDown();
    if (previousValue !== this.input.value) this.input.dispatchEvent(this.changeEvent);
  }

  validateQtyRules() {
    const value = parseInt(this.input.value);
    if (this.input.min) {
      const min = parseInt(this.input.min);
      const buttonMinus = this.querySelector(".quantity__button[name='minus']");
      buttonMinus.classList.toggle('disabled', value <= min);
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

function fetchConfig(type = 'json') {
  return {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': `application/${type}` }
  };
}

/*
 * Shopify Common JS
 *
 */
if ((typeof window.Shopify) == 'undefined') {
  window.Shopify = {};
}

Shopify.bind = function(fn, scope) {
  return function() {
    return fn.apply(scope, arguments);
  }
};

Shopify.setSelectorByValue = function(selector, value) {
  for (var i = 0, count = selector.options.length; i < count; i++) {
    var option = selector.options[i];
    if (value == option.value || value == option.innerHTML) {
      selector.selectedIndex = i;
      return i;
    }
  }
};

Shopify.addListener = function(target, eventName, callback) {
  target.addEventListener ? target.addEventListener(eventName, callback, false) : target.attachEvent('on'+eventName, callback);
};

Shopify.postLink = function(path, options) {
  options = options || {};
  var method = options['method'] || 'post';
  var params = options['parameters'] || {};

  var form = document.createElement("form");
  form.setAttribute("method", method);
  form.setAttribute("action", path);

  for(var key in params) {
    var hiddenField = document.createElement("input");
    hiddenField.setAttribute("type", "hidden");
    hiddenField.setAttribute("name", key);
    hiddenField.setAttribute("value", params[key]);
    form.appendChild(hiddenField);
  }
  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
};

Shopify.CountryProvinceSelector = function(country_domid, province_domid, options) {
  this.countryEl         = document.getElementById(country_domid);
  this.provinceEl        = document.getElementById(province_domid);
  this.provinceContainer = document.getElementById(options['hideElement'] || province_domid);

  Shopify.addListener(this.countryEl, 'change', Shopify.bind(this.countryHandler,this));

  this.initCountry();
  this.initProvince();
};

Shopify.CountryProvinceSelector.prototype = {
  initCountry: function() {
    var value = this.countryEl.getAttribute('data-default');
    Shopify.setSelectorByValue(this.countryEl, value);
    this.countryHandler();
  },

  initProvince: function() {
    var value = this.provinceEl.getAttribute('data-default');
    if (value && this.provinceEl.options.length > 0) {
      Shopify.setSelectorByValue(this.provinceEl, value);
    }
  },

  countryHandler: function(e) {
    var opt       = this.countryEl.options[this.countryEl.selectedIndex];
    var raw       = opt.getAttribute('data-provinces');
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

      this.provinceContainer.style.display = "";
    }
  },

  clearOptions: function(selector) {
    while (selector.firstChild) {
      selector.removeChild(selector.firstChild);
    }
  },

  setOptions: function(selector, values) {
    for (var i = 0, count = values.length; i < values.length; i++) {
      var opt = document.createElement('option');
      opt.value = values[i];
      opt.innerHTML = values[i];
      selector.appendChild(opt);
    }
  }
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
    this.querySelectorAll('summary').forEach(summary => summary.addEventListener('click', this.onSummaryClick.bind(this)));
    this.querySelectorAll(
      'button:not(.localization-selector):not(.country-selector__close-button):not(.country-filter__reset-button)'
    ).forEach((button) => button.addEventListener('click', this.onCloseButtonClick.bind(this))
    );
  }

  onKeyUp(event) {
    if(event.code.toUpperCase() !== 'ESCAPE') return;

    const openDetailsElement = event.target.closest('details[open]');
    if(!openDetailsElement) return;

    openDetailsElement === this.mainDetailsToggle ? this.closeMenuDrawer(event, this.mainDetailsToggle.querySelector('summary')) : this.closeSubmenu(openDetailsElement);
  }

  onSummaryClick(event) {
    const summaryElement = event.currentTarget;
    const detailsElement = summaryElement.parentNode;
    const parentMenuElement = detailsElement.closest('.has-submenu');
    const isOpen = detailsElement.hasAttribute('open');
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    function addTrapFocus() {
      trapFocus(summaryElement.nextElementSibling, detailsElement.querySelector('button'));
      summaryElement.nextElementSibling.removeEventListener('transitionend', addTrapFocus);
    }

    if (detailsElement === this.mainDetailsToggle) {
      if(isOpen) event.preventDefault();
      isOpen ? this.closeMenuDrawer(event, summaryElement) : this.openMenuDrawer(summaryElement);

      if (window.matchMedia('(max-width: 992px)')) {
        document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
      }
    } else {
      setTimeout(() => {
        detailsElement.classList.add('menu-opening');
        summaryElement.setAttribute('aria-expanded', true);
        parentMenuElement && parentMenuElement.classList.add('submenu-open');
        !reducedMotion || reducedMotion.matches ? addTrapFocus() : summaryElement.nextElementSibling.addEventListener('transitionend', addTrapFocus);
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
    this.mainDetailsToggle.querySelectorAll('details').forEach(details => {
      details.removeAttribute('open');
      details.classList.remove('menu-opening');
    });
    this.mainDetailsToggle.querySelectorAll('.submenu-open').forEach(submenu => {
      submenu.classList.remove('submenu-open');
    });
    document.body.classList.remove(`overflow-hidden-${this.dataset.breakpoint}`);
    removeTrapFocus(elementToFocus);
    this.closeAnimation(this.mainDetailsToggle);
    
  }

  onFocusOut() {
    setTimeout(() => {
      if (this.mainDetailsToggle.hasAttribute('open') && !this.mainDetailsToggle.contains(document.activeElement)) this.closeMenuDrawer();
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
    }

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
    this.borderOffset = this.borderOffset || this.closest('.header-wrapper').classList.contains('header-wrapper--border-bottom') ? 1 : 0;
    document.documentElement.style.setProperty('--header-bottom-position', `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`);
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
    this.header && document.documentElement.style.setProperty('--header-bottom-position', `${parseInt(this.header.getBoundingClientRect().bottom - this.borderOffset)}px`);
    document.documentElement.style.setProperty('--viewport-height', `${window.innerHeight}px`);
  };
}

customElements.define('header-drawer', HeaderDrawer);

class ModalDialog extends HTMLElement {
  constructor() {
    super();
    this.querySelector('[id^="ModalClose-"]').addEventListener(
        'click',
        this.hide.bind(this, false)
    );
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
    document.body.appendChild(this);
  }

  show(opener) {
    this.openedBy = opener;
    const popup = this.querySelector('.template-popup');
    document.body.classList.add('overflow-hidden');
    this.setAttribute('open', '');
    if (popup) popup.loadContent();
    trapFocus(this, this.querySelector('[role="dialog"]'));
    window.pauseAllMedia();
  }

  hide() {
    document.body.classList.remove('overflow-hidden');
    document.body.dispatchEvent(new CustomEvent('modalClosed'));
    this.removeAttribute('open');
    removeTrapFocus(this.openedBy);
    window.pauseAllMedia();
  }
}
customElements.define('modal-dialog', ModalDialog);

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

    this.oriantation = window.matchMedia('(min-width: 768px)').matches ? this.dataset.oriantation ? this.dataset.oriantation : 'horizontal' :  'horizontal';
    if(this.oriantation == 'vertical'){
      this.offsetPosition = 'offsetTop';
      this.scrollPosition = 'scrollTop';
      this.clientPosition = 'clientHeight';
    }else{
      this.offsetPosition = 'offsetLeft';
      this.scrollPosition = 'scrollLeft';
      this.clientPosition = 'clientWidth';
    }

    if (!this.slider || !this.nextButton) return;

    this.initPages();
    const resizeObserver = new ResizeObserver((entries) => this.initPages());
    resizeObserver.observe(this.slider);

    this.slider.addEventListener('scroll', this.update.bind(this));
    this.prevButton.addEventListener('click', this.onButtonClick.bind(this));
    this.nextButton.addEventListener('click', this.onButtonClick.bind(this));
  }

  initPages() {
    this.sliderItemsToShow = Array.from(this.sliderItems).filter((element) => element[this.clientPosition] > 0);
    if (this.sliderItemsToShow.length < 2) return;
    this.sliderItemOffset = this.sliderItemsToShow[1][this.offsetPosition] - this.sliderItemsToShow[0][this.offsetPosition];
    this.slidesPerPage = Math.max(1, Math.round((this.slider.clientWidth - this.sliderItemsToShow[0].offsetLeft) / this.sliderItemOffset));
    this.totalPages = Math.ceil(this.sliderItemsToShow.length / this.slidesPerPage);
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
    const sliderPosition =  this.slider[this.scrollPosition];
    this.currentPage = Math.round(sliderPosition / this.sliderItemOffset) + 1;

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
        })
      );
    }

    if (this.enableSliderLooping) return;

    if (this.isSlideVisible(this.sliderItemsToShow[0]) && sliderPosition === 0) {
      this.prevButton.setAttribute('disabled', 'disabled');
    } else {
      this.prevButton.removeAttribute('disabled');
    }

    if (this.isSlideVisible(this.sliderItemsToShow[this.sliderItemsToShow.length - 1], -1)) {
      this.nextButton.setAttribute('disabled', 'disabled');
    } else {
      this.nextButton.removeAttribute('disabled');
    } 
  }
  isSlideVisible(element, offset = 0) {
    if (!element) return false;                                    
    const lastVisibleSlide = this.slider[this.clientPosition] + this.slider[this.scrollPosition] - offset;
    return element[this.offsetPosition] + element[this.clientPosition] <= lastVisibleSlide && element[this.offsetPosition] >= this.slider[this.scrollPosition];
  }

  onButtonClick(event) {
    event.preventDefault();
    const step = event.currentTarget.dataset.step || 1;
    const sliderPosition =  this.slider[this.scrollPosition];
    this.slideScrollPosition =
      event.currentTarget.name === 'next'
        ? sliderPosition + step * this.sliderItemOffset
        : sliderPosition - step * this.sliderItemOffset;
    this.setSlidePosition(this.slideScrollPosition);
  }

  setSlidePosition(position) {
    const param = this.oriantation == 'vertical' ? {top:position} : {left:position};
    this.slider.scrollTo(param);
  }
}
customElements.define('slider-component', SliderComponent);

class SlideshowComponent extends SliderComponent {
  constructor() {
    super();
    this.sliderControlWrapper = this.querySelector('.slider-buttons');
    this.enableSliderLooping = true;

    if (!this.sliderControlWrapper) return;

    this.sliderFirstItemNode = this.slider ? this.slider.querySelector('.slideshow__slide') : null;
    if (!this.sliderFirstItemNode) return;

    this.sliderItemsToShow = this.slider ? Array.from(this.slider.querySelectorAll('.slideshow__slide')) : [];
    if (this.sliderItemsToShow && this.sliderItemsToShow.length > 0) {
        this.currentPage = 1;
    }

    this.sliderControlLinksArray = this.sliderControlWrapper ? Array.from(this.sliderControlWrapper.querySelectorAll('.slider-counter__link')) : [];
    this.sliderControlLinksArray.forEach(link => link.addEventListener('click', this.linkToSlide.bind(this)));
    
    if (this.slider) {
        this.slider.addEventListener('scroll', this.setSlideVisibility.bind(this));
    }
    
    this.setSlideVisibility();

    if (this.slider && this.slider.getAttribute('data-autoplay') === 'true') {
        this.setAutoPlay();
    }
    this.extraVisibleElement = 0;
    this.sliderItemsToShow.forEach(ele => {
      if (this.isElementVisible(ele)) this.extraVisibleElement++;
    });
    if (this.extraVisibleElement != 0) this.extraVisibleElement--;
  }

  setAutoPlay() {
    this.sliderAutoplayButton = this.querySelector('.slideshow__autoplay');
    this.autoplaySpeed = this.slider?.dataset.speed * 1000 || 5000; // Default to 5000 if undefined

    if (this.sliderAutoplayButton) {
        this.sliderAutoplayButton.addEventListener('click', this.autoPlayToggle.bind(this));
    }
    this.addEventListener('mouseover', this.focusInHandling.bind(this));
    this.addEventListener('mouseleave', this.focusOutHandling.bind(this));
    this.addEventListener('focusin', this.focusInHandling.bind(this));
    this.addEventListener('focusout', this.focusOutHandling.bind(this));

    this.play();
    this.autoplayButtonIsSetToPlay = true;
  }

  isElementVisible(element){
      const rect = element.getBoundingClientRect();
      const rect1 = this.getBoundingClientRect();

      return (
        rect.left >=  rect1.left &&
        rect.right <= rect1.right
      );
  }

  onButtonClick(event) {
    super.onButtonClick(event);
    const isFirstSlide = this.currentPage === 1;
    const isLastSlide = (this.currentPage + this.extraVisibleElement) === this.sliderItemsToShow.length; // custom code

    if (!isFirstSlide && !isLastSlide) return;
    if (isFirstSlide && event.currentTarget.name === 'previous') {
      this.slideScrollPosition = this.slider.scrollLeft + this.sliderFirstItemNode.clientWidth * this.sliderItemsToShow.length;
    } else if (isLastSlide && event.currentTarget.name === 'next') {
      this.slideScrollPosition = 0;
    }
    this.slider.scrollTo({
      left: this.slideScrollPosition 
    });
  }

  update() {
    super.update();
    this.sliderControlButtons = this.querySelectorAll('.slider-counter__link');
    this.prevButton.removeAttribute('disabled');

    if (!this.sliderControlButtons.length) return;

    this.sliderControlButtons.forEach(link => {
      link.classList.remove('slider-counter__link--active');
      link.removeAttribute('aria-current');
    });
    if (this.currentPage > 0 && this.currentPage <= this.sliderControlButtons.length) {
      this.sliderControlButtons[this.currentPage - 1].classList.add('slider-counter__link--active');
      this.sliderControlButtons[this.currentPage - 1].setAttribute('aria-current', true);
    }
  }

  autoPlayToggle() {
    this.togglePlayButtonState(this.autoplayButtonIsSetToPlay);
    this.autoplayButtonIsSetToPlay ? this.pause() : this.play();
    this.autoplayButtonIsSetToPlay = !this.autoplayButtonIsSetToPlay;
  }

  focusOutHandling(event) {
    const focusedOnAutoplayButton = event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
    if (!this.autoplayButtonIsSetToPlay || focusedOnAutoplayButton) return;
    this.play();
  }

  focusInHandling(event) {
    const focusedOnAutoplayButton = event.target === this.sliderAutoplayButton || this.sliderAutoplayButton.contains(event.target);
    if (focusedOnAutoplayButton && this.autoplayButtonIsSetToPlay) {
      this.play();
    } else if (this.autoplayButtonIsSetToPlay) {
      this.pause();
    }
  }

  play() {
    if (this.slider) {
      this.slider.setAttribute('aria-live', 'off');
      clearInterval(this.autoplay);
      this.autoplay = setInterval(this.autoRotateSlides.bind(this), this.autoplaySpeed);
    }
  }

  pause() {
    if (this.slider) {
      this.slider.setAttribute('aria-live', 'polite');
      clearInterval(this.autoplay);
    }
  }

  togglePlayButtonState(pauseAutoplay) {
    if (this.sliderAutoplayButton) {
      if (pauseAutoplay) {
        this.sliderAutoplayButton.classList.add('slideshow__autoplay--paused');
        this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.playSlideshow);
      } else {
        this.sliderAutoplayButton.classList.remove('slideshow__autoplay--paused');
        this.sliderAutoplayButton.setAttribute('aria-label', window.accessibilityStrings.pauseSlideshow);
      }
    }
  }

  autoRotateSlides() {
    // custom code
    const slideScrollPosition = (this.currentPage + this.extraVisibleElement) === this.sliderItems.length ? 0 : this.slider.scrollLeft + this.slider.querySelector('.slideshow__slide').clientWidth;
    this.slider.scrollTo({
      left: slideScrollPosition
    });
  }

  setSlideVisibility() {
    if (!this.slider) return;
    
    this.sliderItemsToShow.forEach((item, index) => {
      const linkElements = item.querySelectorAll('a');

      if (index === this.currentPage - 1) {
        if (linkElements.length) linkElements.forEach(button => {
          button.removeAttribute('tabindex');
        });
        item.setAttribute('aria-hidden', 'false');
        item.removeAttribute('tabindex');
      } else {
        if (linkElements.length) linkElements.forEach(button => {
          button.setAttribute('tabindex', '-1');
        });
        item.setAttribute('aria-hidden', 'true');
        item.setAttribute('tabindex', '-1');
      }
    });
  }

  linkToSlide(event) {
    event.preventDefault();
    const slideScrollPosition = this.slider.scrollLeft + this.sliderFirstItemNode.clientWidth * (this.sliderControlLinksArray.indexOf(event.currentTarget) + 1 - this.currentPage);
    this.slider.scrollTo({
      left: slideScrollPosition
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
        ?.querySelector('[data-selected-value] > .swatch');
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
        target.selectedOptions[0].dataset.optionSwatchFocalPoint || 'unset'
      );
    } else if (tagName === 'INPUT' && target.type === 'radio') {
      const selectedOptionGroup = target.closest(`.product-form__input`) || target.closest('fieldset');
      const selectedSwatchValue = selectedOptionGroup?.querySelector('[data-selected-value], [data-selected-swatch-value], legend span, .form__label span');
      if (selectedSwatchValue) selectedSwatchValue.textContent = value;

      if (selectedOptionGroup) {
        selectedOptionGroup.querySelectorAll('label').forEach((option) => {
          option.classList.remove('selected');
          option.classList.remove('active');
        });
        const activeLabel = selectedOptionGroup.querySelector(`label[for="${target.id}"], label[data-val="${CSS.escape ? CSS.escape(value) : value}"], label[data-value="${CSS.escape ? CSS.escape(value) : value}"]`) || target.closest('label');
        if (activeLabel) {
          activeLabel.classList.add('selected');
          activeLabel.classList.add('active');
        }
      }
    }
  }

  getInputForEventTarget(target) {
    return target.tagName === 'SELECT' ? target.selectedOptions[0] : target;
  }
  
  get selectedOptionValues() {
    return Array.from(this.querySelectorAll('select option[selected], fieldset input:checked')).map(
      ({ dataset }) => dataset.optionValueId
    );
  }
}

customElements.define('variant-selects', VariantSelects);

class ProductRecommendations extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const handleIntersection = (entries, observer) => {
      if (!entries[0].isIntersecting) return;
      observer.unobserve(this);

      fetch(this.dataset.url)
          .then(response => response.text())
          .then(text => {
            const html = document.createElement('div');
            html.innerHTML = text;
            const recommendations = html.querySelector('product-recommendations');

            if (recommendations && recommendations.innerHTML.trim().length) {
              this.innerHTML = recommendations.innerHTML;
            }

            if (!this.querySelector('slider-component') && this.classList.contains('complementary-products')) {
              this.remove();
            }

            if (html.querySelector('.grid__item')) {
              this.classList.add('product-recommendations--loaded');
            }
          })
          .catch(e => {
            console.error(e);
          });
    }

    new IntersectionObserver(handleIntersection.bind(this), {rootMargin: '0px 0px 400px 0px'}).observe(this);
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

// Webi collaps
class WebiCollapse extends HTMLElement {
  constructor() {
    super();
    var col = this.getElementsByClassName("toggle");
    Array.from(col).forEach((ele) => {
      ele.setAttribute('tabindex', '0');
      var content = ele.nextElementSibling;
      var defaultOpen = ele.classList.contains("active");
      if (content && !defaultOpen) {
        content.style.height = '0px';
        content.setAttribute('data-collapsed', 'true');
      }
      ele.addEventListener("click", this.onSectionClick.bind(this));
      ele.addEventListener('keydown', this.handleKeyDown.bind(this));
    });
    
  }

  handleKeyDown(event){
    if (event.keyCode === 13) {
      this.onSectionClick(event);
    }
  }

  onSectionClick(event) {
    event.currentTarget.classList.toggle("active");
    var content = event.currentTarget.nextElementSibling;
    var isCollapsed = content.getAttribute('data-collapsed') === 'true';
    if (isCollapsed) {
      this.expandSection(content);
      content.setAttribute('data-collapsed', 'false');
    } else {
      this.collapseSection(content);
    }
  }

  expandSection(element) {
    var sectionHeight = element.scrollHeight;
    element.style.height = sectionHeight + 'px';
    element.style.visibility = 'visible';
    element.addEventListener('transitionend', () => {
      element.removeEventListener('transitionend', this.expandSection);
      element.style.height = null;
      element.style.visibility = 'visible';
    });
    element.setAttribute('data-collapsed', 'false');
  }

  collapseSection(element) {
    var sectionHeight = element.scrollHeight;
    element.style.height = sectionHeight + 'px';
    element.offsetHeight;
  
    element.style.transition = 'height 0.3s ease';
    element.style.height = '0px';
    
    element.addEventListener('transitionend', () => {
      element.removeEventListener('transitionend', this.collapseSection);
      element.style.transition = '';
      element.style.height = '0px';
      element.style.visibility = 'hidden';
    });
  
    element.setAttribute('data-collapsed', 'true');
  }
}

customElements.define('webi-collapse', WebiCollapse);


// User js
class UserPopup extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', this.popUpClick.bind(this));
    document.addEventListener('click', this.closePopup.bind(this));
  }

  popUpClick(event) {
    event.stopPropagation();
    this.querySelector("#userdrop").classList.toggle("hidden");
  }

  closePopup(event) {
    const userPopup = this.querySelector("#userdrop");
    if (!userPopup.contains(event.target)) {
      userPopup.classList.add("hidden");
    }
  }
}

customElements.define('user-popup', UserPopup);

// Cart dropdown
class CartDrop extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', this.popUpClick.bind(this));
    document.addEventListener('click', this.closePopup.bind(this));
  }
  popUpClick(event) {
    event.stopPropagation();
    let userPopup = this.querySelector("#cartdrop");
    if (!userPopup.contains(event.target)) {
      this.querySelector("#cartdrop").classList.toggle("hidden");
    }
  }
  closePopup(event) {
    let userPopup = this.querySelector("#cartdrop");
    if (!userPopup.contains(event.target)) {
      userPopup.classList.add("hidden");
    }
  }
}
customElements.define('cart-drop', CartDrop);


// Collection page load more

class LoadMore extends HTMLElement {
  constructor() {
    super();
    this.addEventListener('click', this.loadMoreProducts.bind(this));
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.addEventListener('keydown', this.handleKeyDown);
    this.next_url = document.getElementById('product-grid').dataset.nextUrl;
    this.loadMoreBtn = this.querySelector('.button');
  }
  handleKeyDown(e) {
    if (e.key === 'Enter' || e.keyCode === 13) {
      e.preventDefault();
      this.loadMoreProducts();
    }
  }
  async getNextPage() {
    try {
      let res = await fetch(this.next_url);
      return await res.text();
    } catch (error) {
      console.log(error);
    } 
  }
  async loadMoreProducts() {
    const load_more_spinner = this.getElementsByClassName('load-more_spinner')[0];
    if (this.loadMoreBtn) this.loadMoreBtn.style.display = 'none';
    load_more_spinner.style.display = 'block';
    let nextPage = await this.getNextPage();
    const parser = new DOMParser();
    const nextPageDoc = parser.parseFromString(nextPage, 'text/html');
    load_more_spinner.style.display = 'none';
    const productgrid = nextPageDoc.getElementById('product-grid');
    const new_products = productgrid.getElementsByClassName('grid__item');
    const temp = new_products;
    const new_url = productgrid.dataset.nextUrl;
    if (new_url) {
      if (this.loadMoreBtn) this.loadMoreBtn.style.display = 'inline-flex';
    }
    this.next_url = new_url;
    let currentIndex = 0;
    while (new_products.length > currentIndex) {
      let product = new_products[currentIndex];
      if(product.classList.contains('wbimgbnrblock')) {
        currentIndex++;
        continue;
      };
      document.getElementById('product-grid').appendChild(product);
    } 
  }
}
customElements.define('load-more', LoadMore);

// on click remove content on video
document.querySelectorAll('.banner-content-remove').forEach((close) => {
  close.addEventListener('click', (event) => {
    const parentElement = event.currentTarget.closest('.video_banner_box');
    if (parentElement) {
      parentElement.remove();
    }
  });
});

// Variant hover
class variantHover extends VariantSelects {
  constructor() { 
    super();
  }

  connectedCallback() {
    this.querySelectorAll('fieldset label').forEach((ele)=> {
      ele.addEventListener('mouseenter', (event) => {
        const options = event.target.closest('fieldset');
        options.querySelectorAll('label').forEach((option) => option.classList.remove('active'));
        event.target.classList.add('active');
        const swatchInput = event.target.querySelector('input');
        swatchInput.checked = true;
        swatchInput.dispatchEvent(new Event('change', { bubbles: true }));
      });
      
      ele.addEventListener('click', (event) => {
        if (event.target.dataset.href) {
          const productInfoNode = this.closest('product-info');
          const currentVariantId = productInfoNode.productForm?.variantIdInput?.value;
          window.location.href = `${event.target.dataset.href}?variant=${currentVariantId}`;
        }
      });
    });

    this.addEventListener('change', (event) => {
      const target = this.getInputForEventTarget(event.target);
      this.updateSelectionMetadata(event);
      
      publish(PUB_SUB_EVENTS.optionValueSelectionChange, {
        data: {
          event,
          target,
          selectedOptionValues: this.selectedOptionValues,
        },
      });
    });
  }
}
customElements.define('variant-hover', variantHover);

class ColorSwatch extends HTMLElement {
  constructor() { 
    super();
    const fieldsets = Array.from(this.querySelectorAll('fieldset label'));
    this.querySelectorAll('fieldset label').forEach((ele)=>{
      ele.addEventListener('mouseenter', this.onVariantChangeHover.bind(this));
      ele.addEventListener('click', this.onLabelClick.bind(this));
    });
  }

  onLabelClick(event){
    if (event.target.dataset.href) {
      window.location.href = this.buildRedirectUrlWithParams(event.target.dataset.href, this.currentVariant.id);
    }
  }

  buildRedirectUrlWithParams(url, variantId) {
    const params = [];

    url = url.split('?')[0];

    if (variantId) {
      params.push(`variant=${variantId}`);
    }

    return `${url}?${params.join('&')}`;
  }

  updateOptions() {
    this.options = Array.from(this.querySelectorAll('fieldset'), (element) => {
      return Array.from(element.querySelectorAll('input')).find((radio) => radio.checked)?.value;
    });
  }

  onVariantChangeHover(event) {
  const currentSelectColor = event.target.closest("label");
  if (!currentSelectColor) return;
  const fieldsetGroup = currentSelectColor.closest("fieldset");
  if (!fieldsetGroup) return;
  fieldsetGroup.querySelectorAll("label").forEach(el => el.classList.remove("active"));
  currentSelectColor.classList.add("active");
  const inputEl = currentSelectColor.querySelector("input");
  if (inputEl) {
    inputEl.checked = true;
  }
  this.updateOptions?.();
  this.updateMasterId?.();
  this.updateVariantInput?.();
  this.updateMedia?.();
}


  updateVariantInput() {
    const card = this.closest('.card');
    const productForms = card.querySelectorAll(`#ProductInfo-${this.dataset.section}-${this.dataset.product}`);
    productForms.forEach((productForm) => {
      const input = productForm.querySelectorAll('input[name="id"]');
      Array.from(input).forEach((element, index) => {
        element.value = this.currentVariant?.id;
      });

      const select = productForm.querySelectorAll('select[name="id"]');
      Array.from(select).forEach((element, index) => {
        element.value = this.currentVariant.id;
      });
    });

    const optionData = this.closest('.grid__item').querySelectorAll('select option');
    const regularPrice = this.closest('.grid__item').querySelector('.price .price__container .price__regular .price-item--regular');
    const saleRegularPrice = this.closest('.grid__item').querySelector('.price .price__container .price__sale .price-item--sale');
    const salePrice = this.closest('.grid__item').querySelector('.price .price__container .price__sale .price-item--regular');
    const wbunitPrice = this.closest('.grid__item').querySelector('.price .price__container .unit-price .cardunitp');
    const wbunitValue = this.closest('.grid__item').querySelector('.price .price__container .unit-price .cardunitv');
    const wbPercentBadge = this.closest('.grid__item').querySelector('.card__badge .percent__badge-sale');
    const wbAmountBadge = this.closest('.grid__item').querySelector('.card__badge .amount__badge-sale');

    const _ = this;
    optionData.forEach((data) => {
      if (data.value == this.currentVariant.id) {
        if(data.dataset.cprice != '' &&  data.dataset.price != data.dataset.cprice) {
          saleRegularPrice.innerHTML = data.dataset.price;
          salePrice.innerHTML = data.dataset.cprice;
          if(data.dataset.damount != '' && wbAmountBadge) {
            wbAmountBadge.innerHTML = data.dataset.damount;
            wbAmountBadge.classList.remove('hidden');
          }
          if(data.dataset.percent != '' && wbPercentBadge) {
            wbPercentBadge.innerHTML = data.dataset.percent;
            wbPercentBadge.classList.remove('hidden');
          }
          if (_.closest('.grid__item').querySelector('.price').dataset.quantityPriceBreakConfig == "true") {
            _.closest('.grid__item').querySelector('.price').classList.add("price--on-sale");
          }
        } else {
          regularPrice.innerHTML = data.dataset.price;
          if(wbPercentBadge){
            wbPercentBadge.classList.add('hidden');
          }
          if(wbAmountBadge){
            wbAmountBadge.classList.add('hidden');
          }
          _.closest('.grid__item').querySelector('.price').classList.remove("price--on-sale");
        }
        if(data.dataset.unitprice && wbunitPrice) {
          wbunitPrice.innerHTML = data.dataset.unitprice;
          _.closest('.grid__item').querySelector('.price').classList.add("price--on-sale");
        }
        if(data.dataset.unitvalue && wbunitValue) {
          wbunitValue.innerHTML = data.dataset.unitvalue;
          _.closest('.grid__item').querySelector('.price').classList.add("price--on-sale");
        }
      }
    });
  }

  updateMedia() {
    if (!this.currentVariant || !this.currentVariant.featured_media) return;
    const card = this.closest('.card');
    const newMedia = card.querySelector(
        `[data-media-id="${this.dataset.section}-${this.dataset.product}-${this.currentVariant.featured_media.id}"]`
    );
    if (!newMedia) return;
    const parent = newMedia.parentElement;
    if (parent.firstChild == newMedia) return;
    parent.prepend(newMedia);
  }

  updateMasterId() {
    this.currentVariant = this.getVariantData().find((variant) => {
      return !variant.options
        .map((option, index) => {
          return this.options[index] === option;
        })
        .includes(false);
    });
  }

  getVariantData() {
    this.variantData = this.variantData || JSON.parse(this.querySelector('[type="application/json"]').textContent);
    return this.variantData;
  }
}
customElements.define('color-swatch', ColorSwatch);


// Lookbook Active outside
class LookBook extends HTMLElement {
  constructor() {
    super();
    this.querySelectorAll('div.wblookbook .wblookbtn').forEach((lookbookpoint) => {
      lookbookpoint.addEventListener('click', this.onButtonClick.bind(this));
    });
  }
  onButtonClick(blockId) {
    var blockId = event.currentTarget.dataset.blobkid;
    this.querySelectorAll('li').forEach((lookbookproduct) => {
      if(lookbookproduct.getAttribute('data-blobkid') == blockId)
        lookbookproduct.classList.add('active');
      else
        lookbookproduct.classList.remove('active');
    });
    this.querySelectorAll('div.wblookbook .wblookbtn').forEach((lookbookpoint) => {
      if(lookbookpoint.getAttribute('data-blobkid') == blockId)
         lookbookpoint.classList.add('active');
      else
         lookbookpoint.classList.remove('active');
    });
  }
}
customElements.define('look-book', LookBook);


// lookbook grid slider

document.addEventListener("DOMContentLoaded", function() {
  const lookbookComponents = document.querySelectorAll('look-book');

  lookbookComponents.forEach(function(component) {
      const lookbookButtons = component.querySelectorAll('.wblookbook');

      lookbookButtons.forEach(function(button) {
          button.addEventListener('click', function() {
              const buttonId = this.getAttribute('data-id');
              const correspondingTarget = component.querySelector(`.slider-counter__link[data-id='${buttonId}']`);

              if (correspondingTarget) {
                  correspondingTarget.click();
              }
          });
      });
  });
});

document.addEventListener('DOMContentLoaded', function() {
  function triggerSlideshowPrevButton() {
    const customPrevButton = document.querySelector('.custom__button .slider-button--prev');
    const slideshowPrevButtons = document.querySelectorAll('.slide-trigger .slider-button--prev');
    if (customPrevButton && slideshowPrevButtons.length > 0) {
      customPrevButton.addEventListener('click', function() {
        slideshowPrevButtons.forEach(button => button.click());
      });
    }
  }
  function triggerSlideshowNextButton() {
    const customNextButton = document.querySelector('.custom__button .slider-button--next');
    const slideshowNextButtons = document.querySelectorAll('.slide-trigger .slider-button--next');
    if (customNextButton && slideshowNextButtons.length > 0) {
      customNextButton.addEventListener('click', function() {
        slideshowNextButtons.forEach(button => button.click());
      });
    }
  }
  triggerSlideshowPrevButton();
  triggerSlideshowNextButton();
});

// Remove blank div js
let blankContainer = document.querySelectorAll(".header__submenu .container:not(:empty):not(:has(*)), .header__submenu .container:first-child:not(:has(.wbmenuinner))");
blankContainer.forEach(container => {
  container.remove();
});

// page scrollbar width
function updateScrollbarWidth() {
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  document.documentElement.style.setProperty('--scrollbar-width', `${scrollbar}px`);
}
document.addEventListener('DOMContentLoaded', updateScrollbarWidth);
window.addEventListener('resize', updateScrollbarWidth);

class YouTubeVideo extends HTMLElement {
  constructor() {
    super();
    this.template = this.querySelector('template');
    this.iframeLoaded = false;

    this.observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting && !this.iframeLoaded) {
            this.loadIframe();
          }
        });
      },
      { rootMargin: '200px', threshold: 0.25 }
    );
  }

  connectedCallback() {
    this.observer.observe(this);
  }

  disconnectedCallback() {
    this.observer.disconnect();
  }

  loadIframe() {
    if (!this.template) return;

    const iframe = this.template.content.firstElementChild.cloneNode(true);
    iframe.src = iframe.dataset.src;
    iframe.setAttribute('loading', 'lazy');

    this.appendChild(iframe);
    this.iframeLoaded = true;
  }
}

customElements.define('youtube-video', YouTubeVideo);

/* ==========================================================================
   SHREEDHYA CARD GLOBAL INTERACTIONS (ATC & COLOR SWATCHES)
   ========================================================================== */
(function () {
  var root = (window.Shopify && Shopify.routes && Shopify.routes.root) || '/';

  // Always re-bind cleanly
  if (window.__shreedhyaCardClickHandler) {
    document.removeEventListener('click', window.__shreedhyaCardClickHandler, true);
  }

  window.__shreedhyaCardClickHandler = function (e) {
    var sw = e.target.closest('.shreedhya-swatch');
    if (sw) return pickColor(e, sw);
    var btn = e.target.closest('.shreedhya-atc-button, .shreedhya-atc-box button');
    if (btn) openSizePopup(e, btn);
  };

  document.addEventListener('click', window.__shreedhyaCardClickHandler, true);

  function pickColor(e, sw) {
    e.preventDefault(); e.stopPropagation();
    var card = sw.closest('.card-wrapper'); if (!card) return;
    card.querySelectorAll('.shreedhya-swatch').forEach(function (s) { s.classList.remove('active'); });
    sw.classList.add('active');
    var vid = sw.dataset.variantId;
    var input = card.querySelector('.shreedhya-product-form .product-variant-id');
    if (input && vid) input.value = vid;
    var btn = card.querySelector('.shreedhya-atc-button');
    if (btn) btn.disabled = sw.dataset.available !== 'true';
    if (sw.dataset.image) {
      var img = card.querySelector('.card__media .product__media-item img');
      if (img) { img.removeAttribute('srcset'); img.src = sw.dataset.image; }
    }
    card.querySelectorAll('a[href*="variant="]').forEach(function (a) {
      a.setAttribute('href', a.getAttribute('href').replace(/variant=\d+/, 'variant=' + vid));
    });
  }

  function addToCart(e, btn) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
      e.stopImmediatePropagation();
    }
    if (btn.disabled || btn.classList.contains('loading')) return;
    var form = btn.closest('form');
    if (!form) return;
    var idEl = form.querySelector('.product-variant-id');
    if (!idEl || !idEl.value) return;
    var spinner = btn.querySelector('.loading-overlay__spinner');
    btn.classList.add('loading');
    if (spinner) spinner.classList.remove('hidden');

    fetch(root + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: Number(idEl.value), quantity: 1 })
    })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw d; return d; }); })
      .then(function () {
        return refreshCart().then(function () {
          var dr = document.querySelector('cart-drawer');
          if (dr && typeof dr.open === 'function') {
            dr.open();
          } else if (dr && typeof dr.show === 'function') {
            dr.show();
          } else if (dr) {
            dr.classList.add('active');
          }
        });
      })
      .catch(function (err) { console.error('Add to cart error:', err); })
      .then(function () {
        btn.classList.remove('loading');
        if (spinner) spinner.classList.add('hidden');
      });
  }

  function parse(html) { return new DOMParser().parseFromString(html, 'text/html'); }

  function refreshCart() {
    return fetch(root + '?sections=cart-icon-bubble,cart-drawer')
      .then(function (r) { return r.json(); })
      .then(function (s) {
        var bubble = document.getElementById('cart-icon-bubble');
        if (bubble && s['cart-icon-bubble']) {
          var b = parse(s['cart-icon-bubble']).querySelector('.shopify-section');
          if (b) bubble.innerHTML = b.innerHTML;
        }
        var drawer = document.querySelector('cart-drawer');
        if (drawer && s['cart-drawer']) {
          var src = parse(s['cart-drawer']).querySelector('.drawer__inner');
          var dst = drawer.querySelector('.drawer__inner');
          if (src && dst) dst.innerHTML = src.innerHTML;
          drawer.classList.remove('is-empty');
        }
      })
      .catch(function () {
        return fetch(root + 'cart.js').then(function (r) { return r.json(); }).then(function (c) {
          document.querySelectorAll('.cart-count-bubble span[aria-hidden="true"], [data-cart-count]')
            .forEach(function (el) { el.textContent = c.item_count; });
        });
      });
  }
  /* ================= OPTIONS POPUP (SWATCH + COLOR-WISE SLIDER) ================= */
  var SIZE_CHART_URL = root + 'pages/size-chart'; // blank rakho to link hide ho jayega
  var pop, cur = null;
  var prodCache = {};

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function matches(v, sel, skip) {
    for (var i = 0; i < sel.length; i++) {
      if (i !== skip && sel[i] && v.options[i] !== sel[i]) return false;
    }
    return true;
  }

  function colorIdx(d) {
    for (var i = 0; i < d.options.length; i++) {
      if (/colou?r/i.test(d.options[i])) return i;
    }
    return -1;
  }

  /* ---------- image helpers ---------- */
  function fname(u) { return String(u || '').split('?')[0].split('/').pop(); }

  function sized(u) {
    u = String(u || '');
    if (!u) return u;
    if (u.indexOf('//') === 0) u = 'https:' + u;
    if (/[?&]width=/.test(u)) return u;
    return u + (u.indexOf('?') > -1 ? '&' : '?') + 'width=800';
  }

  function loadProduct(handle) {
    if (!handle) return Promise.resolve(null);
    if (!prodCache[handle]) {
      prodCache[handle] = fetch(root + 'products/' + encodeURIComponent(handle) + '.js', { headers: { 'Accept': 'application/json' } })
        .then(function (r) { if (!r.ok) throw new Error('product fetch failed'); return r.json(); })
        .catch(function (err) { console.error('Popup product load error:', err); delete prodCache[handle]; return null; });
    }
    return prodCache[handle];
  }
    // bina color wale products ke liye: product ki saari images ek list me
  function buildAll(prod) {
    var media = (prod.media || []).filter(function (m) { return m.media_type === 'image' && m.src; });
    var srcs = media.length
      ? media.map(function (m) { return m.src; })
      : (prod.images || []);
    return srcs.map(sized);
  }
  // product ki saari images ko color ke hisaab se groups me todta hai -> { 'Deep Teal': [url, url, ...], ... }
  function buildGroups(d, ci, prod) {
    var media = (prod.media || []).filter(function (m) { return m.media_type === 'image' && m.src; });
    var list = media.length
      ? media.map(function (m) { return { src: m.src, alt: String(m.alt || '').toLowerCase() }; })
      : (prod.images || []).map(function (s) { return { src: s, alt: '' }; });
    var all = list.map(function (m) { return sized(m.src); });
    if (!list.length) return null;

    var names = [];
    d.variants.forEach(function (v) { if (names.indexOf(v.options[ci]) < 0) names.push(v.options[ci]); });

    // 1) ALT TEXT se (agar har color ka naam kisi image ke alt me hai)
    var altGroups = {}, altOk = names.length > 1;
    names.forEach(function (n) {
      var nl = n.toLowerCase();
      altGroups[n] = list.filter(function (m) { return m.alt.indexOf(nl) > -1; }).map(function (m) { return sized(m.src); });
      if (!altGroups[n].length || altGroups[n].length === list.length) altOk = false;
    });
    if (altOk) return altGroups;

    // 2) POSITION se: har color ke variant ki image se us color ka group shuru
    var anchor = {};
    (prod.variants || []).forEach(function (pv) {
      var n = pv['option' + (ci + 1)];
      var fi = pv.featured_image;
      if (!n || !fi || !fi.src) return;
      var f = fname(fi.src), idx = -1;
      for (var k = 0; k < list.length; k++) { if (fname(list[k].src) === f) { idx = k; break; } }
      if (idx > -1 && (anchor[n] === undefined || idx < anchor[n])) anchor[n] = idx;
    });

    var have = names.filter(function (n) { return anchor[n] !== undefined; });
    var groups = {};
    have.sort(function (a, b) { return anchor[a] - anchor[b]; });
    have.forEach(function (n, i) {
      var start = (i === 0) ? 0 : anchor[n];
      var end = (i + 1 < have.length) ? anchor[have[i + 1]] : list.length;
      var part = list.slice(start, end).map(function (m) { return sized(m.src); });
      if (part.length) groups[n] = part;
    });
    names.forEach(function (n) { if (!groups[n]) groups[n] = all; }); // jis color ka group na bane, uske liye saari images
    return groups;
  }

  // swatch ka background: 1) Shopify swatch  2) us color ke variant ki photo  3) grey
  function swatchBg(d, ci, name) {
    var s = d.swatches && d.swatches[name];
    if (s) return s.indexOf('url(') === 0 ? s + ' center/cover' : s;
    for (var k = 0; k < d.variants.length; k++) {
      var v = d.variants[k];
      if (v.options[ci] === name && v.img) return 'url(' + v.img + ') center/cover';
    }
    return '#d9d9d9';
  }

  function markThumb(i) {
    var track = pop.querySelector('.sd-pop__track');
    var th = pop.querySelectorAll('.sd-pop__thumb');
    if (!th.length) return;
    if (typeof i !== 'number') {
      var kids = track.children;
      var step = kids.length > 1 ? (kids[1].offsetLeft - kids[0].offsetLeft) : track.clientWidth;
      i = step > 0 ? Math.round(track.scrollLeft / step) : 0;
    }
    th.forEach(function (t, k) { t.classList.toggle('active', k === i); });
  }

  function goSlide(i) {
    var track = pop.querySelector('.sd-pop__track');
    var s = track.children[i];
    if (!s) return;
    var pl = parseInt(getComputedStyle(track).paddingLeft, 10) || 0;
    track.scrollTo({ left: Math.max(0, s.offsetLeft - pl), behavior: 'smooth' });
  }

  function setSlides(urls, active) {
    var track = pop.querySelector('.sd-pop__track');
    track.innerHTML = urls.map(function (u) {
      return '<div class="sd-pop__slide"><img src="' + esc(u) + '" alt="' + esc(cur.d.title || '') + '" loading="lazy"></div>';
    }).join('');
    pop.querySelector('.sd-pop__thumbs').innerHTML = urls.length > 1
      ? urls.map(function (u, i) {
          return '<button type="button" class="sd-pop__thumb" data-i="' + i + '" aria-label="Image ' + (i + 1) + '"><img src="' + esc(u) + '" alt="" loading="lazy"></button>';
        }).join('')
      : '';
    var idx = 0, f = fname(active);
    if (f) {
      for (var k = 0; k < urls.length; k++) { if (fname(urls[k]) === f) { idx = k; break; } }
    }
    var s = track.children[idx];
    var pl = parseInt(getComputedStyle(track).paddingLeft, 10) || 0;
    track.scrollLeft = s ? Math.max(0, s.offsetLeft - pl) : 0;
    markThumb(idx);
  }

  function buildPopup() {
    pop = document.createElement('div');
    pop.className = 'sd-pop';
    pop.innerHTML =
      '<div class="sd-pop__box" role="dialog" aria-modal="true">' +
        '<button type="button" class="sd-pop__close" aria-label="Close">' +
          '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="13" y2="13"></line><line x1="13" y1="1" x2="1" y2="13"></line></svg>' +
        '</button>' +
        '<div class="sd-pop__media"><div class="sd-pop__track"></div><div class="sd-pop__thumbs"></div></div>' +
        '<div class="sd-pop__side">' +
          '<div class="sd-pop__scroll">' +
            '<h3 class="sd-pop__title"></h3>' +
            '<div class="sd-pop__price"><b></b><s></s><span class="sd-pop__off"></span></div>' +
            '<div class="sd-pop__groups"></div>' +
            '<div class="sd-pop__offers"></div>' +
          '</div>' +
          '<p class="sd-pop__err" hidden></p>' +
          '<div class="sd-pop__btns">' +
            '<button type="button" class="sd-pop__btn sd-pop__btn--buy" data-act="buy">BUY NOW</button>' +
            '<button type="button" class="sd-pop__btn sd-pop__btn--bag" data-act="bag">ADD TO BAG</button>' +
          '</div>' +
        '</div>' +
      '</div>';
     initOffers();
    document.body.appendChild(pop);

    pop.querySelector('.sd-pop__track').addEventListener('scroll', markThumb, { passive: true });
    pop.addEventListener('click', function (e) {
      if (e.target === pop || e.target.closest('.sd-pop__close')) return closePop();
      if (offersClick(e)) return;
      var tb = e.target.closest('.sd-pop__thumb');
      if (tb) return goSlide(Number(tb.dataset.i));
      var o = e.target.closest('.sd-pop__opt');
      if (o) return o.classList.contains('is-dis') ? null : pickOpt(o);
      var a = e.target.closest('[data-act]');
      if (a) submitPop(a);
    });

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape' && pop && pop.classList.contains('open')) closePop();
    });
  }

  function render() {
    var d = cur.d, sel = cur.sel, ci = cur.ci;

    pop.querySelector('.sd-pop__groups').innerHTML = cur.vals.map(function (values, i) {
      var name = d.options[i];
      var isColor = (i === ci);

      var items = values.map(function (val) {
        var ok = d.variants.some(function (v) {
          return v.available && v.options[i] === val && matches(v, sel, i);
        });
        var cls = 'sd-pop__opt' + (isColor ? ' sd-pop__sw' : '') +
                  (sel[i] === val ? ' active' : '') + (ok ? '' : ' is-dis');
        if (isColor) {
          return '<button type="button" class="' + cls + '" data-i="' + i + '" data-v="' + esc(val) +
                 '" aria-label="' + esc(val) + '" title="' + esc(val) +
                 '" style="background:' + esc(swatchBg(d, ci, val)) + '"></button>';
        }
        return '<button type="button" class="' + cls + '" data-i="' + i + '" data-v="' + esc(val) + '">' + esc(val) + '</button>';
      }).join('');

      if (isColor) {
        return '<div class="sd-pop__grp"><div class="sd-pop__lbl sd-pop__lbl--color"><span>' + esc(name) +
               ':</span><b>' + esc(sel[i] || '') + '</b></div><div class="sd-pop__opts sd-pop__opts--sw">' + items + '</div></div>';
      }
      var chart = (SIZE_CHART_URL && /size/i.test(name))
        ? '<a class="sd-pop__chart" href="' + SIZE_CHART_URL + '" target="_blank" rel="noopener">Size Chart &rsaquo;</a>' : '';
      return '<div class="sd-pop__grp"><div class="sd-pop__lbl"><span>' + esc(name) + chart + '</span><b>' +
             esc(sel[i] || '') + '</b></div><div class="sd-pop__opts">' + items + '</div></div>';
    }).join('');

    var list = d.variants.filter(function (v) { return matches(v, sel, -1); });
    var v = list.filter(function (x) { return x.available; })[0] || list[0] || d.variants[0];

    // ---- SLIDER: jis color ki images, wahi dikhao ----
    var color = (ci > -1) ? v.options[ci] : null;
    var urls = null;
    if (color && cur.groups && cur.groups[color] && cur.groups[color].length) {
      urls = cur.groups[color];
    } else if (ci === -1 && cur.all && cur.all.length) {
      urls = cur.all; // bina color wala product: saari images
    }
    if (!urls) urls = [v.img || d.image].filter(Boolean);
    var sig = String(color) + '|' + (cur.groups ? 'g' : 'n') + '|' + (cur.all ? 'a' : 'n') + '|' + urls.length;
    if (sig !== cur.sig) {
      cur.sig = sig;
      setSlides(urls, v.img);
    }

    pop.querySelector('.sd-pop__price b').textContent = v.price || '';
    var mrp = pop.querySelector('.sd-pop__price s');
    var off = pop.querySelector('.sd-pop__off');
    var hasDisc = v.compare && v.compare !== v.price;
    mrp.textContent = hasDisc ? v.compare : '';
    mrp.hidden = !hasDisc;
    off.textContent = (hasDisc && v.pct > 0) ? v.pct + '% OFF' : '';
    off.hidden = !(hasDisc && v.pct > 0);

    var complete = sel.every(Boolean);
    pop.querySelectorAll('.sd-pop__btn').forEach(function (b) {
      b.classList.toggle('is-wait', !complete);
    });
  }

  function missingNames() {
    return cur.d.options.filter(function (n, i) { return !cur.sel[i]; });
  }

  function pickOpt(o) {
    var i = Number(o.dataset.i), val = o.dataset.v, d = cur.d, sel = cur.sel;
    sel[i] = val;
    for (var j = 0; j < sel.length; j++) {
      if (j !== i && sel[j] && !d.variants.some(function (v) { return v.available && matches(v, sel, -1); })) {
        sel[j] = '';
      }
    }
    pop.querySelector('.sd-pop__err').hidden = true;
    render();
  }

  function openSizePopup(e, btn) {
    if (e) {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (typeof e.stopPropagation === 'function') e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    }
    if (!btn && e && e.target) btn = e.target.closest('.shreedhya-atc-button, .shreedhya-atc-box button');
    if (!btn) return;
    if (btn._openingSizePopup) return;
    btn._openingSizePopup = true;
    setTimeout(function () { btn._openingSizePopup = false; }, 350);

    var card = btn.closest('.card-wrapper');
    if (!card || btn.disabled) return;

    var dataEl = card.querySelector('.shreedhya-card-data');
    if (!dataEl) return addToCart(e, btn);

    var d;
    try { d = JSON.parse(dataEl.textContent); }
    catch (err) { console.error('Popup JSON error:', err); return addToCart(e, btn); }

    if (!d.variants || d.variants.length <= 1) return addToCart(e, btn);

    var vals = d.options.map(function (n, i) {
      var out = [];
      d.variants.forEach(function (v) { if (out.indexOf(v.options[i]) < 0) out.push(v.options[i]); });
      return out;
    });

    if (!pop) buildPopup();

    var me = cur = {
      d: d,
      vals: vals,
      ci: colorIdx(d),
      groups: null,
      all: null,
      sig: '',
      sel: vals.map(function (a) { return a.length === 1 ? a[0] : ''; })
    };

    pop.querySelector('.sd-pop__title').textContent = d.title || '';
    pop.querySelector('.sd-pop__err').hidden = true;

    pop.classList.add('open');            // pehle open (layout ke liye), phir render
    document.body.classList.add('overflow-hidden');
    resetOffers();
    render();

    // saari images background me load karo (color wale aur bina color wale, dono ke liye)
    if (d.handle) {
      loadProduct(d.handle).then(function (prod) {
        if (!prod || cur !== me || !pop.classList.contains('open')) return;
        if (me.ci > -1) me.groups = buildGroups(d, me.ci, prod);
        else me.all = buildAll(prod);
        me.sig = '';
        render();
      });
    }
  }

  function closePop() {
    if (!pop) return;
    pop.classList.remove('open');
    document.body.classList.remove('overflow-hidden');
  }

  function submitPop(a) {
    var miss = missingNames();
    if (miss.length) {
      var err = pop.querySelector('.sd-pop__err');
      err.textContent = 'Please select ' + miss.join(', ');
      err.hidden = false;
      return;
    }
    var v = cur.d.variants.filter(function (x) { return x.available && matches(x, cur.sel, -1); })[0];
    if (!v) return;

    var btns = pop.querySelectorAll('.sd-pop__btn');
    btns.forEach(function (b) { b.disabled = true; });
    var buy = a.dataset.act === 'buy';

    fetch(root + 'cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ id: v.id, quantity: 1 })
    })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw d; return d; }); })
      .then(function () {
        if (buy) { window.location.href = root + 'checkout'; return; }
        return refreshCart().then(function () {
          closePop();
          var dr = document.querySelector('cart-drawer');
          if (dr && typeof dr.open === 'function') dr.open();
          else if (dr && typeof dr.show === 'function') dr.show();
          else if (dr) dr.classList.add('active');
        });
      })
      .catch(function (err) { console.error('Cart add error:', err); })
      .then(function () { btns.forEach(function (b) { b.disabled = false; }); });
  }
    /* ================= OFFERS (COUPON SLIDER) ================= */
  function initOffers() {
    var host = pop.querySelector('.sd-pop__offers');
    var tpl = document.getElementById('sd-offers-tpl');
    if (!host || !tpl) return;
    host.appendChild(tpl.content.cloneNode(true));
    var tr = host.querySelector('.sd-offers__track');
    var dots = host.querySelector('.sd-offers__dots');
    var n = tr.children.length;
    if (n < 2) {
      dots.style.display = 'none';
      host.querySelector('.sd-offers__nav').style.display = 'none';
    } else {
      dots.innerHTML = new Array(n + 1).join('<span></span>');
    }
    tr.addEventListener('scroll', syncOffers, { passive: true });
    syncOffers();
  }

  function syncOffers() {
    var tr = pop && pop.querySelector('.sd-offers__track');
    if (!tr || !tr.children.length) return;
    var kids = tr.children;
    var step = kids.length > 1 ? (kids[1].offsetLeft - kids[0].offsetLeft) : tr.clientWidth;
    var atEnd = tr.scrollLeft + tr.clientWidth >= tr.scrollWidth - 2;
    var i = step > 0 ? Math.round(tr.scrollLeft / step) : 0;
    if (atEnd) i = kids.length - 1;
    pop.querySelectorAll('.sd-offers__dots span').forEach(function (d, k) {
      d.classList.toggle('active', k === i);
    });
    var prev = pop.querySelector('.sd-offers__arrow[data-dir="-1"]');
    var next = pop.querySelector('.sd-offers__arrow[data-dir="1"]');
    if (prev) prev.disabled = tr.scrollLeft <= 2;
    if (next) next.disabled = atEnd;
  }

  function resetOffers() {
    var tr = pop && pop.querySelector('.sd-offers__track');
    if (!tr) return;
    tr.scrollLeft = 0;
    syncOffers();
  }

  function offersClick(e) {
    var cp = e.target.closest('.sd-offer__code');
    if (cp) { copyCode(cp); return true; }
    var ar = e.target.closest('.sd-offers__arrow');
    if (ar) {
      var tr = pop.querySelector('.sd-offers__track');
      if (tr && tr.children.length > 1) {
        var step = tr.children[1].offsetLeft - tr.children[0].offsetLeft;
        tr.scrollBy({ left: Number(ar.dataset.dir) * step, behavior: 'smooth' });
      }
      return true;
    }
    return false;
  }
    function heartBurst(btn) {
    var card = btn.closest('.sd-offer');
    if (!card) return;
    card.querySelectorAll('.sd-heart, .sd-stamp').forEach(function (n) { n.remove(); });

    var cr = card.getBoundingClientRect();
    var br = btn.getBoundingClientRect();
    var ox = br.left - cr.left + br.width / 2;
    var oy = br.top - cr.top + br.height / 2;
    var cols = ['#e53935', '#ff6f91', '#f06292', '#B63A2B', '#ff8a65', '#ec407a'];

    for (var i = 0; i < 18; i++) {
      var h = document.createElement('span');
      h.className = 'sd-heart';
      h.textContent = '\u2665';
      h.style.left = ox + 'px';
      h.style.top = oy + 'px';
      h.style.color = cols[Math.floor(Math.random() * cols.length)];
      h.style.fontSize = (9 + Math.random() * 10) + 'px';
      h.style.setProperty('--dx', (Math.random() * 150 - 75) + 'px');
      h.style.setProperty('--dy', (-(45 + Math.random() * 70)) + 'px');
      h.style.setProperty('--rot', (Math.random() * 80 - 40) + 'deg');
      h.style.animationDelay = (Math.random() * 0.3) + 's';
      h.style.animationDuration = (1.1 + Math.random() * 0.7) + 's';
      card.appendChild(h);
    }

    var st = document.createElement('span');
    st.className = 'sd-stamp';
    st.textContent = 'COPIED \u2713';
    card.appendChild(st);

    setTimeout(function () {
      card.querySelectorAll('.sd-heart, .sd-stamp').forEach(function (n) { n.remove(); });
    }, 2200);
  }

  function copyCode(btn) {
    var code = btn.dataset.code || '';
    var label = btn.querySelector('span');
    function done() {
      btn.classList.add('is-copied');
      heartBurst(btn);
      if (label) label.textContent = 'COPIED!';
      setTimeout(function () {
        btn.classList.remove('is-copied');
        if (label) label.textContent = code;
      }, 1500);
    }
    function fallback() {
      var t = document.createElement('textarea');
      t.value = code;
      t.style.position = 'fixed';
      t.style.opacity = '0';
      document.body.appendChild(t);
      t.select();
      try { document.execCommand('copy'); done(); } catch (err) { console.error('Copy failed', err); }
      document.body.removeChild(t);
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(code).then(done).catch(fallback);
    } else {
      fallback();
    }
  }

  window.openSizePopup = openSizePopup;
  window.buildPopup = buildPopup;
})();