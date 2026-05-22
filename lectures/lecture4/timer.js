/**
 * Timer logic — framework-free so it can run in the browser and under Node tests.
 *
 * The Timer tracks remaining milliseconds and exposes start/pause/reset.
 * It is driven by an injectable `now()` clock and `setIntervalFn`, which keeps
 * the logic deterministic and testable without real timers.
 */
class Timer {
  /**
   * @param {object} [options]
   * @param {() => number} [options.now] - returns current time in ms
   * @param {(cb: Function, ms: number) => any} [options.setIntervalFn]
   * @param {(id: any) => void} [options.clearIntervalFn]
   * @param {number} [options.tickMs] - polling interval
   */
  constructor(options = {}) {
    this.now = options.now || (() => Date.now());
    this.setIntervalFn = options.setIntervalFn || ((cb, ms) => setInterval(cb, ms));
    this.clearIntervalFn = options.clearIntervalFn || ((id) => clearInterval(id));
    this.tickMs = options.tickMs || 100;

    this.durationMs = 0;     // configured length
    this.remainingMs = 0;    // time left
    this.running = false;
    this._intervalId = null;
    this._deadline = 0;      // absolute time the timer hits zero

    // listeners
    this.onTick = () => {};
    this.onComplete = () => {};
  }

  /** Configure the countdown length. Only allowed while not running. */
  setDuration(minutes, seconds) {
    if (this.running) return false;
    const m = Math.max(0, Math.floor(minutes || 0));
    const s = Math.max(0, Math.floor(seconds || 0));
    this.durationMs = (m * 60 + s) * 1000;
    this.remainingMs = this.durationMs;
    return true;
  }

  /** Begin (or resume) counting down. No-op if already running or nothing set. */
  start() {
    if (this.running || this.remainingMs <= 0) return false;
    this.running = true;
    this._deadline = this.now() + this.remainingMs;
    this._intervalId = this.setIntervalFn(() => this._tick(), this.tickMs);
    return true;
  }

  /** Freeze the countdown, keeping remaining time intact. */
  pause() {
    if (!this.running) return false;
    this.remainingMs = Math.max(0, this._deadline - this.now());
    this.running = false;
    this.clearIntervalFn(this._intervalId);
    this._intervalId = null;
    return true;
  }

  /** Stop and restore the full configured duration. */
  reset() {
    this.running = false;
    if (this._intervalId !== null) {
      this.clearIntervalFn(this._intervalId);
      this._intervalId = null;
    }
    this.remainingMs = this.durationMs;
    this.onTick(this.remainingMs);
    return true;
  }

  _tick() {
    if (!this.running) return; // ignore stray ticks after stop/pause
    this.remainingMs = Math.max(0, this._deadline - this.now());
    this.onTick(this.remainingMs);
    if (this.remainingMs <= 0) {
      this.running = false;
      this.clearIntervalFn(this._intervalId);
      this._intervalId = null;
      this.onComplete();
    }
  }

  /** Format ms as MM:SS. */
  static format(ms) {
    const total = Math.ceil(Math.max(0, ms) / 1000);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}

// Dual export: CommonJS for tests, global for the browser.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Timer;
} else {
  window.Timer = Timer;
}
