import { Hono } from "hono/mod.ts";
import { createHonoPreact } from "../mod.ts";
import { Counter } from "./view/Counter.islands.tsx";

const app = new Hono();
const honoPreact = await createHonoPreact("./view", "/", "deno.json");

app.use("*", honoPreact.middleware());

app.get("/", () => {
  return honoPreact.render(() => <Counter />, {});
});

Deno.serve({
  port: 4000,
}, app.fetch);
