(() => {
  const root = document.documentElement;
  const colors = { light: "#f9f8f4", dark: "#181a17" };
  let transitionSequence = 0;
  let activeWaveLayer = null;
  let restoreThemeDelays = null;

  function readPreference() {
    try {
      return localStorage.getItem("shumy-theme");
    } catch {
      return null;
    }
  }

  function backgroundColor(theme) {
    const mode = root.dataset.gameMode;
    if (mode === "draw") return theme === "dark" ? "#172329" : "#eef4f3";
    if (mode === "vote") return theme === "dark" ? "#241b18" : "#fff4ec";
    return colors[theme];
  }

  async function revealTheme(theme) {
    const sequence = ++transitionSequence;
    restoreThemeDelays?.();
    activeWaveLayer?.remove();
    const waveDuration = 950;
    const themeDuration = 420;
    const shumy = document.querySelector(".mascot-badge, .qr-face");
    const layer = document.createElement("div");
    layer.className = "theme-wave-layer";
    layer.setAttribute("aria-hidden", "true");
    const bounds = shumy?.getBoundingClientRect();
    const origin = bounds
      ? { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
      : { x: innerWidth / 2, y: innerHeight / 2 };
    const farthestX = Math.max(origin.x, innerWidth - origin.x);
    const farthestY = Math.max(origin.y, innerHeight - origin.y);
    const maxDistance = Math.hypot(farthestX, farthestY);
    const radius = maxDistance * 1.06;
    const maxThemeDelay = 240;
    const colorProperties = new Set(["all", "background-color", "background-image", "color", "border-color", "fill", "stroke", "box-shadow"]);
    const delayRestores = [];

    for (const element of document.querySelectorAll("body, body *")) {
      const bounds = element.getBoundingClientRect();
      if (!bounds.width && !bounds.height) continue;
      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      const distance = Math.hypot(centerX - origin.x, centerY - origin.y);
      const delay = Math.round(Math.min(1, distance / maxDistance) * maxThemeDelay);
      const properties = getComputedStyle(element).transitionProperty.split(",").map(property => property.trim());
      if (!properties.some(property => colorProperties.has(property))) continue;

      delayRestores.push([element, element.style.transitionDelay]);
      element.style.transitionDelay = properties.map(property => {
        if (element === document.body && (property === "background-color" || property === "background-image")) return `${waveDuration}ms`;
        if (property === "color") return "0ms";
        return colorProperties.has(property) ? `${delay}ms` : "0ms";
      }).join(", ");
    }

    restoreThemeDelays = () => {
      for (const [element, delay] of delayRestores) element.style.transitionDelay = delay;
      restoreThemeDelays = null;
    };

    const start = `circle(0px at ${origin.x}px ${origin.y}px)`;
    const end = `circle(${radius}px at ${origin.x}px ${origin.y}px)`;
    layer.style.backgroundColor = backgroundColor(theme);
    layer.style.clipPath = start;

    document.body.append(layer);
    activeWaveLayer = layer;
    root.dataset.themeTransition = "wave";
    setTheme(theme);
    await layer.animate([
      { clipPath: start },
      { clipPath: end },
    ], {
      duration: waveDuration,
      easing: "cubic-bezier(.65,0,.35,1)",
      fill: "forwards",
    }).finished.catch(() => {});

    if (sequence !== transitionSequence) return;
    await new Promise(resolve => setTimeout(resolve, themeDuration));
    if (sequence !== transitionSequence) return;
    await new Promise(requestAnimationFrame);
    layer.remove();
    activeWaveLayer = null;
    restoreThemeDelays?.();
    await new Promise(requestAnimationFrame);
    if (sequence === transitionSequence) delete root.dataset.themeTransition;
  }

  function setTheme(theme) {
    root.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", colors[theme]);
    document.querySelectorAll("[data-theme-choice]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.themeChoice === theme));
    });
  }

  function updateTheme(theme, animate = false) {
    if (theme !== "light" && theme !== "dark") return;
    const changed = root.dataset.theme && root.dataset.theme !== theme;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate || !changed || reducedMotion) {
      setTheme(theme);
      return;
    }

    revealTheme(theme);
  }

  // the shumy dialog passes its own theme so the embedded page matches it
  const embeddedTheme = new URLSearchParams(location.search).get("shumyTheme");
  updateTheme(embeddedTheme || (readPreference() === "dark" ? "dark" : "light"));
  document.addEventListener("DOMContentLoaded", () => updateTheme(root.dataset.theme));

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-theme-choice]");
    if (!button) return;
    const theme = button.dataset.themeChoice;
    if (root.dataset.theme === theme) return;
    updateTheme(theme, true);
    try {
      localStorage.setItem("shumy-theme", theme);
    } catch {}
  });

  window.addEventListener("storage", event => {
    if (event.key === "shumy-theme") updateTheme(event.newValue === "dark" ? "dark" : "light", true);
  });
})();
