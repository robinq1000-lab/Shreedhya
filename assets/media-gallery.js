window.__preventScrollTrigger = '1';
if (!customElements.get('media-gallery')) {
  customElements.define('media-gallery', class MediaGallery extends HTMLElement {
    constructor() {
      super();
      this.elements = {
        liveRegion: this.querySelector('[id^="GalleryStatus"]'),
        viewer: this.querySelector('[id^="GalleryViewer"]'),
        thumbnails: this.querySelector('[id^="GalleryThumbnails"]')
      }
      this.mql = window.matchMedia('(min-width: 768px)');
      if (!this.elements.thumbnails) return;

      this.elements.viewer.addEventListener('slideChanged', debounce(this.onSlideChanged.bind(this), 500));
      this.elements.thumbnails.querySelectorAll('[data-target]').forEach((mediaToSwitch) => {
        mediaToSwitch.querySelector('button').addEventListener('click', this.setActiveMedia.bind(this, mediaToSwitch.dataset.target, false));
      });
      if (this.dataset.desktopLayout.includes('thumbnail') && this.mql.matches) this.removeListSemantic();
    }

connectedCallback() {
  const data = this.getColorData();
  if (!data) return;
  this.filterByColor(data.selectedColor);
  window.requestAnimationFrame(() => this.activateFirstVisible(false));
  window.initProductPhotoSwipe?.(this.closest('product-info') || document);

  // Color change hone par gallery update
  if (!this._colorChangeBound) {
    this._colorChangeBound = true;
    document.addEventListener('change', (e) => {
      const t = e.target;
      const root = this.closest('product-info');
      if (!root || !t.closest || !t.closest('variant-selects') || !root.contains(t)) return;
      setTimeout(() => {
        const color = this.getSelectedColor();
        if (color) {
          this.filterByColor(color);
          this.activateFirstVisible(true);
        }
      }, 80);
    });
  }
}

getSelectedColor() {
  const root = this.closest('product-info');
  if (!root) return null;
  const fs = Array.from(root.querySelectorAll('variant-selects fieldset')).find((f) =>
    /colou?r/i.test(f.querySelector('legend')?.textContent || '')
  );
  const checked = fs && fs.querySelector('input[type="radio"]:checked');
  if (checked) return checked.value;
  const sel = root.querySelector('variant-selects select[name*="olor" i]');
  return sel ? sel.value : null;
}

// Color ki pehli visible image ko main image bana do
activateFirstVisible(force) {
  const viewer = this.elements.viewer;
  if (!viewer) return;
  const visible = Array.from(viewer.querySelectorAll('[data-media-id]')).filter(
    (el) => !el.classList.contains('is-color-hidden')
  );
  if (!visible.length) return;

  // Pehli 3 images eager load, taaki dikhte waqt lazy-load blink na ho
  visible.slice(0, 3).forEach((el) => {
    el.querySelectorAll('img[loading="lazy"]').forEach((img) => img.setAttribute('loading', 'eager'));
  });

  const first = visible[0];
  // Pehli image pehle se active hai to dobara kuch mat karo (blink ka main reason)
  if (first.classList.contains('is-active')) return;

  const active = visible.find((el) => el.classList.contains('is-active'));
  if (active && !force) return;

  const prev = window.__preventScrollTrigger;
  window.__preventScrollTrigger = '0';
  this.setActiveMedia(first.dataset.mediaId, false);
  window.__preventScrollTrigger = prev;
}

    getColorData() {
      if (this._colorData) return this._colorData;
      const el = this.querySelector('script[data-color-media]');
      if (!el) return null;
      try {
        const raw = JSON.parse(el.textContent);
        const groups = this.buildColorGroups(raw);
        if (groups && Object.keys(groups).length > 0) {
          this._colorData = { raw, groups, selectedColor: raw.selectedColor };
        }
      } catch (e) {
        console.error('Color media data error:', e);
      }
      return this._colorData;
    }

    // Har color ke liye allowed image ids ka set banata hai
    buildColorGroups(data) {
      const media = data.media || [];
      const colors = [];
      (data.variants || []).forEach((v) => {
        if (v.color && !colors.includes(v.color)) colors.push(v.color);
      });
      if (!colors.length || !media.length) return null;

      const groups = {};

      // METHOD 1: Image ke ALT text me color ka naam check karo
      const altMatches = {};
      let totalAltMatches = 0;
      colors.forEach((c) => {
        const key = c.toLowerCase().trim();
        const ids = media
          .filter((m) => {
            const alt = (m.alt || '').toLowerCase().trim();
            return alt.includes(key);
          })
          .map((m) => String(m.id));
        altMatches[c] = ids;
        totalAltMatches += ids.length;
      });

      // Agar alt text se kam se kam 1 color ki images match ho gayi:
      if (totalAltMatches > 0) {
        const matchedAny = new Set();
        colors.forEach((c) => {
          groups[c] = new Set(altMatches[c]);
          altMatches[c].forEach((id) => matchedAny.add(id));
        });

        // Jis image ke alt me koi color nahi, usko sab colors me include karo (common image)
        const common = media
          .filter((m) => !matchedAny.has(String(m.id)))
          .map((m) => String(m.id));
        if (common.length > 0) {
          colors.forEach((c) => common.forEach((id) => groups[c].add(id)));
        }
      } else {
        // METHOD 2: Position/Anchor based fallback (jab Alt text blank ho)
        const anchors = {};
        data.variants.forEach((v) => {
          if (!v.media) return;
          const mediaIdStr = String(v.media);
          const idx = media.findIndex((m) => String(m.id) === mediaIdStr);
          if (idx > -1 && (anchors[v.color] === undefined || idx < anchors[v.color])) {
            anchors[v.color] = idx;
          }
        });

        const sorted = Object.keys(anchors).sort((a, b) => anchors[a] - anchors[b]);
        if (sorted.length >= 1) {
          sorted.forEach((c, i) => {
            const start = i === 0 ? 0 : anchors[c];
            const end = i + 1 < sorted.length ? anchors[sorted[i + 1]] : media.length;
            groups[c] = new Set(media.slice(start, end).map((m) => String(m.id)));
          });
          // Colors without anchors get all media as fallback
          colors.forEach((c) => {
            if (!groups[c]) groups[c] = new Set(media.map((m) => String(m.id)));
          });
        } else {
          return null;
        }
      }

      // Variant ki apni featured image hamesha us color ke group me honi chahiye
      data.variants.forEach((v) => {
        if (v.media && groups[v.color]) {
          groups[v.color].add(String(v.media));
        }
      });

      return groups;
    }

    filterByVariant(variant) {
      const data = this.getColorData();
      if (!data || !variant) return;
      let colorValue = null;
      if (variant.options && data.raw.colorIndex !== undefined && variant.options[data.raw.colorIndex]) {
        colorValue = variant.options[data.raw.colorIndex];
      } else if (variant.option1 || variant.option2 || variant.option3) {
        const colorKeys = Object.keys(data.groups).map((k) => k.toLowerCase().trim());
        const candidates = [variant.option1, variant.option2, variant.option3].filter(Boolean);
        const found = candidates.find((opt) => colorKeys.includes(String(opt).toLowerCase().trim()));
        if (found) colorValue = found;
      }
      if (colorValue) {
        this.filterByColor(colorValue);
      }
    }

    filterByColor(color) {
      const data = this.getColorData();
      if (!data || !color || !data.groups) return;

      const normalizedColor = String(color).trim().toLowerCase();
      const matchedKey = Object.keys(data.groups).find(
        (k) => k.trim().toLowerCase() === normalizedColor
      );
      if (!matchedKey || !data.groups[matchedKey]) return;

      const allowed = data.groups[matchedKey];
      if (!allowed.size) return;

      const toggle = (root) => {
        if (!root) return;
        root.querySelectorAll('[data-img-src-id]').forEach((el) => {
          const id = String(el.dataset.imgSrcId);
          el.classList.toggle('is-color-hidden', !allowed.has(id));
        });
      };
      toggle(this.elements.viewer);
      toggle(this.elements.thumbnails);

      // slider ka count / buttons dobara calculate
      window.requestAnimationFrame(() => {
        if (this.elements.viewer?.slider) this.elements.viewer.resetPages?.();
        if (this.elements.thumbnails?.slider) this.elements.thumbnails.resetPages?.();
      });
      window.initProductPhotoSwipe?.(this.closest('product-info') || document);
    }
    /* ================= END COLOR FILTER ================= */

    onSlideChanged(event) {
      if (event.detail.currentElement) {
        const thumbnail = this.elements.thumbnails.querySelector(`[data-target="${ event.detail.currentElement.dataset.mediaId }"]`);
        this.setActiveThumbnail(thumbnail);
      }
    }

    setActiveMedia(mediaId, prepend) {
      const activeMedia =
      this.elements.viewer.querySelector(`[data-media-id="${mediaId}"]`) ||
      this.elements.viewer.querySelector('[data-media-id]');
      if (!activeMedia) {
        return;
      }
      this.elements.viewer.querySelectorAll('[data-media-id]').forEach((element) => {
        element.classList.remove('is-active');
      });
      activeMedia?.classList?.add('is-active');

      if (prepend) {
        activeMedia.parentElement.prepend(activeMedia);
        if (this.elements.thumbnails) {
          const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${ mediaId }"]`);
          activeThumbnail.parentElement.prepend(activeThumbnail);
        }
        if (this.elements.viewer.slider) this.elements.viewer.resetPages();
      }

      this.preventStickyHeader();
        window.setTimeout(() => {
          if (!this.mql.matches || this.elements.thumbnails) {
            activeMedia.parentElement.scrollTo({ left: activeMedia.offsetLeft });
          }
          const activeMediaRect = activeMedia.getBoundingClientRect();
          // Don't scroll if the image is already in view
          if (activeMediaRect.top > -0.5) return;
          const top = activeMediaRect.top + window.scrollY;
           if (window.__preventScrollTrigger == '0') {
           }else{
          if (this.dataset.quick != 'quickv') { window.scrollTo({ top: top, behavior: 'smooth' }); }
           }
        });
      this.playActiveMedia(activeMedia);

      if (!this.elements.thumbnails) return;
      const activeThumbnail = this.elements.thumbnails.querySelector(`[data-target="${ mediaId }"]`);
      this.setActiveThumbnail(activeThumbnail);
      this.announceLiveRegion(activeMedia, activeThumbnail.dataset.mediaPosition);
    }

    setActiveThumbnail(thumbnail) {
      if (!this.elements.thumbnails || !thumbnail) return;

      this.elements.thumbnails.querySelectorAll('button').forEach((element) => element.removeAttribute('aria-current'));
      thumbnail.querySelector('button').setAttribute('aria-current', true);
      if (this.elements.thumbnails.isSlideVisible(thumbnail, 10)) return;

      this.elements.thumbnails.slider.scrollTo({ left: thumbnail.offsetLeft });
    }

    announceLiveRegion(activeItem, position) {
      const image = activeItem.querySelector('.product__modal-opener--image img');
      if (!image || !this.elements.liveRegion) return;
      this.elements.liveRegion.setAttribute('aria-hidden', false);
      this.elements.liveRegion.innerHTML = window.accessibilityStrings.imageAvailable.replace('[index]', position);
      setTimeout(() => {
        this.elements.liveRegion.setAttribute('aria-hidden', true);
      }, 2000);
    }

    playActiveMedia(activeItem) {
      window.pauseAllMedia();
      const deferredMedia = activeItem.querySelector('.deferred-media');
      if (deferredMedia) deferredMedia.loadContent(false);
    }

    preventStickyHeader() {
      this.stickyHeader = this.stickyHeader || document.querySelector('sticky-header');
      if (!this.stickyHeader) return;
      this.stickyHeader.dispatchEvent(new Event('preventHeaderReveal'));
    }

    removeListSemantic() {
      if (!this.elements.viewer.slider) return;
      this.elements.viewer.slider.setAttribute('role', 'presentation');
      this.elements.viewer.sliderItems.forEach(slide => slide.setAttribute('role', 'presentation'));
    }
  });
}