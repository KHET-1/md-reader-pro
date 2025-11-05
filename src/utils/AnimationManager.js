// AnimationManager: requestAnimationFrame-based utilities with lightweight FPS metrics
// Provides animate(), fadeOut(), and orchestration scaffolding

export default class AnimationManager {
  constructor() {
    this.animations = new Set();
    this.metrics = {
      lastFrameTime: this._getPerformanceNow(),
      samples: [],
      lastFPS: 60
    };
    this._tick = this._tick.bind(this);
    this._rafId = null;
    this._isRunning = false;
  }

  // Helper: Check if requestAnimationFrame is available
  _hasRAF() {
    return typeof window !== 'undefined' && typeof window.requestAnimationFrame !== 'undefined';
  }

  // Helper: Check if cancelAnimationFrame is available
  _hasCAF() {
    return typeof window !== 'undefined' && typeof window.cancelAnimationFrame !== 'undefined';
  }

  // Helper: Get current performance time
  _getPerformanceNow() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  // Helper: Safely set element style property
  _setStyle(element, property, value) {
    try {
      if (element && element.style) {
        element.style[property] = value;
      }
    } catch (_) {
      // Ignore style setting errors
    }
  }

  _startLoop() {
    if (!this._isRunning && this._hasRAF()) {
      this._isRunning = true;
      this._rafId = window.requestAnimationFrame(this._tick);
    }
  }

  _stopLoop() {
    if (this._isRunning && this._hasCAF()) {
      this._isRunning = false;
      if (this._rafId !== null) {
        window.cancelAnimationFrame(this._rafId);
        this._rafId = null;
      }
    }
  }

  _tick(ts) {
    // Metrics
    const delta = ts - this.metrics.lastFrameTime;
    this.metrics.lastFrameTime = ts;
    if (delta > 0 && isFinite(delta)) {
      const fps = 1000 / delta;
      this.metrics.samples.push(fps);
      if (this.metrics.samples.length > 30) this.metrics.samples.shift();
      const sum = this.metrics.samples.reduce((a, b) => a + b, 0);
      this.metrics.lastFPS = Math.round((sum / this.metrics.samples.length) * 10) / 10;
    }

    // Advance animations
    for (const anim of Array.from(this.animations)) {
      if (anim.canceled) {
        this.animations.delete(anim);
        continue;
      }
      if (ts < anim.start) continue; // not started yet

      const duration = Math.max(anim.end - anim.start, 1);
      const progress = Math.min(Math.max((ts - anim.start) / duration, 0), 1);

      try {
        if (typeof anim.updater === 'function') anim.updater(progress);
      } catch (_) { /* ignore updater errors to avoid breaking loop */ }

      if (progress >= 1) {
        try { if (typeof anim.onComplete === 'function') anim.onComplete(); } catch (_) { /* no-op */ }
        this.animations.delete(anim);
      }
    }

    // Continue loop only if there are active animations
    if (this.animations.size > 0) {
      if (this._hasRAF()) {
        this._rafId = window.requestAnimationFrame(this._tick);
      }
    } else {
      this._stopLoop();
    }
  }

  // Generic animation scheduler
  animate(element, duration = 300, delay = 0, updater = () => {}, onComplete = () => {}) {
    const now = this._getPerformanceNow();
    const anim = {
      element,
      start: now + Math.max(delay, 0),
      end: now + Math.max(delay, 0) + Math.max(duration, 0),
      updater,
      onComplete,
      canceled: false
    };
    this.animations.add(anim);
    this._startLoop(); // Ensure loop is running when animation is added
    return anim;
  }

  // Fade out (optionally slide vertically by translateY during fade)
  fadeOut(element, duration = 300, delay = 0, onComplete = null, options = {}) {
    if (!element) return null;
    const startOpacity = this._getOpacity(element);
    const translateY = typeof options.translateY === 'number' ? options.translateY : 0;

    // Ensure we control opacity/transform via style
    this._setStyle(element, 'willChange', 'opacity, transform');

    const updater = (t) => {
      const opacity = startOpacity * (1 - t);
      this._setStyle(element, 'opacity', String(opacity));
      if (translateY !== 0) {
        const y = translateY * t;
        this._setStyle(element, 'transform', `translateY(${y}px)`);
      }
    };

    const complete = () => {
      this._setStyle(element, 'willChange', '');
      if (typeof onComplete === 'function') {
        try { onComplete(); } catch (_) { /* no-op */ }
      }
    };

    return this.animate(element, duration, delay, updater, complete);
  }

  // Fade in (optionally slide vertically by translateY during fade)
  fadeIn(element, duration = 300, delay = 0, onComplete = null, options = {}) {
    if (!element) return null;
    const endOpacity = 1;
    const translateY = typeof options.translateY === 'number' ? options.translateY : 0;

    this._setStyle(element, 'opacity', '0');
    this._setStyle(element, 'willChange', 'opacity, transform');
    if (translateY !== 0) {
      this._setStyle(element, 'transform', `translateY(${translateY}px)`);
    }

    const updater = (t) => {
      const opacity = endOpacity * t;
      this._setStyle(element, 'opacity', String(opacity));
      if (translateY !== 0) {
        const y = translateY * (1 - t);
        this._setStyle(element, 'transform', `translateY(${y}px)`);
      }
    };

    const complete = () => {
      this._setStyle(element, 'willChange', '');
      if (typeof onComplete === 'function') {
        try { onComplete(); } catch (_) { /* no-op */ }
      }
    };

    return this.animate(element, duration, delay, updater, complete);
  }

  cancelAll() {
    for (const anim of this.animations) anim.canceled = true;
    this.animations.clear();
  }

  getFPS() {
    return this.metrics.lastFPS;
  }

  _getOpacity(el) {
    try {
      const hasComputedStyle = typeof window !== 'undefined' && typeof window.getComputedStyle !== 'undefined';
      const cs = hasComputedStyle ? window.getComputedStyle(el) : null;
      const op = cs && cs.opacity != null ? parseFloat(cs.opacity) : 1;
      return isNaN(op) ? 1 : op;
    } catch (_) {
      return 1;
    }
  }
}