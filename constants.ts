import { AnalysisResult, TagCategory, AnalyzedVideo } from './types';

export const INITIAL_TAG_TAXONOMY: TagCategory[] = [
  {
    id: 'content_format',
    name: '内容形式标签',
    tags: ['榜单推荐', 'Vlog日常', '教程/手法', '开箱测评', '直播剪辑']
  },
  {
    id: 'protagonist_persona',
    name: '主角人设标签',
    tags: ['品牌官方', '学生少女', '宝妈人群', '专业人士', '素人真实']
  },
  {
    id: 'scene_visual',
    name: '场景画面标签',
    tags: ['亲子家庭', '健身运动', '外出逛街', '家居梳妆']
  },
  {
    id: 'presentation_method',
    name: '呈现手法标签',
    tags: ['使用过程', '数据/成分', '包装展示', '对比展示', '气氛营造']
  },
  {
    id: 'efficacy_appeal',
    name: '功效诉求标签',
    tags: ['抗老紧致', '高性价比', '淡纹抚皱', '提亮焕肤', '淡黑眼圈']
  },
  {
    id: 'tone_mood_tags',
    name: '情绪语气标签',
    tags: ['种草安利', '仪式精致', '急迫稀缺', '真实亲测']
  },
  {
    id: 'visual_subject',
    name: '画面主体',
    tags: ['面部特写/按摩演示', '质地/包装特写', '纯产品静物', '多人/亲子互动', '运动健身场景', '户外街拍']
  },
  {
    id: 'content_strategy',
    name: '内容策略',
    tags: ['专业人士背书', '素人体验故事', 'Vlog生活记录', '开箱测评', '步骤教学演示', '成分/数据论证', '前后对比', '价格促销钩子', '紧迫稀缺提醒']
  },
  {
    id: 'tone_mood',
    name: '情绪语气',
    tags: ['真实亲测口吻', '仪式/疗愈氛围', '紧张倒计时']
  },
  {
    id: 'efficacy_audience',
    name: '功效诉求与人群',
    tags: ['眼部/淡黑眼圈', '抗垮提拉', '淡纹抚皱', '提亮焕肤', '宝妈人群']
  }
];

