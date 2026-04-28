import { generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { env } from '@/env';
import type { LLMProvider, RationaleRequest } from './types';

// Moonshot Kimi via the OpenAI-compatible endpoint.
// https://platform.moonshot.ai/docs/api/chat
const kimi = (apiKey: string) =>
  createOpenAICompatible({
    name: 'kimi',
    apiKey,
    baseURL: 'https://api.moonshot.ai/v1',
  });

export const kimiProvider: LLMProvider = {
  name: 'kimi',
  async draftRationale(_req: RationaleRequest, prompt: string): Promise<string> {
    if (!env.KIMI_API_KEY) throw new Error('KIMI_API_KEY not configured');
    const { text } = await generateText({
      model: kimi(env.KIMI_API_KEY).chatModel('kimi-latest'),
      prompt,
      temperature: 0.3,
    });
    return text;
  },
};
