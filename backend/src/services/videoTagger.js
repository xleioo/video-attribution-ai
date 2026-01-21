import { VideoModel } from '../models/videoModel.js';
import { TagModel } from '../models/tagModel.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VideoTaggerService {
  constructor() {
    this.taggingQueue = [];
    this.isProcessing = false;
    this.concurrentTagging = 1;
  }

  // 添加视频到打标队列
  async addToQueue(videoId, projectId, geminiApiKey) {
    console.log(`\n[Queue] 收到打标请求: videoId=${videoId}, projectId=${projectId}`);
    
    const existsInQueue = this.taggingQueue.some(item => item.video_id === videoId);
    if (existsInQueue) {
      console.log(`[Queue] 视频 ${videoId} 已在队列中，跳过`);
      return;
    }

    this.taggingQueue.push({
      video_id: videoId,
      project_id: projectId,
      gemini_api_key: geminiApiKey,
      added_at: new Date()
    });

    console.log(`[Queue] 任务入队成功，当前队列长度: ${this.taggingQueue.length}`);

    await VideoModel.updateVideoTaggingStatus(videoId, 'processing', 0);

    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  // 处理队列
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    console.log(`\n[Processor] 开始处理队列...`);

    while (this.taggingQueue.length > 0) {
      const task = this.taggingQueue.shift();
      console.log(`[Processor] 提取任务: ${task.video_id}`);
      
      try {
        await this.tagVideo(task);
      } catch (err) {
        console.error(`[Processor] 任务执行出错 ${task.video_id}:`, err);
      }

      await this.sleep(2000); // 间隔避免 API 限制
    }

    this.isProcessing = false;
    console.log(`[Processor] 队列处理完成\n`);
  }

  // 打标单个视频
  async tagVideo(task) {
    const { video_id, project_id, gemini_api_key } = task;
    
    try {
      console.log(`[Tagging] --- 开始打标任务: ${video_id} ---`);

      // 1. 准备视频文件 (10%)
      await VideoModel.updateVideoTaggingStatus(video_id, 'processing', 10);
      const video = await VideoModel.getVideoById(video_id);
      if (!video || !video.local_path) throw new Error('视频文件记录不存在');

      const videoPath = path.join(__dirname, '../../storage', video.local_path);
      if (!fs.existsSync(videoPath)) throw new Error(`视频物理文件不存在: ${videoPath}`);

      const videoBuffer = fs.readFileSync(videoPath);
      const base64Video = videoBuffer.toString('base64');
      console.log(`[Tagging] 视频文件读取成功: ${videoPath} (${videoBuffer.length} bytes)`);

      // 2. 获取标签体系 (30%)
      await VideoModel.updateVideoTaggingStatus(video_id, 'processing', 30);
      const taxonomy = await TagModel.getAllTagCategoriesWithTags();
      console.log(`[Tagging] 标签体系加载成功: ${taxonomy.length} 个维度`);

      // 3. 调用 Gemini AI (50%)
      await VideoModel.updateVideoTaggingStatus(video_id, 'processing', 50);
      console.log(`[Tagging] 正在发起 Gemini API 请求...`);
      
      const analysisResults = await this.analyzeVideoWithGemini(
        gemini_api_key,
        base64Video,
        'video/mp4',
        taxonomy
      );

      const detectedCount = analysisResults.filter(r => r.detected).length;
      console.log(`[Tagging] Gemini 分析完成: 总计 ${analysisResults.length} 个标签，检测到 ${detectedCount} 个匹配`);

      // 4. 保存结果 (80%)
      await VideoModel.updateVideoTaggingStatus(video_id, 'processing', 80);
      await this.saveTagResults(video_id, project_id, analysisResults, taxonomy);
      console.log(`[Tagging] 结果保存到数据库成功`);

      // 5. 完成 (100%)
      await VideoModel.updateVideoTaggingStatus(video_id, 'completed', 100);
      console.log(`[Tagging] --- 任务成功结束: ${video_id} ---\n`);

    } catch (error) {
      console.error(`[Tagging] ❌ 任务失败 ${video_id}:`, error.message);
      await VideoModel.updateVideoTaggingStatus(video_id, 'error', 0, error.message);
    }
  }

  // 核心逻辑：调用 Gemini API (严格参考前端)
  async analyzeVideoWithGemini(apiKey, base64Video, mimeType, taxonomy) {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    // 构建标签体系上下文
    let taxonomyContext = "You must analyze the video against the following Content Tag Taxonomy (内容标签体系). This is a strict classification task.\n\n";
    const allTagNames = [];

    taxonomy.forEach((cat, index) => {
      taxonomyContext += `${index + 1}. Dimension: ${cat.name}\n`;
      taxonomyContext += `   Tags: [${cat.tags.join(', ')}]\n`;
      allTagNames.push(...cat.tags);
    });

    const prompt = `
Role: You are a professional beauty industry analyst specializing in short video content for the brand "Elixir" (怡丽丝尔).
Task: Analyze the provided video strictly against the Content Tag Taxonomy.

${taxonomyContext}

STRICT INSTRUCTIONS:
1. ONLY detect a tag if there is CLEAR and UNDENIABLE visual or audio evidence in the video. 
2. BE CONSERVATIVE. It is better to miss a tag than to provide a false positive.
3. LOGICAL CONSISTENCY: 
   - A video cannot be both "Professional/Expert" (专业人士) and "Ordinary Person" (素人真实) unless both are clearly shown.
   - If it's a "Vlog", it usually shouldn't be a "Livestream Clip" (直播剪辑).
4. BRAND FOCUS: The video is for Elixir. Focus on how the product is presented (textures, massage techniques, skin results).

Output Format:
You MUST return a valid JSON object with EXACTLY this structure:
{
  "detected_tags": ["TagName1", "TagName2"]
}
`;

    console.log(`[Gemini] 发送分析请求 (Model: gemini-3-pro-preview)...`);
    
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-pro-preview",
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Video,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      const text = response.text;
      console.log(`[Gemini] 收到原始响应:`, text);
      
      if (!text) throw new Error("Gemini API 返回了空内容");

      let detectedTagNames = [];
      try {
        let cleanText = text.trim();
        // 兼容处理可能出现的 Markdown 标记
        if (cleanText.startsWith('```')) {
          cleanText = cleanText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        }
        
        const json = JSON.parse(cleanText);
        detectedTagNames = json.detected_tags || (Array.isArray(json) ? json : []);
      } catch (parseError) {
        console.warn(`[Gemini] JSON 解析失败，尝试正则提取:`, parseError.message);
        const matches = text.match(/"([^"]+)"/g);
        if (matches) {
          detectedTagNames = matches.map(s => s.replace(/"/g, ''));
        }
      }

      // 构建最终结果列表 (包含所有标签的 true/false 状态)
      return allTagNames.map(tagName => ({
        tag: tagName,
        detected: detectedTagNames.includes(tagName)
      }));

    } catch (apiError) {
      console.error(`[Gemini] ❌ API 请求发生异常:`, apiError);
      throw apiError;
    }
  }

  // 保存所有标签结果到数据库
  async saveTagResults(videoId, projectId, analysisResults, taxonomy) {
    await VideoModel.deleteVideoTags(videoId);

    const tagsToInsert = [];
    for (const result of analysisResults) {
      const category = taxonomy.find(cat => cat.tags.includes(result.tag));
      if (category) {
        tagsToInsert.push({
          video_id: videoId,
          project_id: projectId,
          tag_category_id: category.id,
          tag_name: result.tag,
          confidence: result.detected ? 1.0 : 0.0
        });
      }
    }

    if (tagsToInsert.length > 0) {
      await VideoModel.saveVideoTags(tagsToInsert);
      const detectedCount = tagsToInsert.filter(t => t.confidence > 0).length;
      console.log(`[Database] 成功保存 ${tagsToInsert.length} 个标签状态 (命中 ${detectedCount} 个)`);
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getQueueStatus() {
    return {
      queue_length: this.taggingQueue.length,
      is_processing: this.isProcessing,
      pending_videos: this.taggingQueue.map(item => item.video_id)
    };
  }
}

const videoTaggerService = new VideoTaggerService();
export default videoTaggerService;
