/* pro-ui.js — Non-invasive enhancer that adds classes/attrs for styling only.
   No data fetching or app logic is touched. Safe to include on any page. */

(function () {
  // Apply scope class
  document.documentElement.classList.add('pro-ui-root');
  document.body.classList.add('pro-ui');

  // Mark likely card containers as data-card (non-destructive)
  const selectors = [
    '.card','.panel','.tile','.block','.kpi','.stats','.chart','.chart-wrap','[role="region"]',
    'section','article','.table-wrapper','.list','[data-block]'
  ];
  const seen = new WeakSet();
  document.querySelectorAll(selectors.join(',')).forEach(el => {
    if (seen.has(el)) return;
    // Heuristics: reasonable size & not the whole page wrapper
    const rect = el.getBoundingClientRect();
    if (rect.height > 48 && rect.width > 120 && el !== document.body) {
      el.setAttribute('data-card', '');
      seen.add(el);
    }
  });

  // AI blocks: tag containers containing "AI 요약" or "AI 분석" labels
  const aiKeywords = ['AI 요약','AI 분석','AI Summary','AI Analyze','AI 분석 결과'];
  document.querySelectorAll('section,article,div').forEach(el => {
    const t = (el.textContent || '').trim();
    if (!t) return;
    if (aiKeywords.some(k => t.includes(k))) {
      el.setAttribute('data-ai-block', '');
      // Inject chip header if missing
      if (!el.querySelector('.ai-chip')) {
        const head = document.createElement('div');
        head.className = 'ai-head';
        head.innerHTML = '<span class="ai-chip">🤖 AI</span>';
        el.insertBefore(head, el.firstChild);
      }
    }
  });

  // Trends: mark ▲ ▼
  document.querySelectorAll('span, small, td').forEach(el => {
    const txt = (el.textContent || '').trim();
    if (txt.startsWith('▲')) el.classList.add('delta','up');
    if (txt.startsWith('▼')) el.classList.add('delta','down');
  });

  // Hide known placeholders (UI-only; safe to remove visually)
  const placeholders = ['### STOCK-CARD', 'No data', '데이터 분석 결과가 없습니다.'];
  document.querySelectorAll('section,article,div,li').forEach(el => {
    const t = (el.textContent || '').trim();
    if (!t) return;
    for (const ph of placeholders) {
      if (t.includes(ph)) {
        el.setAttribute('data-placeholder','true');
        break;
      }
    }
  });
})();