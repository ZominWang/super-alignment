/* ============================================================
   Export — 浏览器端生成 Obsidian Vault / Anki 卡片组并下载
   依赖: JSZip (CDN), window.__DATA__
   ============================================================ */

window.Export = (function () {
  'use strict';

  var D = window.__DATA__ || {};

  // ── localStorage helpers ────────────────────────────────────
  function loadState() {
    try { return JSON.parse(localStorage.getItem('kg_status') || '{}'); }
    catch (_) { return {}; }
  }
  function getTested() {
    try { return JSON.parse(localStorage.getItem('kg_tested') || '[]'); }
    catch (_) { return []; }
  }
  function getEffectiveStatus(topicId) {
    var state = loadState();
    var tested = new Set(getTested());
    if (state.hasOwnProperty(topicId)) return state[topicId];
    if (tested.has(topicId)) return 'needs_work';
    return 'unknown';
  }

  // ── 简易 YAML 序列化（只处理我们需要的类型） ────────────────
  function yamlValue(val, indent) {
    indent = indent || '';
    if (val === null || val === undefined) return 'null';
    if (typeof val === 'boolean') return val ? 'true' : 'false';
    if (typeof val === 'number') return String(val);
    if (typeof val === 'string') {
      if (/[:\{\}\[\],&\*\?!|>'"@#`\n]/.test(val) || val === 'true' || val === 'false' || val === 'null' || val === '')
        return JSON.stringify(val);
      return val;
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return '[]';
      var simple = val.every(function (v) { return typeof v === 'string' && !/[:\{\}\[\],&\*\?!|>'"@#`\n]/.test(v) && v !== ''; });
      if (simple) return '[' + val.join(', ') + ']';
      return '\n' + val.map(function (v) { return indent + '  - ' + yamlValue(v, indent + '    '); }).join('\n');
    }
    if (typeof val === 'object') {
      var keys = Object.keys(val);
      if (keys.length === 0) return '{}';
      return '\n' + keys.map(function (k) {
        return indent + '  ' + k + ': ' + yamlValue(val[k], indent + '  ');
      }).join('\n');
    }
    return String(val);
  }

  function yamlFrontmatter(obj) {
    var lines = ['---'];
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      if (v === null || v === undefined) return;
      lines.push(k + ': ' + yamlValue(v, ''));
    });
    lines.push('---');
    return lines.join('\n') + '\n';
  }

  // ── 生成 Home.md ────────────────────────────────────────────
  function generateHomeMd() {
    var state = loadState();
    var tested = new Set(getTested());
    var lines = ['# AI 知识图谱', '', '> 涵盖 5 大领域 · 15 个方向 · 74 个核心主题', ''];

    var statusLabel = { mastered: '✅', learning: '📖', needs_work: '⚠️', unknown: '⬜' };

    (D.areas || []).forEach(function (area) {
      var aid = area.id;
      var at = (D.topics || []).filter(function (t) { return t.area === aid; });
      var mastered = at.filter(function (t) {
        var s = state[t.id] || 'unknown';
        if (s === 'unknown' && tested.has(t.id)) s = 'needs_work';
        return s === 'mastered';
      }).length;

      lines.push('## ' + (area.icon || '') + ' ' + area.name + ' （' + mastered + '/' + at.length + '）');
      if (area.description) lines.push('\n' + area.description + '\n');

      (D.directions || []).filter(function (d) { return d.area === aid; }).forEach(function (d) {
        var dt = at.filter(function (t) { return t.direction === d.id; });
        var dMastered = dt.filter(function (t) {
          var s = state[t.id] || 'unknown';
          if (s === 'unknown' && tested.has(t.id)) s = 'needs_work';
          return s === 'mastered';
        }).length;
        lines.push('- **' + d.name + '** (' + dMastered + '/' + dt.length + ')');
        dt.forEach(function (t) {
          var s = state[t.id] || 'unknown';
          if (s === 'unknown' && tested.has(t.id)) s = 'needs_work';
          lines.push('  - ' + (statusLabel[s] || '⬜') + ' [[' + t.id + '|' + t.name + ']]');
        });
      });
      lines.push('');
    });

    return lines.join('\n');
  }

  // ── 生成 Area 文件 ──────────────────────────────────────────
  function generateAreaMd(area) {
    var aid = area.id;
    var at = (D.topics || []).filter(function (t) { return t.area === aid; });
    var mastered = at.filter(function (t) {
      return getEffectiveStatus(t.id) === 'mastered';
    }).length;

    var fm = {
      id: aid,
      name: area.name,
      name_en: area.name_en,
      type: 'area',
      color: area.color,
      icon: area.icon,
      progress: mastered + '/' + at.length,
      direction_count: area.direction_count
    };

    var body = (area.body || area.description || '').trim();

    return yamlFrontmatter(fm) + '\n' + body + '\n';
  }

  // ── 生成 Direction 文件 ─────────────────────────────────────
  function generateDirectionMd(dir) {
    var did = dir.id;
    var dt = (D.topics || []).filter(function (t) { return t.direction === did; });
    var mastered = dt.filter(function (t) {
      return getEffectiveStatus(t.id) === 'mastered';
    }).length;

    var area = (D.areas || []).find(function (a) { return a.id === dir.area; });
    var fm = {
      id: did,
      name: dir.name,
      name_en: dir.name_en,
      type: 'direction',
      area: area ? '[[' + area.id + '|' + area.name + ']]' : dir.area,
      progress: mastered + '/' + dt.length,
      topic_count: dir.topic_count
    };

    var body = (dir.body || dir.description || '').trim();
    body += '\n\n## 包含主题\n';
    dt.forEach(function (t) {
      body += '- [[' + t.id + '|' + t.name + ']]\n';
    });

    return yamlFrontmatter(fm) + '\n' + body;
  }

  // ── 生成 Topic 文件 ─────────────────────────────────────────
  function generateTopicMd(topicMeta) {
    var tid = topicMeta.id;
    var tFull = (D.topics_full || {})[tid] || {};
    var s = getEffectiveStatus(tid);
    var tested = new Set(getTested()).has(tid);

    // 前置知识用 wikilinks
    var prereqLinks = (topicMeta.prerequisites || []).map(function (pid) {
      var pt = (D.topics_full || {})[pid] || {};
      return '[[' + pid + (pt.name ? '|' + pt.name : '') + ']]';
    });

    // 同方向其他主题（交叉引用）
    var siblings = (D.topics || []).filter(function (t) {
      return t.direction === topicMeta.direction && t.id !== tid;
    });
    var relatedLinks = siblings.map(function (t) {
      return '[[' + t.id + '|' + t.name + ']]';
    });

    var fm = {
      id: tid,
      name: topicMeta.name,
      name_en: topicMeta.name_en,
      area: topicMeta.area,
      direction: topicMeta.direction,
      difficulty: topicMeta.difficulty,
      importance: topicMeta.importance,
      status: s,
      tested: tested,
      tags: topicMeta.tags || []
    };
    if (prereqLinks.length > 0) {
      fm.prerequisites = prereqLinks;
    }

    var body = (tFull.body || topicMeta.description || '').trim();

    // 添加元数据区块
    body += '\n\n---\n';
    body += '\n**难度**: ' + ('★'.repeat(topicMeta.difficulty || 3)) + '　';
    body += '**重要性**: ' + ('★'.repeat(topicMeta.importance || 3));
    body += '\n**掌握状态**: ' + {
      mastered: '✅ 已掌握', learning: '📖 学习中',
      needs_work: '⚠️ 需要加强', unknown: '⬜ 未测评'
    }[s];

    if (prereqLinks.length > 0) {
      body += '\n**前置知识**: ' + prereqLinks.join(' · ');
    }

    if (siblings.length > 0) {
      body += '\n**同方向主题**: ' + relatedLinks.slice(0, 10).join(' · ');
      if (relatedLinks.length > 10) body += ' …（共 ' + relatedLinks.length + ' 个）';
    }

    body += '\n---\n';

    return yamlFrontmatter(fm) + '\n# ' + topicMeta.name + '\n\n' + body;
  }

  // ── .obsidian 配置 ──────────────────────────────────────────
  function obsidianAppJson() {
    return JSON.stringify({
      "showInlineTitle": false,
      "newFileLocation": "folder",
      "newFileFolderPath": "topics",
      "attachmentFolderPath": "assets"
    }, null, 2);
  }

  function obsidianAppearanceJson() {
    return JSON.stringify({
      "cssTheme": "Things",
      "theme": "obsidian",
      "accentColor": "#58A6FF",
      "baseFontSize": 16
    }, null, 2);
  }

  function obsidianGraphJson() {
    return JSON.stringify({
      "collapse-filter": false,
      "search": "",
      "showTags": true,
      "showAttachments": false,
      "hideUnresolved": false,
      "showOrphans": true,
      "collapse-color-groups": false,
      "colorGroups": [],
      "collapse-display": false,
      "showArrow": true,
      "textFadeMultiplier": 0,
      "nodeSizeMultiplier": 1,
      "lineSizeMultiplier": 1,
      "collapse-forces": false,
      "centerStrength": 0.5,
      "repelStrength": 10,
      "linkStrength": 1,
      "linkDistance": 250,
      "scale": 1,
      "close": true
    }, null, 2);
  }

  // ════════════════════════════════════════════════════════════
  // 公开 API
  // ════════════════════════════════════════════════════════════

  function exportObsidianVault() {
    if (typeof JSZip === 'undefined') {
      alert('JSZip 未加载，请检查网络连接后刷新页面。');
      return;
    }

    var zip = new JSZip();
    var root = 'AI知识图谱/';

    // .obsidian 配置
    zip.file(root + '.obsidian/app.json', obsidianAppJson());
    zip.file(root + '.obsidian/appearance.json', obsidianAppearanceJson());
    zip.file(root + '.obsidian/graph.json', obsidianGraphJson());

    // Home
    zip.file(root + '🏠 AI知识总览.md', generateHomeMd());

    // Areas
    var areaFolder = zip.folder(root + '01-领域');
    (D.areas || []).forEach(function (a) {
      areaFolder.file(a.id + '.md', generateAreaMd(a));
    });

    // Directions
    var dirFolder = zip.folder(root + '02-方向');
    (D.directions || []).forEach(function (d) {
      dirFolder.file(d.id + '.md', generateDirectionMd(d));
    });

    // Topics
    var topicFolder = zip.folder(root + '03-主题');
    (D.topics || []).forEach(function (t) {
      topicFolder.file(t.id + '.md', generateTopicMd(t));
    });

    zip.generateAsync({ type: 'blob' }).then(function (content) {
      var url = URL.createObjectURL(content);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'AI知识图谱-Obsidian.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }).catch(function (e) {
      alert('导出失败: ' + e.message);
    });
  }

  function exportAnkiCSV() {
    var quizData = D.quizzes || {};
    var lines = ['# Front;Back;Tags'];
    var topics = D.topics || [];

    topics.forEach(function (t) {
      var qs = quizData[t.id] || [];
      qs.forEach(function (q) {
        var front = q.question || '';
        var options = (q.options || []).map(function (o) {
          return o.letter + '. ' + o.text;
        }).join('<br>');
        var correctIdx = q.correct_index != null ? q.correct_index : -1;
        var correctLetter = correctIdx >= 0 && q.options[correctIdx]
          ? q.options[correctIdx].letter : '?';
        var back = '答案: ' + correctLetter + '<br>' + options + '<br><br>' + (q.explanation || '');
        var tags = (t.area || '') + ' ' + (t.direction || '') + ' ' + (t.tags || []).join(' ');

        // CSV escaping
        var frontEsc = '"' + front.replace(/"/g, '""') + '"';
        var backEsc = '"' + back.replace(/"/g, '""') + '"';
        var tagsEsc = '"' + tags.replace(/"/g, '""') + '"';
        lines.push(frontEsc + ';' + backEsc + ';' + tagsEsc);
      });
    });

    if (lines.length === 1) {
      alert('没有可导出的题目。');
      return;
    }

    var blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'AI知识图谱-Anki.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportMarkdown() {
    if (typeof JSZip === 'undefined') {
      alert('JSZip 未加载，请检查网络连接后刷新页面。');
      return;
    }

    var zip = new JSZip();
    var root = 'AI知识图谱-纯文本/';

    (D.areas || []).forEach(function (a) {
      zip.file(root + 'areas/' + a.id + '.md', generateAreaMd(a));
    });
    (D.directions || []).forEach(function (d) {
      zip.file(root + 'directions/' + d.id + '.md', generateDirectionMd(d));
    });
    (D.topics || []).forEach(function (t) {
      zip.file(root + 'topics/' + t.id + '.md', generateTopicMd(t));
    });
    zip.file(root + 'README.md', generateHomeMd());

    zip.generateAsync({ type: 'blob' }).then(function (content) {
      var url = URL.createObjectURL(content);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'AI知识图谱-纯文本.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  return {
    obsidian: exportObsidianVault,
    anki: exportAnkiCSV,
    markdown: exportMarkdown
  };
})();
