import { VideoModel } from '../models/videoModel.js';
import { DEFAULT_MODEL } from '../config/aiConfig.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 主动挖掘（Discovery）：
 * - 发现“视频元素特点”标签（自由生成，但必须基于证据，且不要强行编造）
 * - 额外关注“爆款潜质”3项特征（有则给出，没有则不输出）
 *
 * 输出存储：
 * - video_discovery_tags：只存“发现到”的标签（不存未发现）
 * - 复用 videos.ai_tagging_status/progress/error 作为任务状态
 */
class VideoDiscovererService {
  constructor() {
    this.queue = [];
    this.isProcessing = false;
    this.concurrent = 1;
  }

  async addToQueue(videoId, projectId, geminiApiKey) {
    console.log(`\n[DiscoveryQueue] 收到主动挖掘请求: videoId=${videoId}, projectId=${projectId}`);

    const existsInQueue = this.queue.some(item => item.video_id === videoId);
    if (existsInQueue) {
      console.log(`[DiscoveryQueue] 视频 ${videoId} 已在队列中，跳过`);
      return;
    }

    this.queue.push({
      video_id: videoId,
      project_id: projectId,
      gemini_api_key: geminiApiKey,
      added_at: new Date()
    });

    await VideoModel.updateVideoTaggingStatus(videoId, 'processing', 0);
    console.log(`[DiscoveryQueue] 任务入队成功，当前队列长度: ${this.queue.length}`);

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;
    console.log(`\n[DiscoveryProcessor] 开始处理队列...`);

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      console.log(`[DiscoveryProcessor] 提取任务: ${task.video_id}`);

      try {
        await this.discoverVideo(task);
      } catch (err) {
        console.error(`[DiscoveryProcessor] 任务执行出错 ${task.video_id}:`, err);
      }

      await this.sleep(2000);
    }

