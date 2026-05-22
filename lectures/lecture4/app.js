/* Wires the Timer logic to the DOM. */
(function () {
  const display = document.getElementById('display');
  const minutesInput = document.getElementById('minutes');
  const secondsInput = document.getElementById('seconds');
  const startBtn = document.getElementById('startBtn');
  const pauseBtn = document.getElementById('pauseBtn');
  const resetBtn = document.getElementById('resetBtn');
  const status = document.getElementById('status');

  const timer = new Timer();

  function render(ms) {
    display.textContent = Timer.format(ms);
  }

  function syncDurationFromInputs() {
    timer.setDuration(Number(minutesInput.value), Number(secondsInput.value));
    render(timer.remainingMs);
  }

  timer.onTick = render;
  timer.onComplete = function () {
    display.classList.add('finished');
    status.textContent = '⏰ 時間になりました！';
    try {
      new Audio(
        'data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQ=='
      ).play();
    } catch (e) { /* sound is best-effort */ }
  };

  // Initial state from default input values.
  syncDurationFromInputs();

  [minutesInput, secondsInput].forEach((el) =>
    el.addEventListener('change', () => {
      if (!timer.running) syncDurationFromInputs();
    })
  );

  document.querySelectorAll('.preset').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (timer.running) return;
      minutesInput.value = btn.dataset.min;
      secondsInput.value = 0;
      syncDurationFromInputs();
      status.textContent = `${btn.dataset.min}分にセットしました`;
    })
  );

  startBtn.addEventListener('click', () => {
    if (timer.start()) {
      display.classList.remove('finished');
      status.textContent = 'カウントダウン中…';
    }
  });

  pauseBtn.addEventListener('click', () => {
    if (timer.pause()) status.textContent = '一時停止中';
  });

  resetBtn.addEventListener('click', () => {
    timer.reset();
    display.classList.remove('finished');
    status.textContent = 'リセットしました';
  });
})();
