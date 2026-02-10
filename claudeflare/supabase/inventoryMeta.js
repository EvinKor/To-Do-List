import { sbGetList } from "./rest.js";

export async function getInventoryMetaByUserId(env, userId) {
  if (!userId) return [];
  return await sbGetList(env, "inventory_meta", {
    user_id: `eq.${userId}`,
    select: "*",
    limit: 1,
  });
}
