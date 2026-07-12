// src/shared/utils/retry.ts
export class RetryAbortError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "RetryAbortError";
  }
}

export interface RetryOptions {
  retries?: number;       // default 3
  factor?: number;        // default 2

  // preferred names
  minDelayMs?: number;    // default 250
  maxDelayMs?: number;    // default 2000

  // aliases for p-retry compatibility (optional)
  minTimeout?: number;    // alias of minDelayMs
  maxTimeout?: number;    // alias of maxDelayMs

  onFailedAttempt?: (info: { attempt: number; retriesLeft: number; error: unknown }) => void;
}


function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function retry<T>(
  fn: (attempt: number) => Promise<T>,
  opts?: RetryOptions
): Promise<T> {
  const retries = opts?.retries ?? 3;
  const factor = opts?.factor ?? 2;
  const minDelayMs = opts?.minDelayMs ?? 250;
  const maxDelayMs = opts?.maxDelayMs ?? 2000;

  let attempt = 0;
  // attempt 1..(retries+1)
  while (true) {
    attempt += 1;
    try {
      return await fn(attempt);
    } catch (err) {
      if (err instanceof RetryAbortError) throw err;

      const retriesLeft = retries - (attempt - 1);
      opts?.onFailedAttempt?.({ attempt, retriesLeft, error: err });

      if (retriesLeft <= 0) throw err;

      const delay = Math.min(maxDelayMs, Math.round(minDelayMs * Math.pow(factor, attempt - 1)));
      await sleep(delay);
    }
  }
}
