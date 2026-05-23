/* ============================================================
   AI 知识图谱系统 v2 - 主应用脚本
   三级知识图谱 + 全局诊断 + 方向测评 + D3 雷达图
   ============================================================ */

'use strict';

// ── Language switch (i18n.js loaded before this file) ──────────
if (typeof onLangChange === 'function') {
  onLangChange(() => {
    // Re-render dynamic content on language change
    if (typeof renderDirectionsGrid === 'function') renderDirectionsGrid();
    if (typeof renderPathPanel      === 'function' && State.graphView === 'path') renderPathPanel();
    if (typeof renderDirPanel       === 'function' && State.graphView === 'dir')  renderDirPanel();
    if (typeof updateTopbarBadge    === 'function') updateTopbarBadge();
    if (typeof renderLearningCockpit === 'function') renderLearningCockpit();
    if (typeof updateThemeToggleLabel === 'function') updateThemeToggleLabel(document.documentElement.getAttribute('data-theme') || 'dark');
    if (State._lastProgressData) renderProgressHeatmap(State._lastProgressData);
    // Re-render quiz result views if visible
    if (State._lastDiagnosticResult && !document.getElementById('quiz-result-view').classList.contains('hidden')) {
      renderDiagnosticResult(State._lastDiagnosticResult);
    }
    if (State._lastDirectionResult && !document.getElementById('direction-result-view').classList.contains('hidden')) {
      renderDirectionResult(State._lastDirectionResult);
    }
    // Re-render graph labels
    if (State.graphView === 'global') renderGlobalView();
    else if (State.graphLevel === 'area') renderAreaLevel();
    else if (State.graphLevel === 'direction' && State.expandedArea) expandArea(State.expandedArea);
    else if (State.graphLevel === 'topic'     && State.expandedDirection) expandDirection(State.expandedDirection);
  });
}

// ============================================================
// 全局状态
// ============================================================

const State = {
  graphLevel: 'area',        // 'area' | 'direction' | 'topic'
  graphView: 'global',       // 'global' | 'domain' | 'path' | 'dir'
  expandedArea: null,        // 当前展开的 area id
  expandedDirection: null,   // 当前展开的 direction id
  graphData: null,           // 完整图谱数据
  directions: [],            // 所有方向数据
  areas: [],                 // 所有大类数据
  activePath: 'apply',       // 'apply' | 'understand'
  nodePositions: {},         // topicId → {x, y}，全局视图坐标
  activePathStep: null,      // 当前高亮的路径步骤 id
  filterArea: null,          // 图例点击筛选：null = 全部显示
  filterTag: null,           // 标签点击筛选：null = 全部显示
  searchHighlightIds: null,  // 搜索高亮：null = 无, Set<id> = 高亮集合
  focusedNode: null,         // 当前聚焦的节点，用于 zoom/pan 时跟随更新浮动按钮
  globalLabelMode: localStorage.getItem('kg_graph_global_labels') || 'smart', // smart | expanded
  directionLabelMode: localStorage.getItem('kg_graph_direction_labels') || 'smart', // smart | expanded

  _lastDiagnosticResult: null, // 最近一次诊断结果（供语言切换时重渲染）
  _lastDirectionResult: null,  // 最近一次方向测评结果

  // 测评
  quizMode: null,            // 'diagnostic' | 'direction' | 'topic'
  quizQuestions: [],         // 当前题目列表
  quizIndex: 0,              // 当前题目索引
  quizAnswers: [],           // 已提交的答案记录
  currentDirectionId: null,  // 当前方向测评的 direction id
  answeredCurrent: false,    // 当前题目是否已作答
};

window.State = State;

document.addEventListener('click', e => {
  const btn = e.target?.closest?.('[data-graph-scale-action]');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  handleGraphScaleAction(btn.dataset.graphScaleAction);
});

// ============================================================
// 学习路径定义（按意图分组）
// ============================================================

const LEARNING_PATHS = {
  apply: {
    label: '会用',
    desc: '从理解AI能力到使用Agent工具链的实践路径，适合想把AI用起来的人',
    steps: [
      'llm_capabilities',
      'basic_prompting',
      'chain_of_thought',
      'context_engineering',
      'rag_basics',
      'embeddings',
      'agent_basics',
      'tool_use',
      'mcp_protocol',
      'skill_building',
      'workflow_automation',
      'ai_coding',
    ]
  },
  understand: {
    label: '懂原理',
    desc: '从数学基础到大模型训练对齐的技术原理路径，适合想理解AI底层机制的人',
    steps: [
      'linear_algebra',
      'probability_statistics',
      'neural_network_basics',
      'backpropagation',
      'attention_mechanism',
      'transformer_arch',
      'tokenization',
      'pretrained_lm',
      'llm_pretraining',
      'sft',
      'rlhf',
      'peft_lora',
    ]
  }
};

window.LEARNING_PATHS = LEARNING_PATHS;

// ============================================================
// 安全工具：HTML 实体转义，防止 XSS
// ============================================================

function escHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// fetch 超时包装器（默认 8 秒）
function fetchWithTimeout(url, options = {}, ms = 8000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal })
    .finally(() => clearTimeout(timer));
}


// ============================================================
// PM 优化：本地埋点、首次引导、导出预览、上手清单
// ============================================================

const KG_EVENT_LIMIT = 500;

function readJsonStorage(storage, key, fallback) {
  try {
    const raw = storage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (_) { return fallback; }
}

function writeJsonStorage(storage, key, value) {
  try { storage.setItem(key, JSON.stringify(value)); } catch (_) {}
}

function trackEvent(name, data = {}) {
  const event = { name, data, at: new Date().toISOString(), ts: Date.now() };
  const events = readJsonStorage(localStorage, 'kg_events', []);
  events.push(event);
  writeJsonStorage(localStorage, 'kg_events', events.slice(-KG_EVENT_LIMIT));
  renderPrivacyPanel();
}

function getKgEvents() { return readJsonStorage(localStorage, 'kg_events', []); }

function downloadUsageData() {
  const payload = JSON.stringify({ exported_at: new Date().toISOString(), events: getKgEvents() }, null, 2);
  const blob = new Blob([payload], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'super-alignment-local-events.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  trackEvent('usage_data_exported');
}

function clearUsageData() {
  if (!window.confirm(getLang() === 'en' ? 'Clear all local usage events?' : '清空所有本地使用事件？')) return;
  try { localStorage.removeItem('kg_events'); } catch (_) {}
  renderPrivacyPanel();
  showToast(getLang() === 'en' ? 'Local usage data cleared' : '本地使用数据已清空');
}

function renderPrivacyPanel() {
  const el = document.getElementById('privacy-events-summary');
  if (!el) return;
  const events = getKgEvents();
  const counts = events.reduce((acc, e) => { acc[e.name] = (acc[e.name] || 0) + 1; return acc; }, {});
  const top = Object.entries(counts).sort((a,b)=>b[1]-a[1]).slice(0, 6);
  el.innerHTML = `<strong>${getLang() === 'en' ? 'Local events' : '本地事件'}</strong>：${events.length} ${getLang() === 'en' ? 'records' : '条'}${top.length ? `<div class="privacy-event-tags">${top.map(([k,v]) => `<span>${escHtml(k)} · ${v}</span>`).join('')}</div>` : ''}<p>${getLang() === 'en' ? 'They stay in localStorage and are only used for this browser experience.' : '这些数据只保存在当前浏览器 localStorage，用于本地体验与自查，不会上传。'}</p>`;
}

function setupIntroOverlay() {
  const overlay = document.getElementById('intro-overlay');
  if (!overlay) return;
  const seen = localStorage.getItem('kg_seen_intro') === '1';
  if (!seen) {
    window.setTimeout(() => {
      overlay.classList.remove('hidden');
      trackEvent('intro_shown');
    }, 60);
  }
  const closeIntro = (name) => {
    localStorage.setItem('kg_seen_intro', '1');
    overlay.classList.add('hidden');
    trackEvent(name);
    renderLearningCockpit();
  };
  document.getElementById('intro-quickstart')?.addEventListener('click', () => {
    closeIntro('intro_quickstart_click');
    startQuickDiagnostic();
  });
  document.getElementById('intro-browse')?.addEventListener('click', () => closeIntro('intro_browse_click'));
}

function getOnboardSteps() { return readJsonStorage(localStorage, 'kg_onboard_steps', {}); }
function completeOnboardStep(step) {
  const steps = getOnboardSteps();
  if (steps[step]) return;
  steps[step] = Date.now();
  writeJsonStorage(localStorage, 'kg_onboard_steps', steps);
  renderOnboardChecklist();
  if (['node', 'quiz', 'export'].every(k => steps[k])) {
    showToast(getLang() === 'en' ? 'You have completed the starter loop' : '已完成上手闭环：定位、学习、导出');
  }
}

function getOnboardingMarkup() {
  const isEn = getLang() === 'en';
  return `<div class="node-info-empty" id="node-info-empty-msg">
    <div class="onboard-title">${isEn ? '3-step starter loop' : '3 步上手 Super Alignment'}</div>
    <div class="onboard-subtitle">${isEn ? 'This app is the map; your note tool is the destination.' : '这里是地图；你的笔记工具是目的地。'}</div>
    <div class="onboard-checklist" id="onboard-checklist">
      <div class="onboard-step" data-step="node"><span></span><strong>${isEn ? 'Click a node' : '单击一个节点'}</strong><em>${isEn ? 'Understand position and next actions' : '看懂主题位置与下一步动作'}</em></div>
      <div class="onboard-step" data-step="quiz"><span></span><strong>${isEn ? 'Finish quick diagnostic' : '完成快速定位'}</strong><em>${isEn ? 'Make recommendations honest' : '让推荐从真实答题产生'}</em></div>
      <div class="onboard-step" data-step="export"><span></span><strong>${isEn ? 'Export once' : '导出一次材料'}</strong><em>${isEn ? 'Move material to your own tools' : '回到你熟悉的笔记工具'}</em></div>
    </div>
  </div>`;
}

function renderOnboardChecklist() {
  const list = document.getElementById('onboard-checklist');
  if (!list) return;
  const steps = getOnboardSteps();
  list.querySelectorAll('.onboard-step').forEach(el => {
    const done = Boolean(steps[el.dataset.step]);
    el.classList.toggle('done', done);
    const badge = el.querySelector('span');
    if (badge) badge.textContent = done ? '✓' : '○';
  });
}

function setupLegendMemory() {
  const legend = document.querySelector('.graph-legend');
  if (!legend) return;
  const collapsed = localStorage.getItem('kg_legend_collapsed') === '1';
  if (collapsed) legend.removeAttribute('open');
  legend.addEventListener('toggle', () => {
    localStorage.setItem('kg_legend_collapsed', legend.open ? '0' : '1');
    trackEvent('legend_toggle', { open: legend.open });
  });
}

function exportKindMeta(kind) {
  const map = {
    obsidian: { title: 'Obsidian Vault', desc: '保留 Markdown、wiki 链接和预配置，适合长期批注与沉淀。', items: ['全部主题正文', '知识点之间的 wiki 链接', '可直接打开的 Vault 结构'] },
    anki: { title: 'Anki CSV', desc: '把核心知识点带进间隔复习流程，适合复习党。', items: ['主题问答卡片', '方向标签', '可导入 Anki 的 CSV'] },
    markdown: { title: 'Markdown Zip', desc: '通用 Markdown 文件夹，适合 Notion / Logseq / 任何编辑器。', items: ['全部主题 Markdown', '按方向组织的文件夹', '不绑定任何平台'] },
  };
  return map[kind] || { title: kind, desc: '导出学习材料。', items: [] };
}

function showExportPreview(kind) {
  const modal = document.getElementById('export-preview-modal');
  const overlay = document.getElementById('export-modal-overlay');
  const title = document.getElementById('export-preview-title');
  const body = document.getElementById('export-preview-body');
  const confirmBtn = document.getElementById('export-preview-confirm');
  if (!modal || !overlay || !body || !confirmBtn) return doExport(kind);
  const meta = exportKindMeta(kind);
  title.textContent = `导出 ${meta.title}`;
  body.innerHTML = `<p>${escHtml(meta.desc)}</p><div class="export-preview-list">${meta.items.map(i => `<span>✓ ${escHtml(i)}</span>`).join('')}</div><div class="export-preview-note">导出不会锁定你的内容；它只是把同一套知识源分发到你选择的工具。</div>`;
  confirmBtn.onclick = () => doExport(kind);
  document.body.classList.add('export-modal-open');
  overlay.classList.remove('hidden');
  modal.classList.remove('hidden');
  modal.classList.remove('modal-enter');
  void modal.offsetWidth;
  modal.classList.add('modal-enter');
  trackEvent('export_preview_shown', { kind });
}

function closeExportPreview() {
  const confirmBtn = document.getElementById('export-preview-confirm');
  setButtonBusy(confirmBtn, false);
  document.body.classList.remove('export-modal-open');
  document.getElementById('export-preview-modal')?.classList.add('hidden');
  document.getElementById('export-modal-overlay')?.classList.add('hidden');
}

function doExport(kind) {
  trackEvent('export_start', { kind });
  const confirmBtn = document.getElementById('export-preview-confirm');
  const fn = window.Export?.[kind];
  if (typeof fn === 'function') {
    setButtonBusy(confirmBtn, true, getLang() === 'en' ? 'Preparing…' : '准备中…');
    window.setTimeout(() => {
      try {
        fn();
        closeExportPreview();
        completeOnboardStep('export');
        trackEvent('export_complete', { kind });
        showToast(
          getLang() === 'en' ? 'Export started. Keep learning in your own tools.' : '已开始导出，继续在你熟悉的工具里沉淀。',
          { tone: 'success', duration: 3200 }
        );
      } catch (e) {
        showToast(getLang() === 'en' ? 'Export failed. Please try again.' : '导出失败，请重试。', { tone: 'error' });
      } finally {
        setButtonBusy(confirmBtn, false);
      }
    }, 180);
    return;
  }
  closeExportPreview();
  showToast(getLang() === 'en' ? 'Export is not available in this build' : '当前构建暂未接入导出能力', { tone: 'warning' });
}

function maybeShowExportMilestone(progress) {
  const count = (progress?.mastered || 0) + (progress?.learning || 0);
  const milestone = [30, 15, 5].find(n => count >= n);
  if (!milestone) return;
  const key = `kg_export_nudged_${milestone}`;
  if (localStorage.getItem(key) === '1') return;
  localStorage.setItem(key, '1');
  showToast(
    getLang() === 'en' ? `You have ${count} active topics — consider exporting them.` : `你已有 ${count} 个学习过的主题，可以导出到笔记工具沉淀。`,
    { tone: 'success', actionLabel: getLang() === 'en' ? 'Export' : '去导出', onAction: () => showExportPreview('obsidian'), duration: 5200 }
  );
}

// ============================================================
// Tab 切换
// ============================================================

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
    trackEvent('tab_switch', { tab: btn.dataset.tab });
    if (btn.dataset.tab === 'quiz') renderQuizDraftCard();
    if (btn.dataset.tab === 'progress') loadProgress();
    if (btn.dataset.tab === 'graph' && svg) {
      requestAnimationFrame(() => {
        const wrap = document.getElementById('graph-svg').parentElement;
        const nW = wrap.clientWidth, nH = wrap.clientHeight;
        if (nW > 0 && nH > 0) {
          svg.attr('width', nW).attr('height', nH);
          if (State.graphView === 'global') {
            renderGlobalView();
          } else if (State.graphLevel === 'area') {
            renderAreaLevel();
          } else if (simulation) {
            simulation.force('center', d3.forceCenter(nW / 2, nH / 2)).alpha(0.1).restart();
            setTimeout(fitGraph, 300);
          }
        }
      });
    }
  });
});

// ============================================================
// 工具函数
// ============================================================

function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }

function getStatusLabel(s, tested = false) {
  if (s === 'needs_work' || (s === 'unknown' && tested)) return t('status.needs_work');
  return { mastered: t('status.mastered'), learning: t('status.learning') }[s] || t('status.unknown');
}

function getStatusClass(s, tested = false) {
  if (s === 'needs_work' || (s === 'unknown' && tested)) return 'status-needs-work';
  return { mastered: 'status-mastered', learning: 'status-learning' }[s] || 'status-unknown';
}

function scoreColor(pct) {
  if (pct >= 80) return '#30D158';
  if (pct >= 60) return '#FF9F0A';
  return '#FF453A';
}

function masteryColor(baseColor, mastered, total) {
  if (!total || !mastered) return baseColor;
  const pct = Math.min(mastered / total, 1);
  return d3.interpolateRgb(baseColor, '#30D158')(pct * 0.55);
}

// ============================================================
// 初始化
// ============================================================

async function init() {
  try {
    const [graphResp, dirsResp, areasResp, pathsResp] = await Promise.all([
      fetchWithTimeout('/api/graph').then(r => r.json()),
      fetchWithTimeout('/api/directions').then(r => r.json()),
      fetchWithTimeout('/api/areas').then(r => r.json()),
      fetchWithTimeout('/api/learning-paths').then(r => r.json()).catch(() => null),
    ]);
    State.graphData   = graphResp;
    State.directions  = dirsResp;
    State.areas       = areasResp;

    // Merge API-sourced paths into LEARNING_PATHS (#30)
    if (Array.isArray(pathsResp)) {
      pathsResp.forEach(p => {
        if (p.id && Array.isArray(p.steps)) {
          LEARNING_PATHS[p.id] = {
            label:   p.name   || p.id,
            label_en: p.name_en || p.name || p.id,
            desc:    p.desc   || '',
            desc_en: p.desc_en || p.desc || '',
            steps:   p.steps.map(s => (typeof s === 'string' ? s : s.id)),
          };
        }
      });
    }

    requestAnimationFrame(() => initGraph());
    renderDirectionsGrid();
    renderOnboardChecklist();
    setupLegendMemory();
    setupIntroOverlay();
    renderQuizDraftCard();
    await updateTopbarBadge();
    await renderLearningCockpit();
  } catch (e) {
    console.error('Init error:', e);
  }
}

async function updateTopbarBadge() {
  try {
    const p = await fetchWithTimeout('/api/progress').then(r => r.json());
    const badge = document.getElementById('topbar-badge');
    badge.textContent = '';
    const strong = document.createElement('strong');
    strong.textContent = p.mastered_percent + '%';
    if (getLang() === 'en') {
      badge.append(strong, ` (${p.mastered}/${p.total})`);
    } else {
      badge.append(t('badge.mastered') + ' ', strong, ` · ${p.mastered}/${p.total}`);
    }
    badge.style.visibility = 'visible';
    return p;
  } catch (e) {
    console.warn('Progress badge update failed:', e);
  }
}

