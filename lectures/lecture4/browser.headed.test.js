/* Visible (headed) E2E test — opens a real Chrome window on screen via WSLg
   and drives index.html slowly so the run can be watched.
   Run: DISPLAY=:0 node browser.headed.test.js */
const puppeteer = require('puppeteer-core');
const path = require('path');

const CHROME = '/usr/bin/google-chrome';
const PAGE_URL = 'file://' + path.join(__dirname, 'index.html');

let passed = 0, failed = 0;
function assert(label, cond) {
  if (cond) { passed++; console.log(`  ✓ ${label}`); }
  else { failed++; console.error(`  ✗ ${label}`); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: false,          // visible window on the Windows screen
    slowMo: 250,              // slow actions down so they are watchable
    args: ['--no-sandbox', '--window-size=520,760'],
    defaultViewport: null,
  });
  const page = await browser.newPage();
  await page.goto(PAGE_URL);
  await sleep(1000);

  const text = (sel) => page.$eval(sel, (el) => el.textContent.trim());
  const val = (sel) => page.$eval(sel, (el) => el.value);

  console.log('initial render');
  assert('display shows 05:00 from default inputs', (await text('#display')) === '05:00');
  await sleep(800);

  console.log('\npreset buttons');
  await page.click('.preset[data-min="3"]');
  assert('3-min preset sets display to 03:00', (await text('#display')) === '03:00');
  await sleep(800);
  await page.click('.preset[data-min="1"]');
  assert('1-min preset sets display to 01:00', (await text('#display')) === '01:00');
  assert('1-min preset updates minutes input', (await val('#minutes')) === '1');
  await sleep(800);

  console.log('\nmanual input');
  await page.$eval('#minutes', (el) => (el.value = '0'));
  await page.$eval('#seconds', (el) => { el.value = '3'; el.dispatchEvent(new Event('change')); });
  assert('display reflects 00:03', (await text('#display')) === '00:03');
  await sleep(800);

  console.log('\nstart / countdown / complete');
  await page.click('#startBtn');
  assert('status shows counting', (await text('#status')) === 'カウントダウン中…');
  await sleep(3600);
  assert('display reaches 00:00', (await text('#display')) === '00:00');
  assert('status shows finished', (await text('#status')).includes('時間になりました'));
  assert('display gets finished class',
    await page.$eval('#display', (el) => el.classList.contains('finished')));
  await sleep(1500);

  console.log('\npause keeps remaining time');
  await page.click('#resetBtn');
  await page.$eval('#seconds', (el) => { el.value = '10'; el.dispatchEvent(new Event('change')); });
  await page.click('#startBtn');
  await sleep(2000);
  await page.click('#pauseBtn');
  const paused = await text('#display');
  assert('status shows paused', (await text('#status')) === '一時停止中');
  await sleep(2000);
  assert('display unchanged while paused', (await text('#display')) === paused);
  await sleep(800);

  console.log('\nreset restores duration');
  await page.click('#resetBtn');
  assert('reset restores 00:10', (await text('#display')) === '00:10');
  assert('status shows reset', (await text('#status')) === 'リセットしました');
  await sleep(1500);

  console.log(`\n${passed} passed, ${failed} failed`);
  await sleep(2000);
  await browser.close();
  process.exit(failed > 0 ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
