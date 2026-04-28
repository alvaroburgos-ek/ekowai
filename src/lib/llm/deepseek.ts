import { generateText } from 'ai';
import { deepseek } from '@ai-sdk/deepseek';
import { env } from '@/env';
import type { LLMProvider, RationaleRequest } from './types';

export const deepseekProvider: LLMProvider = {
  name: 'deepseek',
  async draftRationale(_req: RationaleRequest, prompt: string): Promise<string> {
    if (!env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY not configured');
    const { text } = await generateText({
      model: deepseek('deepseek-chat'),
      prompt,
      temperature: 0.3,
    });
    return text;
  },
};
