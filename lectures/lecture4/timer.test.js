/* Zero-dependency test runner for the Timer logic. Run: node timer.test.js */
const Timer = require('./timer');

let passed = 0;
let failed = 0;

function assert(label, cond) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}`);
  }
}

function eq(label, actual, expected) {
  assert(`${label} (got ${JSON.stringify(actual)}, expected ${JSON.stringify(expected)})`,
    actual === expected);
}

/** Builds a Timer with a fake clock and manual tick control. */
function makeFakeTimer() {
  let clock = 0;
  let ticks = [];
  const timer = new Timer({
    now: () => clock,
    setIntervalFn: (cb) => { ticks.push(cb); return ticks.length - 1; },
    clearIntervalFn: () => {},
    tickMs: 100,
  });
  return {
    timer,
    advance: (ms) => { clock += ms; },
    fireTick: () => ticks.forEach((cb) => cb()),
  };
}

console.log('Timer.format');
eq('formats zero', Timer.format(0), '00:00');
eq('formats 1 second', Timer.format(1000), '00:01');
eq('formats 65 seconds', Timer.format(65000), '01:05');
eq('formats 10 minutes', Timer.format(600000), '10:00');
eq('rounds partial seconds up', Timer.format(1500), '00:02');
eq('clamps negative to zero', Timer.format(-5000), '00:00');

console.log('\nsetDuration');
{
  const t = new Timer();
  t.setDuration(2, 30);
  eq('2m30s -> 150000ms', t.durationMs, 150000);
  eq('remaining mirrors duration', t.remainingMs, 150000);
  t.setDuration(-1, -1);
  eq('negative inputs clamp to 0', t.durationMs, 0);
}

console.log('\nstart / pause / reset');
{
  const { timer, advance, fireTick } = makeFakeTimer();
  timer.setDuration(0, 10); // 10s
  eq('start succeeds', timer.start(), true);
  eq('running flag set', timer.running, true);
  eq('double start is rejected', timer.start(), false);

  advance(3000);
  fireTick();
  eq('after 3s, 7s remain', timer.remainingMs, 7000);

  eq('pause succeeds', timer.pause(), true);
  eq('not running after pause', timer.running, false);

  advance(5000); // time passes while paused
  eq('paused time does not count', timer.remainingMs, 7000);

  eq('resume succeeds', timer.start(), true);
  advance(7000);
  fireTick();
  eq('reaches zero', timer.remainingMs, 0);
  eq('stops running at zero', timer.running, false);
}

console.log('\nreset restores duration');
{
  const { timer, advance, fireTick } = makeFakeTimer();
  timer.setDuration(1, 0); // 60s
  timer.start();
  advance(20000);
  fireTick();
  eq('40s remain mid-run', timer.remainingMs, 40000);
  timer.reset();
  eq('reset restores full 60s', timer.remainingMs, 60000);
  eq('not running after reset', timer.running, false);
}

console.log('\nonComplete fires once at zero');
{
  const { timer, advance, fireTick } = makeFakeTimer();
  let completes = 0;
  timer.onComplete = () => completes++;
  timer.setDuration(0, 5);
  timer.start();
  advance(5000);
  fireTick();
  fireTick(); // extra tick should not re-fire
  eq('onComplete fired exactly once', completes, 1);
}

console.log('\nguard rails');
{
  const t = new Timer();
  eq('start with no duration fails', t.start(), false);
  eq('pause when not running fails', t.pause(), false);
  t.setDuration(1, 0);
  t.start();
  eq('cannot change duration while running', t.setDuration(2, 0), false);
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
