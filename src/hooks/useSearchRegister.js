import { useEffect } from "react";
import { SearchIndex } from "../lib/searchIndex";

// Registers `entries` under `source` whenever they change, so a view's search
// entries stay in sync with its data without every view re-implementing the
// same useEffect. Pass an empty array (not undefined) if there's nothing to
// register yet — that still clears any stale entries from a previous render.
export function useSearchRegister(source, entries) {
  useEffect(() => {
    if (entries) SearchIndex.register(source, entries);
  }, [source, entries]);
}
