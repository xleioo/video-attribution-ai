import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Play,
  AlertCircle,
  CheckCircle,
  Loader,
  Clock,
  Info,
  Video as VideoIcon,
  BarChart3,
  Brain,
  Table,
  Download,
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
      { key: 'ingestion', label: '数据上传', icon: '📄' },
      { key: 'video_download', label: '视频下载', icon: '⬇️' },
      { key: 'ai_tagging', label: '视频打标', icon: '🏷️' },
      { key: 'modeling', label: '归因分析', icon: '📊' },
      { key: 'completed', label: '完成', icon: '✅' },
    ];

    const currentIndex = steps.findIndex((s) => s.key === projectStatus.current_step);

    return (
      <div className="flex items-center justify-between mb-6">
        {steps.map((step, index) => (
          <React.Fragment key={step.key}>
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-xl
                  ${
                    index < currentIndex
                      ? 'bg-emerald-500 text-white'
                      : index === currentIndex
                      ? 'bg-indigo-500 text-white animate-pulse'
                      : 'bg-slate-200 text-slate-400'
                  }`}
              >
                {step.icon}
              </div>
              <p className="text-xs font-medium text-slate-700 mt-2">{step.label}</p>
              {index === currentIndex && projectStatus.estimated_time_remaining && (
                <p className="text-xs text-slate-500 mt-1">
                  预计 {projectStatus.estimated_time_remaining}
                </p>
              )}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-1 ${
                  index < currentIndex ? 'bg-emerald-500' : 'bg-slate-200'
                }`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  const renderFirstFiveSeconds = (analysis: any) => {
    if (!analysis) return null;
    return (
      <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-2">
        {Array.isArray(analysis.timeline) && analysis.timeline.length > 0 && (
          <div className="space-y-1">
            {analysis.timeline.map((item: any, idx: number) => (
              <div key={idx} className="flex items-start gap-2 text-[11px]">
                <span className="text-slate-400">{item.second}s</span>
                <span className="flex-1">{item.description}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 text-[11px]">
          {analysis.hook_strength && (
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">钩子: {analysis.hook_strength}</span>
          )}
          {analysis.highlight && (
            <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-700">亮点: {analysis.highlight}</span>
          )}
          {analysis.issue && (
            <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-700">问题: {analysis.issue}</span>
          )}
        </div>
      </div>
    );
  };

  const renderVideoSummary = (summary: any) => {
    if (!summary) return null;
    return (
      <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-2">
        {Array.isArray(summary.structure) && summary.structure.length > 0 && (
          <div className="space-y-1">
            {summary.structure.map((stage: any, idx: number) => (
              <div
                key={idx}
                className={`flex items-start gap-2 ${stage.present ? 'text-slate-700' : 'text-slate-400 line-through'}`}
              >
                <span className="font-medium w-20">{stage.stage}</span>
                <div className="flex-1">
                  <div>{stage.evidence || '未覆盖'}</div>
                  {stage.timestamp && (
                    <div className="text-[10px] text-slate-400">{stage.timestamp}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {summary.overall_takeaway && (
          <div className="text-[11px] text-slate-500">总结：{summary.overall_takeaway}</div>
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
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
        <VideoIcon size={20} className="text-indigo-600" />
        视频资产列表 (Video Assets)
        <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
          Total: {videos.length}
        </span>
        {stats && (
          <>
            <span className="text-xs font-normal text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
              已下载: {stats.downloaded}
            </span>
            {stats.downloading > 0 && (
              <span className="text-xs font-normal text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                下载中: {stats.downloading}
              </span>
            )}
            {stats.failed > 0 && (
              <span className="text-xs font-normal text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">
                失败: {stats.failed}
              </span>
            )}
          </>
        )}
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {videos.map((video) => {
          const metrics = videoMetrics[video.id] || {};
          const isReady = video.status === 'ready';
          const isDownloading = video.status === 'downloading';
          const isError = video.status === 'error';
          
          return (
            <div
              key={video.id}
              className={`border rounded-lg p-4 transition-all ${
                isReady
                  ? 'border-emerald-200 bg-emerald-50/30 hover:bg-white hover:shadow-md cursor-pointer group'
                  : isDownloading
                  ? 'border-blue-200 bg-blue-50/30'
                  : isError
                  ? 'border-rose-200 bg-rose-50/30'
                  : 'border-slate-100 bg-slate-50/50'
              }`}
              onClick={() => isReady && setSelectedVideo(video)}
            >
              <div className="flex gap-4 mb-4">
                {/* 视频缩略图/状态图标 */}
                <div className="w-24 h-24 rounded-lg shrink-0 overflow-hidden relative group/thumb">
                  {isReady && video.local_path ? (
                    <>
                      {/* 使用 video 标签显示第一帧作为缩略图 */}
                      <video
                        src={`http://localhost:3001/storage/${video.local_path}#t=0.1`}
                        className="w-full h-full object-cover"
                        preload="metadata"
                      />
                      {/* 播放图标覆盖层 */}
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                        <Play size={24} fill="white" className="text-white" />
                      </div>
                    </>
                  ) : (
                    <div
                      className={`w-full h-full flex items-center justify-center ${
                        isDownloading
                          ? 'bg-blue-100 text-blue-600'
                          : isError
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      {isDownloading && <Loader size={24} className="animate-spin" />}
                      {isError && <AlertCircle size={24} />}
                      {!isReady && !isDownloading && !isError && <Clock size={24} />}
                    </div>
                  )}
                </div>

                {/* 视频信息 */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 text-sm line-clamp-2 leading-relaxed mb-1">
                    {video.title || video.id}
                  </h4>
                  {video.title && (
                    <div className="text-[10px] text-slate-400 mb-1 truncate">
                      ID: {video.id}
                    </div>
                  )}
                  <div className="text-[10px] text-slate-400 mb-2">
                    {isReady && '可播放'}
                    {isDownloading && `下载中 ${video.progress}%`}
                    {isError && '下载失败'}
                    {!isReady && !isDownloading && !isError && '等待下载'}
                  </div>

                  {/* 显示指标数据 */}
                  <div className="flex flex-wrap gap-2 text-xs">
                    {Object.entries(metrics).map(([key, value]) => (
                      <div key={key} className="flex flex-col">
                        <span className="text-slate-400 text-[10px] uppercase">{key}</span>
                        <span className="font-medium text-slate-700">{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* 下载进度条 */}
                  {isDownloading && (
                    <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 transition-all duration-300"
                        style={{ width: `${video.progress}%` }}
                      />
                    </div>
                  )}

                  {/* 错误信息 */}
                  {isError && video.error_message && (
                    <p className="mt-2 text-[10px] text-rose-600 line-clamp-2">
                      {video.error_message}
                    </p>
                  )}

                  {/* 文件信息 */}
                  {isReady && video.file_size && (
                    <div className="mt-2 text-[10px] text-slate-400">
                      {(video.file_size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  )}
                </div>
              </div>

              {/* 打标按钮和标签显示 */}
              {isReady && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  {videoTags[video.id]?.ai_tagging_status === 'completed' ? (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-emerald-600">✓ 已打标</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartTagging(video.id);
                          }}
                          className="text-[10px] text-indigo-600 hover:text-indigo-700"
                        >
                          重新打标
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          const tags = videoTags[video.id]?.tags || [];
                          // comparison：只显示命中标签；discovery：tags 本身就是“发现到”的标签
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
                                  className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded"
                                >
                                  {tag.tag_name}
                                </span>
                              ))}
                              {remainingCount > 0 && (
                                <span className="text-[10px] text-slate-400">
                                  +{remainingCount}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  ) : videoTags[video.id]?.ai_tagging_status === 'processing' ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-blue-600">
                        <Loader className="w-3 h-3 animate-spin" />
                        <span>AI打标中...</span>
                        {videoTags[video.id]?.ai_tagging_progress > 0 && (
                          <span className="text-[10px]">
                            {videoTags[video.id].ai_tagging_progress}%
                          </span>
                        )}
                      </div>
                      {videoTags[video.id]?.ai_tagging_progress > 0 && (
                        <div className="w-full bg-slate-200 rounded-full h-1">
                          <div
                            className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                            style={{ width: `${videoTags[video.id].ai_tagging_progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ) : videoTags[video.id]?.ai_tagging_status === 'error' ? (
                    <div>
                      <div className="text-xs text-rose-600 mb-1">打标失败</div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartTagging(video.id);
                        }}
                        className="text-xs text-indigo-600 hover:text-indigo-700"
                      >
                        重试
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartTagging(video.id);
                      }}
                      className="w-full py-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-colors"
                    >
                      🏷️ 视频打标
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {videos.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <VideoIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p>暂无视频数据</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="h-screen overflow-y-auto bg-slate-50 p-8 pb-20">
      {/* 头部 */}
      <header className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors mb-4"
        >
          <ArrowLeft className="w-5 h-5" />
          返回项目列表
        </button>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${
                analysisCompleted 
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-blue-100 text-blue-700'
              }`}>
                <div className={`w-1.5 h-1.5 rounded-full ${
                  analysisCompleted ? 'bg-emerald-500' : 'bg-blue-500 animate-pulse'
                }`}></div>
                {analysisCompleted ? '已完成' : '处理中'}
              </div>
              <span className="text-slate-400 text-xs font-mono">PROJECT-ID: {projectId}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">{project?.name || `项目 #${projectId}`}</h1>
            {project?.description && (
              <p className="text-slate-600 text-sm mt-1">{project.description}</p>
            )}
          </div>
        </div>
      </header>

      {/* 进度步骤条 */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        {renderProgressStepper()}
        {projectStatus && projectStatus.current_step === 'video_download' && (
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm text-slate-600 mb-2">
              <span>视频下载进度</span>
              <span>{projectStatus.progress_percentage}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${projectStatus.progress_percentage}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>已下载: {stats?.downloaded || 0} / {stats?.total || 0}</span>
              {stats && stats.failed > 0 && (
                <span className="text-rose-600">失败: {stats.failed}</span>
              )}
            </div>
          </div>
        )}
        
        {/* 数据下载按钮 - 只在所有视频完成打标后显示 */}
        {allVideosTagged && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={handleDownloadData}
              className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors shadow-md hover:shadow-lg"
            >
              <Download size={20} />
              <span>下载项目数据 (CSV)</span>
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
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1 mb-6">
          {metricKeys.map((metricKey) => (
            <button
              key={metricKey}
              onClick={() => setActiveMetric(metricKey)}
              className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
                activeMetric === metricKey
                  ? 'bg-white text-emerald-700 border-emerald-500 shadow-sm'
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {metricKey.toUpperCase()}
            </button>
          ))}
        </div>
      )}

      {/* 分析报告区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* 特征权重分布区域（左侧大区域）*/}
        <div className="lg:col-span-2 bg-slate-100 p-6 rounded-xl shadow-sm border border-slate-200 min-h-[600px] flex flex-col items-center justify-center">
          <BarChart3 className="w-16 h-16 text-slate-300 mb-4" />
          <h3 className="font-bold text-slate-400 mb-2">特征权重分布 (Feature Weights)</h3>
          <p className="text-sm text-slate-400 text-center max-w-md">
            {analysisReady 
              ? '归因分析进行中，请稍候...' 
              : '等待视频下载完成后，将自动开始AI分析'}
          </p>
          {!analysisReady && stats && (
            <div className="mt-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin" />
                <span>下载进度: {stats.downloaded} / {stats.total}</span>
              </div>
            </div>
          )}
        </div>

        {/* 右侧区域 */}
        <div className="space-y-6 flex flex-col h-[600px]">
          {/* AI 智能洞察 */}
          <div className="bg-slate-100 p-6 rounded-xl shadow-sm border border-slate-200 flex-1 flex flex-col items-center justify-center">
            <Brain className="w-12 h-12 text-slate-300 mb-3" />
            <h3 className="font-bold text-slate-400 mb-2 text-center">AI 智能洞察</h3>
            <p className="text-xs text-slate-400 text-center">
              分析完成后将显示智能推荐
            </p>
          </div>

          {/* 完整特征数据 */}
          <div className="bg-slate-100 rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1">
            <div className="p-4 border-b border-slate-200 bg-slate-50/50 rounded-t-xl">
              <h3 className="font-bold text-slate-400 text-sm flex items-center gap-2">
                <Table className="w-4 h-4" />
                完整特征数据 (All Features)
              </h3>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <p className="text-xs text-slate-400">等待分析结果...</p>
            </div>
          </div>
        </div>
      </div>

      {/* 视频播放模态框 */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">
                {selectedVideo.title || selectedVideo.id}
              </h3>
              {selectedVideo.title && (
                <p className="text-xs text-slate-500 mb-4">ID: {selectedVideo.id}</p>
              )}
              <video
                controls
                className="w-full max-w-[300px] mx-auto rounded-lg"
                src={`http://localhost:3001/storage/${selectedVideo.local_path}`}
              >
                您的浏览器不支持视频播放
              </video>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-600">
                <div>
                  <span className="text-slate-400 text-xs">文件大小:</span>{' '}
                  <div className="font-medium text-slate-900">
                    {(selectedVideo.file_size! / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                {selectedVideo.duration && (
                  <div>
                    <span className="text-slate-400 text-xs">时长:</span>{' '}
                    <div className="font-medium text-slate-900">{selectedVideo.duration}秒</div>
                  </div>
                )}
              </div>

              {/* 显示该视频的指标 */}
              {videoMetrics[selectedVideo.id] && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">业务指标</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(videoMetrics[selectedVideo.id]).map(([key, value]) => (
                      <div key={key} className="bg-slate-50 rounded-lg p-3">
                        <div className="text-xs text-slate-500 uppercase mb-1">{key}</div>
                        <div className="text-base font-bold text-slate-900">{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 显示AI标签/主动挖掘标签 */}
              {videoTags[selectedVideo.id]?.ai_tagging_status === 'completed' && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-700 mb-3">
                      {taggingMode === 'discovery' ? '主动挖掘：视频元素标签' : 'AI 内容标签分析'}
                    </h4>

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
                              <div key={cat}>
                                <div className="text-xs text-slate-500 mb-2">{cat}</div>
                                <div className="flex flex-wrap gap-1">
                                  {grouped[cat].map((tag: any, index: number) => (
                                    <span
                                      key={`${cat}-${tag.tag_name}-${index}`}
                                      className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded"
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
                      <div className="space-y-2">
                        {videoTags[selectedVideo.id].tags?.map((tag: any, index: number) => {
                          const isDetected = tag.confidence > 0;
                          return (
                            <div key={tag.id || `${tag.tag_category_id}-${tag.tag_name}-${index}`} className="flex items-center gap-2">
                              <span className={isDetected ? "text-emerald-600" : "text-slate-300"}>
                                {isDetected ? "✓" : "✗"}
                              </span>
                              <span className={`text-xs ${isDetected ? "text-slate-700 font-medium" : "text-slate-400"}`}>
                                {tag.tag_name}
                              </span>
                              <span className="text-[10px] text-slate-400">({tag.category_name})</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 叙事洞察 */}
                  {(videoTags[selectedVideo.id]?.first5s_analysis || videoTags[selectedVideo.id]?.video_summary) && (
                    <div className="space-y-4">
                      {videoTags[selectedVideo.id]?.first5s_analysis && (
                        <div>
                          <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">前5秒拆解</h5>
                          {renderFirstFiveSeconds(videoTags[selectedVideo.id].first5s_analysis)}
                        </div>
                      )}
                      {videoTags[selectedVideo.id]?.video_summary && (
                        <div>
                          <h5 className="text-xs font-semibold text-slate-500 uppercase mb-2">视频结构总结</h5>
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
