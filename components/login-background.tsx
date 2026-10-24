"use client"

import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"

export function LoginBackground() {
  const [loaded, setLoaded] = useState(false)

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 bg-background"
    >
      <Image
        src="/images/bglogin.webp"
        alt=""
        fill
        priority
        sizes="100vw"
        className={cn(
          "object-cover object-center transition-opacity duration-300 ease-out",
          loaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setLoaded(true)}
      />
    </div>
  )
}
