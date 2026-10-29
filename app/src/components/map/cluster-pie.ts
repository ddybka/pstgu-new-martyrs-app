import type { ExpressionSpecification } from '@maplibre/maplibre-gl-style-spec';

import { POINT_KINDS, type KindColors } from './map-kinds';

/**
 * Кластер — «пончик» из секторов по типам событий: размер сектора — доля
 * событий этого типа в кластере.
 *
 * В style spec секторов нет: круг рисуется только одним цветом. Поэтому
 * кластер — картинка (слой symbol), а картинки рисуются здесь, на лету и
 * только те, что понадобились. Источник считает в каждом кластере события по
 * типам (`clusterProperties`), выражение собирает из долей имя картинки —
 * «pie-light-12-6-4-2», а карта, не найдя её, просит нарисовать
 * (`onImageMissing` на нативе, `styleimagemissing` в вебе).
 *
 * Доли округляются до PIE_STEPS частей круга: иначе на каждый кластер было бы
 * по своей картинке. Тип, который в кластере есть, получает хотя бы одну
 * часть — иначе редкий тип пропадал бы из кластера на глазах.
 */

export const PIE_PREFIX = 'pie-';
const PIE_STEPS = 24;

/** Сторона картинки в пикселях — под самый крупный кластер на экране 3x. */
export const PIE_SIZE = 168;

/** Ключи свойств кластера — латиницей, по порядку `POINT_KINDS`. */
const KIND_KEYS = POINT_KINDS.map((_, index) => `k${index}`);

export const CLUSTER_PROPERTIES = Object.fromEntries(
    POINT_KINDS.map(({ kind }, index) => [
        KIND_KEYS[index],
        ['+', ['case', ['==', ['get', 'kind'], kind], 1, 0]],
    ])
) as Record<string, ExpressionSpecification>;

/** Имя картинки кластера из его свойств. */
export function pieImageExpression(scheme: 'light' | 'dark', version = 0): ExpressionSpecification {
    const parts = KIND_KEYS.flatMap((key, index) => {
        const count = ['get', key];
        const share = [
            'case',
            ['>', count, 0],
            ['max', 1, ['round', ['*', PIE_STEPS, ['/', count, ['get', 'point_count']]]]],
            0,
        ];
        return index === 0 ? [['to-string', share]] : ['-', ['to-string', share]];
    });

    // Версия — пустая строка в конце имени, на само имя она не влияет. Новая
    // версия — новое выражение, и карта заново раскладывает слой: так она
    // подхватывает картинки, дорисованные уже после первой раскладки (см.
    // `martyrs-map.tsx`).
    const stamp = version > 0 ? [['case', ['==', 0, 1], String(version), '']] : [];

    return ['concat', `${PIE_PREFIX}${scheme}-`, ...parts, ...stamp] as unknown as ExpressionSpecification;
}

/** Обратно из имени картинки: тема и доли по типам. */
export function parsePieName(name: string): { scheme: 'light' | 'dark'; shares: number[] } | null {
    const match = new RegExp(`^${PIE_PREFIX}(light|dark)-([\\d-]+)$`).exec(name);
    if (!match) return null;

    const shares = match[2].split('-').map(Number);
    if (shares.length !== KIND_KEYS.length || shares.some((share) => !Number.isFinite(share))) return null;

    return { scheme: match[1] as 'light' | 'dark', shares };
}

