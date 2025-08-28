export class SSEAdapter {
  public static formatSSEEvent(eventType: string, data: Record<string, unknown> | string | number | boolean | null): string {
    try {
      const jsonData: string = JSON.stringify(data, null, 0);
      return `event: ${eventType}\ndata: ${jsonData}\n\n`;
    } catch (error) {
      return SSEAdapter.formatSSEEvent('error', {
        message: 'Failed to serialize data',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  public static formatSSEChunk(content: string): string {
    return SSEAdapter.formatSSEEvent('message_chunk', {
      content,
      timestamp: new Date().toISOString()
    });
  }

  public static formatSSEComplete(): string {
    return SSEAdapter.formatSSEEvent('done', {
      timestamp: new Date().toISOString()
    });
  }

  public static formatSSEError(error: string): string {
    return SSEAdapter.formatSSEEvent('error', {
      message: error,
      timestamp: new Date().toISOString()
    });
  }
}