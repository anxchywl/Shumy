(() => {
  const dialog = document.querySelector("#gameDialog");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const frame = dialog.querySelector(".game-dialog-frame");
  const handle = dialog.querySelector(".game-dialog-handle");
  const closeButton = dialog.querySelector(".game-dialog-close");
  const mobileSheet = window.matchMedia("(max-width: 40rem)");
  let opener = null;
  let closing = false;
  let drag = null;
  let backdropPointerDown = false;
  let ignoreLauncherClicksUntil = 0;

  function syncSheetHandle() {
    const activePlayer = dialog.dataset.gameRole === "player" && dialog.classList.contains("is-player-active");
    const visible = mobileSheet.matches && dialog.open && !activePlayer;
    handle.hidden = !visible;
    dialog.classList.toggle("has-sheet-handle", visible);
    handle.setAttribute("aria-expanded", String(dialog.classList.contains("is-sheet-expanded")));
  }

  function setSheetExpanded(expanded) {
    expanded = dialog.dataset.gameRole === "host" && expanded;
    dialog.style.removeProperty("height");
    dialog.classList.toggle("is-sheet-expanded", expanded);
    dialog.classList.toggle("is-sheet-collapsed", !expanded);
    handle.setAttribute("aria-expanded", String(expanded));
  }

  function finishDrag(cancelled = false) {
    if (!drag) return;

    const currentDrag = drag;
    const { role, pointerId } = currentDrag;
    const height = currentDrag.pendingHeight ?? dialog.getBoundingClientRect().height;
    if (currentDrag.frame) window.cancelAnimationFrame(currentDrag.frame);
    drag = null;
    dialog.classList.remove("is-dragging");
    if (handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);

    if (!cancelled && !currentDrag.moved) {
      dialog.style.removeProperty("height");
      return;
    }

    dialog.style.height = `${height}px`;
    const dismissalDistance = Math.max(70, window.innerHeight * .09);
    if (!cancelled && (currentDrag.dismiss || currentDrag.lastY - currentDrag.startY > dismissalDistance)) {
      closeDialog();
      return;
    }

    const playerSheetHeight = Math.min(240, Math.max(216, window.innerHeight * .35));
    const collapsed = role === "host" ? window.innerHeight * .7 : playerSheetHeight;
    const expanded = role === "host" ? window.innerHeight * .8 : playerSheetHeight;
    setSheetExpanded(height >= (collapsed + expanded) / 2);
  }

  handle.addEventListener("pointerdown", event => {
    if (handle.hidden || !event.isPrimary || event.button !== 0) return;

    event.preventDefault();
    dialog.classList.remove("is-entering");
    const bounds = dialog.getBoundingClientRect();
    drag = { pointerId: event.pointerId, role: dialog.dataset.gameRole, startY: event.clientY, lastY: event.clientY, startHeight: bounds.height, pendingHeight: bounds.height, frame: 0 };
    dialog.classList.add("is-dragging");
    dialog.style.height = `${bounds.height}px`;
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
  });

  function moveSheet(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;

    drag.lastY = event.clientY;
    if (Math.abs(drag.lastY - drag.startY) >= 8) drag.moved = true;
    const playerSheetHeight = Math.min(240, Math.max(216, window.innerHeight * .35));
    const minHeight = drag.role === "host" ? window.innerHeight * .66 : playerSheetHeight;
    const maxHeight = drag.role === "host" ? window.innerHeight * .8 : playerSheetHeight;
    const rawHeight = drag.startHeight + drag.startY - event.clientY;
    const dismissalDistance = Math.max(70, window.innerHeight * .09);
    if (event.clientY - drag.startY > dismissalDistance && rawHeight < minHeight) drag.dismiss = true;
    const height = Math.max(minHeight, Math.min(maxHeight, rawHeight));
    drag.pendingHeight = height;
    if (!drag.frame) {
      drag.frame = window.requestAnimationFrame(() => {
        if (!drag) return;
        dialog.style.height = `${drag.pendingHeight}px`;
        drag.frame = 0;
      });
    }
  }

  window.addEventListener("pointermove", moveSheet);
  window.addEventListener("pointerup", () => finishDrag());
  window.addEventListener("pointercancel", () => finishDrag(true));
  handle.addEventListener("keydown", event => {
    if (!["ArrowUp", "ArrowDown", "Enter", " "].includes(event.key)) return;

    event.preventDefault();
    const expanded = event.key === "ArrowUp" || ((event.key === "Enter" || event.key === " ") && !dialog.classList.contains("is-sheet-expanded"));
    setSheetExpanded(expanded);
  });
  mobileSheet.addEventListener("change", syncSheetHandle);

  function closeDialog() {
    if (!dialog.open || closing) return;

    closing = true;
    ignoreLauncherClicksUntil = performance.now() + 400;
    dialog.classList.remove("is-entering");
    dialog.classList.add("is-closing");
    const duration = parseFloat(getComputedStyle(dialog).getPropertyValue("--game-dialog-duration"));
    window.setTimeout(() => dialog.close(), Number.isFinite(duration) ? duration : 240);
  }

  closeButton.addEventListener("click", closeDialog);

  document.querySelectorAll(".entry-card").forEach(link => {
    link.addEventListener("click", event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (dialog.open || closing || performance.now() < ignoreLauncherClicksUntil) {
        event.preventDefault();
        return;
      }

      event.preventDefault();
      opener = link;
      closing = false;
      dialog.classList.remove("is-closing");
      const gameTitle = link.querySelector("strong").textContent.trim();
      const role = link.classList.contains("player") ? "player" : "host";
      const gameUrl = new URL(link.href);

      dialog.dataset.gameRole = role;
      dialog.classList.remove("is-player-active", "is-sheet-expanded", "is-sheet-collapsed");
      handle.setAttribute("aria-label", ({ ru: "Изменить высоту игрового окна", en: "Resize game window", kk: "Ойын терезесінің биіктігін өзгерту" })[document.documentElement.lang] || "Resize game window");
      dialog.setAttribute("aria-label", gameTitle);
      closeButton.setAttribute("aria-label", ({ ru: "Закрыть игру", en: "Close game", kk: "Ойынды жабу" })[document.documentElement.lang] || "Close game");

      gameUrl.searchParams.set("shumyEmbed", role);
      gameUrl.searchParams.set("shumyTheme", document.documentElement.dataset.theme === "dark" ? "dark" : "light");
      gameUrl.searchParams.set("shumyLang", document.documentElement.lang || "ru");
      if (role === "player") {
        gameUrl.searchParams.set("shumyEmbedVersion", "3");
        gameUrl.searchParams.set("shumyParentOrigin", location.origin);
      }

      frame.title = gameTitle;
      frame.src = gameUrl.href;
      dialog.classList.toggle("is-entering", mobileSheet.matches);
      dialog.showModal();
      syncSheetHandle();
      // escape or a click outside also closes the dialog
      frame.focus();
    });
  });

  dialog.addEventListener("pointerdown", event => {
    backdropPointerDown = event.target === dialog;
  });
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;

    const bounds = dialog.getBoundingClientRect();
    const clickedOutside = event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom;
    if (backdropPointerDown && clickedOutside) closeDialog();
    backdropPointerDown = false;
  });
  dialog.addEventListener("animationend", event => {
    if (event.target === dialog && event.animationName === "phone-sheet-enter") dialog.classList.remove("is-entering");
  });
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    closeDialog();
  });
  window.addEventListener("message", event => {
    if (event.source !== frame.contentWindow || event.origin !== new URL(frame.src).origin) return;
    if (event.data?.type === "shumy-player-joined" && dialog.dataset.gameRole === "player") {
      dialog.classList.add("is-player-active");
      dialog.classList.remove("is-sheet-expanded", "is-sheet-collapsed", "is-dragging");
      dialog.style.removeProperty("height");
      syncSheetHandle();
    }
    if (event.data?.type === "shumy-player-leave" && dialog.dataset.gameRole === "player") closeDialog();
  });
  dialog.addEventListener("close", () => {
    // the close event can arrive after a quick reopen and must not blank the new game
    if (dialog.open) return;
    frame.src = "about:blank";
    dialog.classList.remove("is-closing", "is-entering", "is-player-active", "is-sheet-expanded", "is-sheet-collapsed", "is-dragging");
    dialog.style.removeProperty("height");
    delete dialog.dataset.gameRole;
    syncSheetHandle();
    closing = false;
    opener?.focus();
  });
})();
