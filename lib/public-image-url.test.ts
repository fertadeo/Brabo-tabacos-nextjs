import { describe, expect, it } from "vitest"
import { isBlockedIp, isPublicHttpImageUrl } from "./public-image-url"

describe("isPublicHttpImageUrl", () => {
  it("acepta una imagen pública https", () => {
    expect(isPublicHttpImageUrl("https://cdn.example.com/foto.jpg")?.hostname).toBe("cdn.example.com")
  })

  it("rechaza hosts locales y redes privadas", () => {
    expect(isPublicHttpImageUrl("http://localhost/foto.jpg")).toBeNull()
    expect(isPublicHttpImageUrl("http://127.0.0.1/foto.jpg")).toBeNull()
    expect(isPublicHttpImageUrl("http://192.168.1.8/foto.jpg")).toBeNull()
    expect(isPublicHttpImageUrl("http://10.0.0.5/foto.jpg")).toBeNull()
    expect(isBlockedIp("::ffff:127.0.0.1")).toBe(true)
  })
})
