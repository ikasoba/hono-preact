import { ComponentType, h, VNode } from "preact/";
import { extname, join, relative, resolve, toFileUrl } from "../deps/path.ts";
import { expandGlob } from "../deps/fs.ts";
import { MiddlewareHandler } from "hono/mod.ts";
import { IslandsManager } from "./IslandsManager.ts";
import { Transpiler } from "./Transpiler.ts";
import { IslandsCollector } from "./IslandsCollector.ts";
import { IslandsMarker } from "./IslandsMarker.ts";
import { renderToString } from "../deps/preact-render-to-string.ts";
import { ImportMap } from "../deps/emit.ts";

export class HonoPreact {
  private islandsManager = new IslandsManager();
  private collector = new IslandsCollector(this.islandsManager);
  private marker = new IslandsMarker(this.islandsManager);

  constructor(
    public viewBase: string,
    public urlBase: string,
    private importMap: ImportMap,
    private transpiler: Transpiler,
  ) {
    this.viewBase = resolve(viewBase);
    this.urlBase = urlBase.replace(/\/+$/, "");
  }

  async loadIslands() {
    for await (
      const islands of expandGlob("**/*.islands.{js,jsx,ts,tsx}", {
        root: this.viewBase,
      })
    ) {
      const name = new URL(
        join(this.urlBase, relative(this.viewBase, islands.path)),
        "https://example.com/",
      )
        .pathname;

      const module = await import(toFileUrl(islands.path).toString());

      await this.islandsManager.setIslands(name, module);
    }
  }

  render<P extends {}>(fn: (params: P) => VNode, params: P) {
    return new Response(this.renderToString(fn, params), {
      status: 200,
      headers: {
        "Content-Type": "text/html",
      },
    });
  }

  renderToString<P extends {}>(fn: (params: P) => VNode, params: P) {
    let vnode: VNode | undefined;
    let body = "";
    let islands: string[] = [];

    this.marker.mark(() => {
      islands = this.collector.collect(() => {
        vnode = fn(params);
        body = renderToString(vnode);
      });
    });

    return renderToString(
      <html>
        <head>
          <meta charset="utf-8" />
          <script
            type="importmap"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(this.importMap) }}
          >
          </script>
          {islands.map((path) => <link rel="modulepreload" href={path} />)}
          <script type="module" src={this.urlBase + "/@/hydrate"}>
          </script>
        </head>
        <body dangerouslySetInnerHTML={{ __html: body }} />
      </html>,
    );
  }

  middleware(): MiddlewareHandler {
    return async (ctx, next) => {
      if (!ctx.req.path.startsWith(this.urlBase)) return next();
      const path = ctx.req.path.slice(this.urlBase.length);
      const ext = extname(path);

      switch (path) {
        case "/@/hydrate": {
          const script = await this.transpiler.transpile(
            new URL(import.meta.resolve("./hydrate.ts")),
          );

          return ctx.body(script, 200, {
            "Content-Type": "application/javascript",
          });
        }

        case "/@/hydrator.ts": {
          const script = await this.transpiler.transpile(
            new URL(import.meta.resolve("./hydrator.ts")),
          );

          return ctx.body(script, 200, {
            "Content-Type": "application/javascript",
          });
        }
      }

      switch (ext) {
        case ".js":
        case ".jsx":
        case ".ts":
        case ".tsx": {
          const script = await this.transpiler.transpile(
            new URL(toFileUrl(join(this.viewBase, path))),
          );

          return ctx.body(script, 200, {
            "Content-Type": "application/javascript",
          });
        }

        default: {
          return next();
        }
      }
    };
  }
}
