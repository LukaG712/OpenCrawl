import { ExtractOptions } from '../../utils/types';
import { scrapeUrl } from '../scrape';
import logger from '../../utils/logger';

export async function extractFromUrls(options: ExtractOptions): Promise<Record<string, unknown>> {
  const { urls = [], prompt, schema } = options;

  if (urls.length === 0) {
    logger.warn('Extract called with no URLs');
    return {};
  }

  // Scrape all URLs and collect content
  const allContent: Array<{ url: string; content: string }> = [];

  for (const url of urls) {
    try {
      const result = await scrapeUrl({
        url,
        formats: ['markdown'],
        onlyMainContent: true,
      });

      if (result.success && result.data?.markdown) {
        allContent.push({ url, content: result.data.markdown });
      }
    } catch (err) {
      logger.warn(`Failed to scrape ${url} for extraction: ${(err as Error).message}`);
    }
  }

  if (allContent.length === 0) {
    return {};
  }

  // Combine all content for LLM extraction
  const combinedContent = allContent
    .map((item) => `--- ${item.url} ---\n${item.content}`)
    .join('\n\n');

  // Call LLM for structured extraction
  const systemPrompt = `You are a data extraction assistant. ${prompt} Return only valid JSON matching the schema.`;

  try {
    const result = await callLlmExtraction(systemPrompt, combinedContent, schema);
    return result;
  } catch (err) {
    logger.error(`Extract LLM call failed: ${(err as Error).message}`);
    return {};
  }
}

async function callLlmExtraction(
  systemPrompt: string,
  content: string,
  schema?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('OpenAI API key not configured for extraction');
    return {};
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const maxTokens = 6000;
  const truncatedContent = content.length > maxTokens * 4 ? content.slice(0, maxTokens * 4) : content;

  const userMessage = `Here is the webpage content to extract data from:\n\n${truncatedContent}`;

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0,
  };

  if (schema) {
    body.response_format = { type: 'json_schema', json_schema: { name: 'extraction', schema } };
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  const message = (result as any).choices?.[0]?.message;
  if (!message) {
    throw new Error('No response from OpenAI');
  }

  if (typeof message.content === 'string') {
    try {
      return JSON.parse(message.content);
    } catch {
      logger.warn('Failed to parse OpenAI response as JSON');
      return {};
    }
  }

  return {};
}
