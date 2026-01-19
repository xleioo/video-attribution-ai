import React, { useState, useRef } from 'react';
import { Upload, ArrowRight, ArrowLeft, Check, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { projectApi } from '../services/apiService';
import * as XLSX from 'xlsx';

interface ColumnMapping {
  url_col: string;
  id_col?: string;
  title_col?: string;
  metrics: { [key: string]: string };
}

interface ParsedData {
  headers: string[];
  rows: any[];
}

const ProjectWizard: React.FC<{ onClose: () => void; onSuccess: (projectId: number) => void }> = ({
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    url_col: '',
    id_col: '',
    title_col: '',
    metrics: {},
  });
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理文件上传
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError(null);

    // 自动设置项目名称为文件名（去除扩展名）
    if (!projectName) {
      const nameWithoutExt = uploadedFile.name.replace(/\.[^/.]+$/, '');
      setProjectName(nameWithoutExt);
    }

    try {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);

        if (jsonData.length === 0) {
          setError('文件为空或格式不正确');
          return;
        }

        const headers = Object.keys(jsonData[0]);
        setParsedData({
          headers,
          rows: jsonData,
        });

        // 自动跳转到下一步
        setTimeout(() => setStep(2), 500);
      };

      reader.readAsArrayBuffer(uploadedFile);
    } catch (err) {
      setError('文件解析失败，请确保文件格式正确');
      console.error('文件解析错误:', err);
    }
  };

  // 添加指标映射
  const addMetricMapping = () => {
    const metricKey = prompt('输入指标名称（例如：roi, clicks）：');
    if (metricKey) {
      setColumnMapping({
        ...columnMapping,
        metrics: {
          ...columnMapping.metrics,
          [metricKey]: '',
        },
      });
    }
  };

  // 删除指标映射
  const removeMetricMapping = (metricKey: string) => {
    const newMetrics = { ...columnMapping.metrics };
    delete newMetrics[metricKey];
    setColumnMapping({
      ...columnMapping,
      metrics: newMetrics,
    });
  };

  // 验证映射
  const validateMapping = () => {
    if (!columnMapping.url_col) {
      setError('必须选择视频URL列');
      return false;
    }
    return true;
  };

  // 创建项目
  const createProject = async () => {
    if (!validateMapping() || !parsedData) return;

    setIsCreating(true);
    setError(null);

    try {
      const response = await projectApi.createProject({
        project_name: projectName || `项目_${Date.now()}`,
        column_mapping: columnMapping,
        raw_data: parsedData.rows,
      });

      if (response.success && response.data) {
        const projectId = response.data.project_id;
        onSuccess(projectId);
      } else {
        setError(response.message || '创建项目失败');
      }
    } catch (err) {
      setError('创建项目时发生错误');
      console.error('创建项目错误:', err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="px-8 py-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">创建新项目</h2>
              <p className="text-sm text-slate-600 mt-1">
                步骤 {step} / 2 - {step === 1 ? '上传数据文件' : '配置字段映射'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {/* 错误提示 */}
          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 rounded-lg px-4 py-3 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-rose-900">错误</p>
                <p className="text-sm text-rose-700 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* 步骤1: 文件上传 */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  项目名称（可选）
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="例如：Elixir V Cream Analysis"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                />
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-64 bg-slate-50 border-2 border-dashed border-slate-300 rounded-xl hover:border-indigo-500 transition-colors cursor-pointer flex flex-col items-center justify-center gap-4"
              >
                <Upload className="w-16 h-16 text-slate-400" />
                <div className="text-center">
                  <p className="text-lg font-medium text-slate-700">
                    {file ? file.name : '点击上传或拖拽Excel/CSV文件'}
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    支持 .xlsx, .xls, .csv 格式，最大50MB
                  </p>
                </div>
                {parsedData && (
                  <div className="mt-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-medium">
                    ✓ 已解析 {parsedData.rows.length} 行数据
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* 步骤2: 字段映射 */}
          {step === 2 && parsedData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                {/* 视频URL列（必选） */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    视频URL列 <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={columnMapping.url_col}
                    onChange={(e) =>
                      setColumnMapping({ ...columnMapping, url_col: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="">请选择...</option>
                    {parsedData.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 视频ID列（可选） */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    视频ID列（可选）
                  </label>
                  <select
                    value={columnMapping.id_col}
                    onChange={(e) =>
                      setColumnMapping({ ...columnMapping, id_col: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="">自动生成</option>
                    {parsedData.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 视频标题列（可选） */}
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    视频标题列（可选，推荐）
                  </label>
                  <select
                    value={columnMapping.title_col}
                    onChange={(e) =>
                      setColumnMapping({ ...columnMapping, title_col: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  >
                    <option value="">不设置标题</option>
                    {parsedData.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 mt-1">
                    设置后，视频列表将显示标题而不是ID
                  </p>
                </div>
              </div>

              {/* 指标映射 */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-slate-700">
                    业务指标映射
                  </label>
                  <button
                    onClick={addMetricMapping}
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    + 添加指标
                  </button>
                </div>

                <div className="space-y-3">
                  {Object.entries(columnMapping.metrics).map(([metricKey, columnName]) => (
                    <div key={metricKey} className="flex gap-3">
                      <input
                        type="text"
                        value={metricKey}
                        disabled
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-600"
                      />
                      <select
                        value={columnName}
                        onChange={(e) =>
                          setColumnMapping({
                            ...columnMapping,
                            metrics: {
                              ...columnMapping.metrics,
                              [metricKey]: e.target.value,
                            },
                          })
                        }
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                      >
                        <option value="">请选择列...</option>
                        {parsedData.headers.map((header) => (
                          <option key={header} value={header}>
                            {header}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => removeMetricMapping(metricKey)}
                        className="px-4 py-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  ))}
                </div>

                {Object.keys(columnMapping.metrics).length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    暂无指标，点击"添加指标"按钮添加
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏 */}
        <div className="px-8 py-6 border-t border-slate-200 flex items-center justify-between">
          <div>
            {step === 2 && (
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                上一步
              </button>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              取消
            </button>

            {step === 1 && parsedData && (
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                下一步
                <ArrowRight className="w-4 h-4" />
              </button>
            )}

            {step === 2 && (
              <button
                onClick={createProject}
                disabled={isCreating || !columnMapping.url_col}
                className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    创建中...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    创建项目
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectWizard;
