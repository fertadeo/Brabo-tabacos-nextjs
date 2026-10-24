import { describe, it, expect } from "vitest"
import { nextIsActiveAfterStockChange } from "./product-stock-is-active"

const base = (over: Partial<{ stock: string; allow_backorders: string; is_active: string }> = {}) => ({
  stock: "4",
  allow_backorders: "0",
  is_active: "1",
  ...over,
})

describe("nextIsActiveAfterStockChange", () => {
  it("vacía el stock (equivale a 0) → inactivo sin encargo", () => {
    expect(nextIsActiveAfterStockChange(base({ stock: "4", is_active: "1" }), "")).toBe("0")
  })

  it("vuelve a poner stock > 0 tras vaciar → activo", () => {
    const trasVaciar = nextIsActiveAfterStockChange(base({ stock: "4" }), "")
    expect(trasVaciar).toBe("0")
    expect(
      nextIsActiveAfterStockChange(base({ stock: "", is_active: trasVaciar }), "4")
    ).toBe("1")
  })

  it("stock 0 explícito → inactivo", () => {
    expect(nextIsActiveAfterStockChange(base({ stock: "10" }), "0")).toBe("0")
  })

  it("con venta por encargo, stock 0 no fuerza inactivo", () => {
    expect(
      nextIsActiveAfterStockChange(
        base({ stock: "5", allow_backorders: "1", is_active: "1" }),
        "0"
      )
    ).toBe("1")
  })

  it("no reactiva si ya había stock > 0 y solo se cambia el número (p. ej. 10→20)", () => {
    expect(
      nextIsActiveAfterStockChange(base({ stock: "10", is_active: "0" }), "20")
    ).toBe("0")
  })
})
