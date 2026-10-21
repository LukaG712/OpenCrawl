import { AgentOptions } from '../../utils/types';
import { scrapeUrl } from '../scrape';
import { searchUrls } from '../search';
import logger from '../../utils/logger';

export async function runAgent(options: AgentOptions): Promise<{
  result: Record<string, unknown>;
  sources: string[];
}> {
  const { prompt, schema, urls, search, limit = 5 } = options;

  const sources: string[] = [];
  const allContent: Array<{ url: string; content: string }> = [];

  // If URLs are provided, scrape them
  if (urls && urls.length > 0) {
    for (const url of urls) {
      try {
        const result = await scrapeUrl({
          url,
          formats: ['markdown'],
          onlyMainContent: true,
        });

        if (result.success && result.data?.markdown) {
          allContent.push({ url, content: result.data.markdown });
          sources.push(url);
        }
      } catch (err) {
        logger.warn(`Agent failed to scrape ${url}: ${(err as Error).message}`);
      }
    }
  }

  // If search query is provided, search and scrape results
  if (search) {
    const searchResults = await searchUrls({
      query: search,
      limit,
      scrapeOptions: {
        formats: ['markdown'],
        onlyMainContent: true,
      },
    });

    if (searchResults.success && searchResults.data) {
      for (const result of searchResults.data) {
        if (result.data?.markdown) {
          allContent.push({ url: result.url, content: result.data.markdown });
          if (!sources.includes(result.url)) {
            sources.push(result.url);
          }
        }
      }
    }
  }

  if (allContent.length === 0) {
    return { result: {}, sources: [] };
  }

  // Combine all content for LLM
  const combinedContent = allContent
    .map((item) => `--- ${item.url} ---\n${item.content}`)
    .join('\n\n');

  // Call LLM for agent response
  const systemPrompt = `You are a research agent. Analyze the provided web content and answer the user's request. ${prompt} Return structured JSON.`;

  try {
    const result = await callAgentLLM(systemPrompt, combinedContent, schema);
    return { result, sources };
  } catch (err) {
    logger.error(`Agent LLM call failed: ${(err as Error).message}`);
    return { result: {}, sources };
  }
}

async function callAgentLLM(
  systemPrompt: string,
  content: string,
  schema?: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    logger.warn('OpenAI API key not configured for agent');
    return {};
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const maxTokens = 6000;
  const truncatedContent = content.length > maxTokens * 4 ? content.slice(0, maxTokens * 4) : content;

  const userMessage = `Here is the collected web content:\n\n${truncatedContent}`;

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0,
  };

  if (schema) {
    body.response_format = { type: 'json_schema', json_schema: { name: 'agent_result', schema } };
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
      logger.warn('Failed to parse OpenAI agent response as JSON');
      return {};
    }
  }

  return {};
}
