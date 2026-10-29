import {
    mkdirSync,
    readFileSync,
    readdirSync,
    writeFileSync,
} from "node:fs";
import path from "node:path";

const SITE_URL = "https://fcsmap.nmbook.ru";
const PERSON_NUMBER = 1;

const DATA_DIR = path.join(
    process.cwd(),
    "src",
    "data",
    "persons-full",
);

const SOURCE_FILE = path.join(
    process.cwd(),
    "dist",
    "person",
    `${PERSON_NUMBER}.html`,
);

const OUTPUT_FILE = path.join(
    process.cwd(),
    "dist",
    "seo-test",
    "person",
    `${PERSON_NUMBER}.html`,
);

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function paragraphs(value) {
    return String(value ?? "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line => `<p>${escapeHtml(line)}</p>`))
        .join("\n");
}

function formatYears(person) {
    const born = person.Рождение?.год;
    const died = person.Кончина?.год;

    if (born && died) return `${born}–${died}`;
    if (born) return `с ${born} года`;
    if (died) return `до ${died} года`;

    return "Годы жизни неизвестны";
}

function renderEvent(event) {
    const places = (event.Места ?? [])
        .map((place) => place.адрес)
        .filter(Boolean);

    return `
      <section class="seo-person-event">
        ${event.датировка
            ? `<h3>${escapeHtml(event.датировка)}</h3>`
            : ""}
        ${event.тип
            ? `<p>${escapeHtml(event.тип)}</p>`
            : ""}
        ${paragraphs(event.текст)}
        ${places.length
            ? `<p>Места: ${places.map(escapeHtml).join("; ")}</p>`
            : ""}
      </section>
    `;
}

function renderFallback(person) {
    const number = Number(person.Номер);
    const name =
        person.ФИО || person.Заголовок || `Новомученик №${number}`;
    const years = formatYears(person);
    const rank = person.сан_церк_служение || "";

    const events = (person.События ?? [])
        .map(renderEvent)
        .join("\n");

    return `
      <div id="seo-person-fallback">
        <nav>
          <a href="/">Память новомучеников</a>
        </nav>

        <main>
          <article>
            <h1>${escapeHtml(name)}</h1>

            <p class="seo-person-subtitle">
              ${escapeHtml(years)}
              ${rank ? ` · ${escapeHtml(rank)}` : ""}
            </p>

            ${person.Рождение?.текст
            ? `<section>
                    <h2>Рождение</h2>
                    ${paragraphs(person.Рождение.текст)}
                  </section>`
            : ""}

            ${person.Кончина?.текст
            ? `<section>
                    <h2>Кончина</h2>
                    ${paragraphs(person.Кончина.текст)}
                  </section>`
            : ""}

            ${(person.События ?? []).length
            ? `<section>
                    <h2>События жизни</h2>
                    ${events}
                  </section>`
            : ""}

            ${person.дополнительный_текст
            ? `<section>
                    <h2>Дополнительные сведения</h2>
                    ${paragraphs(person.дополнительный_текст)}
                  </section>`
            : ""}
          </article>
        </main>
      </div>
    `;
}

function findPerson() {
    const files = readdirSync(DATA_DIR)
        .filter((name) => /^chunk-\d+\.json$/.test(name));

    for (const file of files) {
        const records = JSON.parse(
            readFileSync(path.join(DATA_DIR, file), "utf8"),
        );

        const person = records.find(
            (record) => Number(record.Номер) === PERSON_NUMBER,
        );

        if (person) return person;
    }

    throw new Error(
        `Новомученик №${PERSON_NUMBER} не найден в ${DATA_DIR}`,
    );
}

function main() {
    const person = findPerson();

    let html = readFileSync(SOURCE_FILE, "utf8");

    if (!html.includes("</head>") || !html.includes('id="root"')) {
        throw new Error(
            `Исходный файл не похож на ожидаемую страницу Expo: ${SOURCE_FILE}`,
        );
    }

    if (html.includes('id="seo-person-fallback"')) {
        throw new Error(
            "В исходном HTML уже найден SEO fallback. Возьми оригинальный dist/person/1.html.",
        );
    }

    const number = Number(person.Номер);
    const name =
        person.ФИО || person.Заголовок || `Новомученик №${number}`;
    const years = formatYears(person);
    const rank = person.сан_церк_служение || "";

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        name,
        url: `${SITE_URL}/person/${number}`,
        ...(person.Рождение?.год
            ? { birthDate: String(person.Рождение.год) }
            : {}),
        ...(person.Кончина?.год
            ? { deathDate: String(person.Кончина.год) }
            : {}),
        ...(rank ? { description: rank } : {}),
    };

    const safeJsonLd = JSON.stringify(jsonLd)
        .replaceAll("<", "\\u003c");

    const structuredData =
        `\n<script type="application/ld+json">${safeJsonLd}</script>\n`;

    const fallbackStyles = `
<style id="seo-person-fallback-styles">
  #seo-person-fallback {
    position: fixed;
    inset: 0;
    z-index: 99999;
    overflow: auto;
    box-sizing: border-box;
    padding: 24px;
    background: #faf7f1;
    color: #241c18;
    font: 16px/1.7 Georgia, "Times New Roman", serif;
  }

  #seo-person-fallback * {
    box-sizing: border-box;
  }

  #seo-person-fallback main {
    width: 100%;
    max-width: 860px;
    margin: 0 auto;
  }

  #seo-person-fallback nav,
  #seo-person-fallback footer {
    max-width: 860px;
    margin: 0 auto 20px;
  }

  #seo-person-fallback h1 {
    line-height: 1.3;
  }

  #seo-person-fallback h2 {
    margin-top: 2rem;
  }

  #seo-person-fallback h3 {
    margin-bottom: 0.25rem;
  }

  #seo-person-fallback a {
    color: #70452e;
  }

  #seo-person-fallback .seo-person-subtitle,
  #seo-person-fallback .seo-person-event > p {
    color: #71645b;
  }

  #seo-person-fallback .seo-person-event {
    padding: 12px 0;
    border-bottom: 1px solid #dfd4c6;
  }
</style>
`;

    const fallback = `
${fallbackStyles}
${renderFallback(person)}
`;

    const hideFallbackScript = `
<script id="seo-person-fallback-controller">
(() => {
  const fallback = document.getElementById("seo-person-fallback");
  const root = document.getElementById("root");

  if (!fallback || !root) return;

  function checkProfileRendered() {
    const headings = root.querySelectorAll("h1");

    for (const heading of headings) {
      if (heading.textContent.trim().length > 0) {
        fallback.hidden = true;
        observer.disconnect();
        return true;
      }
    }

    return false;
  }

  const observer = new MutationObserver(checkProfileRendered);

  observer.observe(root, {
    childList: true,
    subtree: true,
    characterData: true,
  });

  checkProfileRendered();
})();
</script>
`;

    html = html.replace("</head>", `${structuredData}</head>`);
    html = html.replace("<body>", `<body>${fallback}`);
    html = html.replace("</body>", `${hideFallbackScript}</body>`);

    mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
    writeFileSync(OUTPUT_FILE, html, "utf8");

    console.log("Тестовая HTML-страница создана.");
    console.log(`Исходный файл: ${SOURCE_FILE}`);
    console.log(`Результат: ${OUTPUT_FILE}`);
    console.log(`Имя: ${name}`);
    console.log(`Годы жизни: ${years}`);
    console.log(`Событий: ${(person.События ?? []).length}`);
    console.log("Исходный HTML Expo не перезаписывался.");
}

main();
