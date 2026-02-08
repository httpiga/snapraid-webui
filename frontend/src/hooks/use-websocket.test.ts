import "@/test-setup"
import { describe, test, expect, beforeEach, afterEach } from "bun:test"
import { renderHook, act } from "@testing-library/react"
import { useWebSocket } from "./use-websocket"

const CONNECTING = 0
const OPEN = 1
const CLOSED = 2

let lastMockInstance: MockWebSocket | null = null

class MockWebSocket {
  static readonly CONNECTING = CONNECTING
  static readonly OPEN = OPEN
  static readonly CLOSED = CLOSED

  readyState = CONNECTING
  onopen: (() => void) | null = null
  onmessage: ((event: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: (() => void) | null = null

  sent: string[] = []

  constructor(public url: string) {
    lastMockInstance = this
  }

  send(data: string) {
    this.sent.push(data)
  }

  close() {
    this.readyState = CLOSED
    this.onclose?.()
  }
}

describe("useWebSocket", () => {
  const originalWebSocket = globalThis.WebSocket
  const originalLocation = window.location

  beforeEach(() => {
    lastMockInstance = null
    // @ts-expect-error replace WebSocket for testing
    globalThis.WebSocket = MockWebSocket
    Object.defineProperty(window, "location", {
      value: { protocol: "http:", host: "localhost:3000" },
      writable: true,
    })
  })

  afterEach(() => {
    // @ts-expect-error restore
    globalThis.WebSocket = originalWebSocket
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    })
  })

  test("connect sets isConnected when socket opens", () => {
    const { result } = renderHook(() => useWebSocket())

    act(() => {
      result.current.connect()
    })

    const ws = lastMockInstance
    expect(ws).not.toBeNull()
    expect(ws!.url).toBe("ws://localhost:3000/ws")

    act(() => {
      ws!.readyState = OPEN
      ws!.onopen?.()
    })

    expect(result.current.isConnected).toBe(true)
  })

  test("output message appends to output and calls onOutput", () => {
    const onOutputSpy = (() => {
      let calls: string[] = []
      const fn = (chunk: string) => {
        calls.push(chunk)
      }
      fn.calls = () => calls
      return fn
    })()

    const { result } = renderHook(() =>
      useWebSocket({ onOutput: onOutputSpy }),
    )

    act(() => {
      result.current.connect()
    })
    const ws = lastMockInstance!
    act(() => {
      ws.readyState = OPEN
      ws.onopen?.()
    })

    act(() => {
      ws.onmessage?.({
        data: JSON.stringify({ type: "output", chunk: "line1\n" }),
      })
    })
    expect(result.current.output).toBe("line1\n")

    act(() => {
      ws.onmessage?.({
        data: JSON.stringify({ type: "output", chunk: "line2\n" }),
      })
    })
    expect(result.current.output).toBe("line1\nline2\n")
    expect(onOutputSpy.calls()).toEqual(["line1\n", "line2\n"])
  })

  test("status message sets isCommandRunning and currentCommand", () => {
    const { result } = renderHook(() => useWebSocket())

    act(() => {
      result.current.connect()
    })
    const ws = lastMockInstance!
    act(() => {
      ws.readyState = OPEN
      ws.onopen?.()
    })

    act(() => {
      ws.onmessage?.({
        data: JSON.stringify({ type: "status", command: "sync" }),
      })
    })

    expect(result.current.isCommandRunning).toBe(true)
    expect(result.current.currentCommand).toBe("sync")
  })

  test("complete message clears command state and calls onComplete", () => {
    const onCompleteSpy = (() => {
      let calls: number[] = []
      const fn = (code: number) => {
        calls.push(code)
      }
      fn.calls = () => calls
      return fn
    })()

    const { result } = renderHook(() =>
      useWebSocket({ onComplete: onCompleteSpy }),
    )

    act(() => {
      result.current.connect()
    })
    const ws = lastMockInstance!
    act(() => {
      ws.readyState = OPEN
      ws.onopen?.()
    })
    act(() => {
      ws.onmessage?.({ data: JSON.stringify({ type: "status", command: "sync" }) })
    })
    expect(result.current.isCommandRunning).toBe(true)

    act(() => {
      ws.onmessage?.({
        data: JSON.stringify({ type: "complete", exitCode: 0 }),
      })
    })

    expect(result.current.isCommandRunning).toBe(false)
    expect(result.current.currentCommand).toBe(null)
    expect(onCompleteSpy.calls()).toEqual([0])
  })

  test("error message calls onError", () => {
    const onErrorSpy = (() => {
      let calls: string[] = []
      const fn = (err: string) => {
        calls.push(err)
      }
      fn.calls = () => calls
      return fn
    })()

    const { result } = renderHook(() => useWebSocket({ onError: onErrorSpy }))

    act(() => {
      result.current.connect()
    })
    const ws = lastMockInstance!
    act(() => {
      ws.readyState = OPEN
      ws.onopen?.()
    })

    act(() => {
      ws.onmessage?.({
        data: JSON.stringify({ type: "error", error: "Something failed" }),
      })
    })

    expect(onErrorSpy.calls()).toEqual(["Something failed"])
  })

  test("sendCommand sends JSON and clears output when connected", () => {
    const { result } = renderHook(() => useWebSocket())

    act(() => {
      result.current.connect()
    })
    const ws = lastMockInstance!
    act(() => {
      ws.readyState = OPEN
      ws.onopen?.()
    })

    act(() => {
      ws.onmessage?.({
        data: JSON.stringify({ type: "output", chunk: "existing" }),
      })
    })
    expect(result.current.output).toBe("existing")

    let sent: boolean
    act(() => {
      sent = result.current.sendCommand("status", [])
    })
    expect(sent!).toBe(true)
    expect(result.current.output).toBe("")
    expect(ws.sent.length).toBe(1)
    const payload = JSON.parse(ws.sent[0]!)
    expect(payload.type).toBe("command")
    expect(payload.command).toBe("status")
    expect(payload.args).toEqual([])
  })

  test("sendCommand returns false when not connected", () => {
    const { result } = renderHook(() => useWebSocket())
    let sent: boolean
    act(() => {
      sent = result.current.sendCommand("status", [])
    })
    expect(sent!).toBe(false)
  })

  test("abort sends abort message when connected", () => {
    const { result } = renderHook(() => useWebSocket())

    act(() => {
      result.current.connect()
    })
    const ws = lastMockInstance!
    act(() => {
      ws.readyState = OPEN
      ws.onopen?.()
    })

    let ok: boolean
    act(() => {
      ok = result.current.abort()
    })
    expect(ok!).toBe(true)
    expect(ws.sent.some((s) => JSON.parse(s).type === "abort")).toBe(true)
  })

  test("clearOutput clears output state", () => {
    const { result } = renderHook(() => useWebSocket())

    act(() => {
      result.current.connect()
    })
    const ws = lastMockInstance!
    act(() => {
      ws.readyState = OPEN
      ws.onopen?.()
    })
    act(() => {
      ws.onmessage?.({
        data: JSON.stringify({ type: "output", chunk: "text" }),
      })
    })
    expect(result.current.output).toBe("text")

    act(() => {
      result.current.clearOutput()
    })
    expect(result.current.output).toBe("")
  })

  test("disconnect closes socket and clears connection", () => {
    const { result } = renderHook(() => useWebSocket())

    act(() => {
      result.current.connect()
    })
    const ws = lastMockInstance!
    act(() => {
      ws.readyState = OPEN
      ws.onopen?.()
    })
    expect(result.current.isConnected).toBe(true)

    act(() => {
      result.current.disconnect()
    })
    expect(result.current.isConnected).toBe(false)
    expect(ws.readyState).toBe(CLOSED)
  })
})
