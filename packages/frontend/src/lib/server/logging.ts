export function logDiagnosticCode(scope: string, code: string, detail?: string): void {
  const suffix = detail ? ` ${detail}` : '';
  console.error(`[${scope}] ${code}${suffix}`);
}

export function toJsonError(message: string) {
  return { error: message };
}