function hexToRgb(hex: string): [number, number, number] {
    const value = parseInt(hex.replace('#', '').slice(0, 6), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

/**
 * Картинка кластера в RGBA: снаружи — тонкое кольцо цвета фона (как обводка
 * у точек), под ним — сектора, в середине — круг цвета фона под число.
 */
export function renderPie(shares: readonly number[], colors: KindColors, background: string): Uint8Array {
    const size = PIE_SIZE;
    const data = new Uint8Array(size * size * 4);

    const total = shares.reduce((sum, share) => sum + share, 0) || 1;
    const palette = POINT_KINDS.map(({ kind }) => hexToRgb(colors[kind]));
    const back = hexToRgb(background);

    // Границы секторов в долях круга, от 12 часов по часовой стрелке.
    const bounds: number[] = [];
    let acc = 0;
    for (const share of shares) {
        acc += share / total;
        bounds.push(acc);
    }

    const center = size / 2;
    const outer = size / 2;
    const stroke = size * 0.045;
    const inner = outer * 0.58;

    const colorAt = (x: number, y: number): [number, number, number] | null => {
        const dx = x - center;
        const dy = y - center;
        const r = Math.sqrt(dx * dx + dy * dy);

        if (r > outer) return null;
        if (r > outer - stroke || r < inner) return back;

        const turn = (Math.atan2(dx, -dy) / (2 * Math.PI) + 1) % 1;
        const index = bounds.findIndex((bound, i) => turn < bound && shares[i] > 0);
        return palette[index === -1 ? palette.length - 1 : index];
    };

    // Сглаживание — 4×4 выборки, но только у окружностей: внутри колец
    // хватает одной.
    const SAMPLES = 4;
    const edges = [outer, outer - stroke, inner];

    for (let y = 0; y < size; y += 1) {
        for (let x = 0; x < size; x += 1) {
            const dx = x + 0.5 - center;
            const dy = y + 0.5 - center;
            const r = Math.sqrt(dx * dx + dy * dy);
            const offset = (y * size + x) * 4;

            if (!edges.some((edge) => Math.abs(r - edge) < 1)) {
                const color = colorAt(x + 0.5, y + 0.5);
                if (color) {
                    data[offset] = color[0];
                    data[offset + 1] = color[1];
                    data[offset + 2] = color[2];
                    data[offset + 3] = 255;
                }
                continue;
            }

            let red = 0;
            let green = 0;
            let blue = 0;
            let alpha = 0;

            for (let sy = 0; sy < SAMPLES; sy += 1) {
                for (let sx = 0; sx < SAMPLES; sx += 1) {
                    const color = colorAt(x + (sx + 0.5) / SAMPLES, y + (sy + 0.5) / SAMPLES);
                    if (!color) continue;
                    red += color[0];
                    green += color[1];
                    blue += color[2];
                    alpha += 1;
                }
            }

            if (alpha > 0) {
                data[offset] = Math.round(red / alpha);
                data[offset + 1] = Math.round(green / alpha);
                data[offset + 2] = Math.round(blue / alpha);
                data[offset + 3] = Math.round((alpha / (SAMPLES * SAMPLES)) * 255);
            }
        }
    }

    return data;
}

// --- PNG для нативной карты -------------------------------------------------
//
// Нативный MapLibre принимает картинки только адресом, поэтому RGBA
// упаковывается в PNG и отдаётся как data URI. Сжатие — самое простое, что
// понимает любой декодер: фильтр Sub по строкам (одинаковые соседние пиксели
// становятся нулями) и deflate фиксированными кодами Хаффмана, где сжимаются
// только повторы байта подряд. Для картинки из нескольких сплошных цветов
// этого хватает: 113 КБ сырых пикселей превращаются в несколько килобайт.

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(bytes: Uint8Array, start: number, end: number) {
    let crc = 0xffffffff;
    for (let i = start; i < end; i += 1) crc = CRC_TABLE[(crc ^ bytes[i]) & 255] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array) {
    let a = 1;
    let b = 0;
    for (let i = 0; i < bytes.length; i += 1) {
        a = (a + bytes[i]) % 65521;
        b = (b + a) % 65521;
    }
    return ((b << 16) | a) >>> 0;
}

class BitWriter {
    bytes: number[] = [];
    private current = 0;
    private count = 0;

    /** Биты значения — младшим вперёд, как велит deflate для чисел. */
    write(value: number, length: number) {
        for (let i = 0; i < length; i += 1) {
            this.current |= ((value >> i) & 1) << this.count;
            this.count += 1;
            if (this.count === 8) {
                this.bytes.push(this.current);
                this.current = 0;
                this.count = 0;
            }
        }
    }

    /** Коды Хаффмана пишутся старшим битом вперёд. */
    writeCode(code: number, length: number) {
        for (let i = length - 1; i >= 0; i -= 1) this.write((code >> i) & 1, 1);
    }

    flush() {
        if (this.count > 0) this.bytes.push(this.current);
        this.current = 0;
        this.count = 0;
    }
}

const LENGTH_BASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LENGTH_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];

function writeLiteral(writer: BitWriter, symbol: number) {
    if (symbol < 144) writer.writeCode(0x30 + symbol, 8);
    else if (symbol < 256) writer.writeCode(0x190 + symbol - 144, 9);
    else if (symbol < 280) writer.writeCode(symbol - 256, 7);
    else writer.writeCode(0xc0 + symbol - 280, 8);
}

/** Повтор предыдущего байта `length` раз (3…258): длина и расстояние 1. */
function writeRepeat(writer: BitWriter, length: number) {
    let index = LENGTH_BASE.length - 1;
    while (LENGTH_BASE[index] > length) index -= 1;

    writeLiteral(writer, 257 + index);
    writer.write(length - LENGTH_BASE[index], LENGTH_EXTRA[index]);
    writer.writeCode(0, 5);
}

function deflate(bytes: Uint8Array): Uint8Array {
    const writer = new BitWriter();
    writer.write(1, 1); // последний блок
    writer.write(1, 2); // фиксированные коды

    let i = 0;
    while (i < bytes.length) {
        let run = 0;
        if (i > 0) {
            while (i + run < bytes.length && run < 258 && bytes[i + run] === bytes[i - 1]) run += 1;
        }

        if (run >= 3) {
            writeRepeat(writer, run);
            i += run;
        } else {
            writeLiteral(writer, bytes[i]);
            i += 1;
        }
    }

    writeLiteral(writer, 256);
    writer.flush();

    const adler = adler32(bytes);
    return new Uint8Array([
        0x78, 0x01,
        ...writer.bytes,
        (adler >>> 24) & 255, (adler >>> 16) & 255, (adler >>> 8) & 255, adler & 255,
    ]);
}

function chunk(type: string, data: Uint8Array): Uint8Array {
    const out = new Uint8Array(12 + data.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    for (let i = 0; i < 4; i += 1) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    view.setUint32(8 + data.length, crc32(out, 4, 8 + data.length));
    return out;
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function toBase64(bytes: Uint8Array) {
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
        const a = bytes[i];
        const b = bytes[i + 1] ?? 0;
        const c = bytes[i + 2] ?? 0;
        const triple = (a << 16) | (b << 8) | c;
        out += BASE64[(triple >> 18) & 63] + BASE64[(triple >> 12) & 63];
        out += i + 1 < bytes.length ? BASE64[(triple >> 6) & 63] : '=';
        out += i + 2 < bytes.length ? BASE64[triple & 63] : '=';
    }
    return out;
}

/** RGBA → PNG в data URI. */
export function encodePng(rgba: Uint8Array, width: number, height: number): string {
    const stride = width * 4;
    const filtered = new Uint8Array((stride + 1) * height);

    for (let y = 0; y < height; y += 1) {
        const row = y * (stride + 1);
        filtered[row] = 1; // фильтр Sub
        for (let x = 0; x < stride; x += 1) {
            const value = rgba[y * stride + x];
            const left = x >= 4 ? rgba[y * stride + x - 4] : 0;
            filtered[row + 1 + x] = (value - left) & 255;
        }
    }

    const header = new Uint8Array(13);
    const view = new DataView(header.buffer);
    view.setUint32(0, width);
    view.setUint32(4, height);
    header.set([8, 6, 0, 0, 0], 8); // 8 бит, RGBA

    const parts = [
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        chunk('IHDR', header),
        chunk('IDAT', deflate(filtered)),
        chunk('IEND', new Uint8Array(0)),
    ];

    const png = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
    let offset = 0;
    for (const part of parts) {
        png.set(part, offset);
        offset += part.length;
    }

    return `data:image/png;base64,${toBase64(png)}`;
}