async function renderLearningCockpit() {
  const metrics = document.getElementById('cockpit-metrics');
  const nextEl = document.getElementById('cockpit-next');
  if (!metrics || !nextEl) return;
  try {
    const progress = await fetchWithTimeout('/api/progress').then(r => r.json());
    maybeShowExportMilestone(progress);
    const testedIds = readJsonStorage(localStorage, 'kg_tested', []);
    const dismissed = new Set(readJsonStorage(localStorage, 'kg_dismissed_recs', []));
    const recsRaw = testedIds.length > 0
      ? await fetchWithTimeout('/api/recommendations?top_n=5&require_tested=true').then(r => r.json()).catch(() => [])
      : [];
    const recs = (Array.isArray(recsRaw) ? recsRaw : []).filter(r => r && !dismissed.has(r.id));
    const mastered = progress.mastered || 0;
    const total = progress.total || 0;
    const pct = progress.mastered_percent || 0;
    const needs = progress.needs_work || 0;
    const learning = progress.learning || 0;
    const unknown = progress.unknown || 0;

    metrics._statsData = { mastered, total, pct, needs, learning, unknown };

    const metricEl = document.getElementById('cockpit-metric-el');
    if (metricEl) {
      metricEl.innerHTML = `<span>${getLang() === 'en' ? 'Mastery' : '掌握进度'}</span><strong>${pct}%</strong>`;
      metricEl.onclick = () => showCockpitStatsPopup(metricEl, metrics._statsData);
      metricEl.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showCockpitStatsPopup(metricEl, metrics._statsData); }
      };
    }

    const rec = recs[0] || null;
    if (rec) {
      const name = (getLang() === 'en' && rec.name_en) ? rec.name_en : rec.name;
      const reason = rec.reason || buildClientRecommendationReason(rec);
      nextEl.innerHTML = `
        <span>${getLang() === 'en' ? 'For you' : '为你推荐'}</span>
        <button class="cockpit-rec-title" type="button" data-action="start" data-topic-id="${escHtml(rec.id)}">${escHtml(name)}</button>
        <em class="cockpit-rec-reason">${escHtml(reason)}</em>
        <div class="cockpit-rec-actions">
          <button type="button" class="cockpit-rec-primary" data-action="start">${getLang() === 'en' ? 'Start learning →' : '开始学习 →'}</button>
          <button type="button" class="cockpit-rec-dismiss" data-action="dismiss">${getLang() === 'en' ? 'Skip' : '跳过这条'}</button>
        </div>`;
      trackEvent('rec_shown', { id: rec.id, surface: 'cockpit' });
      nextEl.querySelectorAll('[data-action="start"]').forEach(btn => btn.addEventListener('click', () => {
        trackEvent('rec_click', { id: rec.id, surface: 'cockpit' });
        switchToTab('graph');
        setTimeout(() => {
          navigateToNode('topic', rec.id);
          showRecommendationToast();
        }, 80);
      }));
      nextEl.querySelector('[data-action="dismiss"]')?.addEventListener('click', () => {
        const list = readJsonStorage(localStorage, 'kg_dismissed_recs', []);
        if (!list.includes(rec.id)) list.push(rec.id);
        writeJsonStorage(localStorage, 'kg_dismissed_recs', list);
        trackEvent('rec_dismiss', { id: rec.id, surface: 'cockpit' });
        renderLearningCockpit();
      });
    } else {
      nextEl.innerHTML = `<span>${t('cockpit.next_label')}</span>
        <em>${getLang() === 'en' ? 'Run the 5-question quick diagnostic to unlock honest recommendations.' : '完成 5 题快速定位后，这里会出现基于真实答题的推荐。'}</em>
        <button type="button" class="cockpit-inline-cta" onclick="startQuickDiagnostic()">${getLang() === 'en' ? 'Quick diagnostic →' : '开始快速定位 →'}</button>`;
    }
  } catch (e) {
    console.warn('Cockpit render failed:', e);
  }
}

function buildClientRecommendationReason(rec) {
  const topic = (State.graphData?.nodes || []).find(n => n.id === rec.id) || rec;
  const dir = (State.directions || []).find(d => d.id === topic.direction);
  const bits = [];
  if (dir) bits.push(getLang() === 'en' ? `Belongs to ${dir.name_en || dir.name}.` : `属于「${dir.name}」方向。`);
  if ((topic.importance || 0) >= 4) bits.push(getLang() === 'en' ? 'High-importance topic.' : '这是高重要度主题。');
  if ((topic.difficulty || 3) <= 2) bits.push(getLang() === 'en' ? 'Low entry difficulty.' : '入门难度较低，适合从这里开始。');
  return bits.join(getLang() === 'en' ? ' ' : '；') || (getLang() === 'en' ? 'Recommended from your diagnostic and learning status.' : '基于你的测评与学习状态推荐。');
}

function showRecommendationToast() {
  let el = document.getElementById('rec-context-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'rec-context-toast';
    el.className = 'rec-context-toast';
    document.body.appendChild(el);
  }
  el.innerHTML = `${getLang() === 'en' ? 'Opened from recommendation' : '从推荐进入此主题'} · <button type="button">${getLang() === 'en' ? 'Back to global' : '返回全局总览'} ←</button>`;
  el.querySelector('button').onclick = () => { setGraphView('global'); el.classList.remove('show'); };
  el.classList.add('show');
  clearTimeout(showRecommendationToast._timer);
  showRecommendationToast._timer = setTimeout(() => el.classList.remove('show'), 3000);
}

function showCockpitStatsPopup(anchor, data) {
  document.getElementById('cockpit-stats-popup')?.remove();
  const popup = document.createElement('div');
  popup.id = 'cockpit-stats-popup';
  popup.className = 'cockpit-stats-popup';
  const isEn = getLang() === 'en';
  popup.innerHTML = `
    <div class="csp-row"><span class="csp-dot" style="background:#30D158"></span><span>${isEn ? 'Mastered' : '已掌握'}</span><strong>${data.mastered}</strong></div>
    <div class="csp-row"><span class="csp-dot" style="background:#FF9F0A"></span><span>${isEn ? 'Learning' : '学习中'}</span><strong>${data.learning}</strong></div>
    <div class="csp-row"><span class="csp-dot" style="background:#FF453A"></span><span>${isEn ? 'Needs work' : '待加强'}</span><strong>${data.needs}</strong></div>
    <div class="csp-row"><span class="csp-dot" style="background:#3A3A3C;border:1px solid #666"></span><span>${isEn ? 'Not tested' : '未测评'}</span><strong>${data.unknown}</strong></div>
  `;
  document.body.appendChild(popup);
  const rect = anchor.getBoundingClientRect();
  popup.style.top = `${rect.bottom + 6}px`;
  popup.style.left = `${rect.left}px`;
  const close = e => { if (!popup.contains(e.target) && e.target !== anchor) { popup.remove(); document.removeEventListener('click', close, true); } };
  setTimeout(() => document.addEventListener('click', close, true), 0);
}

async function refreshGraphData() {
  try {
    const graphResp = await fetchWithTimeout('/api/graph').then(r => r.json());
    State.graphData = graphResp;
    // 重新渲染当前视图
    if (State.graphView === 'global' || State.graphView === 'path' || State.graphView === 'dir') {
      renderGlobalView();
      if (State.graphView === 'dir') renderDirPanel();
    } else if (State.graphLevel === 'area') {
      renderAreaLevel();
    } else if (State.graphLevel === 'direction' && State.expandedArea) {
      expandArea(State.expandedArea);
    } else if (State.graphLevel === 'topic' && State.expandedDirection) {
      expandDirection(State.expandedDirection);
    }
  } catch (e) {
    console.warn('Graph data refresh failed:', e);
  }
}

function switchToTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`panel-${tabName}`).classList.add('active');
  trackEvent('tab_switch', { tab: tabName, programmatic: true });
  if (tabName === 'quiz') renderQuizDraftCard();
  if (tabName === 'progress') loadProgress();
  if (tabName === 'graph' && svg) {
    requestAnimationFrame(() => {
      const wrap = document.getElementById('graph-svg').parentElement;
      const nW = wrap.clientWidth, nH = wrap.clientHeight;
      if (nW > 0 && nH > 0) {
        svg.attr('width', nW).attr('height', nH);
        if (State.graphView === 'global') {
          renderGlobalView();
        } else if (State.graphLevel === 'area') {
          renderAreaLevel();
        } else if (simulation) {
          simulation.force('center', d3.forceCenter(nW / 2, nH / 2)).alpha(0.1).restart();
          setTimeout(fitGraph, 300);
        }
      }
    });
  }
}


// ============================================================
// Tab 1: 知识图谱 (D3)
// ============================================================

let svg, g, simulation, zoomBehavior;
const AREA_R = 42, DIR_R = 26, TOPIC_R = 14;
const GRAPH_AREA_COLORS = {
  foundation: '#64D2FF',
  llm: '#A78BFA',
  application: '#0A84FF',
  engineering: '#30D158',
  safety: '#FF9F0A',
};
function graphAreaColor(areaId, fallback = '#8E8E93') {
  return GRAPH_AREA_COLORS[areaId] || fallback;
}
function graphNodeColor(d) {
  if (!d) return '#8E8E93';
  const areaId = d.type === 'area' ? d.id : d.area;
  return graphAreaColor(areaId, d.color || '#8E8E93');
}

function initGraph() {
  const wrap = document.getElementById('graph-svg').parentElement;
  let W = wrap.clientWidth, H = wrap.clientHeight;

  // 如果布局未完成（display:none 或尺寸还未计算），使用窗口尺寸作为后备
  if (!W || !H) {
    W = Math.max(window.innerWidth * 0.58, 400);
    H = Math.max(window.innerHeight * 0.75, 400);
  }

  svg = d3.select('#graph-svg');
  svg.attr('width', W).attr('height', H);

  zoomBehavior = d3.zoom()
    .scaleExtent([0.2, 3])
    .on('zoom', e => {
      g.attr('transform', e.transform);
      if (State.focusedNode) {
        const menu = document.getElementById('node-action-fan');
        const wrap = document.getElementById('graph-svg')?.parentElement;
        const point = getFocusedNodeScreenPoint(State.focusedNode);
        if (menu && wrap && point) positionNodeActionFan(menu, wrap, point);
      }
    });

  svg.call(zoomBehavior);
  svg.on('click', () => clearNodeFocus());
  g = svg.append('g');

  renderGlobalView();

  const ro = new ResizeObserver(entries => {
    const e = entries[0];
    const nW = e.contentRect.width, nH = e.contentRect.height;
    if (nW > 0 && nH > 0) {
      svg.attr('width', nW).attr('height', nH);
      if (State.graphView === 'global' || State.graphView === 'path' || State.graphView === 'dir') {
        renderGlobalView();
      } else if (State.graphLevel === 'area') {
        renderAreaLevel();
      } else if (simulation) {
        simulation.force('center', d3.forceCenter(nW / 2, nH / 2)).alpha(0.2).restart();
      }
    }
  });
  ro.observe(wrap);
}

function clearGraph() {
  clearNodeFocus({ keepCard: true });
  document.getElementById('graph-svg')?.parentElement?.classList.remove('global-density-mode');
  hideGraphScaleHint();
  if (simulation) simulation.stop();
  g.selectAll('*').remove();
}

function showGraphScaleHint({ title, body, tone = 'info', actionLabel, action, meta } = {}) {
  const wrap = document.getElementById('graph-svg')?.parentElement;
  if (!wrap || !title) return;
  let hint = document.getElementById('graph-scale-hint');
  if (!hint) {
    hint = document.createElement('div');
    hint.id = 'graph-scale-hint';
    hint.className = 'graph-scale-hint';
    wrap.appendChild(hint);
  }
  hint.className = `graph-scale-hint graph-scale-hint-${tone}`;
  const actionHtml = action && actionLabel
    ? `<button type="button" class="graph-scale-action" data-graph-scale-action="${escHtml(action)}">${escHtml(actionLabel)}</button>`
    : '';
  const metaHtml = meta ? `<small>${escHtml(meta)}</small>` : '';
  hint.innerHTML = `<strong>${escHtml(title)}</strong><span>${escHtml(body || '')}</span>${metaHtml}${actionHtml}`;
  hint.classList.add('show');
}

function handleGraphScaleAction(action) {
  if (action === 'toggle-global-labels') {
    State.globalLabelMode = State.globalLabelMode === 'expanded' ? 'smart' : 'expanded';
    localStorage.setItem('kg_graph_global_labels', State.globalLabelMode);
    renderGlobalView();
    showToast(State.globalLabelMode === 'expanded'
      ? (getLang() === 'en' ? 'More topic labels shown' : '已显示更多主题标签')
      : (getLang() === 'en' ? 'Returned to overview labels' : '已恢复总览标签密度'), { tone: 'success', duration: 1500 });
  }
  if (action === 'toggle-direction-labels') {
    State.directionLabelMode = State.directionLabelMode === 'expanded' ? 'smart' : 'expanded';
    localStorage.setItem('kg_graph_direction_labels', State.directionLabelMode);
    if (State.expandedDirection) expandDirection(State.expandedDirection);
    showToast(State.directionLabelMode === 'expanded'
      ? (getLang() === 'en' ? 'More labels shown in this direction' : '已显示更多本方向标签')
      : (getLang() === 'en' ? 'Returned to core labels' : '已恢复核心标签显示'), { tone: 'success', duration: 1500 });
  }
}

function hideGraphScaleHint() {
  document.getElementById('graph-scale-hint')?.classList.remove('show');
}

function renderAreaLevel() {
  State.graphLevel = 'area';
  State.expandedArea = null;
  State.expandedDirection = null;
  updateLayerDots(1);
  updateBreadcrumb([]);
  clearGraph();
  if (simulation) { simulation.stop(); simulation = null; }

  const areas = State.graphData.nodes.filter(n => n.type === 'area');
  const W = +svg.attr('width');
  const H = +svg.attr('height');
  if (!W || !H) return;

  const n = areas.length;
  const r = Math.min(W, H) * 0.3;
  const cx = W / 2, cy = H / 2;

  // 固定圆形布局，不使用力仿真
  const nodes = areas.map((a, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { ...a, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  });

  const node = g.selectAll('.node-g')
    .data(nodes).join('g')
    .attr('class', 'node-g')
    .attr('data-id', d => d.id)
    .style('cursor', 'pointer')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .on('click', (e, d) => { e.stopPropagation(); showNodeInfo(d); expandArea(d.id); });

  node.append('title').text(d => entityName(d) || '');
  node.append('circle')
    .attr('r', AREA_R)
    .attr('fill', d => d.color).attr('fill-opacity', 0.88)
    .attr('stroke', d => d.color)
    .attr('stroke-width', 2.5)
    .attr('class', 'node-circle');

  node.append('path')
    .attr('d', d => makeRingPath(d, AREA_R))
    .attr('fill', '#30D158').attr('opacity', 0.9);

  node.append('text').attr('dy', '-6')
    .attr('class', 'node-label node-label-area').style('font-size', '18px')
    .text(d => d.icon || '');

  node.append('text').attr('dy', '14')
    .attr('class', 'node-label node-label-area')
    .text(d => entityName(d));

  fitGraph();
}

function expandArea(areaId) {
  State.graphLevel = 'direction';
  State.expandedArea = areaId;
  State.expandedDirection = null;
  const areaNode = State.graphData.nodes.find(n => n.id === areaId);
  updateLayerDots(2);
  updateBreadcrumb([{ id: areaId, name: areaNode?.name || areaId, fn: resetToAreas }]);
  const backBtn = document.getElementById('crumb-back-global');
  if (backBtn) backBtn.style.display = '';
  clearGraph();

  const wrap = document.getElementById('graph-svg').parentElement;
  const W = wrap.clientWidth, H = wrap.clientHeight;

  // 中心 area 节点 + 周围 direction 节点
  const areaN = { ...areaNode, fx: W / 2, fy: H / 2 };
  const dirNodes = State.graphData.nodes
    .filter(n => n.type === 'direction' && n.area === areaId)
    .map(n => ({ ...n, x: W / 2 + (Math.random() - 0.5) * 200, y: H / 2 + (Math.random() - 0.5) * 200 }));

  const allNodes = [areaN, ...dirNodes];
  const links = dirNodes.map(d => ({ source: areaId, target: d.id }));

  simulation = d3.forceSimulation(allNodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(160).strength(1))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(W / 2, H / 2))
    .force('collision', d3.forceCollide(d => d.type === 'area' ? AREA_R + 10 : DIR_R + 12))
    .on('tick', ticked);

  // 链接
  const link = g.selectAll('.link-g')
    .data(links).join('line')
    .attr('class', 'link-line');

  // 节点
  const node = g.selectAll('.node-g')
    .data(allNodes).join('g')
    .attr('class', 'node-g')
    .attr('data-id', d => d.id)
    .style('cursor', d => d.type === 'direction' ? 'pointer' : 'default')
    .on('click', (e, d) => {
      e.stopPropagation();
      showNodeInfo(d);
      if (d.type === 'direction') expandDirection(d.id);
    });

  node.append('title').text(d => entityName(d) || '');
  node.append('circle')
    .attr('r', d => d.type === 'area' ? AREA_R : DIR_R)
    .attr('fill', d => d.color)
    .attr('fill-opacity', d => d.type === 'area' ? 0.88 : 0.82)
    .attr('stroke', d => d.color)
    .attr('stroke-width', d => d.type === 'area' ? 2.5 : 1.5)
    .attr('class', 'node-circle');

  node.append('path')
    .attr('d', d => makeRingPath(d, d.type === 'area' ? AREA_R : DIR_R))
    .attr('fill', '#30D158').attr('opacity', 0.9);

  node.append('text')
    .attr('dy', d => d.type === 'area' ? '-6' : '4')
    .attr('class', d => `node-label ${d.type === 'area' ? 'node-label-area' : 'node-label-direction'}`)
    .style('font-size', d => d.type === 'area' ? '18px' : '11px')
    .text(d => d.type === 'area' ? (d.icon || entityName(d)) : entityName(d));

  function ticked() {
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  }

  setTimeout(fitGraph, 300);
}

