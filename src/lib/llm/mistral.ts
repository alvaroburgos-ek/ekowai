import { generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { env } from '@/env';
import type { LLMProvider, RationaleRequest } from './types';

// Mistral AI (EU / France) via the OpenAI-compatible endpoint.
// GDPR-friendly: data is processed in the EU, no third-country transfer.
// https://docs.mistral.ai/api/
const mistral = (apiKey: string) =>
  createOpenAICompatible({
    name: 'mistral',
    apiKey,
    baseURL: 'https://api.mistral.ai/v1',
  });

function draft(model: string) {
  return async (_req: RationaleRequest, prompt: string): Promise<string> => {
    if (!env.MISTRAL_API_KEY) throw new Error('MISTRAL_API_KEY not configured');
    const { text } = await generateText({
      model: mistral(env.MISTRAL_API_KEY).chatModel(model),
      prompt,
      temperature: 0.3,
    });
    return text;
  };
}

export const mistralLargeProvider: LLMProvider = {
  name: 'mistral-large',
  draftRationale: draft('mistral-large-latest'),
};

export const mistralSmallProvider: LLMProvider = {
  name: 'mistral-small',
  draftRationale: draft('mistral-small-latest'),
};
