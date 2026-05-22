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
    if (typeof updateTopbarBadge    === 'function') updateTopbarBadge();
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
  graphView: 'global',       // 'global' | 'domain' | 'path'
  expandedArea: null,        // 当前展开的 area id
  expandedDirection: null,   // 当前展开的 direction id
  graphData: null,           // 完整图谱数据
  directions: [],            // 所有方向数据
  areas: [],                 // 所有大类数据
  activePath: 'apply',       // 'apply' | 'understand'
  nodePositions: {},         // topicId → {x, y}，全局视图坐标
  activePathStep: null,      // 当前高亮的路径步骤 id
  filterArea: null,          // 图例点击筛选：null = 全部显示
  searchHighlightIds: null,  // 搜索高亮：null = 无, Set<id> = 高亮集合

  // 测评
  quizMode: null,            // 'diagnostic' | 'direction'
  quizQuestions: [],         // 当前题目列表
  quizIndex: 0,              // 当前题目索引
  quizAnswers: [],           // 已提交的答案记录
  currentDirectionId: null,  // 当前方向测评的 direction id
  answeredCurrent: false,    // 当前题目是否已作答
};

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
// Tab 切换
// ============================================================

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById(`panel-${btn.dataset.tab}`).classList.add('active');
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
  if (pct >= 80) return '#3fb950';
  if (pct >= 60) return '#d29922';
  return '#f85149';
}

function masteryColor(baseColor, mastered, total) {
  if (!total || !mastered) return baseColor;
  const pct = Math.min(mastered / total, 1);
  return d3.interpolateRgb(baseColor, '#3fb950')(pct * 0.55);
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
    await updateTopbarBadge();
  } catch (e) {
    console.error('Init error:', e);
  }
}

async function updateTopbarBadge() {
  try {
    const p = await fetchWithTimeout('/api/progress').then(r => r.json());
    const badge = document.getElementById('topbar-badge');
    badge.textContent = '';
    badge.append(t('badge.mastered') + ' ');
    const strong = document.createElement('strong');
    strong.textContent = p.mastered_percent + '%';
    badge.append(strong, ` · ${p.mastered}/${p.total}`);
    return p;
  } catch (e) {
    console.warn('Progress badge update failed:', e);
  }
}

async function refreshGraphData() {
  try {
    const graphResp = await fetchWithTimeout('/api/graph').then(r => r.json());
    State.graphData = graphResp;
    // 重新渲染当前层级
    if (State.graphLevel === 'area') renderAreaLevel();
    else if (State.graphLevel === 'direction' && State.expandedArea) expandArea(State.expandedArea);
    else if (State.graphLevel === 'topic' && State.expandedDirection) expandDirection(State.expandedDirection);
  } catch (e) {
    console.warn('Graph data refresh failed:', e);
  }
}

function switchToTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
  document.getElementById(`panel-${tabName}`).classList.add('active');
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
    .on('zoom', e => g.attr('transform', e.transform));

  svg.call(zoomBehavior);
  g = svg.append('g');

  renderGlobalView();
  // 默认侧栏显示路径导览（图谱保持全局总览）
  setGraphView('path');

  const ro = new ResizeObserver(entries => {
    const e = entries[0];
    const nW = e.contentRect.width, nH = e.contentRect.height;
    if (nW > 0 && nH > 0) {
      svg.attr('width', nW).attr('height', nH);
      if (State.graphView === 'global') {
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
  if (simulation) simulation.stop();
  g.selectAll('*').remove();
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
    .style('cursor', 'pointer')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .on('click', (e, d) => { e.stopPropagation(); showNodeInfo(d); expandArea(d.id); });

  node.append('circle')
    .attr('r', AREA_R)
    .attr('fill', d => masteryColor(d.color, d.mastered, d.total))
    .attr('fill-opacity', 0.9)
    .attr('stroke', d => d.color)
    .attr('stroke-width', 2.5)
    .attr('class', 'node-circle');

  node.append('path')
    .attr('d', d => makeRingPath(d, AREA_R))
    .attr('fill', '#3fb950').attr('opacity', 0.9);

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
    .style('cursor', d => d.type === 'direction' ? 'pointer' : 'default')
    .on('click', (e, d) => {
      e.stopPropagation();
      showNodeInfo(d);
      if (d.type === 'direction') expandDirection(d.id);
    });

  node.append('circle')
    .attr('r', d => d.type === 'area' ? AREA_R : DIR_R)
    .attr('fill', d => masteryColor(d.color, d.mastered, d.total))
    .attr('fill-opacity', d => d.type === 'area' ? 0.95 : 0.82)
    .attr('stroke', d => d.color)
    .attr('stroke-width', d => d.type === 'area' ? 2.5 : 1.5)
    .attr('class', 'node-circle');

  node.append('path')
    .attr('d', d => makeRingPath(d, d.type === 'area' ? AREA_R : DIR_R))
    .attr('fill', '#3fb950').attr('opacity', 0.9);

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

  const dirN = { ...dirNode, fx: W / 2, fy: H / 2 };
  const topicNodes = State.graphData.nodes
    .filter(n => n.type === 'topic' && n.direction === dirId)
    .map(n => ({ ...n, x: W / 2 + (Math.random() - 0.5) * 250, y: H / 2 + (Math.random() - 0.5) * 250 }));

  const allNodes = [dirN, ...topicNodes];
  const links = topicNodes.map(t => ({ source: dirId, target: t.id, type: 'dir_topic' }));

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
    .force('collision', d3.forceCollide(d => d.type === 'direction' ? DIR_R + 10 : TOPIC_R + 12))
    .on('tick', ticked);

  // 链接
  g.selectAll('.link-g')
    .data(allLinks).join('line')
    .attr('class', d => d.type === 'prereq' ? 'link-prereq' : 'link-line');

  // 节点
  const node = g.selectAll('.node-g')
    .data(allNodes).join('g')
    .attr('class', 'node-g')
    .style('cursor', 'pointer')
    .on('click', (e, d) => {
      e.stopPropagation();
      showNodeInfo(d);
    });

  node.append('circle')
    .attr('r', d => d.type === 'direction' ? DIR_R : (5 + (d.importance || 3) * 2))
    .attr('fill', d => {
      if (d.type === 'direction') return masteryColor(d.color, d.mastered, d.total);
      const s = d.status || 'unknown';
      if (s === 'mastered')   return '#3fb950';
      if (s === 'learning')   return '#d29922';
      if (s === 'needs_work') return '#f85149';
      return '#4A4A6A'; // 未测评：中性深色
    })
    .attr('fill-opacity', d => d.type === 'direction' ? 0.9 : 0.85)
    .attr('stroke', d => {
      if (d.type === 'direction') return d.color;
      const s = d.status || 'unknown';
      if (s === 'mastered')   return '#3fb950';
      if (s === 'learning')   return '#d29922';
      if (s === 'needs_work') return '#f85149';
      return d.color; // 未测评用领域色描边，保留分类感
    })
    .attr('stroke-width', d => d.type === 'direction' ? 2 : 1.5)
    .attr('class', 'node-circle');

  // 方向中心节点也显示进度环
  node.filter(d => d.type === 'direction')
    .append('path')
    .attr('d', d => makeRingPath(d, DIR_R))
    .attr('fill', '#3fb950').attr('opacity', 0.9);

  node.append('text')
    .attr('dy', d => d.type === 'direction' ? '4' : '20')
    .attr('class', 'node-label')
    .style('font-size', d => d.type === 'direction' ? '11px' : '10px')
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
  document.getElementById('node-info-panel').innerHTML =
    `<div class="node-info-empty">${t('node.empty')}<br><br><strong>${t('node.hint.click')}</strong>：${t('node.hint.click.desc')}<br><strong>${t('node.hint.dblclick')}</strong>：${t('node.hint.dblclick.desc')}<br><strong>${t('node.hint.legend')}</strong>：${t('node.hint.legend.desc')}</div>`;
  if (State.graphView === 'global') {
    renderGlobalView();
  } else {
    renderAreaLevel();
  }
}

function showNodeInfo(d) {
  const panel = document.getElementById('node-info-panel');
  if (State.graphView !== 'path') {
    panel.classList.remove('hidden');
    document.getElementById('path-panel').classList.add('hidden');
  }

  const card = document.createElement('div');
  card.className = 'node-info-card';

  // Domain color bar
  if (d.color) {
    const bar = document.createElement('div');
    bar.className = 'node-color-bar';
    bar.style.background = d.color;
    card.appendChild(bar);
  }

  // Breadcrumb path (area > direction for topics; area for directions)
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
        const sepEl = document.createElement('span');
        sepEl.className = 'crumb-sep';
        sepEl.textContent = ' › ';
        crumbEl.appendChild(sepEl);
        const dirSpan = document.createElement('span');
        dirSpan.textContent = entityName(dirNode);
        crumbEl.appendChild(dirSpan);
      }
    }
    if (crumbEl.children.length) card.appendChild(crumbEl);
  }

  // Type label
  const typeEl = document.createElement('div');
  typeEl.className = 'node-info-type';
  typeEl.textContent = t('type.' + d.type) || d.type;
  card.appendChild(typeEl);

  // Name
  const nameEl = document.createElement('div');
  nameEl.className = 'node-info-name';
  nameEl.textContent = entityName(d);
  card.appendChild(nameEl);

  // Alt name
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
    // Difficulty + Importance stars
    const diff = Math.max(1, Math.min(5, d.difficulty || 3));
    const imp  = Math.max(1, Math.min(5, d.importance || 3));
    const metaRow = document.createElement('div');
    metaRow.className = 'node-meta-row';
    const mkStars = (n) => '★'.repeat(n) + '☆'.repeat(5 - n);
    const diffEl = document.createElement('span');
    diffEl.className = 'node-meta-item';
    diffEl.innerHTML = `<span class="meta-label">${t('meta.difficulty')}</span> <span class="meta-stars">${mkStars(diff)}</span>`;
    const impEl = document.createElement('span');
    impEl.className = 'node-meta-item';
    impEl.innerHTML = `<span class="meta-label">${t('meta.importance')}</span> <span class="meta-stars">${mkStars(imp)}</span>`;
    metaRow.appendChild(diffEl);
    metaRow.appendChild(impEl);
    card.appendChild(metaRow);

    // Status badge
    const status = d.status || 'unknown';
    const badgeEl = document.createElement('span');
    badgeEl.className = `node-status-badge ${getStatusClass(status, d.tested)}`;
    badgeEl.textContent = getStatusLabel(status, d.tested);
    card.appendChild(badgeEl);

    // Tags
    if (d.tags && d.tags.length > 0) {
      const tagsEl = document.createElement('div');
      tagsEl.className = 'node-tags';
      d.tags.forEach(tag => {
        const chip = document.createElement('span');
        chip.className = 'node-tag-chip';
        chip.textContent = tag;
        tagsEl.appendChild(chip);
      });
      card.appendChild(tagsEl);
    }

    // Prerequisite + dependent chain
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
      ids.slice(0, 5).forEach(nid => {
        const n = nodeById(nid);
        const item = document.createElement('div');
        item.className = 'node-chain-item';
        item.textContent = n ? entityName(n) : nid;
        item.addEventListener('click', () => navigateToNode('topic', nid));
        sec.appendChild(item);
      });
      if (ids.length > 5) {
        const more = document.createElement('div');
        more.className = 'node-chain-more';
        more.textContent = `+${ids.length - 5}`;
        sec.appendChild(more);
      }
      card.appendChild(sec);
    };
    mkChain(prereqIds, 'node.prerequisites');
    mkChain(dependIds, 'node.leads_to');

    // Action buttons
    _addBtn(card, 'node-action-btn', 'quiz', t('btn.quiz_topic'));
    if (State.graphView === 'global') _addBtn(card, 'node-action-btn node-expand-btn', 'navigate', t('btn.locate'));

  } else if (d.type === 'direction') {
    const countEl = document.createElement('div');
    countEl.style.cssText = 'font-size:12px;color:var(--text-muted);margin-bottom:10px;';
    countEl.textContent = t('node.topics_in', {n: d.topic_count || d.total || 0});
    card.appendChild(countEl);
    _addBtn(card, 'node-action-btn', 'dir-quiz', t('btn.quiz_dir'));
    const viewAction = State.graphView === 'global' ? 'view-dir-global' : 'expand-dir';
    _addBtn(card, 'node-action-btn node-expand-btn', viewAction, t(State.graphView === 'global' ? 'btn.view_topics' : 'btn.expand_dir'));

  } else if (d.type === 'area') {
    const countEl = document.createElement('div');
    countEl.style.cssText = 'font-size:12px;color:var(--text-muted);margin-bottom:10px;';
    countEl.textContent = t('node.dirs_in', {n: d.direction_count || 3});
    card.appendChild(countEl);
    const viewAction = State.graphView === 'global' ? 'view-area-global' : 'expand-area';
    _addBtn(card, 'node-action-btn node-expand-btn', viewAction, t(State.graphView === 'global' ? 'btn.browse_area' : 'btn.expand_area'));
  }

  // Event delegation for data-action buttons
  card.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    switch (btn.dataset.action) {
      case 'quiz':             startTopicQuiz(d.id); break;
      case 'navigate':         navigateToNode('topic', d.id); break;
      case 'dir-quiz':         startDirectionQuizFromGraph(d.id); break;
      case 'view-dir-global':  setGraphView('domain'); setTimeout(() => expandDirection(d.id), 50); break;
      case 'expand-dir':       expandDirection(d.id); break;
      case 'view-area-global': setGraphView('domain'); setTimeout(() => expandArea(d.id), 50); break;
      case 'expand-area':      expandArea(d.id); break;
    }
  });

  // Course explore button
  const courseBtn = document.createElement('button');
  courseBtn.className = 'btn-course-explore';
  courseBtn.textContent = t('btn.course');
  courseBtn.addEventListener('click', () => openCourseExplore(d.type, d.id, entityName(d)));
  card.appendChild(courseBtn);

  panel.replaceChildren(card);
}

