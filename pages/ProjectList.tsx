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
        return <Clock className="w-5 h-5 text-blue-500" />;
      case 'video_download':
        // 如果视频下载完成，显示完成图标；否则显示旋转图标
        return videoDownloadComplete 
          ? <CheckCircle className="w-5 h-5 text-emerald-500" />
          : <Loader className="w-5 h-5 text-indigo-500 animate-spin" />;
      case 'ai_tagging':
        return <Loader className="w-5 h-5 text-purple-500 animate-spin" />;
      case 'modeling':
        return <Loader className="w-5 h-5 text-pink-500 animate-spin" />;
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
    <div className="h-screen overflow-y-auto bg-slate-50 p-8">
      {/* 头部 */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">项目工作台</h1>
            <p className="text-slate-600 mt-1">管理您的视频分析项目</p>
          </div>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition-colors shadow-lg"
          >
            <Plus className="w-5 h-5" />
            新建项目
          </button>
        </div>
      </div>

      {/* 项目列表 */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
            <p className="text-slate-600 mt-4">加载项目中...</p>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <FolderOpen className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">暂无项目</h3>
          <p className="text-slate-500 mb-6">
            点击"新建项目"按钮开始创建您的第一个视频分析项目
          </p>
          <button
            onClick={() => setShowWizard(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            新建项目
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => setSelectedProjectId(project.id)}
              className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden border border-slate-200"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1 line-clamp-1">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                  </div>
                  <div className="ml-3">{getStepIcon(project.current_step, project)}</div>
                </div>

                <div className="space-y-3">
                  {/* 进度条 */}
                  <div>
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-slate-600">{getStepName(project.current_step)}</span>
                      <span className="font-medium text-slate-900">
                        {project.progress_percentage}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-300"
                        style={{ width: `${project.progress_percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* 统计信息 */}
                  <div className="flex items-center justify-between text-sm pt-3 border-t border-slate-100">
                    <div>
                      <span className="text-slate-600">总视频:</span>
                      <span className="ml-2 font-medium text-slate-900">
                        {project.total_videos}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-600">已下载:</span>
                      <span className="ml-2 font-medium text-emerald-600">
                        {project.downloaded_videos}
                      </span>
                    </div>
                    {project.failed_videos > 0 && (
                      <div>
                        <span className="text-slate-600">失败:</span>
                        <span className="ml-2 font-medium text-rose-600">
                          {project.failed_videos}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>创建于 {new Date(project.created_at).toLocaleDateString('zh-CN')}</span>
                <span className="capitalize">{project.status}</span>
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
