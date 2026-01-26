/**
 * AI 模型配置
 * 统一管理所有 AI 模型名称，便于后续更新和维护
 */

export const AI_MODELS = {
  // Gemini 模型
  GEMINI_PRO_PREVIEW: 'gemini-3-pro-preview',
  // 可以添加其他模型
  // GEMINI_FLASH: 'gemini-2.5-flash',
  // GEMINI_PRO: 'gemini-pro',
} as const;

// 默认使用的模型
export const DEFAULT_MODEL = AI_MODELS.GEMINI_PRO_PREVIEW;
