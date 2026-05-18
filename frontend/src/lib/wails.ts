import {
  GetCategories,
  GetFamily,
  GetSubsets,
  Install,
  ListFonts,
  NeedsAPIKey,
  OpenURL,
  RefreshCatalog,
  ScanInstalled,
  SetAPIKey,
  StartupError,
} from '../../wailsjs/go/main/App';
import { gfonts, installer } from '../../wailsjs/go/models';
import { EventsOn } from '../../wailsjs/runtime/runtime';

export type FontFamily = gfonts.FontFamily;
export type ListQuery = gfonts.ListQuery;
export type ListResult = gfonts.ListResult;
export type InstallRequest = installer.InstallRequest;
export type InstallResult = installer.InstallResult;
export type VariantResult = installer.VariantResult;

// ProgressEvent is delivered through the Wails event bus, so it isn't part of
// the generated types. The shape mirrors installer.ProgressEvent on the Go side.
export type ProgressEvent = {
  family: string;
  variant: string;
  status: 'started' | 'completed' | 'failed';
  error?: string;
};

export const api = {
  listFonts: (q: ListQuery) => ListFonts(q),
  getFamily: (family: string) => GetFamily(family),
  getCategories: () => GetCategories(),
  getSubsets: () => GetSubsets(),
  install: (req: InstallRequest) => Install(req),
  scanInstalled: (families: string[]) => ScanInstalled(families),
  refreshCatalog: () => RefreshCatalog(),
  startupError: () => StartupError(),
  needsAPIKey: () => NeedsAPIKey(),
  setAPIKey: (key: string) => SetAPIKey(key),
  openURL: (url: string) => OpenURL(url),
};

export function onInstallProgress(handler: (ev: ProgressEvent) => void): () => void {
  return EventsOn('install:progress', (data: any) => handler(data as ProgressEvent));
}