function expandDirection(dirId) {
  State.graphLevel = 'topic';
  State.expandedDirection = dirId;
  const dirNode = State.graphData.nodes.find(n => n.id === dirId);
  const areaId = dirNode?.area;
  const areaNode = State.graphData.nodes.find(n => n.id === areaId);

  updateLayerDots(3);
  updateBreadcrumb([
    { id: areaId, name: areaNode?.name || areaId, fn: resetToAreas },
    { id: dirId, name: dirNode?.name || dirId, fn: () => expandArea(areaId) }
  ]);
  const backBtn = document.getElementById('crumb-back-global');
  if (backBtn) backBtn.style.display = '';
  clearGraph();

  const wrap = document.getElementById('graph-svg').parentElement;
  const W = wrap.clientWidth, H = wrap.clientHeight;

  const parentAreaId = `parent-${areaId}`;
  const areaContextN = areaNode
    ? {
        ...areaNode,
        id: parentAreaId,
        originalId: areaId,
        type: 'parent_area',
        fx: W / 2,
        fy: Math.max(78, H / 2 - 185),
      }
    : null;
  const dirN = { ...dirNode, fx: W / 2, fy: H / 2 };
  const topicNodes = State.graphData.nodes
    .filter(n => n.type === 'topic' && n.direction === dirId)
    .map(n => ({ ...n, x: W / 2 + (Math.random() - 0.5) * 250, y: H / 2 + (Math.random() - 0.5) * 250 }));
  const denseDirection = topicNodes.length > 18;
  const directionLabelsExpanded = State.directionLabelMode === 'expanded';
  const topicLabelBudget = denseDirection
    ? (directionLabelsExpanded ? Math.min(topicNodes.length, 36) : 14)
    : Infinity;
  const labeledTopicIds = new Set(topicNodes
    .slice()
    .sort((a, b) => (b.importance || 3) - (a.importance || 3) || (a.difficulty || 3) - (b.difficulty || 3))
    .slice(0, topicLabelBudget)
    .map(t => t.id));
  const topicNodeRadius = d => {
    if (d.type !== 'topic') return d.type === 'direction' ? DIR_R : 22;
    const base = 5 + (d.importance || 3) * 2;
    return denseDirection ? Math.max(7, base * 0.82) : base;
  };
  if (denseDirection) {
    showGraphScaleHint({
      title: getLang() === 'en' ? `${topicNodes.length} topics in this direction` : `本方向 ${topicNodes.length} 个主题`,
      body: directionLabelsExpanded
        ? (getLang() === 'en'
          ? 'Showing more labels for inspection. Search remains the fastest exact locator.'
          : '已显示更多标签用于巡检；精确定位仍建议使用搜索。')
        : (getLang() === 'en'
          ? 'Showing core labels only. Use search or the directory for exact topics.'
          : '仅显示核心主题标签；精确查找请用搜索或目录。'),
      meta: getLang() === 'en'
        ? 'Node size = importance · color = learning status'
        : '节点大小=重要度 · 颜色=学习状态',
      actionLabel: directionLabelsExpanded
        ? (getLang() === 'en' ? 'Core labels' : '恢复核心')
        : (getLang() === 'en' ? 'More labels' : '显示更多'),
      action: 'toggle-direction-labels',
      tone: 'density'
    });
  }

  const allNodes = [areaContextN, dirN, ...topicNodes].filter(Boolean);
  const links = [
    ...(areaContextN ? [{ source: parentAreaId, target: dirId, type: 'area_dir_context' }] : []),
    ...topicNodes.map(t => ({ source: dirId, target: t.id, type: 'dir_topic' }))
  ];

  // 添加前置知识链接（topic -> topic）
  const prereqLinks = [];
  topicNodes.forEach(t => {
    (t.prerequisites || []).forEach(prereqId => {
      const prereqInView = topicNodes.find(n => n.id === prereqId);
      if (prereqInView) {
        prereqLinks.push({ source: prereqId, target: t.id, type: 'prereq' });
      }
    });
  });

  const allLinks = [...links, ...prereqLinks];

  simulation = d3.forceSimulation(allNodes)
    .force('link', d3.forceLink(allLinks).id(d => d.id).distance(130).strength(0.7))
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', d3.forceCenter(W / 2, H / 2))
    .force('collision', d3.forceCollide(d => d.type === 'direction' ? DIR_R + 10 : d.type === 'parent_area' ? 34 : topicNodeRadius(d) + 12))
    .on('tick', ticked);

  // 链接
  g.selectAll('.link-g')
    .data(allLinks).join('line')
    .attr('class', d => d.type === 'prereq' ? 'link-prereq' : d.type === 'area_dir_context' ? 'link-parent-context' : 'link-line');

  // 节点
  const node = g.selectAll('.node-g')
    .data(allNodes).join('g')
    .attr('class', 'node-g')
    .attr('data-id', d => d.id)
    .style('cursor', d => d.type === 'parent_area' ? 'zoom-out' : 'pointer')
    .on('click', (e, d) => {
      e.stopPropagation();
      if (d.type === 'parent_area') {
        expandArea(d.originalId || areaId);
        const actualArea = State.graphData.nodes.find(n => n.id === (d.originalId || areaId));
        if (actualArea) showNodeInfo(actualArea);
        return;
      }
      showNodeInfo(d);
    });

  node.append('title').text(d => entityName(d) || '');
  node.append('circle')
    .attr('r', d => topicNodeRadius(d))
    .attr('fill', d => {
      if (d.type === 'parent_area') return d.color || '#607D8B';
      if (d.type === 'direction') return d.color;
      const s = d.status || 'unknown';
      if (s === 'mastered')   return '#30D158';
      if (s === 'learning')   return '#FF9F0A';
      if (s === 'needs_work') return '#FF453A';
      return d.color || '#607D8B'; // unknown: classification color
    })
    .attr('fill-opacity', d => {
      if (d.type === 'parent_area') return 0.18;
      if (d.type === 'direction') return 0.9;
      return (d.status || 'unknown') === 'unknown' ? 0.22 : 0.88;
    })
    .attr('stroke', d => {
      if (d.type === 'parent_area') return d.color || '#607D8B';
      if (d.type === 'direction') return d.color;
      const s = d.status || 'unknown';
      if (s === 'mastered')   return '#30D158';
      if (s === 'learning')   return '#FF9F0A';
      if (s === 'needs_work') return '#FF453A';
      return d.color || '#607D8B';
    })
    .attr('stroke-width', d => d.type === 'parent_area' ? 1.8 : d.type === 'direction' ? 2 : 1.5)
    .attr('class', 'node-circle');

  // 方向中心节点也显示进度环
  node.filter(d => d.type === 'direction')
    .append('path')
    .attr('d', d => makeRingPath(d, DIR_R))
    .attr('fill', '#30D158').attr('opacity', 0.9);

  node.append('text')
    .attr('dy', d => d.type === 'direction' ? '4' : d.type === 'parent_area' ? '-2' : '20')
    .attr('class', d => `node-label${d.type === 'parent_area' ? ' node-label-parent' : d.type === 'topic' ? ' node-label-topic-detail' : ''}`)
    .style('font-size', d => d.type === 'direction' ? '11px' : d.type === 'parent_area' ? '16px' : '10px')
    .style('display', d => d.type === 'topic' && denseDirection && !labeledTopicIds.has(d.id) ? 'none' : null)
    .text(d => {
      if (d.type === 'parent_area') return d.icon || '↖';
      const n = entityName(d) || '';
      return n.length > 8 ? n.slice(0, 8) + '…' : n;
    });

  node.filter(d => d.type === 'parent_area')
    .append('text')
    .attr('dy', 34)
    .attr('class', 'node-label node-label-parent-name')
    .text(d => {
      const n = entityName(d) || '';
      return n.length > 8 ? n.slice(0, 8) + '…' : n;
    });

  function ticked() {
    g.selectAll('.link-g, line')
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  }

  setTimeout(fitGraph, 300);
}

function resetToAreas() {
  const fc = document.getElementById('node-float-card');
  if (fc) fc.classList.add('hidden');
  if (State.graphView === 'global') {
    renderGlobalView();
  } else {
    renderAreaLevel();
  }
}

function clearNodeFocus(options = {}) {
  State.focusedNode = null;
  const wrap = document.getElementById('graph-svg')?.parentElement;
  if (wrap) wrap.classList.remove('graph-focus-mode');
  if (g) {
    g.selectAll('.node-g').classed('is-selected', false);
    g.selectAll('.link-line, .link-prereq, .link-parent-context').classed('is-focus-link', false);
  }
  const menu = document.getElementById('node-action-fan');
  if (menu) menu.classList.remove('show', 'is-ready');
  const pulse = document.getElementById('node-focus-pulse');
  if (pulse) pulse.classList.remove('show');
  if (!options.keepCard) {
    const fc = document.getElementById('node-float-card');
    if (fc) fc.classList.add('hidden');
  }
}

function getRenderedNodeDatum(id) {
  let found = null;
  if (!g || !id) return null;
  g.selectAll('.node-g').each(n => {
    if (!found && n && n.id === id) found = n;
  });
  return found;
}

function focusGraphNode(d) {
  if (!d || !g) return;
  const focusDatum = (typeof d.x === 'number' && typeof d.y === 'number')
    ? d
    : (getRenderedNodeDatum(d.id) || d);
  State.focusedNode = focusDatum;
  const wrap = document.getElementById('graph-svg')?.parentElement;
  if (wrap) wrap.classList.add('graph-focus-mode');
  g.selectAll('.node-g').classed('is-selected', n => n && n.id === focusDatum.id);
  g.selectAll('.link-line, .link-prereq, .link-parent-context').classed('is-focus-link', edge => {
    const sid = endpointId(edge, 'source');
    const tid = endpointId(edge, 'target');
    return sid === focusDatum.id || tid === focusDatum.id;
  });
  showNodeActionFan(focusDatum);
}

function getFocusedNodeScreenPoint(d) {
  if (!d || typeof d.x !== 'number' || typeof d.y !== 'number' || !svg) return null;
  const wrap = document.getElementById('graph-svg')?.parentElement;
  if (!wrap) return null;
  const transform = d3.zoomTransform(svg.node());
  const [tx, ty] = transform.apply([d.x, d.y]);
  return { x: tx, y: ty };
}

function endpointId(edge, side) {
  const endpoint = edge?.[side];
  return typeof endpoint === 'object' ? endpoint?.id : endpoint;
}

function positionNodeActionFan(menu, wrap, point) {
  const pad = 78;
  const x = Math.max(pad, Math.min(wrap.clientWidth - pad, point.x));
  const y = Math.max(pad, Math.min(wrap.clientHeight - pad, point.y));
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  wrap.style.setProperty('--focus-x', `${x}px`);
  wrap.style.setProperty('--focus-y', `${y}px`);

  let pulse = document.getElementById('node-focus-pulse');
  if (!pulse) {
    pulse = document.createElement('div');
    pulse.id = 'node-focus-pulse';
    pulse.className = 'node-focus-pulse';
    wrap.appendChild(pulse);
  }
  pulse.style.left = `${x}px`;
  pulse.style.top = `${y}px`;
  pulse.classList.add('show');
}

function showNodeActionFan(d) {
  const wrap = document.getElementById('graph-svg')?.parentElement;
  const point = getFocusedNodeScreenPoint(d);
  if (!wrap || !point) return;

  let menu = document.getElementById('node-action-fan');
  if (!menu) {
    menu = document.createElement('div');
    menu.id = 'node-action-fan';
    menu.className = 'node-action-fan';
    wrap.appendChild(menu);
  }

  const actions = getNodeFanActions(d);
  menu.innerHTML = actions.map((a, i) => {
    const start = actions.length === 2 ? -35 : -110;
    const spread = actions.length === 2 ? 70 : 220;
    const angle = (start + (actions.length === 1 ? 0 : spread / (actions.length - 1) * i)) * Math.PI / 180;
    const radius = d.type === 'topic' ? 76 : 68;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return `
      <button type="button" class="fan-action fan-${escHtml(a.kind || 'neutral')}" data-action="${escHtml(a.action)}" style="--i:${i};--x:${x.toFixed(1)}px;--y:${y.toFixed(1)}px" title="${escHtml(a.label)}">
        <span>${escHtml(a.icon)}</span><em>${escHtml(a.label)}</em>
      </button>
    `;
  }).join('');

  positionNodeActionFan(menu, wrap, point);
  menu.classList.remove('show', 'is-ready');
  void menu.offsetWidth;
  menu.classList.add('show');
  window.setTimeout(() => menu.classList.add('is-ready'), 180);

  menu.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      handleNodeFanAction(d, btn.dataset.action);
    });
  });
}

function getNodeFanActions(d) {
  const isEn = getLang() === 'en';
  if (d.type === 'topic') {
    return [
      { action: 'quiz-topic', icon: '▶', label: isEn ? 'Quiz' : '测评', kind: 'primary' },
      { action: 'learning',   icon: '…',  label: isEn ? 'Learning' : '学习中', kind: 'warning' },
      { action: 'mastered',   icon: '✓',  label: isEn ? 'Mastered' : '已掌握', kind: 'success' },
      { action: 'copy-md',    icon: 'MD', label: isEn ? 'Copy MD' : '复制MD', kind: 'neutral' },
    ];
  }
  if (d.type === 'direction') {
    return [
      { action: 'quiz-direction', icon: '▶', label: isEn ? 'Quiz' : '测评', kind: 'primary' },
      { action: 'view-topics',    icon: '⊞',  label: isEn ? 'Topics' : '展开', kind: 'neutral' },
    ];
  }
  return [
    { action: 'browse-area', icon: '⊞', label: isEn ? 'Browse' : '浏览', kind: 'primary' },
    { action: 'diagnostic',  icon: '▶', label: isEn ? 'Diagnose' : '诊断', kind: 'success' },
  ];
}

function handleNodeFanAction(d, action) {
  switch (action) {
    case 'quiz-topic':     startTopicQuiz(d.id); break;
    case 'copy-md':        copyTopicMarkdown(d.id); break;
    case 'learning':       updateTopicStatusFromCard(d.id, 'learning'); break;
    case 'mastered':       updateTopicStatusFromCard(d.id, 'mastered'); break;
    case 'view-topics':    setGraphView('domain'); setTimeout(() => expandDirection(d.id), 50); break;
    case 'quiz-direction': startDirectionQuizFromGraph(d.id); break;
    case 'browse-area':    setGraphView('domain'); setTimeout(() => expandArea(d.id), 50); break;
    case 'diagnostic':     switchToTab('quiz'); break;
  }
}

function showNodeInfo(d) {
  completeOnboardStep('node');
  trackEvent('node_click', { id: d?.id, type: d?.type });
  focusGraphNode(d);

  const floatCard = document.getElementById('node-float-card');
  const nfcBody = document.getElementById('nfc-body');
  if (!floatCard || !nfcBody) return;

  floatCard.style.borderTopColor = d.color || 'var(--border)';

  const card = document.createElement('div');
  card.className = 'node-info-card';

  // Breadcrumb
  if (d.type === 'topic' || d.type === 'direction') {
    const allNodes = State.graphData?.nodes || [];
    const areaNode = allNodes.find(n => n.id === d.area && n.type === 'area');
    const crumbEl = document.createElement('div');
    crumbEl.className = 'node-info-crumb';
    if (areaNode) {
      const areaSpan = document.createElement('span');
      areaSpan.style.color = areaNode.color || 'var(--text-muted)';
      areaSpan.textContent = entityName(areaNode);
      crumbEl.appendChild(areaSpan);
    }
    if (d.type === 'topic') {
      const dirNode = allNodes.find(n => n.id === d.direction && n.type === 'direction');
      if (dirNode) {
        const sep = document.createElement('span');
        sep.className = 'crumb-sep';
        sep.textContent = ' › ';
        crumbEl.appendChild(sep);
        const dirSpan = document.createElement('span');
        dirSpan.textContent = entityName(dirNode);
        crumbEl.appendChild(dirSpan);
      }
    }
    if (crumbEl.children.length) card.appendChild(crumbEl);
  }

  // Type + Name
  const typeEl = document.createElement('div');
  typeEl.className = 'node-info-type';
  typeEl.textContent = t('type.' + d.type) || d.type;
  card.appendChild(typeEl);

  const nameEl = document.createElement('div');
  nameEl.className = 'node-info-name';
  nameEl.textContent = entityName(d);
  card.appendChild(nameEl);

  const altName = getLang() === 'en' ? (d.name || '') : (d.name_en || '');
  if (altName) {
    const altEl = document.createElement('div');
    altEl.className = 'node-info-name-en';
    altEl.textContent = altName;
    card.appendChild(altEl);
  }

  // Description
  if (d.description) {
    const descEl = document.createElement('div');
    descEl.className = 'node-info-desc';
    descEl.textContent = d.description;
    card.appendChild(descEl);
  }

  if (d.type === 'topic') {
    // Status badge
    const status = d.status || 'unknown';
    const badgeEl = document.createElement('span');
    badgeEl.className = `node-status-badge ${getStatusClass(status, d.tested)}`;
    badgeEl.textContent = getStatusLabel(status, d.tested);
    card.appendChild(badgeEl);

    // Difficulty + Importance
    const diff = Math.max(1, Math.min(5, d.difficulty || 3));
    const imp  = Math.max(1, Math.min(5, d.importance || 3));
    const mkStars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
    const metaRow = document.createElement('div');
    metaRow.className = 'node-meta-row';
    const diffEl = document.createElement('span');
    diffEl.className = 'node-meta-item';
    diffEl.innerHTML = `<span class="meta-label">${t('meta.difficulty')}</span> <span class="meta-stars">${mkStars(diff)}</span>`;
    const impEl = document.createElement('span');
    impEl.className = 'node-meta-item';
    impEl.innerHTML = `<span class="meta-label">${t('meta.importance')}</span> <span class="meta-stars">${mkStars(imp)}</span>`;
    metaRow.appendChild(diffEl);
    metaRow.appendChild(impEl);
    card.appendChild(metaRow);

    // Tags
    if (d.tags && d.tags.length > 0) {
      const tagsEl = document.createElement('div');
      tagsEl.className = 'node-tags';
      d.tags.forEach(tag => {
        const chip = document.createElement('span');
        const isActive = State.filterTag === tag;
        chip.className = 'node-tag-chip' + (isActive ? ' node-tag-chip-active' : '');
        chip.textContent = tag;
        chip.title = isActive ? '点击取消筛选' : '点击筛选同标签节点';
        chip.style.cursor = 'pointer';
        chip.addEventListener('click', () => filterByTag(tag));
        tagsEl.appendChild(chip);
      });
      card.appendChild(tagsEl);
    }

    // Prerequisites / leads-to
    const allLinks = State.graphData?.links || [];
    const allNodes = State.graphData?.nodes || [];
    const nodeById = id => allNodes.find(n => n.id === id);
    const resolveId = v => typeof v === 'object' ? v.id : v;
    const prereqIds = allLinks
      .filter(l => l.type === 'prerequisite' && resolveId(l.target) === d.id)
      .map(l => resolveId(l.source));
    const dependIds = allLinks
      .filter(l => l.type === 'prerequisite' && resolveId(l.source) === d.id)
      .map(l => resolveId(l.target));
    const mkChain = (ids, titleKey) => {
      if (!ids.length) return;
      const sec = document.createElement('div');
      sec.className = 'node-chain-section';
      const title = document.createElement('div');
      title.className = 'node-chain-title';
      title.textContent = t(titleKey);
      sec.appendChild(title);
      ids.slice(0, 4).forEach(nid => {
        const n = nodeById(nid);
        const item = document.createElement('div');
        item.className = 'node-chain-item';
        item.textContent = n ? entityName(n) : nid;
        item.addEventListener('click', () => navigateToNode('topic', nid));
        sec.appendChild(item);
      });
      if (ids.length > 4) {
        const more = document.createElement('div');
        more.className = 'node-chain-more';
        more.textContent = `+${ids.length - 4}`;
        sec.appendChild(more);
      }
      card.appendChild(sec);
    };
    mkChain(prereqIds, 'node.prerequisites');
    mkChain(dependIds, 'node.leads_to');

  } else if (d.type === 'direction') {
    const countEl = document.createElement('div');
    countEl.className = 'node-info-count';
    countEl.textContent = t('node.topics_in', {n: d.topic_count || d.total || 0});
    card.appendChild(countEl);

  } else if (d.type === 'area') {
    const countEl = document.createElement('div');
    countEl.className = 'node-info-count';
    countEl.textContent = t('node.dirs_in', {n: d.direction_count || 3});
    card.appendChild(countEl);
  }

  nfcBody.replaceChildren(card);
  floatCard.classList.remove('hidden');
}

