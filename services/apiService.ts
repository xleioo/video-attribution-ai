// API基础配置
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// 通用请求函数
async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    
    if (!response.ok) {
      // 404 错误不需要在控制台显示为错误（有些情况下是正常的）
      if (response.status === 404) {
        return {
          success: false,
          error: data.message || '资源不存在',
        };
      }
      throw new Error(data.message || `HTTP error! status: ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error('API请求失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

// 项目相关API
export const projectApi = {
  // 下载项目数据（CSV）
  async downloadProjectData(projectId: number): Promise<void> {
    const url = `${API_BASE_URL}/api/projects/${projectId}/download`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || '下载失败');
    }
    
    // 获取文件名
    const contentDisposition = response.headers.get('Content-Disposition');
    let fileName = `project-${projectId}-data.csv`;
    if (contentDisposition) {
      const fileNameMatch = contentDisposition.match(/filename="?(.+?)"?$/);
      if (fileNameMatch) {
        fileName = decodeURIComponent(fileNameMatch[1]);
      }
    }
    
    // 下载文件
    const blob = await response.blob();
    const url_blob = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url_blob;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url_blob);
  },

  // 获取所有项目
  async getAllProjects() {
    return request('/api/projects');
  },

  // 根据ID获取项目
  async getProjectById(id: number) {
    return request(`/api/projects/${id}`);
  },

  // 创建项目
  async createProject(projectData: { name: string; description?: string; status?: string }) {
    return request('/api/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    });
  },

  // 更新项目
  async updateProject(id: number, projectData: { name: string; description?: string; status?: string }) {
    return request(`/api/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(projectData),
    });
  },

  // 删除项目
  async deleteProject(id: number) {
    return request(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  },
};

// 标签相关API
export const tagApi = {
  // 获取所有标签分类
  async getAllTagCategories() {
    return request('/api/tags');
  },

  // 根据ID获取标签分类
  async getTagCategoryById(id: string) {
    return request(`/api/tags/${id}`);
  },

  // 创建标签分类
  async createTagCategory(categoryData: { id: string; name: string; tags: string[]; sort_order?: number }) {
    return request('/api/tags', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  },

  // 更新标签分类
  async updateTagCategory(id: string, categoryData: { name: string; tags: string[]; sort_order?: number }) {
    return request(`/api/tags/${id}`, {
      method: 'PUT',
      body: JSON.stringify(categoryData),
    });
  },

  // 删除标签分类
  async deleteTagCategory(id: string) {
    return request(`/api/tags/${id}`, {
      method: 'DELETE',
    });
  },
};

// API配置相关API
export const apiConfigApi = {
  // 获取所有API配置
  async getAllApiConfigs() {
    return request('/api/config');
  },

  // 根据配置名称获取
  async getApiConfigByName(name: string) {
    return request(`/api/config/${name}`);
  },

  // 获取活跃的API配置
  async getActiveApiConfig() {
    return request('/api/config/active');
  },

  // 创建API配置
  async createApiConfig(configData: {
    config_name: string;
    api_key: string;
    api_endpoint?: string;
    provider?: string;
    is_active?: boolean;
  }) {
    return request('/api/config', {
      method: 'POST',
      body: JSON.stringify(configData),
    });
  },

  // 更新API配置
  async updateApiConfig(
    id: number,
    configData: {
      config_name: string;
      api_key: string;
      api_endpoint?: string;
      provider?: string;
      is_active?: boolean;
    }
  ) {
    return request(`/api/config/${id}`, {
      method: 'PUT',
      body: JSON.stringify(configData),
    });
  },

  // 删除API配置
  async deleteApiConfig(id: number) {
    return request(`/api/config/${id}`, {
      method: 'DELETE',
    });
  },

  // 测试API Key
  async testApiKey(apiKey: string) {
    return request('/api/config/test', {
      method: 'POST',
      body: JSON.stringify({ api_key: apiKey }),
    });
  },
};

// 视频相关API
export const videoApi = {
  // 获取项目的视频列表
  async getProjectVideos(projectId: number) {
    return request(`/api/projects/${projectId}/videos`);
  },

  // 获取单个视频详情
  async getVideoById(videoId: string) {
    return request(`/api/videos/${videoId}`);
  },

  // 更新视频状态
  async updateVideoStatus(videoId: string, status: string, additionalData?: any) {
    return request(`/api/videos/${videoId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, ...additionalData }),
    });
  },

  // 删除视频
  async deleteVideo(videoId: string) {
    return request(`/api/videos/${videoId}`, {
      method: 'DELETE',
    });
  },

  // 获取项目状态
  async getProjectStatus(projectId: number) {
    return request(`/api/projects/${projectId}/status`);
  },

  // 开始视频打标（API Key 从数据库读取）
  async startVideoTagging(videoId: string) {
    return request(`/api/videos/${videoId}/tag`, {
      method: 'POST',
    });
  },

  // 获取视频标签
  async getVideoTags(videoId: string) {
    return request(`/api/videos/${videoId}/tags`);
  },

  // 获取打标队列状态
  async getTaggingQueueStatus() {
    return request('/api/tagging-queue/status');
  },
};

// 健康检查
export async function healthCheck() {
  return request('/health');
}
