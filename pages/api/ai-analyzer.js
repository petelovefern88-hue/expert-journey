// ✅ /pages/api/ai-analyzer.js
import fs from "fs";
import path from "path";

const SNAPSHOT_PATH = path.join(process.cwd(), "public", "market-snapshot.json");
const CACHE_TTL_MS = 30_000; // re-read the file at most once every 30s

let cache = { data: null, mtimeMs: 0, expiresAt: 0 };

// Coerce a value to a finite number, or fall back if it's missing/invalid.
function toNumber(val, fallback = 0) {
  const n = Number(val);
  return Number.isFinite(n) ? n : fallback;
}

// Keep only the fields the client actually needs, and make sure every
// record has safe defaults so a malformed snapshot entry can't crash sort/filter.
function sanitize(entry) {
  return {
    symbol: typeof entry?.symbol === "string" ? entry.symbol : "UNKNOWN",
    companyName: typeof entry?.companyName === "string" ? entry.companyName : "",
    lastClose: toNumber(entry?.lastClose, 0),
    rsi: toNumber(entry?.rsi, 50),
    aiConfidence: toNumber(entry?.aiConfidence, 0),
    signal: ["Buy", "Sell", "Hold"].includes(entry?.signal) ? entry.signal : "Hold",
  };
}

function loadSnapshot() {
  const stat = fs.statSync(SNAPSHOT_PATH);

  // Serve from cache if the file hasn't changed and the TTL hasn't expired.
  if (cache.data && stat.mtimeMs === cache.mtimeMs && Date.now() < cache.expiresAt) {
    return cache.data;
  }

  const raw = fs.readFileSync(SNAPSHOT_PATH, "utf8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("Snapshot file does not contain an array");
  }

  const data = parsed.map(sanitize);

  cache = { data, mtimeMs: stat.mtimeMs, expiresAt: Date.now() + CACHE_TTL_MS };
  return data;
}

export default function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

  if (!fs.existsSync(SNAPSHOT_PATH)) {
    return res.status(404).json({ error: "Snapshot not found" });
  }

  let data;
  try {
    data = loadSnapshot();
  } catch (err) {
    console.error("Failed to load market snapshot:", err);
    return res.status(500).json({ error: "Snapshot is unreadable or corrupted" });
  }

  try {
    const buys = data
      .filter((x) => x.signal === "Buy")
      .sort((a, b) => b.aiConfidence - a.aiConfidence)
      .slice(0, 20);

    const holds = data
      .filter((x) => x.signal === "Hold")
      .sort((a, b) => b.rsi - a.rsi)
      .slice(0, 20);

    const sells = data
      .filter((x) => x.signal === "Sell")
      .sort((a, b) => b.rsi - a.rsi)
      .slice(0, 20);

    // Cache at the HTTP layer too, so repeated requests within the TTL
    // don't even need to re-run the filter/sort logic on the edge/CDN.
    res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=60");

    return res.status(200).json({
      updated: new Date().toISOString(),
      total: data.length,
      buys,
      holds,
      sells,
    });
  } catch (err) {
    console.error("Failed to analyze market snapshot:", err);
    return res.status(500).json({ error: "Failed to analyze snapshot data" });
  }
}