function _addBtn(parent, cls, action, label) {
  const btn = document.createElement('button');
  btn.className = cls;
  btn.dataset.action = action;
  btn.textContent = label;
  parent.appendChild(btn);
}

function getTopicFull(topicId) {
  return window.__DATA__?.topics_full?.[topicId] || null;
}

function appendTopicTaskPanel(card, d) {
  const full = getTopicFull(d.id);
  const panel = document.createElement('div');
  panel.className = 'topic-task-panel';
  const title = document.createElement('div');
  title.className = 'topic-task-title';
  title.textContent = getLang() === 'en' ? 'Next actions' : '下一步动作';
  panel.appendChild(title);

  const primary = document.createElement('div');
  primary.className = 'topic-task-grid';
  _addBtn(primary, 'topic-task-btn topic-task-btn-primary', 'toggle-content', getLang() === 'en' ? 'Preview note' : '预览知识正文');
  _addBtn(primary, 'topic-task-btn', 'copy-markdown', getLang() === 'en' ? 'Copy Markdown' : '复制 Markdown');
  _addBtn(primary, 'topic-task-btn', 'export-obsidian', getLang() === 'en' ? 'Export Vault' : '导出 Vault');
  panel.appendChild(primary);

  const stateRow = document.createElement('div');
  stateRow.className = 'topic-state-actions';
  _addBtn(stateRow, 'topic-state-btn', 'mark-learning', getLang() === 'en' ? 'Mark learning' : '标记学习中');
  _addBtn(stateRow, 'topic-state-btn topic-state-btn-done', 'mark-mastered', getLang() === 'en' ? 'Mark mastered' : '标记已掌握');
  panel.appendChild(stateRow);

  const preview = document.createElement('div');
  preview.className = 'topic-content-preview hidden';
  const body = (full?.body || d.description || '').trim();
  preview.textContent = body || (getLang() === 'en' ? 'No note body available.' : '暂无正文内容。');
  panel.appendChild(preview);

  const hint = document.createElement('div');
  hint.className = 'topic-task-hint';
  hint.textContent = getLang() === 'en'
    ? 'Use this page to decide what to learn; keep long-term notes in your own tools.'
    : '这里负责定位和路线；长期批注、整理和复习留在你的笔记工具里。';
  panel.appendChild(hint);

  card.appendChild(panel);
}

function toggleTopicContentPreview(card) {
  const preview = card.querySelector('.topic-content-preview');
  if (!preview) return;
  preview.classList.toggle('hidden');
}

async function copyTopicMarkdown(topicId) {
  const full = getTopicFull(topicId);
  const text = full?.body_full || full?.body || '';
  if (!text) {
    showToast(getLang() === 'en' ? 'No Markdown content found' : '未找到 Markdown 正文');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    showToast(getLang() === 'en' ? 'Markdown copied' : '已复制 Markdown');
  } catch (_) {
    showToast(getLang() === 'en' ? 'Clipboard unavailable' : '当前浏览器不允许写入剪贴板');
  }
}

async function updateTopicStatusFromCard(topicId, status) {
  try {
    await fetchWithTimeout(`/api/status/${topicId}`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({status})
    });
    await refreshGraphData();
    await updateTopbarBadge();
    await renderLearningCockpit();
    trackEvent('topic_status_update', { topicId, status });
    const updated = (State.graphData?.nodes || []).find(n => n.id === topicId && n.type === 'topic');
    if (g) {
      g.selectAll('.node-g').filter(n => n && n.id === topicId).classed('status-updated', true);
      setTimeout(() => g?.selectAll('.node-g').classed('status-updated', false), 950);
    }
    if (updated) showNodeInfo(updated);
    showToast(status === 'mastered'
      ? (getLang() === 'en' ? 'Marked as mastered' : '已标记为掌握')
      : (getLang() === 'en' ? 'Marked as learning' : '已标记为学习中'), { tone: status === 'mastered' ? 'success' : 'info' });
  } catch (e) {
    showToast(getLang() === 'en' ? 'Status update failed' : '状态更新失败');
  }
}

function callExport(kind) {
  showExportPreview(kind);
}

function showToast(message, options = {}) {
  let el = document.getElementById('app-toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-toast';
    el.className = 'app-toast';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  const tone = options.tone || 'info';
  el.className = `app-toast app-toast-${tone}`;
  const actionHtml = options.actionLabel
    ? `<button type="button" class="app-toast-action">${escHtml(options.actionLabel)}</button>`
    : '';
  el.innerHTML = `<span class="app-toast-dot"></span><span class="app-toast-message">${escHtml(message)}</span>${actionHtml}`;
  const actionBtn = el.querySelector('.app-toast-action');
  if (actionBtn && typeof options.onAction === 'function') {
    actionBtn.addEventListener('click', () => {
      options.onAction();
      el.classList.remove('show');
    }, { once: true });
  }
  el.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => el.classList.remove('show'), options.duration || 2600);
}

function setButtonBusy(button, busy, busyText) {
  if (!button) return;
  if (busy) {
    if (!button.dataset.idleText) button.dataset.idleText = button.textContent;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.classList.add('is-loading');
    if (busyText) button.textContent = busyText;
  } else {
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.classList.remove('is-loading');
    if (button.dataset.idleText) button.textContent = button.dataset.idleText;
    delete button.dataset.idleText;
  }
}

async function runWithButtonFeedback(button, busyText, task) {
  setButtonBusy(button, true, busyText);
  try {
    return await task();
  } finally {
    setButtonBusy(button, false);
  }
}

async function startTopicQuiz(topicId) {
  switchToTab('quiz');
  State.quizMode = 'topic';
  State.currentTopicId = topicId;
  hide('quiz-home-view');
  hide('quiz-result-view');
  hide('direction-result-view');
  document.getElementById('quiz-flow-view')?.classList.remove('quiz-flow-enter');

  const topicNode = (State.graphData?.nodes || []).find(n => n.id === topicId);
  try {
    const data = await fetchWithTimeout(`/api/quiz/${topicId}`).then(r => r.json());
    const qs = (data.questions || []).map(q => ({
      ...q,
      topic_id: topicId,
      topic_name: data.topic_name || topicNode?.name || topicId,
      direction_id: topicNode?.direction || '',
    }));
    State.quizQuestions = qs;
    State.quizIndex = 0;
    State.quizAnswers = [];
    State.answeredCurrent = false;
    State.currentDirectionId = topicNode?.direction || null;

    const tName = (getLang() === 'en' && data.topic_name_en) ? data.topic_name_en : data.topic_name;
    document.getElementById('quiz-flow-title').textContent = tName || topicId;
    document.getElementById('quiz-flow-subtitle').textContent =
      t('quiz.subtitle_topic', { n: qs.length, topics: 1 });

    show('quiz-flow-view');
    trackEvent('quiz_start', { mode: 'topic', topicId, total: State.quizQuestions.length });
    saveQuizDraft();
    renderCurrentQuestion();
  } catch (e) {
    alert(t('quiz.load_failed', {msg: e.message}));
    show('quiz-home-view');
  }
}

function startDirectionQuizFromGraph(dirId) {
  switchToTab('quiz');
  startDirectionQuiz(dirId);
}

// ── 图例筛选 ────────────────────────────────────────────────
function filterByArea(areaId) {
  State.filterArea = (State.filterArea === areaId) ? null : areaId;
  State.filterTag = null; // area filter replaces tag filter
  // Update legend item active state
  document.querySelectorAll('.legend-item[data-area]').forEach(el => {
    el.classList.toggle('legend-active', el.dataset.area === State.filterArea);
  });
  const tagInd = document.getElementById('tag-filter-indicator');
  if (tagInd) tagInd.style.display = 'none';
  applyAreaFilter();
}

function applyAreaFilter() {
  const activeArea = State.filterArea;
  if (!activeArea) {
    g.selectAll('.node-g, .g-prereq-links line').attr('opacity', null);
    return;
  }
  g.selectAll('.node-g').attr('opacity', d => {
    if (!d) return 0.12;
    const nodeArea = d.area || d.id;
    return nodeArea === activeArea ? 1 : 0.12;
  });
  g.selectAll('.g-prereq-links line').attr('opacity', d => {
    if (!d) return 0.05;
    const srcArea = d.source?.area;
    const tgtArea = d.target?.area;
    return (srcArea === activeArea || tgtArea === activeArea) ? 0.45 : 0.05;
  });
}

function filterByTag(tag) {
  // null means clear; toggling the same tag also clears
  State.filterTag = (tag === null || State.filterTag === tag) ? null : tag;
  State.filterArea = null; // tag filter replaces area filter
  document.querySelectorAll('.legend-item[data-area]').forEach(el => el.classList.remove('legend-active'));
  // Update tag filter indicator
  const indicator = document.getElementById('tag-filter-indicator');
  if (indicator) {
    if (State.filterTag) {
      indicator.textContent = `# ${State.filterTag}  ✕`;
      indicator.style.display = '';
    } else {
      indicator.style.display = 'none';
    }
  }
  applyTagFilter();
}

function applyTagFilter() {
  const tag = State.filterTag;
  if (!tag) {
    g.selectAll('.node-g').attr('opacity', null);
    return;
  }
  g.selectAll('.node-g').attr('opacity', d => {
    if (!d || d.type !== 'topic') return 0.08;
    return (d.tags || []).includes(tag) ? 1 : 0.08;
  });
}

// ── 搜索高亮叠加 ─────────────────────────────────────────────
function applySearchHighlight(matchIds) {
  State.searchHighlightIds = matchIds;
  if (!matchIds || matchIds.size === 0) {
    g.selectAll('.node-g').attr('opacity', null);
    return;
  }
  g.selectAll('.node-g').attr('opacity', d => d && matchIds.has(d.id) ? 1 : 0.10);
}

function clearSearchHighlight() {
  State.searchHighlightIds = null;
  g.selectAll('.node-g').attr('opacity', null);
}

function updateLayerDots(level, label) {
  const indicator = document.querySelector('.layer-indicator');
  const labels = getLang() === 'en'
    ? ['Overview', 'Area', 'Direction', 'Topic']
    : ['总览', '大类', '方向', '主题'];
  if (indicator) {
    indicator.style.visibility = 'visible';
    indicator.dataset.label = label || labels[level] || labels[0];
  }
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`ld-${i}`);
    if (dot) dot.classList.toggle('active', i <= level);
  }
}

function updateBreadcrumb(crumbs) {
  const bc = document.getElementById('graph-breadcrumb');
  bc.replaceChildren();
  const root = document.createElement('span');
  root.className = 'crumb';
  root.textContent = t('crumb.all_areas');
  root.addEventListener('click', resetToAreas);
  bc.appendChild(root);
  crumbs.forEach(c => {
    const sep = document.createElement('span');
    sep.className = 'crumb-sep';
    sep.textContent = '›';
    bc.appendChild(sep);
    const span = document.createElement('span');
    span.className = 'crumb';
    span.textContent = c.name;
    span.addEventListener('click', c.fn);
    bc.appendChild(span);
  });
}

// 缩放控制
function zoomIn() { svg.transition().duration(250).call(zoomBehavior.scaleBy, 1.3); }
function zoomOut() { svg.transition().duration(250).call(zoomBehavior.scaleBy, 1 / 1.3); }
function resetZoom() { fitGraph(); }

// 计算图谱包围盒并自动居中缩放到视口
function fitGraph() {
  if (!svg || !g) return;
  const nodes = g.selectAll('.node-g');
  if (nodes.empty()) return;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

  // Prefer the rendered SVG bounds: global view has sectors, area labels and badges
  // outside node centers. Fitting only nodes makes the first view feel cropped.
  try {
    const box = g.node()?.getBBox?.();
    if (box && box.width > 0 && box.height > 0) {
      minX = box.x;
      maxX = box.x + box.width;
      minY = box.y;
      maxY = box.y + box.height;
    }
  } catch (e) {
    // Some SVG states can throw while transitions are settling; fall back below.
  }

  if (!isFinite(minX) || maxX <= minX || maxY <= minY) {
    nodes.each(function(d) {
      if (!d || d.x == null || d.y == null) return;
      const r = d.type === 'area' ? AREA_R + 8 : d.type === 'direction' ? DIR_R + 6 : TOPIC_R + 4;
      minX = Math.min(minX, d.x - r);
      maxX = Math.max(maxX, d.x + r);
      minY = Math.min(minY, d.y - r);
      maxY = Math.max(maxY, d.y + r);
    });
  }

  if (!isFinite(minX) || maxX <= minX || maxY <= minY) return;

  const W = +svg.attr('width');
  const H = +svg.attr('height');
  if (!W || !H) return;

  const isGlobal = State.graphView === 'global';
  const pad = isGlobal ? 86 : 64;
  const maxScale = isGlobal ? 1.12 : 2.5;
  const scale = Math.max(0.18, Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxY - minY), maxScale));
  const tx = (W - scale * (minX + maxX)) / 2;
  const ty = (H - scale * (minY + maxY)) / 2;

  svg.transition().duration(450).call(
    zoomBehavior.transform,
    d3.zoomIdentity.translate(tx, ty).scale(scale)
  );
}

// 生成掌握进度环路径（外弧，顺时针）
function makeRingPath(d, r) {
  if (!d || !d.total || !d.mastered || d.mastered <= 0) return '';
  const pct = Math.min(d.mastered / d.total, 1);
  if (pct <= 0) return '';
  try {
    return d3.arc()
      .innerRadius(r + 3).outerRadius(r + 7)
      .startAngle(-Math.PI / 2)
      .endAngle(-Math.PI / 2 + pct * 2 * Math.PI)();
  } catch (e) { return ''; }
}

// ============================================================
// 全局总览视图（所有 Area + Direction 同屏显示）
// ============================================================

