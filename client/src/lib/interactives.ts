import type { SavedEvent } from "./device";

export type InteractiveDoc = {
  id: string;
  title: string;
  audience: string;
  summary: string;
  link: (origin: string, event: SavedEvent | null) => string | null;
};

/** Банк интерактивов. Новая страница или роль добавляется сюда: название, кому, что делает, ссылка. */
export const INTERACTIVES: InteractiveDoc[] = [
  {
    id: "host",
    title: "Ведущий",
    audience: "Только организатор",
    summary:
      "Создаёт событие, ведёт список участников и раунд. Здесь таймеры в минутах и секундах и кнопка «Пропустить спикера». Ссылку ведущего можно открывать снова, она не для зала и не для жюри.",
    link: (origin, event) =>
      event
        ? `${origin}/#e=${encodeURIComponent(event.id)}&h=${encodeURIComponent(event.hostKey)}&v=${encodeURIComponent(event.voteKey)}`
        : origin + "/",
  },
  {
    id: "guest",
    title: "Жюри",
    audience: "Телефон жюри",
    summary:
      "Оценка с телефона по трём аспектам. Имя и компания запоминаются на этом телефоне. Ссылку можно скопировать и отправить лично, без QR.",
    link: (origin, event) =>
      event ? `${origin}/vote/${event.id}#k=${encodeURIComponent(event.voteKey)}` : null,
  },
  {
    id: "live",
    title: "Трансляция",
    audience: "Проектор и эфир",
    summary:
      "Один экран: кто выступает, часы, топ участников и имена тех, кто уже проголосовал. Имена в рамках. Если людей больше, чем места, остальные прячутся за «···».",
    link: (origin, event) => (event ? `${origin}/live/${event.id}` : null),
  },
  {
    id: "screen",
    title: "Экран зала",
    audience: "Проектор",
    summary:
      "Тот же зал, плюс кольцо среднего балла. Сам балл белый и стоит под кольцом, не на нём.",
    link: (origin, event) => (event ? `${origin}/screen/${event.id}` : null),
  },
  {
    id: "prep",
    title: "Ноутбук спикера",
    audience: "Выступающий",
    summary: "Экран перед спикером: его имя и время выступления. Оценки жюри здесь не показываются.",
    link: (origin, event) => (event ? `${origin}/prep/${event.id}` : null),
  },
];
