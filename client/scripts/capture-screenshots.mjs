import { chromium, devices } from "playwright";

const eventId = process.env.EVENT_ID;
if (!eventId) throw new Error("EVENT_ID required for screen capture");
const hostOut = "/cursor/stores/self/media/voting-host.png";
const screenOut = "/cursor/stores/self/media/voting-screen.png";
const base = "http://localhost:5173";

const browser = await chromium.launch();
const iPhone = devices["iPhone 13"];

const hostCtx = await browser.newContext({
  ...iPhone,
  locale: "ru-RU",
});
const hostPage = await hostCtx.newPage();
await hostPage.goto(`${base}/`, { waitUntil: "networkidle" });
await hostPage.locator("vite-error-overlay").count().then(async (n) => {
  if (n) await hostPage.reload({ waitUntil: "networkidle" });
});
await hostPage.locator("button.health-btn").click({ force: true });
await hostPage.getByRole("button", { name: "Участники" }).waitFor({ timeout: 15000 });
await hostPage.getByPlaceholder("Имя").fill("Анна К.");
await hostPage.getByPlaceholder("Компания").first().fill("Alpha");
await hostPage.getByRole("button", { name: "Добавить" }).click();
await hostPage.getByText("Анна К.").waitFor({ timeout: 10000 });
await hostPage.getByRole("button", { name: "Таймеры" }).click();
await hostPage.getByText("Выступление").first().waitFor({ timeout: 10000 });
await hostPage.waitForTimeout(500);
await hostPage.screenshot({ path: hostOut, type: "png", fullPage: true });

const screenCtx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  locale: "ru-RU",
});
const screenPage = await screenCtx.newPage();
await screenPage.goto(`${base}/screen/${eventId}`, { waitUntil: "networkidle" });
await screenPage.getByRole("heading", { name: /Анна/ }).waitFor({ timeout: 15000 });
await screenPage.waitForTimeout(400);
await screenPage.screenshot({ path: screenOut, type: "png", fullPage: false });

await browser.close();
console.log("saved", hostOut, screenOut);