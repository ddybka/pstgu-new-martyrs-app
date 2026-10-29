
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

const OUTPUT_FILE = path.join(
    process.cwd(),
    "seo-preview",
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
        .map((line) => `<p>${escapeHtml(line)}</p>`)
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
    <section class="event">
      ${event.датировка
            ? `<h3>${escapeHtml(event.датировка)}</h3>`
            : ""}
      ${event.тип
            ? `<p class="muted">${escapeHtml(event.тип)}</p>`
            : ""}
      ${paragraphs(event.текст)}
      ${places.length
            ? `<p class="muted">Места: ${places.map(escapeHtml).join("; ")}</p>`
            : ""}
    </section>
  `;
}

function renderPerson(person) {
    const number = Number(person.Номер);
    const name = person.ФИО || person.Заголовок || `Новомученик №${number}`;
    const years = formatYears(person);
    const rank = person.сан_церк_служение || "";
    const canonical = `${SITE_URL}/person/${number}`;

    const title = `${name} (${years}) — житие и биография`;
    const description = [
        name,
        years,
        rank,
        person.Рождение?.текст,
    ]
        .filter(Boolean)
        .join(". ")
        .replace(/\s+/g, " ")
        .slice(0, 300);

    const events = (person.События ?? [])
        .map(renderEvent)
        .join("\n");

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        name,
        url: canonical,
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

    return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">

  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:site_name" content="Память новомучеников">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:type" content="profile">

  <script type="application/ld+json">${safeJsonLd}</script>

  <style>
    * { box-sizing: border-box; }
    body {
      max-width: 860px;
      margin: 0 auto;
      padding: 24px;
      font-family: Georgia, "Times New Roman", serif;
      line-height: 1.7;
      color: #241c18;
      background: #faf7f1;
    }
    h1 { line-height: 1.3; }
    h2 { margin-top: 2rem; }
    .subtitle, .muted { color: #71645b; }
    .event {
      padding: 12px 0;
      border-bottom: 1px solid #dfd4c6;
    }
    a { color: #70452e; }
  </style>
</head>
<body>
  <nav><a href="/">Память новомучеников</a></nav>

  <main>
    <article>
      <h1>${escapeHtml(name)}</h1>

      <p class="subtitle">
        ${escapeHtml(years)}${rank ? ` · ${escapeHtml(rank)}` : ""}
      </p>

      ${person.Рождение?.текст
            ? `<section><h2>Рождение</h2>${paragraphs(person.Рождение.текст)}</section>`
            : ""}

      ${person.Кончина?.текст
            ? `<section><h2>Кончина</h2>${paragraphs(person.Кончина.текст)}</section>`
            : ""}

      ${(person.События ?? []).length
            ? `<section><h2>События жизни</h2>${events}</section>`
            : ""}

      ${person.дополнительный_текст
            ? `<section><h2>Дополнительные сведения</h2>${paragraphs(person.дополнительный_текст)}</section>`
            : ""}
    </article>
  </main>

  <footer><p><a href="/">На главную</a></p></footer>
</body>
</html>`;
}

const files = readdirSync(DATA_DIR)
    .filter((name) => /^chunk-\d+\.json$/.test(name));

let person;

for (const file of files) {
    const records = JSON.parse(
        readFileSync(path.join(DATA_DIR, file), "utf8"),
    );

    person = records.find(
        (record) => Number(record.Номер) === PERSON_NUMBER,
    );

    if (person) break;
}

if (!person) {
    throw new Error(
        `Новомученик №${PERSON_NUMBER} не найден в ${DATA_DIR}`,
    );
}

mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
writeFileSync(OUTPUT_FILE, renderPerson(person), "utf8");

console.log(`Создан файл: ${OUTPUT_FILE}`);
console.log(`Номер: ${person.Номер}`);
console.log(`Имя: ${person.ФИО ?? person.Заголовок}`);
console.log(`Событий: ${(person.События ?? []).length}`);
