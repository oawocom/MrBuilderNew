// Design tokens from the client's handoff (light + dark). Brand: #EF6820, Inter.
export const brand = { 25: "#FFFCF8", 50: "#FEF6EE", 100: "#FDEAD7", 200: "#F9DBAF", 300: "#F7B27A", 400: "#F38744", 500: "#EF6820", 600: "#E04F16", 700: "#B93815", 800: "#932F19", 900: "#772917" };

export const light = {
  bg: "#FAFAFA", surface: "#FFFFFF", surface2: "#F5F5F5", surface3: "#F0F0F1", hero: "#181D27",
  border: "#E9EAEB", border2: "#D5D7DA",
  text: "#181D27", text2: "#414651", text3: "#535862", text4: "#717680", text5: "#6B7280", textOnHero: "#FFFFFF",
  primary: brand[500], primaryPressed: brand[600], primarySoft: brand[50], primaryText: brand[700],
  ok: "#067647", okBg: "#ECFDF3", okBd: "#ABEFC6",
  warn: "#B54708", warnBg: "#FFFAEB", warnBd: "#FEDF89",
  err: "#B42318", errBg: "#FEF3F2", errBd: "#FECDCA",
  info: "#175CD3", infoBg: "#EFF4FF", infoBd: "#B2CCFF",
  orange: "#B93815", orangeBg: "#FEF6EE", orangeBd: "#F9DBAF",
};
export const dark: typeof light = {
  bg: "#0F1117", surface: "#181C25", surface2: "#232833", surface3: "#2A3040", hero: "#262C38",
  border: "#2A3040", border2: "#3A4152",
  text: "#F4F5F7", text2: "#D5D7DA", text3: "#B7BAC1", text4: "#9AA0AB", text5: "#A4A7AE", textOnHero: "#FFFFFF",
  primary: brand[500], primaryPressed: brand[400], primarySoft: "rgba(239,104,32,.16)", primaryText: "#F7A26B",
  ok: "#4ADE80", okBg: "rgba(7,148,85,.18)", okBd: "rgba(7,148,85,.45)",
  warn: "#FDB022", warnBg: "rgba(220,104,3,.16)", warnBd: "rgba(220,104,3,.45)",
  err: "#F97066", errBg: "rgba(217,45,32,.16)", errBd: "rgba(217,45,32,.45)",
  info: "#84ADFF", infoBg: "rgba(23,92,211,.2)", infoBd: "rgba(23,92,211,.5)",
  orange: "#F7A26B", orangeBg: "rgba(239,104,32,.16)", orangeBd: "rgba(239,104,32,.4)",
};
export type Palette = typeof light;

export const radius = { sm: 8, md: 10, lg: 12, xl: 16, pill: 999 };
export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const font = { regular: "Inter_400Regular", medium: "Inter_500Medium", semibold: "Inter_600SemiBold", bold: "Inter_700Bold" };
export const type = {
  display: { fontSize: 28, lineHeight: 34, fontFamily: font.bold },
  h1: { fontSize: 24, lineHeight: 30, fontFamily: font.semibold },
  h2: { fontSize: 20, lineHeight: 26, fontFamily: font.semibold },
  h3: { fontSize: 17, lineHeight: 22, fontFamily: font.semibold },
  body: { fontSize: 15, lineHeight: 21, fontFamily: font.regular },
  bodyMd: { fontSize: 15, lineHeight: 21, fontFamily: font.medium },
  small: { fontSize: 13, lineHeight: 18, fontFamily: font.regular },
  smallMd: { fontSize: 13, lineHeight: 18, fontFamily: font.medium },
  caption: { fontSize: 11, lineHeight: 14, fontFamily: font.medium },
};

export type Tone = "ok" | "warn" | "err" | "info" | "orange" | "neutral";
export const statusTone: Record<string, Tone> = {
  submitted: "neutral", inspection_booked: "info", inspection_done: "info", quote_generating: "neutral", quote_ready: "orange", quote_declined: "neutral",
  matching: "info", no_match_waitlist: "warn", assigned: "info", en_route: "info", arrived: "info", in_progress: "warn", paused_safety: "err",
  awaiting_confirmation: "orange", completed_paid: "ok", issue_reported: "err", dispute_open: "err", dispute_rejected: "warn", return_visit_scheduled: "warn",
  dispute_upheld: "ok", reassigning: "warn", cancelled_by_client: "neutral", cancelled_by_contractor: "neutral",
};
export const statusLabel: Record<string, { consumer: string; contractor: string }> = {
  submitted: { consumer: "Submitted", contractor: "New" }, inspection_booked: { consumer: "Inspection booked", contractor: "Inspection" }, inspection_done: { consumer: "Preparing quote", contractor: "Report sent" },
  quote_generating: { consumer: "Preparing quote", contractor: "Quoting" }, quote_ready: { consumer: "Quote ready", contractor: "Quote sent" }, quote_declined: { consumer: "Declined", contractor: "Declined" },
  matching: { consumer: "Finding a PRO", contractor: "Available" }, no_match_waitlist: { consumer: "Waitlisted", contractor: "Waitlisted" }, assigned: { consumer: "PRO assigned", contractor: "Scheduled" },
  en_route: { consumer: "PRO on the way", contractor: "On my way" }, arrived: { consumer: "PRO arrived", contractor: "Arrived" }, in_progress: { consumer: "In progress", contractor: "In progress" },
  paused_safety: { consumer: "Paused for safety", contractor: "Paused" }, awaiting_confirmation: { consumer: "Awaiting your confirmation", contractor: "Awaiting client confirmation" },
  completed_paid: { consumer: "Completed", contractor: "Paid" }, issue_reported: { consumer: "Issue reported", contractor: "Issue reported" }, dispute_open: { consumer: "Under review", contractor: "Disputed" },
  dispute_rejected: { consumer: "Return visit pending", contractor: "Fix required" }, return_visit_scheduled: { consumer: "Return visit scheduled", contractor: "Return visit" }, dispute_upheld: { consumer: "Completed", contractor: "Paid" },
  reassigning: { consumer: "Finding a new PRO", contractor: "Reassigning" }, cancelled_by_client: { consumer: "Cancelled", contractor: "Cancelled by client" }, cancelled_by_contractor: { consumer: "Cancelled", contractor: "Cancelled" },
};
