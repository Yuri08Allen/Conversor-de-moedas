import test from "node:test";
import assert from "node:assert/strict";
import { createCurrencyProvider } from "./provider.js";

function fixture(fetchImpl) {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  let time = Date.parse("2026-10-30T12:00:00Z");
  const provider = createCurrencyProvider({ fetchImpl, storage, now: () => time });
  return { provider, values, advance: (ms) => { time += ms; } };
}
const response = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
const rate = { rate: 5.4, date: "2026-10-29", base: "BRL", quote: "USD" };

test("retorna taxa fresca do cache sem consultar a rede", async () => {
  let calls = 0;
  const f = fixture(async () => { calls++; return response(200, rate); });
  const first = await f.provider.getRate("BRL", "USD");
  const second = await f.provider.getRate("BRL", "USD");
  assert.equal(first.rate, 5.4);
  assert.equal(second.cached, true);
  assert.equal(calls, 1);
});

test("taxa expirada atualiza com sucesso", async () => {
  let calls = 0;
  const f = fixture(async () => { calls++; return response(200, { ...rate, rate: 5.5 }); });
  await f.provider.getRate("BRL", "USD");
  f.advance(43200001);
  const renewed = await f.provider.getRate("BRL", "USD");
  assert.equal(renewed.rate, 5.5);
  assert.equal(renewed.stale, undefined);
  assert.equal(calls, 2);
});

test("usa taxa antiga como stale-if-error quando a rede falha", async () => {
  let online = true;
  const f = fixture(async () => {
    if (!online) throw new TypeError("Failed to fetch");
    return response(200, rate);
  });
  const original = await f.provider.getRate("BRL", "USD");
  f.advance(43200001);
  online = false;
  const stale = await f.provider.getRate("BRL", "USD");
  assert.equal(stale.rate, original.rate);
  assert.equal(stale.stale, true);
  assert.equal(stale.cached, true);
});

test("preserva mensagem de rate limit mesmo com taxa antiga", async () => {
  let status = 200;
  const f = fixture(async () => response(status, rate));
  await f.provider.getRate("BRL", "USD");
  f.advance(43200001);
  status = 429;
  const stale = await f.provider.getRate("BRL", "USD");
  assert.equal(stale.stale, true);
  const empty = fixture(async () => response(429, {}));
  await assert.rejects(empty.provider.getRate("EUR", "JPY"), /Muitas consultas seguidas/);
});

test("nao usa taxa antiga se o par for invalido (404)", async () => {
  let status = 200;
  const f = fixture(async () => response(status, rate));
  await f.provider.getRate("BRL", "USD");
  f.advance(43200001);
  status = 404;
  await assert.rejects(f.provider.getRate("BRL", "USD"), /API/);
});