// 严格根据 PDF 分析结论更新的数据
export const MOCK_ANALYSIS_RESULTS: AnalysisResult[] = [
  {
    metricId: 'consumption',
    metricName: '广告消耗 (Ad Spend)',
    data: [
      { feature: '画面主体:多人/亲子互动', weight: 1.095, pValue: 0.01 },
      { feature: '功效诉求与人群:抗垮提拉', weight: 0.815, pValue: 0.01 },
      { feature: '画面主体:户外街拍', weight: 0.586, pValue: 0.05 },
      { feature: '互动与素材元素:口播字幕颜色', weight: 0.298, pValue: 0.05 },
      { feature: '功效诉求与人群:眼部/淡黑眼圈', weight: 0.222, pValue: 0.05 },
      { feature: '功效诉求与人群:宝妈人群', weight: 0.181, pValue: 0.1 },
      { feature: '内容策略:成分/数据论证', weight: -0.18, pValue: 0.1 },
      { feature: '内容策略:价格促销钩子', weight: -0.216, pValue: 0.05 },
      { feature: '内容策略:前后对比', weight: -0.267, pValue: 0.05 },
      { feature: '内容策略:专业人士背书', weight: -0.296, pValue: 0.05 },
      { feature: '互动与素材元素:数据图表', weight: -0.328, pValue: 0.05 },
      { feature: '内容策略:开箱测评', weight: -0.414, pValue: 0.01 },
      { feature: '情绪语气:真实亲测口吻', weight: -0.441, pValue: 0.01 },
      { feature: '内容策略:素人体验故事', weight: -0.477, pValue: 0.01 },
      { feature: '画面主体:质地/包装特写', weight: -1.015, pValue: 0.001 },
    ]
  },
  {
    metricId: 'roi',
    metricName: 'ROI (投资回报率)',
    data: [
      { feature: '内容策略:素人体验故事', weight: 0.794, pValue: 0.001 },
      { feature: '内容策略:专业人士背书', weight: 0.646, pValue: 0.01 },
      { feature: '功效诉求与人群:淡纹抚皱', weight: 0.462, pValue: 0.05 },
      { feature: '内容策略:价格促销钩子', weight: 0.396, pValue: 0.05 },
      { feature: '画面主体:多人/亲子互动', weight: 0.348, pValue: 0.05 },
      { feature: '内容策略:Vlog生活记录', weight: 0.325, pValue: 0.05 },
      { feature: '情绪语气:真实亲测口吻', weight: 0.24, pValue: 0.1 },
      { feature: '功效诉求与人群:宝妈人群', weight: 0.166, pValue: 0.1 },
      { feature: '功效诉求与人群:30+/初老', weight: -0.17, pValue: 0.1 },
      { feature: '内容策略:成分/数据论证', weight: -0.439, pValue: 0.05 },
      { feature: '情绪语气:仪式/疗愈氛围', weight: -0.479, pValue: 0.05 },
      { feature: '内容策略:前后对比', weight: -0.639, pValue: 0.01 },
      { feature: '互动与素材元素:口播字幕颜色', weight: -0.69, pValue: 0.01 },
      { feature: '内容策略:开箱测评', weight: -0.714, pValue: 0.01 },
      { feature: '功效诉求与人群:眼部/淡黑眼圈', weight: -0.784, pValue: 0.001 },
    ]
  },
  {
    metricId: 'clicks',
    metricName: '点击量 (Click Volume)',
    data: [
      { feature: '画面主体:多人/亲子互动', weight: 1.026, pValue: 0.001 },
      { feature: '功效诉求与人群:抗垮提拉', weight: 0.569, pValue: 0.01 },
      { feature: '画面主体:户外街拍', weight: 0.542, pValue: 0.01 },
      { feature: '内容策略:成分/数据论证', weight: 0.535, pValue: 0.01 },
      { feature: '互动与素材元素:口播字幕颜色', weight: 0.347, pValue: 0.05 },
      { feature: '互动与素材元素:分屏/多镜头', weight: 0.314, pValue: 0.05 },
      { feature: '功效诉求与人群:淡纹抚皱', weight: 0.281, pValue: 0.05 },
      { feature: '互动与素材元素:数据图表', weight: 0.231, pValue: 0.1 },
      { feature: '功效诉求与人群:提亮焕肤', weight: -0.267, pValue: 0.1 },
      { feature: '内容策略:素人体验故事', weight: -0.331, pValue: 0.05 },
      { feature: '内容策略:专业人士背书', weight: -0.358, pValue: 0.05 },
      { feature: '内容策略:价格促销钩子', weight: -0.383, pValue: 0.05 },
      { feature: '情绪语气:真实亲测口吻', weight: -0.487, pValue: 0.01 },
      { feature: '内容策略:开箱测评', weight: -0.508, pValue: 0.01 },
      { feature: '画面主体:质地/包装特写', weight: -1.26, pValue: 0.001 },
    ]
  },
  {
    metricId: 'store_visits',
    metricName: '进店量 (Store Visits)',
    data: [
      { feature: '画面主体:户外街拍', weight: 1.042, pValue: 0.001 },
      { feature: '画面主体:多人/亲子互动', weight: 0.622, pValue: 0.01 },
      { feature: '内容策略:前后对比', weight: 0.505, pValue: 0.01 },
      { feature: '互动与素材元素:口播字幕颜色', weight: 0.44, pValue: 0.05 },
      { feature: '功效诉求与人群:淡纹抚皱', weight: 0.406, pValue: 0.05 },
      { feature: '互动与素材元素:分屏/多镜头', weight: 0.358, pValue: 0.05 },
      { feature: '功效诉求与人群:抗垮提拉', weight: 0.299, pValue: 0.05 },
      { feature: '功效诉求与人群:宝妈人群', weight: 0.232, pValue: 0.1 },
      { feature: '内容策略:价格促销钩子', weight: -0.254, pValue: 0.1 },
      { feature: '内容策略:专业人士背书', weight: -0.275, pValue: 0.05 },
      { feature: '内容策略:素人体验故事', weight: -0.309, pValue: 0.05 },
      { feature: '互动与素材元素:数据图表', weight: -0.343, pValue: 0.05 },
      { feature: '情绪语气:真实亲测口吻', weight: -0.417, pValue: 0.01 },
      { feature: '功效诉求与人群:提亮焕肤', weight: -0.862, pValue: 0.001 },
      { feature: '画面主体:质地/包装特写', weight: -1.111, pValue: 0.001 },
    ]
  },
  {
    metricId: '5s_views',
    metricName: '5s播放量 (5s Views)',
    data: [
      { feature: '画面主体:多人/亲子互动', weight: 1.028, pValue: 0.001 },
      { feature: '情绪语气:仪式/疗愈氛围', weight: 0.704, pValue: 0.01 },
      { feature: '功效诉求与人群:抗垮提拉', weight: 0.491, pValue: 0.01 },
      { feature: '画面主体:户外街拍', weight: 0.467, pValue: 0.05 },
      { feature: '功效诉求与人群:宝妈人群', weight: 0.434, pValue: 0.05 },
      { feature: '功效诉求与人群:提亮焕肤', weight: 0.304, pValue: 0.05 },
      { feature: '内容策略:素人体验故事', weight: 0.279, pValue: 0.05 },
      { feature: '内容策略:Vlog生活记录', weight: 0.222, pValue: 0.1 },
      { feature: '互动与素材元素:口播字幕颜色', weight: -0.141, pValue: 0.1 },
      { feature: '互动与素材元素:数据图表', weight: -0.191, pValue: 0.1 },
      { feature: '内容策略:成分/数据论证', weight: -0.225, pValue: 0.05 },
      { feature: '内容策略:开箱测评', weight: -0.314, pValue: 0.05 },
      { feature: '功效诉求与人群:30+/初老', weight: -0.515, pValue: 0.01 },
      { feature: '功效诉求与人群:眼部/淡黑眼圈', weight: -0.622, pValue: 0.01 },
      { feature: '画面主体:质地/包装特写', weight: -0.918, pValue: 0.001 },
    ]
  },
  {
    metricId: 'total_views',
    metricName: '播放量 (Total Views)',
    data: [
      { feature: '画面主体:多人/亲子互动', weight: 1.023, pValue: 0.001 },
      { feature: '画面主体:户外街拍', weight: 0.499, pValue: 0.01 },
      { feature: '内容策略:前后对比', weight: 0.343, pValue: 0.05 },
      { feature: '功效诉求与人群:眼部/淡黑眼圈', weight: 0.337, pValue: 0.05 },
      { feature: '内容策略:素人体验故事', weight: 0.324, pValue: 0.05 },
      { feature: '内容策略:Vlog生活记录', weight: 0.267, pValue: 0.05 },
      { feature: '互动与素材元素:口播字幕颜色', weight: 0.253, pValue: 0.05 },
      { feature: '情绪语气:仪式/疗愈氛围', weight: 0.24, pValue: 0.1 },
      { feature: '互动与素材元素:分屏/多镜头', weight: 0.187, pValue: 0.1 },
      { feature: '功效诉求与人群:淡纹抚皱', weight: 0.178, pValue: 0.1 },
      { feature: '互动与素材元素:数据图表', weight: -0.206, pValue: 0.1 },
      { feature: '功效诉求与人群:提亮焕肤', weight: -0.285, pValue: 0.05 },
      { feature: '内容策略:价格促销钩子', weight: -0.467, pValue: 0.01 },
      { feature: '情绪语气:真实亲测口吻', weight: -0.854, pValue: 0.001 },
      { feature: '画面主体:质地/包装特写', weight: -1.224, pValue: 0.001 },
    ]
  },
];

