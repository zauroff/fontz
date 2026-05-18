import { create } from 'zustand';
import { gfonts } from '../../wailsjs/go/models';
import type { FontFamily, ListQuery } from '../lib/wails';

const DEFAULT_SAMPLE = 'The quick brown fox jumps over the lazy dog';

export type Filters = {
  search: string;
  category: string;
  subset: string;
  sort: string;
};

type DialogState =
  | { kind: 'closed' }
  | { kind: 'variants'; family: FontFamily }
  | { kind: 'collision'; family: FontFamily; variants: string[]; collidingVariants: string[] };

type State = {
  filters: Filters;
  sampleText: string;
  sampleSize: number;
  installed: Record<string, string[]>;
  startupError: string;
  dialog: DialogState;

  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void;
  setSampleText: (v: string) => void;
  setSampleSize: (v: number) => void;
  setInstalled: (next: Record<string, string[]>) => void;
  mergeInstalled: (family: string, variants: string[]) => void;
  setStartupError: (msg: string) => void;
  openInstallDialog: (family: FontFamily) => void;
  openCollisionDialog: (family: FontFamily, variants: string[], collidingVariants: string[]) => void;
  closeDialog: () => void;
};

export const useStore = create<State>((set) => ({
  filters: { search: '', category: '', subset: '', sort: 'alpha' },
  sampleText: DEFAULT_SAMPLE,
  sampleSize: 36,
  installed: {},
  startupError: '',
  dialog: { kind: 'closed' },

  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),
  setSampleText: (v) => set({ sampleText: v }),
  setSampleSize: (v) => set({ sampleSize: v }),
  setInstalled: (next) => set({ installed: next }),
  mergeInstalled: (family, variants) =>
    set((s) => ({ installed: { ...s.installed, [family]: variants } })),
  setStartupError: (msg) => set({ startupError: msg }),
  openInstallDialog: (family) => set({ dialog: { kind: 'variants', family } }),
  openCollisionDialog: (family, variants, collidingVariants) =>
    set({ dialog: { kind: 'collision', family, variants, collidingVariants } }),
  closeDialog: () => set({ dialog: { kind: 'closed' } }),
}));

export function listQueryFromFilters(filters: Filters, offset: number, limit: number): ListQuery {
  return gfonts.ListQuery.createFrom({
    search: filters.search,
    category: filters.category,
    subset: filters.subset,
    sort: filters.sort,
    offset,
    limit,
  });
}
