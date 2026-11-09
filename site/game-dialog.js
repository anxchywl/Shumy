(() => {
  const dialog = document.querySelector("#gameDialog");
  if (!dialog || typeof dialog.showModal !== "function") return;

  const frame = dialog.querySelector(".game-dialog-frame");
  let opener = null;
  let closing = false;

  function closeDialog() {
    if (!dialog.open || closing) return;

    closing = true;
    dialog.classList.add("is-closing");
    const duration = parseFloat(getComputedStyle(dialog).getPropertyValue("--game-dialog-duration"));
    window.setTimeout(() => dialog.close(), Number.isFinite(duration) ? duration : 240);
  }

  document.querySelectorAll(".entry-card").forEach(link => {
    link.addEventListener("click", event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || dialog.open) return;

      event.preventDefault();
      opener = link;
      closing = false;
      dialog.classList.remove("is-closing");
      const gameTitle = link.querySelector("strong").textContent.trim();
      const role = link.classList.contains("player") ? "player" : "host";
      const gameUrl = new URL(link.href);

      dialog.dataset.gameRole = role;
      dialog.classList.remove("is-player-active");
      dialog.setAttribute("aria-label", gameTitle);

      gameUrl.searchParams.set("shumyEmbed", role);
      gameUrl.searchParams.set("shumyTheme", document.documentElement.dataset.theme === "dark" ? "dark" : "light");
      gameUrl.searchParams.set("shumyLang", document.documentElement.lang || "ru");
      if (role === "player") {
        gameUrl.searchParams.set("shumyEmbedVersion", "2");
        gameUrl.searchParams.set("shumyParentOrigin", location.origin);
      }

      frame.title = gameTitle;
      frame.src = gameUrl.href;
      dialog.showModal();
      // no close button, escape or a click outside closes the dialog
      frame.focus();
    });
  });

  dialog.addEventListener("click", event => {
    if (event.target === dialog) closeDialog();
  });
  dialog.addEventListener("cancel", event => {
    event.preventDefault();
    closeDialog();
  });
  window.addEventListener("message", event => {
    if (event.source !== frame.contentWindow || event.origin !== new URL(frame.src).origin) return;
    if (event.data?.type === "shumy-player-joined" && dialog.dataset.gameRole === "player") {
      dialog.classList.add("is-player-active");
    }
  });
  dialog.addEventListener("close", () => {
    // the close event can arrive after a quick reopen and must not blank the new game
    if (dialog.open) return;
    frame.src = "about:blank";
    dialog.classList.remove("is-closing", "is-player-active");
    delete dialog.dataset.gameRole;
    closing = false;
    opener?.focus();
  });
})();