function renderGlobalView() {
  State.graphLevel = 'area';
  State.expandedArea = null;
  State.expandedDirection = null;
  if (State.graphView !== 'path' && State.graphView !== 'dir') State.graphView = 'global';
  State.activePathStep = null;
  updateLayerDots(0);   // global overview
  updateBreadcrumb([]);
  const backBtn = document.getElementById('crumb-back-global');
  if (backBtn) backBtn.style.display = 'none';
  clearGraph();
  if (simulation) { simulation.stop(); simulation = null; }

  const W = +svg.attr('width');
  const H = +svg.attr('height');
  if (!W || !H) return;

  const cx = W / 2, cy = H / 2;

  // Two rings: directions (inner) + topics (outer). Area = background sector.
  const R_DIR     = 200;
  const R_TOPIC   = 380;
  const DIR_R_G   = 14;
  let globalTopicCount = 0;
  const topicRadius = d => {
    const base = 5 + (d.importance || 3) * 2;
    if (globalTopicCount > 220) return Math.max(3.5, base * 0.62);
    if (globalTopicCount > 140) return Math.max(4, base * 0.74);
    if (globalTopicCount > 60) return Math.max(4.5, base * 0.84);
    return base;
  };

  const rawAreas  = State.graphData.nodes.filter(n => n.type === 'area');
  const rawDirs   = State.graphData.nodes.filter(n => n.type === 'direction');
  const rawTopics = State.graphData.nodes.filter(n => n.type === 'topic');
  globalTopicCount = rawTopics.length;
  const denseGlobal = rawTopics.length > 60;
  const globalLabelsExpanded = State.globalLabelMode === 'expanded';
  const globalLabelBudget = denseGlobal
    ? (globalLabelsExpanded
      ? Math.min(80, Math.max(32, Math.round(rawTopics.length * 0.35)))
      : Math.min(22, Math.max(10, Math.round(rawTopics.length * 0.13))))
    : Infinity;
  const globalLabeledTopicIds = new Set(rawTopics
    .slice()
    .sort((a, b) => (b.importance || 3) - (a.importance || 3) || (a.difficulty || 3) - (b.difficulty || 3))
    .slice(0, globalLabelBudget)
    .map(t => t.id));
  document.getElementById('graph-svg')?.parentElement?.classList.toggle('global-density-mode', denseGlobal);
  if (denseGlobal) {
    showGraphScaleHint({
      title: getLang() === 'en' ? `${rawTopics.length} topics · overview mode` : `${rawTopics.length} 个主题 · 总览模式`,
      body: globalLabelsExpanded
        ? (getLang() === 'en'
          ? 'More labels are visible for scanning. Double-click a direction to enter details.'
          : '已显示更多主题标签，便于巡检；双击方向可进入细节。')
        : (getLang() === 'en'
          ? 'Global view shows structure and density. Click a node for actions; double-click a direction for topics.'
          : '全局视图承担结构与密度感知；单击节点看动作，双击方向进主题。'),
      meta: getLang() === 'en'
        ? 'Node size = importance · number = topics in direction'
        : '节点大小=重要度 · 数字=方向下主题数',
      actionLabel: globalLabelsExpanded
        ? (getLang() === 'en' ? 'Overview labels' : '恢复总览')
        : (getLang() === 'en' ? 'More labels' : '显示更多'),
      action: 'toggle-global-labels',
      tone: 'density'
    });
  }

  // Count topics per direction and per area for proportional sector sizing
  const topicsPerDir = {};
  rawTopics.forEach(t => { topicsPerDir[t.direction] = (topicsPerDir[t.direction] || 0) + 1; });
  const topicsPerArea = {};
  rawAreas.forEach(a => { topicsPerArea[a.id] = 0; });
  rawDirs.forEach(d => { topicsPerArea[d.area] = (topicsPerArea[d.area] || 0) + (topicsPerDir[d.id] || 0); });
  const totalTopics = rawTopics.length || 1;

  const TAU = 2 * Math.PI;
  let angle = -Math.PI / 2;
  const areaAngles = {};
  rawAreas.forEach(a => {
    const n = topicsPerArea[a.id] || 1;
    const span = (n / totalTopics) * TAU;
    areaAngles[a.id] = { start: angle, end: angle + span, mid: angle + span / 2 };
    angle += span;
  });

  const dirAngles = {};
  rawAreas.forEach(a => {
    const dirsInArea = rawDirs.filter(d => d.area === a.id);
    const { start, end } = areaAngles[a.id];
    const areaSpan = end - start;
    const areaTopics = topicsPerArea[a.id] || dirsInArea.length;
    let dAngle = start;
    dirsInArea.forEach(d => {
      const tc = topicsPerDir[d.id] || 1;
      const span = (tc / areaTopics) * areaSpan;
      dirAngles[d.id] = { start: dAngle, end: dAngle + span, mid: dAngle + span / 2 };
      dAngle += span;
    });
  });

  const topicsByDir = {};
  rawTopics.forEach(t => {
    if (!topicsByDir[t.direction]) topicsByDir[t.direction] = [];
    topicsByDir[t.direction].push(t);
  });

  // Compute fixed positions (no simulation)
  const dirNodes = rawDirs.map(d => {
    const mid = (dirAngles[d.id] || { mid: 0 }).mid;
    return { ...d, x: cx + R_DIR * Math.cos(mid), y: cy + R_DIR * Math.sin(mid) };
  });
  const topicNodes = [];
  rawTopics.forEach(t => {
    const da = dirAngles[t.direction];
    if (!da) { topicNodes.push({ ...t, x: cx, y: cy }); return; }
    const list = topicsByDir[t.direction];
    const idx  = list.indexOf(t);
    const n    = list.length;
    const tAngle = da.start + (idx + 0.5) / n * (da.end - da.start);
    topicNodes.push({ ...t, x: cx + R_TOPIC * Math.cos(tAngle), y: cy + R_TOPIC * Math.sin(tAngle) });
  });

  State.simulationNodes = [...dirNodes, ...topicNodes];

  const topicById = Object.fromEntries(topicNodes.map(t => [t.id, t]));
  const dirById   = Object.fromEntries(dirNodes.map(d => [d.id, d]));

  // ── Area sector backgrounds (cluster hulls) ────────────────
  const sectorArc = d3.arc().innerRadius(0).outerRadius(R_TOPIC + 38);
  const bgG = g.append('g').attr('class', 'g-area-bg').attr('transform', `translate(${cx},${cy})`);
  bgG.selectAll('path').data(rawAreas).join('path')
    .attr('d', a => {
      const ang = areaAngles[a.id] || { start: 0, end: 0 };
      return sectorArc.startAngle(ang.start).endAngle(ang.end)();
    })
    .attr('fill', a => graphAreaColor(a.id, a.color)).attr('fill-opacity', 0.052)
    .attr('stroke', a => graphAreaColor(a.id, a.color)).attr('stroke-opacity', 0.14).attr('stroke-width', 0.7);

  // ── Area labels (outside outer ring, icon + name) ──────────
  const areaLabelG = g.append('g').attr('class', 'g-area-labels');
  rawAreas.forEach(a => {
    const mid = (areaAngles[a.id] || { mid: 0 }).mid;
    const lx = cx + (R_TOPIC + 62) * Math.cos(mid);
    const ly = cy + (R_TOPIC + 62) * Math.sin(mid);
    const lg = areaLabelG.append('g').attr('transform', `translate(${lx},${ly})`);
    lg.append('text').attr('dy', '-1').attr('class', 'node-label')
      .style('font-size', '14px').style('text-anchor', 'middle').text(a.icon || '');
    lg.append('text').attr('dy', '14').attr('class', 'node-label')
      .style('font-size', '11px').style('text-anchor', 'middle')
      .text(entityName(a) || a.name || '');
  });

  // ── Prerequisite links (dashed — the graph's structural backbone) ──
  const prereqLinks = (State.graphData.links || [])
    .filter(l => l.type === 'prerequisite')
    .map(l => {
      const sid = typeof l.source === 'object' ? l.source.id : l.source;
      const tid = typeof l.target === 'object' ? l.target.id : l.target;
      const src = topicById[sid], tgt = topicById[tid];
      return src && tgt ? { source: src, target: tgt } : null;
    })
    .filter(Boolean);

  const visiblePrereqLinks = denseGlobal
    ? prereqLinks.filter(l => globalLabeledTopicIds.has(l.source.id) && globalLabeledTopicIds.has(l.target.id)).slice(0, 72)
    : prereqLinks;
  if (visiblePrereqLinks.length > 0) {
    g.append('g').attr('class', 'g-prereq-links')
      .selectAll('line').data(visiblePrereqLinks).join('line')
      .attr('class', 'link-prereq')
      .attr('stroke-opacity', denseGlobal ? 0.18 : 0.30).attr('stroke-width', denseGlobal ? 0.65 : 0.8)
      .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
  }

  // ── Topic nodes (outer ring, size = importance, color = status) ──
  const topicG  = g.append('g').attr('class', 'g-topics');
  const topicSel = topicG.selectAll('g').data(topicNodes).join('g')
    .attr('class', 'node-g node-topic-global')
    .attr('data-id', d => d.id)
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('cursor', 'pointer')
    .on('click', (e, d) => { e.stopPropagation(); showNodeInfo(d); })
    .on('dblclick', (e, d) => { e.stopPropagation(); navigateToNode('topic', d.id); });

  topicSel.append('title').text(d => entityName(d) || '');
  // Invisible larger circle for easier click/touch targeting
  topicSel.append('circle').attr('r', 18).attr('fill', 'transparent').attr('stroke', 'none');
  topicSel.append('circle')
    .attr('r', d => topicRadius(d))
    .attr('fill', d => {
      const s = d.status || 'unknown';
      if (s === 'mastered')   return '#30D158';
      if (s === 'learning')   return '#FF9F0A';
      if (s === 'needs_work') return '#FF453A';
      return graphNodeColor(d); // unknown: use harmonized classification color
    })
    .attr('fill-opacity', d => {
      if ((d.status || 'unknown') === 'unknown') return 0.22;
      const diff = Math.max(1, Math.min(5, d.difficulty || 3));
      return 1.0 - (diff - 1) * 0.065;
    })
    .attr('stroke', d => {
      const s = d.status || 'unknown';
      if (s === 'mastered')   return '#30D158';
      if (s === 'learning')   return '#FF9F0A';
      if (s === 'needs_work') return '#FF453A';
      return graphNodeColor(d);
    })
    .attr('stroke-width', 1.5);

  // Labels — tiny at global zoom, readable when user zooms in
  topicSel.append('text')
    .attr('dy', d => topicRadius(d) + 9)
    .attr('class', d => `node-label node-label-topic${globalLabeledTopicIds.has(d.id) ? ' is-core-label' : ''}`)
    .style('font-size', denseGlobal ? '8.5px' : '8px')
    .style('display', d => denseGlobal && !globalLabeledTopicIds.has(d.id) ? 'none' : null)
    .text(d => { const nm = entityName(d) || ''; return nm.length > 8 ? nm.slice(0, 7) + '…' : nm; });

  // ── Direction nodes (inner ring, domain color) ──────────────
  const dirG   = g.append('g').attr('class', 'g-dirs');
  const dirSel = dirG.selectAll('g').data(dirNodes).join('g')
    .attr('class', 'node-g node-dir')
    .attr('data-id', d => d.id)
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('cursor', 'pointer')
    .on('click', (e, d) => { e.stopPropagation(); showNodeInfo(d); })
    .on('dblclick', (e, d) => { e.stopPropagation(); navigateToNode('direction', d.id); });

  dirSel.append('title').text(d => entityName(d) || '');
  dirSel.append('circle')
    .attr('r', DIR_R_G)
    .attr('fill', d => graphNodeColor(d)).attr('fill-opacity', 0.86)
    .attr('stroke', d => graphNodeColor(d)).attr('stroke-width', 1.8)
    .attr('class', 'node-circle');
  dirSel.append('path').attr('d', d => makeRingPath(d, DIR_R_G))
    .attr('fill', '#30D158').attr('opacity', 0.9);
  dirSel.append('text').attr('dy', DIR_R_G + 12)
    .attr('class', 'node-label').style('font-size', '10px')
    .text(d => { const nm = entityName(d) || ''; return nm.length > 9 ? nm.slice(0, 8) + '…' : nm; });
  dirSel.append('text')
    .attr('dy', -DIR_R_G - 7)
    .attr('class', 'node-label node-count-badge')
    .text(d => topicsPerDir[d.id] || 0);

  fitGraph();
  // Re-apply any active filter or search highlight after redraw
  if (State.filterArea) applyAreaFilter();
  else if (State.filterTag) applyTagFilter();
  if (State.searchHighlightIds) applySearchHighlight(State.searchHighlightIds);
}

function clearActivePathStep() {
  State.activePathStep = null;
  document.querySelectorAll('.path-step.active').forEach(el => el.classList.remove('active'));
  if (g) {
    g.selectAll('.path-highlight, .path-route-ring').remove();
    g.selectAll('.g-path-overlay').remove();
    g.selectAll('.node-g').classed('path-node-active path-node-in-route', false);
  }
  document.getElementById('graph-svg')?.parentElement?.classList.remove('graph-path-mode');
}

// 切换全局/领域/路径/目录视图
function setGraphView(view) {
  clearNodeFocus();
  State.graphView = view;
  const gb = document.getElementById('btn-global-view');
  const db = document.getElementById('btn-domain-view');
  const pb = document.getElementById('btn-path-view');
  const dirb = document.getElementById('btn-dir-view');
  if (gb) gb.classList.toggle('active', view === 'global');
  if (db) db.classList.toggle('active', view === 'domain');
  if (pb) pb.classList.toggle('active', view === 'path');
  if (dirb) dirb.classList.toggle('active', view === 'dir');

  const dirPanel = document.getElementById('dir-panel');
  const pathPanel = document.getElementById('path-panel');
  const legend = document.querySelector('.graph-legend');
  const nodeInfo = document.getElementById('node-info-panel');

  if (view !== 'path') clearActivePathStep();

  if (view === 'path') {
    // 路径视图：右侧图谱必须随路径切换联动，而不是停留在普通总览。
    if (legend) legend.classList.add('hidden');
    if (nodeInfo) nodeInfo.classList.add('hidden');
    if (pathPanel) pathPanel.classList.remove('hidden');
    if (dirPanel) dirPanel.classList.add('hidden');
    if (gb) gb.classList.remove('active');
    if (db) db.classList.remove('active');
    if (pb) pb.classList.add('active');
    renderGlobalView();
    State.graphView = 'path';
    updateLayerDots(0, getLang() === 'en' ? 'Path' : '路径');
    const firstStep = State.activePathStep || getSuggestedPathStepId(State.activePath);
    State.activePathStep = firstStep;
    renderPathPanel();
    window.setTimeout(() => doHighlight(firstStep), 520);
  } else if (view === 'dir') {
    // 目录视图：侧栏显示树形目录，图谱保持全局总览
    if (legend) legend.classList.add('hidden');
    if (nodeInfo) nodeInfo.classList.add('hidden');
    if (pathPanel) pathPanel.classList.add('hidden');
    if (dirPanel) dirPanel.classList.remove('hidden');
    updateLayerDots(0, getLang() === 'en' ? 'Directory' : '目录');
    if (!State.simulationNodes) {
      renderGlobalView();
      State.graphView = 'dir';
    }
    renderDirPanel();
  } else {
    // 切回图谱视图：恢复侧栏，清除高亮
    document.getElementById('graph-svg')?.parentElement?.classList.remove('graph-path-mode');
    if (legend) legend.classList.remove('hidden');
    if (nodeInfo) nodeInfo.classList.remove('hidden');
    if (pathPanel) pathPanel.classList.add('hidden');
    if (dirPanel) dirPanel.classList.add('hidden');
    clearActivePathStep();

    const backBtn = document.getElementById('crumb-back-global');
    if (view === 'global') {
      State.simulationNodes = null;
      if (backBtn) backBtn.style.display = 'none';
      renderGlobalView();
    } else {
      // Restore domain drill-down state if previously expanded
      State.simulationNodes = null;
      if (backBtn) backBtn.style.display = '';
      if (State.graphLevel === 'topic' && State.expandedDirection) {
        expandDirection(State.expandedDirection);
      } else if (State.graphLevel === 'direction' && State.expandedArea) {
        expandArea(State.expandedArea);
      } else {
        State.expandedArea = null;
        State.expandedDirection = null;
        renderAreaLevel();
      }
    }
  }
}

// ============================================================
// 路径导览
// ============================================================

function renderPathPanel() {
  const path = LEARNING_PATHS[State.activePath];
  if (!path || !State.graphData) return;

  // Update intent button labels
  const ab = document.getElementById('btn-apply-path');
  const ub = document.getElementById('btn-understand-path');
  if (ab) ab.textContent = LEARNING_PATHS.apply?.label_en && getLang() === 'en'
    ? LEARNING_PATHS.apply.label_en : (LEARNING_PATHS.apply?.label || t('path.apply'));
  if (ub) ub.textContent = LEARNING_PATHS.understand?.label_en && getLang() === 'en'
    ? LEARNING_PATHS.understand.label_en : (LEARNING_PATHS.understand?.label || t('path.understand'));

  const metaEl = document.getElementById('path-meta');
  const allTopics = State.graphData.nodes.filter(n => n.type === 'topic');
  const stepsEl = document.getElementById('path-steps');
  if (!stepsEl) return;

  const masteredCount = path.steps.filter(id => {
    const tn = allTopics.find(n => n.id === id);
    return tn && tn.status === 'mastered';
  }).length;

  stepsEl.innerHTML = '';
  path.steps.forEach((topicId, i) => {
    const tn = allTopics.find(n => n.id === topicId);
    const name = tn ? entityName(tn) : topicId;
    const status = tn ? (tn.status || 'unknown') : 'unknown';
    const tested = tn ? tn.tested : false;
    const isMastered = status === 'mastered';
    const isActive = topicId === State.activePathStep;

    let dotColor = '#3A3A3C';
    let dotBorder = tn ? (tn.color || '#607D8B') : '#607D8B';
    if (status === 'mastered')        { dotColor = '#30D158'; dotBorder = '#30D158'; }
    else if (status === 'learning')   { dotColor = '#FF9F0A'; dotBorder = '#FF9F0A'; }
    else if (status === 'needs_work') { dotColor = '#FF453A'; dotBorder = '#FF453A'; }

    const step = document.createElement('div');
    step.className = 'path-step' + (isActive ? ' active' : '');
    step.dataset.id = topicId;
    step.innerHTML = `
      <div class="${isMastered ? 'path-step-num mastered' : 'path-step-num'}">${i + 1}</div>
      <div class="path-step-dot" style="background:${dotColor};border-color:${dotBorder}"></div>
      <div class="path-step-name">${escHtml(name)}</div>
      <div class="path-step-status">${escHtml(getStatusLabel(status, tested))}</div>
    `;
    step.addEventListener('click', () => highlightInGlobal(topicId));
    stepsEl.appendChild(step);
  });

  // 进度摘要
  const pct = Math.round(masteredCount / path.steps.length * 100);
  if (metaEl) {
    const desc = (getLang() === 'en' && path.desc_en) ? path.desc_en : (path.desc || '');
    metaEl.innerHTML = `<div class="path-progress-bar"><div class="path-progress-fill" style="width:${pct}%"></div></div>
      <div class="path-progress-label">${escHtml(desc)}</div>
      <button type="button" class="path-compare-hint" onclick="setActivePath(State.activePath === 'apply' ? 'understand' : 'apply')">${escHtml(t('path.compare_hint'))}</button>
      <div class="path-mastered-count">${escHtml(t('path.mastered_of', {n: masteredCount, total: path.steps.length}))}</div>`;
  }
}

function getSuggestedPathStepId(intent = State.activePath) {
  const path = LEARNING_PATHS[intent];
  if (!path || !path.steps?.length) return null;
  const topics = State.graphData?.nodes?.filter(n => n.type === 'topic') || [];
  return path.steps.find(id => {
    const node = topics.find(n => n.id === id);
    return node && node.status !== 'mastered';
  }) || path.steps[0];
}

function setActivePath(intent) {
  State.activePath = intent;
  State.activePathStep = getSuggestedPathStepId(intent);
  const ab = document.getElementById('btn-apply-path');
  const ub = document.getElementById('btn-understand-path');
  if (ab) ab.classList.toggle('active', intent === 'apply');
  if (ub) ub.classList.toggle('active', intent === 'understand');
  renderPathPanel();
  if (State.graphView !== 'path') {
    setGraphView('path');
  } else {
    const targetStep = State.activePathStep;
    renderGlobalView();
    State.graphView = 'path';
    State.activePathStep = targetStep;
    updateLayerDots(0, getLang() === 'en' ? 'Path' : '路径');
    window.setTimeout(() => doHighlight(targetStep), 520);
  }
}

// 在全局图谱中高亮路径步骤节点，并在侧栏展示详情
function highlightInGlobal(topicId) {
  State.activePathStep = topicId;

  // 若当前图谱不是全局总览，先切换
  if (State.graphView !== 'global' && State.graphView !== 'path') {
    renderGlobalView();
    State.graphView = 'path';
    setTimeout(() => doHighlight(topicId), 1100);
    return;
  }
  doHighlight(topicId);
}

function doHighlight(topicId) {
  if (!topicId || !g) return;
  State.activePathStep = topicId;

  document.querySelectorAll('.path-step').forEach(el => {
    el.classList.toggle('active', el.dataset.id === topicId);
  });

  renderPathOverlay(topicId);

  const topicNode = State.graphData?.nodes.find(n => n.id === topicId && n.type === 'topic');
  if (topicNode) showPathNodeDetail(topicNode);
}

function renderPathOverlay(activeTopicId = State.activePathStep) {
  if (!g || !State.graphData) return;
  const path = LEARNING_PATHS[State.activePath];
  if (!path) return;
  const wrap = document.getElementById('graph-svg')?.parentElement;
  if (wrap) wrap.classList.add('graph-path-mode');

  const stepSet = new Set(path.steps);
  g.selectAll('.g-path-overlay').remove();
  g.selectAll('.path-highlight, .path-route-ring').remove();
  g.selectAll('.node-g')
    .classed('path-node-in-route', d => d && stepSet.has(d.id))
    .classed('path-node-active', d => d && d.id === activeTopicId);

  const positioned = path.steps.map((id, index) => {
    const node = getRenderedNodeDatum(id);
    return node && typeof node.x === 'number' && typeof node.y === 'number'
      ? { ...node, stepIndex: index }
      : null;
  }).filter(Boolean);
  if (!positioned.length) return;

  const overlay = g.append('g').attr('class', 'g-path-overlay');
  const pairs = [];
  for (let i = 1; i < positioned.length; i++) pairs.push({ source: positioned[i - 1], target: positioned[i] });
  overlay.selectAll('line')
    .data(pairs)
    .join('line')
    .attr('class', 'path-route-line')
    .attr('x1', d => d.source.x).attr('y1', d => d.source.y)
    .attr('x2', d => d.target.x).attr('y2', d => d.target.y);

  positioned.forEach(item => {
    const nodeG = g.select(`[data-id="${item.id}"]`);
    if (nodeG.empty()) return;
    nodeG.append('circle')
      .attr('class', item.id === activeTopicId ? 'path-highlight' : 'path-route-ring')
      .attr('r', item.id === activeTopicId ? 23 : 18)
      .attr('fill', 'none')
      .attr('pointer-events', 'none');
  });
}

