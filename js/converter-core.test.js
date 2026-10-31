import test from "node:test";
import assert from "node:assert/strict";
import { multiplyDecimal, normalizeAmount, swapCurrencies } from "./converter-core.js";

test("converte quantia usando a taxa real sem erro de ponto flutuante", () => {
  assert.equal(multiplyDecimal("100.00", "0.057123", 2), "5.71");
});
test("arredonda metade para cima na precisão da moeda", () => {
  assert.equal(multiplyDecimal("1.005", "1", 2), "1.01");
  assert.equal(multiplyDecimal("1.5", "1", 0), "2");
});
test("aceita zero e notação científica", () => {
  assert.equal(multiplyDecimal("0", "1.2345", 2), "0.00");
  assert.equal(multiplyDecimal("1e3", "0.25", 2), "250.00");
});
test("rejeita valores negativos e taxas inválidas", () => {
  assert.throws(() => multiplyDecimal("-1", "2", 2), /zero ou positivo/);
  assert.throws(
    () => multiplyDecimal("1", "0", 2),
    /taxa precisa ser positiva/,
  );
});
test("inverte as moedas de origem e destino", () => {
  assert.deepEqual(swapCurrencies("BRL", "EUR"), { from: "EUR", to: "BRL" });
});

test("normaliza valores pt-BR e rejeita entradas inv\u00e1lidas", () => {
  const cases = [
    ["1,5", "1.5"],
    ["1.234,56", "1234.56"],
    ["0.500", "0.500"],
    ["0.250", "0.250"],
    ["1.000", "1000"],
    ["12.345.678", "12345678"],
    ["1.005", "1005"],
    ["1,234.56", "1234.56"],
    ["0,0001", "0.0001"],
    ["1,2,3", ""],
    ["1.2.3", ""],
    ["0,500.50", ""],
    ["", ""],
  ];
  for (const [input, expected] of cases)
    assert.equal(normalizeAmount(input), expected, `entrada: ${input}`);
});
