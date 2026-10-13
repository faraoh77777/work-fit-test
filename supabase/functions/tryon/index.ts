// AI FIT 입혀 보기: 기본 캐릭터 + 상품 사진 → 그 옷을 입은 모습
// 이미지 생성은 TopView API 를 쓴다. 키(TOPVIEW_UID, TOPVIEW_API_KEY)는 Supabase Secrets 에만 둔다.
import { createClient } from "npm:@supabase/supabase-js@2";

const TV_UID = (Deno.env.get("TOPVIEW_UID") ?? "").trim();
const TV_KEY = (Deno.env.get("TOPVIEW_API_KEY") ?? "").trim().replace(/^Bearer\s+/i, "");
const TV_MODEL = Deno.env.get("TOPVIEW_IMAGE_MODEL") ?? "GPT Image 2";
const TV_BASE = "https://api.topview.ai";
const AVATAR_URL = Deno.env.get("AVATAR_URL") ?? "https://faraoh77777.github.io/work-fit-test/assets/avatar_default.jpg";
const AVATAR_URL_MALE = Deno.env.get("AVATAR_URL_MALE") ?? "https://faraoh77777.github.io/work-fit-test/assets/avatar_male.jpg";
const DEV_LIMIT = Number(Deno.env.get("DAILY_LIMIT") ?? "5");
const GLOBAL_LIMIT = Number(Deno.env.get("GLOBAL_DAILY_LIMIT") ?? "100");
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://faraoh77777.github.io,http://127.0.0.1:8765,http://localhost:8765").split(",");
const MAX_B64 = 7_000_000; // 상품 사진 base64 길이 상한(약 5MB)
const MAX_AV_B64 = 4_000_000; // 내 아바타 base64 길이 상한(약 3MB)

const PROMPTS: Record<string, string> = {
  top: "Image 1 is a full-body photo of a woman standing. Image 2 is a product photo of a top. Edit image 1 so she wears exactly the top shown in image 2 (same color, collar, pattern, sleeve length and fit) instead of her current top.",
  bottom: "Image 1 is a full-body photo of a woman standing. Image 2 is a product photo of bottoms. Edit image 1 so she wears exactly the bottoms shown in image 2 (same color, length, cut and fit) instead of her current bottoms.",
  dress: "Image 1 is a full-body photo of a woman standing. Image 2 is a product photo of a dress. Edit image 1 so she wears exactly the dress shown in image 2 (same color, neckline, pattern, sleeve length, hem length and fit) instead of her current top and bottoms. She keeps her current shoes.",
  shoe: "Image 1 is a full-body photo of a woman standing barefoot. Image 2 is a product photo of shoes. Edit image 1 so she wears exactly the shoes shown in image 2 (same color and design).",
};
const KEEP = " Keep her face, hair, pose, body proportions, the other clothing, the plain gray background and the framing unchanged. Photorealistic result. Do not add text, logos or accessories.";

/* 내 아바타를 쓸 때: 몸은 한 픽셀도 바꾸지 말고 옷만 바꾼다(핏 확인용이라 체형이 달라지면 안 된다) */
const KEEP_BODY = " This is a fit-check: the person's body must stay IDENTICAL to image 1. Do NOT slim, widen, lengthen, reshape or retouch the body. Keep exactly the same height, head size, shoulder width, bust, waist, hip and thigh widths, arm and leg thickness and length, body silhouette, skin, face, hair, pose, hands, the plain background and the framing, pixel-aligned with image 1. Change ONLY the clothing item named above, and render it realistically at its true cut and fit on that unchanged body (tight where it is tight, loose where it is loose, do not tailor it to flatter the body). Keep every other garment as it is. Photorealistic result. Do not add text, logos or accessories.";

function toMale(t: string, male: boolean) {
  return male ? t.replace(/a woman/g, "a man").replace(/she/g, "he").replace(/her/g, "his") : t;
}

