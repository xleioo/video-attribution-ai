import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface DashboardProps {
  onNavigate: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [tasks, setTasks] = useState([
    { id: 1, name: 'V面霜_Q3投放_Batch_A.csv', date: '2023-10-24', status: 'completed', videos: 27 },
    { id: 2, name: 'V面霜_Q3投放_Batch_B.csv', date: '2023-10-25', status: 'pending', videos: 27 },
    { id: 3, name: 'V面霜_KOL_Special.csv', date: '2023-10-26', status: 'pending', videos: 45 },
  ]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const newTask = {
        id: Date.now(),
        name: file.name,
        date: new Date().toISOString().split('T')[0],
        status: 'pending',
        videos: 27 // Mock video count fixed to 27
      };
      
      // Add new task to the top
      setTasks(prev => [newTask, ...prev]);
    }
    // Reset input
    if (event.target) event.target.value = '';
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">项目工作台</h2>
          <p className="text-slate-500 text-sm mt-1">管理数据导入与分析任务状态</p>
        </div>
        <button 
          onClick={handleUploadClick}
          className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg flex items-center gap-2 text-sm font-medium transition-all shadow-md"
        >
          <Upload size={16} />
          新建分析任务
        </button>
      </header>

      {/* Upload Area */}
      <div 
        onClick={handleUploadClick}
        className="bg-white border-2 border-dashed border-slate-300 rounded-xl p-10 text-center hover:border-emerald-500 hover:bg-slate-50 transition-colors cursor-pointer group"
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".csv,.xlsx,.xls" 
          className="hidden" 
        />
        <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-colors">
          <FileSpreadsheet size={32} />
        </div>
        <h3 className="text-lg font-semibold text-slate-700">拖拽 Excel/CSV 文件到此处上传</h3>
        <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
          支持 .csv 或 .xlsx 文件。必需包含列：Video URL, Cost, ROI, Clicks 等业务指标。
        </p>
      </div>

      {/* Task List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-semibold text-slate-700">最近任务</h3>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-6 py-3 font-medium">项目名称</th>
              <th className="px-6 py-3 font-medium">创建日期</th>
              <th className="px-6 py-3 font-medium">视频数量</th>
              <th className="px-6 py-3 font-medium">状态</th>
              <th className="px-6 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-2">
                   <FileSpreadsheet size={16} className="text-slate-400" />
                   {task.name}
                </td>
                <td className="px-6 py-4 text-slate-500">{task.date}</td>
                <td className="px-6 py-4 text-slate-500">{task.videos}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                    task.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                    task.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {task.status === 'completed' && <CheckCircle2 size={12} />}
                    {task.status === 'processing' && <Clock size={12} className="animate-spin-slow" />}
                    {(task.status === 'pending' || task.status === '待分析') && <AlertCircle size={12} />}
                    {task.status === 'completed' ? '已完成' : task.status === 'processing' ? 'AI 打标中...' : '待分析'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {task.status === 'completed' ? (
                    <button 
                      onClick={() => onNavigate('report')}
                      className="text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                    >
                      查看详情
                    </button>
                  ) : (
                    <span className="text-slate-400 cursor-not-allowed">
                      查看详情
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Dashboard;