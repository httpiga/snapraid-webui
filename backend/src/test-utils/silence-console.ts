export function silenceConsole(methods: Array<"error" | "warn"> = ["error"]) {
  const originals = new Map<"error" | "warn", typeof console.error>()
  for (const method of methods) {
    originals.set(method, console[method])
    console[method] = () => {}
  }

  return () => {
    for (const [method, original] of originals.entries()) {
      console[method] = original
    }
  }
}
