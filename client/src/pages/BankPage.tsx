import { InteractiveBank } from "../components/InteractiveBank";
import { hashCreds } from "../lib/device";
import { HealthCanvas, HealthNavBar } from "../ui/HealthLayout";

export function BankPage() {
  const creds = typeof window === "undefined" ? null : hashCreds();
  const back = creds
    ? `/#e=${encodeURIComponent(creds.id)}&h=${encodeURIComponent(creds.hostKey)}&v=${encodeURIComponent(creds.voteKey)}`
    : "/";
  return (
    <HealthCanvas laptop>
      <div className="mx-auto flex min-h-[80vh] w-full max-w-xl flex-col justify-center py-8">
        <HealthNavBar eyebrow="Документы" title="Банк интерактивов" />
        <a href={back} className="health-btn-secondary mb-4 self-start px-3 py-2 text-footnote">
          К ведущему
        </a>
        <InteractiveBank creds={creds} />
      </div>
    </HealthCanvas>
  );
}
