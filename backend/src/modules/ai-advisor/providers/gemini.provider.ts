import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai';
import { getSystemPrompt } from '../prompts/system.prompt';

// Maximum number of recent messages to send as context to Gemini
const MAX_HISTORY_MESSAGES = 20;
// Gemini request timeout in milliseconds (30 seconds)
const GEMINI_TIMEOUT_MS = 30_000;
// Retry configuration for transient errors (503, 429)
const MAX_RETRIES = 2;
const INITIAL_RETRY_DELAY_MS = 2_000;

export class GeminiProvider {
  private genAI: GoogleGenerativeAI;
  private model: GenerativeModel;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is not set');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    this.model = this.genAI.getGenerativeModel({
      model: this.modelName,
      systemInstruction: getSystemPrompt(),
    });
    console.log(`[AI] Gemini provider initialized with model: ${this.modelName}`);
  }

  async generateContent(
    message: string,
    history: { role: string; parts: { text: string }[] }[] = [],
    enableSearch: boolean = false
  ): Promise<string> {
    // Trim history to last N messages to control context size / latency
    const trimmedHistory = history.slice(-MAX_HISTORY_MESSAGES);

    const overallStart = Date.now();
    console.log(`[AI] Gemini request started (model: ${this.modelName}, historyLength: ${trimmedHistory.length}, searchGrounding: ${enableSearch})`);

    let lastError: any = null;

    let modelToUse = this.model;
    if (enableSearch) {
      modelToUse = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction: getSystemPrompt(),
        tools: [{ googleSearchRetrieval: {} } as any],
      });
    }

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      if (attempt > 0) {
        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[AI] Retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      const attemptStart = Date.now();

      try {
        const chat = modelToUse.startChat({ history: trimmedHistory });

        // Race the Gemini call against a timeout
        const result = await Promise.race([
          chat.sendMessage(message),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('GEMINI_TIMEOUT')),
              GEMINI_TIMEOUT_MS
            )
          ),
        ]);

        const response = await result.response;

        // Check finish reason before calling .text() — an empty response
        // (safety block, recitation, etc.) throws "model output must contain
        // either output text or tool calls" if we blindly call text().
        const candidate = response.candidates?.[0];
        const finishReason = candidate?.finishReason;

        if (finishReason && finishReason !== 'STOP' && finishReason !== 'MAX_TOKENS') {
          // Model was blocked (SAFETY, RECITATION, OTHER)
          console.warn(`[AI] Gemini blocked response: finishReason=${finishReason} (attempt ${attempt + 1})`);
          
          if (attempt < MAX_RETRIES) {
            // Wait and retry without modifying the prompt, maybe it was a transient block
            lastError = new Error(`GEMINI_BLOCKED:${finishReason}`);
            continue;
          }
          break;
        }

        let text = response.text();
        const elapsed = Date.now() - overallStart;

        // Append citations if available and search is enabled
        if (enableSearch && candidate?.groundingMetadata?.groundingChunks) {
          const chunks = candidate.groundingMetadata.groundingChunks;
          const urls = chunks
            .map(c => c.web?.uri)
            .filter((uri): uri is string => !!uri);
            
          const uniqueUrls = Array.from(new Set(urls));
          if (uniqueUrls.length > 0) {
            text += '\n\n**Sources:**\n' + uniqueUrls.map((url, i) => `[${i + 1}] [${url}](${url})`).join('\n');
          }
        }

        console.log(`[AI] Gemini response received: ${elapsed}ms total (attempt ${attempt + 1}, ${text.length} chars)`);
        return text;
      } catch (error: any) {
        lastError = error;
        const elapsed = Date.now() - attemptStart;
        const msg: string = error.message || '';
        const statusMatch = msg.match(/\[(\d{3})\s/);
        const status = error.status || error.statusCode || (statusMatch ? parseInt(statusMatch[1]) : 'unknown');

        if (msg === 'GEMINI_TIMEOUT') {
          console.error(`[AI] Gemini request timed out after ${GEMINI_TIMEOUT_MS}ms (attempt ${attempt + 1})`);
          // Don't retry timeouts — they already took too long
          break;
        }

        // The SDK throws this exact string when the response has no text and no tool calls
        // (i.e. the model was blocked by a safety filter after the response was received)
        const isEmptyResponse = msg.includes('output text or tool calls') || msg.includes('GEMINI_BLOCKED');
        if (isEmptyResponse && attempt < MAX_RETRIES) {
          console.warn(`[AI] Empty/blocked Gemini response (attempt ${attempt + 1}), retrying...`);
          // Do not strip the financial data block. Grounded answers must be preserved.
          continue;
        }

        console.error(`[AI] Gemini error (attempt ${attempt + 1}): status=${status}, elapsed=${elapsed}ms, msg=${msg.substring(0, 200)}`);

        // Only retry on transient errors (503 overloaded, 429 rate-limit)
        const isQuota = msg.toLowerCase().includes('quota');
        const isRetryable = status === 503 || (status === 429 && !isQuota);
        if (!isRetryable || attempt >= MAX_RETRIES) {
          break;
        }
      }
    }

    // All attempts exhausted — classify the final error
    const totalElapsed = Date.now() - overallStart;
    const errMsg: string = lastError?.message || '';
    const statusMatch = errMsg.match(/\[(\d{3})\s/);
    const status = lastError?.status || lastError?.statusCode || (statusMatch ? parseInt(statusMatch[1]) : 'unknown');

    if (errMsg === 'GEMINI_TIMEOUT') {
      throw new Error('FinWise AI is taking too long to respond. Please try again.');
    }
    if (errMsg.includes('output text or tool calls') || errMsg.startsWith('GEMINI_BLOCKED')) {
      console.error(`[AI] Model blocked all attempts after ${totalElapsed}ms: ${errMsg}`);
      throw new Error('FinWise AI could not generate a response for that message. Please try rephrasing your question.');
    }
    if (status === 429) {
      if (errMsg.toLowerCase().includes('quota')) {
        throw new Error('GEMINI_QUOTA_EXCEEDED');
      }
      throw new Error('FinWise AI is experiencing high demand. Please wait a moment and try again.');
    }
    if (status === 400) {
      throw new Error(`GEMINI_BAD_REQUEST: ${errMsg}`);
    }
    if (status === 401 || status === 403) {
      throw new Error(`GEMINI_AUTH_ERROR: ${errMsg}`);
    }
    if (status === 503) {
      throw new Error('FinWise AI service is temporarily overloaded. Please try again in a few seconds.');
    }
    if (status === 404) {
      console.error(`[AI] Model not found: ${this.modelName}. Check GEMINI_MODEL in .env`);
      throw new Error('FinWise AI model configuration error. Please contact support.');
    }

    console.error(`[AI] All Gemini attempts failed after ${totalElapsed}ms: status=${status}, msg=${errMsg}`);
    throw new Error(`FinWise AI encountered an error (HTTP ${status}). Please try again.`);
  }
}
