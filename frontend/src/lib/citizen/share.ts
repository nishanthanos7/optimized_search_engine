export function buildWhatsAppShareUrl(text: string, url: string): string {
  const message = `${text.trim()}\n\n${url}`;
  return `https://wa.me/?text=${encodeURIComponent(message)}`;
}
