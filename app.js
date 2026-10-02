"use strict";

const iconRefresh = () => window.lucide && window.lucide.createIcons();
const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
iconRefresh();

const menuButton = document.querySelector(".menu-toggle");
const mobileNavigation = document.querySelector("#mobile-nav");
function closeMenu() {
  menuButton.setAttribute("aria-expanded", "false");
  mobileNavigation.hidden = true;
}
menuButton.addEventListener("click", () => {
  const isOpen = menuButton.getAttribute("aria-expanded") === "true";
  menuButton.setAttribute("aria-expanded", String(!isOpen));
  mobileNavigation.hidden = isOpen;
});
mobileNavigation.querySelectorAll("a").forEach(link => link.addEventListener("click", closeMenu));
document.addEventListener("keydown", event => { if (event.key === "Escape") closeMenu(); });
window.matchMedia("(min-width: 701px)").addEventListener("change", closeMenu);

const navigationLinks = [...document.querySelectorAll(".desktop-nav a")];
let navigationFrame = null;
function updateNavigation() {
  navigationFrame = null;
  const reached = navigationLinks.filter(link => document.querySelector(link.hash).getBoundingClientRect().top <= 160);
  const current = reached.length ? reached[reached.length - 1] : null;
  navigationLinks.forEach(link => {
    link.classList.toggle("active", link === current);
    if (link === current) link.setAttribute("aria-current", "location");
    else link.removeAttribute("aria-current");
  });
}
window.addEventListener("scroll", () => {
  if (navigationFrame === null) navigationFrame = window.requestAnimationFrame(updateNavigation);
}, { passive: true });
updateNavigation();

const figureDialog = document.querySelector("#figure-dialog");
const expandedImage = document.querySelector("#expanded-image");
document.querySelectorAll(".zoom-button").forEach(button => {
  button.addEventListener("click", () => {
    const figure = button.closest("figure");
    const img = figure.querySelector("img");
    expandedImage.src = img.currentSrc || img.src;
    expandedImage.alt = img.alt;
    document.querySelector("#dialog-figure-title").textContent = figure.querySelector("figcaption").textContent.replace(/^\s*\d+\s*/, "");
    figureDialog.showModal();
  });
});
document.querySelectorAll("dialog").forEach(dialog => {
  dialog.querySelector(".dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
});
document.querySelector("[data-release]").addEventListener("click", () => document.querySelector("#release-dialog").showModal());

document.querySelectorAll("figure[data-figure]").forEach(figure => {
  const asset = (window.OPENSLA_ASSETS || {})[figure.dataset.figure];
  const image = figure.querySelector("img");
  const toggle = figure.querySelector(".animation-toggle");
  if (!asset || !asset.animation || !toggle) return;
  let playing = !motionPreference.matches;
  function render() {
    image.src = playing ? asset.animation : asset.poster;
    toggle.title = playing ? "Pause animation" : "Play animation";
    toggle.setAttribute("aria-label", toggle.title);
    toggle.innerHTML = `<i data-lucide="${playing ? "pause" : "play"}" aria-hidden="true"></i>`;
    iconRefresh();
  }
  const preload = new Image();
  preload.onload = () => { toggle.hidden = false; render(); };
  preload.onerror = () => { image.src = asset.poster; toggle.hidden = true; };
  preload.src = asset.animation;
  toggle.addEventListener("click", () => { playing = !playing; render(); });
  motionPreference.addEventListener("change", event => { if (event.matches) { playing = false; render(); } });
});

document.querySelector("#copy-citation").addEventListener("click", async () => {
  const text = document.querySelector("#bibtex").textContent;
  const status = document.querySelector(".copy-status");
  try {
    if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
    else {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.cssText = "position:fixed;left:-9999px";
      document.body.append(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      if (!copied) throw new Error("Copy unavailable");
    }
    status.textContent = "Copied";
  } catch {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(document.querySelector("#bibtex"));
    selection.removeAllRanges();
    selection.addRange(range);
    status.textContent = "Select and copy";
  }
  window.setTimeout(() => { status.textContent = ""; }, 2600);
});
