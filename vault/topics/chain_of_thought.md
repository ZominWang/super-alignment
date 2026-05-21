---
id: "chain_of_thought"
name: "思维链CoT"
name_en: "Chain of Thought (CoT)"
type: "topic"
level: 3
area: "application"
direction: "prompt_eng"
prerequisites: ["basic_prompting"]
difficulty: 2
importance: 5
status: "unknown"
tags: ["prompting", "chain-of-thought", "reasoning", "step-by-step"]
---

思维链（CoT）提示通过引导 LLM 逐步推理来解决需要多步计算或逻辑推断的复杂问题。"Let's think step by step"这样的简单触发词可以显著提升推理能力，Zero-shot CoT 和 Few-shot CoT 是两种主要变体，Self-Consistency 进一步提升准确率。

## Quiz

### Q1
**问题**: "Zero-shot Chain-of-Thought"是什么，它与 Few-shot CoT 的区别在哪里？

- A. Zero-shot CoT 不使用任何提示，直接给出答案
- B. Zero-shot CoT 仅添加"让我们一步步思考"类指令触发推理，不提供推理示例；Few-shot CoT 提供带推理过程的完整示例  ✓
- C. Zero-shot CoT 需要更大的模型才有效
- D. Zero-shot CoT 是训练技术，Few-shot CoT 是推理技术

**解析**: Kojima 等（2022）发现只需在问题后加"Let's think step by step"，LLM 就会自动产生推理链，无需任何示例。Few-shot CoT（Wei 等，2022）则提供 8 个完整的"问题→推理→答案"示例，在复杂推理任务上效果更好但 token 消耗更多。

### Q2
**问题**: Self-Consistency（自一致性）如何提升 CoT 的准确率？

- A. 多次运行同一提示，选择最长的推理链
- B. 使用相同提示生成多条推理路径（高温度采样），通过多数投票选择最终答案  ✓
- C. 让 LLM 自我检查并修正推理错误
- D. 将多个不同模型的 CoT 结果合并

**解析**: Self-Consistency（Wang 等，2022）基于观察：正确答案往往通过多条不同推理路径都能到达。使用 temperature>0 采样多次（如10次），每次产生不同推理链但可能到达相同答案，最终取多数投票的答案。在数学推理和常识推理上可提升 10-20 个百分点。

### Q3
**问题**: Tree of Thoughts（ToT）相比线性 CoT 的核心改进是什么？

- A. ToT 将推理链分割为更短的步骤
- B. ToT 在每个推理步骤探索多个分支并使用搜索算法（BFS/DFS）选择最优路径  ✓
- C. ToT 使用多个 LLM 协作推理
- D. ToT 只适用于数学问题

**解析**: 线性 CoT 是深度优先的单路径推理，若某步出错则全盘皆输。ToT 在每步生成多个候选思维，用启发式评估函数（LLM 自评或投票）选择最有希望的分支，使用 BFS 或 DFS 搜索。适合需要探索、规划的任务（如 24 点游戏、创意写作规划），但 token 消耗大幅增加。
