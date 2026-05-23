---
id: "monitoring"
name: "监控与可观测性"
name_en: "Monitoring & Observability"
type: "topic"
level: 3
area: "engineering"
direction: "mlops"
prerequisites: ["llm_api_design"]
difficulty: 3
importance: 3
status: "unknown"
tags: ["engineering", "monitoring", "tracing", "observability", "langfuse"]
---

LLM 应用的可观测性需要超越传统软件监控，增加 LLM 特有的指标：token 消耗、延迟分布（TTFT/TBT）、幻觉率、用户满意度（Thumbs up/down）。Langfuse、LangSmith、Prometheus+Grafana 是主流监控方案。

## Quiz

### Q1
**问题**: LLM 应用监控中，"首字节时间（TTFT）"和"Token 生成速度（TBT）"分别衡量什么？

- A. 两个指标都衡量总生成时间，只是计算方式不同
- B. TTFT 是用户发请求到收到第一个 token 的时间（感知延迟），TBT 是相邻 token 之间的平均时间（生成速度）  ✓
- C. TTFT 是服务器处理时间，TBT 是网络传输时间
- D. TTFT 用于评估 CPU 性能，TBT 用于评估 GPU 性能

**解析**: 对于流式 LLM 应用，用户体验由两部分决定：(1) TTFT（Time To First Token）：影响"反应是否迟钝"的感知，通常期望 <500ms；(2) TBT（Time Between Tokens）：影响阅读速度，通常期望 <50ms（约20 tokens/s）。KV Cache 命中率直接影响 TTFT。

### Q2
**问题**: 在 LLM 应用的可观测性中，"trace"和"span"分别代表什么？

- A. trace 是单次 LLM 调用，span 是完整的用户请求
- B. trace 是完整的用户请求链路（可能含多次 LLM 调用），span 是其中单个操作（一次 LLM 调用/工具调用）  ✓
- C. 两者都表示 token 使用量
- D. trace 用于生产环境，span 用于开发环境

**解析**: OpenTelemetry 标准：一个用户请求 = 一个 trace（如：用户问一个问题→检索→LLM生成→重排序→最终生成）；trace 由多个 span 组成（每次 LLM 调用、工具调用、数据库查询各一个 span）。Langfuse 等工具可视化这个树状结构，帮助定位哪个 span 耗时最长或出错。

### Q3
**问题**: LLM 应用的"在线评估"（Online Evaluation）相比"离线评估"（Offline Evaluation）的核心区别是什么？

- A. 在线评估需要更多标注员
- B. 在线评估在生产流量上实时运行评估（如用 LLM Judge 对每条响应打分），离线评估在固定测试集上批量评估  ✓
- C. 在线评估精度更高
- D. 离线评估在生产环境中运行

**解析**: 离线评估（定期在 benchmark 数据集上测试）无法捕捉真实用户分布和新出现的问题模式。在线评估（Shadow mode）：对每条生产请求自动触发 LLM Judge 打质量分，聚合后生成实时仪表盘，可以立即检测到模型退化或特定类型的失败。代价是每次评估多一次 LLM 调用。

## 参考资料

### 博文/教程
- **[Evidently AI Documentation]** — Evidently AI 官方文档。开源 ML 监控框架，提供数据漂移检测、模型性能监控与报告生成功能，支持集成 Prometheus/Grafana 实现生产级监控仪表盘。https://docs.evidentlyai.com/
- **[Langfuse Documentation]** — Langfuse 官方文档。开源 LLM 可观测性平台，提供 Trace/Span 可视化、Token 成本追踪、质量评分与数据集管理，是构建 LLM 生产监控的实用工具。https://langfuse.com/docs
- **[ML Observability: The Key to Production ML Success]** — Arize AI 博客。介绍 ML 系统从离线评估到在线监控的全链路可观测性实践，涵盖数据漂移、模型性能退化与幻觉检测的监控策略。https://arize.com/blog/
