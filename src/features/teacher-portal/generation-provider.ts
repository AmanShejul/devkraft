export type QuestionGenerator = {
  provider: "gemini" | "ollama";
  generate: () => Promise<unknown>;
  validationRetries?: number;
  stopRetryOnValidationError?: (error: unknown) => boolean;
};

export async function generateWithFallback<T>(
  generators: QuestionGenerator[],
  validate: (value: unknown) => T,
): Promise<{ provider: QuestionGenerator["provider"]; result: T }> {
  let lastError: unknown;

  for (const generator of generators) {
    for (let attempt = 0; attempt <= (generator.validationRetries ?? 0); attempt += 1) {
      let output: unknown;
      try {
        output = await generator.generate();
      } catch (error) {
        lastError = error;
        break;
      }
      try {
        return { provider: generator.provider, result: validate(output) };
      } catch (error) {
        lastError = error;
        if (generator.stopRetryOnValidationError?.(error)) break;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("QUESTION_GENERATION_FAILED");
}