/* ============================================================
   i18n.js — bilingual support (zh / en)
   Exposes: t(key), entityName(d), getLang(), setLang(lang)
   ============================================================ */

const TRANSLATIONS = {
  zh: {
    // Topbar / tabs
    'title':              'Super Alignment',
    'tab.graph':          '知识地图',
    'tab.quiz':           '诊断',
    'tab.progress':       '进度',
    'search.placeholder': '搜索知识点，如：RAG、工程、fine-tuning…',
    'badge.loading':      '加载中...',
    'badge.mastered':     '掌握',

    // Graph sidebar
    'sidebar.title':      '学习地图',
    'cockpit.title':      '先定位薄弱方向，再导出到你的笔记工具继续学习',
    'cockpit.next_label': '推荐下一步',
    'cockpit.no_rec':     '完成诊断后这里会出现推荐。',
    'cockpit.primary':    '立即诊断 →',
    'cockpit.path_link':  '查看路径',
    'cockpit.search_link':'搜索',
    'cockpit.jump_toast': '已切换到该主题视图，可点“全局总览”返回。',
    'theme.toggle':       '切换日/夜模式',
    'view.path':          '路径导览',
    'view.global':        '全局总览',
    'view.dir':           '目录',
    'view.domain':        '领域浏览',
    'crumb.all_areas':    '全部大类',

    // Legend
    'legend.domains':     '知识域',
    'legend.status':      '主题掌握状态',
    'legend.size':        '节点大小',
    'legend.lines':       '连线含义',
    'legend.size.dir':    '方向',
    'legend.size.topic':  '主题（大=重要）',
    'legend.line.prereq': '前置依赖',
    'legend.ring':        '○ 外环弧度 = 聚合掌握进度',

    // Area names in legend
    'area.foundation':    '基础理论',
    'area.llm':           '大语言模型',
    'area.application':   '应用技术',
    'area.engineering':   '工程实践',
    'area.safety':        '安全与对齐',

    // Node info
    'node.empty':         '点击节点查看详情',
    'node.hint.global':   '全局总览',
    'node.hint.domain':   '领域浏览',
    'node.hint.global.desc': '探索完整知识体系',
    'node.hint.domain.desc': '逐层展开到具体主题',
    'node.hint.click':    '单击',
    'node.hint.click.desc': '查看知识点详情',
    'node.hint.dblclick': '双击',
    'node.hint.dblclick.desc': '深入探索该方向',
    'node.hint.legend':   '图例',
    'node.hint.legend.desc': '点击可筛选大类',
    'type.area':          '大类',
    'type.direction':     '方向',
    'type.topic':         '主题',
    'node.topics_in':     '包含 {n} 个主题',
    'node.dirs_in':       '包含 {n} 个方向',
    'btn.quiz_dir':       '测评此方向（{n}题）→',
    'btn.skip':           '跳过',
    'btn.view_topics':    '查看主题图',
    'btn.expand_dir':     '查看主题图',
    'btn.expand_area':    '展开方向图',
    'btn.browse_area':    '浏览此领域 →',
    'btn.locate':         '在图谱中定位 →',
    'btn.quiz_this_topic': '测当前主题（3题）',
    'btn.quiz_topic':     '测本方向（{n}题）',
    'btn.course':         '🎓 生成课程搜索提示词',

    // Path panel
    'path.apply':         '会用',
    'path.understand':    '懂原理',
    'path.mastered_of':   '已掌握 {n} / {total}',
    'path.compare_hint': '也可以切换上方按钮，对比“会用”和“懂原理”两条路径。',

    // Status
    'status.mastered':    '已掌握',
    'status.learning':    '学习中',
    'status.needs_work':  '需要加强',
    'status.unknown':     '未测评',

    // Quiz
    'quiz.title':         '知识测评',
    'quiz.subtitle':      '通过测评了解你的 AI 知识现状，定向提升薄弱领域',
    'quiz.diagnostic.title': '完整诊断',
    'quiz.diagnostic.desc':  '30 道题（每方向 2 题），约 12 分钟；可随时退出，已答记录会保留。\n完成后获得雷达图分析 + 个性化推荐',
    'quiz.diagnostic.notice': '<strong>诊断不是考试。</strong>不会的题帮助系统找到你的学习起点，而不是评判你的水平。题目涵盖技术深度，部分偏难属正常现象。不确定可点击"跳过"继续。',
    'btn.start_diagnostic': '开始完整诊断 →',
    'quiz.or_choose':     '── 或选择单个方向测评 ──',
    'quiz.flow.quit':     '← 退出',
    'quiz.flow.subtitle': '回答完所有题目',
    'quiz.dir_topic':     '方向：{dir}  ·  主题：{topic}',
    'quiz.topic_only':    '主题：{topic}',
    'quiz.quit_confirm':  '确认退出？已答进度会保留，下次可继续。',
    'quiz.subtitle_topic': '{n} 道题 · 覆盖 {topics} 个主题',
    'quiz.subtitle_direction': '{n} 道题 · 覆盖 {topics} 个主题',
    'quiz.subtitle_diagnostic': '{n} 道题 · 覆盖全部 15 个方向',
    'btn.next':           '下一题 →',
    'btn.submit':         '提交结果 ✓',
    'quiz.check_failed':  '校验失败，请检查网络后重试',
    'quiz.load_failed':   '加载题目失败: {msg}',
    'quiz.submit_failed': '提交失败: {msg}',

    // Result
    'result.title':         '诊断结果',
    'result.accuracy':      '正确率',
    'result.correct_of':    '正确 {n} / {total} 题',
    'result.direction_scores': '各方向得分',
    'result.weak_title':    '建议重点学习方向',
    'result.weak_hint':     '点击上方标签开始针对性测评',
    'result.next_title':    '推荐下一步（从这里开始）',
    'result.next_view':     '查看 →',
    'btn.redo':             '重新诊断',
    'btn.view_graph':       '查看图谱 →',
    'btn.back_home':        '返回测评首页',
    'dir_result.title':     '方向测评结果',
    'dir_result.topics':    '各主题掌握情况',
    'btn.view_dir_graph':   '查看此方向图谱 →',

    // Progress
    'stat.total':           '总主题数',
    'stat.mastered':        '已掌握',
    'stat.learning':        '学习中',
    'stat.needs_work':      '需要加强',
    'stat.unknown':         '未测评',
    'progress.radar_title': '掌握度雷达图',
    'progress.areas_title': '大类进度',
    'progress.next_title': '下一步推荐',
    'progress.heatmap_title': '知识体系总览',

    // Search
    'search.found':       '找到 {n} 个相关知识点',
    'search.not_found':   '未找到与「{q}」相关的结果',
    'search.loading':     '搜索中…',
    'search.no_result_hint': '试试：RAG、工程实践、fine-tuning、Agent…',
    'search.error':       '搜索失败: {msg}',
    'search.close':       '✕',

    // Course modal
    'course.title':       '课程探索',
    'course.subtitle':    '将下方提示词粘贴到你的本地 AI Agent（Claude Code / Cursor 等）中',
    'course.note':        '💡 本功能后续将自动化，目前请手动复制提示词到本地 AI Agent 执行。',
    'course.loading':     '加载中…',
    'btn.copy':           '📋 复制提示词',
    'copy.success':       '✓ 已复制',

    // Zoom
    'zoom.in':            '+',
    'zoom.out':           '−',
    'zoom.reset':         '⌂',

    // Directions quiz card
    'dir.topics_n':       '{n} 个主题',
    'dir.questions_n':    '{n} 道题',
    'dir.questions_dynamic': '题数按题库加载',

    // Node info panel meta
    'meta.difficulty':    '难度',
    'meta.importance':    '重要度',
    'node.prerequisites': '前置知识',
    'node.leads_to':      '延伸方向',

    // Audience badges
    'audience.entry':     '入门',
    'audience.general':   '通用',
    'audience.technical': '技术深入',
  },

  en: {
    'title':              'Super Alignment',
    'tab.graph':          'Map',
    'tab.quiz':           'Diagnostic',
    'tab.progress':       'Progress',
    'search.placeholder': 'Search topics, e.g.: RAG, fine-tuning, Agent…',
    'badge.loading':      'Loading...',
    'badge.mastered':     'Mastered',

    'sidebar.title':      'Learning Map',
    'cockpit.title':      'Find your weak spots, then export to your own note tools.',
    'cockpit.next_label': 'Recommended next',
    'cockpit.no_rec':     'Run a diagnostic to get recommendations.',
    'cockpit.primary':    'Diagnose now →',
    'cockpit.path_link':  'View paths',
    'cockpit.search_link':'Search',
    'cockpit.jump_toast': 'Switched to the topic view. Use “Global View” to return.',
    'theme.toggle':       'Toggle light/dark mode',
    'view.path':          'Learning Path',
    'view.global':        'Global View',
    'view.dir':           'Directory',
    'view.domain':        'Domain View',
    'crumb.all_areas':    'All Areas',

    'legend.domains':     'Knowledge Areas',
    'legend.status':      'Topic Mastery',
    'legend.size':        'Node Sizes',
    'legend.lines':       'Link Meanings',
    'legend.size.dir':    'Direction',
    'legend.size.topic':  'Topic (larger = more important)',
    'legend.line.prereq': 'Prerequisite',
    'legend.ring':        '○ Arc = aggregate mastery',

    'area.foundation':    'Foundations',
    'area.llm':           'LLMs',
    'area.application':   'Applications',
    'area.engineering':   'Engineering',
    'area.safety':        'Safety & Alignment',

    'node.empty':         'Click a node to view details',
    'node.hint.global':   'Global View',
    'node.hint.domain':   'Domain View',
    'node.hint.global.desc': 'Explore the full knowledge landscape',
    'node.hint.domain.desc': 'Drill down to specific topics',
    'node.hint.click':    'Click',
    'node.hint.click.desc': 'View topic details',
    'node.hint.dblclick': 'Double-click',
    'node.hint.dblclick.desc': 'Drill into that direction',
    'node.hint.legend':   'Legend',
    'node.hint.legend.desc': 'Click to filter by area',
    'type.area':          'Area',
    'type.direction':     'Direction',
    'type.topic':         'Topic',
    'node.topics_in':     '{n} topics',
    'node.dirs_in':       '{n} directions',
    'btn.quiz_dir':       'Quiz this direction ({n} Q) →',
    'btn.skip':           'Skip',
    'btn.view_topics':    'View topic graph',
    'btn.expand_dir':     'View topic graph',
    'btn.expand_area':    'Expand directions',
    'btn.browse_area':    'Browse this area →',
    'btn.locate':         'Locate in graph →',
    'btn.quiz_this_topic': 'Quiz This Topic (3 Q)',
    'btn.quiz_topic':     'Quiz This Direction ({n} Q)',
    'btn.course':         '🎓 Generate course prompt',

    'path.apply':         'Applied',
    'path.understand':    'Deep Dive',
    'path.mastered_of':   'Mastered {n} / {total}',
    'path.compare_hint': 'Use the buttons above to compare Applied vs Deep Dive paths.',

    'status.mastered':    'Mastered',
    'status.learning':    'Learning',
    'status.needs_work':  'Needs Work',
    'status.unknown':     'Not Tested',

    'quiz.title':         'Knowledge Quiz',
    'quiz.subtitle':      'Discover your AI knowledge gaps and get targeted recommendations',
    'quiz.diagnostic.title': 'Full Diagnostic',
    'quiz.diagnostic.desc':  '30 questions (2 per direction), about 12 minutes. You can quit anytime and resume later.\nGet a radar chart analysis + personalized recommendations.',
    'quiz.diagnostic.notice': '<strong>This is not an exam.</strong> Skipping hard questions helps the system find your starting point — it doesn\'t judge your level. Some questions are intentionally technical. Use "Skip" if unsure.',
    'btn.start_diagnostic': 'Start Full Diagnostic →',
    'quiz.or_choose':     '── Or choose a single direction ──',
    'quiz.flow.quit':     '← Quit',
    'quiz.flow.subtitle': 'Answer all questions',
    'quiz.dir_topic':     'Direction: {dir}  ·  Topic: {topic}',
    'quiz.topic_only':    'Topic: {topic}',
    'quiz.quit_confirm':  'Quit? Your answered progress will be saved for next time.',
    'quiz.subtitle_topic': '{n} questions · covering {topics} topic',
    'quiz.subtitle_direction': '{n} questions · covering {topics} topics',
    'quiz.subtitle_diagnostic': '{n} questions · covering all 15 directions',
    'btn.next':           'Next →',
    'btn.submit':         'Submit ✓',
    'quiz.check_failed':  'Verification failed, please check your network and retry',
    'quiz.load_failed':   'Failed to load questions: {msg}',
    'quiz.submit_failed': 'Submission failed: {msg}',

    'result.title':         'Diagnostic Results',
    'result.accuracy':      'Accuracy',
    'result.correct_of':    '{n} / {total} correct',
    'result.direction_scores': 'Scores by Direction',
    'result.weak_title':    'Recommended Focus Areas',
    'result.weak_hint':     'Click a tag to start targeted practice',
    'result.next_title':    'Recommended Next Steps',
    'result.next_view':     'View →',
    'btn.redo':             'Redo Diagnostic',
    'btn.view_graph':       'View Graph →',
    'btn.back_home':        'Back to Quiz Home',
    'dir_result.title':     'Direction Quiz Results',
    'dir_result.topics':    'Topic Mastery',
    'btn.view_dir_graph':   'View direction graph →',

    'stat.total':           'Total Topics',
    'stat.mastered':        'Mastered',
    'stat.learning':        'Learning',
    'stat.needs_work':      'Needs Work',
    'stat.unknown':         'Not Tested',
    'progress.radar_title': 'Mastery Radar',
    'progress.areas_title': 'Area Progress',
    'progress.next_title': 'Recommended Next Steps',
    'progress.heatmap_title': 'Knowledge Overview',

    'search.found':       'Found {n} results',
    'search.not_found':   'No results for "{q}"',
    'search.loading':     'Searching…',
    'search.no_result_hint': 'Try: RAG, fine-tuning, Agent, transformer…',
    'search.error':       'Search failed: {msg}',
    'search.close':       '✕',

    'course.title':       'Course Explorer',
    'course.subtitle':    'Paste the prompt below into your local AI agent (Claude Code / Cursor, etc.)',
    'course.note':        '💡 This feature will be automated in a future version. For now, copy the prompt manually.',
    'course.loading':     'Loading…',
    'btn.copy':           '📋 Copy Prompt',
    'copy.success':       '✓ Copied',

    'zoom.in':            '+',
    'zoom.out':           '−',
    'zoom.reset':         '⌂',

    'dir.topics_n':       '{n} topics',
    'dir.questions_n':    '{n} questions',
    'dir.questions_dynamic': 'Questions load from bank',

    // Node info panel meta
    'meta.difficulty':    'Difficulty',
    'meta.importance':    'Importance',
    'node.prerequisites': 'Prerequisites',
    'node.leads_to':      'Leads To',

    // Audience badges
    'audience.entry':     'Beginner',
    'audience.general':   'General',
    'audience.technical': 'Technical',
  }
};

