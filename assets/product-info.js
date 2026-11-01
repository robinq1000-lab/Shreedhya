if (!customElements.get('product-info')) {
  customElements.define(
    'product-info',
    class ProductInfo extends HTMLElement {
      quantityInput = undefined;
      quantityForm = undefined;
      cartUpdateUnsubscriber = undefined;
      onVariantChangeUnsubscriber = undefined;
      abortController = undefined;
      pendingRequestUrl = null;
      preProcessHtmlCallbacks = [];
      postProcessHtmlCallbacks = [];

      constructor() {
        super();
        
        this.quantityInput = this.querySelector('.quantity__input');

        //this.input = this.querySelector('.quantity__input');
        //this.currentVariant = this.querySelector('.product-variant-id');
        //this.variantSelects = this.querySelector('variant-radios');
        //this.submitButton = this.querySelector('[type="submit"]');
      }

      connectedCallback() {
        this.initializeProductSwapUtility();

        /*this.variantChangeUnsubscriber = subscribe(
          PUB_SUB_EVENTS.variantChange,
          this.handleOptionValueChange.bind(this)
        );*/

        this.onVariantChangeUnsubscriber = subscribe(
          PUB_SUB_EVENTS.optionValueSelectionChange,
          this.handleOptionValueChange.bind(this)
        );
        
        this.initQuantityHandlers();
        this.dispatchEvent(new CustomEvent('product-info:loaded', { bubbles: true }));

        /*if (!this.input) return;
        this.quantityForm = this.querySelector('.product-form__quantity');
        if (!this.quantityForm) return;
        this.setQuantityBoundries();
        if (!this.dataset.originalSection) {
          this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, this.fetchQuantityRules.bind(this));
        }
        this.variantChangeUnsubscriber = subscribe(PUB_SUB_EVENTS.variantChange, (event) => {
          const sectionId = this.dataset.originalSection ? this.dataset.originalSection : this.dataset.section;
          if (event.data.sectionId !== sectionId) return;
          this.updateQuantityRules(event.data.sectionId, event.data.html);
          this.setQuantityBoundries();
        });*/
      }

      addPreProcessCallback(callback) {
        this.preProcessHtmlCallbacks.push(callback);
      }

      initQuantityHandlers() {
        if (!this.quantityInput) return;

        this.quantityForm = this.querySelector('.product-form__quantity');
        if (!this.quantityForm) return;

        this.setQuantityBoundries();
        if (!this.dataset.originalSection) {
          this.cartUpdateUnsubscriber = subscribe(PUB_SUB_EVENTS.cartUpdate, this.fetchQuantityRules.bind(this));
        }
      }

      disconnectedCallback() {
        this.onVariantChangeUnsubscriber();
        this.cartUpdateUnsubscriber?.();
        /*if (this.cartUpdateUnsubscriber) {
          this.cartUpdateUnsubscriber();
        }
        if (this.variantChangeUnsubscriber) {
          this.variantChangeUnsubscriber();
        }*/
      }

      initializeProductSwapUtility() {
        this.preProcessHtmlCallbacks.push((html) =>
          html.querySelectorAll('.scroll-trigger').forEach((element) => element.classList.add('scroll-trigger--cancel'))
        );
        this.postProcessHtmlCallbacks.push((newNode) => {
          window?.Shopify?.PaymentButton?.init();
          window?.ProductModel?.loadShopifyXR();
        });
      }

      handleOptionValueChange({ data: { event, target, selectedOptionValues } }) {
        if (!this.contains(event.target)) return;
        
        this.resetProductFormState();
        this.updateVariantInstantly();
        const productUrl = target.dataset.productUrl || this.pendingRequestUrl || this.dataset.url;
        this.pendingRequestUrl = productUrl;
        const cleanUrl = (url) => (url ? url.split('?')[0] : '');
        const shouldSwapProduct = cleanUrl(this.dataset.url) !== cleanUrl(productUrl);
        const shouldFetchFullPage = this.dataset.updateUrl === 'true' && shouldSwapProduct;
        this.renderProductInfo({
          requestUrl: this.buildRequestUrlWithParams(productUrl, selectedOptionValues, shouldFetchFullPage),
          targetId: target.id,
          callback: shouldSwapProduct
            ? this.handleSwapProduct(productUrl, shouldFetchFullPage)
            : this.handleUpdateProductInfo(productUrl),
        });
      }

      updateVariantInstantly() {
        const allVariantsEl = this.querySelector('[data-all-variants]');
        if (!allVariantsEl) return;
        try {
          const allVariants = JSON.parse(allVariantsEl.textContent);
          const selectedOptions = Array.from(
            this.querySelectorAll('variant-selects fieldset, variant-selects .product-form__input')
          ).map((group) => {
            const checked = group.querySelector('input:checked');
            if (checked) {
              const val = checked.value;
              const lbl = group.querySelector('legend span, .form__label span, [data-selected-value], [data-selected-swatch-value]');
              if (lbl) lbl.textContent = val;
              group.querySelectorAll('label').forEach((l) => {
                const isMatch = l.getAttribute('for') === checked.id || l.getAttribute('data-val') === val || l.getAttribute('data-value') === val;
                l.classList.toggle('active', isMatch);
                l.classList.toggle('selected', isMatch);
              });
              return val;
            }
            const select = group.querySelector('select');
            if (select) {
              const val = select.value;
              const lbl = group.querySelector('legend span, .form__label span, [data-selected-value], [data-selected-swatch-value]');
              if (lbl) lbl.textContent = val;
              return val;
            }
            return null;
          }).filter(Boolean);

          if (!selectedOptions.length) return;

          const matchedVariant = allVariants.find((v) =>
            selectedOptions.every((opt) => v.options.includes(opt))
          );

          if (matchedVariant) {
            this.updateVariantInputs(matchedVariant.id);
            this.updateURL(this.dataset.url, matchedVariant.id);

            // INSTANT GALLERY SWITCH (0ms latency)
            const mediaGallery = this.querySelector('media-gallery');
            if (mediaGallery) {
              mediaGallery.filterByVariant?.(matchedVariant);
              const featMediaId = matchedVariant.featured_media?.id || matchedVariant.featured_image?.id;
              if (featMediaId) {
                mediaGallery.setActiveMedia?.(`${this.dataset.section}-${featMediaId}`, true);
              }
            }
            window?.Shopify?.PaymentButton?.init();
          } else {
            this.productForm?.toggleSubmitButton(false);
          }
        } catch (e) {
          console.error(e);
        }
      }

      resetProductFormState() {
        const productForm = this.productForm;
        productForm?.handleErrorMessage();
      }

      handleSwapProduct(productUrl, updateFullPage) {
        return (html) => {
          this.productModal?.remove();

          const selector = updateFullPage ? "product-info[id^='MainProduct']" : 'product-info';
          const variant = this.getSelectedVariant(html.querySelector(selector));
          this.updateURL(productUrl, variant?.id);

          if (updateFullPage) {
            document.querySelector('head title').innerHTML = html.querySelector('head title').innerHTML;

            HTMLUpdateUtility.viewTransition(
              document.querySelector('main'),
              html.querySelector('main'),
              this.preProcessHtmlCallbacks,
              this.postProcessHtmlCallbacks
            );
          } else {
            HTMLUpdateUtility.viewTransition(
              this,
              html.querySelector('product-info'),
              this.preProcessHtmlCallbacks,
              this.postProcessHtmlCallbacks
            );
          }
        };
      }

      renderProductInfo({ requestUrl, targetId, callback }) {
        this.abortController?.abort();
        this.abortController = new AbortController();

        fetch(requestUrl, { signal: this.abortController.signal })
          .then((response) => response.text())
          .then((responseText) => {
            this.pendingRequestUrl = null;
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            callback(html);
          })
          .then(() => {
            // set focus to last clicked option value
            //document.querySelector(`#${targetId}`)?.focus();
          })
          .catch((error) => {
            if (error.name === 'AbortError') {
              console.log('Fetch aborted by user');
            } else {
              console.error(error);
            }
          });
      }

      getSelectedVariant(productInfoNode) {
        //console.log(productInfoNode.querySelector('variant-hover [data-selected-variant]')?.innerHTML);
        const selectedVariant = productInfoNode.querySelector('variant-selects [data-selected-variant], variant-hover [data-selected-variant]')?.innerHTML;
        return !!selectedVariant ? JSON.parse(selectedVariant) : null;
      }

      buildRequestUrlWithParams(url, optionValues, shouldFetchFullPage = false) {
        const params = [];

        url = url.split('?')[0];

        !shouldFetchFullPage && params.push(`section_id=${this.sectionId}`);

        if (optionValues.length) {
          params.push(`option_values=${optionValues.join(',')}`);
        }

        return `${url}?${params.join('&')}`;
      }

updateOptionValues(html) {
  if (this.dataset.layout === 'card') return; // Card ke swatches hamesha active aur clickable rahenge
  const variantSelects = html.querySelector('variant-selects') || html.querySelector('variant-hover');
  if (variantSelects) {
    HTMLUpdateUtility.viewTransition(this.variantSelectors, variantSelects, this.preProcessHtmlCallbacks);
  }
}
      handleUpdateProductInfo(productUrl) {
        return (html) => {
          const variant = this.getSelectedVariant(html);

          this.pickupAvailability?.update(variant);
          this.updateOptionValues(html);
          this.updateURL(productUrl, variant?.id);
          this.updateVariantInputs(variant?.id);

          if (!variant) {
            this.setUnavailable();
            return;
          }

          // NEW: pehle selected color ki images filter karo, phir media update
          this.querySelector('media-gallery')?.filterByVariant?.(variant);
          this.updateMedia(html, variant?.featured_media?.id);
          this.querySelector('media-gallery')?.filterByVariant?.(variant);
          const updateSourceFromDestination = (id, shouldHide = (source) => false) => {
            const source = html.getElementById(`${id}-${this.sectionId}`);
            const destination = this.querySelector(`#${id}-${this.dataset.section}`);
            if (source && destination) {
              destination.innerHTML = source.innerHTML;
              destination.classList.toggle('hidden', shouldHide(source));
            }
          };

          updateSourceFromDestination('price');
          updateSourceFromDestination('Sku', ({ classList }) => classList.contains('hidden'));
          updateSourceFromDestination('Inventory', ({ innerText }) => innerText === '');
          updateSourceFromDestination('Volume');
          updateSourceFromDestination('Price-Per-Item', ({ classList }) => classList.contains('hidden'));
          // updateSourceFromDestination('Stock', ({ classList }) => classList.contains('hidden'));

          const stockDestination = this.querySelector(`#Stock-${this.dataset.section}`);
          const oldProgressBar = stockDestination?.querySelector('.wbstockinfo-probar');
          const oldProgressWidth = oldProgressBar && !stockDestination.classList.contains('hidden') ? oldProgressBar.style.width || '0%' : null;
          updateSourceFromDestination('Stock', ({ classList }) => classList.contains('hidden'));
          if (oldProgressWidth !== null) {
            const newProgressBar = stockDestination?.querySelector('.wbstockinfo-probar');
            if (newProgressBar) {
              const newProgressWidth = newProgressBar.style.width;
              newProgressBar.style.animation = 'none';
              newProgressBar.style.transition = 'none';
              newProgressBar.style.width = oldProgressWidth;

              requestAnimationFrame(() => requestAnimationFrame(() => {
                newProgressBar.style.transition = 'width 1.2s ease';
                newProgressBar.style.width = newProgressWidth;
              }));
            }
          }

          this.updateQuantityRules(this.sectionId, html);
          this.querySelector(`#Quantity-Rules-${this.dataset.section}`)?.classList.remove('hidden');
          this.querySelector(`#Volume-Note-${this.dataset.section}`)?.classList.remove('hidden');

          if (this.dataset.layout == "card") {
            const mediaDestination = this.querySelector(`#webipro-${this.dataset.section}-${this.dataset.productId}`)?.querySelector('.product__media-item');
            const mediaSource = html.getElementById(`webipro-${this.dataset.originalSection}-${this.dataset.productId}`)?.querySelector('.product__media-item');
            if (mediaDestination && mediaSource) {
              mediaDestination.innerHTML = mediaSource.innerHTML;
            }

            const priceDestination = this.querySelector(`#price-${this.dataset.section}-${this.dataset.productId}`);
            const priceSource = html.getElementById(`price-${this.dataset.originalSection}-${this.dataset.productId}`);
            if (mediaDestination && mediaSource) {
              priceDestination.innerHTML = priceSource.innerHTML;
            }

            const badgeDestination = this.querySelector(`#Badge-${this.dataset.section}-${this.dataset.productId}`);
            const badgeSource = html.getElementById(`Badge-${this.dataset.originalSection}-${this.dataset.productId}`);
            if (badgeDestination && badgeSource) {
              badgeDestination.innerHTML = badgeSource.innerHTML;
            } else {
              if (badgeDestination) badgeDestination.innerHTML = "";
            }

            this.productForm?.toggleSubmitButton(
              html.getElementById(`product-form-${this.dataset.originalSection}-${this.dataset.productId}-submit`)?.hasAttribute('disabled') ?? true,
              window.variantStrings.soldOut
            );
                    } else {
            const submitButtonUpdated = html.getElementById(`ProductSubmitButton-${this.sectionId}`) || html.querySelector(`[id^="ProductSubmitButton"]`);
            this.productForm?.toggleSubmitButton(
              submitButtonUpdated ? submitButtonUpdated.hasAttribute('disabled') : !variant.available,
              window.variantStrings.soldOut
            );
          }
          
          publish(PUB_SUB_EVENTS.variantChange, {
            data: {
              sectionId: this.sectionId,
              html,
              variant,
            },
          });
          window?.Shopify?.PaymentButton?.init();
        };
      }

      updateVariantInputs(variantId) {
        this.querySelectorAll(
          `#product-form-${this.dataset.section}, #product-form-installment-${this.dataset.section}, #product-form-${this.dataset.section}-${this.dataset.productId}, #product-form-installment-${this.dataset.section}-${this.dataset.productId}`
        ).forEach((productForm) => {
          const input = productForm.querySelector('input[name="id"]');
          input.value = variantId ?? '';
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }

      updateURL(url, variantId) {
        const shareButton = document.getElementById(`Share-${this.dataset.section}`);
        if (shareButton) {
          shareButton.updateUrl(`${window.shopUrl}${url}${variantId ? `?variant=${variantId}` : ''}`);
        }

        if (this.dataset.updateUrl === 'false') return;
        window.history.replaceState({}, '', `${url}${variantId ? `?variant=${variantId}` : ''}`);
      }

      setUnavailable() {
        this.productForm?.toggleSubmitButton(true, window.variantStrings.unavailable);

        const selectors = ['price', 'Inventory', 'Sku', 'Price-Per-Item', 'Stock', 'Volume-Note', 'Volume', 'Quantity-Rules']
          .map((id) => `#${id}-${this.dataset.section}`)
          .join(', ');
        document.querySelectorAll(selectors).forEach(({ classList }) => classList.add('hidden'));
      }

      updateMedia(html, variantFeaturedMediaId) {
        if (!variantFeaturedMediaId) return;

        const mediaGallerySource = this.querySelector('media-gallery ul');
        const mediaGalleryDestination = html.querySelector(`media-gallery ul`);

        const refreshSourceData = () => {
          const mediaGallerySourceItems = Array.from(mediaGallerySource.querySelectorAll('li[data-media-id]'));
          const sourceSet = new Set(mediaGallerySourceItems.map((item) => item.dataset.mediaId));
          const sourceMap = new Map(
            mediaGallerySourceItems.map((item, index) => [item.dataset.mediaId, { item, index }])
          );
          return [mediaGallerySourceItems, sourceSet, sourceMap];
        };

        if (mediaGallerySource && mediaGalleryDestination) {
          let [mediaGallerySourceItems, sourceSet, sourceMap] = refreshSourceData();
          const mediaGalleryDestinationItems = Array.from(
            mediaGalleryDestination.querySelectorAll('li[data-media-id]')
          );
          const destinationSet = new Set(mediaGalleryDestinationItems.map(({ dataset }) => dataset.mediaId));
          let shouldRefresh = false;

          // add items from new data not present in DOM
          for (let i = mediaGalleryDestinationItems.length - 1; i >= 0; i--) {
            if (!sourceSet.has(mediaGalleryDestinationItems[i].dataset.mediaId)) {
              mediaGallerySource.prepend(mediaGalleryDestinationItems[i]);
              shouldRefresh = true;
            }
          }

          // remove items from DOM not present in new data
          for (let i = 0; i < mediaGallerySourceItems.length; i++) {
            if (!destinationSet.has(mediaGallerySourceItems[i].dataset.mediaId)) {
              mediaGallerySourceItems[i].remove();
              shouldRefresh = true;
            }
          }

          // refresh
          if (shouldRefresh) [mediaGallerySourceItems, sourceSet, sourceMap] = refreshSourceData();

          // if media galleries don't match, sort to match new data order
          mediaGalleryDestinationItems.forEach((destinationItem, destinationIndex) => {
            const sourceData = sourceMap.get(destinationItem.dataset.mediaId);

            if (sourceData && sourceData.index !== destinationIndex) {
              mediaGallerySource.insertBefore(
                sourceData.item,
                mediaGallerySource.querySelector(`li:nth-of-type(${destinationIndex + 1})`)
              );

              // refresh source now that it has been modified
              [mediaGallerySourceItems, sourceSet, sourceMap] = refreshSourceData();
            }
          });
        }

        // update media attr for quick add
        const sectionId = this.dataset.section;
        if (sectionId.includes('quickadd-')) {
          this.querySelector('media-gallery')?.querySelectorAll('li[data-media-id]').forEach((el) => {
            const newValue = `quickadd-${el.dataset.mediaId}`;
            el.dataset.mediaId = newValue;
          });
        }

        // set featured media as active in the media gallery
        this.querySelector(`media-gallery`)?.setActiveMedia?.(
          `${this.dataset.section}-${variantFeaturedMediaId}`,
          true
        );

        // update media modal
        const modalContent = this.productModal?.querySelector(`.product-media-modal__content`);
        const newModalContent = html.querySelector(`product-modal .product-media-modal__content`);
        if (modalContent && newModalContent) modalContent.innerHTML = newModalContent.innerHTML;

        window.initProductPhotoSwipe?.(this);
      }

      setQuantityBoundries() {
        const data = {
          cartQuantity: this.quantityInput.dataset.cartQuantity ? parseInt(this.quantityInput.dataset.cartQuantity) : 0,
          min: this.quantityInput.dataset.min ? parseInt(this.quantityInput.dataset.min) : 1,
          max: this.quantityInput.dataset.max ? parseInt(this.quantityInput.dataset.max) : null,
          step: this.quantityInput.step ? parseInt(this.quantityInput.step) : 1,
        };

        let min = data.min;
        const max = data.max === null ? data.max : data.max - data.cartQuantity;
        if (max !== null) min = Math.min(min, max);
        if (data.cartQuantity >= data.min) min = Math.min(min, data.step);

        this.quantityInput.min = min;

        if (max) {
          this.quantityInput.max = max;
        } else {
          this.quantityInput.removeAttribute('max');
        }
        this.quantityInput.value = min;

        publish(PUB_SUB_EVENTS.quantityUpdate, undefined);
      }

      fetchQuantityRules() {
        const currentVariantId = this.productForm?.variantIdInput?.value;
        if (!currentVariantId) return;

        this.querySelector('.quantity__rules-cart .loading__spinner')?.classList.remove('hidden');
        fetch(`${this.dataset.url}?variant=${currentVariantId}&section_id=${this.dataset.section}`)
          .then((response) => response.text())
          .then((responseText) => {
            const html = new DOMParser().parseFromString(responseText, 'text/html');
            this.updateQuantityRules(this.dataset.section, html);
          })
          .catch((e) => console.error(e))
          .finally(() => this.querySelector('.quantity__rules-cart .loading__spinner')?.classList.add('hidden'));
      }

      updateQuantityRules(sectionId, html) {
        if (!this.quantityInput) return;
        this.setQuantityBoundries();

        const quantityFormUpdated = html.getElementById(`Quantity-Form-${sectionId}`);
        const selectors = ['.quantity__input', '.quantity__rules', '.quantity__label'];
        for (let selector of selectors) {
          const current = this.quantityForm.querySelector(selector);
          const updated = quantityFormUpdated?.querySelector(selector);
          if (!current || !updated) continue;
          if (selector === '.quantity__input') {
            const attributes = ['data-cart-quantity', 'data-min', 'data-max', 'step'];
            for (let attribute of attributes) {
              const valueUpdated = updated.getAttribute(attribute);
              if (valueUpdated !== null) {
                current.setAttribute(attribute, valueUpdated);
              } else {
                current.removeAttribute(attribute);
              }
            }
          } else {
            current.innerHTML = updated.innerHTML;
          }
        }
      }

      get productForm() {
        return this.querySelector(`product-form`);
      }

      get productModal() {
        return document.querySelector(`#ProductModal-${this.dataset.section}`);
      }

      get pickupAvailability() {
        return this.querySelector(`pickup-availability`);
      }

      get variantSelectors() {
        return this.querySelector('variant-selects') || this.querySelector('variant-hover');
      }

      get relatedProducts() {
        const relatedProductsSectionId = SectionId.getIdForSection(
          SectionId.parseId(this.sectionId),
          'related-products'
        );
        return document.querySelector(`product-recommendations[data-section-id^="${relatedProductsSectionId}"]`);
      }

      get quickOrderList() {
        const quickOrderListSectionId = SectionId.getIdForSection(
          SectionId.parseId(this.sectionId),
          'quick_order_list'
        );
        return document.querySelector(`quick-order-list[data-id^="${quickOrderListSectionId}"]`);
      }

      get sectionId() {
        return this.dataset.originalSection || this.dataset.section;
      }
    }
  );
}

/* ===== Lookbook Variant Hover Image Change ===== */
(function () {

  // Get variants for a specific card element
  function getVariants(card) {
    const s = card.querySelector('script[type="application/json"]');
    if (!s) return null;
    try {
      const j = JSON.parse(s.textContent);
      return j.variants || j;
    } catch(e) { return null; }
  }

  // Set the selected variant for the product card
  function setVariant(card, v) {
    if (!v) return;
    card.querySelectorAll('input.product-variant-id, input[name="id"]').forEach(i => {
      i.value = v.id;
      i.dispatchEvent(new Event("change", { bubbles: true }));
    });
    card.querySelectorAll('a[href]').forEach(a => {
      try {
        const u = new URL(a.href, location.origin);
        u.searchParams.set("variant", v.id);
        a.href = u;
      } catch (e) { }
    });

    const id = v.featured_media?.id;
    if (!id) return;

    const src = card.querySelector(`[data-media-id*="-${id}"] img`);
    const tgt = card.querySelector('.product__media-item img, .card__media img, .card__inner img');
    if (src && tgt) {
      ["src", "srcset", "sizes", "alt", "width", "height"].forEach(a => {
        if (src.getAttribute(a)) tgt.setAttribute(a, src.getAttribute(a));
      });
    }

    card.querySelectorAll('.product__media-item').forEach(m => {
      m.style.display = m.dataset.mediaId?.includes(id) ? "" : "none";
    });
  }

  // Run the event logic, but only for elements inside .wblook_b
  function run(e) {
    const sw = e.target.closest(".wblook_b .list_qty_wrapper label, .wblook_b .look_book_wbswatchclr label, .wblook_b .color-swatchimg, .wblook_b .color-swatch");
    if (!sw) return;
    const card = sw.closest(".card_lookbook_list, .card-wrapper, .card");
    if (!card) return;

    const variants = getVariants(card);
    if (!variants) return;

    const val = sw.dataset.value || sw.innerText.trim() || sw.querySelector("input")?.value;
    const v = variants.find(x => [x.option1, x.option2, x.option3, x.title].includes(val));
    setVariant(card, v);
  }

  // Add event listeners only for elements inside .wblook_b
  const wblookB = document.querySelector('.wblook_b');
  if (wblookB) {
    wblookB.addEventListener("mouseover", run);
    wblookB.addEventListener("click", run);
    wblookB.addEventListener("change", e => {
      if (e.target.matches(".list_qty_wrapper input, .look_book_wbswatchclr input")) run(e);
    });
  }

})();
