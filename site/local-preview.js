(() => {
  if (location.hostname !== "127.0.0.1" && location.hostname !== "localhost") return;

  const gameOrigin = `${location.protocol}//${location.hostname}:5181`;
  document.querySelector(".entry-card.player").href = `${gameOrigin}/`;
  document.querySelector(".entry-card.host").href = `${gameOrigin}/tv`;
})();
