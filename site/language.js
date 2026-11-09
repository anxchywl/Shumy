(() => {
  const texts = {
    ru: {
      title: "Шуми. Игры для компании",
      description: "Шуми. Присоединяйся с телефона или открой игру на общем экране как ведущий.",
      brand: "<span class=\"brand-syllable\">Шу<span class=\"brand-stress\" aria-hidden=\"true\">´</span></span><span>ми</span>",
      brandLabel: "Шуми",
      source: "Открытый код",
      language: "Язык",
      theme: "Тема оформления",
      lightTheme: "Светлая тема",
      darkTheme: "Тёмная тема",
      lightMode: "Светлая",
      darkMode: "Тёмная",
      closeDialog: "Закрыть игру",
      mascotButton: "Пощекотать Шуми",
      start: "Начать игру",
      playerTitle: "Я игрок",
      playerText: "Введи код комнаты<br>и своё имя.",
      hostTitle: "Я ведущий",
      hostText: "Открой на общем экране.<br>Пригласи друзей по коду.",
    },
    en: {
      title: "Shumy. Party games",
      description: "Shumy. Join from your phone or host a game on the shared screen.",
      brand: "<span class=\"brand-syllable\">Shu<span class=\"brand-stress\" aria-hidden=\"true\">´</span></span><span>my</span>",
      brandLabel: "Shumy",
      source: "Open source",
      language: "Language",
      theme: "Theme",
      lightTheme: "Light theme",
      darkTheme: "Dark theme",
      lightMode: "Light",
      darkMode: "Dark",
      closeDialog: "Close game",
      mascotButton: "Tickle Shumy",
      start: "Start a game",
      playerTitle: "I’m a player",
      playerText: "Enter the room code<br>and your name.",
      hostTitle: "I’m the host",
      hostText: "Open on the shared screen.<br>Invite friends with the code.",
    },
    kk: {
      title: "Шуми. Компанияға арналған ойындар",
      description: "Шуми. Телефоннан қосыл немесе ортақ экранда жүргізуші бол.",
      brand: "<span class=\"brand-syllable\">Шу<span class=\"brand-stress\" aria-hidden=\"true\">´</span></span><span>ми</span>",
      brandLabel: "Шуми",
      source: "Ашық код",
      language: "Тіл",
      theme: "Тақырып",
      lightTheme: "Ашық тақырып",
      darkTheme: "Қараңғы тақырып",
      lightMode: "Ашық",
      darkMode: "Қараңғы",
      closeDialog: "Ойынды жабу",
      mascotButton: "Шумиді қытықтау",
      start: "Ойынды бастау",
      playerTitle: "Мен ойыншымын",
      playerText: "Бөлме кодын<br>және атыңды енгіз.",
      hostTitle: "Мен жүргізушімін",
      hostText: "Ортақ экранда аш.<br>Достарыңды кодпен шақыр.",
    },
  };
  const switcher = document.querySelector(".languages");
  const buttons = switcher.querySelectorAll("button");

  function readSaved() {
    try { return localStorage.getItem("shumy-language"); } catch { return null; }
  }

  function apply(language, scope = document) {
    const dictionary = texts[language] || texts.ru;
    if (scope === document) {
      document.documentElement.lang = language;
      document.title = dictionary.title;
      document.querySelector('meta[name="description"]').content = dictionary.description;
    }
    const hostLink = scope.querySelector(".entry-card.host");
    if (hostLink) {
      const hostUrl = new URL(hostLink.href);
      hostUrl.searchParams.set("shumyLang", language);
      hostLink.href = hostUrl.href;
    }
    const brand = scope.querySelector(".brand-name");
    brand.innerHTML = dictionary.brand;
    brand.setAttribute("aria-label", dictionary.brandLabel);
    scope.querySelectorAll("[data-i18n]").forEach(element => { element.innerHTML = dictionary[element.dataset.i18n]; });
    scope.querySelectorAll("[data-i18n-label]").forEach(element => element.setAttribute("aria-label", dictionary[element.dataset.i18nLabel]));
    scope.querySelectorAll("[data-language]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.language === language)));
  }

  buttons.forEach(button => button.addEventListener("click", () => {
    const language = button.dataset.language;
    const commit = () => apply(language);
    if (language === document.documentElement.lang) return;
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches && window.shumyRevealLanguage) {
      window.shumyRevealLanguage(language, preview => apply(language, preview), commit);
    } else {
      commit();
    }
    try { localStorage.setItem("shumy-language", language); } catch {}
  }));

  switcher.hidden = false;
  const saved = readSaved();
  apply(texts[saved] ? saved : "ru");
})();
