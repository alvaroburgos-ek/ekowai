import type { LLMProvider, RationaleRequest } from './types';
import { groqProvider } from './groq';
import { deepseekProvider } from './deepseek';
import { promptDe } from './prompts/rationale-de';
import { promptEn } from './prompts/rationale-en';

const PRIMARY: LLMProvider = groqProvider;
const FALLBACK: LLMProvider = deepseekProvider;

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
