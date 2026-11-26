// Typeset $...$ and $$...$$ with KaTeX once it has loaded.
document.addEventListener('DOMContentLoaded', function () {
  if (!window.renderMathInElement) return;
  renderMathInElement(document.querySelector('article') || document.body, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false }
    ],
    ignoredTags: ['script', 'noscript', 'style', 'textarea', 'pre', 'code'],
    throwOnError: false
  });
});
