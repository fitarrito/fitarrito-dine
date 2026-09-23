import { getSupabaseServerClient } from "@lib/getSupabaseServer";

export const supabase = new Proxy({} as ReturnType<typeof getSupabaseServerClient>, {
  get(_target, property) {
    const client = getSupabaseServerClient();
    const value = Reflect.get(client, property, client);

    return typeof value === "function" ? value.bind(client) : value;
  },
});
