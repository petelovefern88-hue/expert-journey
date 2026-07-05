// ✅ /components/Favorites.js — Hardened Watchlist (sync fix, live logos, weighted signal, loading/error states)
import { useState, useRef, useEffect, useCallback } from "react";

const LOGO_DOMAIN_MAP = {
  NVDA: "nvidia.com", AAPL: "apple.com", TSLA: "tesla.com", MSFT: "microsoft.com",
  AMZN: "amazon.com", META: "meta.com", GOOG: "google.com", AMD: "amd.com",
  INTC: "intel.com", PLTR: "palantir.com", IREN: "irisenergy.co", RXRX: "recursion.com",
  RR: "rolls-royce.com", AEHR: "aehr.com", SLDP: "solidpowerbattery.com",
  NRGV: "energyvault.com", BBAI: "bigbear.ai", NVO: "novonordisk.com", GWH: "esstech.com",
  COST: "costco.com", QUBT: "quantumcomputinginc.com", UNH: "uhc.com", EZGO: "ezgoev.com",
  QMCO: "quantum.com", LAC: "lithiumamericas.com",
};

const COMPANY_NAME_MAP = {
  NVDA: "NVIDIA Corp", AAPL: "Apple Inc.", TSLA: "Tesla Inc.", MSFT: "Microsoft Corp",
  AMZN: "Amazon.com Inc.", META: "Meta Platforms Inc.", GOOG: "Alphabet Inc.",
  AMD: "Advanced Micro Devices", INTC: "Intel Corp", PLTR: "Palantir Technologies",
  IREN: "Iris Energy Ltd", RXRX: "Recursion Pharmaceuticals", RR: "Rolls-Royce Holdings",
  AEHR: "Aehr Test Systems", SLDP: "Solid Power Inc", NRGV: "Energy Vault Holdings",
  BBAI: "BigBear.ai Holdings", NVO: "Novo Nordisk A/S", GWH: "ESS Tech Inc",
  COST: "Costco Wholesale Corp", QUBT: "Quantum Computing Inc", UNH: "UnitedHealth Group",
  EZGO: "EZGO Technologies", QMCO: "Quantum Corp", LAC: "Lithium Americas",
};

const FAVORITES_KEY = "favorites";
const CACHE_TTL_MS = 30_000; // don't re-hit the API for the same symbol within 30s

// Clearbit's logo API shut down — Google's favicon service is free and still live.
function logoUrl(sym) {
  const domain = LOGO_DOMAIN_MAP[sym] || `${sym.toLowerCase()}.com`;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
}

// Weighted signal instead of trend-only: RSI zone contributes too, so a stock
// in an "Uptrend" but deeply overbought doesn't get a blind "Buy".
function computeSignal({ rsi, trend }) {
  let score = 0;
  if (trend === "Uptrend") score += 40;
  if (trend === "Downtrend") score -= 40;
  if (typeof rsi === "number") {
    if (rsi >= 70) score -= (rsi - 70) * 1.5; // overbought fades the signal
    else if (rsi <= 30) score += (30 - rsi) * 1.0; // oversold, mild bullish
    else score += (rsi - 50) * 0.6;
  }
  if (score > 15) return "Buy";
  if (score < -15) return "Sell";
  return "Hold";
}

