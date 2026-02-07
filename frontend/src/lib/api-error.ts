type ErrorPayload = {
  error?: unknown
  message?: unknown
  details?: unknown
}

type ErrorWithData = {
  data?: unknown
  error?: unknown
  message?: unknown
}

const appendMessage = (messages: string[], value: unknown) => {
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed.length > 0) {
      messages.push(trimmed)
    }
  }
}

const appendDetails = (messages: string[], details: unknown) => {
  if (Array.isArray(details)) {
    details.forEach((detail) => appendMessage(messages, detail))
    return
  }
  appendMessage(messages, details)
}

export const getApiErrorMessage = (error: unknown): string => {
  if (typeof error === "string") {
    return error
  }

  if (error && typeof error === "object") {
    const messages: string[] = []
    const errorWithData = error as ErrorWithData

    if (typeof errorWithData.data === "string") {
      appendMessage(messages, errorWithData.data)
    } else if (errorWithData.data && typeof errorWithData.data === "object") {
      const data = errorWithData.data as ErrorPayload
      appendMessage(messages, data.error)
      appendMessage(messages, data.message)
      appendDetails(messages, data.details)
    }

    appendMessage(messages, errorWithData.error)
    appendMessage(messages, errorWithData.message)

    if (messages.length > 0) {
      return Array.from(new Set(messages)).join("\n")
    }

    try {
      return JSON.stringify(error)
    } catch {
      return String(error)
    }
  }

  return String(error)
}
