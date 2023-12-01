import { createCache } from "https://deno.land/x/deno_cache@0.5.2/mod.ts";
import { transpile, CompilerOptions, ImportMap } from "../deps/emit.ts";

export interface TranspilerOptions {
  compilerOptions?: CompilerOptions;
  importMap?: ImportMap;
}

export interface Transpiler {
  transpile(url: URL): Promise<string>;
}

export class DefaultTranspiler implements Transpiler {
  private cache = createCache();
  constructor(private options: TranspilerOptions) {}

  transpile(url: URL) {
    return transpile(url, {
      ...this.options,
      load: async (specifier) => {
        if (URL.canParse(specifier)) {
          const url = new URL(specifier);

          if (url.protocol.startsWith("http")) {
            return {
              kind: "external",
              specifier: url.toString(),
            };
          }
        }

        return this.cache.load(specifier);
      },
    }).then((x) => x.get(url.href)!);
  }
}
