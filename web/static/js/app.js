/* ============================================================
   AI 知识图谱系统 v2 - 主应用脚本
   三级知识图谱 + 全局诊断 + 方向测评 + D3 雷达图
   ============================================================ */

'use strict';

// ============================================================
// 全局状态
// ============================================================

const State = {
  graphLevel: 'area',        // 'area' | 'direction' | 'topic'
  graphView: 'global',       // 'global' | 'domain'
  expandedArea: null,        // 当前展开的 area id
  expandedDirection: null,   // 当前展开的 direction id
  graphData: null,           // 完整图谱数据
  directions: [],            // 所有方向数据
  areas: [],                 // 所有大类数据

  // 测评
  quizMode: null,            // 'diagnostic' | 'direction'
  quizQuestions: [],         // 当前题目列表
  quizIndex: 0,              // 当前题目索引
  quizAnswers: [],           // 已提交的答案记录
  currentDirectionId: null,  // 当前方向测评的 direction id
  answeredCurrent: false,    // 当前题目是否已作答
};

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
  if (s === 'unknown') return tested ? '需要加强' : '未测评';
  return { mastered: '已掌握', learning: '学习中' }[s] || '未测评';
}

function getStatusClass(s, tested = false) {
  if (s === 'unknown') return tested ? 'status-needs-work' : 'status-unknown';
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
    const [graphResp, dirsResp, areasResp] = await Promise.all([
      fetch('/api/graph').then(r => r.json()),
      fetch('/api/directions').then(r => r.json()),
      fetch('/api/areas').then(r => r.json())
    ]);
    State.graphData = graphResp;
    State.directions = dirsResp;
    State.areas = areasResp;

    requestAnimationFrame(() => initGraph());
    renderDirectionsGrid();
    const progress = await updateTopbarBadge();
    if (progress && progress.mastered_percent === 0 && !localStorage.getItem('kg_welcome_dismissed')) {
      show('welcome-overlay');
    }
  } catch (e) {
    console.error('Init error:', e);
  }
}

async function updateTopbarBadge() {
  try {
    const p = await fetch('/api/progress').then(r => r.json());
    document.getElementById('topbar-badge').innerHTML =
      `掌握 <strong>${p.mastered_percent}%</strong> · ${p.mastered}/${p.total}`;
    return p;
  } catch (e) {}
}