function showPathNodeDetail(d) {
  const el = document.getElementById('path-node-detail');
  if (!el) return;
  const status = d.status || 'unknown';
  const statusClass = getStatusClass(status, d.tested);
  const statusLabel = getStatusLabel(status, d.tested);
  const displayName = entityName(d);
  const displayNameAlt = getLang() === 'en' ? (d.name || '') : (d.name_en || '');
  const path = LEARNING_PATHS[State.activePath];
  const idx = path?.steps?.indexOf(d.id) ?? -1;
  const prevId = idx > 0 ? path.steps[idx - 1] : '';
  const nextId = idx >= 0 && idx < path.steps.length - 1 ? path.steps[idx + 1] : '';
  el.innerHTML = `
    <div class="path-detail-card">
      <div class="path-detail-kicker">${idx >= 0 ? escHtml(`${idx + 1} / ${path.steps.length}`) : ''}</div>
      <div class="path-detail-name">${escHtml(displayName)}</div>
      ${displayNameAlt ? `<div class="path-detail-en">${escHtml(displayNameAlt)}</div>` : ''}
      <span class="node-status-badge ${statusClass}">${escHtml(statusLabel)}</span>
      ${d.description ? `<div class="path-detail-desc">${escHtml(d.description)}</div>` : ''}
      <div class="path-detail-nav">
        <button type="button" data-nav="prev" ${prevId ? '' : 'disabled'}>${getLang() === 'en' ? '← Previous' : '← 上一步'}</button>
        <button type="button" data-nav="next" ${nextId ? '' : 'disabled'}>${getLang() === 'en' ? 'Next →' : '下一步 →'}</button>
      </div>
      <button class="node-action-btn" data-action="quiz">${escHtml(t('btn.quiz_this_topic'))}</button>
    </div>
  `;
  el.querySelector('[data-action="quiz"]')?.addEventListener('click', () => startTopicQuiz(d.id));
  el.querySelector('[data-nav="prev"]')?.addEventListener('click', () => prevId && highlightInGlobal(prevId));
  el.querySelector('[data-nav="next"]')?.addEventListener('click', () => nextId && highlightInGlobal(nextId));
}
// ============================================================
// 目录视图
// ============================================================

const _dirExpanded = {};  // area_id/dir_id → boolean (expanded state)

function renderDirPanel() {
  const tree = document.getElementById('dir-tree');
  if (!tree || !State.graphData) return;

  const nodes = State.graphData.nodes;
  const areas = nodes.filter(n => n.type === 'area');
  const dirs  = nodes.filter(n => n.type === 'direction');
  const topics = nodes.filter(n => n.type === 'topic');

  const statusColor = { mastered: '#30D158', learning: '#FF9F0A', needs_work: '#FF453A', unknown: '#8B949E' };

  let html = '';
  for (const area of areas) {
    const expanded = _dirExpanded[area.id] !== false; // default expanded
    const areaDirs = dirs.filter(d => d.area === area.id);
    html += `<div class="dir-area${expanded ? ' expanded' : ''}" data-id="${escHtml(area.id)}">
      <div class="dir-area-header" onclick="toggleDirNode('${escHtml(area.id)}')">
        <span class="dir-chevron">${expanded ? '▾' : '▸'}</span>
        <span class="dir-area-dot" style="background:${escHtml(area.color || '#888')}"></span>
        <span class="dir-area-name">${escHtml(entityName(area))}</span>
        <span class="dir-area-count">${area.total || 0}</span>
      </div>
      <div class="dir-area-body" style="display:${expanded ? '' : 'none'}">`;

    for (const dir of areaDirs) {
      const dirExpanded = _dirExpanded[dir.id] !== false;
      const dirTopics = topics.filter(t => t.direction === dir.id);
      const masteredCount = dirTopics.filter(t => t.status === 'mastered').length;
      html += `<div class="dir-dir${dirExpanded ? ' expanded' : ''}" data-id="${escHtml(dir.id)}">
        <div class="dir-dir-header" onclick="toggleDirNode('${escHtml(dir.id)}')">
          <span class="dir-chevron">${dirExpanded ? '▾' : '▸'}</span>
          <span class="dir-dir-name">${escHtml(entityName(dir))}</span>
          <span class="dir-dir-count">${masteredCount}/${dirTopics.length}</span>
        </div>
        <div class="dir-dir-body" style="display:${dirExpanded ? '' : 'none'}">`;

      for (const topic of dirTopics) {
        const sc = statusColor[topic.status] || statusColor.unknown;
        html += `<div class="dir-topic" data-id="${escHtml(topic.id)}" onclick="navigateToDirTopic('${escHtml(topic.id)}')">
          <span class="dir-status-dot" style="background:${sc}"></span>
          <span class="dir-topic-name">${escHtml(entityName(topic))}</span>
        </div>`;
      }
      html += `</div></div>`;
    }
    html += `</div></div>`;
  }
  tree.innerHTML = html;
}

function toggleDirNode(id) {
  _dirExpanded[id] = !(_dirExpanded[id] !== false);
  renderDirPanel();
}

function navigateToDirTopic(topicId) {
  // Show node info in sidebar; switch to global view if needed
  const node = (State.graphData?.nodes || []).find(n => n.id === topicId);
  if (!node) return;
  showNodeInfo(node);
  // Highlight the node on the graph
  if (State.simulationNodes) {
    g.selectAll('.node-g').attr('opacity', d => d && d.id === topicId ? 1 : 0.25);
    State.searchHighlightIds = new Set([topicId]);
    setTimeout(() => {
      g.selectAll('.node-g').attr('opacity', null);
      State.searchHighlightIds = null;
    }, 2000);
  }
}

// ============================================================
// Tab 2: 测评
// ============================================================

function renderDirectionsGrid() {
  const grid = document.getElementById('directions-grid');
  const areaColors = {};
  State.areas.forEach(a => { areaColors[a.id] = a.color; });

  // 从图谱数据中取各方向的掌握度
  const dirMastery = {};
  if (State.graphData) {
    State.graphData.nodes.filter(n => n.type === 'direction').forEach(n => {
      dirMastery[n.id] = { mastered: n.mastered || 0, total: n.total || 0 };
    });
  }

  grid.innerHTML = State.directions.map(d => {
    const color = areaColors[d.area] || '#888';
    const m = dirMastery[d.id] || { mastered: 0, total: d.topic_count || 4 };
    const pct = m.total > 0 ? Math.round(m.mastered / m.total * 100) : 0;
    const pctColor = pct >= 80 ? '#30D158' : pct >= 40 ? '#FF9F0A' : color;
    const questionText = d.total_questions
      ? t('dir.questions_n', { n: d.total_questions })
      : t('dir.questions_dynamic');
    return `
      <div class="direction-card" data-id="${escHtml(d.id)}">
        <div class="direction-card-top">
          <div class="direction-color-dot" style="background:${color}"></div>
          <div class="direction-card-name">${escHtml(getLang() === 'en' && d.name_en ? d.name_en : d.name)}</div>
          ${pct > 0 ? `<span class="dir-card-pct" style="color:${pctColor}">${pct}%</span>` : ''}
        </div>
        <div class="direction-card-meta">${t('dir.topics_n', {n: m.total})} · ${questionText}</div>
        ${pct > 0 ? `<div class="dir-card-bar"><div class="dir-card-bar-fill" style="width:${pct}%;background:${pctColor}"></div></div>` : ''}
      </div>
    `;
  }).join('');
  grid.querySelectorAll('.direction-card').forEach(card => {
    card.addEventListener('click', () => startDirectionQuiz(card.dataset.id));
  });
}

// 全局/快速诊断
document.getElementById('btn-start-diagnostic')?.addEventListener('click', (e) =>
  runWithButtonFeedback(e.currentTarget, getLang() === 'en' ? 'Loading…' : '加载题库…', startDiagnostic));
document.getElementById('btn-start-quick-diagnostic')?.addEventListener('click', (e) =>
  runWithButtonFeedback(e.currentTarget, getLang() === 'en' ? 'Loading…' : '加载题库…', startQuickDiagnostic));

function beginQuizFlow({ mode, questions, title, subtitle, directionId = null, topicId = null }) {
  State.quizMode = mode;
  State.currentDirectionId = directionId;
  State.currentTopicId = topicId;
  State.quizQuestions = questions || [];
  State.quizIndex = 0;
  State.quizAnswers = [];
  State.answeredCurrent = false;
  hide('quiz-home-view');
  hide('quiz-result-view');
  hide('direction-result-view');
  document.getElementById('quiz-flow-title').textContent = title;
  document.getElementById('quiz-flow-subtitle').textContent = subtitle;
  show('quiz-flow-view');
  const flowEl = document.getElementById('quiz-flow-view');
  flowEl?.classList.add('quiz-flow-enter');
  setTimeout(() => flowEl?.classList.remove('quiz-flow-enter'), 520);
  trackEvent('quiz_start', { mode, total: State.quizQuestions.length });
  saveQuizDraft();
  renderCurrentQuestion();
}

function pickQuickDiagnosticQuestions(allQuestions) {
  const dirToArea = {};
  (State.directions || []).forEach(d => { dirToArea[d.id] = d.area; });
  const chosen = [];
  const usedAreas = new Set();
  const sorted = [...(allQuestions || [])].sort((a, b) => (a.difficulty || 2) - (b.difficulty || 2));
  for (const q of sorted) {
    const area = dirToArea[q.direction_id] || q.area || q.direction_id;
    if (!usedAreas.has(area)) {
      chosen.push(q);
      usedAreas.add(area);
    }
    if (chosen.length >= 5) break;
  }
  for (const q of sorted) {
    if (chosen.length >= 5) break;
    if (!chosen.includes(q)) chosen.push(q);
  }
  return chosen.slice(0, 5);
}

async function startQuickDiagnostic() {
  switchToTab('quiz');
  try {
    const data = await fetchWithTimeout('/api/diagnostic').then(r => r.json());
    const questions = pickQuickDiagnosticQuestions(data.questions || []);
    beginQuizFlow({
      mode: 'quick',
      questions,
      title: getLang() === 'en' ? 'Quick Diagnostic' : '快速定位',
      subtitle: getLang() === 'en' ? `${questions.length} intro questions · about 1 minute` : `${questions.length} 道入门题 · 约 1 分钟`
    });
  } catch (e) {
    alert(t('quiz.load_failed', {msg: e.message}));
  }
}

async function startDiagnostic() {
  try {
    const data = await fetchWithTimeout('/api/diagnostic').then(r => r.json());
    beginQuizFlow({
      mode: 'diagnostic',
      questions: data.questions || [],
      title: getLang() === 'en' ? 'Full Diagnostic' : '完整诊断',
      subtitle: t('quiz.subtitle_diagnostic', { n: data.total || (data.questions || []).length })
    });
  } catch (e) {
    alert(t('quiz.load_failed', {msg: e.message}));
  }
}

// 方向测评
async function startDirectionQuiz(dirId) {
  State.quizMode = 'direction';
  State.currentDirectionId = dirId;
  hide('quiz-home-view');
  hide('quiz-result-view');
  hide('direction-result-view');

  const dir = State.directions.find(d => d.id === dirId);
  const dirName = dir?.name || dirId;

  try {
    const data = await fetchWithTimeout(`/api/direction/${dirId}/quiz`).then(r => r.json());
    State.quizQuestions = data.questions || [];
    State.quizIndex = 0;
    State.quizAnswers = [];
    State.answeredCurrent = false;

    const dirNameDisplay = getLang() === 'en' && dir?.name_en ? dir.name_en : dirName;
    document.getElementById('quiz-flow-title').textContent = dirNameDisplay;
    document.getElementById('quiz-flow-subtitle').textContent =
      t('quiz.subtitle_direction', { n: data.total_questions, topics: data.topics?.length || 4 });

    show('quiz-flow-view');
    trackEvent('quiz_start', { mode: 'direction', directionId: dirId, total: State.quizQuestions.length });
    saveQuizDraft();
    renderCurrentQuestion();
  } catch (e) {
    alert(t('quiz.load_failed', {msg: e.message}));
  }
}

function renderCurrentQuestion() {
  const q = State.quizQuestions[State.quizIndex];
  if (!q) return;

  const total = State.quizQuestions.length;
  const current = State.quizIndex + 1;
  const pct = (current / total * 100).toFixed(1);

  document.getElementById('quiz-progress-fill').style.width = pct + '%';
  document.getElementById('quiz-counter').textContent = `${current} / ${total}`;

  // 方向标签
  const dirName = getLang() === 'en' && q.direction_name_en ? q.direction_name_en : q.direction_name;
  const topicName = getLang() === 'en' && q.topic_name_en ? q.topic_name_en : q.topic_name;
  const dirLabel = dirName
    ? t('quiz.dir_topic', { dir: dirName, topic: topicName })
    : t('quiz.topic_only', { topic: topicName });
  document.getElementById('quiz-direction-label').textContent = dirLabel;

  // 题目
  const area = document.getElementById('quiz-question-area');
  area.innerHTML = `
    <div class="question-card question-card-enter">
      <div class="question-text">${escHtml(q.question)}</div>
      <div class="options-list">
        ${(q.options || []).map((opt, i) => `
          <button class="option-btn" data-idx="${i}" onclick="selectOption(${i})">
            <span class="option-letter">${escHtml(opt.letter)}.</span>
            <span>${escHtml(opt.text)}</span>
          </button>
        `).join('')}
      </div>
      <div class="explanation-box hidden" id="explanation-box">
        ${escHtml(q.explanation || '')}
      </div>
    </div>
  `;

  State.answeredCurrent = false;
  const nextBtn = document.getElementById('btn-next-question');
  nextBtn.textContent = State.quizIndex === total - 1 ? t('btn.submit') : t('btn.next');
  nextBtn.disabled = true;
  nextBtn.style.opacity = '0.5';
  const skipBtn = document.getElementById('btn-skip-question');
  if (skipBtn) {
    skipBtn.textContent = t('btn.skip');
    skipBtn.style.display = '';
  }
}

async function selectOption(idx) {
  if (State.answeredCurrent) return;
  State.answeredCurrent = true;

  const q = State.quizQuestions[State.quizIndex];

  // 立即锁定所有选项，防止重复点击
  document.querySelectorAll('.option-btn').forEach(btn => {
    btn.style.cursor = 'default';
    btn.onclick = null;
  });

  // 后端验证答案（防止前端伪造）
  let isCorrect = false, correctIdx = -1;
  try {
    const res = await fetchWithTimeout('/api/answer-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic_id: q.topic_id,
        within_topic_q_index: q.within_topic_q_index ?? State.quizIndex,
        selected_index: idx
      })
    }).then(r => r.json());
    isCorrect = res.is_correct;
    correctIdx = res.correct_index;
    if (res.explanation) {
      const expBox = document.getElementById('explanation-box');
      if (expBox) expBox.textContent = res.explanation;
    }
  } catch (e) {
    // 后端校验失败时不继续：重置答题状态，提示用户
    State.answeredCurrent = false;
    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.style.cursor = 'pointer';
      btn.onclick = () => selectOption(+btn.dataset.idx);
    });
    const expBox = document.getElementById('explanation-box');
    if (expBox) { expBox.textContent = t('quiz.check_failed'); expBox.classList.remove('hidden'); }
    return;
  }

  // 记录答案（is_correct 以服务端为准）
  State.quizAnswers.push(currentQuizAnswerPayload({
    selectedIndex: idx,
    isCorrect
  }));
  showToast(isCorrect ? (getLang() === 'en' ? 'Correct — explanation unlocked.' : '回答正确，已显示解析。') : (getLang() === 'en' ? 'Not quite — check the explanation.' : '还不准确，先看一下解析。'), { tone: isCorrect ? 'success' : 'warning', duration: 1800 });
  saveQuizDraft();

  // 高亮选项
  document.querySelectorAll('.option-btn').forEach((btn, i) => {
    if (i === correctIdx) btn.classList.add('correct');
    else if (i === idx && !isCorrect) btn.classList.add('wrong');
  });

  // 显示解析
  const expBox = document.getElementById('explanation-box');
  if (expBox) expBox.classList.remove('hidden');

  // 解锁下一题，隐藏跳过按钮
  const nextBtn = document.getElementById('btn-next-question');
  nextBtn.disabled = false;
  nextBtn.style.opacity = '1';
  const skipBtn = document.getElementById('btn-skip-question');
  if (skipBtn) skipBtn.style.display = 'none';
}

function currentQuizAnswerPayload({ skipped = false, selectedIndex = -1, isCorrect = false } = {}) {
  const q = State.quizQuestions[State.quizIndex];
  return {
    question_index: State.quizIndex,
    within_topic_q_index: q?.within_topic_q_index ?? State.quizIndex,
    selected_index: selectedIndex,
    skipped,
    is_correct: isCorrect,
    topic_id: q?.topic_id,
    direction_id: q?.direction_id || State.currentDirectionId
  };
}

function saveQuizDraft() {
  try {
    if (!State.quizMode || !State.quizQuestions?.length) return;
    sessionStorage.setItem('kg_quiz_draft', JSON.stringify({
      quizMode: State.quizMode,
      currentDirectionId: State.currentDirectionId,
      currentTopicId: State.currentTopicId,
      quizIndex: State.quizIndex,
      answers: State.quizAnswers,
      questions: State.quizQuestions,
      total: State.quizQuestions.length,
      updatedAt: Date.now()
    }));
  } catch (_) {}
}

function clearQuizDraft() {
  try { sessionStorage.removeItem('kg_quiz_draft'); } catch (_) {}
  renderQuizDraftCard();
}

function getQuizDraft() {
  const draft = readJsonStorage(sessionStorage, 'kg_quiz_draft', null);
  if (!draft || !draft.questions || !draft.total) return null;
  if (Date.now() - (draft.updatedAt || 0) > 24 * 60 * 60 * 1000) { clearQuizDraft(); return null; }
  return draft;
}

function renderQuizDraftCard() {
  const card = document.getElementById('quiz-draft-card');
  if (!card) return;
  const draft = getQuizDraft();
  if (!draft) { card.classList.add('hidden'); card.innerHTML = ''; return; }
  const done = Math.min(draft.answers?.length || draft.quizIndex || 0, draft.total || 0);
  const modeLabel = draft.quizMode === 'quick' ? (getLang() === 'en' ? 'quick diagnostic' : '快速定位') : draft.quizMode === 'diagnostic' ? (getLang() === 'en' ? 'full diagnostic' : '完整诊断') : (getLang() === 'en' ? 'quiz' : '测评');
  card.innerHTML = `<div><strong>${getLang() === 'en' ? 'Resume draft?' : '继续上次测评？'}</strong><span>${getLang() === 'en' ? `Your ${modeLabel} reached ${done}/${draft.total}.` : `你的${modeLabel}进行到 ${done}/${draft.total}。`}</span></div><div class="quiz-draft-actions"><button class="btn-primary" onclick="resumeQuizDraft()">${getLang() === 'en' ? 'Resume' : '继续'}</button><button class="btn-secondary" onclick="discardQuizDraft()">${getLang() === 'en' ? 'Discard' : '放弃'}</button></div>`;
  card.classList.remove('hidden');
}

