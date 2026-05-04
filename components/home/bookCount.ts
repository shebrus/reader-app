// склонение книга / книги / книг
export const getBookCountLabel = (count: number) => {
  const absoluteCount = Math.abs(count);
  const lastTwoDigits = absoluteCount % 100;
  const lastDigit = absoluteCount % 10;

  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) {
    return `${count} книг`;
  }

  if (lastDigit === 1) {
    return `${count} книга`;
  }

  if (lastDigit >= 2 && lastDigit <= 4) {
    return `${count} книги`;
  }

  return `${count} книг`;
};
