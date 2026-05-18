function variantOrderKey(v: string): number {
  if (v === 'regular') return 400;
  if (v === 'italic') return 400.5;
  const italic = v.endsWith('italic');
  const num = italic ? v.slice(0, -'italic'.length) : v;
  const weight = parseInt(num, 10) || 400;
  return weight + (italic ? 0.5 : 0);
}

export function sortVariants(variants: string[]): string[] {
  return [...variants].sort((a, b) => variantOrderKey(a) - variantOrderKey(b));
}
