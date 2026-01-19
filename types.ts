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