/**
 * Registers happy-dom and Testing Library cleanup so component tests have a DOM.
 * Import this first in any test file that uses render() from @testing-library/react.
 */
import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { afterEach } from "bun:test"
import { cleanup } from "@testing-library/react"

if (typeof document === "undefined") {
  GlobalRegistrator.register()
}
afterEach(() => {
  cleanup()
})
