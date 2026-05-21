---
id: "benchmarks"
name: "基准测试与排行榜"
name_en: "Benchmarks & Leaderboards"
type: "topic"
level: 3
area: "engineering"
direction: "eval_quality"
prerequisites: ["llm_evaluation"]
difficulty: 2
importance: 3
status: "unknown"
tags: ["evaluation", "benchmarks", "mmlu", "hellaswag", "chatbot-arena", "leaderboard"]
---

基准测试是评估 LLM 能力的标准化工具，MMLU、HumanEval、GSM8K 等分别测试知识、代码和数学能力。Chatbot Arena 的 ELO 排名基于人类偏好比较，更接近真实使用体验。理解基准的局限性（过拟合、泄露、能力窄化）是批判性使用排行榜的关键。

## Quiz

### Q1
**问题**: MMLU（Massive Multitask Language Understanding）基准的设计特点和局限性是什么？

- A. MMLU 测试模型的代码生成能力
- B. MMLU 是57个领域的四选一选择题（测知识广度），局限是选择题格式无法评估推理过程和开放式回答能力  ✓
- C. MMLU 由人类偏好投票决定排名
- D. MMLU 是实时更新的动态基准

**解析**: MMLU 包含 STEM、社会科学、人文等 57 个学科共约 15K 道多选题，覆盖面广，易于标准化对比。局限：(1) 四选一格式可能被模型用表面模式（选项长度/顺序偏好）欺骗；(2) 训练集泄露问题（模型可能见过原题）；(3) 无法测试需要多步推理的能力；(4) 高分不一定意味着在实际任务中表现好。

### Q2
**问题**: Chatbot Arena 的 ELO 排名机制与传统基准（如 MMLU）相比的主要优势是什么？

- A. ELO 计算更简单，速度更快
- B. ELO 基于人类对真实对话的偏好比较，更直接反映实际使用体验，且难以通过训练数据泄露作弊  ✓
- C. ELO 排名更新频率更高
- D. ELO 只关注数学和代码能力

**解析**: 传统基准固定题目容易被针对性训练（Goodhart 法则：指标成为目标时失效）。Chatbot Arena：用户提交真实问题，盲测两个模型的回答并投票，通过 ELO 算法累积偏好数据。因为问题多样且不公开，难以针对性优化，代表用户真实偏好的生态效度最高。

### Q3
**问题**: "基准污染"（Benchmark Contamination）是什么，如何检测？

- A. 基准题目数量过多导致评估不准确
- B. 模型预训练数据包含了基准测试题目，使得高分不代表真实能力而是记忆  ✓
- C. 不同团队使用同一基准导致比较不公平
- D. 基准题目质量低下导致评估失效

**解析**: 若训练数据（Web 爬取）包含 MMLU 原题（这在公开数据集中非常常见），模型直接记忆答案，高分不代表真实推理能力。检测方法：(1) N-gram 重叠检测（训练数据与基准题目的文本相似度）；(2) 用变体题目（改写同类问题）对比性能；(3) 动态基准（每次测试生成新题目）。这是为什么最新、私有的基准更有价值。
