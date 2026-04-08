import { loadHeader, setupHeaderSearch } from './header-loader.js';
import { loadGNB } from './gnb-loader.js';

const HOME_LOGO_ID = 'home-logo';
const HOME_TAGLINE_ID = 'home-tagline';
const TAGLINE_TEXT = 'K-콘텐츠 속 그 장소, 지금 바로 찾아가세요.';
const LOGO_ANIMATION_DURATION_MS = 1500;
const TYPEWRITER_INTERVAL_MS = 70;

function runTypewriter(taglineElement, text) {
  let index = 0;
  const typingTimer = window.setInterval(() => {
    taglineElement.textContent += text[index];
    index += 1;

    if (index >= text.length) {
      window.clearInterval(typingTimer);
      taglineElement.classList.add('is-done');
    }
  }, TYPEWRITER_INTERVAL_MS);
}

function initializeHomeSplash() {
  const logoElement = document.getElementById(HOME_LOGO_ID);
  const taglineElement = document.getElementById(HOME_TAGLINE_ID);
  if (!logoElement || !taglineElement) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    logoElement.classList.add('is-revealed');
    taglineElement.textContent = TAGLINE_TEXT;
    taglineElement.classList.add('is-done');
    return;
  }

  logoElement.classList.add('is-revealed');
  window.setTimeout(() => {
    runTypewriter(taglineElement, TAGLINE_TEXT);
  }, LOGO_ANIMATION_DURATION_MS);
}

async function initializeHomePage() {
  await loadHeader();
  await loadGNB();
  setupHeaderSearch();
  initializeHomeSplash();
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initializeHomePage();
  } catch (error) {
    console.error('❌ 홈 초기화 실패:', error);
  }
});
