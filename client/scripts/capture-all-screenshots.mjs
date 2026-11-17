import { chromium, devices } from "playwright";
import { io } from "../node_modules/socket.io-client/build/esm/index.js";

const hostOut = "/cursor/stores/self/media/voting-host.png";
const guestOut = "/cursor/stores/self/media/voting-guest.png";
const screenOut = "/cursor/stores/self/media/voting-screen.png";
const base = "http://localhost:5173";
const api = "http://localhost:3001";

async function seedVotes(eventId) {
  const s = io(api, { transports: ["websocket"] });
  await new Promise((r) => s.once("connect", r));
  s.emit("join-event", { eventId, role: "host" });
  await new Promise((r) => s.once("event-state", r));
  s.emit("host:rating-timer", { eventId, action: "start" });
  await new Promise((r) => s.once("event-state", r));
  s.emit("guest:rate", { eventId, name: "Иван", company: "Beta", scores: [9, 8, 7] });
  await new Promise((r) => s.once("event-state", r));
  s.emit("guest:rate", { eventId, name: "Мария", company: "Gamma", scores: [8, 10, 9] });
  await new Promise((r) => s.once("event-state", r));
  s.emit("guest:rate", { eventId, name: "Олег", company: "Delta", scores: [9, 9, 10] });
  await new Promise((r) => s.once("event-state", r));
  s.close();
}

const browser = await chromium.launch();
const iPhone = devices["iPhone 13"];
const hostPage = await (await browser.newContext({ ...iPhone, locale: "ru-RU" })).newPage();
hostPage.setDefaultTimeout(30000);

await hostPage.goto(`${base}/`, { waitUntil: "domcontentloaded" });
await hostPage.locator("button.health-btn").click({ force: true });
await hostPage.getByRole("button", { name: "Участники" }).waitFor();

await hostPage.getByPlaceholder("Имя").fill("Анна К.");
await hostPage.getByPlaceholder("Компания").first().fill("Alpha");
await hostPage.getByRole("button", { name: "Добавить", exact: true }).click();
await hostPage.getByText("Анна К.", { exact: true }).first().waitFor();

await hostPage.getByRole("button", { name: "Раунд" }).click();
for (const [i, title] of ["Подача", "Содержание", "Убедительность"].entries()) {
  await hostPage.locator(`input[placeholder="Аспект ${i + 1}"]`).fill(title);
}
await hostPage.locator("select.health-select").selectOption({ label: "Анна К." });
await hostPage.getByRole("button", { name: "Начать раунд" }).click();
await hostPage.getByText("Сейчас в эфире").waitFor();

await hostPage.getByRole("button", { name: "Ссылки" }).click();
const urlText = await hostPage.locator("p.break-all").first().innerText();
const eventId = urlText.match(/\/vote\/([A-Za-z0-9_-]+)/)?.[1];
if (!eventId) throw new Error(`Event id not found in: ${urlText}`);

await seedVotes(eventId);

await hostPage.getByRole("button", { name: "Участники" }).click();
await hostPage.getByText("Подача").first().waitFor();
await hostPage.waitForTimeout(800);
await hostPage.screenshot({ path: hostOut, type: "png", fullPage: true });

const guestPage = await (await browser.newContext({ ...iPhone, locale: "ru-RU" })).newPage();
await guestPage.goto(`${base}/vote/${eventId}`, { waitUntil: "domcontentloaded" });
await guestPage.getByText("Три аспекта выступления").waitFor({ timeout: 30000 });
await guestPage.getByText("Подача").first().waitFor();
await guestPage.waitForTimeout(500);
await guestPage.screenshot({ path: guestOut, type: "png", fullPage: true });

const screenPage = await (
  await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: "ru-RU" })
).newPage();
await screenPage.goto(`${base}/screen/${eventId}`, { waitUntil: "domcontentloaded" });
await screenPage.getByText("Подача").first().waitFor();
await screenPage.waitForTimeout(500);
await screenPage.screenshot({ path: screenOut, type: "png", fullPage: false });

await browser.close();
console.log(JSON.stringify({ eventId, hostOut, guestOut, screenOut }));