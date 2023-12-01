import { ComponentType } from "preact/";

export interface Islands {
  path: string;
  components: Set<ComponentType>;
  exportNameMap: Map<ComponentType, string>;
}

export class IslandsManager {
  private islandsMap = new Map<string | ComponentType, Islands>();
  constructor() {}

  async setIslands(modPath: string, module: Record<string, unknown>) {
    const islands: Islands = {
      path: modPath,
      components: new Set(),
      exportNameMap: new Map(),
    };

    this.islandsMap.set(modPath, islands);

    for (const key in module) {
      const value = module[key];

      if (typeof value === "function") {
        const component = value as ComponentType;
        this.islandsMap.set(component, islands);
        islands.components.add(component);
        islands.exportNameMap.set(component, key);
      }
    }

    return islands;
  }

  getComponentExportName(islands: Islands, component: ComponentType) {
    return islands.exportNameMap.get(component);
  }

  getIslands<K extends string | ComponentType>(key: K) {
    return this.islandsMap.get(key);
  }
}
