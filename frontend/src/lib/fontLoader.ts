type Entry = {
  styleEl: HTMLStyleElement;
  refCount: number;
};

const registry = new Map<string, Entry>();

function cssFontFamily(family: string): string {
  return family.replace(/"/g, '\\"');
}

function pickPreviewUrl(files: Record<string, string>): string | null {
  const preferred = ['regular', '400', 'italic', '300', '500', '600', '700'];
  for (const v of preferred) {
    if (files[v]) return upgradeHttps(files[v]);
  }
  const first = Object.values(files)[0];
  return first ? upgradeHttps(first) : null;
}

function upgradeHttps(u: string): string {
  return u.replace(/^http:/, 'https:');
}

export function acquireFont(family: string, files: Record<string, string>): void {
  const existing = registry.get(family);
  if (existing) {
    existing.refCount += 1;
    return;
  }
  const url = pickPreviewUrl(files);
  if (!url) return;
  const styleEl = document.createElement('style');
  styleEl.dataset.fontzFamily = family;
  styleEl.textContent = `@font-face {
  font-family: "${cssFontFamily(family)}";
  src: url("${url}") format("truetype");
  font-display: block;
}`;
  document.head.appendChild(styleEl);
  registry.set(family, { styleEl, refCount: 1 });
}

export function releaseFont(family: string): void {
  const entry = registry.get(family);
  if (!entry) return;
  entry.refCount -= 1;
  if (entry.refCount <= 0) {
    entry.styleEl.remove();
    registry.delete(family);
  }
}

export function loadVariantOnce(family: string, variant: string, url: string): string {
  const id = `${family}::${variant}`;
  if (document.querySelector(`style[data-fontz-variant="${cssAttr(id)}"]`)) {
    return faceName(family, variant);
  }
  const styleEl = document.createElement('style');
  styleEl.dataset.fontzVariant = id;
  const { weight, style } = parseVariant(variant);
  styleEl.textContent = `@font-face {
  font-family: "${cssFontFamily(faceName(family, variant))}";
  src: url("${upgradeHttps(url)}") format("truetype");
  font-weight: ${weight};
  font-style: ${style};
  font-display: block;
}`;
  document.head.appendChild(styleEl);
  return faceName(family, variant);
}

function faceName(family: string, variant: string): string {
  return `${family} ${variant}`;
}

function cssAttr(s: string): string {
  return s.replace(/"/g, '\\"');
}

export function parseVariant(variant: string): { weight: string; style: 'normal' | 'italic'; label: string } {
  if (variant === 'regular') return { weight: '400', style: 'normal', label: 'Regular' };
  if (variant === 'italic') return { weight: '400', style: 'italic', label: 'Italic' };
  const italic = variant.endsWith('italic');
  const numeric = italic ? variant.slice(0, -'italic'.length) : variant;
  const weight = numeric || '400';
  const weightLabel: Record<string, string> = {
    '100': 'Thin',
    '200': 'Extra Light',
    '300': 'Light',
    '400': 'Regular',
    '500': 'Medium',
    '600': 'Semi Bold',
    '700': 'Bold',
    '800': 'Extra Bold',
    '900': 'Black',
  };
  const base = weightLabel[weight] ?? weight;
  return {
    weight,
    style: italic ? 'italic' : 'normal',
    label: italic ? `${base} Italic` : base,
  };
}
