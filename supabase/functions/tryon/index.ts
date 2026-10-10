// AI FIT 입혀 보기: 기본 캐릭터 + 상품 사진 → 그 옷을 입은 모습 (OpenAI 이미지 편집)
// 키는 Supabase Secrets 에만 둔다. 앱(GitHub Pages)에는 이 함수 주소와 공개용 anon 키만 들어간다.
import { createClient } from "npm:@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const MODEL = Deno.env.get("OPENAI_IMAGE_MODEL") ?? "gpt-image-1";
const QUALITY = Deno.env.get("OPENAI_IMAGE_QUALITY") ?? "medium";
const AVATAR_URL = Deno.env.get("AVATAR_URL") ?? "https://faraoh77777.github.io/work-fit-test/assets/avatar_default.jpg";
const DEV_LIMIT = Number(Deno.env.get("DAILY_LIMIT") ?? "5");
const GLOBAL_LIMIT = Number(Deno.env.get("GLOBAL_DAILY_LIMIT") ?? "100");
const ALLOWED = (Deno.env.get("ALLOWED_ORIGINS") ?? "https://faraoh77777.github.io,http://127.0.0.1:8765,http://localhost:8765").split(",");
const MAX_B64 = 7_000_000; // 상품 사진 base64 길이 상한(약 5MB)

const PROMPTS: Record<string, string> = {
  top: "Image 1 is a full-body photo of a woman standing. Image 2 is a product photo of a top. Edit image 1 so she wears exactly the top shown in image 2 (same color, collar, pattern, sleeve length and fit) instead of her current top.",
  bottom: "Image 1 is a full-body photo of a woman standing. Image 2 is a product photo of bottoms. Edit image 1 so she wears exactly the bottoms shown in image 2 (same color, length, cut and fit) instead of her current shorts.",
  shoe: "Image 1 is a full-body photo of a woman standing barefoot. Image 2 is a product photo of shoes. Edit image 1 so she wears exactly the shoes shown in image 2 (same color and design).",
};
const KEEP = " Keep her face, hair, pose, body proportions, the other clothing, the plain gray background and the framing unchanged. Photorealistic result. Do not add text, logos or accessories.";

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

function b64ToBlob(b64: string, type: string) {
  const bin = atob(b64), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  return new Blob([u], { type });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
  if (req.method !== "POST") return json(req, 405, { error: "POST 만 가능합니다." });
  if (!OPENAI_API_KEY) return json(req, 500, { error: "서버에 이미지 생성 키가 설정되지 않았습니다." });

  let body: { device?: string; cat?: string; garment?: string; mime?: string };
  try { body = await req.json(); } catch { return json(req, 400, { error: "요청 형식이 올바르지 않습니다." }); }
  const device = String(body.device ?? ""), cat = String(body.cat ?? "");
  let garment = String(body.garment ?? "");
  const m = garment.match(/^data:(image\/(?:jpeg|png|webp));base64,(.*)$/);
  let mime = "image/jpeg";
  if (m) { mime = m[1]; garment = m[2]; }
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(device)) return json(req, 400, { error: "기기 식별자가 올바르지 않습니다." });
  if (!PROMPTS[cat]) return json(req, 400, { error: "옷 종류가 올바르지 않습니다." });
  if (!garment || garment.length > MAX_B64) return json(req, 400, { error: "상품 사진이 없거나 너무 큽니다." });

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const take = await sb.rpc("tryon_take", { p_device: device, p_dev_limit: DEV_LIMIT, p_global_limit: GLOBAL_LIMIT });
  if (take.error) return json(req, 500, { error: "사용량 확인에 실패했습니다." });
  if (!take.data) return json(req, 429, { error: "오늘 입혀 보기 횟수를 모두 썼습니다. 내일 다시 이용해 주세요." });
  const refund = () => sb.rpc("tryon_refund", { p_device: device });

  try {
    const av = await fetch(AVATAR_URL);
    if (!av.ok) throw new Error("avatar");
    const avBlob = new Blob([await av.arrayBuffer()], { type: "image/jpeg" });

    const fd = new FormData();
    fd.append("model", MODEL);
    fd.append("prompt", PROMPTS[cat] + KEEP);
    fd.append("size", "1024x1536");
    fd.append("quality", QUALITY);
    fd.append("n", "1");
    fd.append("image[]", avBlob, "avatar.jpg");
    fd.append("image[]", b64ToBlob(garment, mime), "garment." + (mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg"));

    const r = await fetch("https://api.openai.com/v1/images/edits", { method: "POST", headers: { Authorization: "Bearer " + OPENAI_API_KEY }, body: fd });
    if (!r.ok) { console.error("openai", r.status, (await r.text()).slice(0, 300)); throw new Error("openai"); }
    const j = await r.json();
    const b64 = j?.data?.[0]?.b64_json;
    if (!b64) throw new Error("empty");
    return json(req, 200, { image: b64, mime: "image/png" });
  } catch (_e) {
    await refund();
    return json(req, 502, { error: "이미지를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요. (횟수는 차감되지 않았습니다)" });
  }
});
