export function reportError(error: unknown, context: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  const message =
    error instanceof Response
      ? `Response ${error.status}${error.url ? ` at ${error.url}` : ""}`
      : error instanceof Error
        ? error.message
        : String(error);

  const stack = error instanceof Error ? error.stack : undefined;

  // Log to console for debugging/tracing; no third-party telemetry.
  // eslint-disable-next-line no-console
  console.error("[Gestão Obra] Runtime error:", message, { context, stack });
}
