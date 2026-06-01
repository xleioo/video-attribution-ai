import { VideoModel } from '../models/videoModel.js';

/**
 * 主动挖掘：项目级标签汇总
 * - 输入：project 下所有 video_discovery_tags
 * - 输出：project_discovery_tags（类别名 + 规范化标签名 + aliases_json）
 *
 * 说明：
 * - 第一次下载时触发一次汇总；后续直接复用已汇总的 project_discovery_tags
 * - 同义合并由 Gemini 完成；失败时退化为“去重不合并”
 */
export async function summarizeProjectDiscoveryTags(projectId, geminiApiKey) {
  await VideoModel.updateProjectDiscoverySummary(projectId, 'processing', 5, null);

  const allRows = await VideoModel.getDiscoveryTagsByProject(projectId);
  console.log(`[DiscoverySummary] 📊 项目 ${projectId} 所有视频发现标签总数: ${allRows.length}`);
  
  const byCategory = new Map(); // category -> Set<tag_name>
  for (const r of allRows) {
    const cat = r.category_name || '视频元素';
    if (!byCategory.has(cat)) byCategory.set(cat, new Set());
    byCategory.get(cat).add(r.tag_name);
  }

  console.log(`[DiscoverySummary] 📋 按类别汇总: ${byCategory.size} 个类别`);
  for (const [cat, set] of byCategory.entries()) {
    console.log(`[DiscoverySummary]   - ${cat}: ${set.size} 个唯一标签`);
  }

  // ✅ 需求：汇总应包含“所有视频挖掘出来的全部标签”，并在其中合并意思相同/相近的标签
  // 因此：对每一个 category 都做一次同义合并（失败则退化为去重不合并）
  await VideoModel.updateProjectDiscoverySummary(projectId, 'processing', 20, null);

  // 写入 project_discovery_tags：先清空再写入（确保和当前视频结果一致）
  await VideoModel.deleteProjectDiscoveryTags(projectId);

  const tagsToSave = [];
  const categories = Array.from(byCategory.keys()).sort();
  let processedCount = 0;
  const totalCategories = categories.length;
  
  for (const cat of categories) {
    const set = byCategory.get(cat) || new Set();
    const list = Array.from(set).filter(Boolean).map(s => s.trim()).filter(Boolean);
    if (list.length === 0) continue;

    console.log(`[DiscoverySummary] 🔄 处理类别 "${cat}": ${list.length} 个标签，准备调用 Gemini 合并...`);
    const progress = 20 + Math.floor((processedCount / totalCategories) * 50);
    await VideoModel.updateProjectDiscoverySummary(projectId, 'processing', progress, null);

    const merged = await mergeSynonymsWithGemini(list, geminiApiKey, cat).catch(err => {
      console.warn(`[DiscoverySummary] ⚠️ Gemini 合并失败（${cat}），退化为去重:`, err.message);
      return list.map(t => ({ tag: t, aliases: [] }));
    });

    console.log(`[DiscoverySummary] ✅ 类别 "${cat}": 合并后 ${merged.length} 个标签（原始 ${list.length} 个）`);
    processedCount++;

    for (const item of merged) {
      const tagName = (item?.tag || '').toString().trim();
      if (!tagName) continue;
      const aliases = Array.isArray(item?.aliases)
        ? item.aliases.map(a => (a || '').toString().trim()).filter(Boolean)
        : [];

      tagsToSave.push({
        category_name: cat,
        tag_name: tagName,
        aliases_json: aliases
      });
    }
  }

  await VideoModel.saveProjectDiscoveryTags(projectId, tagsToSave);

  console.log(`[DiscoverySummary] 💾 保存完成: 共 ${tagsToSave.length} 个项目级汇总标签`);
  await VideoModel.updateProjectDiscoverySummary(projectId, 'completed', 100, null);
  return tagsToSave.length;
}

async function mergeSynonymsWithGemini(tags, apiKey, categoryName = '视频元素') {
  if (!tags || tags.length === 0) return [];
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey });

  console.log(`[DiscoverySummary][Gemini] 📤 发送合并请求: 类别="${categoryName}", 标签数=${tags.length}`);
  console.log(`[DiscoverySummary][Gemini] 📋 标签列表:`, tags.slice(0, 20).join(', '), tags.length > 20 ? '...' : '');

  const prompt = `
你是一位数据清洗与语义归一化专家。现在给你一组"视频元素标签"（短词条），它们来自同一个项目中多条视频的主动挖掘结果。

你的任务：
1) 将意思相同/高度相近的标签合并为一个"规范化标签 tag"。\n2) 将被合并的其它表达放入 aliases。\n3) 不要发明新的概念：规范化标签应尽量使用输入中的某一个表达。\n4) 不确定是否同义时，不要合并。\n5) **重要**：必须确保合并后的标签数量 <= 原始标签数量（因为合并会减少数量）。\n6) **重要**：如果某个标签没有同义词，它应该单独出现在 merged 数组中，aliases 为空数组。
输出格式：返回合法 JSON，结构如下（不要 Markdown）：\n{
  \"merged\": [
    { \"tag\": \"规范化标签\", \"aliases\": [\"别名1\", \"别名2\"] }
  ]
}
`;

  const requestPayload = { category: categoryName, tags };
  console.log(`[DiscoverySummary][Gemini] 📦 请求 payload 大小:`, JSON.stringify(requestPayload).length, 'bytes');

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-pro-preview',
    contents: { parts: [{ text: prompt }, { text: JSON.stringify(requestPayload, null, 2) }] },
    config: { responseMimeType: 'application/json', temperature: 0.1 }
  });

  const text = response.text;
  if (!text) throw new Error('Gemini 返回空响应');

  console.log(`[DiscoverySummary][Gemini] 📥 收到响应:`, text.substring(0, 500), text.length > 500 ? '...' : '');

  let cleanText = text.trim();
  if (cleanText.startsWith('```')) {
    cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
  }

  const json = JSON.parse(cleanText);
  const merged = Array.isArray(json?.merged) ? json.merged : [];
  
  console.log(`[DiscoverySummary][Gemini] ✅ 解析成功: 合并后 ${merged.length} 个标签`);
  if (merged.length > 0) {
    console.log(`[DiscoverySummary][Gemini] 📋 合并结果示例:`, merged.slice(0, 3).map(m => `${m.tag} (aliases: ${m.aliases?.length || 0})`).join(', '));
  }
  
  return merged.map(item => ({
    tag: item.tag,
    aliases: Array.isArray(item.aliases) ? item.aliases : []
  }));
}

