import { expect, it, mock, spyOn } from "bun:test";
import { toJson, updateVersionsIn, type PackageJson } from "../src/versions";

function mockFiles(files: Record<string, PackageJson>) {
  const write = mock<(key: string, data: unknown) => Promise<number>>();

  spyOn(Bun, "file").mockImplementation((path) => {
    const key = path.toString().replaceAll("\\", "/");
    const content = files[key];

    return {
      exists: async () => true,
      json: async () => content,
      write: (data) => write(key, data),
    } as Bun.BunFile;
  });

  mock.module("node:fs/promises", () => {
    return {
      readdir: async (dir: string) => {
        const prefix = dir.toString().replaceAll("\\", "/") + "/";
        return Object.keys(files)
          .filter((it) => it.startsWith(prefix))
          .map((it) => it.substring(prefix.length))
          .map((it) => it.substring(0, it.indexOf("/")));
      },
    };
  });

  return write;
}

it("updates versions in single package", async () => {
  const write = mockFiles({
    "test/package.json": {
      name: "whatever",
      version: "1.2.0",
    },
  });

  const version = "1.2.3";
  await updateVersionsIn("test", version);

  expect(write).toBeCalledWith(
    "test/package.json",
    toJson({
      name: "whatever",
      version: "1.2.3",
    }),
  );
});

it("updates versions in workspaces", async () => {
  const write = mockFiles({
    "test/package.json": {
      name: "root",
      version: "1.2.0",
      workspaces: ["modules/*", "scripts"],
    },
    "test/modules/a/package.json": {
      name: "a",
    },
    "test/modules/b/package.json": {
      name: "b",
      version: "0.1.1",
    },
    "test/scripts/package.json": {},
  });

  const version = "1.2.3";
  await updateVersionsIn("test", version);

  expect(write).toBeCalledWith(
    "test/package.json",
    toJson({
      name: "root",
      version: "1.2.3",
      workspaces: ["modules/*", "scripts"],
    }),
  );

  expect(write).toBeCalledWith(
    "test/scripts/package.json",
    toJson({
      version: "1.2.3",
    }),
  );

  expect(write).toBeCalledWith(
    "test/modules/a/package.json",
    toJson({
      name: "a",
      version: "1.2.3",
    }),
  );

  expect(write).toBeCalledWith(
    "test/modules/b/package.json",
    toJson({
      name: "b",
      version: "1.2.3",
    }),
  );
});
