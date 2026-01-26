import React, { useState, useEffect } from 'react';
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
              下载项目数据 (CSV)
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

      {/* 视频播放模态框 */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 relative">
              {/* 关闭按钮 */}
              <button
                onClick={() => setSelectedVideo(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-colors"
              >
                <X size={16} className="text-slate-500" />
              </button>
              <h3 className="text-lg font-semibold text-slate-900 mb-1 pr-10">
                {selectedVideo.title || selectedVideo.id}
              </h3>
              {selectedVideo.title && (
                <p className="text-xs text-slate-400 font-data mb-4">ID: {selectedVideo.id}</p>
              )}
              <div className="mb-4">
                <video
                  controls
                  className="w-full rounded-lg bg-black"
                  src={`http://localhost:3001/storage/${selectedVideo.local_path}`}
                >
                  您的浏览器不支持视频播放
                </video>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-data uppercase mb-0.5">文件大小</div>
                  <div className="text-base font-semibold text-slate-700">
                    {(selectedVideo.file_size! / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                {selectedVideo.duration && (
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                    <div className="text-[10px] text-slate-400 font-data uppercase mb-0.5">时长</div>
                    <div className="text-base font-semibold text-slate-700">{selectedVideo.duration}秒</div>
                  </div>
                )}
              </div>

              {/* 显示该视频的指标 */}
              {videoMetrics[selectedVideo.id] && (
                <div className="mb-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-md flex items-center justify-center">
                      <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <h4 className="text-sm font-semibold text-slate-700">业务指标</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(videoMetrics[selectedVideo.id]).map(([key, value]) => (
                      <div key={key} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <div className="text-[10px] text-slate-400 font-data uppercase mb-0.5">{key}</div>
                        <div className="text-base font-semibold text-slate-700">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 显示AI标签/主动挖掘标签 */}
              {videoTags[selectedVideo.id]?.ai_tagging_status === 'completed' && (
                <div className="pt-4 border-t border-slate-100 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 bg-emerald-100 rounded-md flex items-center justify-center">
                        <Tag className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <h4 className="text-sm font-semibold text-slate-700">
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
                              <div key={cat} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                                <div className="text-xs font-medium text-slate-500 mb-2">{cat}</div>
                                <div className="flex flex-wrap gap-1.5">
                                  {grouped[cat].map((tag: any, index: number) => (
                                    <span
                                      key={`${cat}-${tag.tag_name}-${index}`}
                                      className="text-xs font-medium bg-white text-slate-600 px-2 py-1 rounded border border-slate-200"
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
                      <div className="space-y-1.5">
                        {videoTags[selectedVideo.id].tags?.map((tag: any, index: number) => {
                          const isDetected = tag.confidence > 0;
                          return (
                            <div key={tag.id || `${tag.tag_category_id}-${tag.tag_name}-${index}`}
                                 className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                                   isDetected
                                     ? 'bg-emerald-50 border border-emerald-100'
                                     : 'bg-slate-50 border border-slate-100'
                                 }`}>
                              {isDetected ? (
                                <CheckCircle size={14} className="text-emerald-500" />
                              ) : (
                                <X size={14} className="text-slate-300" />
                              )}
                              <span className={`text-sm flex-1 ${isDetected ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                                {tag.tag_name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-data">
                                {tag.category_name}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 叙事洞察 */}
                  {(videoTags[selectedVideo.id]?.first5s_analysis || videoTags[selectedVideo.id]?.video_summary) && (
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      {videoTags[selectedVideo.id]?.first5s_analysis && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 bg-blue-100 rounded flex items-center justify-center">
                              <span className="text-[9px] text-blue-600 font-bold font-data">5s</span>
                            </div>
                            <h5 className="text-xs font-semibold text-slate-700">前5秒拆解</h5>
                          </div>
                          {renderFirstFiveSeconds(videoTags[selectedVideo.id].first5s_analysis)}
                        </div>
                      )}
                      {videoTags[selectedVideo.id]?.video_summary && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-5 h-5 bg-violet-100 rounded flex items-center justify-center">
                              <FileText size={10} className="text-violet-600" />
                            </div>
                            <h5 className="text-xs font-semibold text-slate-700">视频结构总结</h5>
                          </div>
                          {renderVideoSummary(videoTags[selectedVideo.id].video_summary)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
