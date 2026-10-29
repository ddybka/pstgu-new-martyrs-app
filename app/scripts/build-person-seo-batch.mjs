
import {
    mkdirSync,
    readFileSync,
    readdirSync,
    writeFileSync,
} from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SITE_URL = "https://fcsmap.nmbook.ru";
const DIST_DIR = path.join(ROOT, "dist");
const PERSON_DIR = path.join(DIST_DIR, "person");
const DATA_DIR = path.join(ROOT, "src", "data", "persons-full");
const INDEX_FILE = path.join(ROOT, "src", "data", "persons-index.json");

function escapeHtml(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function formatYears(person) {
    const born = person.Рождение?.год;
    const died = person.Кончина?.год;

    if (born && died) return `${born}–${died}`;
    if (born) return `с ${born} года`;
    if (died) return `до ${died} года`;
    return "Годы жизни неизвестны";
}

function paragraphs(value) {
    return String(value ?? "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => `<p>${escapeHtml(line)}</p>`)
        .join("\n");
}

function renderEvent(event) {
    const places = (event.Места ?? [])
        .map((place) => place.адрес)
        .filter(Boolean);

    return `
    <section>
      ${event.датировка ? `<h3>${escapeHtml(event.датировка)}</h3>` : ""}
      ${event.тип ? `<p>${escapeHtml(event.тип)}</p>` : ""}
      ${paragraphs(event.текст)}
      ${places.length
            ? `<p>Места: ${places.map(escapeHtml).join("; ")}</p>`
            : ""
        }
    </section>
  `;
}

function renderFallback(person) {
    const number = Number(person.Номер);
    const name =
        person.ФИО || person.Заголовок || `Новомученик №${number}`;
    const rank = person.сан_церк_служение || "";
    const canonical = `${SITE_URL}/person/${number}`;
    const events = (person.События ?? []).map(renderEvent).join("\n");

    return `
    <div id="seo-person-fallback" data-person-name="${escapeHtml(name)}">
      <style>
        #seo-person-fallback {
          position: fixed;
          inset: 0;
          z-index: 99999;
          overflow-y: auto;
          background: #f7f1e7;
          color: #1b1714;
          font-family: Georgia, serif;
          line-height: 1.7;
        }
        #seo-person-fallback * { box-sizing: border-box; }
        #seo-person-fallback nav {
          padding: 16px 24px;
          border-bottom: 1px solid #d9c5a3;
        }
        #seo-person-fallback main {
          max-width: 900px;
          margin: 0 auto;
          padding: 28px 24px 60px;
        }
        #seo-person-fallback h1 {
          font-size: clamp(26px, 4vw, 38px);
          line-height: 1.25;
        }
        #seo-person-fallback h2 {
          margin-top: 32px;
          font-size: 24px;
        }
        #seo-person-fallback h3 { font-size: 19px; }
        #seo-person-fallback p {
          margin: 12px 0;
          white-space: pre-line;
        }
        #seo-person-fallback .seo-years { color: #72665d; }
        #seo-person-fallback a { color: #6f4328; }
      </style>

      <nav><a href="/">Память новомучеников</a></nav>

      <main>
        <article>
          <h1>${escapeHtml(name)}</h1>
          <p class="seo-years">
            ${escapeHtml(formatYears(person))}
            ${rank ? ` · ${escapeHtml(rank)}` : ""}
          </p>

          ${person.Рождение?.текст
            ? `<section><h2>Рождение</h2>${paragraphs(person.Рождение.текст)}</section>`
            : ""
        }

          ${person.Кончина?.текст
            ? `<section><h2>Кончина</h2>${paragraphs(person.Кончина.текст)}</section>`
            : ""
        }

          ${events
            ? `<section><h2>События жизни</h2>${events}</section>`
            : ""
        }

          ${person.дополнительный_текст
            ? `<section><h2>Дополнительные сведения</h2>${paragraphs(person.дополнительный_текст)}</section>`
            : ""
        }

          <p><a href="${canonical}">Открыть страницу профиля</a></p>
        </article>
      </main>
    </div>
  `;
}

function makeJsonLd(person) {
    const number = Number(person.Номер);
    const name =
        person.ФИО || person.Заголовок || `Новомученик №${number}`;

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        name,
        url: `${SITE_URL}/person/${number}`,
    };

    if (person.Рождение?.год) {
        jsonLd.birthDate = String(person.Рождение.год);
    }

    if (person.Кончина?.год) {
        jsonLd.deathDate = String(person.Кончина.год);
    }

    if (person.сан_церк_служение) {
        jsonLd.description = person.сан_церк_служение;
    }

    return JSON.stringify(jsonLd).replaceAll("<", "\\u003c");
}

function setMeta(html, attribute, key, content) {
    const escapedContent = escapeHtml(content);
    const escapedKey = escapeHtml(key);
    const regex = new RegExp(
        `<meta\\s+[^>]*${attribute}=["']${escapedKey}["'][^>]*>`,
        "i"
    );

    const tag = `<meta ${attribute}="${escapedKey}" content="${escapedContent}" />`;

    return regex.test(html)
        ? html.replace(regex, tag)
        : html.replace("</head>", `  ${tag}\n</head>`);
}

function setCanonical(html, url) {
    const tag = `<link rel="canonical" href="${escapeHtml(url)}" />`;
    const regex = /<link\s+[^>]*rel=["']canonical["'][^>]*\/?>/i;

    return regex.test(html)
        ? html.replace(regex, tag)
        : html.replace("</head>", `  ${tag}\n</head>`);
}

function processHtml(template, person) {
    if (template.includes('id="seo-person-fallback"')) {
        throw new Error(
            "Шаблон уже содержит SEO-блок. Запусти свежий expo export перед генерацией."
        );
    }

    const number = Number(person.Номер);
    const name =
        person.ФИО || person.Заголовок || `Новомученик №${number}`;
    const rank = person.сан_церк_служение || "";
    const years = formatYears(person);
    const url = `${SITE_URL}/person/${number}`;

    const title = `${name} — житие и биография`;
    const description = [
        name,
        years,
        rank,
        "Биографические сведения и места, связанные с жизнью новомученика.",
    ]
        .filter(Boolean)
        .join(". ")
        .slice(0, 300);

    let html = template;

    html = html.replace(
        /<title>[\s\S]*?<\/title>/i,
        `<title>${escapeHtml(title)}</title>`
    );

    html = setMeta(html, "name", "description", description);
    html = setMeta(html, "property", "og:title", title);
    html = setMeta(html, "property", "og:description", description);
    html = setMeta(html, "property", "og:url", url);
    html = setCanonical(html, url);

    const jsonLd =
        `<script type="application/ld+json">${makeJsonLd(person)}</script>`;

    html = html.replace("</head>", `${jsonLd}\n</head>`);

    const fallback = renderFallback(person);

    html = html.replace(
        /<body(?:\s[^>]*)?>/i,
        (bodyTag) => `${bodyTag}\n${fallback}`
    );

    const hideScript = `
    <script>
      (() => {
        const fallback = document.getElementById("seo-person-fallback");
        const root = document.getElementById("root");
        if (!fallback || !root) return;

        const expectedName = (fallback.dataset.personName || "")
          .replace(/\\s+/g, " ")
          .trim();

        const check = () => {
          const headings = [...root.querySelectorAll("h1")];

          const ready = headings.some((heading) =>
            heading.textContent
              .replace(/\\s+/g, " ")
              .trim() === expectedName
          );

          if (ready) {
            fallback.remove();
            observer.disconnect();
          }
        };

        const observer = new MutationObserver(check);
        observer.observe(root, {
          childList: true,
          subtree: true,
          characterData: true
        });

        check();
      })();
    </script>
  `;

    return html.replace("</body>", `${hideScript}\n</body>`);
}

function main() {
    const index = JSON.parse(readFileSync(INDEX_FILE, "utf8"));
    const expectedNumbers = new Set(
        index.persons.map(([number]) => Number(number))
    );

    const templateFile = path.join(PERSON_DIR, "1.html");
    const template = readFileSync(templateFile, "utf8");

    if (!template.includes("</head>") || !/<body(?:\s[^>]*)?>/i.test(template)) {
        throw new Error(`Некорректный HTML-шаблон: ${templateFile}`);
    }

    if (template.includes('id="seo-person-fallback"')) {
        throw new Error(
            "В dist/person/1.html уже есть SEO-блок. Сначала выполни свежий expo export."
        );
    }

    const chunks = readdirSync(DATA_DIR)
        .filter((name) => /^chunk-\d+\.json$/.test(name))
        .sort();

    if (chunks.length === 0) {
        throw new Error(`JSON-чанки не найдены: ${DATA_DIR}`);
    }

    mkdirSync(PERSON_DIR, { recursive: true });

    const found = new Set();
    let generated = 0;

    for (const file of chunks) {
        const records = JSON.parse(
            readFileSync(path.join(DATA_DIR, file), "utf8")
        );

        for (const person of records) {
            const number = Number(person.Номер);

            if (!expectedNumbers.has(number) || found.has(number)) continue;

            const html = processHtml(template, person);
            writeFileSync(
                path.join(PERSON_DIR, `${number}.html`),
                html,
                "utf8"
            );

            found.add(number);
            generated++;

            if (generated % 1000 === 0) {
                console.log(`Создано страниц: ${generated}`);
            }
        }
    }

    const missing = [...expectedNumbers].filter((number) => !found.has(number));

    if (missing.length > 0) {
        throw new Error(
            `Не найдены данные для ${missing.length} профилей. Первые номера: ${missing.slice(0, 20).join(", ")}`
        );
    }

    console.log(`\nГотово: создано SEO-страниц: ${generated}`);
    console.log(`Каталог: ${PERSON_DIR}`);
}

main();