    this.isProcessing = false;
    console.log(`[DiscoveryProcessor] 队列处理完成\n`);
  }

  async discoverVideo(task) {
    const { video_id, project_id, gemini_api_key } = task;

    try {
      console.log(`[Discovery] --- 开始主动挖掘任务: ${video_id} ---`);

      // 1) 准备视频文件 (10%)
      await VideoModel.updateVideoTaggingStatus(video_id, 'processing', 10);
      const video = await VideoModel.getVideoById(video_id);
      if (!video || !video.local_path) throw new Error('视频文件记录不存在');

      const videoPath = path.join(__dirname, '../../storage', video.local_path);
      if (!fs.existsSync(videoPath)) throw new Error(`视频物理文件不存在: ${videoPath}`);

      const videoBuffer = fs.readFileSync(videoPath);
      const base64Video = videoBuffer.toString('base64');
      console.log(`[Discovery] 视频文件读取成功: ${videoPath} (${videoBuffer.length} bytes)`);

      // 2) 调用 Gemini (50%)
      await VideoModel.updateVideoTaggingStatus(video_id, 'processing', 50);
      const result = await this.analyzeWithGemini(gemini_api_key, base64Video, 'video/mp4');
      const narrativeInsights = await this.analyzeNarratives(gemini_api_key, base64Video, 'video/mp4');

      // 3) 保存结果 (80%)
      await VideoModel.updateVideoTaggingStatus(video_id, 'processing', 80);
      await this.saveDiscoveryResults(video_id, project_id, result);
      await VideoModel.saveVideoNarratives(video_id, narrativeInsights);

      // 4) 完成 (100%)
      await VideoModel.updateVideoTaggingStatus(video_id, 'completed', 100);
      console.log(`[Discovery] --- 任务成功结束: ${video_id} ---\n`);
    } catch (error) {
      console.error(`[Discovery] ❌ 任务失败 ${video_id}:`, error.message);
      await VideoModel.updateVideoTaggingStatus(video_id, 'error', 0, error.message);
    }
  }

  async analyzeWithGemini(apiKey, base64Video, mimeType) {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    // 爆款潜质固定三项
    const viralTraits = [
      '认知被命名',
      '反常识刺激',
      '群体身份确认'
    ];

    const prompt = `
你是一位资深短视频内容分析师，服务于美妆品牌“怡丽丝尔 (Elixir)”。你的任务是对给定视频进行“主动挖掘”，发现并提取视频中的**元素特点**（自由生成标签），并额外判断是否出现“爆款潜质”特征。

主动挖掘要求：
1) 你输出的每一个标签都必须有清晰的视频视觉或音频证据支撑。
2) 不要强行编造：如果你不确定，就不要输出该标签。
3) 标签应当短、可读、可复用（类似“元素特征词条”），避免过长的句子。
4) 输出尽量结构化，便于 UI 展示：将标签按类别分组。

【需要挖掘的视频特点维度】（但不仅限于以下，可根据视频内容自由扩展类别）：
0. **开场钩子** (Opening)
   - 例如：开场是怎么抓住5秒内观众的注意力的
   - 关注：视觉钩子，音频钩子，画面和声音的组合，悬念设计，完播动机等
1. **视觉风格** (Visual Style)
   - 例如：电影感、Vlog风格、动画风格、极简主义、复古风、现代感、日系、韩系等
   - 关注：画面质感、色彩风格、构图方式、镜头语言

2. **核心话题或主题** (Core Topic/Theme)
   - 例如：护肤教程、产品测评、使用心得、生活分享、情感故事等
   - 关注：视频要传达的主要信息、核心内容方向

3. **出现的物体、场景或地点** (Objects/Scenes/Locations)
   - 例如：室内场景、户外场景、化妆台、浴室、办公室、咖啡厅等
   - 关注：视频中出现的具体物品、环境、地理位置

4. **情绪或基调** (Mood/Tone)
   - 例如：轻松愉快、温馨治愈、专业严肃、幽默搞笑、浪漫唯美、紧张刺激等
   - 关注：视频整体传达的情感氛围

5. **音频特征** (Audio Features)
   - 背景音乐类型：例如：轻音乐、流行乐、古典乐、电子乐、无音乐等
   - 解说风格：例如：温柔解说、专业解说、活泼解说、无解说等
   - 关注：音频元素对视频氛围的影响

6. **剪辑手法** (Editing Techniques)
   - 例如：快切、慢镜头、转场特效、分屏、画中画、时间加速/减速等
   - 关注：视频的剪辑节奏和技巧

【爆款潜质】（如果视频中没有明确体现，则不要输出）：
- 认知被命名：精准表达了大众“有这种感觉但没想过还能这么说”的情绪/现象。
- 反常识刺激：新奇、反直觉、甚至“有点不对劲”的观点或视觉元素，强抢注意力。
- 群体身份确认：引发“原来不是只有我这样”的强共鸣，确认群体身份。


输出格式：你必须返回一个合法 JSON（不要 Markdown），结构如下：
{
  "elements": [
    { "category": "开场钩子", "tags": ["视觉钩子", "音频钩子", "画面和声音的组合", "悬念设计", "完播动机"] },
    { "category": "视觉风格", "tags": ["电影感", "极简主义"] },
    { "category": "核心话题或主题", "tags": ["护肤教程", "产品测评"] },
    { "category": "出现的物体、场景或地点", "tags": ["室内场景", "化妆台"] },
    { "category": "情绪或基调", "tags": ["轻松愉快", "温馨治愈"] },
    { "category": "音频特征", "tags": ["轻音乐", "温柔解说"] },
    { "category": "剪辑手法", "tags": ["快切", "慢镜头"] }
  ],
  "viral_traits": ["${viralTraits.join('","')}"]
}

规则：
- elements 数组中的每个对象代表一个类别，category 名称使用上述维度名称（或你根据视频内容扩展的合理类别名）。
- 每个类别的 tags 数组包含该维度下发现的标签，如果没有发现则返回空数组 []。
- 如果某个维度完全没有相关内容，可以不包含该 category（但建议至少包含 1-2 个有内容的维度）。
- viral_traits 是上述 3 项爆款潜质的子集；没有则返回空数组 []。
`;

    console.log(`[Gemini][Discovery] 发送分析请求 (Model: ${DEFAULT_MODEL})...`);

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Video } },
          { text: prompt }
        ]
      },
      config: { responseMimeType: 'application/json', temperature: 0.2 }
    });

    const text = response.text;
    if (!text) throw new Error('Gemini API 返回空响应');

    let cleanText = text.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }

    try {
      const json = JSON.parse(cleanText);
      return json;
    } catch (e) {
      console.error('[Gemini][Discovery] JSON 解析失败，原始响应:', text);
      throw new Error('Gemini 返回内容无法解析为 JSON');
    }
  }

  buildNarrativePrompt() {
    return `
你是品牌的资深短视频分析专家，需要输出两个部分：
1) 前5秒内容拆解：描述前5秒具体镜头、话术、悬念设计等，并给出亮点。
2) 全片结构总结：识别视频整体结构，基于“痛点引入 -> 产品引入 -> 信任背书 -> 行动呼吁 (CTA)”等典型漏斗阶段进行判断，可根据实际情况补充/删减阶段。

分析要求：
- 先完整观看全片再输出；
- 每个结论要有画面或音频证据支撑，引用具体秒数；
- 可用 bullet/short sentence 形式，便于 UI 展示；

输出 JSON，结构如下：
{
  "first5s_analysis": {
    "hook_strength": "强/中/弱",
    "highlight": "",
    "issue": "",
    "timeline": [
      {"second": 0, "description": ""}
    ]
  },
  "video_summary": {
    "structure": [
      {"stage": "痛点引入", "present": true, "evidence": "", "timestamp": "0-5s"},
      {"stage": "产品引入", ... }
    ],
    "overall_takeaway": ""
  }
}

请一定返回合法 JSON，不要包含 Markdown。
`;
  }

  async analyzeNarratives(apiKey, base64Video, mimeType) {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const prompt = this.buildNarrativePrompt();

    console.log(`[Gemini][Discovery] 发送叙事洞察分析请求 (Model: ${DEFAULT_MODEL})...`);

    const response = await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Video } },
          { text: prompt }
        ]
      },
      config: { responseMimeType: 'application/json', temperature: 0.2 }
    });

    const text = response.text;
    if (!text) throw new Error('Gemini 叙事分析返回空响应');

    let cleanText = text.trim();
    if (cleanText.startsWith('```')) {
      cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }

    try {
      const json = JSON.parse(cleanText);
      return {
        first5s_analysis: json.first5s_analysis || null,
        video_summary: json.video_summary || null
      };
    } catch (err) {
      console.error('[Gemini][Discovery] 叙事分析 JSON 解析失败:', err);
      return { first5s_analysis: null, video_summary: null };
    }
  }

  async saveDiscoveryResults(videoId, projectId, result) {
    // 清空旧结果（重新挖掘）
    await VideoModel.deleteVideoDiscoveryTags(videoId);

    const tagsToInsert = [];

    // elements
    const elements = Array.isArray(result?.elements) ? result.elements : [];
    for (const group of elements) {
      const category = (group?.category || '视频元素').toString().trim() || '视频元素';
      const tags = Array.isArray(group?.tags) ? group.tags : [];
      for (const t of tags) {
        const tagName = (t || '').toString().trim();
        if (!tagName) continue;
        tagsToInsert.push({
          video_id: videoId,
          project_id: projectId,
          category_name: category,
          tag_name: tagName
        });
      }
    }

    // viral_traits
    const viral = Array.isArray(result?.viral_traits) ? result.viral_traits : [];
    for (const t of viral) {
      const tagName = (t || '').toString().trim();
      if (!tagName) continue;
      tagsToInsert.push({
        video_id: videoId,
        project_id: projectId,
        category_name: '爆款潜质',
        tag_name: tagName
      });
    }

    await VideoModel.saveVideoDiscoveryTags(tagsToInsert);
    console.log(`[Discovery][Database] 保存 video_discovery_tags: ${tagsToInsert.length} 条`);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getQueueStatus() {
    return {
      queue_length: this.queue.length,
      is_processing: this.isProcessing,
      pending_videos: this.queue.map(item => item.video_id)
    };
  }
}

const videoDiscovererService = new VideoDiscovererService();
export default videoDiscovererService;
