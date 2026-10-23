/**
 * Shared types for the AI Advisor tool layer.
 * Tools return ToolResult<T> so the AI service can uniformly handle success/failure.
 */

export interface ToolResult<T = any> {
  tool: string;
  status: 'SUCCESS' | 'NO_DATA' | 'ERROR';
  data?: T;
  error?: string;
  dataAsOf: string;
}

/** Helper to build a successful tool result */
export function toolSuccess<T>(tool: string, data: T): ToolResult<T> {
  return { tool, status: 'SUCCESS', data, dataAsOf: new Date().toISOString() };
}

/** Helper to build a NO_DATA tool result */
export function toolNoData(tool: string): ToolResult<null> {
  return { tool, status: 'NO_DATA', data: null, dataAsOf: new Date().toISOString() };
}

/** Helper to build a failed tool result */
export function toolError(tool: string, message: string): ToolResult<never> {
  return { tool, status: 'ERROR', error: message, dataAsOf: new Date().toISOString() };
}
