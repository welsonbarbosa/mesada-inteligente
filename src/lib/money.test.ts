import { describe, expect, it } from "vitest";
import { computeBalance, parseBRL } from "./money";
import { weekStart } from "./dates";

describe("parseBRL", () => {
  it("lê valores em reais como centavos", () => {
    expect(parseBRL("20")).toBe(2000);
    expect(parseBRL("20,5")).toBe(2050);
    expect(parseBRL("R$ 1.234,56")).toBe(123456);
    expect(parseBRL("3.50")).toBe(350);
  });
  it("rejeita entradas inválidas", () => {
    expect(parseBRL("abc")).toBeNull();
    expect(parseBRL("-5")).toBeNull();
    expect(parseBRL("1,234")).toBeNull();
  });
});

describe("computeBalance", () => {
  it("separa acumulado, pago, devido, reservado e disponível", () => {
    const b = computeBalance([
      { kind: "allowance", amount_cents: 2000 },
      { kind: "task_reward", amount_cents: 500 },
      { kind: "payment", amount_cents: 1000 },
      { kind: "reserve_add", amount_cents: 800 },
      { kind: "reserve_remove", amount_cents: 300 },
    ]);
    expect(b).toEqual({ earned: 2500, paid: 1000, owed: 1500, reserved: 500, available: 1000 });
  });
});

describe("weekStart", () => {
  it("semana começa na segunda-feira", () => {
    expect(weekStart("2026-10-25")).toBe("2026-10-19"); // domingo
    expect(weekStart("2026-10-26")).toBe("2026-10-26"); // segunda
  });
});
