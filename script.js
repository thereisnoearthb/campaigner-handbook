(function () {
  'use strict';

  const btn = document.getElementById('getCopyBtn');
  const panel = document.getElementById('formPanel');
  const hint = document.getElementById('hintTrigger');
  const yearEl = document.getElementById('year');

  if (yearEl) yearEl.textContent = new Date().getFullYear();

  if (!btn || !panel) return;

  let isOpen = false;

  function openPanel() {
    panel.hidden = false;
    // Force reflow so the transition runs from the hidden state.
    void panel.offsetWidth;
    panel.classList.add('is-open');
    btn.setAttribute('aria-expanded', 'true');
    btn.textContent = 'Hide the form';

    // Bring the form into view, but don't fight a user who's already scrolling.
    window.requestAnimationFrame(function () {
      panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    isOpen = true;
  }

  function closePanel() {
    panel.classList.remove('is-open');
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = 'Get Your Copy Now!';
    isOpen = false;

    // Hide from layout after the transition finishes.
    const onEnd = function (e) {
      if (e.propertyName !== 'max-height') return;
      if (!isOpen) panel.hidden = true;
      panel.removeEventListener('transitionend', onEnd);
    };
    panel.addEventListener('transitionend', onEnd);
  }

  btn.addEventListener('click', function () {
    if (isOpen) closePanel(); else openPanel();
  });

  if (hint) hint.addEventListener('click', openPanel);
})();
