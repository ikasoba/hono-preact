import { hydrate, h } from "preact/";

export function registerHydrator() {
  customElements.define(
    "hp-hydrate",
    class extends HTMLElement {
      constructor() {
        super();

        const modPath = this.getAttribute("mod")!;
        const name = this.getAttribute("name")!;
        const props = JSON.parse(this.getAttribute("props")!);

        (async () => {
          const module = await import(modPath);
          const Component = module[name];

          hydrate(h(Component, props), this);
        })();
      }
    }
  );
}
