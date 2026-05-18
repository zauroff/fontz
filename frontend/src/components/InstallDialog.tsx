import { useStore } from '../state/store';
import { VariantPicker } from './VariantPicker';

export function InstallDialog() {
  const dialog = useStore((s) => s.dialog);
  const closeDialog = useStore((s) => s.closeDialog);
  const installedMap = useStore((s) => s.installed);
  const mergeInstalled = useStore((s) => s.mergeInstalled);
  const openCollisionDialog = useStore((s) => s.openCollisionDialog);

  if (dialog.kind !== 'variants') return null;

  return (
    <VariantPicker
      family={dialog.family}
      alreadyInstalled={installedMap[dialog.family.family] ?? []}
      onCancel={closeDialog}
      onInstalled={(result) => {
        const installedNow = result.variants
          .filter((v) => v.status === 'installed')
          .map((v) => v.variant);
        const collisions = result.variants
          .filter((v) => v.collision)
          .map((v) => v.variant);

        if (installedNow.length > 0) {
          const prev = installedMap[result.family] ?? [];
          mergeInstalled(result.family, Array.from(new Set([...prev, ...installedNow])));
        }

        if (collisions.length > 0) {
          openCollisionDialog(
            dialog.family,
            result.variants.map((v) => v.variant),
            collisions,
          );
        } else {
          closeDialog();
        }
      }}
    />
  );
}
