import React, { useState } from 'react';
import { MOCK_ANALYSIS_RESULTS, MOCK_ANALYZED_VIDEOS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { Info, Video, Play, Tag as TagIcon, FileText, X } from 'lucide-react';

interface VideoForPlayback {
  id: string;
  title: string;
  local_path: string;
  metrics: {
    roi: number;
    clicks: number;
  };
  tags: string[];
}

const Report: React.FC = () => {
  const [activeMetric, setActiveMetric] = useState(MOCK_ANALYSIS_RESULTS[0].metricId);
  const [selectedVideo, setSelectedVideo] = useState<VideoForPlayback | null>(null);

  // 将 MOCK_ANALYZED_VIDEOS 的 ID (vid_001, vid_002, ...) 映射到 project_2 的视频文件路径
  const getVideoPath = (videoId: string): string | null => {
    // vid_001 -> vid_2_1.mp4, vid_002 -> vid_2_2.mp4, ...
    const match = videoId.match(/vid_(\d+)/);
    if (!match) return null;
    const num = parseInt(match[1], 10);
    return `project_2/videos/vid_2_${num}.mp4`;
  };

  const currentData = MOCK_ANALYSIS_RESULTS.find(m => m.metricId === activeMetric);
  // Sort descending by weight: Positive (Drivers) -> Negative (Inhibitors)
  const sortedData = currentData ? [...currentData.data].sort((a, b) => b.weight - a.weight) : [];

  return (
    <div className="p-8 space-y-6 h-screen overflow-y-auto pb-20 bg-slate-50">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
           <div className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> 已完成
           </div>
           <span className="text-slate-400 text-xs font-mono">TASK-ID: 20231024-A</span>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-slate-400" />
            分析报告: 面霜_Q3投放_Batch_A.csv
          </h2>
          <p className="text-slate-500 text-sm mt-1 ml-8">基于二项式回归模型 (Binomial Regression) 的特征权重分析</p>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1 sticky top-0 bg-slate-50 z-20 pt-2">
        {MOCK_ANALYSIS_RESULTS.map((metric) => (
          <button
            key={metric.metricId}
            onClick={() => setActiveMetric(metric.metricId)}
            className={`px-4 py-2.5 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
              activeMetric === metric.metricId
                ? 'bg-white text-emerald-700 border-emerald-500 shadow-sm'
                : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            {metric.metricName}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
              特征权重分布 (Feature Weights)
              <div className="group relative">
                <Info size={16} className="text-slate-400 cursor-help" />
                <div className="absolute hidden group-hover:block bg-slate-800 text-white text-xs p-2 rounded w-64 z-50 -left-28 top-6 shadow-xl">
                  系数大于0表示正向驱动（绿色），小于0表示负向抑制（红色）。绝对值越大影响越显著。
                </div>
              </div>
            </h3>
            <div className="flex gap-4 text-xs font-medium">
               <span className="flex items-center gap-1.5 text-emerald-600"><span className="w-3 h-3 bg-emerald-500 rounded-sm"></span> 正向驱动 (Positive)</span>
               <span className="flex items-center gap-1.5 text-rose-600"><span className="w-3 h-3 bg-rose-500 rounded-sm"></span> 负向抑制 (Negative)</span>
            </div>
          </div>

          <div className="h-[600px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={sortedData}
                margin={{ top: 5, right: 30, left: 160, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" stroke="#94a3b8" fontSize={12} tickLine={false} />
                <YAxis 
                  dataKey="feature" 
                  type="category" 
                  width={150} 
                  tick={{fontSize: 11, fill: '#475569'}}
                  interval={0}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <ReferenceLine x={0} stroke="#64748b" strokeWidth={1} />
                <Bar dataKey="weight" barSize={18} radius={[0, 3, 3, 0]}>
                  {sortedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.weight > 0 ? '#10b981' : '#f43f5e'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Insight & Data Table */}
        <div className="space-y-6 flex flex-col h-[680px]">
            {/* AI Insight Card */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 text-white p-6 rounded-xl shadow-lg relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl"></div>
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <span className="text-xl">✨</span> 
                    AI 智能洞察
                </h3>
                <div className="space-y-4 text-sm leading-relaxed text-slate-200">
                    <p>
                        对于 <strong className="text-emerald-400">{currentData?.metricName}</strong>，
                        模型识别出 <strong>{sortedData[0]?.feature}</strong> 是最关键的增长驱动因素 (权重: +{sortedData[0]?.weight})。
                    </p>
                    <p>
                        同时，需注意避免 <strong>{sortedData[sortedData.length - 1]?.feature}</strong>，
                        它对该指标表现出显著的负面影响 (权重: {sortedData[sortedData.length - 1]?.weight})。
                    </p>
                    <div className="pt-4 border-t border-slate-700/50 mt-4">
                        <p className="text-xs text-slate-400 mb-2">优化建议 (Optimization)：</p>
                        <div className="flex flex-col gap-2">
                             <div className="flex items-center gap-2 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                <span className="text-emerald-300">增加: {sortedData[0]?.feature}</span>
                             </div>
                             <div className="flex items-center gap-2 text-xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                                <span className="text-rose-300">减少: {sortedData[sortedData.length - 1]?.feature}</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Full Data Table */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col flex-1 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                   <h3 className="font-bold text-slate-700 text-sm">完整特征数据 (All Features)</h3>
                </div>
                <div className="overflow-y-auto flex-1 p-0">
                    <table className="w-full text-xs">
                        <thead className="text-slate-500 bg-slate-50 sticky top-0 shadow-sm z-10">
                            <tr>
                                <th className="text-left py-2 px-4 font-medium">特征</th>
                                <th className="text-right py-2 px-4 font-medium">权重 (Coef)</th>
                                <th className="text-right py-2 px-4 font-medium">P-Value</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sortedData.map((row, i) => (
                                <tr key={i} className="hover:bg-emerald-50/30 transition-colors">
                                    <td className="py-2.5 px-4 text-slate-700 break-words max-w-[120px]" title={row.feature}>{row.feature}</td>
                                    <td className={`py-2.5 px-4 text-right font-bold ${row.weight > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        {row.weight > 0 ? '+' : ''}{row.weight}
                                    </td>
                                    <td className="py-2.5 px-4 text-right text-slate-400 font-mono">{row.pValue}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      </div>

      {/* Video Assets List */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
          <Video size={20} className="text-emerald-600" />
          分析视频素材列表 (Analyzed Video Assets)
          <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Total: {MOCK_ANALYZED_VIDEOS.length}</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {MOCK_ANALYZED_VIDEOS.map(video => {
            const videoPath = getVideoPath(video.id);
            const hasVideo = videoPath !== null;
            
            return (
              <div 
                key={video.id} 
                className="border border-slate-100 rounded-lg p-4 hover:border-emerald-200 transition-all bg-slate-50/50 hover:bg-white hover:shadow-md group cursor-pointer"
                onClick={() => {
                  if (hasVideo) {
                    setSelectedVideo({
                      id: video.id,
                      title: video.title,
                      local_path: videoPath!,
                      metrics: video.metrics,
                      tags: video.tags
                    });
                  }
                }}
              >
                <div className="flex gap-4 mb-4">
                  <div className="w-20 h-20 rounded-lg shrink-0 overflow-hidden relative group/thumb">
                    {hasVideo ? (
                      <>
                        {/* 使用 video 标签显示第一帧作为缩略图 */}
                        <video
                          src={`http://localhost:3001/storage/${videoPath}#t=0.1`}
                          className="w-full h-full object-cover"
                          preload="metadata"
                        />
                        {/* 播放图标覆盖层 */}
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover/thumb:opacity-100 transition-opacity">
                          <Play size={24} fill="white" className="text-white" />
                        </div>
                      </>
                    ) : (
                      <div className="w-full h-full bg-slate-200 rounded-lg flex items-center justify-center text-slate-400 shrink-0 group-hover:bg-emerald-100 group-hover:text-emerald-500 transition-colors">
                        <Play size={24} fill="currentColor" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-slate-800 text-sm line-clamp-2 leading-relaxed mb-1" title={video.title}>{video.title}</h4>
                    <div className="text-[10px] text-slate-400 font-mono mb-2">ID: {video.id}</div>
                    <div className="flex gap-3 text-xs">
                       <div className="flex flex-col">
                         <span className="text-slate-400 text-[10px]">ROI</span>
                         <span className={`font-medium ${video.metrics.roi > 2 ? 'text-emerald-600' : 'text-slate-600'}`}>{video.metrics.roi}</span>
                       </div>
                       <div className="flex flex-col">
                         <span className="text-slate-400 text-[10px]">Clicks</span>
                         <span className="font-medium text-slate-600">{video.metrics.clicks.toLocaleString()}</span>
                       </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1.5">
                  {video.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-[10px] rounded-md flex items-center gap-1">
                      <TagIcon size={8} className="opacity-50" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 视频播放模态框 */}
      {selectedVideo && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedVideo(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex-1">
                {selectedVideo.title || selectedVideo.id}
              </h3>
              <button
                onClick={() => setSelectedVideo(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
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
                <span className="text-slate-400 text-xs">ROI</span>{' '}
                <div className="font-medium text-slate-900">{selectedVideo.metrics.roi}</div>
              </div>
              <div>
                <span className="text-slate-400 text-xs">Clicks</span>{' '}
                <div className="font-medium text-slate-900">{selectedVideo.metrics.clicks.toLocaleString()}</div>
              </div>
            </div>

            {/* 显示标签 */}
            {selectedVideo.tags && selectedVideo.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">标签</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedVideo.tags.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-slate-50 border border-slate-200 text-slate-600 text-xs rounded-md flex items-center gap-1">
                      <TagIcon size={10} className="opacity-50" />
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Report;