function resumeQuizDraft() {
  const draft = getQuizDraft();
  if (!draft) return;
  State.quizMode = draft.quizMode;
  State.currentDirectionId = draft.currentDirectionId || null;
  State.currentTopicId = draft.currentTopicId || null;
  State.quizQuestions = draft.questions || [];
  State.quizIndex = Math.min(draft.quizIndex || 0, Math.max(0, State.quizQuestions.length - 1));
  State.quizAnswers = draft.answers || [];
  State.answeredCurrent = false;
  hide('quiz-home-view'); hide('quiz-result-view'); hide('direction-result-view'); show('quiz-flow-view');
  const titleMap = { quick: '快速定位', diagnostic: '完整诊断', direction: '方向测评', topic: '主题测评' };
  document.getElementById('quiz-flow-title').textContent = getLang() === 'en' ? 'Resume Quiz' : (titleMap[State.quizMode] || '继续测评');
  document.getElementById('quiz-flow-subtitle').textContent = `${State.quizQuestions.length} ${getLang() === 'en' ? 'questions' : '道题'} · ${getLang() === 'en' ? 'draft restored' : '已恢复草稿'}`;
  trackEvent('quiz_draft_resume', { mode: State.quizMode, total: State.quizQuestions.length });
  renderCurrentQuestion();
}

function discardQuizDraft() {
  clearQuizDraft();
  trackEvent('quiz_draft_discard');
}

document.getElementById('btn-next-question').addEventListener('click', () => {
  if (!State.answeredCurrent) return;

  State.quizIndex++;
  saveQuizDraft();
  if (State.quizIndex >= State.quizQuestions.length) {
    finishQuiz();
  } else {
    State.answeredCurrent = false;
    renderCurrentQuestion();
  }
});

document.getElementById('btn-skip-question').addEventListener('click', () => {
  if (State.answeredCurrent) return; // already answered, use next button instead
  State.quizAnswers.push(currentQuizAnswerPayload({ skipped: true }));
  showToast(getLang() === 'en' ? 'Skipped. This question will not be scored.' : '已跳过，这题不会计入评分。', { tone: 'warning', duration: 1600 });
  trackEvent('quiz_skip', { mode: State.quizMode, index: State.quizIndex });
  State.quizIndex++;
  saveQuizDraft();
  if (State.quizIndex >= State.quizQuestions.length) {
    finishQuiz();
  } else {
    State.answeredCurrent = false;
    renderCurrentQuestion();
  }
});

document.getElementById('btn-quit-quiz').addEventListener('click', () => {
  const hasProgress = State.quizIndex > 0 || State.quizAnswers.length > 0;
  if (hasProgress && !window.confirm(t('quiz.quit_confirm'))) return;
  if (hasProgress) saveQuizDraft();
  trackEvent('quiz_abandon', { mode: State.quizMode, answered: State.quizAnswers.length, total: State.quizQuestions.length });
  hide('quiz-flow-view');
  show('quiz-home-view');
});

async function finishQuiz() {
  clearQuizDraft();
  hide('quiz-flow-view');
  document.getElementById('quiz-progress-fill').style.width = '100%';

  trackEvent('quiz_complete', { mode: State.quizMode, answered: State.quizAnswers.length, skipped: State.quizAnswers.filter(a => a.skipped).length, total: State.quizQuestions.length });
  if (State.quizMode === 'diagnostic' || State.quizMode === 'quick') {
    await submitDiagnostic();
  } else if (State.quizMode === 'topic') {
    await submitDirectionQuiz();  // topic answers have direction_id; reuse direction submit
  } else {
    await submitDirectionQuiz();
  }

  updateTopbarBadge();
  renderLearningCockpit();
  // 刷新图谱状态（后台静默更新，不影响当前界面）
  refreshGraphData();
}

async function submitDiagnostic() {
  try {
    const result = await fetchWithTimeout('/api/diagnostic/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: State.quizAnswers })
    }).then(r => r.json());

    State._lastDiagnosticResult = result;
    completeOnboardStep('quiz');
    renderDiagnosticResult(result);
    show('quiz-result-view');
  } catch (e) {
    alert(t('quiz.submit_failed', {msg: e.message}));
    show('quiz-home-view');
  }
}

