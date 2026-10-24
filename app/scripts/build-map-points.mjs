/**
 * Пересобирает снимок точек карты из `map.nmbook.ru`.
 *
 * Точки лежат в бандле, а не грузятся всегда по сети, по двум причинам.
 * Первая: у `map.nmbook.ru` нет заголовка `Access-Control-Allow-Origin`, и в
 * вебе браузер запрос просто не отдаёт — веб-версия осталась бы без карты.
 * Вторая: исходная выдача весит 3.8 МБ, а нужны из неё четыре поля.
 *
 * Здесь она ужимается до ~210 КБ: массивы вместо объектов, тип точки — индекс
 * в словаре, координаты округлены до пяти знаков (это метры, для карты
 * заведомо достаточно). Описания событий выброшены целиком — они и есть почти
 * весь вес, а показываются на странице новомученика из основного API.
 *
 * Запускать руками, когда на той стороне обновятся данные:
 *     node scripts/build-map-points.mjs
 */
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE = 'http://map.nmbook.ru/map/all_points';
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'map-points.json');

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`${SOURCE} ответил ${response.status}`);

const raw = await response.json();

const types = [...new Set(raw.map((point) => point.clusterType))].sort();
const points = raw
    // Точка без координат для карты бесполезна; в текущей выдаче таких нет,
    // но на пустую карту из-за одной битой записи попадать не хочется.
    .filter((point) => Number.isFinite(point.N) && Number.isFinite(point.E))
    .map((point) => [
        point.humanId,
        Number(point.N.toFixed(5)),
        Number(point.E.toFixed(5)),
        types.indexOf(point.clusterType),
    ]);

// `builtAt` нужен приложению, чтобы сравнить снимок из бандла с сохранённой
// копией последней загрузки и взять ту, что новее (см. `use-map-points`).
writeFileSync(out, JSON.stringify({ source: SOURCE, builtAt: Date.now(), types, points }));

console.log(`${points.length} точек → ${out}`);
