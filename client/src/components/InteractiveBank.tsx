import { useState } from "react";
import type { SavedEvent } from "../lib/device";
import { INTERACTIVES } from "../lib/interactives";
import { HealthCard } from "../ui/HealthLayout";

export function InteractiveBank({ creds }: { creds: SavedEvent | null }) {
  const [copied, setCopied] = useState("");
  const origin = window.location.origin;

  async function copyLink(id: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const area = document.createElement("textarea");
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand("copy");
      area.remove();
    }
    setCopied(id);
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 text-left">
      <p className="text-callout text-health-muted">
        Здесь лежат интерактивы этого приложения: что делает каждый и ссылка, которой им пользуются.
        {creds ? ` Сейчас открыто «${creds.title}».` : " Откройте событие, и у карточек появятся рабочие ссылки."}
      </p>
      {INTERACTIVES.map((item) => {
        const href = item.link(origin, creds);
        return (
          <HealthCard key={item.id} className="space-y-3">
            <div>
              <p className="health-section-label">{item.audience}</p>
              <h2 className="text-title-3 mt-1">{item.title}</h2>
            </div>
            <p className="text-callout text-health-muted">{item.summary}</p>
            {href ? (
              <>
                <p className="text-footnote break-all text-health-text">{href}</p>
                <button type="button" className="health-btn-secondary" onClick={() => void copyLink(item.id, href)}>
                  {copied === item.id ? "Ссылка скопирована" : "Скопировать ссылку"}
                </button>
              </>
            ) : (
              <p className="text-footnote text-health-muted">Ссылка появится, когда открыто событие.</p>
            )}
          </HealthCard>
        );
      })}
    </div>
  );
}
