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

export interface CollectorContext {
  modules: Set<string>;
}

export class IslandsCollector {
  constructor(
    private manager: IslandsManager,
    private options = preactOptions as IslandsOptions
  ) {}

  collect(fn: () => void): string[] {
    const oldDiffHook = this.options.__b;

    const ctx: CollectorContext = {
      modules: new Set(),
    };

    this.options.__b = this.diffHook(ctx, oldDiffHook);

    fn();

    this.options.__b = oldDiffHook;

    return [...ctx.modules];
  }

  diffHook(
    ctx: CollectorContext,
    oldHook: IslandsOptions["__b"]
  ): IslandsOptions["__b"] {
    return (vnode) => {
      if (typeof vnode.type === "function") {
        const Component = vnode.type;
        const islands = this.manager.getIslands(Component);
        if (islands) {
          ctx.modules.add(islands.path);
        }
      }

      oldHook?.(vnode);
    };
  }
}
