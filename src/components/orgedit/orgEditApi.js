import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabaseClient } from "../../lib/supabaseClient";
import { QK } from "../hologram/orgQueries";

// ---- plain helpers, ported as-is ----

export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
export function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
}
export function newId(name) {
  return slugify(name) + "-" + Date.now().toString(36).slice(-4);
}

async function unwrap(promise) {
  const { error } = await promise;
  if (error) throw error;
}

// ---- division (update-only — the four divisions are fixed, no add/delete) ----

export function useSaveDivision() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => unwrap(supabaseClient.from("org_divisions").update(payload).eq("id", id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.divisions }),
  });
}

// ---- vertical / department ----

export function useSaveVertical() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mode, id, payload }) =>
      mode === "add"
        ? unwrap(supabaseClient.from("org_verticals").insert({ id: newId(payload.name), sort_order: Date.now() % 100000, ...payload }))
        : unwrap(supabaseClient.from("org_verticals").update(payload).eq("id", id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.verticals }),
  });
}

export function useDeleteVertical() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, hasFunctions }) => {
      if (hasFunctions) await unwrap(supabaseClient.from("org_functions").delete().eq("vertical", id));
      await unwrap(supabaseClient.from("org_verticals").delete().eq("id", id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.verticals });
      qc.invalidateQueries({ queryKey: QK.functions });
      qc.invalidateQueries({ queryKey: QK.connections });
    },
  });
}

// ---- function ----

export function useSaveFunction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mode, id, payload }) =>
      mode === "add"
        ? unwrap(supabaseClient.from("org_functions").insert({ id: newId(payload.label), sort_order: Date.now() % 100000, ...payload }))
        : unwrap(supabaseClient.from("org_functions").update(payload).eq("id", id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.functions }),
  });
}

export function useDeleteFunction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => unwrap(supabaseClient.from("org_functions").delete().eq("id", id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QK.functions });
      qc.invalidateQueries({ queryKey: QK.connections }); // any modeled connections to/from it go too
    },
  });
}

// ---- person ----

export function useSavePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ mode, id, payload }) =>
      mode === "add"
        ? unwrap(supabaseClient.from("org_people").insert({ id: newId(payload.name), sort_order: Date.now() % 100000, ...payload }))
        : unwrap(supabaseClient.from("org_people").update(payload).eq("id", id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.people }),
  });
}

export function useDeletePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }) => unwrap(supabaseClient.from("org_people").delete().eq("id", id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.people }),
  });
}

// ---- connections ----

export function useAddConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => unwrap(supabaseClient.from("org_connections").insert(payload)),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.connections }),
  });
}

export function useDeleteConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => unwrap(supabaseClient.from("org_connections").delete().eq("id", id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK.connections }),
  });
}
