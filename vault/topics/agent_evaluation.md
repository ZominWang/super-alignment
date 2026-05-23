---
id: "agent_evaluation"
name: "Agent系统评估"
name_en: "Agent Evaluation"
type: "topic"
level: 3
area: "application"
direction: "agent"
prerequisites: ["agent_basics", "agent_design_patterns", "llm_evaluation"]
difficulty: 3
importance: 3
status: "unknown"
tags: ["agent-evaluation", "benchmark", "swe-bench", "webarena", "gaia"]
---

Agent 系统评估面临独特挑战：单个模型评估只需看一次输入输出，而 Agent 涉及多步交互（思考→行动→观察→再思考）、环境不确定性（网页内容变化、API 偶发失败）、工具链依赖（搜索质量受搜索引擎影响，代码执行受沙箱环境影响），评估维度远超文本质量的范畴。当前主流基准从不同角度测量 Agent 能力：SWE-Bench 从 GitHub 真实 issue 中提取 2294 个任务，要求 Agent 在完整代码仓库中定位并修复 bug，通过执行已有的单元测试验证修复正确性——是目前含金量最高的 Agent 工程能力评测；WebArena 构建了 812 个网站导航任务（电商购物、论坛发帖、CMS 管理等），Agent 需要在逼真的浏览器环境中完成多步交互；GAIA 评测多模态多步推理（466 个问题），Agent 需要搜索信息、理解图片/音频/表格、进行逻辑推理；AgentBench 覆盖 8 种环境（操作系统、数据库、知识图谱、卡牌游戏等）给出全面评估；τ-bench 关注 Agent-用户交互过程的质量。评估指标包括：任务成功率（primary metric）、步骤效率（是否绕弯路）、工具使用正确率、端到端延迟和 Token 成本。pass@k 策略在 Agent 评估中尤为重要——Agent 可能因环境随机性或 LLM 温度而偶然失败，允许 k 次尝试取最好结果更公平地评价能力上限。LLM-as-Judge 用于评估 Agent 轨迹长度和质量的场景（如评判 Agent 的推理质量、是否有不必要的工具调用）。

## Quiz

### Q1
**问题**: SWE-Bench 为什么被认为是 Agent 评估中含金量最高的基准？

- A. 任务数量最多，覆盖 10000+ 个编程语言
- B. 使用真实的 GitHub issue 和完整的代码仓库，Agent 必须理解项目结构、定位 bug、生成 patch，并用项目的已有单元测试验证——高度模拟真实软件工程场景 ✓
- C. 提供人工标注的标准答案供对比
- D. 评测速度极快，几分钟即可完成全部任务

**解析**: SWE-Bench 的独特价值在于：(1) 真实性——issue 来自 GitHub 上的 Python 开源项目真实 bug 报告，不是人工编造的题目；(2) 完整性——每个任务包含整个代码仓库（几百到几千个文件），Agent 必须理解项目结构才能定位问题；(3) 客观评估——已有单元测试充当自动评判标准（test pass → solved），无需人工评分；(4) 难度层次——从简单的单文件修复到跨模块重构，区分度好。Pass@1 从 2023 年的 ~0% 到 2024 年底突破 50%，记录了 Agent 工程能力的跃升。

### Q2
**问题**: pass@k 评估策略在 Agent 场景中为什么比模型评估场景更有必要？

- A. Agent 的运行速度比模型慢，需要更多样本
- B. Agent 的失败可能来自非确定性因素（LLM 采样随机性、环境响应波动、工具调用偶发失败），单次失败不代表能力不足；pass@k 降低"运气成分"的影响，评估 Agent 的潜能上限 ✓
- C. pass@k 能够减少评估的计算成本
- D. Agent 必须多次运行才能正确执行

**解析**: 单个 LLM 输出一段文本的评估相对确定（换几次采样答案可能稍有不同但基本一致）。Agent 则不然：某次运行时一个关键搜索结果没命中、一个工具调用格式稍有偏差被拒绝、网页加载超时——这些事件与 Agent 的核心能力无关，却可能导致任务失败。pass@k（允许 k 次独立执行，只要有一次成功即算通过）能更公平地评估"Agent 有没有解决这个问题的潜能"，而非"Agent 是否每次都能稳定解决"。实际使用中 pass@1 评估可靠性，pass@k 评估能力天花板。

### Q3
**问题**: 使用 LLM-as-Judge 评估 Agent 轨迹（trajectory）的主要风险和应对措施是什么？

- A. LLM-as-Judge 速度太慢；通过 GPU 加速解决
- B. LLM-as-Judge 可能对"长得好看但实质无效"的轨迹打高分（偏好长轨迹、偏好自信语气）；通过多维评分量规、与人工评估校准、使用多个 Judge 交叉验证来缓解 ✓
- C. LLM-as-Judge 无法理解 Agent 的工具调用
- D. LLM-as-Judge 的评估成本远高于人工评估

**解析**: LLM-as-Judge 评估 Agent 轨迹的典型偏差：位置偏差（更偏好第一个或最后一个候选）、冗长偏差（长轨迹看起来更"努力"）、自我偏好（Judge 模型对与自身输出风格相似的轨迹打高分）。应对策略：(1) 设计细粒度评分量规（不是"好不好"，而是"第几步的工具选择是否正确"、"是否有不必要的工具调用"）；(2) 与少量人工标注样本校准 judge 的一致性（correlation > 0.7 才可信）；(3) 使用多个不同模型做 judge 并投票；(4) 随机交换候选轨迹的位置消除位置偏差。

## 参考资料

### 论文
- **[SWE-bench: Can Language Models Resolve Real-World GitHub Issues?]** (Jimenez et al., 2024) — 从 GitHub 真实 issue 中提取 2294 个任务，要求 Agent 在完整代码仓库中定位并修复 bug，通过单元测试验证修复正确性。https://arxiv.org/abs/2310.06770
- **[WebArena: A Realistic Web Environment for Building Autonomous Agents]** (Zhou et al., 2024) — 构建了 812 个网站导航任务，Agent 需要在逼真的浏览器环境中完成多步交互。https://arxiv.org/abs/2307.13854
- **[AgentBench: Evaluating LLMs as Agents]** (Liu et al., 2024) — 覆盖 8 种环境（操作系统、数据库、知识图谱、卡牌游戏等）的全面 Agent 评估基准。https://arxiv.org/abs/2308.03688
