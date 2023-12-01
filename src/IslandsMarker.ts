import {
  ComponentType,
  Options,
  VNode,
  h,
  options as preactOptions,
} from "preact/";
import { IslandsManager } from "./IslandsManager.ts";

export interface IslandsOptions extends Options {
  __b?(node: VNode): void;
}

export interface MarkingContext {
  islandsNestLevel: number;
  patched: Set<ComponentType>;
}

export class IslandsMarker {
  constructor(
    private manager: IslandsManager,
    private options = preactOptions as IslandsOptions
  ) {}

  mark(fn: () => void): void {
    const oldDiffHook = this.options.__b;
    const oldDiffedHook = this.options.diffed;

    const ctx: MarkingContext = {
      islandsNestLevel: 0,
      patched: new Set(),
    };

    this.options.__b = this.diffHook(ctx, oldDiffHook);
    this.options.diffed = this.diffHook(ctx, oldDiffedHook);

    fn();

    this.options.diffed = oldDiffedHook;
    this.options.__b = oldDiffHook;
  }

  diffHook(
    ctx: MarkingContext,
    oldHook: IslandsOptions["__b"]
  ): IslandsOptions["__b"] {
    return (vnode) => {
      if (typeof vnode.type === "function" && !ctx.patched.has(vnode.type)) {
        const Component = vnode.type;
        const islands = this.manager.getIslands(Component);
        if (islands) {
          vnode.type = (props: any) => {
            return h(
              "hp-hydrate",
              {
                mod: islands.path,
                name: this.manager.getComponentExportName(islands, Component)!,
                props: JSON.stringify(props),
              } as {},
              h(Component, props)
            );
          };

          ctx.islandsNestLevel++;
          ctx.patched.add(Component);
        }
      }

      oldHook?.(vnode);
    };
  }

  diffedHook(
    ctx: MarkingContext,
    oldHook: IslandsOptions["diffed"]
  ): IslandsOptions["diffed"] {
    return (vnode) => {
      if (typeof vnode.type === "function") {
        const islands = this.manager.getIslands(vnode.type);
        if (islands) {
          ctx.islandsNestLevel--;
        }
      }

      oldHook?.(vnode);
    };
  }
}
