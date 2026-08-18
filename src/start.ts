import * as startRuntime from "@tanstack/react-start";
import { createStart, createMiddleware } from "@tanstack/react-start";

import { describeError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(describeError(error)), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests. Older/alternate builds of @tanstack/react-start may
// not export it, so resolve it defensively at runtime.
const createCsrf = (startRuntime as Record<string, unknown>)[
  "createCsrfMiddleware"
] as
  | ((opts: { filter: (ctx: { handlerType: string }) => boolean }) => ReturnType<typeof createMiddleware>)
  | undefined;

const csrfMiddleware =
  typeof createCsrf === "function"
    ? createCsrf({ filter: (ctx) => ctx.handlerType === "serverFn" })
    : undefined;

export const startInstance = createStart(() => ({
  requestMiddleware: csrfMiddleware
    ? [errorMiddleware, csrfMiddleware]
    : [errorMiddleware],
}));
