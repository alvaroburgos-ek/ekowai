export interface RationaleRequest {
  worksheetId: string;
  regulation: string;
  regulationVersion: string;
  inputs: Record<string, number | string | boolean | null>;
  computed: Record<string, number>;
  locale: 'de' | 'en';
}

export interface LLMProvider {
  name: 'groq' | 'deepseek';
  draftRationale(req: RationaleRequest, prompt: string): Promise<string>;
}
