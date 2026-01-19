import React, { useContext, useState } from 'react';
import { AppContext } from '../App';
import { Tag, Trash2, Plus, Save, X, Edit2, Check } from 'lucide-react';
import { TagCategory } from '../types';

const Settings: React.FC = () => {
  const { tagTaxonomy, updateTagTaxonomy, apiKey, setApiKey } = useContext(AppContext);
  // Local state for edits
  const [localTaxonomy, setLocalTaxonomy] = useState<TagCategory[]>(tagTaxonomy);
  
  // State for new tag input (keyed by category ID)
  const [newTagInputs, setNewTagInputs] = useState<Record<string, string>>({});
  
  // State for editing category names
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');

  const handleSave = () => {
    updateTagTaxonomy(localTaxonomy);
    alert("Taxonomy configuration saved successfully!");
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
         <div className="max-w-xl">
            <label className="block text-sm font-medium text-slate-700 mb-1">Gemini API Key</label>
            <input 
              type="password" 
              value={apiKey || ''}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your AI Model API Key"
              className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
            />
            <p className="text-xs text-slate-500 mt-2">
              用于 "视频素材库" 功能中的自动化视频理解与打标。
            </p>
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