// API基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

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
};

// 健康检查
export async function healthCheck() {
  return request('/health');
}
