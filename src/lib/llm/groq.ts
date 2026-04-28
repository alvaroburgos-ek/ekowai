import { generateText } from 'ai';
import { groq } from '@ai-sdk/groq';
import { env } from '@/env';
import type { LLMProvider, RationaleRequest } from './types';

export const groqProvider: LLMProvider = {
  name: 'groq',
  async draftRationale(_req: RationaleRequest, prompt: string): Promise<string> {
    if (!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY not configured');
    const { text } = await generateText({
      model: groq('llama-3.3-70b-versatile'),
      prompt,
      temperature: 0.3,
    });
    return text;
  },
};
