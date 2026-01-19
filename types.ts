export interface TagCategory {
  id: string;
  name: string;
  tags: string[];
}

export interface MetricData {
  feature: string;
  weight: number; // Coefficient
  pValue: number;
}

export interface AnalysisResult {
  metricId: string;
  metricName: string;
  data: MetricData[];
}

export interface VideoAnalysisResult {
  tag: string;
  detected: boolean;
  confidence?: number;
}

export interface AnalyzedVideo {
  id: string;
  title: string;
  thumbnailUrl?: string;
  tags: string[];
  metrics: {
    roi: number;
    clicks: number;
  };
}

export type AppContextType = {
  tagTaxonomy: TagCategory[];
  updateTagTaxonomy: (newTaxonomy: TagCategory[]) => void;
  apiKey: string | null;
  setApiKey: (key: string) => void;
};

// 项目相关类型
export interface Project {
  id: number;
  name: string;
  description?: string;
  status: 'active' | 'inactive' | 'archived';
  column_mapping?: ColumnMapping;
  current_step: 'ingestion' | 'video_download' | 'ai_tagging' | 'modeling' | 'completed';
  progress_percentage: number;
  total_videos: number;
  downloaded_videos: number;
  failed_videos: number;
  created_at: string;
  updated_at: string;
}

export interface ColumnMapping {
  url_col: string;
  id_col?: string;
  metrics?: {
    [key: string]: string; // metric_name -> column_name
  };
}

export interface Video {
  id: string;
  project_id: number;
  video_url: string;
  local_path?: string;
  status: 'pending' | 'downloading' | 'ready' | 'error';
  progress: number;
  error_message?: string;
  duration?: number;
  file_size?: number;
  thumbnail_path?: string;
  created_at: string;
  updated_at: string;
}

export interface VideoStats {
  total: number;
  downloaded: number;
  downloading: number;
  pending: number;
  failed: number;
}

export interface ProjectStatus {
  current_step: string;
  progress_percentage: number;
  estimated_time_remaining?: string;
  total_videos: number;
  downloaded_videos: number;
  failed_videos: number;
}