async function refreshGraphData() {
  try {
    const graphResp = await fetch('/api/graph').then(r => r.json());
    State.graphData = graphResp;
    // 重新渲染当前层级
    if (State.graphLevel === 'area') renderAreaLevel();
    else if (State.graphLevel === 'direction' && State.expandedArea) expandArea(State.expandedArea);
    else if (State.graphLevel === 'topic' && State.expandedDirection) expandDirection(State.expandedDirection);
  } catch (e) {}
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

function welcomeGo(tab) {
  localStorage.setItem('kg_welcome_dismissed', '1');
  hide('welcome-overlay');
  if (tab === 'quiz') {
    switchToTab('quiz');
    setTimeout(startDiagnostic, 100);
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
    .text(d => d.name);

  fitGraph();
}

function expandArea(areaId) {
  State.graphLevel = 'direction';
  State.expandedArea = areaId;
  State.expandedDirection = null;
  const areaNode = State.graphData.nodes.find(n => n.id === areaId);
  updateLayerDots(2);
  updateBreadcrumb([{ id: areaId, name: areaNode?.name || areaId, onclick: `resetToAreas()` }]);
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
    .text(d => d.type === 'area' ? (d.icon || d.name) : d.name);

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
    { id: areaId, name: areaNode?.name || areaId, onclick: `resetToAreas()` },
    { id: dirId, name: dirNode?.name || dirId, onclick: `expandArea('${areaId}')` }
  ]);
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
    .attr('r', d => d.type === 'direction' ? DIR_R : TOPIC_R)
    .attr('fill', d => {
      if (d.type === 'direction') return masteryColor(d.color, d.mastered, d.total);
      const s = d.status || 'unknown';
      if (s === 'mastered') return '#3fb950';
      if (s === 'learning') return '#d29922';
      if (d.tested) return '#f85149';
      return '#4A4A6A'; // 未测评：中性深色
    })
    .attr('fill-opacity', d => d.type === 'direction' ? 0.9 : 0.85)
    .attr('stroke', d => {
      if (d.type === 'direction') return d.color;
      const s = d.status || 'unknown';
      if (s === 'mastered') return '#3fb950';
      if (s === 'learning') return '#d29922';
      if (d.tested) return '#f85149';
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
      const n = d.name || '';
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
    '<div class="node-info-empty">点击节点查看详情<br><br><strong>全局总览</strong>：看 5 大域 + 15 方向全貌<br><strong>领域浏览</strong>：逐层展开到具体主题</div>';
  if (State.graphView === 'global') {
    renderGlobalView();
  } else {
    renderAreaLevel();
  }
}

function showNodeInfo(d) {
  const panel = document.getElementById('node-info-panel');
  const typeLabel = { area: '大类', direction: '方向', topic: '主题' }[d.type] || d.type;
  let html = `
    <div class="node-info-card">
      <div class="node-info-type">${typeLabel}</div>
      <div class="node-info-name">${d.name || ''}</div>
      <div class="node-info-name-en">${d.name_en || ''}</div>
      <div class="node-info-desc">${d.description || ''}</div>
  `;

  if (d.type === 'topic') {
    const status = d.status || 'unknown';
    html += `<span class="node-status-badge ${getStatusClass(status, d.tested)}">${getStatusLabel(status, d.tested)}</span>`;
    html += `<br><button class="node-action-btn" onclick="startTopicQuiz('${d.id}')">测评本方向（12题）</button>`;
  } else if (d.type === 'direction') {
    const totalTopics = d.topic_count || d.total || 0;
    html += `<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">包含 ${totalTopics} 个主题</div>`;
    html += `<button class="node-action-btn" onclick="startDirectionQuizFromGraph('${d.id}')">测评此方向（12题）→</button>`;
    if (State.graphView === 'global') {
      html += `<button class="node-action-btn node-expand-btn" onclick="setGraphView('domain'); setTimeout(()=>expandDirection('${d.id}'),50)">查看主题图</button>`;
    } else {
      html += `<button class="node-action-btn node-expand-btn" onclick="expandDirection('${d.id}')">查看主题图</button>`;
    }
  } else if (d.type === 'area') {
    const totalDirs = d.direction_count || 3;
    html += `<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">包含 ${totalDirs} 个方向</div>`;
    if (State.graphView === 'global') {
      html += `<button class="node-action-btn node-expand-btn" onclick="setGraphView('domain'); setTimeout(()=>expandArea('${d.id}'),50)">浏览此领域 →</button>`;
    } else {
      html += `<button class="node-action-btn node-expand-btn" onclick="expandArea('${d.id}')">展开方向图</button>`;
    }
  }

  html += '</div>';
  panel.innerHTML = html;

  // 追加课程探索按钮
  const escapedName = d.name.replace(/'/g, "\\'");
  const courseBtn = document.createElement('button');
  courseBtn.className = 'btn-course-explore';
  courseBtn.textContent = '🎓 用 AI Agent 搜索相关课程';
  courseBtn.onclick = () => openCourseExplore(d.type, d.id, d.name);
  panel.querySelector('.node-info-card').appendChild(courseBtn);
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

function updateLayerDots(level) {
  for (let i = 1; i <= 3; i++) {
    const dot = document.getElementById(`ld-${i}`);
    if (dot) dot.classList.toggle('active', i <= level);
  }
}

function updateBreadcrumb(crumbs) {
  const bc = document.getElementById('graph-breadcrumb');
  let html = `<span class="crumb" onclick="resetToAreas()">全部大类</span>`;
  crumbs.forEach(c => {
    html += `<span class="crumb-sep">›</span>`;
    html += `<span class="crumb" onclick="${c.onclick}">${c.name}</span>`;
  });
  bc.innerHTML = html;
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
  State.graphView = 'global';
  updateLayerDots(1);
  updateBreadcrumb([]);
  clearGraph();
  if (simulation) { simulation.stop(); simulation = null; }

  const W = +svg.attr('width');
  const H = +svg.attr('height');
  if (!W || !H) return;

  const cx = W / 2, cy = H / 2;
  const allAreas = State.graphData.nodes.filter(n => n.type === 'area');
  const allDirs  = State.graphData.nodes.filter(n => n.type === 'direction');

  const n = allAreas.length;
  const areaOrbit = Math.min(W, H) * 0.27;
  const dirOrbit  = Math.min(areaOrbit * 0.44, 88);
  const territoryR = dirOrbit + DIR_R + 16;

  // 计算 Area 固定位置
  const areaPos = {};
  const areaNodes = allAreas.map((a, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const x = cx + areaOrbit * Math.cos(angle);
    const y = cy + areaOrbit * Math.sin(angle);
    areaPos[a.id] = { x, y, angle };
    return { ...a, x, y, _angle: angle };
  });

  // 计算 Direction 固定位置（围绕所属 Area 展开）
  const dirNodes = allDirs.map(d => {
    const ap = areaPos[d.area];
    if (!ap) return { ...d, x: cx, y: cy };
    const sameDirs = allDirs.filter(x => x.area === d.area);
    const idx   = sameDirs.findIndex(x => x.id === d.id);
    const total = sameDirs.length;
    const arc   = total === 1 ? 0 : Math.min(Math.PI * 0.65, (total - 1) * 0.52);
    const step  = total > 1 ? arc / (total - 1) : 0;
    const dAngle = (ap.angle - arc / 2) + idx * step;
    return { ...d, x: ap.x + dirOrbit * Math.cos(dAngle), y: ap.y + dirOrbit * Math.sin(dAngle) };
  });

  // 领域"势力圈"（最底层）
  const terG = g.append('g').attr('class', 'g-territory');
  areaNodes.forEach(a => {
    terG.append('circle')
      .attr('cx', a.x).attr('cy', a.y).attr('r', territoryR)
      .attr('fill', a.color).attr('fill-opacity', 0.055)
      .attr('stroke', a.color).attr('stroke-width', 1.2)
      .attr('stroke-opacity', 0.18).attr('stroke-dasharray', '5,4');
  });

  // 连线（Area → Direction）
  const linkG = g.append('g').attr('class', 'g-links');
  dirNodes.forEach(d => {
    const ap = areaPos[d.area];
    if (!ap) return;
    linkG.append('line')
      .attr('x1', ap.x).attr('y1', ap.y)
      .attr('x2', d.x).attr('y2', d.y)
      .attr('stroke', 'var(--border)').attr('stroke-width', 1)
      .attr('stroke-opacity', 0.55);
  });

  // Direction 节点（先渲染，在 Area 节点之下）
  const dirG = g.append('g').attr('class', 'g-dirs');
  const dirNodeG = dirG.selectAll('.node-dir')
    .data(dirNodes).join('g')
    .attr('class', 'node-g node-dir')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('cursor', 'pointer')
    .on('click', (e, d) => { e.stopPropagation(); showNodeInfo(d); });

  dirNodeG.append('circle')
    .attr('r', DIR_R)
    .attr('fill', d => masteryColor(d.color, d.mastered, d.total))
    .attr('fill-opacity', 0.8)
    .attr('stroke', d => d.color).attr('stroke-width', 1.5)
    .attr('class', 'node-circle');

  dirNodeG.append('path')
    .attr('d', d => makeRingPath(d, DIR_R))
    .attr('fill', '#3fb950').attr('opacity', 0.9);

  dirNodeG.append('text').attr('dy', '4')
    .attr('class', 'node-label').style('font-size', '9px')
    .text(d => { const nm = d.name || ''; return nm.length > 7 ? nm.slice(0,7)+'…' : nm; });

  // Area 节点（后渲染，在最上层）
  const areaG = g.append('g').attr('class', 'g-areas');
  const areaNodeG = areaG.selectAll('.node-area')
    .data(areaNodes).join('g')
    .attr('class', 'node-g node-area')
    .attr('transform', d => `translate(${d.x},${d.y})`)
    .style('cursor', 'pointer')
    .on('click', (e, d) => { e.stopPropagation(); showNodeInfo(d); });

  // Area 外圈轨道（视觉装饰）
  areaNodeG.append('circle')
    .attr('r', AREA_R + 8)
    .attr('fill', 'none')
    .attr('stroke', d => d.color).attr('stroke-width', 1)
    .attr('stroke-opacity', 0.25).attr('stroke-dasharray', '3,3');

  areaNodeG.append('circle')
    .attr('r', AREA_R)
    .attr('fill', d => masteryColor(d.color, d.mastered, d.total))
    .attr('fill-opacity', 0.92)
    .attr('stroke', d => d.color).attr('stroke-width', 2.5)
    .attr('class', 'node-circle');

  areaNodeG.append('path')
    .attr('d', d => makeRingPath(d, AREA_R + 2))
    .attr('fill', '#3fb950').attr('opacity', 0.9);

  areaNodeG.append('text').attr('dy', '-6')
    .attr('class', 'node-label node-label-area').style('font-size', '18px')
    .text(d => d.icon || '');

  areaNodeG.append('text').attr('dy', '14')
    .attr('class', 'node-label node-label-area')
    .text(d => d.name);

  fitGraph();
}

// 切换全局/领域视图
function setGraphView(view) {
  State.graphView = view;
  const gb = document.getElementById('btn-global-view');
  const db = document.getElementById('btn-domain-view');
  if (gb) gb.classList.toggle('active', view === 'global');
  if (db) db.classList.toggle('active', view === 'domain');

  if (view === 'global') {
    renderGlobalView();
  } else {
    State.expandedArea = null;
    State.expandedDirection = null;
    renderAreaLevel();
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
    const pctColor = pct >= 80 ? '#3fb950' : pct >= 40 ? '#d29922' : color;
    return `
      <div class="direction-card" onclick="startDirectionQuiz('${d.id}')">
        <div class="direction-card-top">
          <div class="direction-color-dot" style="background:${color}"></div>
          <div class="direction-card-name">${d.name}</div>
          ${pct > 0 ? `<span class="dir-card-pct" style="color:${pctColor}">${pct}%</span>` : ''}
        </div>
        <div class="direction-card-meta">${m.total} 个主题 · ${m.total * 3} 道题</div>
        ${pct > 0 ? `<div class="dir-card-bar"><div class="dir-card-bar-fill" style="width:${pct}%;background:${pctColor}"></div></div>` : ''}
      </div>
    `;
  }).join('');
}

// 全局诊断
document.getElementById('btn-start-diagnostic').addEventListener('click', startDiagnostic);

async function startDiagnostic() {
  State.quizMode = 'diagnostic';
  hide('quiz-home-view');
  hide('quiz-result-view');
  hide('direction-result-view');

  try {
    const data = await fetch('/api/diagnostic').then(r => r.json());
    State.quizQuestions = data.questions || [];
    State.quizIndex = 0;
    State.quizAnswers = [];
    State.answeredCurrent = false;

    document.getElementById('quiz-flow-title').textContent = '全局诊断';
    document.getElementById('quiz-flow-subtitle').textContent =
      `${data.total} 道题 · 覆盖全部 15 个方向`;

    show('quiz-flow-view');
    renderCurrentQuestion();
  } catch (e) {
    alert('加载题目失败: ' + e.message);
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
    const data = await fetch(`/api/direction/${dirId}/quiz`).then(r => r.json());
    State.quizQuestions = data.questions || [];
    State.quizIndex = 0;
    State.quizAnswers = [];
    State.answeredCurrent = false;

    document.getElementById('quiz-flow-title').textContent = dirName;
    document.getElementById('quiz-flow-subtitle').textContent =
      `${data.total_questions} 道题 · ${data.topics?.length || 4} 个主题`;

    show('quiz-flow-view');
    renderCurrentQuestion();
  } catch (e) {
    alert('加载题目失败: ' + e.message);
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
      <div class="question-text">${q.question}</div>
      <div class="options-list">
        ${(q.options || []).map((opt, i) => `
          <button class="option-btn" data-idx="${i}" onclick="selectOption(${i})">
            <span class="option-letter">${opt.letter}.</span>
            <span>${opt.text}</span>
          </button>
        `).join('')}
      </div>
      <div class="explanation-box hidden" id="explanation-box">
        ${q.explanation || ''}
      </div>
    </div>
  `;

  State.answeredCurrent = false;
  const nextBtn = document.getElementById('btn-next-question');
  nextBtn.textContent = State.quizIndex === total - 1 ? '提交结果 ✓' : '下一题 →';
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
    const res = await fetch('/api/answer-check', {
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
    // 用后端返回的解析覆盖前端（若有）
    if (res.explanation) {
      const expBox = document.getElementById('explanation-box');
      if (expBox) expBox.textContent = res.explanation;
    }
  } catch (e) {
    console.warn('answer-check failed, falling back to client', e);
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
    const result = await fetch('/api/diagnostic/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: State.quizAnswers })
    }).then(r => r.json());

    renderDiagnosticResult(result);
    show('quiz-result-view');
  } catch (e) {
    alert('提交失败: ' + e.message);
    show('quiz-home-view');
  }
}

async function submitDirectionQuiz() {
  try {
    const result = await fetch(`/api/direction/${State.currentDirectionId}/quiz/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: State.quizAnswers })
    }).then(r => r.json());

    renderDirectionResult(result);
    show('direction-result-view');
  } catch (e) {
    alert('提交失败: ' + e.message);
    show('quiz-home-view');
  }
}

