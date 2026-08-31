const INTERVAL_MS = 60 * 1000;
const FIRST_RUN_DELAY_MS = 15 * 1000;
const OPT_IN_FLAG = 'ENABLE_PROTOTYPE_AUTOMATIC_CONTRIBUTIONS';

let timer = null;
let firstRunTimer = null;
let running = false;

function isOptInEnabled() {
  return process.env[OPT_IN_FLAG] === 'true';
}

function shouldStartScheduler() {
  if (process.env.NODE_ENV === 'test') return false;
  if (process.env.VERCEL) return false;
  return isOptInEnabled();
}

async function tick() {
  if (running) return;
  running = true;
  try {
    const service = require('./automaticContributionService');
    await service.processDuePlans({ now: new Date() });
  } catch (err) {
    console.warn('Automatic contribution scheduler:', err && err.message ? err.message : err);
  } finally {
    running = false;
  }
}

function isSchedulerRunning() {
  return !!timer;
}

function start() {
  if (timer) return;
  if (!shouldStartScheduler()) {
    console.log('Prototype automatic contribution scheduler disabled');
    return;
  }
  firstRunTimer = setTimeout(() => {
    tick();
  }, FIRST_RUN_DELAY_MS);
  if (typeof firstRunTimer.unref === 'function') firstRunTimer.unref();
  timer = setInterval(tick, INTERVAL_MS);
  if (typeof timer.unref === 'function') timer.unref();
  console.log('Prototype automatic contribution scheduler enabled');
}

function stop() {
  if (firstRunTimer) {
    clearTimeout(firstRunTimer);
    firstRunTimer = null;
  }
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = {
  start,
  stop,
  tick,
  INTERVAL_MS,
  FIRST_RUN_DELAY_MS,
  OPT_IN_FLAG,
  shouldStartScheduler,
  isSchedulerRunning
};
