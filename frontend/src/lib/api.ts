// ── Types ──────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  name: string;
  usn: string | null;
  email: string;
  role: "admin" | "coordinator" | "judge" | "student";
  target_group: number | null;
  is_active: boolean;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: string;
  user_id: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  target_groups: number[];
  target_branches?: string[] | null;
  event_type?: string | null;
  budget?: string | null;
  venue_permission_status?: "pending" | "approved" | string | null;
  judgment_criteria?: string | null;
  prizes?: string | null;
  concluding_remarks?: string | null;
  event_photos?: string[] | null;
  rules: string | null;
  location: string | null;
  event_date: string | null;
  max_participants: number | null;
  status: "draft" | "open" | "live" | "concluded";
  coordinator_id: string | null;
  coordinator: { id: string; name: string; email: string } | null;
  created_at: string;
  circular_url: string | null;
  poster_url: string | null;
}

export interface Registration {
  id?: string;
  registration_id?: string;
  student_id?: string;
  user_id?: string;
  student_name: string;
  name?: string;
  usn: string | null;
  registered_at: string;
  attended: boolean | null;
}

export interface MyRegistration {
  id: string;
  registration_id?: string;
  event_id: string;
  event_title: string;
  event_status: string;
  event_date: string | null;
  event_location?: string | null;
  attended: boolean | null;
  certificate_url: string | null;
  registered_at: string;
  team_name?: string | null;
  status?: string | null;
  attendance?: { is_present: boolean; check_in_time?: string | null } | null;
  certificate?: {
    id: string;
    cert_type: string;
    verification_code: string;
    issued_at: string;
    download_url?: string | null;
  } | null;
}

export interface CertificateVerification {
  valid: boolean;
  verification_code: string;
  cert_type: string;
  student_name: string;
  usn: string | null;
  event_title: string;
  event_date: string | null;
  issued_at: string;
  download_url?: string | null;
}

export interface FeedbackItem {
  id: string;
  event_id: string;
  user_id: string;
  user_name: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface EventFeedbackSummary {
  average_rating: number;
  count: number;
  feedbacks: FeedbackItem[];
}

// ── Storage helpers ────────────────────────────────────────────────────────────

const TOKEN_KEY = "token";
const USER_KEY  = "user_info";

export function saveAuth(token: string, user: User) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as User) : null;
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── Core fetch wrapper ─────────────────────────────────────────────────────────

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

type FetchOptions = Omit<RequestInit, "body"> & {
  body?: Record<string, unknown> | FormData | null;
  auth?: boolean;
};

export async function apiFetch<T = unknown>(
  path: string,
  options: FetchOptions = {}
): Promise<T> {
  const { auth = true, body, headers: extraHeaders = {}, ...rest } = options;
  const headers: Record<string, string> = { ...(extraHeaders as Record<string, string>) };

  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let fetchBody: RequestInit["body"] = undefined;
  if (body instanceof FormData) {
    fetchBody = body;
  } else if (body !== undefined && body !== null) {
    headers["Content-Type"] = "application/json";
    fetchBody = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, { headers, body: fetchBody, ...rest });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const j = await res.json();
      if (typeof j?.detail === "string") {
        detail = j.detail;
      } else if (Array.isArray(j?.detail)) {
        detail = j.detail
          .map((d: { msg?: string; message?: string }) => d?.msg || d?.message || JSON.stringify(d))
          .join("; ");
      } else if (typeof j?.message === "string") {
        detail = j.message;
      }
    } catch {}
    throw new Error(detail);
  }

  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) return res.json() as Promise<T>;
  return res as unknown as T;
}

// ── Auth ───────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<TokenResponse> {
  const data = await apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: { email, password } as unknown as Record<string, unknown>,
    auth: false,
  });
  return data;
}

export async function register(
  name: string,
  email: string,
  password: string,
  usn?: string,
  target_group?: number
): Promise<User> {
  return apiFetch<User>("/auth/register", {
    method: "POST",
    body: { name, email, password, usn, target_group } as unknown as Record<string, unknown>,
    auth: false,
  });
}

// ── Events ─────────────────────────────────────────────────────────────────────

export async function listEvents(): Promise<Event[]> {
  const token = getToken();
  return apiFetch<Event[]>("/events/", {
    auth: Boolean(token),
    cache: "no-store",
  });
}

export async function createEvent(
  data:
    | FormData
    | {
        title: string;
        description?: string | null;
        target_groups: number[];
        target_branches?: string[];
        event_type?: string | null;
        budget?: string | null;
        venue_permission_status?: string | null;
        judgment_criteria?: string | null;
        prizes?: string | null;
        rules?: string | null;
        location?: string | null;
        event_date?: string | null;
        max_participants?: number | null;
        status?: string | null;
        circular?: File | null;
        poster?: File | null;
      }
): Promise<Event> {
  if (data instanceof FormData) {
    if (!data.has("status")) {
      data.append("status", "open");
    }
    return apiFetch<Event>("/events/", {
      method: "POST",
      body: data,
    });
  }

  const fd = new FormData();
  fd.append("title", data.title);
  if (data.description) fd.append("description", data.description);
  fd.append("target_groups", JSON.stringify(data.target_groups.map(Number)));
  if (data.target_branches) fd.append("target_branches", JSON.stringify(data.target_branches));
  if (data.event_type) fd.append("event_type", data.event_type);
  if (data.budget) fd.append("budget", data.budget);
  if (data.venue_permission_status) fd.append("venue_permission_status", data.venue_permission_status);
  if (data.judgment_criteria) fd.append("judgment_criteria", data.judgment_criteria);
  if (data.prizes) fd.append("prizes", data.prizes);
  if (data.event_date) fd.append("event_date", data.event_date);
  if (data.location) fd.append("location", data.location);
  if (data.max_participants) fd.append("max_participants", String(data.max_participants));
  if (data.rules) fd.append("rules", data.rules);
  fd.append("status", data.status ?? "open");
  if (data.circular) fd.append("circular", data.circular);
  if (data.poster) fd.append("poster", data.poster);

  return apiFetch<Event>("/events/", {
    method: "POST",
    body: fd,
  });
}

