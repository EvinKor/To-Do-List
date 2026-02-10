// supabase/appointments.js
import { sbGetList } from "./rest.js";
export async function getAppointments(env, clinicId) {
  if (!clinicId) throw new Error("Missing clinicId");
  return await sbGetList(env, "appointments", {
    select: "*",
    clinic_id: `eq.${clinicId}`,
    order: "date.asc,start_time.asc"
  });
}
