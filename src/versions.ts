import { readdir } from "node:fs/promises";
import { join } from "node:path";

export type PackageJson = {
  name?: string;
  version?: string;
  workspaces?: string[];
};

export function toJson(data: PackageJson) {
  return JSON.stringify(data, null, 2);
}

async function readPackageJson(dir: string): Promise<PackageJson | null> {
  const file = Bun.file(join(dir, "package.json"));
  if (!(await file.exists())) return null;
  return await file.json();
}

async function updateVersion(dir: string, version: string) {
  const json = await readPackageJson(dir);
  if (!json) return null;

  const updated = { ...json, version };
  await Bun.file(join(dir, "package.json")).write(toJson(updated));
  return updated;
}

export async function updateVersionsIn(root: string, version: string) {
  const rootPackage = await updateVersion(root, version);

  if (!rootPackage) {
    throw new Error(`unable to locate package.json in ${root}`);
  }

  if (rootPackage.workspaces) {
    await Promise.all(
      rootPackage.workspaces.map(async (pattern) => {
        if (pattern.endsWith("/*")) {
          const folder = join(root, pattern.substring(0, pattern.length - 2));

          if (!(await Bun.file(folder).exists())) {
            return;
          }

          const children = await readdir(folder);

          await Promise.all(
            children.map(async (it) => {
              const path = join(folder, it);
              await updateVersion(path, version);
            }),
          );
        } else {
          const path = join(root, pattern);
          await updateVersion(path, version);
        }
      }),
    );
  }
}
