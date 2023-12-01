import { HonoPreact } from "./src/HonoPreact.tsx";
import { DefaultTranspiler } from "./src/Transpiler.ts";
import { ImportMap } from "./deps/emit.ts";
import { dirname, relative } from "./deps/path.ts";

export const replaceImportMapForBrowser = (importMap: ImportMap) => {
  for (const k in importMap.imports) {
    const value = importMap.imports[k];

    if (value.startsWith("npm:")) {
      importMap.imports[k] = value.replace(
        /^npm:\//,
        "https://cdn.skypack.dev/"
      );
    }
  }
};

export async function createHonoPreact(
  viewBase: string,
  urlBase: string,
  denoJsonPath: string
): Promise<HonoPreact> {
  const denoJson = JSON.parse(await Deno.readTextFile(denoJsonPath));

  let importMap: ImportMap;

  if (denoJson.importMap) {
    importMap = JSON.parse(
      await Deno.readTextFile(
        relative(dirname(denoJsonPath), denoJson.importMap)
      )
    );
  } else {
    importMap = {
      imports: denoJson.imports,
      scopes: denoJson.scopes,
    };
  }

  replaceImportMapForBrowser(importMap);

  const honoPreact = new HonoPreact(
    viewBase,
    urlBase,
    importMap,
    new DefaultTranspiler({
      importMap,
      compilerOptions: {
        jsxFactory: "h",
        jsxFragmentFactory: "Fragment",
      },
    })
  );

  await honoPreact.loadIslands();

  return honoPreact;
}
