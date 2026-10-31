/* Camada de dados intercambiável: a interface depende somente deste adaptador. */
(() => {
  const BASE_URL = "https://api.frankfurter.dev/v2",
    CURRENCY_KEY = "moeda.currency-list.v2",
    RATE_PREFIX = "moeda.rate.v1:",
    CURRENCY_TTL = 604800000,
    RATE_TTL = 43200000;
  function readCache(key, ttl) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      if (value && Date.now() - value.savedAt < ttl) return value.data;
    } catch {}
    return null;
  }
  function writeCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
    } catch {}
  }
  async function json(url) {
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(url, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) {
        const error = new Error(
          response.status === 404
            ? "A API n\u00e3o possui cota\u00e7\u00e3o para este par."
            : "A fonte de c\u00e2mbio respondeu com erro (" +
              response.status +
              ").",
        );
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (error) {
      if (error.name === "AbortError")
        throw new Error(
          "A consulta \u00e0 fonte excedeu o limite de 10 segundos.",
        );
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  function normalize(item) {
    const code = String(
      item.iso_code || item.currency || item.code || "",
    ).toUpperCase();
    if (!/^[A-Z]{3}$/.test(code)) return null;
    return {
      code,
      providerName: item.name || item.currency_name || code,
      providerSymbol: item.symbol || null,
    };
  }
  window.CurrencyProvider = {
    name: "Frankfurter",
    async getCurrencies({ refresh = false } = {}) {
      if (!refresh) {
        const cached = readCache(CURRENCY_KEY, CURRENCY_TTL);
        if (Array.isArray(cached)) {
          const complete = cached.map(normalize).filter(Boolean);
          if (
            complete.length >= 50 &&
            ["BRL", "USD", "EUR"].every((code) =>
              complete.some((currency) => currency.code === code),
            )
          )
            return complete;
        }
      }
      const payload = await json(BASE_URL + "/currencies");
      if (!Array.isArray(payload))
        throw new Error("A lista de moedas retornou em formato inesperado.");
      const currencies = payload.map(normalize).filter(Boolean);
      if (!currencies.length)
        throw new Error("A fonte não retornou moedas disponíveis.");
      writeCache(CURRENCY_KEY, currencies);
      return currencies;
    },
    async getRate(from, to, { refresh = false } = {}) {
      const key = RATE_PREFIX + from + ":" + to;
      if (!refresh) {
        const cached = readCache(key, RATE_TTL);
        if (cached && Number.isFinite(cached.rate) && cached.date)
          return { ...cached, cached: true };
      }
      const payload = await json(
        BASE_URL +
          "/rate/" +
          encodeURIComponent(from.toLowerCase()) +
          "/" +
          encodeURIComponent(to.toLowerCase()),
      );
      const rate = Number(payload.rate),
        base = String(payload.base || from).toUpperCase(),
        quote = String(payload.quote || to).toUpperCase();
      if (
        !Number.isFinite(rate) ||
        rate <= 0 ||
        !payload.date ||
        base !== from.toUpperCase() ||
        quote !== to.toUpperCase()
      )
        throw new Error("A resposta não contém uma taxa válida para este par.");
      const result = {
        rate,
        date: payload.date,
        base,
        quote,
        fetchedAt: new Date().toISOString(),
      };
      writeCache(key, result);
      return result;
    },
  };
})();