const RAW_TITLES = [
  "night skin care｜新年变美指南 快速提升面部紧致小v脸",
  "日常vlog🦷“狗狗碰面 一日饮食 吃香香饭”",
  "熬夜主理人的高质价比抗垮仙品们!",
  "从肉垮脸到岁皮贴骨，「支撑+补充」才是真抗老",
  "干皮春夏垮脸自救✨养出妈生水光肌🫧",
  "变美邪修!30+方圆脸简单粗暴的变美捷径",
  "填胶原=塞棉花？学会骨相提拉抗垮才是有效抗老！",
  "经济上行的美:质价比抗老也需内外兼修",
  "百元质价比仙品 养出妈生骨相美",
  "不是科技上不起，紧塑带面霜更有质价比",
  "minivlog｜96年精致不带娃妈咪✌🏻开箱&逛街",
  "都说30岁前的美靠皮相，30岁后，跟我质价比抗老，慢慢变好看",
  "s报恩面霜有千元抗老效果？还得资生堂长公主",
  "vlog/独居日记🍢在初夏和朋友去美美露营🏕️",
  "night routine🧏‍♀️30+精致女生晚间护肤",
  "见过再多抗老面霜大场面，还是被这瓶效果惊",
  "内外抗老质价比攻略!跟我养出紧致透亮脸",
  "救命！原来这么多年抗老都做错了！赶紧自查！",
  "骨相好=高支撑，30+皮肉贴合感怎么来？",
  "博寒假🎂 新的一岁，继续与世界交手吧",
  "想抗老先养骨!化妆师骨相抗老教学局",
  "大尊：妈妈甭说啦，是我自个儿想穿的！",
  "顶级抗垮配置，你和我说才百元⁉️这次杀疯了",
  "质价比拉满的高质量好物！买的超值！",
  "30+女性：向内生长，自有光芒",
  "普通人双11：只买不后悔的人生质价比单品！",
  "share. 我的4款日常爱用面霜分享"
];

