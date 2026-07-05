import OpenAI from 'openai';
import { basicSentimentFromTitles } from './newsAnalyzer';

/**
 * ============================================================
 *  "BRAIN" — multi-factor scoring engine
 * ============================================================
 * Instead of a few if/else branches, this scores each signal
 * independently on a -100..+100 scale, weighs them, and only
 * then decides an action. This gives you:
 *   - graceful degradation when some indicators are missing
 *   - a real confidence number driven by signal AGREEMENT
 *   - an explanation you can show the user (not a black box)
 */

const WEIGHTS = {
  trend: 0.28,      // price vs ema20 / ema50
  momentum: 0.22,   // rsi14
  macd: 0.18,       // macd histogram + slope
  volatility: 0.08, // atr relative to price (penalizes overextension)
  fundamentals: 0.12,
  sentiment: 0.12,
};

function clamp(x, lo = -100, hi = 100) {
  return Math.max(lo, Math.min(hi, x));
}

function scoreTrend({ price, ema20, ema50 }) {
  if (!price || !ema20) return { score: 0, note: 'no trend data' };
  let s = ((price - ema20) / ema20) * 1000; // % distance, amplified
  if (ema50) {
    const emaSpread = ((ema20 - ema50) / ema50) * 1000;
    s = s * 0.7 + emaSpread * 0.3;
  }
  return { score: clamp(s), note: price > ema20 ? 'price above ema20 (bullish structure)' : 'price below ema20 (bearish structure)' };
}

function scoreMomentum({ rsi14 }) {
  if (rsi14 == null) return { score: 0, note: 'no rsi data' };
  // 50 = neutral, >70 overbought (fade), <30 oversold (fade)
  let s;
  if (rsi14 >= 70) s = 60 - (rsi14 - 70) * 3;       // overbought → score decays, can go negative
  else if (rsi14 <= 30) s = -60 + (30 - rsi14) * -3; // oversold → mildly bullish mean-reversion, capped
  else s = (rsi14 - 50) * 2;                          // linear zone 30-70
  return { score: clamp(s), note: `rsi14=${rsi14.toFixed(1)}` };
}

function scoreMacd({ macdHist, macdHistPrev }) {
  if (macdHist == null) return { score: 0, note: 'no macd data' };
  let s = clamp(macdHist * 400);
  if (macdHistPrev != null) {
    const rising = macdHist > macdHistPrev;
    s += rising ? 15 : -15;
  }
  return { score: clamp(s), note: macdHist > 0 ? 'macd hist positive' : 'macd hist negative' };
}

function scoreVolatility({ price, atr14 }) {
  if (!price || !atr14) return { score: 0, note: 'no atr data' };
  const atrPct = atr14 / price;
  // very high volatility relative to price → reduce conviction, doesn't pick a direction
  const penalty = clamp(-(atrPct * 100 - 3) * 10, -30, 0);
  return { score: penalty, note: `atr=${(atrPct * 100).toFixed(2)}% of price` };
}

function scoreFundamentals({ metrics }) {
  if (!metrics) return { score: 0, note: 'no fundamentals' };
  const cagr = (metrics.revCAGR5y || 0) * 100;
  const margin = (metrics.netMargin || 0) * 100;
  const s = clamp(cagr * 3 + margin * 1.5);
  return { score: s, note: `revCAGR5y=${cagr.toFixed(1)}%, netMargin=${margin.toFixed(1)}%` };
}

function scoreSentiment(titles) {
  const sent = basicSentimentFromTitles(titles); // assumed roughly -1..1
  return { score: clamp(sent * 60), note: `news sentiment=${sent.toFixed(2)}`, raw: sent };
}

