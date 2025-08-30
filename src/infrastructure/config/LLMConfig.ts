export class LLMConfig {
  public static readonly OPENAI_API_KEY: string = process.env.OPENAI_API_KEY || '';
  public static readonly OPENAI_API_BASE: string = process.env.OPENAI_API_BASE || '';
  public static readonly DEFAULT_MODEL: string = process.env.DEFAULT_MODEL || 'gpt-4-turbo-preview';
  public static readonly MAX_TOKENS: number = parseInt(process.env.MAX_TOKENS || '4000');
  public static readonly TEMPERATURE: number = parseFloat(process.env.TEMPERATURE || '0.7');

  // Streaming Configuration
  public static readonly STREAM_CHUNK_SIZE: number = parseInt(process.env.STREAM_CHUNK_SIZE || '1024');
  public static readonly STREAM_TIMEOUT: number = parseInt(process.env.STREAM_TIMEOUT || '30000');
  public static readonly MAX_CONCURRENT_STREAMS: number = parseInt(process.env.MAX_CONCURRENT_STREAMS || '10');

  // LangGraph Configuration
  public static readonly DEFAULT_RECURSION_LIMIT: number = parseInt(process.env.DEFAULT_RECURSION_LIMIT || '50');
  public static readonly DEFAULT_STREAM_MODE: string = process.env.DEFAULT_STREAM_MODE || 'updates';
  public static readonly DEFAULT_SUBGRAPHS: boolean = process.env.DEFAULT_SUBGRAPHS === 'true';
}