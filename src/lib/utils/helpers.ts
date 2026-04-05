export function chunkArray<T>(items: T[], size: number) {
  if (size <= 0) {
    throw new Error('Chunk size must be greater than zero.');
  }

  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

export function formatMillions(value: number) {
  return `${value}M`;
}

export function generateRoomCode(length = 6) {
  return Array.from({ length }, () =>
    'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'.charAt(
      Math.floor(Math.random() * 32),
    ),
  ).join('');
}
