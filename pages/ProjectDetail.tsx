import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Play,
  AlertCircle,
  CheckCircle,
  Loader,
  Clock,
  Video as VideoIcon,
  BarChart3,
  Brain,
  Table,
  Download,
  Upload,
  Tag,
  FileText,
  Sparkles,
  Target,
  TrendingUp,
  HardDrive,
  RefreshCw,
  X,
  Zap,
  Clapperboard,
  Star,
  Trophy,
  Hand,
  Megaphone,
  ChevronRight,
  Eye,
  Lightbulb,
  AlertTriangle,
  Film,
} from 'lucide-react';
import { videoApi, projectApi, apiConfigApi } from '../services/apiService';
import type { Video, VideoStats, ProjectStatus, Project } from '../types';

interface ProjectDetailProps {
  projectId: number;
  onBack: () => void;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ projectId, onBack }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [stats, setStats] = useState<VideoStats | null>(null);
  const [projectStatus, setProjectStatus] = useState<ProjectStatus | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeMetric, setActiveMetric] = useState<string | null>(null);
  const [videoMetrics, setVideoMetrics] = useState<{ [key: string]: any }>({});
  const [videoTags, setVideoTags] = useState<{ [key: string]: any }>({});
  const [taggingMode, setTaggingMode] = useState<'comparison' | 'discovery'>('comparison');

  // 加载项目信息
  const loadProject = async () => {
    try {
      const response = await projectApi.getProjectById(projectId);
      if (response.success && response.data) {
        setProject(response.data as Project);
        
        // 设置指标选项
        const mapping = response.data.column_mapping;
        if (mapping?.metrics && Object.keys(mapping.metrics).length > 0) {
          const firstMetric = Object.keys(mapping.metrics)[0];
          setActiveMetric(firstMetric);
        }
      }
    } catch (error) {
      console.error('加载项目信息失败:', error);
    }
  };

  // 加载视频列表
  const loadVideos = async () => {
    try {
      const response = await videoApi.getProjectVideos(projectId);
      if (response.success && response.data) {
        const videosData = response.data.videos;
        setVideos(videosData);
        setStats(response.data.summary);
        
        // 使用后端返回的指标数据，不再循环调用详情接口
        const metricsMap: { [key: string]: any } = {};
        for (const video of videosData) {
          if (video.metrics) {
            const metricsObj: any = {};
            video.metrics.forEach((m: any) => {
              metricsObj[m.metric_name] = m.metric_value;
            });
            metricsMap[video.id] = metricsObj;
          }
        }
        setVideoMetrics(metricsMap);
        
        return videosData; // 返回视频数据供后续使用
      }
      return [];
    } catch (error) {
      console.error('加载视频列表失败:', error);
      return [];
    }
  };

  // 加载项目状态
  const loadProjectStatus = async () => {
    try {
      const response = await videoApi.getProjectStatus(projectId);
      if (response.success && response.data) {
        setProjectStatus(response.data);
      }
    } catch (error) {
      console.error('加载项目状态失败:', error);
    }
  };

  // 初始加载
  useEffect(() => {
    const initLoad = async () => {
      setIsLoading(true);
      // 加载当前打标模式（全局设置）
      try {
        const cfg = await apiConfigApi.getActiveApiConfig();
        if (cfg?.success && cfg.data && (cfg.data as any).tagging_mode) {
          setTaggingMode((cfg.data as any).tagging_mode);
        }
      } catch (e) {
        // 没有配置或 404 时，默认 comparison
      }
      await loadProject();
      await loadProjectStatus();
      const videosData = await loadVideos();
      // 初始加载完成后，加载所有已打标或正在打标的视频的标签信息
      await loadAllVideoTags(videosData);
      setIsLoading(false);
    };
    initLoad();
  }, [projectId]);

  // 初始加载所有视频的标签信息
  const loadAllVideoTags = async (videosData?: any[]) => {
    const videosToCheck = videosData || videos;
    const videosNeedingTags = videosToCheck.filter((v: any) => 
      v.status === 'ready' && 
      (v.ai_tagging_status === 'completed' || v.ai_tagging_status === 'processing')
    );
    
    console.log(`📋 初始加载：发现 ${videosNeedingTags.length} 个视频需要加载标签信息`);
    
    for (const video of videosNeedingTags) {
      try {
        const response = await videoApi.getVideoTags(video.id);
        if (response.success && response.data) {
          setVideoTags(prev => ({
            ...prev,
            [video.id]: response.data
          }));
        }
      } catch (err) {
        console.log(`无法加载视频 ${video.id} 的标签信息`);
      }
    }
  };

  // 智能轮询：只在有任务进行时才轮询
  useEffect(() => {
    // 检查是否有正在进行的任务
    const hasDownloadingVideos = videos.some(v => v.status === 'downloading' || v.status === 'pending');
    const hasTaggingVideos = videos.some(v => v.ai_tagging_status === 'processing');
    
    // 如果没有任何进行中的任务，不启动轮询
    if (!hasDownloadingVideos && !hasTaggingVideos) {
      console.log('⏸️ 没有进行中的任务，停止轮询');
      return;
    }

    console.log('🔄 检测到进行中的任务，启动轮询...');
    const interval = setInterval(() => {
      loadVideos();
      loadProjectStatus();
      // 只在有打标任务时才加载标签
      if (hasTaggingVideos) {
        loadVideoTags();
      }
    }, 2000); // 2秒

    return () => {
      console.log('⏹️ 清理轮询定时器');
      clearInterval(interval);
    };
  }, [videos]); // 依赖 videos 状态，任务状态变化时重新评估是否需要轮询

  // 加载视频标签（只加载正在打标的视频）
  const loadVideoTags = async () => {
    // 只处理正在打标的视频
    const taggingVideos = videos.filter(v => 
      v.status === 'ready' && v.ai_tagging_status === 'processing'
    );
    
    if (taggingVideos.length === 0) return;
    
    for (const video of taggingVideos) {
      try {
        const response = await videoApi.getVideoTags(video.id);
        if (response.success && response.data) {
          setVideoTags(prev => ({
            ...prev,
            [video.id]: response.data
          }));
        }
      } catch (err) {
        console.log(`无法加载视频 ${video.id} 的标签信息`);
      }
    }
  };

  // 开始视频打标
  const handleStartTagging = async (videoId: string) => {
    if (!confirm('确认开始对此视频进行AI打标？')) {
      return;
    }

    try {
      const response = await videoApi.startVideoTagging(videoId);
      if (response.success) {
        alert('视频已加入打标队列！');
        // 立即刷新视频列表
        loadVideos();
      } else {
        alert('打标失败: ' + (response.error || response.message));
      }
    } catch (error) {
      console.error('打标失败:', error);
      alert('打标失败，请确保已在设置页面配置 Gemini API Key');
    }
  };

  // 渲染进度步骤
  const renderProgressStepper = () => {
    if (!projectStatus) return null;

    const steps = [
      { key: 'ingestion', label: '数据上传', Icon: Upload },
      { key: 'video_download', label: '视频下载', Icon: Download },
      { key: 'ai_tagging', label: '视频打标', Icon: Tag },
      { key: 'modeling', label: '归因分析', Icon: BarChart3 },
      { key: 'completed', label: '完成', Icon: CheckCircle },
    ];

    const currentIndex = steps.findIndex((s) => s.key === projectStatus.current_step);

    return (
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                  index < currentIndex
                    ? 'bg-blue-600 text-white'
                    : index === currentIndex
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                <step.Icon size={20} />
              </div>
              <p className={`text-xs font-medium mt-2 transition-all ${
                index <= currentIndex ? 'text-slate-700' : 'text-slate-400'
              }`}>
                {step.label}
              </p>
              {index === currentIndex && projectStatus.estimated_time_remaining && (
                <p className="text-[10px] text-blue-600 mt-1 font-data font-medium">
                  {projectStatus.estimated_time_remaining}
                </p>
              )}
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 mx-3 rounded-full overflow-hidden bg-slate-200">
                <div
                  className={`h-full transition-all duration-500 bg-blue-600`}
                  style={{ width: index < currentIndex ? '100%' : '0%' }}
                />
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // 视频结构阶段调色板 - 预设10个不同的颜色，按stage在视频中的顺序依次分配
  const stagePalette = [
    { icon: Clapperboard, color: 'text-rose-600', bgColor: 'bg-rose-500', lightBg: 'bg-rose-50', borderColor: 'border-rose-200' },
    { icon: Star, color: 'text-sky-600', bgColor: 'bg-sky-500', lightBg: 'bg-sky-50', borderColor: 'border-sky-200' },
    { icon: Trophy, color: 'text-teal-600', bgColor: 'bg-teal-500', lightBg: 'bg-teal-50', borderColor: 'border-teal-200' },
    { icon: Hand, color: 'text-violet-600', bgColor: 'bg-violet-500', lightBg: 'bg-violet-50', borderColor: 'border-violet-200' },
    { icon: Megaphone, color: 'text-amber-600', bgColor: 'bg-amber-500', lightBg: 'bg-amber-50', borderColor: 'border-amber-200' },
    { icon: Lightbulb, color: 'text-emerald-600', bgColor: 'bg-emerald-500', lightBg: 'bg-emerald-50', borderColor: 'border-emerald-200' },
    { icon: Sparkles, color: 'text-fuchsia-600', bgColor: 'bg-fuchsia-500', lightBg: 'bg-fuchsia-50', borderColor: 'border-fuchsia-200' },
    { icon: Zap, color: 'text-orange-600', bgColor: 'bg-orange-500', lightBg: 'bg-orange-50', borderColor: 'border-orange-200' },
    { icon: Film, color: 'text-pink-600', bgColor: 'bg-pink-500', lightBg: 'bg-pink-50', borderColor: 'border-pink-200' },
    { icon: Target, color: 'text-indigo-600', bgColor: 'bg-indigo-500', lightBg: 'bg-indigo-50', borderColor: 'border-indigo-200' },
  ];

  // 为视频的stages生成配置映射（按stage在数组中的索引位置分配颜色）
  const buildStageConfigMap = (stages: any[]) => {
    const configMap: Record<string, typeof stagePalette[0]> = {};

    stages.forEach((stage: any, index: number) => {
      // 根据stage在数组中的位置（索引）分配对应序号的颜色
      configMap[stage.stage] = stagePalette[index % stagePalette.length];
    });

    return configMap;
  };

  // 解析时间戳为秒数（支持多种格式：0-15s, 16-21s, 43-1m7s, 1m8s-End）
  const parseTimestamp = (timestamp: string): { start: number; end: number; duration: number } => {
    // 辅助函数：将时间字符串转换为秒数（如"1m7s" -> 67, "15s" -> 15）
    const timeToSeconds = (timeStr: string): number => {
      if (timeStr === 'End' || timeStr === 'end') {
        return -1; // 特殊标记，表示视频结束
      }

      let seconds = 0;

      // 匹配分钟（如"1m"）
      const minMatch = timeStr.match(/(\d+)m/);
      if (minMatch) {
        seconds += parseInt(minMatch[1]) * 60;
      }

      // 匹配秒（如"7s"或直接是数字"15"）
      // 注意：需要排除已经被分钟匹配的情况
      const secMatch = timeStr.match(/(\d+)s?\s*$/);
      if (secMatch) {
        // 如果已经匹配了分钟，确保不会重复计算
        const secPart = secMatch[1];
        // 检查这个数字是否是分钟部分的一部分
        if (!minMatch || !timeStr.match(new RegExp(minMatch[1] + 'm' + secPart))) {
          seconds += parseInt(secPart);
        }
      }

      return seconds;
    };

    // 尝试新格式：0-15s, 16-21s, 43-1m7s, 1m8s-End
    const newFormatMatch = timestamp.match(/^(.+?)-(.+)$/);
    if (newFormatMatch) {
      const startStr = newFormatMatch[1].trim();
      const endStr = newFormatMatch[2].trim();

      const start = timeToSeconds(startStr);
      const end = timeToSeconds(endStr);

      // 确保 duration 不为负数
      const duration = end === -1 ? 0 : Math.max(0, end - start);

      return {
        start,
        end: end === -1 ? -1 : end, // 保持 -1 标记，让调用处处理
        duration
      };
    }

    // 兼容旧格式：MM:SS-MM:SS
    const oldFormatMatch = timestamp.match(/(\d{2}):(\d{2})-(\d{2}):(\d{2})/);
    if (oldFormatMatch) {
      const startMin = parseInt(oldFormatMatch[1]);
      const startSec = parseInt(oldFormatMatch[2]);
      const endMin = parseInt(oldFormatMatch[3]);
      const endSec = parseInt(oldFormatMatch[4]);
      const start = startMin * 60 + startSec;
      const end = endMin * 60 + endSec;
      // 确保 duration 不为负数
      return { start, end, duration: Math.max(0, end - start) };
    }

    return { start: 0, end: 0, duration: 0 };
  };

  // 格式化时间显示
  const formatTime = (seconds: number): string => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  // 渲染时间轴概览
  const renderTimelineOverview = (summary: any, videoDuration?: number) => {
    if (!summary?.structure || !Array.isArray(summary.structure)) return null;

    const presentStages = summary.structure.filter((s: any) => s.present && s.timestamp);
    if (presentStages.length === 0) return null;

    // 为当前视频构建stage配置映射
    const stageConfigMap = buildStageConfigMap(summary.structure);

    // 计算总时长
    let totalDuration = videoDuration || 0;
    if (!totalDuration) {
      presentStages.forEach((stage: any) => {
        const { end } = parseTimestamp(stage.timestamp);
        // 跳过end=-1的情况（表示End）
        if (end > 0 && end > totalDuration) totalDuration = end;
      });
    }
    if (totalDuration === 0) totalDuration = 60;

    return (
      <div className="bg-slate-100 rounded-xl p-4 mb-4 border border-slate-200">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
          <span className="font-data">00:00</span>
          <span className="text-slate-400">时间轴概览</span>
          <span className="font-data">{formatTime(totalDuration)}</span>
        </div>
        <div className="relative h-10 bg-slate-200 rounded-lg overflow-hidden flex">
          {presentStages.map((stage: any, idx: number) => {
            let { start, end, duration } = parseTimestamp(stage.timestamp);

            // 如果end=-1（表示"End"），用totalDuration替换
            if (end === -1) {
              end = totalDuration;
              duration = Math.max(0, end - start);
            }
            // 确保 duration 不为负数
            duration = Math.max(0, duration);

            const widthPercent = (duration / totalDuration) * 100;
            const leftPercent = (start / totalDuration) * 100;
            const config = stageConfigMap[stage.stage] || stagePalette[0];

            return (
              <div
                key={idx}
                className={`absolute h-full ${config.bgColor} flex items-center justify-center transition-all hover:brightness-110`}
                style={{
                  left: `${leftPercent}%`,
                  width: `${Math.max(widthPercent, 5)}%`, // 最小宽度5%以确保可见
                  minWidth: '40px'
                }}
              >
                <span className="text-white text-xs font-medium truncate px-2">
                  {stage.stage.slice(0, 4)}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between mt-2">
          {presentStages.map((stage: any, idx: number) => {
            let { start, end, duration } = parseTimestamp(stage.timestamp);

            // 如果end=-1（表示"End"），用totalDuration替换
            if (end === -1) {
              end = totalDuration;
              duration = Math.max(0, end - start);
            }
            // 确保 duration 不为负数
            duration = Math.max(0, duration);

            return (
              <div key={idx} className="text-center flex-1">
                <span className="text-[10px] text-slate-500 font-data">{duration}s</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 渲染视频结构卡片
  const renderStructureCards = (summary: any) => {
    if (!summary?.structure || !Array.isArray(summary.structure)) return null;

    const presentStages = summary.structure.filter((s: any) => s.present);

    // 为当前视频构建stage配置映射
    const stageConfigMap = buildStageConfigMap(summary.structure);

    // 计算总时长（用于处理"End"的情况）
    let totalDuration = 0;
    presentStages.forEach((stage: any) => {
      if (stage.timestamp) {
        const { end } = parseTimestamp(stage.timestamp);
        if (end > 0 && end > totalDuration) totalDuration = end;
      }
    });
    if (totalDuration === 0) totalDuration = 60;

    return (
      <div className="space-y-3">
        {presentStages.map((stage: any, idx: number) => {
          const config = stageConfigMap[stage.stage] || stagePalette[0];
          const Icon = config.icon;

          // 解析时间戳并处理"End"的情况
          let duration = 0;
          if (stage.timestamp) {
            let parsed = parseTimestamp(stage.timestamp);
            if (parsed.end === -1) {
              duration = totalDuration - parsed.start;
            } else {
              duration = parsed.duration;
            }
          }

          return (
            <div
              key={idx}
              className={`bg-white rounded-xl p-4 border ${config.borderColor} hover:shadow-md transition-all`}
            >
              <div className="flex items-start gap-4">
                {/* 左侧图标和序号 */}
                <div className="flex flex-col items-center">
                  <div className={`w-12 h-12 rounded-xl ${config.lightBg} flex items-center justify-center mb-1`}>
                    <Icon size={22} className={config.color} />
                  </div>
                  <span className="text-[10px] text-slate-400 font-data">
                    {(idx + 1).toString().padStart(2, '0')}
                  </span>
                </div>

                {/* 右侧内容 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="text-sm font-semibold text-slate-800">{stage.stage}</h4>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed mb-2">
                    {stage.evidence || '暂无描述'}
                  </p>
                  {stage.timestamp && (
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                      <Clock size={12} />
                      <span className="font-data">{stage.timestamp}</span>
                      <span className="text-slate-400">({duration}s)</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // 渲染前5秒分析 - 新版本（亮色主题）
  const renderFirstFiveSecondsNew = (analysis: any) => {
    if (!analysis) return null;

    return (
      <div className="space-y-3">
        {/* 前5秒标签 */}
        {Array.isArray(analysis.tags) && analysis.tags.length > 0 && (
          <div className="bg-gradient-to-r from-violet-50 to-fuchsia-50 rounded-lg p-3 border border-violet-200">
            <div className="flex items-center gap-1.5 mb-2">
              <Tag size={12} className="text-violet-600" />
              <span className="text-[10px] text-violet-600 font-medium">开场元素标签</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {analysis.tags.map((tag: string, idx: number) => (
                <span
                  key={idx}
                  className="text-xs font-medium bg-white text-violet-700 px-2.5 py-1 rounded-full border border-violet-200 shadow-sm"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 时间线 */}
        {Array.isArray(analysis.timeline) && analysis.timeline.length > 0 && (
          <div className="space-y-2">
            {analysis.timeline.map((item: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 bg-slate-50 rounded-lg p-3 border border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-blue-600 font-data">{item.second}s</span>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed flex-1">{item.description}</p>
              </div>
            ))}
          </div>
        )}

        {/* 分析指标 */}
        <div className="grid grid-cols-3 gap-2">
          {analysis.hook_strength && (
            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
              <div className="flex items-center gap-1.5 mb-1">
                <Lightbulb size={12} className="text-emerald-600" />
                <span className="text-[10px] text-emerald-600 font-medium">钩子强度</span>
              </div>
              <p className="text-xs text-slate-700">{analysis.hook_strength}</p>
            </div>
          )}
          {analysis.highlight && (
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <div className="flex items-center gap-1.5 mb-1">
                <Eye size={12} className="text-blue-600" />
                <span className="text-[10px] text-blue-600 font-medium">亮点</span>
              </div>
              <p className="text-xs text-slate-700">{analysis.highlight}</p>
            </div>
          )}
          {analysis.issue && (
            <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle size={12} className="text-amber-600" />
                <span className="text-[10px] text-amber-600 font-medium">问题</span>
              </div>
              <p className="text-xs text-slate-700">{analysis.issue}</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 旧版渲染函数保留用于向后兼容
  const renderFirstFiveSeconds = (analysis: any) => {
    if (!analysis) return null;
    return (
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
        {Array.isArray(analysis.timeline) && analysis.timeline.length > 0 && (
          <div className="space-y-2">
            {analysis.timeline.map((item: any, idx: number) => (
              <div key={idx} className="flex items-start gap-3 text-sm">
                <span className="font-medium font-data text-blue-600 bg-blue-50 px-2 py-0.5 rounded min-w-[36px] text-center text-xs">{item.second}s</span>
                <span className="flex-1 text-slate-600 leading-relaxed">{item.description}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          {analysis.hook_strength && (
            <span className="px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 font-medium text-xs border border-emerald-200">
              钩子: {analysis.hook_strength}
            </span>
          )}
          {analysis.highlight && (
            <span className="px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 font-medium text-xs border border-blue-200">
              亮点: {analysis.highlight}
            </span>
          )}
          {analysis.issue && (
            <span className="px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 font-medium text-xs border border-amber-200">
              问题: {analysis.issue}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderVideoSummary = (summary: any) => {
    if (!summary) return null;
    return (
      <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
        {Array.isArray(summary.structure) && summary.structure.length > 0 && (
          <div className="space-y-2">
            {summary.structure.map((stage: any, idx: number) => (
              <div
                key={idx}
                className={`flex items-start gap-3 p-3 rounded-lg transition-all ${
                  stage.present
                    ? 'bg-white border border-slate-200'
                    : 'bg-slate-100 border border-slate-100 opacity-50'
                }`}
              >
                <span className={`font-medium text-xs min-w-[72px] ${
                  stage.present ? 'text-blue-600' : 'text-slate-400 line-through'
                }`}>
                  {stage.stage}
                </span>
                <div className="flex-1">
                  <div className={`text-sm leading-relaxed ${
                    stage.present ? 'text-slate-600' : 'text-slate-400'
                  }`}>
                    {stage.evidence || '未覆盖'}
                  </div>
                  {stage.timestamp && (
                    <div className="text-[10px] text-blue-500 font-data mt-1 bg-blue-50 inline-block px-1.5 py-0.5 rounded">
                      {stage.timestamp}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {summary.overall_takeaway && (
          <div className="text-sm text-slate-600 bg-amber-50 p-3 rounded-lg border border-amber-200 leading-relaxed">
            <strong className="text-amber-700">总结：</strong>{summary.overall_takeaway}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loader className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
          <p className="text-slate-600 mt-4">加载中...</p>
        </div>
      </div>
    );
  }

  // 获取指标列表
  const metrics = project?.column_mapping?.metrics || {};
  const metricKeys = Object.keys(metrics);

  // 分析是否已完成
  const analysisCompleted = projectStatus?.current_step === 'completed';
  const analysisReady = projectStatus?.current_step === 'ai_tagging' || projectStatus?.current_step === 'modeling' || analysisCompleted;

  // 检查是否所有视频都已完成打标
  const allVideosTagged = videos.length > 0 && videos.every(v => 
    v.status === 'ready' && v.ai_tagging_status === 'completed'
  );

  // 下载项目数据
  const handleDownloadData = async () => {
    if (!allVideosTagged) {
      alert('请等待所有视频完成打标后再下载数据');
      return;
    }

    try {
      await projectApi.downloadProjectData(projectId);
    } catch (error) {
      console.error('下载失败:', error);
      alert('下载失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  };

  // 视频资产列表组件
  const renderVideoAssetsList = () => (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
          <VideoIcon size={20} className="text-white" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-slate-800">视频资产列表</h3>
          <p className="text-xs text-slate-500 font-data">Video Assets Collection</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-medium font-data text-slate-600 bg-slate-100 rounded-md">
            共 <span className="text-blue-600 font-semibold">{videos.length}</span> 个
          </span>
          {stats && (
            <>
              <span className="px-2.5 py-1 text-xs font-medium font-data text-emerald-700 bg-emerald-50 rounded-md">
                已下载 {stats.downloaded}
              </span>
              {stats.downloading > 0 && (
                <span className="px-2.5 py-1 text-xs font-medium font-data text-blue-700 bg-blue-50 rounded-md">
                  下载中 {stats.downloading}
                </span>
              )}
              {stats.failed > 0 && (
                <span className="px-2.5 py-1 text-xs font-medium font-data text-red-700 bg-red-50 rounded-md">
                  失败 {stats.failed}
                </span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {videos.map((video) => {
          const metrics = videoMetrics[video.id] || {};
          const isReady = video.status === 'ready';
          const isDownloading = video.status === 'downloading';
          const isError = video.status === 'error';

          return (
            <div
              key={video.id}
              className={`relative rounded-lg p-4 transition-all duration-200 overflow-hidden ${
                isReady
                  ? 'bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md cursor-pointer'
                  : isDownloading
                  ? 'bg-blue-50/50 border border-blue-200'
                  : isError
                  ? 'bg-red-50/50 border border-red-200'
                  : 'bg-slate-50 border border-slate-200'
              }`}
              onClick={() => isReady && setSelectedVideo(video)}
            >
              <div className="flex gap-4 mb-3">
                {/* 视频缩略图/状态图标 */}
                <div className="w-24 h-24 rounded-lg shrink-0 overflow-hidden relative bg-slate-100">
                  {isReady && video.local_path ? (
                    <>
                      <video
                        src={`http://localhost:3001/storage/${video.local_path}#t=0.1`}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                          <Play size={16} fill="#3B82F6" className="text-blue-600 ml-0.5" />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center ${
                        isDownloading
                          ? 'bg-blue-100'
                          : isError
                          ? 'bg-red-100'
                          : 'bg-slate-100'
                      }`}
                    >
                      {isDownloading && <Loader size={24} className="animate-spin text-blue-600" />}
                      {isError && <AlertCircle size={24} className="text-red-500" />}
                      {!isReady && !isDownloading && !isError && <Clock size={24} className="text-slate-400" />}
                    </div>
                  )}
                </div>

                {/* 视频信息 */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-slate-900 text-sm line-clamp-2 leading-snug mb-1">
                    {video.title || video.id}
                  </h4>
                  {video.title && (
                    <div className="text-[10px] text-slate-400 mb-2 truncate font-data">
                      ID: {video.id}
                    </div>
                  )}
                  <div className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded mb-2 ${
                    isReady
                      ? 'bg-emerald-50 text-emerald-600'
                      : isDownloading
                      ? 'bg-blue-50 text-blue-600'
                      : isError
                      ? 'bg-red-50 text-red-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    {isReady && 'Ready'}
                    {isDownloading && `${video.progress}%`}
                    {isError && 'Error'}
                    {!isReady && !isDownloading && !isError && 'Pending'}
                  </div>

                  {/* 显示指标数据 */}
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(metrics).map(([key, value]) => (
                      <div key={key} className="bg-slate-50 rounded px-2 py-1 border border-slate-100">
                        <div className="text-[9px] text-slate-400 uppercase font-data">{key}</div>
                        <div className="text-xs font-semibold text-slate-700">{value}</div>
                      </div>
                    ))}
                  </div>

                  {/* 下载进度条 */}
                  {isDownloading && (
                    <div className="mt-2 h-1 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${video.progress}%` }}
                      />
                    </div>
                  )}

                  {/* 错误信息 */}
                  {isError && video.error_message && (
                    <p className="mt-2 text-xs text-red-600 bg-red-50 rounded p-2 line-clamp-2">
                      {video.error_message}
                    </p>
                  )}

                  {/* 文件信息 */}
                  {isReady && video.file_size && (
                    <div className="mt-2 text-[10px] text-slate-400 font-data flex items-center gap-1">
                      <HardDrive size={10} />
                      {(video.file_size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  )}
                </div>
              </div>

              {/* 打标按钮和标签显示 */}
              {isReady && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  {videoTags[video.id]?.ai_tagging_status === 'completed' ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                          <CheckCircle size={12} />
                          已打标
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartTagging(video.id);
                          }}
                          className="text-[10px] font-medium text-slate-500 hover:text-blue-600 flex items-center gap-1"
                        >
                          <RefreshCw size={10} />
                          重新分析
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const tags = videoTags[video.id]?.tags || [];
                          const detectedTags = taggingMode === 'comparison'
                            ? (tags.filter((t: any) => t.confidence > 0) || [])
                            : tags;
                          const displayTags = detectedTags.slice(0, 3);
                          const remainingCount = detectedTags.length - 3;

                          return (
                            <>
                              {displayTags.map((tag: any, index: number) => (
                                <span
                                  key={tag.id || `${tag.tag_category_id || tag.category_name}-${tag.tag_name}-${index}`}
                                  className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded"
                                >
                                  {tag.tag_name}
                                </span>
                              ))}
                              {remainingCount > 0 && (
                                <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-0.5 rounded">
                                  +{remainingCount}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ) : videoTags[video.id]?.ai_tagging_status === 'processing' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-medium text-blue-600">
                        <Loader className="w-3 h-3 animate-spin" />
                        <span>AI 分析中</span>
                        {videoTags[video.id]?.ai_tagging_progress > 0 && (
                          <span className="text-[10px] font-data bg-blue-50 px-1.5 py-0.5 rounded ml-auto">
                            {videoTags[video.id].ai_tagging_progress}%
                          </span>
                        )}
                      </div>
                      {videoTags[video.id]?.ai_tagging_progress > 0 && (
                        <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${videoTags[video.id].ai_tagging_progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ) : videoTags[video.id]?.ai_tagging_status === 'error' ? (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-red-600 flex items-center gap-1">
                        <AlertCircle size={12} />
                        打标失败
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartTagging(video.id);
                        }}
                        className="w-full py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <RefreshCw size={12} />
                        重试
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartTagging(video.id);
                      }}
                      className="w-full py-2 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Tag size={14} />
                      开始 AI 打标
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {videos.length === 0 && (
        <div className="text-center py-12">
          <VideoIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-sm text-slate-400">暂无视频数据</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen overflow-y-auto p-8 pb-20">
      {/* 头部 */}
      <header className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-slate-500 hover:text-blue-600 transition-colors mb-4 text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>返回项目列表</span>
        </button>

        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3">
                <div className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 ${
                  analysisCompleted
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-blue-50 text-blue-600'
                }`}>
                  {analysisCompleted ? <CheckCircle size={12} /> : <Zap size={12} />}
                  {analysisCompleted ? '已完成' : '处理中'}
                </div>
                <span className="text-slate-400 text-xs font-data">
                  ID: {projectId}
                </span>
              </div>
              <h1 className="text-xl font-semibold text-slate-900 mb-1">
                {project?.name || `项目 #${projectId}`}
              </h1>
              {project?.description && (
                <p className="text-slate-500 text-sm">{project.description}</p>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* 进度步骤条 */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        {renderProgressStepper()}
        {projectStatus && projectStatus.current_step === 'video_download' && (
          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-600">视频下载进度</span>
              <span className="font-semibold text-slate-800 font-data">{projectStatus.progress_percentage}%</span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: `${projectStatus.progress_percentage}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500 font-data">
              <span>已下载: <strong className="text-slate-700">{stats?.downloaded || 0}</strong> / {stats?.total || 0}</span>
              {stats && stats.failed > 0 && (
                <span className="text-red-500">失败: {stats.failed}</span>
              )}
            </div>
          </div>
        )}

        {/* 数据下载按钮 */}
        {allVideosTagged && (
          <div className="mt-6 pt-6 border-t border-slate-100 flex justify-center">
            <button
              onClick={handleDownloadData}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm transition-colors"
            >
              <Download size={16} />
              下载打标结果 (Excel)
            </button>
          </div>
        )}
      </div>

      {/* 视频资产列表 - 始终显示在指标栏前面 */}
      <div className="mb-6">
        {renderVideoAssetsList()}
      </div>

      {/* 指标选择 Tabs */}
      {metricKeys.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          {metricKeys.map((metricKey) => (
            <button
              key={metricKey}
              onClick={() => setActiveMetric(metricKey)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeMetric === metricKey
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:text-slate-800 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {metricKey.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* 分析报告区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        {/* 特征权重分布区域（左侧大区域）*/}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-8 min-h-[400px] flex flex-col items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-1">特征权重分布</h3>
            <p className="text-xs text-slate-400 font-data mb-3">Feature Weights Distribution</p>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {analysisReady
                ? '归因分析进行中，请稍候...'
                : '等待视频下载完成后，将自动开始AI分析'}
            </p>
            {!analysisReady && stats && (
              <div className="mt-4 inline-flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg">
                <Loader className="w-4 h-4 animate-spin text-blue-600" />
                <span className="font-data text-sm text-slate-600">
                  下载进度: <strong className="text-blue-600">{stats.downloaded}</strong> / {stats.total}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 右侧区域 */}
        <div className="space-y-5 flex flex-col">
          {/* AI 智能洞察 */}
          <div className="bg-white rounded-xl border border-slate-200 p-6 flex-1 flex flex-col items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-3 bg-blue-50 rounded-lg flex items-center justify-center">
                <Brain className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-base font-semibold text-slate-700 mb-1">AI 智能洞察</h3>
              <p className="text-xs text-slate-400 font-data">Intelligent Insights</p>
              <p className="text-sm text-slate-500 mt-2">
                分析完成后将显示智能推荐
              </p>
            </div>
          </div>

          {/* 完整特征数据 */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col flex-1 overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h3 className="font-medium text-slate-700 text-sm flex items-center gap-2">
                <div className="w-7 h-7 bg-amber-100 rounded-md flex items-center justify-center">
                  <Table className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div>
                  <div className="leading-tight">完整特征数据</div>
                  <div className="text-[10px] text-slate-400 font-data font-normal">All Features</div>
                </div>
              </h3>
            </div>
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">等待分析结果...</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 视频详情模态框 - 新设计：左右布局（亮色主题） */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-6"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 顶部标题栏 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Film size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    {selectedVideo.title || selectedVideo.id}
                  </h3>
                  {selectedVideo.title && (
                    <p className="text-xs text-slate-500 font-data">ID: {selectedVideo.id}</p>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedVideo(null)}
                className="w-10 h-10 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-colors"
              >
                <X size={18} className="text-slate-500" />
              </button>
            </div>

            {/* 主内容区域：左右布局 */}
            <div className="flex h-[calc(90vh-80px)]">
              {/* 左侧：视频播放区域 */}
              <div className="w-1/2 p-6 border-r border-slate-200 flex flex-col bg-slate-50 overflow-y-auto">
                {/* 视频播放器 */}
                <div className="relative bg-black rounded-xl overflow-hidden mb-4 flex-shrink-0">
                  <video
                    controls
                    className="w-full aspect-[9/16] max-h-[50vh] object-contain bg-black"
                    src={`http://localhost:3001/storage/${selectedVideo.local_path}`}
                  >
                    您的浏览器不支持视频播放
                  </video>
                </div>

                {/* 视频信息卡片 */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="text-[10px] text-slate-500 font-data uppercase mb-1">文件大小</div>
                    <div className="text-xl font-bold text-slate-900 font-data">
                      {(selectedVideo.file_size! / 1024 / 1024).toFixed(1)} <span className="text-sm text-slate-400">MB</span>
                    </div>
                  </div>
                  {selectedVideo.duration && (
                    <div className="bg-white rounded-xl p-4 border border-slate-200">
                      <div className="text-[10px] text-slate-500 font-data uppercase mb-1">视频时长</div>
                      <div className="text-xl font-bold text-slate-900 font-data">
                        {selectedVideo.duration} <span className="text-sm text-slate-400">秒</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 业务指标 */}
                {videoMetrics[selectedVideo.id] && Object.keys(videoMetrics[selectedVideo.id]).length > 0 && (
                  <div className="bg-white rounded-xl p-4 border border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp size={14} className="text-blue-600" />
                      <span className="text-xs font-medium text-slate-600">业务指标</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(videoMetrics[selectedVideo.id]).map(([key, value]) => (
                        <div key={key} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <div className="text-[10px] text-slate-500 font-data uppercase mb-0.5">{key}</div>
                          <div className="text-lg font-bold text-slate-900">{value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 右侧：分析标签和结论区域 */}
              <div className="w-1/2 p-6 overflow-y-auto bg-white">
                {videoTags[selectedVideo.id]?.ai_tagging_status === 'completed' ? (
                  <div className="space-y-6">
                    {/* 视频结构时间轴 - 最重要，放在最上面 */}
                    {videoTags[selectedVideo.id]?.video_summary && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-violet-100 rounded-lg flex items-center justify-center">
                            <BarChart3 size={14} className="text-violet-600" />
                          </div>
                          <h4 className="text-sm font-semibold text-slate-800">视频结构分析</h4>
                        </div>
                        {renderTimelineOverview(videoTags[selectedVideo.id].video_summary, selectedVideo.duration)}
                        {renderStructureCards(videoTags[selectedVideo.id].video_summary)}

                        {/* 总结 */}
                        {videoTags[selectedVideo.id].video_summary?.overall_takeaway && (
                          <div className="mt-4 bg-amber-50 rounded-xl p-4 border border-amber-200">
                            <div className="flex items-start gap-3">
                              <Lightbulb size={16} className="text-amber-600 mt-0.5 shrink-0" />
                              <div>
                                <span className="text-xs font-medium text-amber-700 block mb-1">内容总结</span>
                                <p className="text-sm text-slate-700 leading-relaxed">
                                  {videoTags[selectedVideo.id].video_summary.overall_takeaway}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 前5秒分析 */}
                    {videoTags[selectedVideo.id]?.first5s_analysis && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-6 h-6 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-[10px] text-blue-600 font-bold font-data">5s</span>
                          </div>
                          <h4 className="text-sm font-semibold text-slate-800">前5秒开场分析</h4>
                        </div>
                        {renderFirstFiveSecondsNew(videoTags[selectedVideo.id].first5s_analysis)}
                      </div>
                    )}

                    {/* AI内容标签 */}
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-emerald-100 rounded-lg flex items-center justify-center">
                          <Tag size={14} className="text-emerald-600" />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-800">
                          {taggingMode === 'discovery' ? '视频元素标签' : 'AI 内容标签'}
                        </h4>
                      </div>

                      {taggingMode === 'discovery' ? (
                        (() => {
                          const tags = videoTags[selectedVideo.id].tags || [];
                          const grouped: Record<string, any[]> = {};
                          tags.forEach((t: any) => {
                            const cat = t.category_name || '视频元素';
                            grouped[cat] = grouped[cat] || [];
                            grouped[cat].push(t);
                          });
                          const categories = Object.keys(grouped).sort();

                          return (
                            <div className="space-y-3">
                              {categories.map((cat) => (
                                <div key={cat} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                                  <div className="text-xs font-medium text-slate-500 mb-2">{cat}</div>
                                  <div className="flex flex-wrap gap-2">
                                    {grouped[cat].map((tag: any, index: number) => (
                                      <span
                                        key={`${cat}-${tag.tag_name}-${index}`}
                                        className="text-xs font-medium bg-white text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200"
                                      >
                                        {tag.tag_name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()
                      ) : (
                        (() => {
                          const tags = videoTags[selectedVideo.id].tags || [];
                          const detectedTags = tags.filter((t: any) => t.confidence > 0);
                          const undetectedTags = tags.filter((t: any) => t.confidence <= 0);

                          // 按类别分组已检测的标签
                          const groupedDetected: Record<string, any[]> = {};
                          detectedTags.forEach((t: any) => {
                            const cat = t.category_name || '其他';
                            groupedDetected[cat] = groupedDetected[cat] || [];
                            groupedDetected[cat].push(t);
                          });

                          return (
                            <div className="space-y-3">
                              {/* 已检测到的标签 - 按类别分组 */}
                              {Object.entries(groupedDetected).map(([cat, catTags]) => (
                                <div key={cat} className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                                  <div className="flex items-center gap-2 mb-2">
                                    <CheckCircle size={12} className="text-emerald-600" />
                                    <span className="text-xs font-medium text-emerald-700">{cat}</span>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {catTags.map((tag: any, index: number) => (
                                      <span
                                        key={`${cat}-${tag.tag_name}-${index}`}
                                        className="text-xs font-medium bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-lg"
                                      >
                                        {tag.tag_name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}

                              {/* 未检测到的标签 - 折叠显示 */}
                              {undetectedTags.length > 0 && (
                                <details className="group">
                                  <summary className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer hover:text-slate-600 transition-colors py-2">
                                    <ChevronRight size={14} className="group-open:rotate-90 transition-transform" />
                                    <span>未检测到的标签 ({undetectedTags.length})</span>
                                  </summary>
                                  <div className="flex flex-wrap gap-2 mt-2 pt-2 border-t border-slate-200">
                                    {undetectedTags.map((tag: any, index: number) => (
                                      <span
                                        key={`undetected-${tag.tag_name}-${index}`}
                                        className="text-xs text-slate-400 px-2.5 py-1 rounded-lg bg-slate-100 line-through"
                                      >
                                        {tag.tag_name}
                                      </span>
                                    ))}
                                  </div>
                                </details>
                              )}
                            </div>
                          );
                        })()
                      )}
                    </div>
                  </div>
                ) : videoTags[selectedVideo.id]?.ai_tagging_status === 'processing' ? (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mb-4">
                      <Loader size={32} className="text-blue-600 animate-spin" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-800 mb-2">AI 正在分析中</h4>
                    <p className="text-sm text-slate-500 mb-4">请稍候，这可能需要一点时间...</p>
                    {videoTags[selectedVideo.id]?.ai_tagging_progress > 0 && (
                      <div className="w-48">
                        <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                          <span>分析进度</span>
                          <span className="font-data">{videoTags[selectedVideo.id].ai_tagging_progress}%</span>
                        </div>
                        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-300"
                            style={{ width: `${videoTags[selectedVideo.id].ai_tagging_progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full">
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                      <Tag size={32} className="text-slate-400" />
                    </div>
                    <h4 className="text-lg font-semibold text-slate-800 mb-2">尚未进行 AI 分析</h4>
                    <p className="text-sm text-slate-500 mb-4">点击下方按钮开始智能分析</p>
                    <button
                      onClick={() => handleStartTagging(selectedVideo.id)}
                      className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
                    >
                      <Sparkles size={16} />
                      开始 AI 分析
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