// Helper to generate mock videos based on titles
const generateMockVideos = (): AnalyzedVideo[] => {
  const sampleTags = [
    ['画面主体:多人/亲子互动', '内容策略:素人体验故事', '功效诉求与人群:抗垮提拉'],
    ['画面主体:户外街拍', '情绪语气:仪式/疗愈氛围', '功效诉求与人群:淡纹抚皱'],
    ['画面主体:质地/包装特写', '内容策略:成分/数据论证', '功效诉求与人群:提亮焕肤'],
    ['内容策略:专业人士背书', '互动与素材元素:数据图表', '功效诉求与人群:30+/初老'],
    ['内容策略:开箱测评', '情绪语气:真实亲测口吻', '画面主体:面部特写/按摩演示'],
    ['内容策略:Vlog生活记录', '画面主体:多人/亲子互动', '功效诉求与人群:宝妈人群'],
    ['内容策略:价格促销钩子', '情绪语气:紧张倒计时', '互动与素材元素:口播字幕颜色'],
    ['功效诉求与人群:眼部/淡黑眼圈', '内容策略:前后对比', '画面主体:面部特写/按摩演示']
  ];

  return RAW_TITLES.map((title, index) => {
    const tagSet = sampleTags[index % sampleTags.length];
    // Generate some somewhat random but consistent metrics based on index
    const roi = 1.0 + (index % 25) / 10 + Math.random() * 0.5;
    const clicks = 3000 + (index % 10) * 1000 + Math.floor(Math.random() * 2000);

    return {
      id: `vid_${(index + 1).toString().padStart(3, '0')}`,
      title: title,
      tags: tagSet,
      metrics: {
        roi: parseFloat(roi.toFixed(1)),
        clicks: clicks
      }
    };
  });
};

export const MOCK_ANALYZED_VIDEOS: AnalyzedVideo[] = generateMockVideos();