function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED.includes(o) ? o : ALLOWED[0],
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
const json = (req: Request, status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "Content-Type": "application/json" } });

function b64ToBytes(b64: string) {
  const bin = atob(b64), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return u;
}
function bytesToB64(u: Uint8Array) {
  let s = ""; const step = 0x8000;
  for (let i = 0; i < u.length; i += step) s += String.fromCharCode(...u.subarray(i, i + step));
  return btoa(s);
}

/* ---------------- TopView ---------------- */
const tvHeaders = () => ({ "Topview-Uid": TV_UID, Authorization: "Bearer " + TV_KEY });
async function tvGet(path: string, params: Record<string, string>) {
  const r = await fetch(TV_BASE + path + "?" + new URLSearchParams(params), { headers: tvHeaders() });
  const d = await r.json();
  if (!r.ok || String(d.code ?? "") !== "200") throw new Error("topview get " + path + " " + r.status + " " + JSON.stringify(d).slice(0, 300));
  return d.result ?? d;
}
async function tvPost(path: string, body: unknown) {
  const r = await fetch(TV_BASE + path, { method: "POST", headers: { ...tvHeaders(), "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = await r.json();
  if (!r.ok || String(d.code ?? "") !== "200") throw new Error("topview post " + path + " " + r.status + " " + JSON.stringify(d).slice(0, 300));
  return d.result ?? d;
}
async function tvUpload(bytes: Uint8Array, ext: string, mime: string) {
  const cred = await tvGet("/v1/upload/credential", { format: ext, needAccelerateUrl: "" });
  const put = await fetch(cred.uploadUrl, { method: "PUT", headers: { "Content-Type": mime }, body: bytes });
  if (!put.ok) throw new Error("topview put " + put.status);
  const chk = await tvGet("/v1/upload/check", { fileId: cred.fileId });
  if (chk !== true && String(chk) !== "true") throw new Error("topview upload check failed");
  return String(cred.fileId);
}
function findImageUrl(o: unknown): string {
  if (!o) return "";
  if (typeof o === "string") return /^https?:\/\/\S+/.test(o) && /(\.(png|jpe?g|webp)(\?|$)|filePath)/i.test(o) ? o : "";
  if (Array.isArray(o)) { for (const x of o) { const u = findImageUrl(x); if (u) return u; } return ""; }
  if (typeof o === "object") {
    const rec = o as Record<string, unknown>;
    for (const k of ["filePath", "url", "imageUrl", "fileUrl"]) { const v = rec[k]; if (typeof v === "string" && /^https?:\/\//.test(v)) return v; }
    for (const v of Object.values(rec)) { const u = findImageUrl(v); if (u) return u; }
  }
  return "";
}
/* 접수: 사진 두 장을 올리고 편집 요청만 보낸 뒤 번호(taskId)를 돌려준다. 오래 붙잡지 않는다 */
async function submitTopview(male: boolean, cat: string, garmentBytes: Uint8Array, garmentExt: string, garmentMime: string, myAvatar?: Uint8Array) {
  let avBytes = myAvatar;
  if (!avBytes) { // 내 아바타가 없으면 기본 캐릭터
    const av = await fetch(male ? AVATAR_URL_MALE : AVATAR_URL);
    if (!av.ok) throw new Error("avatar");
    avBytes = new Uint8Array(await av.arrayBuffer());
  }
  const [avId, gId] = await Promise.all([tvUpload(avBytes, "jpg", "image/jpeg"), tvUpload(garmentBytes, garmentExt, garmentMime)]);
  const sub = await tvPost("/v1/common_task/image_edit/task/submit", {
    model: TV_MODEL, prompt: toMale(PROMPTS[cat] + (myAvatar ? KEEP_BODY : KEEP), male), aspectRatio: "9:16", resolution: "1K", generateCount: 1, inputImageFileIds: [avId, gId],
  });
  const taskId = sub.taskId;
  if (!taskId) throw new Error("topview no taskId " + JSON.stringify(sub).slice(0, 200));
  return String(taskId);
}
/* 확인: 끝났으면 이미지를 받아 돌려주고, 아니면 진행 중/실패만 알려 준다 */
async function statusTopview(taskId: string) {
  const q = await tvGet("/v1/common_task/image_edit/task/query", { taskId });
  const st = String(q.status ?? "").toLowerCase();
  if (st === "success") {
    const url = findImageUrl(q);
    if (!url) throw new Error("topview no image url " + JSON.stringify(q).slice(0, 300));
    const img = await fetch(url);
    if (!img.ok) throw new Error("topview download " + img.status);
    const mime = img.headers.get("content-type")?.split(";")[0] || "image/png";
    return { status: "success", image: bytesToB64(new Uint8Array(await img.arrayBuffer())), mime };
  }
  if (st === "failed" || st === "fail") return { status: "failed", error: String(q.errorMsg ?? "") };
  return { status: "processing" };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { error: "POST 만 가능합니다." });
  if (!(TV_UID && TV_KEY)) return json(req, 500, { error: "서버에 이미지 생성 키가 설정되지 않았습니다." });

  let body: { action?: string; taskId?: string; device?: string; cat?: string; garment?: string; gender?: string; avatar?: string };
  try { body = await req.json(); } catch { return json(req, 400, { error: "요청 형식이 올바르지 않습니다." }); }
  if (body.action === "status") {
    const tid = String(body.taskId ?? "");
    if (!/^[A-Za-z0-9_-]{8,128}$/.test(tid)) return json(req, 400, { error: "작업 번호가 올바르지 않습니다." });
    try { return json(req, 200, await statusTopview(tid)); }
    catch (e) { console.error("status failed:", (e as Error).message); return json(req, 502, { error: "진행 상태를 확인하지 못했습니다." }); }
  }
  const device = String(body.device ?? ""), cat = String(body.cat ?? "");
  let garment = String(body.garment ?? "");
  const m = garment.match(/^data:(image\/(?:jpeg|png|webp));base64,(.*)$/);
  let mime = "image/jpeg";
  if (m) { mime = m[1]; garment = m[2]; }
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(device)) return json(req, 400, { error: "기기 식별자가 올바르지 않습니다." });
  if (!PROMPTS[cat]) return json(req, 400, { error: "옷 종류가 올바르지 않습니다." });
  if (!garment || garment.length > MAX_B64) return json(req, 400, { error: "상품 사진이 없거나 너무 큽니다." });
  let myAv = String(body.avatar ?? "");
  const am = myAv.match(/^data:image\/jpeg;base64,(.*)$/);
  if (am) myAv = am[1];
  if (myAv && (!am || myAv.length > MAX_AV_B64)) return json(req, 400, { error: "아바타 이미지가 올바르지 않거나 너무 큽니다." });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  // 30일이 지난 이용 기록은 지운다(개인정보처리방침의 보관 기간)
  await sb.from("tryon_usage").delete().lt("day", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const take = await sb.rpc("tryon_take", { p_device: device, p_dev_limit: DEV_LIMIT, p_global_limit: GLOBAL_LIMIT });
  if (take.error) return json(req, 500, { error: "사용량 확인에 실패했습니다." });
  if (!take.data) return json(req, 429, { error: "오늘 입혀 보기 횟수를 모두 썼습니다. 내일 다시 이용해 주세요." });

  try {
    const bytes = b64ToBytes(garment);
    const taskId = await submitTopview(body.gender === "male", cat, bytes, ext, mime, myAv ? b64ToBytes(myAv) : undefined);
    return json(req, 200, { taskId });
  } catch (e) {
    console.error("submit failed:", (e as Error).message);
    await sb.rpc("tryon_refund", { p_device: device });
    return json(req, 502, { error: "요청을 접수하지 못했습니다. 잠시 뒤 다시 시도해 주세요. (횟수는 차감되지 않았습니다)" });
  }
});
