---
id: "text_to_sql"
name: "Text-to-SQL与数据库Agent"
name_en: "Text-to-SQL and Database Agents"
type: "topic"
level: 3
area: "application"
direction: "agent"
prerequisites: ["agent_basics", "structured_output", "tool_use"]
difficulty: 3
importance: 3
status: "unknown"
tags: ["text-to-sql", "database", "nl2sql", "data-analysis", "query-generation"]
---

Text-to-SQL将自然语言查询转化为可执行的SQL语句，核心挑战在于跨域Schema理解、复杂查询组合和SQL语法正确性。传统方法依赖seq2seq模型加Schema编码，而LLM方法带来了突破：Few-shot Prompt + Schema信息注入（将表名、列名、主外键关系、示例数据以结构化Prompt输入），让模型在上下文中理解数据库结构。DIN-SQL的分解式策略最具代表性：(1) Schema Linking——识别与问题相关的表和列；(2) Query Classification——判断查询类型（简单/嵌套/聚合）；(3) SQL Generation——按难度分级生成SQL；(4) Self-Correction——执行后根据错误信息修正。DAIL-SQL则研究了Prompt工程的最佳实践：Schema序列化方式、Few-shot样例选择策略、多轮对话优化。Agent模式下，智能体可自主探索未知数据库Schema、多步交互查询、执行并验证结果、修复错误SQL。主流基准：Spider（跨领域复杂数据库）、WikiSQL（单表简单查询）、BIRD（大规模真实数据库）。

## Quiz

### Q1
**问题**: DIN-SQL的分解式策略中，Schema Linking步骤为何必须放在SQL Generation之前？

- A. 减少Prompt长度
- B. 首先筛选出与问题相关的表和列（例如问题涉及"销售额"则关联到orders表、products表、sales列），而非将完整Schema（可能有数百列）全部注入Prompt，从而降低LLM的信息干扰和Token消耗  ✓
- C. Schema Linking与SQL Generation可以并行执行
- D. 只是为了提高处理速度

**解析**: 真实企业数据库可能有50+表、500+列，直接将完整Schema注入Prompt会导致：(1) Token超限；(2) 不相关列干扰LLM注意力（模型可能错误地将无关列联接到查询中）；(3) 增加幻觉概率（模型编造不存在的列名）。Schema Linking通过LLM先做一步粗筛：Prompt="问题：统计各产品类别的季度销售额。Schema：...[列出所有表和列的简要描述]...请列出回答此问题需要的表和列。" 输出如"categories.name, products.category_id, orders.order_date, order_items.quantity, order_items.unit_price"。后续SQL生成只需注入这些筛选后的Schema，大幅降低复杂度和出错率。

### Q2
**问题**: 在Text-to-SQL Agent中，"先探索Schema"的策略相比"一次性注入Schema"有何优势？

- A. 没有优势，结果一样
- B. Agent可以通过执行试探性SQL（如`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='orders'`）动态了解未知数据库结构，尤其适用于Schema文档不完整或数据库设计不熟悉的场景  ✓
- C. 只有处理小型数据库时需要
- D. 完全由LLM推断Schema

**解析**: Agent探索策略类比人类数据分析师的操作：面对新数据库时先执行`SHOW TABLES`→选择相关表→执行`DESCRIBE table_name`或查询`information_schema`→抽样查看数据（`SELECT * FROM orders LIMIT 5`）了解实际数据分布和格式→理解了业务语义后才开始编写真正的查询SQL。这种动态探索解决了：(1) Schema文档可能过时或缺失；(2) 列名的字面名称与业务含义间有差距（如列名"status"，值是1/2/3还是"pending"/"done"？）；(3) 数据类型与约束条件（如日期列的格式、外键关系是否强制执行）。

### Q3
**问题**: BIRD基准相比Spider基准对Text-to-SQL系统提出了什么额外挑战？

- A. 更简单的查询
- B. BIRD使用真实的大规模数据库（有的包含1000+列），数据库内容不可见（需要模型从列名推断而非从数据中学习），查询更复杂，且要求"数据库内容知识"——例如"找出最新上映的电影"需要模型知道什么数据算"新"  ✓
- C. BIRD只需要回答是/否问题
- D. BIRD数据库比Spider更小

**解析**: BIRD(Big Bench for LaRge-scale Database grounded Text-to-SQL Evaluation)与Spider的核心区别：(1) 规模：BIRD数据库平均有7.3表/54.9列（远大于Spider的4.1表/21.8列）；(2) Memory Challenge：BIRD要求"数据库内容推理"，如"列出资产超过1000亿的公司"→模型需要知道数据库中1000亿的数值单位是元/美元/万元；(3) 真实世界噪声：列名不直观（如"TD001"而非"order_date"）、数据格式不一致；(4) External Knowledge：需要领域知识（如医学/金融术语）来理解问题和Schema的对应关系。BIRD更接近生产环境Text-to-SQL的真实难度。

## 参考资料

### 论文
- **[Spider: A Large-Scale Human-Labeled Dataset for Complex and Cross-Domain Semantic Parsing and Text-to-SQL Task](https://arxiv.org/abs/1809.08887)** (Yu et al., 2018) — 提出 Spider 跨域 Text-to-SQL 基准，包含 10,181 个复杂查询和 200 个数据库，至今仍是最广泛使用的评测基准。https://arxiv.org/abs/1809.08887
- **[DIN-SQL: Decomposed In-Context Learning of Text-to-SQL with Self-Correction](https://arxiv.org/abs/2304.11015)** (Pourreza & Rafiei, 2023) — 提出分解式 Text-to-SQL 策略（Schema Linking → Query Classification → SQL Generation → Self-Correction），在 Spider 和 BIRD 上取得显著性能提升。https://arxiv.org/abs/2304.11015
- **[BIRD: A Big Bench for Large-Scale Database Grounded Text-to-SQLs](https://arxiv.org/abs/2305.03111)** (Li et al., 2023) — 提出 BIRD 基准，使用真实大规模数据库并要求数据库内容推理，更接近生产环境难度，是当前最具挑战性的 Text-to-SQL 评测。https://arxiv.org/abs/2305.03111

