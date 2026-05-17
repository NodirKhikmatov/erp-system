/** NestJS: `message` string | string[] | obyekt; validatsiya xatolari uchun `xabar`. */
export async function readApiErrorMessage(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text) as Record<string, unknown>;

    if (typeof j["xabar"] === "string" && j["xabar"].length > 0) {
      return j["xabar"];
    }

    const msg = j["message"];
    if (typeof msg === "string" && msg.length > 0) {
      return msg;
    }
    if (Array.isArray(msg)) {
      return msg.map(String).join(". ");
    }
    if (msg !== null && typeof msg === "object" && "xabar" in msg) {
      const inner = msg as { xabar?: unknown };
      if (typeof inner.xabar === "string" && inner.xabar.length > 0) {
        return inner.xabar;
      }
    }
  } catch {
    /* plain / empty body */
  }
  return res.statusText || "Error";
}
