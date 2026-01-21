import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Tag, Trash2, Plus, Save, X, Edit2, Check, TestTube, Loader } from 'lucide-react';
import { TagCategory } from '../types';
import { apiConfigApi } from '../services/apiService';

const Settings: React.FC = () => {
  const { tagTaxonomy, updateTagTaxonomy, apiKey, setApiKey } = useContext(AppContext);
  // Local state for edits
  const [localTaxonomy, setLocalTaxonomy] = useState<TagCategory[]>(tagTaxonomy);
  
  // State for new tag input (keyed by category ID)
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});
  
  // State for editing category names
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  
  // State for API Key testing
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  // State for tagging mode
  const [taggingMode, setTaggingMode] = useState<'comparison' | 'discovery'>('comparison');

  // 加载现有配置
  React.useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await apiConfigApi.getActiveApiConfig();
        if (response.success && response.data) {
          const config = response.data as any;
          if (config.tagging_mode) {
            setTaggingMode(config.tagging_mode);
          }
        }
      } catch (error) {
        console.log('加载配置失败:', error);
      }
    };
    loadConfig();
  }, []);

  const handleSave = async () => {
    updateTagTaxonomy(localTaxonomy);
    
    // 保存API Key和打标模式到数据库
    if (apiKey) {
      try {
        // 检查是否已有活跃配置
        const activeConfig = await apiConfigApi.getActiveApiConfig();
        
        if (activeConfig.success && activeConfig.data) {
          // 更新现有配置
          await apiConfigApi.updateApiConfig((activeConfig.data as any).id, {
            config_name: 'Gemini API',
            api_key: apiKey,
            provider: 'gemini',
            is_active: true,
            tagging_mode: taggingMode
          });
        } else {
          // 创建新配置
          await apiConfigApi.createApiConfig({
            config_name: 'Gemini API',
            api_key: apiKey,
            provider: 'gemini',
            is_active: true,
            tagging_mode: taggingMode
          });
        }
        alert("配置保存成功！");
      } catch (error) {
        console.error('保存API配置失败:', error);
        alert("标签配置已保存，但API Key保存失败");
      }
    } else {
      alert("标签配置已保存！");
    }
  };

  // 测试API Key
  const handleTestApiKey = async () => {
    if (!apiKey || !apiKey.trim()) {
      setTestResult({ success: false, message: '请先输入API Key' });
      return;
    }

    setIsTestingKey(true);
    setTestResult(null);

    try {
      const response = await apiConfigApi.testApiKey(apiKey);
      if (response.success) {
        setTestResult({ success: true, message: '✓ API Key 有效！' });
      } else {
        setTestResult({ success: false, message: '✗ API Key 无效：' + response.error });
      }
    } catch (error) {
      setTestResult({ success: false, message: '✗ 测试失败：网络错误' });
    } finally {
      setIsTestingKey(false);
    }
  };

  // --- Category Management ---

  const addCategory = () => {
    const newId = `cat_${Date.now()}`;
    const newCategory: TagCategory = {
      id: newId,
      name: 'New Category',
      tags: []
    };
    setLocalTaxonomy([...localTaxonomy, newCategory]);
    // Automatically start editing the new category name
    setEditingCatId(newId);
    setEditCatName('New Category');
  };

  const deleteCategory = (id: string) => {
    if (confirm('Are you sure you want to delete this entire category?')) {
      setLocalTaxonomy(localTaxonomy.filter(c => c.id !== id));
    }
  };

  const startEditCategory = (cat: TagCategory) => {
    setEditingCatId(cat.id);
    setEditCatName(cat.name);
  };

  const saveEditCategory = (id: string) => {
    setLocalTaxonomy(localTaxonomy.map(c => 
      c.id === id ? { ...c, name: editCatName } : c
    ));
    setEditingCatId(null);
  };

  // --- Tag Management ---

  const handleTagInputChange = (catId: string, val: string) => {
    setNewTagInputs(prev => ({ ...prev, [catId]: val }));
  };

  const addTag = (catId: string) => {
    const val = newTagInputs[catId];
    if (!val || !val.trim()) return;
    
    setLocalTaxonomy(prev => prev.map(cat => {
      if (cat.id === catId) {
        // Prevent duplicates
        if (cat.tags.includes(val.trim())) return cat;
        return { ...cat, tags: [...cat.tags, val.trim()] };
      }
      return cat;
    }));
    
    setNewTagInputs(prev => ({ ...prev, [catId]: '' }));
  };

  const removeTag = (catId: string, tagToRemove: string) => {
    setLocalTaxonomy(prev => prev.map(cat => {
      if (cat.id === catId) {
        return { ...cat, tags: cat.tags.filter(t => t !== tagToRemove) };
      }
      return cat;
    }));
  };

  return (
    <div className="p-8 space-y-8 pb-24 overflow-y-auto h-screen bg-slate-50">
      {/* Header */}
      <header className="flex justify-between items-center border-b border-slate-200 pb-6 bg-white p-6 rounded-xl shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">系统设置 (System Settings)</h2>
          <p className="text-slate-500 text-sm mt-1">
            配置内容标签体系 (Tag Taxonomy) 与 API 密钥。
            <br/>
            定义用于视频分析的标签维度与具体标签。
          </p>
        </div>
        <div className="flex gap-3">
            <button 
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors shadow-sm"
            >
            <Save size={16} />
            保存配置
            </button>
        </div>
      </header>

      {/* API Key Section */}
      <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
         <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            AI 模型配置
         </h3>
         <div className="max-w-xl space-y-4">
            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
              <div className="flex gap-2">
                <input 
                  type="password" 
                  value={apiKey || ''}
                  onChange={(e) => {
                    setApiKey(e.target.value);
                    setTestResult(null); // 清除之前的测试结果
                  }}
                  placeholder="AIza..."
                  className="flex-1 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                />
                <button
                  onClick={handleTestApiKey}
                  disabled={isTestingKey || !apiKey}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md flex items-center gap-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isTestingKey ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      测试中...
                    </>
                  ) : (
                    <>
                      <TestTube size={16} />
                      测试
                    </>
                  )}
                </button>
              </div>
              
              {/* 测试结果 */}
              {testResult && (
                <div className={`mt-2 p-2 rounded text-sm ${
                  testResult.success 
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                }`}>
                  {testResult.message}
                </div>
              )}
              
              <p className="text-xs text-slate-500 mt-2">
                用于视频打标功能中的自动化视频内容理解与标签识别。保存后所有视频打标将自动使用此 Key。
              </p>
            </div>

            {/* 打标模式选择 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">视频打标模式</label>
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="tagging_mode"
                    value="comparison"
                    checked={taggingMode === 'comparison'}
                    onChange={(e) => setTaggingMode(e.target.value as 'comparison')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-800">方式1: 对比打标</div>
                    <div className="text-xs text-slate-500 mt-1">
                      根据下方"内容标签体系配置"中已定义的标签对视频进行逐一比对，识别视频中包含的标签。
                    </div>
                  </div>
                </label>
                
                <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <input
                    type="radio"
                    name="tagging_mode"
                    value="discovery"
                    checked={taggingMode === 'discovery'}
                    onChange={(e) => setTaggingMode(e.target.value as 'discovery')}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-slate-800 flex items-center gap-2">
                      方式2: 主动挖掘
                    </div>
                    <div className="text-xs text-slate-500 mt-1">
                      AI 主动分析视频内容，挖掘并提取视频中的关键特征和元素，不限于预定义标签。
                    </div>
                  </div>
                </label>
              </div>
              
              {taggingMode === 'comparison' && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  💡 提示：当前模式下，只有在下方"内容标签体系配置"中定义的标签才会被识别。
                </div>
              )}
            </div>
         </div>
      </section>

      {/* Taxonomy Editor */}
      <div className="space-y-4">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-lg font-bold text-slate-800">内容标签体系配置</h3>
          <button 
            onClick={addCategory}
            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <Plus size={16} />
            添加新分类
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {localTaxonomy.map((category) => (
            <div key={category.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col group relative hover:border-emerald-200 transition-all">
                {/* Delete Category Button */}
                <button 
                    onClick={() => deleteCategory(category.id)}
                    className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"
                    title="删除该分类"
                >
                    <Trash2 size={16} />
                </button>

                {/* Category Header */}
                <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 mr-8">
                    <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                        <Tag size={18} />
                    </div>
                    
                    {editingCatId === category.id ? (
                        <div className="flex items-center gap-2 flex-1">
                            <input 
                                type="text" 
                                value={editCatName}
                                onChange={(e) => setEditCatName(e.target.value)}
                                className="font-bold text-slate-700 border-b-2 border-emerald-500 outline-none flex-1 bg-transparent"
                                autoFocus
                            />
                            <button onClick={() => saveEditCategory(category.id)} className="text-emerald-600 hover:bg-emerald-50 p-1 rounded">
                                <Check size={16} />
                            </button>
                             <button onClick={() => setEditingCatId(null)} className="text-rose-500 hover:bg-rose-50 p-1 rounded">
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <h3 
                            className="font-bold text-slate-700 cursor-pointer hover:text-emerald-600 flex items-center gap-2"
                            onClick={() => startEditCategory(category)}
                            title="点击编辑分类名称"
                        >
                            {category.name}
                            <Edit2 size={12} className="text-slate-300 opacity-0 group-hover:opacity-100" />
                        </h3>
                    )}
                </div>
                
                {/* Tags List */}
                <div className="flex-1 space-y-2 mb-4">
                    {category.tags.length === 0 && (
                        <div className="text-xs text-slate-400 italic text-center py-4 bg-slate-50 rounded">暂无标签</div>
                    )}
                    {category.tags.map(tag => (
                    <div key={tag} className="flex justify-between items-center bg-slate-50 px-3 py-2 rounded border border-slate-100 group/tag hover:border-slate-300 transition-colors">
                        <span className="text-sm text-slate-700">{tag}</span>
                        <button 
                        onClick={() => removeTag(category.id, tag)}
                        className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover/tag:opacity-100"
                        >
                        <X size={14} />
                        </button>
                    </div>
                    ))}
                </div>

                {/* Add Tag Input */}
                <div className="flex gap-2 mt-auto pt-2 border-t border-slate-50">
                <input 
                    type="text" 
                    placeholder="输入新标签..." 
                    className="flex-1 text-sm border border-slate-200 rounded px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all"
                    value={newTagInputs[category.id] || ''}
                    onChange={(e) => handleTagInputChange(category.id, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addTag(category.id)}
                />
                <button 
                    onClick={() => addTag(category.id)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 p-2 rounded transition-colors"
                    title="添加标签"
                >
                    <Plus size={18} />
                </button>
                </div>
            </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Settings;