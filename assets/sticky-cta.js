/**
 * <sticky-cta> — a fixed homepage call-to-action that links to a product.
 *
 * Mirrors the show/hide behaviour of the product page <sticky-add-to-cart>:
 * it appears once the visitor scrolls past the trigger element (the featured
 * collection) and hides when the footer comes into view.
 *
 * Uses threshold 0 (vs. the 0.2 used by sticky-add-to-cart) because the trigger
 * here is a tall section: threshold 0 makes `isIntersecting` flip to false
 * exactly when the section's bottom edge crosses above the viewport top, and
 * flips the footer to visible the moment it starts entering — matching
 * "appear when the featured collection ends, disappear when the footer starts".
 */
(function () {
  if (customElements.get('sticky-cta')) return;

  function debounce(fn, wait) {
    let timer;
    const debounced = function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
    debounced.cancel = () => clearTimeout(timer);
    return debounced;
  }

  class StickyCta extends HTMLElement {
    constructor() {
      super();
      this.triggerVisible = false;
      this.footerVisible = false;
      this.debouncedHide = debounce(() => {
        if (this.classList.contains('show')) {
          this.classList.add('hide');
          this.classList.remove('show');
        }
      }, 500);
      this.observer = new IntersectionObserver(this.handleIntersections.bind(this), { threshold: 0 });
    }

    connectedCallback() {
      this.triggerEl = document.querySelector(this.getAttribute('trigger') || '.section-featured-collection');
      this.footerEl = document.querySelector(this.getAttribute('footer') || '.footer');
      if (this.triggerEl) this.observer.observe(this.triggerEl);
      if (this.footerEl) this.observer.observe(this.footerEl);
    }

    disconnectedCallback() {
      this.observer.disconnect();
    }

    handleIntersections(entries) {
      for (const entry of entries) {
        if (entry.target === this.triggerEl) this.triggerVisible = entry.isIntersecting;
        else if (entry.target === this.footerEl) this.footerVisible = entry.isIntersecting;
      }
      if (!this.triggerEl) return;
      this.setVisible(
        !this.triggerVisible &&
        !this.footerVisible &&
        this.triggerEl.getBoundingClientRect().bottom < 0
      );
    }

    setVisible(visible) {
      if (visible && this.isAboveThreshold()) {
        this.debouncedHide.cancel();
        this.classList.add('show');
        this.classList.remove('hide');
      } else {
        this.debouncedHide();
      }
    }

    isAboveThreshold() {
      if (!this.footerEl) return true;
      const viewportHeight = window.innerHeight;
      const threshold = viewportHeight * 0.75;
      const triggerRect = this.triggerEl.getBoundingClientRect();
      return this.footerEl.getBoundingClientRect().top - triggerRect.bottom - viewportHeight > threshold;
    }
  }

  customElements.define('sticky-cta', StickyCta);
})();
