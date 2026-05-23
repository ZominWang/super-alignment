---
id: "llm_observability"
name: "LLM可观测性"
name_en: "LLM Observability"
type: "topic"
level: 3
area: "engineering"
direction: "mlops"
prerequisites: ["monitoring", "llm_api_design"]
difficulty: 3
importance: 3
status: "unknown"
tags: ["observability", "tracing", "logging", "langsmith", "phoenix", "llm-monitoring"]
---

LLM应用的不可预测性（非确定性输出、工具调用副作用、迭代式推理）使得传统APM监控方案无法覆盖，需要专门的可观测性方案。核心监控维度：LLM调用Trace——完整记录每一步推理（Thought）、工具调用（Action）、检索结果（Retrieval）的输入输出与延时，支持分布式追踪（如OpenTelemetry for LLM）。成本追踪——精确统计Token消耗（输入/输出分别计费）、按用户/会话/功能的成本归因。延迟分析——TTFT（首Token时间，影响用户感知响应速度）、TPOT（每输出Token间隔时间，反映生成吞吐）、端到端延迟。质量监控——LLM-as-Judge自动评分、幻觉检测、检索精确率/召回率、用户反馈收集。主流工具：LangSmith（LangChain官方全生命周期平台）、Arize Phoenix（开源可自部署，自动分析漂移和异常）、Helicone（代理网关模式接入成本最低）、Weights & Biases Prompts。

## Quiz

### Q1
**问题**: 生产环境中TTFT（Time to First Token）和TPOT（Time per Output Token）分别反映了什么用户体验问题？

- A. 两者都是衡量总响应时间的
- B. TTFT反映"用户感知的响应速度"（首字符出现前的等待），TPOT反映"生成速度的流畅度"（每个后续token的间隔）；若TTFT高则感觉"卡住了"，TPOT高则文字像"挤牙膏"  ✓
- C. TTFT只与网络延迟相关
- D. TPOT只与模型参数量相关

**解析**: TTFT = 请求发出 → 第一个token生成。高TTFT通常由：长System Prompt处理时间、长上下文预填充、模型排队等待、Cold Start延迟。优化：Prompt Cache（缓存System Prompt KV）、预测模型预热、精简上下文。TPOT = 后续token平均生成间隔，受模型推理速度、批次大小、KV Cache大小影响。用户体验最敏感的是TTFT（>2秒用户开始焦虑），其次是TPOT（不稳定抖动比稳定慢速更令人烦躁）。好的监控需要分别追踪P50/P95/P99分位数。

### Q2
**问题**: LangSmith中"Trace"与"Span"的关系及设计动机是什么？

- A. Trace是错误日志，Span是性能指标
- B. Trace代表一次完整的用户交互（如一个Agent任务），Span是Trace内的子步骤（如LLM调用、工具调用、检索操作）；这种树形结构使故障定位可以精准到具体子步骤  ✓
- C. Span包含多个Trace
- D. 两者是独立的，没有关系

**解析**: LangSmith采用OpenTelemetry风格的树形追踪模型：Root Span（如"用户问：今天天气如何"）→ Child Spans（如"检索天气API→LLM理解意图→LLM生成回复→格式化输出"）。每个Span记录：输入输出、延时、Token数、关联的Prompt模板版本、模型参数。当一个问题回复质量差，开发者可以沿Trace树定位到具体出错的Span（如"检索返回了错误城市的数据"而非"LLM有问题"），大幅减少排查时间。同时，通过聚合相同Span类型的数据可自动发现系统性瓶颈（如"知识检索环节平均延时300ms，其中P99达到2s"）。

### Q3
**问题**: LLM应用的幻觉检测(Hallucination Detection)在可观测性系统中如何实现自动化？

- A. 人工抽查回复
- B. 使用LLM-as-Judge对检索上下文与生成回复进行事实一致性(NLI)评分，当回复中的断言在检索结果中找不到支撑时标记为疑似幻觉；同时在Trace中可视化关联关系  ✓
- C. 通过关键词过滤检测
- D. 只检查回复长度是否异常

**解析**: 自动化幻觉检测流程：(1) 在Trace中同时记录检索结果(context)和LLM生成回复(response)；(2) 使用NLI模型（如AlignScore/TrueTeacher）或LLM-as-Judge对每对(context, sentence)做事实一致性判断，输出entailment/contradiction/neutral；(3) 当contradiction比例超过阈值（如>20%的句子无法在context中找到支撑）→告警；(4) 在观测平台中将context和response并排可视化，标注未支撑的断言位置。这要求观测系统不是简单地记录输入输出，而是理解检索与生成的语义关系并自动评分——与传统日志系统有本质区别。

## 参考资料

### 博文/教程
- **[LangSmith Documentation]** — LangChain 官方文档。介绍 LangSmith 的 Trace/Span 追踪模型、提示版本管理、在线评估与 Dataset 管理功能，是 LangChain 生态的可观测性核心工具。https://docs.smith.langchain.com/
- **[Langfuse Documentation]** — Langfuse 官方文档。开源 LLM 可观测性平台，支持自托管部署，提供 Trace 树形可视化、成本归因、评分集成，是注重数据隐私团队的首选方案。https://langfuse.com/docs
- **[OpenTelemetry for LLM Observability]** — OpenTelemetry 社区博客。介绍如何将 OpenTelemetry 标准扩展至 LLM 应用，实现跨框架统一的分布式追踪与指标采集。https://opentelemetry.io/blog/

