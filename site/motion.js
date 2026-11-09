(() => {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const shapes = Array.from(document.querySelectorAll(".drifters span"), (element, index) => ({
    element,
    phase: index * 1.7,
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    homeX: 0,
    homeY: 0,
  }));
  const pointer = { x: 0, y: 0, time: -Infinity };
  let frame = 0;
  let previousTime = 0;

  function randomizePositions() {
    const placed = [];
    const width = document.documentElement.clientWidth;
    const height = document.documentElement.clientHeight;
    const mascot = document.querySelector(".mascot-badge")?.getBoundingClientRect();
    const center = mascot
      ? { x: mascot.left + mascot.width / 2, y: mascot.top + mascot.height / 2 }
      : { x: width / 2, y: height / 2 };
    const innerRadius = Math.max(150, Math.min(width, height) * .2);
    const outerRadius = Math.hypot(width, height) * .48;

    for (const shape of shapes) {
      const size = Math.max(shape.element.offsetWidth, shape.element.offsetHeight);
      const minDistance = Math.max(
        size + Math.min(width, height) * .09,
        Math.min(width, height) * .14,
      );
      let position;
      let bestPosition;
      let bestDistance = -Infinity;

      for (let attempt = 0; attempt < 400; attempt++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = innerRadius + Math.random() * Math.max(0, outerRadius - innerRadius);
        const candidate = {
          x: Math.min(width * .96, Math.max(width * .04, center.x + Math.cos(angle) * radius)),
          y: Math.min(height * .96, Math.max(height * .04, center.y + Math.sin(angle) * radius)),
        };
        if (Math.hypot(candidate.x - center.x, candidate.y - center.y) < innerRadius) continue;
        const nearest = Math.min(...placed.map(other => Math.hypot(candidate.x - other.x, candidate.y - other.y)));

        if (nearest > bestDistance) {
          bestDistance = nearest;
          bestPosition = candidate;
        }
        if (nearest >= minDistance) {
          position = candidate;
          break;
        }
      }

      position ??= bestPosition;
      placed.push(position);
      const x = position.x / width * 100;
      const y = position.y / height * 100;
      shape.element.style.setProperty("--x", `${x}%`);
      shape.element.style.setProperty("--y", `${y}%`);
      shape.element.style.setProperty("--turn", `${Math.round(Math.random() * 40 - 20)}deg`);
      shape.element.style.setProperty("--delay", `${-Math.random() * 7}s`);
    }
  }

  function measure() {
    for (const shape of shapes) {
      shape.homeX = shape.element.offsetLeft + shape.element.offsetWidth / 2;
      shape.homeY = shape.element.offsetTop + shape.element.offsetHeight / 2;
    }
  }

  function animate(now) {
    const elapsed = Math.min((now - previousTime) / (1000 / 60), 2);
    previousTime = now;

    for (const shape of shapes) {
      const distanceX = shape.homeX + shape.x - pointer.x;
      const distanceY = shape.homeY + shape.y - pointer.y;
      const distance = Math.hypot(distanceX, distanceY);

      if (now - pointer.time < 180 && distance < 130) {
        const force = (1 - distance / 130) * .2;
        shape.velocityX += distanceX / Math.max(distance, 1) * force * elapsed;
        shape.velocityY += distanceY / Math.max(distance, 1) * force * elapsed;
      }

      shape.velocityX += (Math.sin(now * .0004 + shape.phase) * .035 - shape.x * .007) * elapsed;
      shape.velocityY += (Math.cos(now * .0003 + shape.phase) * .035 - shape.y * .007) * elapsed;
      const damping = Math.pow(.95, elapsed);
      shape.velocityX *= damping;
      shape.velocityY *= damping;
      shape.x = Math.max(-30, Math.min(30, shape.x + shape.velocityX * elapsed));
      shape.y = Math.max(-30, Math.min(30, shape.y + shape.velocityY * elapsed));
      shape.element.style.transform = `translate(${shape.x.toFixed(2)}px, ${shape.y.toFixed(2)}px) rotate(${(shape.x * .25).toFixed(2)}deg)`;
    }

    frame = requestAnimationFrame(animate);
  }

  function syncMotion() {
    cancelAnimationFrame(frame);
    frame = 0;
    const enabled = !preference.matches;
    const running = enabled && !document.hidden;
    document.documentElement.dataset.motion = running ? "on" : "off";

    if (running) {
      previousTime = performance.now();
      frame = requestAnimationFrame(animate);
    }
  }

  window.addEventListener("pointermove", event => {
    if (event.pointerType !== "mouse") return;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.time = performance.now();
  }, { passive: true });
  window.addEventListener("resize", measure, { passive: true });
  preference.addEventListener("change", syncMotion);
  document.addEventListener("visibilitychange", syncMotion);
  window.addEventListener("pageshow", syncMotion);
  window.addEventListener("pagehide", () => cancelAnimationFrame(frame));
  randomizePositions();
  measure();
  syncMotion();
})();