function renderDiagnosticResult(result) {
  const pct = result.total_questions > 0
    ? Math.round(result.total_correct / result.total_questions * 100) : 0;

  document.getElementById('result-score-big').textContent = pct + '%';
  document.getElementById('result-score-label').textContent =
    `正确 ${result.total_correct} / ${result.total_questions} 题`;

  // 各方向得分列表
  const scoresList = document.getElementById('direction-scores-list');
  const scores = Object.entries(result.direction_scores || {})
    .sort((a, b) => a[1].percent - b[1].percent);

  scoresList.innerHTML = scores.map(([did, info]) => {
    const color = scoreColor(info.percent);
    return `
      <div class="score-row">
        <span class="score-name" title="${info.name}">${info.name}</span>
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
      `<span class="weak-tag" onclick="startDirectionQuiz('${w.direction_id}')">${w.name} (${w.percent}%)</span>`
    ).join('');
  }
}

function renderDirectionResult(result) {
  const dir = State.directions.find(d => d.id === result.direction_id);
  document.getElementById('dir-result-title').textContent = (dir?.name || result.direction_id) + ' 测评结果';
  document.getElementById('dir-result-score').textContent = result.score_percent + '%';
  document.getElementById('dir-result-label').textContent =
    `正确 ${result.total_correct} / ${result.total_questions} 题`;

  const topicResults = document.getElementById('dir-topic-results');
  topicResults.innerHTML = (result.topic_results || []).map(t => {
    const color = scoreColor(t.percent);
    const wasTested = (t.total || 0) > 0; // 本次测评过的 topic，unknown 显示"需要加强"
    const statusLabel = getStatusLabel(t.new_status, wasTested);
    return `
      <div class="score-row">
        <span class="score-name" title="${t.topic_name}">${t.topic_name}</span>
        <div class="score-bar-wrap">
          <div class="score-bar-fill" style="width:${t.percent}%;background:${color}"></div>
        </div>
        <span class="score-pct" style="color:${color}">${t.percent}%</span>
        <span class="node-status-badge ${getStatusClass(t.new_status, wasTested)}" style="font-size:10px;padding:2px 8px">${statusLabel}</span>
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
  switchToTab('graph');
  if (dirId) setTimeout(() => expandDirection(dirId), 150);
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
    const p = await fetch('/api/progress').then(r => r.json());

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
            <span class="dir-bar-name" title="${dData.name}">${dData.name}</span>
            <div class="dir-bar-track">
              <div class="dir-bar-fill" style="width:${dData.percent}%;background:${fillColor}"></div>
            </div>
          </div>
        `;
      }).join('');

      return `
        <div class="area-progress-item">
          <div class="area-progress-header">
            <span class="area-icon">${aData.icon || ''}</span>
            <span class="area-name">${aData.name}</span>
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

async function runSearch(q) {
  const panel = document.getElementById('search-results-panel');
  const overlay = document.getElementById('search-overlay');
  const body = document.getElementById('search-results-body');
  const countEl = document.getElementById('search-result-count');

  panel.classList.remove('hidden');
  overlay.classList.remove('hidden');
  body.innerHTML = '<div class="search-empty">搜索中…</div>';

  try {
    const data = await fetch(`/api/search?q=${encodeURIComponent(q)}`).then(r => r.json());
    const results = data.results || [];
    countEl.textContent = results.length > 0
      ? `找到 ${results.length} 个相关知识点`
      : `未找到与「${q}」相关的结果`;

    if (results.length === 0) {
      body.innerHTML = `
        <div class="search-empty">
          <div style="font-size:28px;margin-bottom:10px">🔍</div>
          <div>未找到「${q}」相关的知识点</div>
          <div style="margin-top:6px;font-size:11px">试试：RAG、工程实践、fine-tuning、Agent…</div>
        </div>`;
      return;
    }

    body.innerHTML = results.map(r => renderSearchResult(r)).join('');

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
    body.innerHTML = `<div class="search-empty">搜索失败: ${e.message}</div>`;
  }
}

function renderSearchResult(r) {
  const typeLabel = { area: '大类', direction: '方向', topic: '主题' }[r.type] || r.type;
  const badgeClass = { area: 'badge-area', direction: 'badge-direction', topic: 'badge-topic' }[r.type];

  let path = '';
  if (r.type === 'topic') {
    path = `${r.area_name} › ${r.direction_name}`;
  } else if (r.type === 'direction') {
    path = r.area_name;
  }

  const tags = (r.tags || []).slice(0, 4).map(t =>
    `<span class="search-tag">${t}</span>`
  ).join('');

  const dotColor = r.status === 'mastered' ? '#3fb950'
    : r.status === 'learning' ? '#d29922'
    : (r.tested ? '#f85149' : '#8b949e');
  const statusDot = r.status
    ? `<span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${dotColor};margin-right:4px"></span>`
    : '';

  return `
    <div class="search-result-item" data-type="${r.type}" data-id="${r.id}">
      <span class="search-result-type-badge ${badgeClass}">${typeLabel}</span>
      <div class="search-result-content">
        <div class="search-result-name">${statusDot}${r.name}${r.name_en ? ` <span style="color:var(--text-muted);font-weight:400;font-size:11px">${r.name_en}</span>` : ''}</div>
        ${path ? `<div class="search-result-path">${path}</div>` : ''}
        ${r.description ? `<div class="search-result-desc">${r.description}</div>` : ''}
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

  const STEP = 120;

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
    const data = await fetch(`/api/course-prompt/${nodeType}/${nodeId}`).then(r => r.json());
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
  btn.textContent = '🎓 用 AI Agent 搜索相关课程';
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
