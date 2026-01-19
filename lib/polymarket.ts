/**
 * Добавляет builder_id к Polymarket URL для отслеживания кликов
 */
export function addBuilderIdToUrl(url: string, builderId: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('builder_id', builderId);
    return urlObj.toString();
  } catch (error) {
    console.error('Invalid URL:', error);
    return url;
  }
}

/**
 * Получает builder_id из environment или использует дефолтный
 */
export function getBuilderId(): string {
  return process.env.NEXT_PUBLIC_POLYMARKET_BUILDER_ID || 'FLARIFYAPP';
}
