const BASE_URL = "https://api.frankfurter.dev/v2";
const CURRENCY_KEY = "moeda.currency-list.v2";
const RATE_PREFIX = "moeda.rate.v1:";
const CURRENCY_TTL = 604800000;
const RATE_TTL = 43200000;

export function createCurrencyProvider({
  fetchImpl = (...args) => fetch(...args),
  storage = (() => {
    try { return globalThis.localStorage; } catch { return null; }
  })(),
  now = () => Date.now(),
  setTimer = (...args) => setTimeout(...args),
  clearTimer = (id) => clearTimeout(id),
  timeoutMs = 10000,
} = {}) {
  function readCache(key, ttl = Infinity) {
    try {
      const value = JSON.parse(storage?.getItem(key));
      if (
        value &&
        Number.isFinite(value.savedAt) &&
        now() - value.savedAt <= ttl
      ) return value.data;
    } catch {}
    return null;
  }
  function writeCache(key, data) {
    try { storage?.setItem(key, JSON.stringify({ savedAt: now(), data })); } catch {}
  }
  async function json(url) {
    const controller = new AbortController();
    const timeout = setTimer(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) {
        let message;
        if (response.status === 429) message = "Muitas consultas seguidas, tente em alguns instantes.";
        else if (response.status === 404) message = "A API n\u00e3o possui cota\u00e7\u00e3o para este par.";
        else message = "A fonte de c\u00e2mbio respondeu com erro (" + response.status + ").";
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (error) {
      if (error.name === "AbortError") throw new Error("A consulta \u00e0 fonte excedeu o limite de 10 segundos.");
      throw error;
    } finally { clearTimer(timeout); }
  }
  function normalize(item) {
    const code = String(item.iso_code || item.currency || item.code || "").toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) return null;
    return { code, providerName: item.name || item.currency_name || code, providerSymbol: item.symbol || null };
  }
  return {
    name: "Frankfurter",
    async getCurrencies({ refresh = false } = {}) {
      if (!refresh) {
        const cached = readCache(CURRENCY_KEY, CURRENCY_TTL);
        if (Array.isArray(cached)) {
          const complete = cached.map(normalize).filter(Boolean);
          if (complete.length >= 50 && ["BRL", "USD", "EUR"].every((code) => complete.some((currency) => currency.code === code))) return complete;
        }
      }
      const payload = await json(BASE_URL + "/currencies");
      if (!Array.isArray(payload)) throw new Error("A lista de moedas retornou em formato inesperado.");
      const currencies = payload.map(normalize).filter(Boolean);
      if (!currencies.length) throw new Error("A fonte n\u00e3o retornou moedas dispon\u00edveis.");
      writeCache(CURRENCY_KEY, currencies);
      return currencies;
    },
    async getRate(from, to, { refresh = false } = {}) {
      const key = RATE_PREFIX + from + ":" + to;
      const isValid = (v) => v && Number.isFinite(v.rate) && v.rate > 0 && v.date && v.base === from && v.quote === to && v.fetchedAt;
      const fresh = !refresh ? readCache(key, RATE_TTL) : null;
      if (isValid(fresh)) return { ...fresh, cached: true };
      const stale = readCache(key, Infinity);
      try {
        const payload = await json(BASE_URL + "/rate/" + encodeURIComponent(from.toLowerCase()) + "/" + encodeURIComponent(to.toLowerCase()));
        const rate = Number(payload.rate);
        const base = String(payload.base || from).toUpperCase();
        const quote = String(payload.quote || to).toUpperCase();
        if (!Number.isFinite(rate) || rate <= 0 || !payload.date || base !== from || quote !== to) throw new Error("A resposta n\u00e3o cont\u00e9m uma taxa v\u00e1lida para este par.");
        const result = { rate, date: payload.date, base, quote, fetchedAt: new Date(now()).toISOString() };
        writeCache(key, result);
        return result;
      } catch (error) {
        if (isValid(stale) && !(error.status >= 400 && error.status < 500 && error.status !== 429)) return { ...stale, cached: true, stale: true };
        throw error;
      }
    },
  };
}

export const CurrencyProvider = createCurrencyProvider();
