import type { LLMProvider, RationaleRequest } from './types';
import { mistralLargeProvider, mistralSmallProvider } from './mistral';
import { promptDe } from './prompts/rationale-de';
import { promptEn } from './prompts/rationale-en';

const PRIMARY: LLMProvider = mistralLargeProvider;
const FALLBACK: LLMProvider = mistralSmallProvider;

function buildPrompt(req: RationaleRequest): string {
  return req.locale === 'de' ? promptDe(req) : promptEn(req);
}

export async function draftRationale(req: RationaleRequest): Promise<{
  text: string;
  provider: LLMProvider['name'];
}> {
  const prompt = buildPrompt(req);
  try {
    return { text: await PRIMARY.draftRationale(req, prompt), provider: PRIMARY.name };
  } catch (e) {
    console.warn('[llm] primary failed, trying fallback', e);
    return { text: await FALLBACK.draftRationale(req, prompt), provider: FALLBACK.name };
  }
}
