"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import App from "../../client/src/App";
import { HealthCanvas, HealthCard, HealthNavBar, HealthSection } from "../../client/src/ui/HealthLayout";

function FirstPaint() {
  const path = usePathname() ?? "/";
  if (path.startsWith("/live")) {
    return (
      <HealthCanvas wide>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-title-2 text-health-muted">Трансляция</p>
        </div>
      </HealthCanvas>
    );
  }
  if (path.startsWith("/screen")) {
    return (
      <HealthCanvas wide>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-title-2 text-health-muted">Экран зала</p>
        </div>
      </HealthCanvas>
    );
  }
  if (path.startsWith("/vote") || path.startsWith("/prep")) {
    return (
      <HealthCanvas>
        <div className="flex min-h-[60vh] items-center justify-center">
          <p className="text-title-2 text-health-muted">{path.startsWith("/vote") ? "Жюри" : "Спикер"}</p>
        </div>
      </HealthCanvas>
    );
  }
  return (
    <HealthCanvas laptop>
      <div className="mx-auto flex min-h-[80vh] w-full max-w-xl flex-col justify-center">
        <HealthNavBar eyebrow="Ведущий" title="Главный экран" />
        <div className="health-stack">
          <HealthCard className="space-y-3 text-left">
            <p className="text-callout text-health-muted">
              На этом телефоне события остаются. Можно выйти и открыть снова. На другом телефоне список свой.
            </p>
            <p className="text-subhead text-health-muted">Пока нет сохранённых событий</p>
          </HealthCard>
          <HealthCard className="space-y-5">
            <HealthSection label="Новое событие">
              <input className="health-input" defaultValue="День питчей" readOnly />
            </HealthSection>
            <button type="button" className="health-btn">
              Создать
            </button>
          </HealthCard>
        </div>
      </div>
    </HealthCanvas>
  );
}

export default function VotingApp() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  return <div id="root">{ready ? <App /> : <FirstPaint />}</div>;
}
