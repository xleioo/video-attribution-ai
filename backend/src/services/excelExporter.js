import ExcelJS from 'exceljs';

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
const HEADER_FONT = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };

const STRUCTURE_STAGES = ['痛点引入', '产品引入', '信任背书', '行动呼吁 (CTA)'];

function styleHeader(sheet) {
  const headerRow = sheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.fill = HEADER_FILL;
    cell.font = HEADER_FONT;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  headerRow.height = 22;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

function autoWidth(sheet, { min = 10, max = 60 } = {}) {
  sheet.columns.forEach((col) => {
    let maxLen = min;
    col.eachCell({ includeEmpty: true }, (cell) => {
      const v = cell.value == null ? '' : String(cell.value);
      // 中文按 2 个宽度估算
      const len = v.split('').reduce((acc, ch) => acc + (ch.charCodeAt(0) > 255 ? 2 : 1), 0);
      if (len > maxLen) maxLen = len;
    });
    col.width = Math.min(maxLen + 2, max);
  });
}

function joinTags(tags) {
  if (!Array.isArray(tags)) return '';
  return tags.filter(Boolean).join('、');
}

/**
 * 根据装配好的数据生成 Excel Workbook Buffer。
 * @param {Object} data 见 projectController.downloadProjectData 装配结构
 * @returns {Promise<Buffer>}
 */
export async function buildTaggingResultWorkbook(data) {
  const {
    project,
    taggingMode,
    metricNames = [],
    tagColumns = [],
    tagDictionary = [],
    videos = [],
  } = data;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Elixir Short Video Attribution AI';
  wb.created = new Date();

  const modeLabel = taggingMode === 'discovery' ? '主动挖掘' : '预设对照';

  // ---- Sheet 1: 视频总览 ----
  const overview = wb.addWorksheet('视频总览');
  overview.columns = [
    { header: '视频ID', key: 'video_id' },
    { header: '视频标题', key: 'title' },
    { header: '视频URL', key: 'url' },
    { header: '时长(秒)', key: 'duration' },
    { header: '文件大小(MB)', key: 'file_size' },
    { header: '打标状态', key: 'status' },
    { header: '打标模式', key: 'mode' },
    ...metricNames.map((name) => ({ header: name, key: `m_${name}` })),
    { header: '命中标签数', key: 'hit_count' },
    { header: '开场钩子强度', key: 'hook' },
    { header: '结构完整度', key: 'structure_ratio' },
    { header: '核心结论', key: 'takeaway' },
  ];
  videos.forEach((v) => {
    const presentCount = (v.summary?.structure || []).filter((s) => s.present).length;
    const totalStages = (v.summary?.structure || []).length || STRUCTURE_STAGES.length;
    const row = {
      video_id: v.video_id,
      title: v.title,
      url: v.video_url,
      duration: v.duration ?? '',
      file_size: v.file_size ? +(v.file_size / 1024 / 1024).toFixed(2) : '',
      status: v.ai_tagging_status || '',
      mode: modeLabel,
      hit_count: v.hitTagCount,
      hook: v.first5s?.hook_strength || '',
      structure_ratio: `${presentCount}/${totalStages}`,
      takeaway: v.summary?.overall_takeaway || '',
    };
    metricNames.forEach((name) => { row[`m_${name}`] = v.metricsMap[name] ?? ''; });
    overview.addRow(row);
  });
  styleHeader(overview);
  autoWidth(overview);

  // ---- Sheet 2: 标签明细（长表） ----
  const tagDetail = wb.addWorksheet('标签明细');
  tagDetail.columns = [
    { header: '视频ID', key: 'video_id' },
    { header: '视频标题', key: 'title' },
    { header: '打标模式', key: 'mode' },
    { header: '标签分类', key: 'category' },
    { header: '分类ID', key: 'category_id' },
    { header: '标签名', key: 'tag' },
    { header: '是否命中', key: 'detected' },
    { header: '置信度', key: 'confidence' },
  ];
  videos.forEach((v) => {
    (v.tagDetails || []).forEach((t) => {
      tagDetail.addRow({
        video_id: v.video_id,
        title: v.title,
        mode: modeLabel,
        category: t.categoryName,
        category_id: t.categoryId || '',
        tag: t.tagName,
        detected: t.detected ? 1 : 0,
        confidence: t.confidence == null ? '' : t.confidence,
      });
    });
  });
  styleHeader(tagDetail);
  autoWidth(tagDetail, { max: 40 });

  // ---- Sheet 3: 标签宽表（one-hot） ----
  const tagWide = wb.addWorksheet('标签宽表');
  tagWide.columns = [
    { header: '视频ID', key: 'video_id' },
    { header: '视频标题', key: 'title' },
    ...metricNames.map((name) => ({ header: name, key: `m_${name}` })),
    ...tagColumns.map((c, i) => ({ header: c.columnName, key: `t_${i}` })),
  ];
  videos.forEach((v) => {
    const row = { video_id: v.video_id, title: v.title };
    metricNames.forEach((name) => { row[`m_${name}`] = v.metricsMap[name] ?? ''; });
    tagColumns.forEach((c, i) => { row[`t_${i}`] = v.oneHot[c.columnName] ? 1 : 0; });
    tagWide.addRow(row);
  });
  styleHeader(tagWide);
  autoWidth(tagWide, { max: 30 });

  // ---- Sheet 4: 前5秒-概览 ----
  const f5Overview = wb.addWorksheet('前5秒-概览');
  f5Overview.columns = [
    { header: '视频ID', key: 'video_id' },
    { header: '视频标题', key: 'title' },
    { header: '钩子强度', key: 'hook' },
    { header: '亮点', key: 'highlight' },
    { header: '问题点', key: 'issue' },
    { header: '前5秒标签', key: 'tags' },
  ];
  videos.forEach((v) => {
    f5Overview.addRow({
      video_id: v.video_id,
      title: v.title,
      hook: v.first5s?.hook_strength || '',
      highlight: v.first5s?.highlight || '',
      issue: v.first5s?.issue || '',
      tags: joinTags(v.first5s?.tags),
    });
  });
  styleHeader(f5Overview);
  autoWidth(f5Overview, { max: 50 });

  // ---- Sheet 5: 前5秒-时间线（长表） ----
  const f5Timeline = wb.addWorksheet('前5秒-时间线');
  f5Timeline.columns = [
    { header: '视频ID', key: 'video_id' },
    { header: '视频标题', key: 'title' },
    { header: '秒', key: 'second' },
    { header: '画面描述', key: 'desc' },
  ];
  videos.forEach((v) => {
    (v.first5s?.timeline || []).forEach((tl) => {
      f5Timeline.addRow({
        video_id: v.video_id,
        title: v.title,
        second: tl.second ?? '',
        desc: tl.description || '',
      });
    });
  });
  styleHeader(f5Timeline);
  autoWidth(f5Timeline, { max: 60 });

  // ---- Sheet 6: 视频结构（长表） ----
  const structure = wb.addWorksheet('视频结构');
  structure.columns = [
    { header: '视频ID', key: 'video_id' },
    { header: '视频标题', key: 'title' },
    { header: '阶段', key: 'stage' },
    { header: '是否出现', key: 'present' },
    { header: '证据', key: 'evidence' },
    { header: '时间戳', key: 'timestamp' },
  ];
  videos.forEach((v) => {
    (v.summary?.structure || []).forEach((s) => {
      structure.addRow({
        video_id: v.video_id,
        title: v.title,
        stage: s.stage || '',
        present: s.present ? 1 : 0,
        evidence: s.evidence || '',
        timestamp: s.timestamp || '',
      });
    });
  });
  styleHeader(structure);
  autoWidth(structure, { max: 60 });

  // ---- Sheet 7: 导出说明 ----
  const info = wb.addWorksheet('导出说明');
  info.columns = [
    { header: '项目', key: 'k' },
    { header: '内容', key: 'v' },
  ];
  const exportRows = [
    ['项目名称', project.name],
    ['导出时间', new Date().toLocaleString('zh-CN')],
    ['视频总数', videos.length],
    ['打标模式', `${modeLabel}（${taggingMode}）`],
    ['', ''],
    ['字段口径说明', ''],
    ['是否命中', '1=命中，0=未命中'],
    ['置信度', '预设对照模式下命中为 1.0/未命中 0.0；主动挖掘模式留空'],
    ['结构完整度', 'present=true 的阶段数 / 总阶段数'],
    ['文件大小(MB)', '由字节换算，保留 2 位小数'],
    ['', ''],
    ['标签字典（分类 → 标签）', ''],
  ];
  exportRows.forEach(([k, v]) => info.addRow({ k, v }));
  tagDictionary.forEach((cat) => {
    const tagsText = cat.tags
      .map((t) => (t.aliases && t.aliases.length ? `${t.tagName}（含：${t.aliases.join('、')}）` : t.tagName))
      .join('、');
    info.addRow({ k: cat.categoryName, v: tagsText });
  });
  styleHeader(info);
  autoWidth(info, { max: 80 });

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
