/** Число с существительным в нужной форме: 1 событие, 3 события, 5 событий. */
export function plural(count: number, one: string, few: string, many: string) {
    const lastTwoDigits = count % 100;
    const lastDigit = count % 10;

    const noun =
        lastTwoDigits >= 11 && lastTwoDigits <= 14
            ? many
            : lastDigit === 1
                ? one
                : lastDigit >= 2 && lastDigit <= 4
                    ? few
                    : many;

    return `${count} ${noun}`;
}
