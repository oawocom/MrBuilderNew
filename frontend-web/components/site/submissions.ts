// Mirrors the client's submissions.js: same exports, but submit() posts to the MrBuilder API.
import { api } from "@/lib/api";
export const QUEUES: Record<string, string> = { contractor: "mrb.contractorWaitlist", consumer: "mrb.serviceRequestQueue", partner: "mrb.partnershipInquiries" };
export const APP_LINKS: Record<string, { ios: string; android: string }> = { consumer: { ios: "", android: "" }, contractor: { ios: "", android: "" } };
export function setAppLinks(l: Record<string, string> | undefined) {
  if (!l) return;
  APP_LINKS.consumer = { ios: l.consumer_ios || "", android: l.consumer_android || "" };
  APP_LINKS.contractor = { ios: l.contractor_ios || "", android: l.contractor_android || "" };
}
function readQueue(key: string): any[] { try { return JSON.parse(localStorage.getItem(key) || "[]"); } catch { return []; } }
function fingerprint(kind: string, rec: any) { return kind + "|" + (rec.email || "").trim().toLowerCase() + "|" + (rec.phone || "").replace(/\D/g, ""); }
export function isDuplicate(kind: string, rec: any) {
  const q = readQueue(QUEUES[kind]); const fp = fingerprint(kind, rec); const recent = Date.now() - 24 * 3600 * 1000;
  return q.some((r) => r.fingerprint === fp && new Date(r.submittedAt).getTime() > recent);
}
export async function submit(kind: string, data: any) {
  const rec = { ...data, kind, submittedAt: new Date().toISOString(), source: "website", fingerprint: fingerprint(kind, data) };
  await api("/leads", { method: "POST", body: rec });
  try { const key = QUEUES[kind]; const q = readQueue(key); q.push({ fingerprint: rec.fingerprint, submittedAt: rec.submittedAt }); localStorage.setItem(key, JSON.stringify(q)); } catch {}
  return { saved: true, remote: true };
}
