"use client";

import { useEffect, useState } from "react";
import App from "../../client/src/App";

export default function VotingApp() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div id="root" />;
  return (
    <div id="root">
      <App />
    </div>
  );
}
