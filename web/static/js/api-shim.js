/* ============================================================
   API Shim — 拦截 fetch 调用，所有数据来自编译好的 data.js +
   localStorage，无需 Flask 后端。
   ============================================================ */

(function () {
  'use strict';

  var D = window.__DATA__;
  if (!D) {
    console.error('[api-shim] __DATA__ 未加载，请先生成 data.js (python build.py)');
    return;
  }

  // ── localStorage key ────────────────────────────────────────
  var LS_STATUS = 'kg_status';
  var LS_TESTED = 'kg_tested';

  function loadState() {
    try { return JSON.parse(localStorage.getItem(LS_STATUS) || '{}'); }
    catch (_) { return {}; }
  }
  function saveState(state) {
    localStorage.setItem(LS_STATUS, JSON.stringify(state));
  }
  function getTested() {
    try { return JSON.parse(localStorage.getItem(LS_TESTED) || '[]'); }
    catch (_) { return []; }
  }
  function markTested(ids) {
    var tested = new Set(getTested());
    ids.forEach(function (id) { tested.add(id); });
    localStorage.setItem(LS_TESTED, JSON.stringify(Array.from(tested)));
  }

  function getEffectiveStatus(topicId) {
    var state = loadState();
    var tested = new Set(getTested());
    if (state.hasOwnProperty(topicId) && state[topicId] !== 'unknown') {
      return state[topicId];
    }
    if (tested.has(topicId)) return 'needs_work';
    return 'unknown';
  }

  function getEffectiveStatusObj(topicId) {
    var state = loadState();
    var tested = new Set(getTested());
    var status = 'unknown';
    var isTested = false;
    if (state.hasOwnProperty(topicId)) {
      status = state[topicId];
    }
    if (tested.has(topicId)) isTested = true;
    if (status === 'unknown' && isTested) status = 'needs_work';
    return { status: status, tested: isTested };
  }

  // ── 辅助查找 ────────────────────────────────────────────────
  var dirMap = {};
  var areaMap = {};
  var topicMetaMap = {};
  (D.directions || []).forEach(function (d) { dirMap[d.id] = d; });
  (D.areas || []).forEach(function (a) { areaMap[a.id] = a; });
  (D.topics || []).forEach(function (t) { topicMetaMap[t.id] = t; });

  // ── Mock Response ───────────────────────────────────────────
  function makeResp(data, status) {
    status = status || 200;
    return {
      ok: status >= 200 && status < 300,
      status: status,
      json: function () { return Promise.resolve(data); },
      text: function () { return Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)); },
      clone: function () { return this; }
    };
  }

  // ── URL 解析 ────────────────────────────────────────────────
  function parseApi(url) {
    var u;
    try { u = new URL(url, 'http://x'); } catch (_) { return null; }
    var path = u.pathname;
    var params = {};
    u.searchParams.forEach(function (v, k) { params[k] = v; });
    return { path: path, params: params };
  }

  // ════════════════════════════════════════════════════════════
  // API Handlers
  // ════════════════════════════════════════════════════════════

  function handleGraph() {
    var state = loadState();
    var tested = new Set(getTested());
    // Deep copy nodes/links to avoid mutation
    var nodes = JSON.parse(JSON.stringify(D.graph.nodes));
    var links = D.graph.links;

    var topicStates = {};
    nodes.forEach(function (n) {
      if (n.type === 'topic') {
        var o = getEffectiveStatusObj(n.id);
        n.status = o.status;
        n.tested = o.tested;
        topicStates[n.id] = { status: o.status, area: n.area, direction: n.direction };
      }
    });

    // Recompute area/direction mastered counts
    var areaCounts = {};
    var dirCounts = {};
    for (var tid in topicStates) {
      var ts = topicStates[tid];
      if (!areaCounts[ts.area]) areaCounts[ts.area] = { total: 0, mastered: 0 };
      if (!dirCounts[ts.direction]) dirCounts[ts.direction] = { total: 0, mastered: 0 };
      areaCounts[ts.area].total++;
      dirCounts[ts.direction].total++;
      if (ts.status === 'mastered') {
        areaCounts[ts.area].mastered++;
        dirCounts[ts.direction].mastered++;
      }
    }
    nodes.forEach(function (n) {
      if (n.type === 'area' && areaCounts[n.id]) {
        n.mastered = areaCounts[n.id].mastered;
        n.total = areaCounts[n.id].total;
      }
      if (n.type === 'direction' && dirCounts[n.id]) {
        n.mastered = dirCounts[n.id].mastered;
        n.total = dirCounts[n.id].total;
      }
    });

    return makeResp({ nodes: nodes, links: links });
  }

  function handleDirections(params) {
    var dirs = D.directions;
    if (params.area_id) {
      dirs = dirs.filter(function (d) { return d.area === params.area_id; });
    }
    return makeResp(dirs.map(function (d) {
      return {
        id: d.id, name: d.name, name_en: d.name_en,
        area: d.area, color: d.color,
        description: d.description, topic_count: d.topic_count
      };
    }));
  }

  function handleAreas() {
    return makeResp(D.areas.map(function (a) {
      return {
        id: a.id, name: a.name, name_en: a.name_en,
        color: a.color, icon: a.icon,
        description: a.description, direction_count: a.direction_count
      };
    }));
  }

  function handleLearningPaths() {
    return makeResp(D.paths || []);
  }

  function handleProgress() {
    var state = loadState();
    var tested = new Set(getTested());
    var topics = D.topics;
    var areas = D.areas;

    var statuses = topics.map(function (t) {
      var o = getEffectiveStatusObj(t.id);
      return o.status;
    });
    var total = topics.length;
    var mastered = statuses.filter(function (s) { return s === 'mastered'; }).length;
    var learning = statuses.filter(function (s) { return s === 'learning'; }).length;
    var needs_work = statuses.filter(function (s) { return s === 'needs_work'; }).length;
    var unknown = statuses.filter(function (s) { return s === 'unknown'; }).length;

    var areaStats = {};
    areas.forEach(function (area) {
      var aid = area.id;
      var at = topics.filter(function (t) { return t.area === aid; });
      var atStatuses = at.map(function (t) {
        return getEffectiveStatusObj(t.id).status;
      });
      var aTotal = at.length;
      var aMastered = atStatuses.filter(function (s) { return s === 'mastered'; }).length;
      var aLearning = atStatuses.filter(function (s) { return s === 'learning'; }).length;
      var aNeeds = atStatuses.filter(function (s) { return s === 'needs_work'; }).length;

      var dirStats = {};
      D.directions.filter(function (d) { return d.area === aid; }).forEach(function (d) {
        var did = d.id;
        var dt = at.filter(function (t) { return t.direction === did; });
        var dtStatuses = dt.map(function (t) {
          return getEffectiveStatusObj(t.id).status;
        });
        var dTot = dt.length;
        var dMas = dtStatuses.filter(function (s) { return s === 'mastered'; }).length;
        var dLea = dtStatuses.filter(function (s) { return s === 'learning'; }).length;
        var dNW = dtStatuses.filter(function (s) { return s === 'needs_work'; }).length;
        dirStats[did] = {
          name: d.name, name_en: d.name_en || '',
          color: area.color,
          total: dTot, mastered: dMas, learning: dLea,
          needs_work: dNW, unknown: dTot - dMas - dLea - dNW,
          percent: dTot > 0 ? Math.round(dMas / dTot * 100) : 0,
          topics: dt.map(function (t) {
            return { id: t.id, name: t.name, name_en: t.name_en || '',
              status: getEffectiveStatusObj(t.id).status };
          })
        };
      });

      areaStats[aid] = {
        name: area.name, name_en: area.name_en || '',
        icon: area.icon || '', color: area.color,
        total: aTotal, mastered: aMastered, learning: aLearning,
        needs_work: aNeeds, unknown: aTotal - aMastered - aLearning - aNeeds,
        percent: aTotal > 0 ? Math.round(aMastered / aTotal * 100) : 0,
        directions: dirStats
      };
    });

    var areaRadar = areas.map(function (a) {
      return {
        axis: a.name, area_id: a.id,
        value: a.id in areaStats
          ? Math.round((areaStats[a.id].percent || 0)) / 100 : 0
      };
    });

    var dirRadar = [];
    D.directions.forEach(function (d) {
      var dt = topics.filter(function (t) { return t.direction === d.id; });
      var dTotal = dt.length;
      var dMas = dt.filter(function (t) {
        return getEffectiveStatusObj(t.id).status === 'mastered';
      }).length;
      dirRadar.push({
        axis: d.name, direction_id: d.id, area_id: d.area,
        value: dTotal > 0 ? Math.round(dMas / dTotal * 100) / 100 : 0
      });
    });

    return makeResp({
      total: total, mastered: mastered, learning: learning,
      untested: unknown, unknown: unknown, needs_work: needs_work,
      mastered_percent: total > 0 ? Math.round(mastered / total * 100) : 0,
      areas: areaStats,
      radar_data: areaRadar,
      direction_radar_data: dirRadar
    });
  }

  function handleTopicQuiz(topicId) {
    var qs = D.quizzes[topicId];
    var t = topicMetaMap[topicId] || {};
    if (!qs && !t.id) {
      return makeResp({ error: 'Topic ' + topicId + ' not found' }, 404);
    }
    // Strip answers
    var stripped = (qs || []).map(function (q) {
      var copy = {};
      Object.keys(q).forEach(function (k) {
        if (k !== 'correct_index') copy[k] = q[k];
      });
      copy.options = (q.options || []).map(function (opt) {
        var oc = {};
        Object.keys(opt).forEach(function (k) {
          if (k !== 'correct') oc[k] = opt[k];
        });
        return oc;
      });
      return copy;
    });

    return makeResp({
      topic_id: topicId,
      topic_name: t.name,
      topic_name_en: t.name_en,
      description: (t.description || '').substring(0, 300),
      difficulty: t.difficulty || 3,
      area: t.area,
      direction: t.direction,
      questions: stripped,
      current_status: getEffectiveStatus(topicId)
    });
  }

  function handleDiagnostic(params) {
    var n = Math.min(Math.max(parseInt(params.n_per_direction) || 2, 1), 3);
    var allQuestions = [];

    (D.diagnostic_db || []).forEach(function (db) {
      var qs = db.questions || [];
      var sampled;
      if (qs.length <= n) {
        sampled = qs;
      } else {
        sampled = [];
        var pool = qs.slice();
        for (var i = 0; i < n; i++) {
          var idx = Math.floor(Math.random() * pool.length);
          sampled.push(pool[idx]);
          pool.splice(idx, 1);
        }
      }
      allQuestions = allQuestions.concat(sampled);
    });

    // Strip answers
    var stripped = allQuestions.map(function (q) {
      var copy = {};
      Object.keys(q).forEach(function (k) {
        if (k !== 'correct_index') copy[k] = q[k];
      });
      copy.options = (q.options || []).map(function (opt) {
        var oc = {};
        Object.keys(opt).forEach(function (k) {
          if (k !== 'correct') oc[k] = opt[k];
        });
        return oc;
      });
      return copy;
    });

    return makeResp({ questions: stripped, total: stripped.length });
  }

  function handleDirectionQuiz(dirId) {
    var quiz = D.direction_quizzes[dirId];
    if (!quiz) {
      return makeResp({ error: 'Direction ' + dirId + ' not found' }, 404);
    }
    // Strip answers
    var stripped = (quiz.questions || []).map(function (q) {
      var copy = {};
      Object.keys(q).forEach(function (k) {
        if (k !== 'correct_index') copy[k] = q[k];
      });
      copy.options = (q.options || []).map(function (opt) {
        var oc = {};
        Object.keys(opt).forEach(function (k) {
          if (k !== 'correct') oc[k] = opt[k];
        });
        return oc;
      });
      return copy;
    });

    return makeResp({
      direction_id: quiz.direction_id,
      direction_name: quiz.direction_name,
      direction_name_en: quiz.direction_name_en,
      area_id: quiz.area_id,
      topics: quiz.topics,
      questions: stripped,
      total_questions: quiz.total_questions
    });
  }

  function handleAnswerCheck(body) {
    var topicId = body.topic_id;
    var qIdx = body.within_topic_q_index != null ? body.within_topic_q_index : (body.question_index || 0);
    var selected = body.selected_index;

    var qs = D.quizzes[topicId];
    if (!qs || qIdx >= qs.length) {
      return makeResp({ is_correct: false, correct_index: -1, explanation: '' });
    }
    var q = qs[qIdx];
    var correctIdx = q.correct_index != null ? q.correct_index : -1;
    return makeResp({
      is_correct: selected === correctIdx,
      correct_index: correctIdx,
      explanation: q.explanation || ''
    });
  }

  function handleDiagnosticSubmit(body) {
    var answers = body.answers || [];
    if (!answers.length) return makeResp({ error: 'No answers' }, 400);

    var dirStats = {};
    answers.forEach(function (ans) {
      var did = ans.direction_id;
      var tid = ans.topic_id;
      var qIdx = ans.within_topic_q_index != null ? ans.within_topic_q_index : (ans.question_index || 0);
      var selected = ans.selected_index;

      // Validate
      var qs = D.quizzes[tid] || [];
      var correct = false;
      if (qIdx < qs.length) {
        correct = (selected === (qs[qIdx].correct_index != null ? qs[qIdx].correct_index : -1));
      }

      if (!did) did = '_unknown';
      if (!dirStats[did]) dirStats[did] = { correct: 0, total: 0, topics: {} };
      dirStats[did].total++;
      if (correct) dirStats[did].correct++;
      if (!dirStats[did].topics[tid]) dirStats[did].topics[tid] = { correct: 0, total: 0 };
      dirStats[did].topics[tid].total++;
      if (correct) dirStats[did].topics[tid].correct++;
    });

    var directionScores = {};
    var radarData = [];
    var state = loadState();
    var statusUpdates = {};

    Object.keys(dirStats).forEach(function (did) {
      var stats = dirStats[did];
      var d = dirMap[did] || {};
      var pct = stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0;
      directionScores[did] = {
        name: d.name || did, name_en: d.name_en || '',
        area_id: d.area || '', score: stats.correct, total: stats.total, percent: pct
      };
      radarData.push({ axis: d.name || did, direction_id: did, value: pct / 100 });

      // Update topic statuses
      Object.keys(stats.topics).forEach(function (tid) {
        var ts = stats.topics[tid];
        if (ts.total === 0) return;
        var ns;
        if (ts.correct === ts.total) ns = 'mastered';
        else if (ts.correct > 0) ns = 'learning';
        else ns = 'unknown';
        state[tid] = ns;
        statusUpdates[tid] = ns;
      });
    });

    saveState(state);

    // Mark tested
    var testedIds = answers.map(function (a) { return a.topic_id; }).filter(Boolean);
    markTested(testedIds);

    var weakDirections = Object.keys(directionScores)
      .filter(function (did) { return directionScores[did].percent < 60; })
      .map(function (did) {
        var info = directionScores[did];
        return { direction_id: did, name: info.name, percent: info.percent, area_id: info.area_id };
      })
      .sort(function (a, b) { return a.percent - b.percent; });

    var totalCorrect = Object.keys(dirStats).reduce(function (sum, did) {
      return sum + dirStats[did].correct;
    }, 0);

    return makeResp({
      direction_scores: directionScores,
      radar_data: radarData,
      weak_directions: weakDirections,
      status_updates: statusUpdates,
      total_questions: answers.length,
      total_correct: totalCorrect
    });
  }

  function handleDirectionQuizSubmit(dirId, body) {
    var answers = body.answers || [];
    if (!answers.length) return makeResp({ error: 'No answers' }, 400);

    var dirTopics = D.topics.filter(function (t) { return t.direction === dirId; });
    var dirTopicIds = new Set(dirTopics.map(function (t) { return t.id; }));

    var topicStats = {};
    answers.forEach(function (ans) {
      var tid = ans.topic_id;
      if (!dirTopicIds.has(tid)) return;
      var qIdx = ans.within_topic_q_index != null ? ans.within_topic_q_index : (ans.question_index || 0);
      var selected = ans.selected_index;

      var qs = D.quizzes[tid] || [];
      var correct = false;
      if (qIdx < qs.length) {
        correct = (selected === (qs[qIdx].correct_index != null ? qs[qIdx].correct_index : -1));
      }

      if (!topicStats[tid]) topicStats[tid] = { correct: 0, total: 0 };
      topicStats[tid].total++;
      if (correct) topicStats[tid].correct++;
    });

    var topicResults = [];
    var state = loadState();
    dirTopics.forEach(function (t) {
      var tid = t.id;
      var stats = topicStats[tid] || { correct: 0, total: 0 };
      var ns;
      if (stats.total === 0) {
        ns = getEffectiveStatus(tid);
      } else if (stats.correct === stats.total) {
        ns = 'mastered';
      } else if (stats.correct >= stats.total - 1) {
        ns = 'learning';
      } else {
        ns = 'unknown';
      }
      if (stats.total > 0 && ns !== 'unknown') {
        state[tid] = ns;
      }
      topicResults.push({
        topic_id: tid, topic_name: t.name,
        correct: stats.correct, total: stats.total,
        percent: stats.total > 0 ? Math.round(stats.correct / stats.total * 100) : 0,
        new_status: ns,
        prerequisites: t.prerequisites || []
      });
    });
    saveState(state);

    var testedIds = answers.map(function (a) { return a.topic_id; }).filter(Boolean);
    markTested(testedIds);

    var totalQ = answers.length;
    var totalC = dirTopics.reduce(function (sum, t) {
      var stats = topicStats[t.id];
      return sum + (stats ? stats.correct : 0);
    }, 0);

    return makeResp({
      direction_id: dirId,
      total_questions: totalQ,
      total_correct: totalC,
      score_percent: totalQ > 0 ? Math.round(totalC / totalQ * 100) : 0,
      topic_results: topicResults,
      weak_topics: topicResults.filter(function (r) {
        return r.total > 0 && r.percent < 67;
      })
    });
  }

  function handleTopicQuizSubmit(topicId, body) {
    var answers = body.answers || [];
    var qs = D.quizzes[topicId] || [];
    if (!qs.length) return makeResp({ error: 'No questions found' }, 400);

    var correctCount = 0;
    var results = [];
    answers.forEach(function (ans, i) {
      var q = qs[i];
      if (!q) return;
      var correctIdx = q.correct_index != null ? q.correct_index : -1;
      var isCorrect = ans === correctIdx;
      if (isCorrect) correctCount++;
      results.push({
        question: q.question,
        user_answer: ans,
        correct_index: correctIdx,
        is_correct: isCorrect,
        explanation: q.explanation || '',
        options: q.options || []
      });
    });

    var total = qs.length;
    var newStatus = correctCount === total ? 'mastered'
      : correctCount >= total - 1 ? 'learning' : 'unknown';
    var state = loadState();
    if (newStatus !== 'unknown') state[topicId] = newStatus;
    saveState(state);

    var t = topicMetaMap[topicId] || {};
    return makeResp({
      topic_id: topicId, topic_name: t.name,
      score: correctCount, total: total,
      new_status: newStatus, results: results
    });
  }

  function handleRecommendations(params) {
    var topN = Math.min(parseInt(params.top_n) || 5, 10);
    var state = loadState();
    var tested = new Set(getTested());
    var candidates = [];

    D.topics.forEach(function (t) {
      var status = getEffectiveStatus(t.id);
      if (status !== 'unknown') return;

      var prereqsMet = (t.prerequisites || []).every(function (pid) {
        return getEffectiveStatus(pid) === 'mastered';
      });
      if (!prereqsMet) return;

      var d = dirMap[t.direction] || {};
      var a = areaMap[t.area] || {};

      var reason = buildReason(t, state);
      candidates.push({
        id: t.id, name: t.name, name_en: t.name_en,
        direction: t.direction, direction_name: d.name || '',
        direction_color: d.color || '#888',
        area: t.area, area_name: a.name || '',
        difficulty: t.difficulty || 3, importance: t.importance || 3,
        status: status, prerequisites: t.prerequisites || [],
        reason: reason
      });
    });

    candidates.sort(function (a, b) {
      return b.importance - a.importance || a.difficulty - b.difficulty;
    });
    return makeResp(candidates.slice(0, topN));
  }

  function buildReason(topic) {
    var dirName = (dirMap[topic.direction] || {}).name || '';
    var importance = topic.importance || 3;
    var difficulty = topic.difficulty || 3;
    var prereqs = topic.prerequisites || [];
    var reasons = [];

    if (importance === 5) reasons.push('这是' + dirName + '领域的核心知识点，重要性极高');
    else if (importance === 4) reasons.push('在' + dirName + '领域中有很高的实用价值');
    else reasons.push('属于' + dirName + '的基础知识');

    if (!prereqs.length) reasons.push('无需任何前置知识，可以直接开始学习');
    else if (prereqs.length === 1) reasons.push('你已掌握所有前置知识，学习条件成熟');
    else reasons.push('你已完成所有 ' + prereqs.length + ' 个前置知识点的学习');

    var diffDesc = { 1: '非常基础', 2: '入门级', 3: '中等难度', 4: '有一定挑战', 5: '高难度' };
    reasons.push('难度级别：' + (diffDesc[difficulty] || '中等'));

    return reasons.join('；');
  }

  function handleSearch(params) {
    var q = (params.q || '').trim();
    if (!q) return makeResp({ results: [], query: q, total: 0 });

    var limit = Math.min(parseInt(params.limit) || 20, 50);

    // CJK word splitting
    var query = q;
    query = query.replace(/([\u4e00-\u9fff])([a-zA-Z0-9])/g, '$1 $2');
    query = query.replace(/([a-zA-Z0-9])([\u4e00-\u9fff])/g, '$1 $2');
    var tokens = query.toLowerCase().split(/[\s,，。、./\\|]+/).filter(Boolean);
    if (!tokens.length) return makeResp({ results: [], query: q, total: 0 });

    var results = [];
    D.search_index.forEach(function (item) {
      var score = 0;
      var name = (item.name || '').toLowerCase();
      var nameEn = (item.name_en || '').toLowerCase();
      tokens.forEach(function (token) {
        if (token === name || token === nameEn) score += 100;
        else if (name.indexOf(token) !== -1 || nameEn.indexOf(token) !== -1) score += 60;
        if (item.tags) {
          item.tags.forEach(function (tag) {
            if (tag.toLowerCase().indexOf(token) !== -1) score += 40;
          });
        }
        if (item.tokens && item.tokens.indexOf(token) !== -1) score += 20;
      });
      if (score === 0) return;

      var result = {
        type: item.type, id: item.id,
        name: item.name, name_en: item.name_en,
        score: score,
        description: item.description || '',
        area_color: item.area_color || '#888'
      };

      if (item.type === 'topic') {
        result.status = getEffectiveStatus(item.id);
        result.tested = new Set(getTested()).has(item.id);
        result.difficulty = item.difficulty || 3;
        result.importance = item.importance || 3;
        result.direction_id = item.direction_id;
        result.direction_name = item.direction_name;
        result.area_id = item.area_id;
        result.area_name = item.area_name;
        result.tags = item.tags || [];
      } else if (item.type === 'direction') {
        result.area_id = item.area_id;
        result.area_name = item.area_name;
        result.topic_count = item.topic_count || 0;
        result.score += 5;
      } else if (item.type === 'area') {
        result.color = item.color;
        result.icon = item.icon;
        result.direction_count = item.direction_count || 0;
        result.score += 10;
      }

      results.push(result);
    });

    results.sort(function (a, b) { return b.score - a.score; });
    return makeResp({
      results: results.slice(0, limit),
      query: q,
      total: Math.min(results.length, limit)
    });
  }

  function handleCoursePrompt(nodeType, nodeId) {
    var key = nodeType + '/' + nodeId;
    var prompt = D.course_prompts[key];
    if (!prompt) {
      return makeResp({ error: nodeType + ' ' + nodeId + ' not found' }, 404);
    }
    return makeResp(prompt);
  }

  function handleTopicDetail(topicId) {
    var t = topicMetaMap[topicId];
    if (!t) {
      return makeResp({ error: 'Topic ' + topicId + ' not found' }, 404);
    }
    return makeResp({
      id: t.id, name: t.name, name_en: t.name_en,
      area: t.area, direction: t.direction,
      prerequisites: t.prerequisites || [],
      difficulty: t.difficulty || 3, importance: t.importance || 3,
      status: getEffectiveStatus(t.id),
      tags: t.tags || [],
      description: (t.description || '').substring(0, 500)
    });
  }

  function handleStatusUpdate(topicId, body) {
    var newStatus = body.status;
    if (!newStatus || ['unknown', 'learning', 'mastered'].indexOf(newStatus) === -1) {
      return makeResp({ error: 'Invalid status: ' + newStatus }, 400);
    }
    var state = loadState();
    state[topicId] = newStatus;
    saveState(state);
    return makeResp({
      topic_id: topicId, status: newStatus,
      message: 'Status updated to ' + newStatus
    });
  }

  // ════════════════════════════════════════════════════════════
  // 路由匹配
  // ════════════════════════════════════════════════════════════

  function route(parsed, body) {
    var p = parsed.path;
    var params = parsed.params;

    // Static paths
    if (p === '/api/graph')               return handleGraph();
    if (p === '/api/directions')          return handleDirections(params);
    if (p === '/api/areas')               return handleAreas();
    if (p === '/api/learning-paths')      return handleLearningPaths();
    if (p === '/api/progress')            return handleProgress();
    if (p === '/api/diagnostic')          return handleDiagnostic(params);
    if (p === '/api/diagnostic/submit')    return handleDiagnosticSubmit(body);
    if (p === '/api/search')              return handleSearch(params);
    if (p === '/api/recommendations')     return handleRecommendations(params);
    if (p === '/api/answer-check')        return handleAnswerCheck(body);

    // Dynamic paths
    var m;

    m = p.match(/^\/api\/quiz\/([^/]+)\/submit$/);
    if (m) return handleTopicQuizSubmit(m[1], body);

    m = p.match(/^\/api\/quiz\/([^/]+)$/);
    if (m) return handleTopicQuiz(m[1]);

    m = p.match(/^\/api\/direction\/([^/]+)\/quiz\/submit$/);
    if (m) return handleDirectionQuizSubmit(m[1], body);

    m = p.match(/^\/api\/direction\/([^/]+)\/quiz$/);
    if (m) return handleDirectionQuiz(m[1]);

    m = p.match(/^\/api\/status\/([^/]+)$/);
    if (m) return handleStatusUpdate(m[1], body);

    m = p.match(/^\/api\/topic\/([^/]+)$/);
    if (m) return handleTopicDetail(m[1]);

    m = p.match(/^\/api\/course-prompt\/([^/]+)\/([^/]+)$/);
    if (m) return handleCoursePrompt(m[1], m[2]);

    return null;
  }

  // ════════════════════════════════════════════════════════════
  // Fetch 拦截
  // ════════════════════════════════════════════════════════════

  var _fetch = window.fetch;

  window.fetch = function (url, options) {
    var parsed = parseApi(url);
    if (!parsed) return _fetch(url, options);

    // Parse body for POST requests
    var body = null;
    if (options && options.body && typeof options.body === 'string') {
      try { body = JSON.parse(options.body); } catch (_) {}
    }

    var resp = route(parsed, body);
    if (resp) return Promise.resolve(resp);

    // Not an API call we handle — fall through to real fetch
    return _fetch(url, options);
  };

})();
