import React, { useState, useEffect } from 'react';
import { Plus, FolderOpen, Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { projectApi } from '../services/apiService';
import type { Project } from '../types';
import ProjectWizard from './ProjectWizard';
import ProjectDetail from './ProjectDetail';

const ProjectList: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // 加载项目列表
  const loadProjects = async () => {
    try {
      const response = await projectApi.getAllProjects();
      if (response.success && response.data) {
        setProjects(response.data as Project[]);
      }
    } catch (error) {
      console.error('加载项目列表失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  // 处理项目创建成功
  const handleProjectCreated = (projectId: number) => {
    setShowWizard(false);
    loadProjects();
    // 自动打开新建的项目
    setTimeout(() => {
      setSelectedProjectId(projectId);
    }, 500);
  };

  // 如果选择了项目，显示项目详情
  if (selectedProjectId) {
    return (
      <ProjectDetail
        projectId={selectedProjectId}
        onBack={() => {
          setSelectedProjectId(null);
          loadProjects(); // 刷新列表
        }}
      />
    );
  }

  // 渲染步骤状态图标
  const getStepIcon = (step: string, project: Project) => {
    // 检查视频下载是否完成
    const videoDownloadComplete = project.downloaded_videos + project.failed_videos === project.total_videos;

    switch (step) {
      case 'ingestion':
        return <Clock className="w-5 h-5 text-slate-400" />;
      case 'video_download':
        return videoDownloadComplete
          ? <CheckCircle className="w-5 h-5 text-emerald-500" />
          : <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'ai_tagging':
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'modeling':
        return <Loader className="w-5 h-5 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      default:
        return <Clock className="w-5 h-5 text-slate-400" />;
    }
  };

  // 渲染步骤名称
  const getStepName = (step: string) => {
    const names: { [key: string]: string } = {
      ingestion: '数据导入',
      video_download: '视频下载中',
      ai_tagging: 'AI标签分析',
      modeling: '归因建模',
      completed: '已完成',
    };
    return names[step] || step;
  };

  return (
    <div className="h-screen overflow-y-auto p-8">
      {/* 头部 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">项目工作台</h1>
            <p className="text-slate-500 text-sm mt-1">管理您的视频分析项目</p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            新建项目
          </button>
        </div>
      </div>

      {/* 项目列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-slate-500 text-sm mt-3">加载项目中...</p>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">暂无项目</h3>
          <p className="text-slate-500 text-sm mb-6">
            点击"新建项目"按钮开始创建您的第一个视频分析项目
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            新建项目
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className="bg-white rounded-xl hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden border border-slate-200 hover:border-slate-300"
            >
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 truncate">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-slate-500 line-clamp-1 mt-0.5">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <div className="ml-3 flex-shrink-0">{getStepIcon(project.current_step, project)}</div>
                </div>

                <div className="space-y-3">
                  {/* 进度条 */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="text-slate-500">{getStepName(project.current_step)}</span>
                      <span className="font-medium text-slate-700 font-data">
                        {project.progress_percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-300"
                        style={{ width: `${project.progress_percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* 统计信息 */}
                  <div className="flex items-center gap-4 text-xs pt-2 border-t border-slate-100">
                    <div className="text-slate-500">
                      总视频: <span className="font-medium text-slate-700">{project.total_videos}</span>
                    </div>
                    <div className="text-slate-500">
                      已下载: <span className="font-medium text-emerald-600">{project.downloaded_videos}</span>
                    </div>
                    {project.failed_videos > 0 && (
                      <div className="text-slate-500">
                        失败: <span className="font-medium text-red-500">{project.failed_videos}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-5 py-2.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>{new Date(project.created_at).toLocaleDateString('zh-CN')}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                  project.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                }`}>
                  {project.status === 'active' ? '进行中' : project.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 项目创建向导 */}
      {showWizard && (
        <ProjectWizard
          onClose={() => setShowWizard(false)}
          onSuccess={handleProjectCreated}
        />
      )}
    </div>
  );
};

export default ProjectList;
