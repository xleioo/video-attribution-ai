import React, { useState, useRef, useContext } from 'react';
import { Upload, Video as VideoIcon, Play, Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { AppContext } from '../App';
import { analyzeVideoWithGemini } from '../services/geminiService';
import { VideoAnalysisResult } from '../types';

const VideoPlayground: React.FC = () => {
  const { apiKey, tagTaxonomy } = useContext(AppContext);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<VideoAnalysisResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setResults(null);
      setError(null);
    }
  };

  const handleAnalyze = async () => {
    if (!apiKey) {
      setError("Please set your AI Model API Key in Settings first.");
      return;
    }
    if (!videoFile) return;

    // Size check for demo purposes (Base64 limit)
    if (videoFile.size > 20 * 1024 * 1024) {
      setError("Demo Limit: Please upload a video smaller than 20MB for browser-based processing.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      // Convert to Base64
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            // Remove data url prefix (e.g. "data:video/mp4;base64,")
            const base64Content = base64String.split(',')[1];
            resolve(base64Content);
        };
        reader.onerror = reject;
        reader.readAsDataURL(videoFile);
      });

      const analysisResults = await analyzeVideoWithGemini(
        apiKey,
        base64Data,
        videoFile.type,
        tagTaxonomy
      );

      setResults(analysisResults);

    } catch (err: any) {
      setError(err.message || "Failed to analyze video. Check console.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="p-8 h-screen overflow-y-auto pb-24">
      <header className="mb-8">
        <h2 className="text-2xl font-bold text-slate-800">视频素材库 (Video Library)</h2>
        <p className="text-slate-500 text-sm mt-1">上传视频并调用 AI 视觉模型进行自动打标测试</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Player & Upload */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-black rounded-xl aspect-video flex items-center justify-center overflow-hidden relative shadow-lg group">
             {videoUrl ? (
               <video 
                 ref={videoRef}
                 src={videoUrl} 
                 controls 
                 className="w-full h-full object-contain"
               />
             ) : (
               <div className="text-slate-500 flex flex-col items-center">
                 <VideoIcon size={48} className="mb-2 opacity-50" />
                 <span className="text-sm">No video selected</span>
               </div>
             )}
          </div>

          <div className="flex gap-4">
            <label className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-4 py-3 rounded-lg cursor-pointer flex items-center justify-center gap-2 transition-colors font-medium shadow-sm">
               <Upload size={18} />
               {videoFile ? 'Change Video' : 'Upload Video (MP4)'}
               <input type="file" accept="video/mp4,video/quicktime" onChange={handleFileChange} className="hidden" />
            </label>
            
            <button 
              onClick={handleAnalyze}
              disabled={!videoFile || isAnalyzing}
              className={`px-6 py-3 rounded-lg flex items-center gap-2 font-medium text-white shadow-md transition-all ${
                !videoFile || isAnalyzing 
                ? 'bg-slate-400 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg'
              }`}
            >
              {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} fill="currentColor" />}
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
          
          {error && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg flex items-center gap-2 text-sm">
              <AlertTriangle size={16} />
              {error}
            </div>
          )}

          {!apiKey && (
            <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-sm">
               ⚠️ API Key is missing. Go to <strong>Settings</strong> to configure your AI Model API key.
            </div>
          )}
        </div>

        {/* Right Column: Results */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 rounded-t-xl">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <CheckCircle2 size={18} className="text-emerald-500" />
              识别结果 (Recognition Results)
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {!results && !isAnalyzing && (
              <div className="text-center text-slate-400 mt-20 text-sm px-8">
                Upload a video and click "Run Analysis" to see the AI breakdown based on your defined Taxonomy.
              </div>
            )}

            {isAnalyzing && (
              <div className="space-y-4 animate-pulse">
                {[1,2,3,4].map(i => (
                  <div key={i} className="h-16 bg-slate-100 rounded-lg"></div>
                ))}
              </div>
            )}

            {results && tagTaxonomy.map(category => {
              // Filter results for this category
              const catResults = results.filter(r => category.tags.includes(r.tag));
              
              return (
                <div key={category.id}>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">{category.name}</h4>
                  <div className="space-y-2">
                    {catResults.map(res => (
                       <div key={res.tag} className="flex justify-between items-center p-3 rounded-lg border border-slate-100 bg-slate-50/30">
                          <span className="text-sm text-slate-700">{res.tag}</span>
                          {res.detected ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                               <CheckCircle2 size={12} /> MATCH
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-medium text-slate-400 px-2 py-1">
                               <XCircle size={12} /> No Match
                            </span>
                          )}
                       </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayground;