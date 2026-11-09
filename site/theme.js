(() => {
  const root = document.documentElement;
  const colors = { light: "#f9f8f4", dark: "#181a17" };
  let activeReveal = null;

  function readPreference() {
    try {
      return localStorage.getItem("shumy-theme");
    } catch {
      return null;
    }
  }

  function revealChange({ theme, preparePreview, commit }) {
    const mascot = document.querySelector(".mascot-badge");
    const bounds = mascot?.getBoundingClientRect();
    const originX = bounds ? bounds.left + bounds.width / 2 : innerWidth / 2;
    const originY = bounds ? bounds.top + bounds.height / 2 : innerHeight / 2;
    const radius = Math.hypot(
      Math.max(originX, innerWidth - originX),
      Math.max(originY, innerHeight - originY),
    ) + scrollY + 2;
    const layer = document.createElement("div");
    layer.className = "theme-wave-layer";
    if (theme) layer.dataset.previewTheme = theme;
    layer.setAttribute("aria-hidden", "true");
    layer.inert = true;

    layer.style.top = `${-scrollY}px`;
    layer.style.height = `${Math.max(document.body.scrollHeight, innerHeight)}px`;

    const animationSources = [];
    for (const selector of [".drifters", ".topbar", ".launcher"]) {
      const element = document.querySelector(selector);
      if (!element) continue;
      const preview = element.cloneNode(true);
      layer.append(preview);
      if (selector !== ".topbar") animationSources.push([element, preview]);
    }
    if (preparePreview) preparePreview(layer);
    if (theme) layer.querySelectorAll("[data-theme-choice]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.themeChoice === theme));
    });

    const centerY = originY + scrollY;
    const start = `circle(0px at ${originX}px ${centerY}px)`;
    const end = `circle(${radius}px at ${originX}px ${centerY}px)`;
    layer.style.clipPath = start;
    document.body.append(layer);

    for (const [source, preview] of animationSources) {
      const sourceNodes = [source, ...source.querySelectorAll("*")];
      const previewNodes = [preview, ...preview.querySelectorAll("*")];
      const previewBySource = new Map(sourceNodes.map((node, index) => [node, previewNodes[index]]));
      for (const sourceAnimation of source.getAnimations({ subtree: true })) {
        const target = previewBySource.get(sourceAnimation.effect?.target);
        const previewAnimation = target?.getAnimations().find(animation =>
          animation.animationName === sourceAnimation.animationName);
        if (previewAnimation && sourceAnimation.currentTime !== null) {
          previewAnimation.currentTime = sourceAnimation.currentTime;
        }
      }
    }

    const liveShapes = document.querySelector("body > .drifters")?.querySelectorAll("span") ?? [];
    const previewShapes = layer.querySelectorAll(".drifters span");
    const liveMascot = document.querySelector(".mascot-badge");
    const previewMascot = layer.querySelector(".mascot-badge");
    let followFrame = 0;
    function followMotion() {
      for (let index = 0; index < liveShapes.length; index++) {
        previewShapes[index].style.transform = liveShapes[index].style.transform;
      }
      if (liveMascot && previewMascot) {
        previewMascot.querySelector(".mascot-gaze").style.transform =
          liveMascot.querySelector(".mascot-gaze").style.transform;
        previewMascot.classList.toggle("is-blinking", liveMascot.classList.contains("is-blinking"));
      }
      followFrame = requestAnimationFrame(followMotion);
    }
    followMotion();

    const animation = layer.animate([
      { clipPath: start },
      { clipPath: end },
    ], {
      duration: 440,
      easing: "cubic-bezier(.4, 0, .2, 1)",
      fill: "forwards",
    });
    const reveal = {
      cancel() {
        animation.cancel();
        cancelAnimationFrame(followFrame);
        layer.remove();
      },
    };
    activeReveal = reveal;

    animation.finished.then(() => {
      if (activeReveal !== reveal) return;
      root.classList.add("theme-swap-instant");
      commit();
      requestAnimationFrame(() => {
        cancelAnimationFrame(followFrame);
        layer.remove();
        activeReveal = null;
        requestAnimationFrame(() => root.classList.remove("theme-swap-instant"));
      });
    }).catch(() => {});
  }

  function setTheme(theme) {
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors[theme]);
    document.querySelectorAll("[data-theme-choice]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.themeChoice === theme));
    });
  }

  window.shumyRevealLanguage = (language, preparePreview, commit) => {
    activeReveal?.cancel();
    activeReveal = null;
    if (document.querySelector(".game-dialog[open]")) {
      commit();
      return;
    }
    revealChange({ preparePreview, commit });
  };

  function updateTheme(theme, animate = false) {
    if (theme !== "light" && theme !== "dark") return;
    activeReveal?.cancel();
    activeReveal = null;
    const changed = root.dataset.theme && root.dataset.theme !== theme;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || !changed || reducedMotion || document.querySelector(".game-dialog[open]")) {
      setTheme(theme);
      return;
    }

    revealChange({ theme, commit: () => setTheme(theme) });
  }

  updateTheme(readPreference() === "dark" ? "dark" : "light");
  document.addEventListener("DOMContentLoaded", () => setTheme(root.dataset.theme));

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-theme-choice]");
    if (!button) return;
    const theme = button.dataset.themeChoice;
    updateTheme(theme, true);
    try {
      localStorage.setItem("shumy-theme", theme);
    } catch {}
  });

  window.addEventListener("storage", event => {
    if (event.key === "shumy-theme") updateTheme(event.newValue === "dark" ? "dark" : "light", true);
  });
})();