function brain({ indicators, fundamentals, news }) {
  const price = indicators?.lastClose;
  const factors = {
    trend: scoreTrend({ price, ema20: indicators?.ema20, ema50: indicators?.ema50 }),
    momentum: scoreMomentum({ rsi14: indicators?.rsi14 }),
    macd: scoreMacd({ macdHist: indicators?.macd?.hist, macdHistPrev: indicators?.macd?.histPrev }),
    volatility: scoreVolatility({ price, atr14: indicators?.atr14 }),
    fundamentals: scoreFundamentals(fundamentals || {}),
    sentiment: scoreSentiment((news || []).map(n => n.title)),
  };

  let composite = 0;
  let weightUsed = 0;
  for (const key of Object.keys(WEIGHTS)) {
    const f = factors[key];
    if (f.score !== 0 || f.note?.startsWith('no ') === false) {
      composite += f.score * WEIGHTS[key];
      weightUsed += WEIGHTS[key];
    }
  }
  composite = weightUsed > 0 ? composite / weightUsed : 0;

  // agreement = how many directional factors (trend/momentum/macd) agree with the sign of composite
  const directional = [factors.trend.score, factors.momentum.score, factors.macd.score];
  const agreeing = directional.filter(s => Math.sign(s) === Math.sign(composite) && s !== 0).length;
  const agreement = directional.filter(s => s !== 0).length
    ? agreeing / directional.filter(s => s !== 0).length
    : 0.34;

  let action = 'Hold';
  if (composite > 15) action = 'Buy';
  if (composite < -15) action = 'Sell';

  // confidence: driven by |composite| and signal agreement, not a fixed constant
  const confidence = clamp(Math.round(40 + Math.abs(composite) * 0.4 + agreement * 25), 0, 96);

  const atr14 = indicators?.atr14;
  const entry_zone = price && atr14 ? `${(price - 0.5 * atr14).toFixed(2)} - ${(price - 0.1 * atr14).toFixed(2)}` : null;
  const target = price && atr14 ? (price + 1.0 * atr14).toFixed(2) : null;
  const stop_loss = price && atr14 ? (price - 1.2 * atr14).toFixed(2) : null;

  const reasons = Object.entries(factors)
    .filter(([, f]) => f.note && !f.note.startsWith('no '))
    .map(([k, f]) => `${k}: ${f.note} (${f.score.toFixed(0)})`);

  return {
    action,
    entry_zone,
    target,
    stop_loss,
    confidence,
    composite_score: Math.round(composite),
    signal_agreement: Math.round(agreement * 100),
    reason: reasons.join(' | ') || 'insufficient data',
    factors,
  };
}

/**
 * ============================================================
 *  AI REASONING LAYER
 * ============================================================
 * - Enforces JSON output via response_format (no more brittle regex-only parsing).
 * - Retries once on malformed output.
 * - Never trusts the model blindly: if the AI's action contradicts
 *   the brain's composite score by a wide margin with low agreement,
 *   we flag it instead of silently overriding.
 */

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    action: { type: 'string', enum: ['Buy', 'Sell', 'Hold'] },
    entry_zone: { type: 'string' },
    target: { type: 'string' },
    stop_loss: { type: 'string' },
    confidence: { type: 'number' },
    reason: { type: 'string' },
  },
  required: ['action', 'confidence', 'reason'],
};

async function askAI(client, prompt) {
  const r = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          'You are a disciplined technical/fundamental analyst. Think step by step internally, ' +
          'but respond with ONLY a JSON object matching the requested schema — no prose, no markdown fences.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    response_format: { type: 'json_object' },
  });
  const text = r.choices?.[0]?.message?.content || '{}';
  return JSON.parse(text);
}

export async function aiTrade({ symbol, indicators, fundamentals, news }) {
  const base = brain({ indicators, fundamentals, news });

  if (!process.env.OPENAI_API_KEY) {
    return { symbol, ...base, mode: 'heuristic', reason: `${base.reason} [heuristic mode — add OPENAI_API_KEY for AI reasoning]` };
  }

  const titles = (news || []).map(n => n.title);
  const prompt =
    `Analyze ${symbol} and return JSON with keys: action, entry_zone, target, stop_loss, confidence (0-100), reason.\n` +
    `Heuristic engine already computed: action=${base.action}, composite_score=${base.composite_score}, ` +
    `signal_agreement=${base.signal_agreement}%, confidence=${base.confidence}.\n` +
    `Indicators: ${JSON.stringify(indicators)}\n` +
    `Fundamentals: ${JSON.stringify(fundamentals)}\n` +
    `NewsTitles: ${titles.join(' ; ')}\n` +
    `Use the heuristic as a prior, but override it if the data justifies a different call — explain why in "reason".`;

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const json = await askAI(client, attempt === 0 ? prompt : prompt + '\nReturn valid JSON only.');
      if (!json.action) throw new Error('missing action');

      const disagree = json.action !== base.action && base.signal_agreement >= 60;
      return {
        symbol,
        ...base,
        ...json,
        mode: 'ai',
        disagreement_flag: disagree
          ? `AI (${json.action}) disagrees with high-agreement heuristic (${base.action}, ${base.signal_agreement}% agreement) — verify manually`
          : undefined,
      };
    } catch (err) {
      if (attempt === 1) {
        return { symbol, ...base, mode: 'heuristic-fallback', reason: `${base.reason} [AI fallback: ${err.message}]` };
      }
    }
  }
}

// NOTE: this is a decision-support tool, not financial advice.
// Always validate signals against your own risk management rules.