function _addBtn(parent, cls, action, label) {
  const btn = document.createElement('button');
  btn.className = cls;
  btn.dataset.action = action;
  btn.textContent = label;
  parent.appendChild(btn);
}

function startTopicQuiz(topicId) {
  switchToTab('quiz');
  const topicNode = State.graphData.nodes.find(n => n.id === topicId);
  const dirId = topicNode?.direction;
  if (dirId) startDirectionQuiz(dirId);
}

function startDirectionQuizFromGraph(dirId) {
  switchToTab('quiz');
  startDirectionQuiz(dirId);
}

// ── 图例筛选 ────────────────────────────────────────────────
function filterByArea(areaId) {
  State.filterArea = (State.filterArea === areaId) ? null : areaId;
  // Update legend item active state
  document.querySelectorAll('.legend-item[data-area]').forEach(el => {
    el.classList.toggle('legend-active', el.dataset.area === State.filterArea);
  });
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

function updateLayerDots(level) {
  // Layer dots only meaningful in domain drill-down view
  const indicator = document.querySelector('.layer-indicator');
  if (indicator) indicator.style.visibility = level > 0 ? 'visible' : 'hidden';
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

// 计算节点包围盒并自动居中缩放到视口
function fitGraph() {
  if (!svg || !g) return;
  const nodes = g.selectAll('.node-g');
  if (nodes.empty()) return;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  nodes.each(function(d) {
    if (!d || d.x == null || d.y == null) return;
    const r = d.type === 'area' ? AREA_R + 8 : d.type === 'direction' ? DIR_R + 6 : TOPIC_R + 4;
    minX = Math.min(minX, d.x - r);
    maxX = Math.max(maxX, d.x + r);
    minY = Math.min(minY, d.y - r);
    maxY = Math.max(maxY, d.y + r);
  });

  if (!isFinite(minX) || maxX <= minX || maxY <= minY) return;

  const W = +svg.attr('width');
  const H = +svg.attr('height');
  if (!W || !H) return;

  const pad = 64;
  const scale = Math.min((W - pad * 2) / (maxX - minX), (H - pad * 2) / (maxY - minY), 2.5);
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
  if (State.graphView !== 'path') State.graphView = 'global';
  State.activePathStep = null;
  updateLayerDots(0);   // hide layer indicator — global view shows all levels at once
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
  // r = 5 + importance*2 → imp3=11, imp4=13, imp5=15 (3 visible steps)
  const topicRadius = d => 5 + (d.importance || 3) * 2;

  const rawAreas  = State.graphData.nodes.filter(n => n.type === 'area');
  const rawDirs   = State.graphData.nodes.filter(n => n.type === 'direction');
  const rawTopics = State.graphData.nodes.filter(n => n.type === 'topic');

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
    .attr('fill', a => a.color).attr('fill-opacity', 0.07)
    .attr('stroke', a => a.color).attr('stroke-opacity', 0.18).attr('stroke-width', 0.8);

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

  if (prereqLinks.length > 0) {
    g.append('g').attr('class', 'g-prereq-links')
      .selectAll('line').data(prereqLinks).join('line')
      .attr('class', 'link-prereq')
      .attr('stroke-opacity', 0.30).attr('stroke-width', 0.8)
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
      if (s === 'mastered')   return '#3fb950';
      if (s === 'learning')   return '#d29922';
      if (s === 'needs_work') return '#f85149';
      return '#4A4A6A';
    })
    .attr('fill-opacity', d => {
      // Hard topics recede slightly so beginners see easier entry points first
      const diff = Math.max(1, Math.min(5, d.difficulty || 3));
      return 1.0 - (diff - 1) * 0.065; // diff 1 → 1.0, diff 5 → 0.74
    })
    .attr('stroke', d => d.color || '#607D8B').attr('stroke-width', 1.5);

  // ── Direction nodes (inner ring, domain color) ──────────────
  const dirG   = g.append('g').attr('class', 'g-dirs');
  const dirSel = dirG.selectAll('g').data(dirNodes).join('g')
    .attr('class', 'node-g node-dir')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('cursor', 'pointer')
    .on('click', (e, d) => { e.stopPropagation(); showNodeInfo(d); })
    .on('dblclick', (e, d) => { e.stopPropagation(); navigateToNode('direction', d.id); });

  dirSel.append('title').text(d => entityName(d) || '');
  dirSel.append('circle')
    .attr('r', DIR_R_G)
    .attr('fill', d => d.color).attr('fill-opacity', 0.88)
    .attr('stroke', d => d.color).attr('stroke-width', 1.8)
    .attr('class', 'node-circle');
  dirSel.append('path').attr('d', d => makeRingPath(d, DIR_R_G))
    .attr('fill', '#3fb950').attr('opacity', 0.9);
  dirSel.append('text').attr('dy', DIR_R_G + 12)
    .attr('class', 'node-label').style('font-size', '10px')
    .text(d => { const nm = entityName(d) || ''; return nm.length > 9 ? nm.slice(0, 8) + '…' : nm; });

  fitGraph();
  // Re-apply any active filter or search highlight after redraw
  if (State.filterArea) applyAreaFilter();
  if (State.searchHighlightIds) applySearchHighlight(State.searchHighlightIds);
}

// 切换全局/领域视图
function setGraphView(view) {
  State.graphView = view;
  const gb = document.getElementById('btn-global-view');
  const db = document.getElementById('btn-domain-view');
  const pb = document.getElementById('btn-path-view');
  if (gb) gb.classList.toggle('active', view === 'global');
  if (db) db.classList.toggle('active', view === 'domain');
  if (pb) pb.classList.toggle('active', view === 'path');

  if (view === 'path') {
    // 路径视图：图谱显示全局总览（若尚未渲染则先渲染），侧栏显示路径
    document.querySelector('.graph-legend').classList.add('hidden');
    document.getElementById('node-info-panel').classList.add('hidden');
    document.getElementById('path-panel').classList.remove('hidden');
    if (gb) gb.classList.remove('active');
    if (db) db.classList.remove('active');
    if (pb) pb.classList.add('active');
    updateLayerDots(0);   // hide layer dots in path view
    // 仅在没有全局仿真数据时才重新渲染
    if (!State.simulationNodes) {
      renderGlobalView();
      State.graphView = 'path';
    }
    renderPathPanel();
  } else {
    // 切回图谱视图：恢复侧栏，清除高亮
    document.querySelector('.graph-legend').classList.remove('hidden');
    document.getElementById('node-info-panel').classList.remove('hidden');
    document.getElementById('path-panel').classList.add('hidden');
    g.selectAll('\.path-highlight').remove();
    State.activePathStep = null;

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

    let dotColor = '#4A4A6A';
    let dotBorder = tn ? (tn.color || '#607D8B') : '#607D8B';
    if (status === 'mastered')        { dotColor = '#3fb950'; dotBorder = '#3fb950'; }
    else if (status === 'learning')   { dotColor = '#d29922'; dotBorder = '#d29922'; }
    else if (status === 'needs_work') { dotColor = '#f85149'; dotBorder = '#f85149'; }

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
      <div class="path-mastered-count">${escHtml(t('path.mastered_of', {n: masteredCount, total: path.steps.length}))}</div>`;
  }
}

function setActivePath(intent) {
  State.activePath = intent;
  State.activePathStep = null;
  const ab = document.getElementById('btn-apply-path');
  const ub = document.getElementById('btn-understand-path');
  if (ab) ab.classList.toggle('active', intent === 'apply');
  if (ub) ub.classList.toggle('active', intent === 'understand');
  g.selectAll('\.path-highlight').remove();
  const detailEl = document.getElementById('path-node-detail');
  if (detailEl) detailEl.innerHTML = '';
  renderPathPanel();
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
  // 更新步骤列表的 active 状态
  document.querySelectorAll('.path-step').forEach(el => {
    el.classList.toggle('active', el.dataset.id === topicId);
  });

  // 把高亮圆环附加在节点的 <g> 内部（随仿真移动）
  g.selectAll('.path-highlight').remove();
  const nodeG = g.select(`[data-id="${topicId}"]`);
  if (!nodeG.empty()) {
    nodeG.append('circle')
      .attr('class', 'path-highlight')
      .attr('r', 20)
      .attr('fill', 'none')
      .attr('stroke', '#FFD700')
      .attr('stroke-width', 2.5)
      .attr('pointer-events', 'none')
      .attr('opacity', 0)
      .transition().duration(280).attr('opacity', 1);
  }

  // 侧栏显示节点详情
  const topicNode = State.graphData?.nodes.find(n => n.id === topicId && n.type === 'topic');
  if (topicNode) showPathNodeDetail(topicNode);
}

function showPathNodeDetail(d) {
  const el = document.getElementById('path-node-detail');
  if (!el) return;
  const status = d.status || 'unknown';
  const statusClass = getStatusClass(status, d.tested);
  const statusLabel = getStatusLabel(status, d.tested);
  const displayName = entityName(d);
  const displayNameAlt = getLang() === 'en' ? (d.name || '') : (d.name_en || '');
  el.innerHTML = `
    <div class="path-detail-card">
      <div class="path-detail-name">${escHtml(displayName)}</div>
      ${displayNameAlt ? `<div class="path-detail-en">${escHtml(displayNameAlt)}</div>` : ''}
      <span class="node-status-badge ${statusClass}">${escHtml(statusLabel)}</span>
      ${d.description ? `<div class="path-detail-desc">${escHtml(d.description)}</div>` : ''}
      <button class="node-action-btn" data-action="quiz">${escHtml(t('btn.quiz_topic'))}</button>
    </div>
  `;
  el.querySelector('[data-action="quiz"]').addEventListener('click', () => startTopicQuiz(d.id));
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
    const pctColor = pct >= 80 ? '#3fb950' : pct >= 40 ? '#d29922' : color;
    return `
      <div class="direction-card" data-id="${escHtml(d.id)}">
        <div class="direction-card-top">
          <div class="direction-color-dot" style="background:${color}"></div>
          <div class="direction-card-name">${escHtml(getLang() === 'en' && d.name_en ? d.name_en : d.name)}</div>
          ${pct > 0 ? `<span class="dir-card-pct" style="color:${pctColor}">${pct}%</span>` : ''}
        </div>
        <div class="direction-card-meta">${t('dir.topics_n', {n: m.total})} · ${t('dir.questions_n', {n: m.total * 3})}</div>
        ${pct > 0 ? `<div class="dir-card-bar"><div class="dir-card-bar-fill" style="width:${pct}%;background:${pctColor}"></div></div>` : ''}
      </div>
    `;
  }).join('');
  grid.querySelectorAll('.direction-card').forEach(card => {
    card.addEventListener('click', () => startDirectionQuiz(card.dataset.id));
  });
}

// 全局诊断
document.getElementById('btn-start-diagnostic').addEventListener('click', startDiagnostic);

async function startDiagnostic() {
  State.quizMode = 'diagnostic';
  hide('quiz-home-view');
  hide('quiz-result-view');
  hide('direction-result-view');

  try {
    const data = await fetchWithTimeout('/api/diagnostic').then(r => r.json());
    State.quizQuestions = data.questions || [];
    State.quizIndex = 0;
    State.quizAnswers = [];
    State.answeredCurrent = false;

    document.getElementById('quiz-flow-title').textContent = getLang() === 'en' ? 'Global Diagnostic' : '全局诊断';
    document.getElementById('quiz-flow-subtitle').textContent =
      `${data.total} ${getLang() === 'en' ? 'questions · covering all 15 directions' : '道题 · 覆盖全部 15 个方向'}`;

    show('quiz-flow-view');
    renderCurrentQuestion();
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
    document.getElementById('quiz-flow-subtitle').textContent = getLang() === 'en'
      ? `${data.total_questions} questions · ${data.topics?.length || 4} topics`
      : `${data.total_questions} 道题 · ${data.topics?.length || 4} 个主题`;

    show('quiz-flow-view');
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
  const dirLabel = q.direction_name ? `方向：${q.direction_name}  ·  主题：${q.topic_name}` : `主题：${q.topic_name}`;
  document.getElementById('quiz-direction-label').textContent = dirLabel;

  // 题目
  const area = document.getElementById('quiz-question-area');
  area.innerHTML = `
    <div class="question-card">
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
  State.quizAnswers.push({
    question_index: State.quizIndex,
    within_topic_q_index: q.within_topic_q_index ?? State.quizIndex,
    selected_index: idx,
    is_correct: isCorrect,
    topic_id: q.topic_id,
    direction_id: q.direction_id || State.currentDirectionId
  });

  // 高亮选项
  document.querySelectorAll('.option-btn').forEach((btn, i) => {
    if (i === correctIdx) btn.classList.add('correct');
    else if (i === idx && !isCorrect) btn.classList.add('wrong');
  });

  // 显示解析
  const expBox = document.getElementById('explanation-box');
  if (expBox) expBox.classList.remove('hidden');

  // 解锁下一题
  const nextBtn = document.getElementById('btn-next-question');
  nextBtn.disabled = false;
  nextBtn.style.opacity = '1';
}

document.getElementById('btn-next-question').addEventListener('click', () => {
  if (!State.answeredCurrent) return;

  State.quizIndex++;
  if (State.quizIndex >= State.quizQuestions.length) {
    finishQuiz();
  } else {
    State.answeredCurrent = false;
    renderCurrentQuestion();
  }
});

document.getElementById('btn-quit-quiz').addEventListener('click', () => {
  hide('quiz-flow-view');
  show('quiz-home-view');
});

async function finishQuiz() {
  hide('quiz-flow-view');
  document.getElementById('quiz-progress-fill').style.width = '100%';

  if (State.quizMode === 'diagnostic') {
    await submitDiagnostic();
  } else {
    await submitDirectionQuiz();
  }

  updateTopbarBadge();
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
    weakTags.innerHTML = weakDirs.map(w =>
      `<span class="weak-tag" data-id="${escHtml(w.direction_id)}">${escHtml(w.name)} (${w.percent}%)</span>`
    ).join('');
    weakTags.querySelectorAll('.weak-tag').forEach(tag => {
      tag.addEventListener('click', () => startDirectionQuiz(tag.dataset.id));
    });
  }

  // 推荐下一步
  renderNextSteps(result);
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
      .filter(t => t.direction === dirId && (t.difficulty || 3) <= 2)
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
    const t = allTopics.find(t => t.direction === did && (t.difficulty || 3) <= 2);
    if (t) candidates.push({ topic: t, reason: '需要巩固的方向' });
  }

  // 保证有"MCP"和"Skill"入口（Agent 实践导向）
  const practiceTopics = ['mcp_protocol', 'skill_building', 'agent_basics'];
  for (const pid of practiceTopics) {
    const t = allTopics.find(t => t.id === pid);
    if (t && !candidates.find(c => c.topic.id === pid)) {
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
document.getElementById('btn-view-graph-from-diagnostic').addEventListener('click', () => {
  hide('quiz-result-view');
  show('quiz-home-view');
  switchToTab('graph');
  // 进入全局视图，让用户看到诊断后的整体掌握全景
  setTimeout(() => { setGraphView('global'); }, 200);
});
document.getElementById('btn-view-direction-graph').addEventListener('click', () => {
  const dirId = State.currentDirectionId;
  hide('direction-result-view');
  show('quiz-home-view');
  if (dirId) navigateToNode('direction', dirId);
  else switchToTab('graph');
});

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
    const label = d.axis.length > 6 ? d.axis.slice(0, 6) + '…' : d.axis;

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

async function loadProgress() {
  try {
    const p = await fetchWithTimeout('/api/progress').then(r => r.json());

    document.getElementById('stat-total').textContent = p.total;
    document.getElementById('stat-mastered').textContent = p.mastered;
    document.getElementById('stat-learning').textContent = p.learning;
    document.getElementById('stat-needs-work').textContent = p.needs_work ?? 0;
    document.getElementById('stat-unknown').textContent = p.unknown;

    // 雷达图
    drawRadar('#progress-radar-svg', p.radar_data || [], 340, 300);

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

    updateTopbarBadge();
  } catch (e) {
    console.error('Load progress error:', e);
  }
}

// ============================================================
// 搜索功能
// ============================================================

let _searchTimer = null;

document.getElementById('search-input').addEventListener('input', e => {
  const q = e.target.value.trim();
  clearTimeout(_searchTimer);
  if (!q) { closeSearch(); return; }
  _searchTimer = setTimeout(() => runSearch(q), 300);
});

document.getElementById('search-input').addEventListener('keydown', e => {
  if (e.key === 'Escape') closeSearch();
});

document.getElementById('search-clear').addEventListener('click', () => {
  document.getElementById('search-input').value = '';
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
          <div style="font-size:28px;margin-bottom:10px">🔍</div>
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

  const dotColor = r.status === 'mastered' ? '#3fb950'
    : r.status === 'learning' ? '#d29922'
    : (r.tested ? '#f85149' : '#8b949e');
  const statusDot = r.status
    ? `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${dotColor};margin-right:4px"></span>`
    : '';

  return `
    <div class="search-result-item" data-type="${escHtml(r.type)}" data-id="${escHtml(r.id)}">
      <span class="search-result-type-badge ${badgeClass}">${escHtml(typeLabel)}</span>
      <div class="search-result-content">
        <div class="search-result-name">${statusDot}${escHtml(displayName)}${displayNameAlt ? ` <span style="color:var(--text-muted);font-weight:400;font-size:11px">${escHtml(displayNameAlt)}</span>` : ''}</div>
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

  const STEP = 60;

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

(function initTheme() {
  const saved = localStorage.getItem('kg_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = saved === 'light' ? '🌙' : '☀';
})();

document.getElementById('theme-toggle').addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme') || 'dark';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('kg_theme', next);
  document.getElementById('theme-toggle').textContent = next === 'light' ? '🌙' : '☀';
  // 重绘图谱以更新颜色
  if (State.graphView === 'global') renderGlobalView();
  else if (State.graphLevel === 'area') renderAreaLevel();
});

init();
