import { useEffect, useState } from "preact/hooks";
import { todayInSantiago } from "./booking-dates.ts";

/** Vacío hasta hidratar: una página estática nunca arrastra la fecha de su build. */
export function useSantiagoDate(): string {
  const [today, setToday] = useState("");

  useEffect(() => {
    const refresh = () => setToday(todayInSantiago());
    const resume = () => {
      if (document.visibilityState !== "hidden") refresh();
    };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, []);

  return today;
}
