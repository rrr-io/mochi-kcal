/**
 * Fades out the launch splash defined in index.html.
 * It stays at least `minMs` from page start so the bounce is seen even when the app loads instantly.
 */
export function hideSplash(minMs = 1600) {
  const el = document.getElementById("splash");
  if (!el) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const wait = Math.max(0, (reduced ? 300 : minMs) - performance.now());
  window.setTimeout(() => {
    el.classList.add("bye");
    const remove = () => el.remove();
    el.addEventListener("transitionend", remove, { once: true });
    window.setTimeout(remove, 800); // in case transitionend never fires
  }, wait);
}
