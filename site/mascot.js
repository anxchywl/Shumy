(() => {
  const badge = document.querySelector(".mascot-badge");
  if (!badge) return;

  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const actions = {
    wave: 1300, jump: 900, look: 2000, spin: 1100, salto: 1600, dance: 1800, giggle: 900,
    draw: 2600, peek: 3000, sleep: 3600, sneeze: 1800, huh: 1900, balloon: 3200,
    bonk: 2400, fall: 3000, paint: 3400, water: 3600, shy: 2600, phone: 3000, sing: 3000,
  };
  const idleActions = [
    "wave", "jump", "look", "spin", "salto", "dance", "draw", "peek", "sleep", "sneeze", "huh", "balloon",
    "paint", "water", "shy", "phone", "sing",
  ];
  const nearActions = ["shy", "wave", "huh", "jump"];
  const gaze = badge.querySelector(".mascot-gaze");
  const touchActions = ["fall", "bonk", "giggle", "spin", "sneeze"];
  const eyesBusy = ["giggle", "sleep", "sneeze", "bonk", "fall", "shy", "sing", "paint", "phone"];
  let clicks = 0;
  let lastAction = "";
  let actionTimer = 0;
  let nextTimer = 0;
  let blinkTimer = 0;

  const between = (min, max) => min + Math.random() * (max - min);
  const canMove = () => !preference.matches && !document.hidden;

  function play(action) {
    if (!canMove()) return;
    clearTimeout(actionTimer);
    // restart the same action when it is triggered twice in a row
    badge.removeAttribute("data-act");
    void badge.offsetWidth;
    badge.dataset.act = action;
    lastAction = action;
    actionTimer = setTimeout(() => badge.removeAttribute("data-act"), actions[action]);
  }

  function playRandom() {
    const choices = idleActions.filter(action => action !== lastAction);
    play(choices[Math.floor(Math.random() * choices.length)]);
  }

  function scheduleNext() {
    clearTimeout(nextTimer);
    if (!canMove()) return;
    nextTimer = setTimeout(() => {
      playRandom();
      scheduleNext();
    }, between(4000, 7000));
  }

  function scheduleBlink() {
    clearTimeout(blinkTimer);
    if (!canMove()) return;
    blinkTimer = setTimeout(() => {
      if (!eyesBusy.includes(badge.dataset.act)) {
        badge.classList.add("is-blinking");
        setTimeout(() => badge.classList.remove("is-blinking"), 220);
      }
      scheduleBlink();
    }, between(1800, 4800));
  }

  function sync() {
    if (!canMove()) {
      clearTimeout(nextTimer);
      clearTimeout(blinkTimer);
      badge.removeAttribute("data-act");
      return;
    }
    scheduleNext();
    scheduleBlink();
  }

  let lastSpecial = -Infinity;
  let specials = 0;
  function playSpecial() {
    const now = performance.now();
    // a long gag finishes before the next one starts
    if (["fall", "bonk"].includes(badge.dataset.act) || now - lastSpecial < 2500) return;
    lastSpecial = now;
    const choices = specials === 0 ? ["fall"] : touchActions.filter(action => action !== lastAction);
    specials += 1;
    play(choices[Math.floor(Math.random() * choices.length)]);
    scheduleNext();
  }

  // a mouse only has to pass over shumi, taps and the keyboard still work
  badge.addEventListener("pointerenter", event => {
    if (event.pointerType === "mouse") playSpecial();
  });
  badge.addEventListener("click", event => {
    if (event.pointerType !== "mouse") playSpecial();
  });

  // shumi watches the cursor and reacts when it comes close
  let wasNear = false;
  let lastNearReaction = 0;

  window.addEventListener("pointermove", event => {
    if (event.pointerType !== "mouse" || !canMove()) return;
    const box = badge.getBoundingClientRect();
    const eyesX = box.left + box.width / 2;
    const eyesY = box.top + box.height * .15;
    const dx = event.clientX - eyesX;
    const dy = event.clientY - eyesY;
    const distance = Math.hypot(dx, dy);
    const reach = Math.min(distance / 60, 1) * 7;
    gaze.style.transform = `translate(${(dx / Math.max(distance, 1) * reach).toFixed(1)}px, ${(dy / Math.max(distance, 1) * reach * .8).toFixed(1)}px)`;

    const now = performance.now();
    const idle = !badge.dataset.act;
    const near = distance < box.width * 1.4;
    if (near && !wasNear && idle && now - lastNearReaction > 4000) {
      lastNearReaction = now;
      play(nearActions[Math.floor(Math.random() * nearActions.length)]);
      scheduleNext();
    }
    wasNear = near;
  }, { passive: true });
  document.documentElement.addEventListener("pointerleave", () => { gaze.style.transform = ""; });

  preference.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  setTimeout(() => play("wave"), 600);
  sync();
})();