async function submitDirectionQuiz() {
  try {
    const result = await fetchWithTimeout(`/api/direction/${State.currentDirectionId}/quiz/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: State.quizAnswers })
    }).then(r => r.json());

    State._lastDirectionResult = result;
    completeOnboardStep('quiz');
    renderDirectionResult(result);
    show('direction-result-view');
  } catch (e) {
    alert(t('quiz.submit_failed', {msg: e.message}));
    show('quiz-home-view');
  }
}

function renderDiagnosticResult(result) {
  const pct = result.total_questions > 0
    ? Math.round(result.total_correct / result.total_questions * 100) : 0;

  document.getElementById('result-score-big').textContent = pct + '%';
  document.getElementById('result-score-label').textContent =
    t('result.correct_of', {n: result.total_correct, total: result.total_questions});

  // 各方向得分列表
  const scoresList = document.getElementById('direction-scores-list');
  const scores = Object.entries(result.direction_scores || {})
    .sort((a, b) => a[1].percent - b[1].percent);

  scoresList.innerHTML = scores.map(([did, info]) => {
    const color = scoreColor(info.percent);
    const displayDirName = getLang() === 'en' && info.name_en ? info.name_en : info.name;
    return `
      <div class="score-row">
        <span class="score-name" title="${escHtml(displayDirName)}">${escHtml(displayDirName)}</span>
        <div class="score-bar-wrap">
          <div class="score-bar-fill" style="width:${info.percent}%;background:${color}"></div>
        </div>
        <span class="score-pct" style="color:${color}">${info.percent}%</span>
      </div>
    `;
  }).join('');

  // 雷达图
  drawRadar('#radar-svg', result.radar_data || [], 300, 300);

  // 弱项
  const weakSection = document.getElementById('weak-section');
  const weakTags = document.getElementById('weak-tags');
  const weakDirs = result.weak_directions || [];

  if (weakDirs.length === 0) {
    weakSection.style.display = 'none';
  } else {
    weakSection.style.display = 'block';
    weakTags.innerHTML = weakDirs.map(w => {
      const displayName = getLang() === 'en' && w.name_en ? w.name_en : w.name;
      return `<span class="weak-tag" data-id="${escHtml(w.direction_id)}">${escHtml(displayName)} (${w.percent}%)</span>`;
    }).join('');
    weakTags.querySelectorAll('.weak-tag').forEach(tag => {
      tag.addEventListener('click', () => startDirectionQuiz(tag.dataset.id));
    });
  }

  renderSkippedSummaryInResult(result);

  // 推荐下一步
  renderNextSteps(result);
}

function renderSkippedSummaryInResult(result) {
  const scoresList = document.getElementById('direction-scores-list');
  if (!scoresList) return;
  const skipped = State.quizAnswers.filter(a => a.skipped);
  const old = document.getElementById('skipped-summary');
  if (old) old.remove();
  if (!skipped.length) return;
  const byDir = skipped.reduce((acc, a) => { const k = a.direction_id || 'unknown'; acc[k] = (acc[k] || 0) + 1; return acc; }, {});
  const top = Object.entries(byDir).sort((a,b)=>b[1]-a[1])[0];
  const dir = (State.directions || []).find(d => d.id === top?.[0]);
  const dirName = dir ? (getLang() === 'en' && dir.name_en ? dir.name_en : dir.name) : top?.[0];
  const el = document.createElement('div');
  el.id = 'skipped-summary';
  el.className = 'skipped-summary';
  el.innerHTML = `${getLang() === 'en' ? 'Skipped' : '已跳过'} ${skipped.length} ${getLang() === 'en' ? 'question(s). Skipped questions are not scored.' : '题，不参与评分。'}${dirName ? `<br>${getLang() === 'en' ? 'Most skipped area' : '跳过集中方向'}：${escHtml(dirName)}` : ''}`;
  scoresList.appendChild(el);
}

function renderNextSteps(result) {
  const section = document.getElementById('next-steps-section');
  const list = document.getElementById('next-steps-list');
  if (!section || !list) return;

  const allTopics = (State.graphData?.nodes || []).filter(n => n.type === 'topic');
  const weakDirs = result.weak_directions || [];
  const scores = result.direction_scores || {};

  // 收集候选：从弱方向或低分方向中，找难度低（1-2）且未测评的 topic
  const candidates = [];
  const weakDirIds = new Set(weakDirs.map(w => w.direction_id));

  // 先从弱方向找基础 topic
  for (const dirId of weakDirIds) {
    const dirTopics = allTopics
      .filter(t => t.direction === dirId && (t.difficulty || 3) <= 2 && t.status !== 'mastered')
      .sort((a, b) => (a.difficulty || 3) - (b.difficulty || 3));
    for (const t of dirTopics.slice(0, 1)) {
      candidates.push({ topic: t, reason: '薄弱方向基础入口' });
    }
  }

  // 再从中等分数方向（50%以下）补充
  const midDirs = Object.entries(scores)
    .filter(([did, info]) => info.percent > 0 && info.percent < 50 && !weakDirIds.has(did))
    .sort((a, b) => a[1].percent - b[1].percent);
  for (const [did, info] of midDirs.slice(0, 2)) {
    const t = allTopics.find(t => t.direction === did && (t.difficulty || 3) <= 2 && t.status !== 'mastered');
    if (t) candidates.push({ topic: t, reason: '需要巩固的方向' });
  }

  // 保证有"MCP"和"Skill"入口（Agent 实践导向）
  const practiceTopics = ['mcp_protocol', 'skill_building', 'agent_basics'];
  for (const pid of practiceTopics) {
    const t = allTopics.find(t => t.id === pid);
    if (t && t.status !== 'mastered' && !candidates.find(c => c.topic.id === pid)) {
      candidates.push({ topic: t, reason: 'Agent 实践必学' });
      if (candidates.length >= 5) break;
    }
  }

  const steps = candidates.slice(0, 5);

  if (steps.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = steps.map((s, i) => {
    const tn = s.topic;
    const dir = (State.directions || []).find(d => d.id === tn.direction);
    const dirName = getLang() === 'en' && dir?.name_en ? dir.name_en : (dir?.name || tn.direction);
    const topicName = getLang() === 'en' && tn.name_en ? tn.name_en : tn.name;
    return `
      <div class="next-step-item" data-id="${escHtml(tn.id)}">
        <div class="next-step-num">${i + 1}</div>
        <div class="next-step-content">
          <div class="next-step-title">${escHtml(topicName)}</div>
          <div class="next-step-meta">${escHtml(dirName)} · ${escHtml(s.reason)}</div>
        </div>
        <span class="next-step-action">${escHtml(t('result.next_view'))}</span>
      </div>
    `;
  }).join('');
  list.querySelectorAll('.next-step-item').forEach(item => {
    item.addEventListener('click', () => goToTopicFromResult(item.dataset.id));
  });
}

function goToTopicFromResult(topicId) {
  hide('quiz-result-view');
  switchToTab('graph');
  setTimeout(() => navigateToNode('topic', topicId), 200);
}

function renderDirectionResult(result) {
  const dir = State.directions.find(d => d.id === result.direction_id);
  const dirLabel = getLang() === 'en' && dir?.name_en ? dir.name_en : (dir?.name || result.direction_id);
  document.getElementById('dir-result-title').textContent = dirLabel + (getLang() === 'en' ? ' Results' : ' 测评结果');
  document.getElementById('dir-result-score').textContent = result.score_percent + '%';
  document.getElementById('dir-result-label').textContent =
    t('result.correct_of', {n: result.total_correct, total: result.total_questions});

  const topicResults = document.getElementById('dir-topic-results');
  topicResults.innerHTML = (result.topic_results || []).map(tr => {
    const color = scoreColor(tr.percent);
    const wasTested = (tr.total || 0) > 0;
    const statusLabel = getStatusLabel(tr.new_status, wasTested);
    return `
      <div class="score-row">
        <span class="score-name" title="${escHtml(tr.topic_name)}">${escHtml(tr.topic_name)}</span>
        <div class="score-bar-wrap">
          <div class="score-bar-fill" style="width:${tr.percent}%;background:${color}"></div>
        </div>
        <span class="score-pct" style="color:${color}">${tr.percent}%</span>
        <span class="node-status-badge ${getStatusClass(tr.new_status, wasTested)}" style="font-size:10px;padding:2px 8px">${escHtml(statusLabel)}</span>
      </div>
    `;
  }).join('');
}

// 返回首页按钮
document.getElementById('btn-back-to-quiz-home').addEventListener('click', () => {
  hide('quiz-result-view');
  show('quiz-home-view');
});
document.getElementById('btn-back-to-quiz-home-2').addEventListener('click', () => {
  hide('direction-result-view');
  show('quiz-home-view');
});
document.getElementById('btn-redo-diagnostic').addEventListener('click', () => {
  hide('quiz-result-view');
  startDiagnostic();
});

// 从测评结果跳转图谱
document.getElementById('btn-view-graph-from-diagnostic').addEventListener('click', async () => {
  hide('quiz-result-view');
  show('quiz-home-view');
  switchToTab('graph');
  setTimeout(async () => {
    setGraphView('global');
    await refreshGraphData();
    // 显示个人掌握图谱模式横幅
    showMasteryModeBanner(State._lastDiagnosticResult);
  }, 200);
});
document.getElementById('btn-view-direction-graph').addEventListener('click', async () => {
  const dirId = State.currentDirectionId;
  hide('direction-result-view');
  show('quiz-home-view');
  // 刷新图谱数据后再导航，确保显示最新掌握状态
  await refreshGraphData();
  if (dirId) navigateToNode('direction', dirId);
  else switchToTab('graph');
});

// ============================================================
// 个人掌握图谱模式横幅
// ============================================================

async function showMasteryModeBanner(result) {
  const panel = document.getElementById('node-info-panel');
  if (!panel) return;

  // Fetch recommendations
  let recs = [];
  try {
    recs = await fetchWithTimeout('/api/recommendations?top_n=3').then(r => r.json());
  } catch (_) {}

  const total = result?.total_questions || 0;
  const correct = result?.total_correct || 0;
  const pct = total > 0 ? Math.round(correct / total * 100) : 0;
  const isEn = getLang() === 'en';

  const recHtml = recs.length > 0 ? `
    <div class="mastery-banner-recs-title">${isEn ? 'Recommended next' : '推荐下一步'}</div>
    ${recs.map(r => {
      const name = (isEn && r.name_en) ? r.name_en : r.name;
      return `<button class="mastery-rec-btn" data-id="${escHtml(r.id)}">${escHtml(name)}</button>`;
    }).join('')}
  ` : '';

  panel.innerHTML = `
    <div class="mastery-mode-banner">
      <div class="mastery-banner-header">
        <span class="mastery-banner-title">${isEn ? 'Post-diagnostic map' : '诊断后学习地图'}</span>
        <button class="mastery-banner-exit" onclick="clearMasteryModeBanner()">${isEn ? '✕ Exit' : '✕ 退出'}</button>
      </div>
      <div class="mastery-banner-score">${isEn ? `Score: ${correct}/${total} (${pct}%)` : `本次得分：${correct}/${total}（${pct}%）`}</div>
      <div class="mastery-banner-desc">${isEn ? 'Node colors show your latest mastery status.' : '节点颜色已更新为最新掌握状态。'}</div>
      ${recHtml}
      <div class="mastery-banner-onboard-hint">${isEn ? 'Click a node to view details' : '单击节点查看详情'}</div>
    </div>
  `;

  // Bind rec buttons
  panel.querySelectorAll('.mastery-rec-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateToNode('topic', btn.dataset.id));
  });
}

function clearMasteryModeBanner() {
  const panel = document.getElementById('node-info-panel');
  if (!panel) return;
  panel.innerHTML = getOnboardingMarkup();
  renderOnboardChecklist();
}

// ============================================================
// D3 雷达图 (蜘蛛网图)
// ============================================================

function drawRadar(selector, data, width, height) {
  const svg = d3.select(selector);
  svg.selectAll('*').remove();
  svg.attr('width', width).attr('height', height);

  if (!data || data.length === 0) return;

  const margin = 48;
  const radius = Math.min(width, height) / 2 - margin;
  const cx = width / 2, cy = height / 2;
  const n = data.length;
  const levels = 5;

  const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

  // 角度
  const angleSlice = (Math.PI * 2) / n;

  const isLight = document.documentElement.getAttribute('data-theme') === 'light';
  const gridColor  = isLight ? '#c8d0d9' : '#30363d';
  const labelColor = isLight ? '#656d76' : '#8b949e';

  // 同心圆（网格）
  for (let l = 1; l <= levels; l++) {
    const r = radius * l / levels;
    g.append('circle')
      .attr('r', r)
      .attr('fill', 'none')
      .attr('stroke', gridColor)
      .attr('stroke-width', 0.5);
  }

  // 轴线 + 标签
  data.forEach((d, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);

    g.append('line')
      .attr('x1', 0).attr('y1', 0)
      .attr('x2', x).attr('y2', y)
      .attr('stroke', gridColor)
      .attr('stroke-width', 0.8);

    const labelR = radius + 20;
    const lx = labelR * Math.cos(angle);
    const ly = labelR * Math.sin(angle);
    const labelLimit = getLang() === 'en' ? 14 : 6;
    const label = d.axis.length > labelLimit ? d.axis.slice(0, labelLimit) + '…' : d.axis;

    g.append('text')
      .attr('x', lx)
      .attr('y', ly)
      .attr('text-anchor', Math.abs(lx) < 10 ? 'middle' : lx > 0 ? 'start' : 'end')
      .attr('dominant-baseline', 'middle')
      .attr('fill', labelColor)
      .attr('font-size', '10px')
      .text(label);
  });

  // 数据多边形
  const line = d3.lineRadial()
    .angle((d, i) => angleSlice * i)
    .radius(d => d.value * radius)
    .curve(d3.curveLinearClosed);

  g.append('path')
    .datum(data)
    .attr('d', line)
    .attr('fill', 'rgba(88,166,255,0.15)')
    .attr('stroke', '#58a6ff')
    .attr('stroke-width', 2);

  // 数据点
  data.forEach((d, i) => {
    const angle = angleSlice * i - Math.PI / 2;
    const r = d.value * radius;
    const px = r * Math.cos(angle);
    const py = r * Math.sin(angle);

    g.append('circle')
      .attr('cx', px).attr('cy', py)
      .attr('r', 4)
      .attr('fill', '#58a6ff')
      .attr('stroke', '#0f1117')
      .attr('stroke-width', 1.5);
  });
}

// ============================================================
// Tab 3: 进度看板
// ============================================================

function buildDirectionRadarData(progress) {
  const areas = progress?.areas || {};
  const rows = (State.directions || []).map(d => {
    const dData = areas[d.area]?.directions?.[d.id];
    if (!dData) return null;
    const name = getLang() === 'en' && dData.name_en ? dData.name_en : (dData.name || entityName(d));
    return { axis: name, value: Math.max(0, Math.min(1, (dData.percent || 0) / 100)) };
  }).filter(Boolean);
  return rows.length >= 3 ? rows : null;
}

async function loadProgress() {
  try {
    const [p, recs] = await Promise.all([
      fetchWithTimeout('/api/progress').then(r => r.json()),
      fetchWithTimeout('/api/recommendations?top_n=5').then(r => r.json()).catch(() => []),
    ]);

    document.getElementById('stat-total').textContent = p.total;
    document.getElementById('stat-mastered').textContent = p.mastered;
    document.getElementById('stat-learning').textContent = p.learning;
    document.getElementById('stat-needs-work').textContent = p.needs_work ?? 0;
    document.getElementById('stat-unknown').textContent = p.unknown;

    // 雷达图：与诊断结果保持方向级维度，避免 15 维诊断图与 5 维进度图来回跳变。
    drawRadar('#progress-radar-svg', buildDirectionRadarData(p) || p.radar_data || [], 340, 300);

    renderWeeklyGoalCard(p);

    // 下一步推荐：卡片化并给出动作，而不是只放一排 chip。
    const nextSection = document.getElementById('progress-next-steps');
    const nextChips = document.getElementById('progress-next-chips');
    if (Array.isArray(recs) && recs.length > 0) {
      nextChips.innerHTML = recs.slice(0, 5).map(r => {
        const name = (getLang() === 'en' && r.name_en) ? r.name_en : r.name;
        const topic = (State.graphData?.nodes || []).find(n => n.id === r.id) || r;
        const dir = (State.directions || []).find(d => d.id === topic.direction);
        const dirName = dir ? (getLang() === 'en' && dir.name_en ? dir.name_en : dir.name) : '';
        return `<div class="progress-rec-card" data-id="${escHtml(r.id)}">
          <div><strong>${escHtml(name)}</strong><span>${escHtml(dirName)} · ${escHtml(r.reason || buildClientRecommendationReason(r))}</span></div>
          <div class="progress-rec-actions"><button data-action="quiz">${getLang() === 'en' ? 'Quiz' : '测评'}</button><button data-action="view">${getLang() === 'en' ? 'View in map' : '在图谱中查看'}</button></div>
        </div>`;
      }).join('');
      nextSection.style.display = '';
      nextChips.querySelectorAll('.progress-rec-card').forEach(card => {
        card.querySelector('[data-action="quiz"]')?.addEventListener('click', () => startTopicQuiz(card.dataset.id));
        card.querySelector('[data-action="view"]')?.addEventListener('click', () => {
          switchToTab('graph');
          setTimeout(() => navigateToNode('topic', card.dataset.id), 200);
        });
      });
    } else {
      nextSection.style.display = 'none';
    }

    // 大类进度条
    const areaList = document.getElementById('area-progress-list');
    areaList.innerHTML = Object.entries(p.areas || {}).map(([aid, aData]) => {
      const fillColor = aData.color || '#4A90E2';
      const dirBars = Object.entries(aData.directions || {}).map(([did, dData]) => {
        return `
          <div class="dir-bar-row">
            <span class="dir-bar-name" title="${escHtml(dData.name)}">${escHtml(dData.name_en && getLang() === 'en' ? dData.name_en : dData.name)}</span>
            <div class="dir-bar-track">
              <div class="dir-bar-fill" style="width:${dData.percent}%;background:${fillColor}"></div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="area-progress-item">
          <div class="area-progress-header">
            <span class="area-icon">${escHtml(aData.icon || '')}</span>
            <span class="area-name">${escHtml(aData.name_en && getLang() === 'en' ? aData.name_en : aData.name)}</span>
            <span class="area-pct">${aData.percent}%</span>
          </div>
          <div class="area-bar">
            <div class="area-bar-fill" style="width:${aData.percent}%;background:${fillColor}"></div>
          </div>
          <div class="dir-bars">${dirBars}</div>
        </div>
      `;
    }).join('');

    State._lastProgressData = p;
    renderProgressHeatmap(p);
    updateTopbarBadge();
  } catch (e) {
    console.error('Load progress error:', e);
  }
}

function getWeekStartTs(ts = Date.now()) {
  const d = new Date(ts);
  const day = d.getDay() || 7;
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - day + 1);
  return d.getTime();
}

function renderWeeklyGoalCard(p) {
  const el = document.getElementById('weekly-goal-card');
  if (!el) return;
  const weekStart = getWeekStartTs();
  const goal = Number(localStorage.getItem('kg_weekly_goal') || 0);
  const masteredThisWeek = getKgEvents().filter(e => e.name === 'topic_status_update' && e.data?.status === 'mastered' && e.ts >= weekStart).length;
  if (!goal) {
    el.innerHTML = `<div><strong>${getLang() === 'en' ? 'Set a weekly goal' : '设置本周目标'}</strong><span>${getLang() === 'en' ? 'A small target turns the map into action.' : '小目标能把地图变成行动。'}</span></div><div class="weekly-goal-options">${[1,3,5,10].map(n => `<button onclick="setWeeklyGoal(${n})">${n}</button>`).join('')}</div>`;
    return;
  }
  const pct = Math.min(100, Math.round(masteredThisWeek / goal * 100));
  el.innerHTML = `<div><strong>${getLang() === 'en' ? 'Weekly goal' : '本周目标'}</strong><span>${masteredThisWeek}/${goal} ${getLang() === 'en' ? 'topics mastered this week' : '个主题已在本周掌握'}</span></div><div class="weekly-goal-track"><i style="width:${pct}%"></i></div><button class="weekly-goal-reset" onclick="setWeeklyGoal(0)">${getLang() === 'en' ? 'Reset' : '重设'}</button>`;
}

function setWeeklyGoal(n) {
  if (n > 0) localStorage.setItem('kg_weekly_goal', String(n));
  else localStorage.removeItem('kg_weekly_goal');
  trackEvent('weekly_goal_set', { goal: n });
  if (State._lastProgressData) renderWeeklyGoalCard(State._lastProgressData);
}

function renderProgressHeatmap(p) {
  const container = document.getElementById('progress-heatmap');
  if (!container) return;
  const statusColor = { mastered: '#30D158', learning: '#FF9F0A', needs_work: '#FF453A', unknown: '#4a5568' };
  const lang = getLang();
  let html = '';
  Object.entries(p.areas || {}).forEach(([aid, aData]) => {
    const aName = (lang === 'en' && aData.name_en) ? aData.name_en : aData.name;
    html += `<div class="hm-area">
      <div class="hm-area-header">
        <span class="hm-area-icon">${escHtml(aData.icon || '')}</span>
        <span class="hm-area-name">${escHtml(aName)}</span>
        <span class="hm-area-stats">${aData.mastered}/${aData.total}</span>
      </div>`;
    Object.entries(aData.directions || {}).forEach(([did, dData]) => {
      const dName = (lang === 'en' && dData.name_en) ? dData.name_en : dData.name;
      const dots = (dData.topics || []).map(tp => {
        const tName = (lang === 'en' && tp.name_en) ? tp.name_en : tp.name;
        const col = statusColor[tp.status] || statusColor.unknown;
        return `<span class="hm-dot" style="background:${col}" title="${escHtml(tName)}" data-topic-id="${escHtml(tp.id)}"></span>`;
      }).join('');
      html += `<div class="hm-dir-row">
        <span class="hm-dir-name" title="${escHtml(dName)}">${escHtml(dName)}</span>
        <span class="hm-dir-count">${dData.mastered}/${dData.total}</span>
        <span class="hm-dots">${dots}</span>
      </div>`;
    });
    html += `</div>`;
  });
  container.innerHTML = html;
  container.querySelectorAll('.hm-dot[data-topic-id]').forEach(dot => {
    dot.addEventListener('click', () => {
      const topic = (State.graphData?.nodes || []).find(n => n.id === dot.dataset.topicId);
      showHeatmapMiniCard(dot, topic);
    });
  });
  renderPrivacyPanel();
}

function showHeatmapMiniCard(anchor, topic) {
  if (!topic) return;
  document.getElementById('heatmap-mini-card')?.remove();
  const el = document.createElement('div');
  el.id = 'heatmap-mini-card';
  el.className = 'heatmap-mini-card';
  el.innerHTML = `<strong>${escHtml(entityName(topic))}</strong><span>${escHtml(getStatusLabel(topic.status, topic.tested))}</span><button type="button">${getLang() === 'en' ? 'Open in map' : '跳到图谱'}</button>`;
  document.body.appendChild(el);
  const r = anchor.getBoundingClientRect();
  el.style.left = `${Math.min(window.innerWidth - 220, r.left)}px`;
  el.style.top = `${r.bottom + 8}px`;
  el.querySelector('button').onclick = () => { el.remove(); switchToTab('graph'); setTimeout(() => navigateToNode('topic', topic.id), 160); };
  setTimeout(() => document.addEventListener('click', function close(e){ if (!el.contains(e.target)) { el.remove(); document.removeEventListener('click', close, true); }}, true), 0);
}

// ============================================================
// 搜索功能
// ============================================================

let _searchTimer = null;

function updateSearchClearVisibility() {
  const input = document.getElementById('search-input');
  const clear = document.getElementById('search-clear');
  if (clear && input) clear.style.visibility = input.value.trim() ? 'visible' : 'hidden';
}


document.getElementById('search-input').addEventListener('input', e => {
  const q = e.target.value.trim();
  updateSearchClearVisibility();
  clearTimeout(_searchTimer);
  if (!q) { closeSearch(); return; }
  _searchTimer = setTimeout(() => runSearch(q), 300);
});

document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSearch();
});

document.getElementById('search-clear').addEventListener('click', () => {
  document.getElementById('search-input').value = '';
  updateSearchClearVisibility();
  closeSearch();
});

// Global keyboard shortcuts
document.addEventListener('keydown', e => {
  // Cmd/Ctrl+K or / to focus search
  const isSearchShortcut = (e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
    (e.key === '/' && !e.target.closest('input, textarea'));
  if (isSearchShortcut) {
    e.preventDefault();
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  }
  // Escape to close any open overlay
  if (e.key === 'Escape') {
    closeSearch();
  }
});

async function runSearch(q) {
  const panel = document.getElementById('search-results-panel');
  const overlay = document.getElementById('search-overlay');
  const body = document.getElementById('search-results-body');
  const countEl = document.getElementById('search-result-count');

  panel.classList.remove('hidden');
  overlay.classList.remove('hidden');
  body.innerHTML = '<div class="search-empty">搜索中…</div>';

  try {
    const data = await fetchWithTimeout(`/api/search?q=${encodeURIComponent(q)}`).then(r => r.json());
    const results = data.results || [];
    countEl.textContent = results.length > 0
      ? t('search.found', {n: results.length})
      : t('search.not_found', {q});

    if (results.length === 0) {
      body.innerHTML = `
        <div class="search-empty">
          <div style="font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:var(--text-muted);margin-bottom:10px">No result</div>
          <div>${escHtml(t('search.not_found', {q}))}</div>
          <div style="margin-top:6px;font-size:11px">${escHtml(t('search.no_result_hint'))}</div>
        </div>`;
      return;
    }

    body.innerHTML = results.map(r => renderSearchResult(r)).join('');

    // Highlight matched nodes in the graph
    const matchIds = new Set(results.map(r => r.id));
    applySearchHighlight(matchIds);

    // 绑定点击事件
    body.querySelectorAll('.search-result-item').forEach(el => {
      el.addEventListener('click', () => {
        const type = el.dataset.type;
        const id = el.dataset.id;
        closeSearch();
        navigateToNode(type, id);
      });
    });
  } catch (e) {
    body.innerHTML = `<div class="search-empty">${escHtml(t('search.error', {msg: e.message}))}</div>`;
  }
}

function renderSearchResult(r) {
  const typeLabel = t('type.' + r.type) || r.type;
  const badgeClass = { area: 'badge-area', direction: 'badge-direction', topic: 'badge-topic' }[r.type] || '';

  const displayName = (getLang() === 'en' && r.name_en) ? r.name_en : r.name;
  const displayNameAlt = (getLang() === 'en') ? r.name : (r.name_en || '');
  let path = '';
  if (r.type === 'topic') {
    const aName = (getLang() === 'en' && r.area_name_en) ? r.area_name_en : r.area_name;
    const dName = (getLang() === 'en' && r.direction_name_en) ? r.direction_name_en : r.direction_name;
    path = `${escHtml(aName)} › ${escHtml(dName)}`;
  } else if (r.type === 'direction') {
    path = escHtml((getLang() === 'en' && r.area_name_en) ? r.area_name_en : r.area_name);
  }

  const tags = (r.tags || []).slice(0, 4).map(t =>
    `<span class="search-tag">${escHtml(t)}</span>`
  ).join('');

  const dotColor = r.status === 'mastered' ? '#30D158'
    : r.status === 'learning' ? '#FF9F0A'
    : (r.tested ? '#FF453A' : '#8b949e');
  const statusDot = r.status
    ? `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${dotColor};margin-right:4px"></span>`
    : '';

  // Difficulty badge for topics (helps new users gauge complexity)
  let diffBadge = '';
  if (r.type === 'topic' && r.difficulty) {
    const diff = r.difficulty;
    if (diff >= 4) {
      diffBadge = `<span class="search-diff-badge diff-hard">${getLang() === 'en' ? 'Adv' : '进阶'}</span>`;
    } else if (diff <= 2) {
      diffBadge = `<span class="search-diff-badge diff-easy">${getLang() === 'en' ? 'Intro' : '入门'}</span>`;
    }
  }

  return `
    <div class="search-result-item" data-type="${escHtml(r.type)}" data-id="${escHtml(r.id)}">
      <span class="search-result-type-badge ${badgeClass}">${escHtml(typeLabel)}</span>
      <div class="search-result-content">
        <div class="search-result-name">${statusDot}${escHtml(displayName)}${diffBadge}${displayNameAlt ? ` <span style="color:var(--text-muted);font-weight:400;font-size:11px">${escHtml(displayNameAlt)}</span>` : ''}</div>
        ${path ? `<div class="search-result-path">${path}</div>` : ''}
        ${r.description ? `<div class="search-result-desc">${escHtml(r.description)}</div>` : ''}
        ${tags ? `<div class="search-result-tags">${tags}</div>` : ''}
      </div>
    </div>`;
}

function navigateToNode(type, id) {
  switchToTab('graph');
  if (!State.graphData) return;

  // 搜索导航需要领域视图的逐层展开
  if (State.graphView !== 'domain') {
    State.graphView = 'domain';
    const gb = document.getElementById('btn-global-view');
    const db = document.getElementById('btn-domain-view');
    if (gb) gb.classList.remove('active');
    if (db) db.classList.add('active');
  }
  // Show back button whenever we're in domain view
  const _backBtn = document.getElementById('crumb-back-global');
  if (_backBtn) _backBtn.style.display = '';

  const STEP = 360; // wait for graph layout/zoom transition before restoring focus

  if (type === 'area') {
    renderAreaLevel();
    setTimeout(() => {
      const node = State.graphData.nodes.find(n => n.id === id && n.type === 'area');
      if (node) showNodeInfo(node);
    }, STEP);
  } else if (type === 'direction') {
    const dirNode = State.graphData.nodes.find(n => n.id === id && n.type === 'direction');
    if (!dirNode) return;
    renderAreaLevel();
    setTimeout(() => {
      expandArea(dirNode.area);
      setTimeout(() => {
        const node = State.graphData.nodes.find(n => n.id === id);
        if (node) showNodeInfo(node);
      }, STEP);
    }, STEP);
  } else if (type === 'topic') {
    const topicNode = State.graphData.nodes.find(n => n.id === id && n.type === 'topic');
    if (!topicNode) return;
    const dirNode = State.graphData.nodes.find(n => n.id === topicNode.direction && n.type === 'direction');
    if (!dirNode) return;
    renderAreaLevel();
    setTimeout(() => {
      expandArea(dirNode.area);
      setTimeout(() => {
        expandDirection(dirNode.id);
        setTimeout(() => {
          const node = State.graphData.nodes.find(n => n.id === id);
          if (node) showNodeInfo(node);
        }, STEP);
      }, STEP);
    }, STEP);
  }
}

function closeSearch() {
  document.getElementById('search-results-panel').classList.add('hidden');
  document.getElementById('search-overlay').classList.add('hidden');
  document.getElementById('search-input').value = '';
  clearSearchHighlight();
}

// ============================================================
// 课程探索（Phase 1: 生成 CLI 提示词）
// ============================================================

async function openCourseExplore(nodeType, nodeId, nodeName) {
  const modal = document.getElementById('course-modal');
  const overlay = document.getElementById('course-modal-overlay');
  const titleEl = document.getElementById('course-modal-title');
  const promptEl = document.getElementById('course-prompt-text');

  titleEl.textContent = `课程探索 · ${nodeName}`;
  promptEl.textContent = '加载中…';
  modal.classList.remove('hidden');
  overlay.classList.remove('hidden');

  try {
    const data = await fetchWithTimeout(`/api/course-prompt/${nodeType}/${nodeId}`).then(r => r.json());
    promptEl.textContent = data.prompt || '无法生成提示词';
  } catch (e) {
    promptEl.textContent = `加载失败: ${e.message}`;
  }
}

function closeCourseModal() {
  document.getElementById('course-modal').classList.add('hidden');
  document.getElementById('course-modal-overlay').classList.add('hidden');
  document.getElementById('copy-success').classList.add('hidden');
}

function copyPrompt() {
  const text = document.getElementById('course-prompt-text').textContent;
  navigator.clipboard.writeText(text).then(() => {
    const el = document.getElementById('copy-success');
    el.classList.remove('hidden');
    setTimeout(() => el.classList.add('hidden'), 2000);
  });
}

// 注入课程探索按钮到节点信息面板
function appendCourseExploreBtn(container, nodeType, nodeId, nodeName) {
  const btn = document.createElement('button');
  btn.className = 'btn-course-explore';
  btn.textContent = '🎓 生成课程搜索提示词';
  btn.onclick = () => openCourseExplore(nodeType, nodeId, nodeName);
  container.appendChild(btn);
}

// ============================================================
// 启动
// ============================================================

// ============================================================
// 日/夜主题切换
// ============================================================

function updateThemeToggleLabel(theme) {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.textContent = theme === 'light' ? '🌙' : '☀';
  btn.title = t('theme.toggle');
}

(function initTheme() {
  const saved = localStorage.getItem('kg_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeToggleLabel(saved);
})();

document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('kg_theme', next);
  updateThemeToggleLabel(next);
  // 重绘图谱以更新颜色
  if (State.graphView === 'global') renderGlobalView();
  else if (State.graphLevel === 'area') renderAreaLevel();
});

updateSearchClearVisibility();
init();