export async function getEvent(id: string): Promise<Event> {
  const token = getToken();
  return apiFetch<Event>(`/events/${encodeURIComponent(id)}`, { auth: Boolean(token) });
}

export async function updateGuidelines(
  id: string,
  payload: {
    rules?: string;
    location?: string;
    max_participants?: number;
    event_type?: string;
    budget?: string;
    venue_permission_status?: string;
    judgment_criteria?: string;
    prizes?: string;
    concluding_remarks?: string;
  }
): Promise<Event> {
  return apiFetch<Event>(`/events/${encodeURIComponent(id)}/guidelines`, {
    method: "PATCH",
    body: payload as unknown as Record<string, unknown>,
  });
}

export async function updateEventStatus(id: string, status: string): Promise<Event> {
  return apiFetch<Event>(`/events/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    body: { status } as unknown as Record<string, unknown>,
  });
}

export async function uploadEventPhotos(
  eventId: string,
  files: File[]
): Promise<{ event_id: string; event_photos: string[] }> {
  const fd = new FormData();
  for (const file of files) {
    fd.append("photos", file);
  }
  return apiFetch<{ event_id: string; event_photos: string[] }>(`/events/${encodeURIComponent(eventId)}/photos`, {
    method: "POST",
    body: fd,
  });
}

export async function submitEventFeedback(
  eventId: string,
  payload: { rating: number; comment?: string }
): Promise<FeedbackItem> {
  return apiFetch<FeedbackItem>(`/events/${encodeURIComponent(eventId)}/feedback`, {
    method: "POST",
    body: payload as unknown as Record<string, unknown>,
  });
}

export async function getEventFeedback(eventId: string): Promise<EventFeedbackSummary> {
  return apiFetch<EventFeedbackSummary>(`/events/${encodeURIComponent(eventId)}/feedback`);
}

// ── Registrations ──────────────────────────────────────────────────────────────

export async function registerForEvent(eventId: string): Promise<unknown> {
  return apiFetch(`/events/${encodeURIComponent(eventId)}/registrations/`, {
    method: "POST",
    body: {},
  });
}

export async function getRegistrations(eventId: string): Promise<Registration[]> {
  const data = await apiFetch<Record<string, unknown>[]>(`/events/${encodeURIComponent(eventId)}/registrations/`);
  if (!Array.isArray(data)) return [];
  return data.map((r, idx) => {
    const regId = (r.id as string) ?? (r.registration_id as string) ?? `reg-${idx}`;
    return {
      id: regId,
      registration_id: regId,
      student_id: (r.student_id as string) ?? (r.user_id as string),
      user_id: (r.user_id as string) ?? (r.student_id as string),
      student_name: (r.student_name as string) ?? (r.name as string) ?? "Student",
      name: (r.name as string) ?? (r.student_name as string) ?? "Student",
      usn: (r.usn as string) ?? null,
      registered_at: (r.registered_at as string) ?? "",
      attended: typeof r.attended === "boolean" ? r.attended : null,
    };
  });
}

/** @deprecated use getRegistrations */
export const listRegistrations = getRegistrations;

export async function getMyRegistrations(): Promise<MyRegistration[]> {
  return apiFetch<MyRegistration[]>("/registrations/my");
}

export async function exportRegistrations(eventId: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${BASE}/events/${encodeURIComponent(eventId)}/registrations/export`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

// ── Conduction ─────────────────────────────────────────────────────────────────

export async function markAttendance(
  eventId: string,
  registration_ids: string[],
  is_present = true
): Promise<unknown> {
  return apiFetch(`/events/${encodeURIComponent(eventId)}/conduction/attendance`, {
    method: "POST",
    body: { registration_ids, is_present } as unknown as Record<string, unknown>,
  });
}

export async function submitJudgement(
  eventId: string,
  payload: {
    registration_id: string;
    score: number;
    remarks?: string;
    rank?: number;
    prize_details?: string;
  }
): Promise<unknown> {
  return apiFetch(`/events/${encodeURIComponent(eventId)}/conduction/judgement`, {
    method: "POST",
    body: payload as unknown as Record<string, unknown>,
  });
}

// ── Conclude ───────────────────────────────────────────────────────────────────

export async function generateCertificates(eventId: string): Promise<unknown> {
  return apiFetch(`/events/${encodeURIComponent(eventId)}/conclude/certificates/generate`, {
    method: "POST",
    body: {},
  });
}

export async function verifyCertificateByCode(code: string): Promise<CertificateVerification> {
  return apiFetch<CertificateVerification>(`/verify/${encodeURIComponent(code)}`, { auth: false });
}

export async function downloadReport(eventId: string): Promise<Blob> {
  const token = getToken();
  const res = await fetch(`${BASE}/events/${encodeURIComponent(eventId)}/conclude/report`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.blob();
}

// ── Utility ────────────────────────────────────────────────────────────────────

export function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_blank";
  a.rel = "noreferrer";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
