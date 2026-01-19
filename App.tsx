import React, { useState, createContext, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ProjectList from './pages/ProjectList';
import Report from './pages/Report';
import Settings from './pages/Settings';
import VideoPlayground from './pages/VideoPlayground';
import { AppContextType, TagCategory } from './types';
import { INITIAL_TAG_TAXONOMY } from './constants';
import { tagApi, apiConfigApi } from './services/apiService';

export const AppContext = createContext<AppContextType>({
  tagTaxonomy: [],
  updateTagTaxonomy: () => {},
  apiKey: null,
  setApiKey: () => {},
});

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('projects');  // 默认显示项目管理页面
  const [tagTaxonomy, setTagTaxonomy] = useState<TagCategory[]>(INITIAL_TAG_TAXONOMY);
  const [apiKey, setApiKey] = useState<string | null>(localStorage.getItem('gemini_api_key'));
  const [isLoading, setIsLoading] = useState(true);

  const updateApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('gemini_api_key', key);
  };

  // 从后端加载标签分类和API配置
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        // 加载标签分类
        const tagsResponse = await tagApi.getAllTagCategories();
        if (tagsResponse.success && tagsResponse.data) {
          setTagTaxonomy(tagsResponse.data as TagCategory[]);
        } else {
          console.warn('从后端加载标签失败，使用默认数据');
        }

        // 加载活跃的API配置（可选）
        try {
          const apiConfigResponse = await apiConfigApi.getActiveApiConfig();
          if (apiConfigResponse.success && apiConfigResponse.data) {
            const config = apiConfigResponse.data as any;
            if (config.api_key && !apiKey) {
              // 只有在本地没有API key时才使用后端的
              setApiKey(config.api_key);
            }
          }
        } catch (apiConfigError) {
          // 没有活跃的API配置是正常的，不需要报错
          console.log('没有找到活跃的API配置，将使用手动输入的API Key');
        }
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const renderPage = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-slate-600">加载中...</p>
          </div>
        </div>
      );
    }
    switch (currentPage) {
      case 'projects': return <ProjectList />;
      case 'report': return <Report />;
      case 'settings': return <Settings />;
      case 'playground': return <VideoPlayground />;
      default: return <ProjectList />;
    }
  };

  return (
    <AppContext.Provider value={{ 
      tagTaxonomy, 
      updateTagTaxonomy: setTagTaxonomy,
      apiKey,
      setApiKey: updateApiKey
    }}>
      <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
        <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
        <main className="flex-1 ml-64 relative overflow-hidden">
          {renderPage()}
        </main>
      </div>
    </AppContext.Provider>
  );
};

export default App;