// ── Runtime ───────────────────────────────────────────────────────

let _lang = localStorage.getItem('kg_lang') || 'zh';
const _changeListeners = [];

function getLang() { return _lang; }

function t(key, vars = {}) {
  const dict = TRANSLATIONS[_lang] || TRANSLATIONS['zh'];
  let str = dict[key] ?? TRANSLATIONS['zh'][key] ?? key;
  Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{${k}}`, v); });
  return str;
}

/** Return d.name_en (if present and non-empty) when in EN mode, else d.name. */
function entityName(d) {
  if (!d) return '';
  if (_lang === 'en' && d.name_en) return d.name_en;
  return d.name || '';
}

function setLang(lang) {
  if (lang !== 'zh' && lang !== 'en') return;
  _lang = lang;
  localStorage.setItem('kg_lang', lang);
  _applyDataI18n();
  _changeListeners.forEach(fn => fn(lang));
}

function onLangChange(fn) { _changeListeners.push(fn); }

function _applyDataI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    const val = t(key);
    if (val && val !== key) {
      if (el.tagName === 'INPUT') el.placeholder = val;
      else el.textContent = val;
    }
  });
  document.querySelectorAll('[data-i18n-html]').forEach(el => {
    const key = el.dataset.i18nHtml;
    const val = t(key);
    if (val && val !== key) el.innerHTML = val;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.dataset.i18nTitle;
    const val = t(key);
    if (val && val !== key) el.title = val;
  });
  // Update lang toggle button label
  const btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = _lang === 'zh' ? 'EN' : '中';
  // Update html lang attribute
  document.documentElement.lang = _lang === 'zh' ? 'zh-CN' : 'en';
}

// Apply on load
document.addEventListener('DOMContentLoaded', _applyDataI18n);