export default function Favorites({ favorites, setFavorites }) {
  const [data, setData] = useState({}); // symbol -> { ...fields, status }
  const [showModal, setShowModal] = useState(false);
  const [symbol, setSymbol] = useState("");
  const [modalError, setModalError] = useState("");
  const [imgError, setImgError] = useState({});
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const inFlight = useRef(new Set());
  const lastFetched = useRef({}); // symbol -> timestamp
  const abortControllers = useRef({});

  // ✅ Initialize from localStorage exactly once if parent didn't already hydrate favorites.
  useEffect(() => {
    if ((!favorites || favorites.length === 0) && typeof window !== "undefined") {
      try {
        const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
        if (stored.length > 0) setFavorites(stored);
      } catch {
        // corrupted localStorage — ignore and start fresh
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Keep localStorage as the single source of truth, always derived from `favorites` prop.
  useEffect(() => {
    if (typeof window !== "undefined" && favorites) {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    }
  }, [favorites]);

  const fetchStockData = useCallback(async (sym, { force = false } = {}) => {
    const now = Date.now();
    if (!force && lastFetched.current[sym] && now - lastFetched.current[sym] < CACHE_TTL_MS) {
      return; // still fresh, skip
    }
    if (inFlight.current.has(sym)) return; // already fetching this symbol
    inFlight.current.add(sym);

    abortControllers.current[sym]?.abort();
    const controller = new AbortController();
    abortControllers.current[sym] = controller;

    setData((prev) => ({
      ...prev,
      [sym]: { ...(prev[sym] || {}), status: "loading" },
    }));

    try {
      let price = 0, rsi = 50, trend = null, company = COMPANY_NAME_MAP[sym] || sym;

      try {
        const res = await fetch(`/api/visionary-core?symbol=${sym}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (res.ok) {
          const core = await res.json();
          price = core?.lastClose ?? 0;
          rsi = core?.rsi ?? 50;
          trend = core?.trend ?? null;
          company = core?.companyName || company;
        }
      } catch (e) {
        if (e.name === "AbortError") throw e;
      }

      if (!price || price <= 0) {
        try {
          const res2 = await fetch(`/api/visionary-infinite-core?symbol=${sym}`, {
            cache: "no-store",
            signal: controller.signal,
          });
          if (res2.ok) {
            const inf = await res2.json();
            price = inf?.lastClose ?? price;
            rsi = inf?.rsi ?? rsi;
            trend = trend || inf?.trend || null;
            company = company || inf?.companyName || sym;
          }
        } catch (e) {
          if (e.name === "AbortError") throw e;
        }
      }

      // derive trend from rsi only as a last resort, and only for signal purposes
      const effectiveTrend = trend || (rsi > 55 ? "Uptrend" : rsi < 45 ? "Downtrend" : "Sideway");
      const signal = computeSignal({ rsi, trend: effectiveTrend });
      const found = price > 0;

      lastFetched.current[sym] = Date.now();
      setData((prev) => ({
        ...prev,
        [sym]: {
          symbol: sym,
          companyName: company,
          lastClose: price,
          rsi,
          signal,
          status: found ? "ok" : "not_found",
        },
      }));
    } catch (err) {
      if (err.name !== "AbortError") {
        setData((prev) => ({
          ...prev,
          [sym]: { ...(prev[sym] || {}), symbol: sym, status: "error" },
        }));
      }
    } finally {
      inFlight.current.delete(sym);
    }
  }, []);

  useEffect(() => {
    if (favorites?.length > 0) favorites.forEach((sym) => fetchStockData(sym));
    return () => {
      Object.values(abortControllers.current).forEach((c) => c.abort());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [favorites]);

  const handleSubmit = async () => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;
    if (!/^[A-Z.]{1,10}$/.test(sym)) {
      setModalError("รูปแบบสัญลักษณ์ไม่ถูกต้อง");
      return;
    }
    if (favorites?.includes(sym)) {
      setModalError("มีในรายการโปรดอยู่แล้ว");
      return;
    }
    setModalError("");
    const updated = [...(favorites || []), sym];
    setFavorites(updated); // localStorage sync happens via the effect above
    await fetchStockData(sym, { force: true });

    const result = data[sym];
    if (result?.status === "not_found") {
      setModalError(`ไม่พบข้อมูลสำหรับ "${sym}"`);
    }
    setSymbol("");
    setShowModal(false);
  };

  const removeFavorite = (sym) => {
    const updated = favorites.filter((s) => s !== sym);
    setFavorites(updated); // localStorage sync happens via the effect above
    setData((prev) => {
      const next = { ...prev };
      delete next[sym];
      return next;
    });
  };

  const handleTouchStart = (e) => (touchStartX.current = e.targetTouches[0].clientX);
  const handleTouchMove = (e) => (touchEndX.current = e.targetTouches[0].clientX);
  const handleTouchEnd = (sym) => {
    if (!touchStartX.current || !touchEndX.current) return;
    const distance = touchStartX.current - touchEndX.current;
    if (distance > 70) removeFavorite(sym);
    touchStartX.current = null;
    touchEndX.current = null;
  };

  return (
    <section className="w-full px-[6px] sm:px-3 pt-3 bg-[#0b1220] text-gray-200 min-h-screen">
      <div className="flex justify-between items-center mb-3 px-[2px] sm:px-2">
        <h2 className="text-[17px] font-bold text-emerald-400 flex items-center gap-1">
          🔮 My Favorite Stocks
        </h2>
        <button
          onClick={() => setShowModal(true)}
          className="text-sm text-gray-300 hover:text-emerald-400 transition flex items-center gap-1 border border-gray-700 rounded-md px-3 py-[4px] bg-[#0f172a]/70 hover:bg-[#162032]"
        >
          ➕ Search
        </button>
      </div>

      <div className="flex flex-col divide-y divide-gray-800/50">
        {favorites?.length ? (
          favorites.map((sym) => {
            const r = data[sym];
            const companyName = r?.companyName || COMPANY_NAME_MAP[sym] || "";
            const loading = r?.status === "loading" || r?.status === undefined;
            const notFound = r?.status === "not_found";
            const hasError = r?.status === "error";

            return (
              <div
                key={sym}
                className="flex items-center justify-between py-[10px] px-[4px] sm:px-3 hover:bg-[#111827]/40 transition-all"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => handleTouchEnd(sym)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full border border-gray-700 flex items-center justify-center overflow-hidden bg-[#0f172a]">
                    {imgError[sym] ? (
                      <span className="text-white font-semibold text-[10px] uppercase tracking-tight">
                        {sym}
                      </span>
                    ) : (
                      <img
                        src={logoUrl(sym)}
                        alt={sym}
                        onError={() => setImgError((p) => ({ ...p, [sym]: true }))}
                        className="w-full h-full object-cover rounded-full"
                      />
                    )}
                  </div>
                  <div>
                    <a
                      href={`/analyze/${sym}`}
                      className="text-white hover:text-emerald-400 font-extrabold text-[15px]"
                    >
                      {sym}
                    </a>
                    <div className="text-[11px] text-gray-400 font-medium truncate max-w-[160px] leading-snug">
                      {notFound ? "ไม่พบข้อมูล" : hasError ? "โหลดล้มเหลว" : companyName}
                    </div>
                  </div>
                </div>

                <div className="text-right leading-tight font-mono min-w-[75px]">
                  {loading ? (
                    <div className="text-[12px] text-gray-500 animate-pulse">loading…</div>
                  ) : hasError ? (
                    <button
                      onClick={() => fetchStockData(sym, { force: true })}
                      className="text-[12px] text-red-400 hover:text-red-300 underline"
                    >
                      retry
                    </button>
                  ) : (
                    <>
                      <div className="text-[15px] text-white font-black">
                        {r?.lastClose > 0 ? `$${r.lastClose.toFixed(2)}` : "-"}
                      </div>
                      <div
                        className={`text-[13px] font-bold ${
                          r?.rsi > 70 ? "text-red-400" : r?.rsi < 40 ? "text-blue-400" : "text-emerald-400"
                        }`}
                      >
                        {r?.rsi ? Math.round(r.rsi) : "-"}
                      </div>
                      <div
                        className={`text-[13px] font-extrabold ${
                          r?.signal === "Buy"
                            ? "text-green-400"
                            : r?.signal === "Sell"
                            ? "text-red-400"
                            : "text-yellow-400"
                        }`}
                      >
                        {r?.signal || "-"}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-6 text-center text-gray-500 italic">
            No favorites yet. Add one by searching ➕
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-[#111827] rounded-2xl shadow-xl p-5 w-[80%] max-w-xs text-center border border-gray-700 -translate-y-14">
            <h3 className="text-lg text-emerald-400 font-bold mb-3">Search Stock</h3>
            <input
              type="text"
              value={symbol}
              onChange={(e) => {
                setSymbol(e.target.value);
                setModalError("");
              }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="พิมพ์ชื่อย่อหุ้น เช่น NVDA, TSLA"
              className="w-full text-center bg-[#0d121d]/90 border border-gray-700 text-gray-100 rounded-md py-[9px]
              focus:outline-none focus:ring-1 focus:ring-emerald-400 mb-2 text-[14px] font-semibold"
              autoFocus
            />
            {modalError && (
              <div className="text-[12px] text-red-400 mb-2">{modalError}</div>
            )}
            <div className="flex justify-around mt-2">
              <button
                onClick={() => {
                  setShowModal(false);
                  setModalError("");
                  setSymbol("");
                }}
                className="px-4 py-1.5 rounded-md text-gray-400 hover:text-gray-200 border border-gray-700 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-1.5 rounded-md bg-emerald-500/80 hover:bg-emerald-500 text-white font-bold text-sm"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
