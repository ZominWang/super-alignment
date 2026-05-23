# DATA.js 接口契约

> `build.py` 编译 `vault/` 生成 `web/static/js/data.js`，定义 `window.__DATA__`。
> 前端（app.js）通过 `api-shim.js` 间接消费此数据，也可直接读取。
> **修改此结构前，需与前端同步。**

## 顶层结构

```javascript
window.__DATA__ = {
  areas:             Area[],       // 5 个大类
  directions:        Direction[],  // 15 个方向
  topics:            TopicMeta[],  // 74 个主题（元数据，不含正文）
  topics_full:       {id: TopicFull}, // 主题完整数据（含正文，供导出用）
  quizzes:           {id: QuizQuestion[]}, // 所有题目的正确答案（前端判分用）
  graph:             { nodes: GraphNode[], links: GraphLink[] },
  progress:          Progress,     // 默认进度（全 unknown）
  paths:             Path[],       // 学习路径（2条）
  diagnostic_db:     DiagnosticEntry[], // 全局诊断题库
  direction_quizzes: {id: DirectionQuiz}, // 各方向测评数据
  course_prompts:    {type/id: Prompt},   // CLI 课程提示词
  search_index:      SearchItem[], // 预分词搜索索引
}
```

## 核心类型定义

```typescript
// ── Area ──
interface Area {
  id:            string;   // "foundations"
  name:          string;   // "基础理论"
  name_en:       string;   // "Foundations"
  type:          "area";
  level:         1;
  color:         string;   // "#58A6FF"
  icon:          string;   // "📐"
  description:   string;
  direction_count: number; // 3
  body:          string;   // Markdown 正文
}

// ── Direction ──
interface Direction {
  id:          string;   // "rag"
  name:        string;   // "RAG检索增强"
  name_en:     string;
  type:        "direction";
  level:       2;
  area:        string;   // 所属 Area.id
  color:       string;
  description: string;
  topic_count: number;   // 自动计算
  body:        string;
}

// ── TopicMeta（用于图谱/列表/搜索） ──
interface TopicMeta {
  id:            string;         // "rag_basics"
  name:          string;         // "RAG基础架构"
  name_en:       string;
  area:          string;         // "application"
  direction:     string;         // "rag"
  difficulty:    number;         // 1-5
  importance:    number;         // 1-5
  prerequisites: string[];       // ["embeddings", "basic_prompting"]
  tags:          string[];
  description:   string;         // 正文首行截断（≤200字）
  status:        "unknown";      // 默认值，运行时由 localStorage 覆盖
  tested:        false;          // 默认值
}

// ── TopicFull（用于导出和正文展示） ──
interface TopicFull extends TopicMeta {
  body:      string;  // 去除 Quiz 部分的正文
  body_full: string;  // 完整正文（含 Quiz）
}

// ── GraphNode ──
interface GraphNode {
  id:          string;
  name:        string;
  name_en:     string;
  type:        "area"|"direction"|"topic";
  level:       1|2|3;
  color:       string;   // 领域颜色，不由状态改变
  // area 节点额外字段:
  icon?:       string;
  description?: string;
  direction_count?: number;
  // direction 节点额外字段:
  area?:       string;   // 所属 Area.id
  topic_count?: number;
  // topic 节点额外字段:
  difficulty?: number;
  importance?: number;
  status?:     "mastered"|"learning"|"needs_work"|"unknown";
  tested?:     boolean;
  tags?:       string[];
  // 聚合字段（area/direction）:
  mastered?:   number;
  total?:      number;
}

// ── GraphLink ──
interface GraphLink {
  source: string;  // 源节点 ID
  target: string;  // 目标节点 ID
  type:   "area_direction"|"direction_topic"|"prerequisite";
}

// ── QuizQuestion（含正确答案） ──
interface QuizQuestion {
  question:            string;
  options:             { letter: string; text: string; correct: boolean }[];
  correct_index:       number;    // 正确答案的索引
  within_topic_q_index: number;   // 题号
  explanation:         string;
  // 诊断题额外字段:
  topic_id?:     string;
  topic_name?:   string;
  direction_id?: string;
  direction_name?: string;
  area_id?:      string;
}

// ── Path ──
interface Path {
  id:      string;       // "apply"
  name:    string;       // "会用"
  name_en: string;
  desc:    string;
  desc_en: string;
  steps:   { id: string }[];   // 或直接 string[]
}

// ── SearchItem ──
interface SearchItem {
  id:           string;
  name:         string;
  name_en:      string;
  type:         "area"|"direction"|"topic";
  description:  string;
  tokens:       string[];      // 预分词
  // topic 专有:
  difficulty?:    number;
  importance?:    number;
  tags?:          string[];
  direction_id?:  string;
  direction_name?: string;
  area_id?:       string;
  area_name?:     string;
  area_color?:    string;
}
```

## api-shim.js 模拟的 API 端点

前端仍可使用 `fetch('/api/...')` 调用以下端点，`api-shim.js` 拦截并本地处理：

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/graph` | GET | 图谱数据（合并 localStorage 状态） |
| `/api/directions?area_id=X` | GET | 方向列表 |
| `/api/areas` | GET | 大类列表 |
| `/api/learning-paths` | GET | 学习路径 |
| `/api/progress` | GET | 进度统计（合并状态） |
| `/api/search?q=X` | GET | 全文搜索 |
| `/api/recommendations?top_n=N` | GET | 下一步推荐 |
| `/api/quiz/{topicId}` | GET | 单主题 Quiz（无答案） |
| `/api/diagnostic?n_per_direction=N` | GET | 全局诊断题（无答案） |
| `/api/direction/{id}/quiz` | GET | 方向测评题（无答案） |
| `/api/course-prompt/{type}/{id}` | GET | CLI 课程提示词 |
| `/api/topic/{id}` | GET | 单主题详情 |
| `/api/answer-check` | POST | 单题判分 |
| `/api/diagnostic/submit` | POST | 提交诊断（写 localStorage） |
| `/api/direction/{id}/quiz/submit` | POST | 提交方向测评 |
| `/api/quiz/{id}/submit` | POST | 提交单主题测评 |
| `/api/status/{id}` | POST | 手动更新状态 |

## 状态管理

学习进度完全存于浏览器 `localStorage`，不依赖服务端：

| Key | 类型 | 说明 |
|-----|------|------|
| `kg_status` | `{ topicId: "mastered"\|"learning" }` | 主题掌握状态 |
| `kg_tested` | `[topicId, ...]` | 已测评的主题 ID |
| `kg_theme` | `"light"\|"dark"` | 日/夜主题（由 app.js 管理） |

状态派生规则：`status === 'unknown' && tested === true` → `'needs_work'`

## 导出功能

### 浏览器端导出（export.js，UI 中调用）

```javascript
Export.obsidian()   // 下载 Obsidian Vault zip（含 wikilinks + 状态）
Export.anki()       // 下载 Anki CSV 卡片组（浏览器兼容格式）
Export.markdown()   // 下载纯 Markdown zip
```

### 构建时导出（build.py，服务端分发）

```bash
python build.py --export obsidian   # Obsidian Vault 目录
python build.py --export anki       # Anki .apkg 卡片包（222 张，15 个子牌组）
python build.py --export anki-csv   # Anki CSV（兼容旧版）
python build.py --export markdown   # 纯 Markdown 目录
python build.py --export all        # 全量导出
```

依赖 `JSZip`（CDN: cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js）
构建时导出还需 `genanki>=0.13`。
