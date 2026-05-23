---
id: "llm_testing"
name: "LLM应用测试"
name_en: "LLM Application Testing"
type: "topic"
level: 3
area: "engineering"
direction: "eval_quality"
prerequisites: ["llm_evaluation"]
difficulty: 3
importance: 3
status: "unknown"
tags: ["evaluation", "testing", "unit-test", "regression", "ci-cd"]
---

LLM 应用测试面临独特挑战：输出是概率性的，无法用精确断言。测试策略包括行为测试（不关心具体输出，只验证属性）、快照测试（捕获输出并与基准对比）、和 CI/CD 中的回归测试流水线，Promptfoo 等工具专门解决这个问题。

## Quiz

### Q1
**问题**: 对 LLM 应用进行"行为测试"（Behavioral Testing）时，以下哪种断言是合理的？

- A. `assert response == "我不知道如何帮助你"` （精确字符串匹配）
- B. `assert "道歉" not in response and len(response) > 50` （验证属性：不道歉且有足够内容）  ✓
- C. `assert response.startswith("根据")` （精确前缀匹配）
- D. 对 LLM 输出无法进行任何自动化测试

**解析**: LLM 输出是非确定性的，精确字符串断言会频繁失败。行为测试验证"属性"而非"内容"：响应不含特定有害词汇、JSON 格式合法且包含必需字段、响应长度在合理范围内、答案被另一个 LLM 判断为正面等。这类测试稳定且有实际意义。

### Q2
**问题**: Promptfoo 等工具如何解决 LLM 提示词修改的回归测试问题？

- A. 自动生成新的测试用例
- B. 对修改前后的提示词运行相同的测试集，并排比较输出差异，量化回归影响  ✓
- C. 确保提示词修改不影响推理速度
- D. 只测试提示词的语法正确性

**解析**: 修改提示词是日常操作，但每次修改可能引入意想不到的回归（在改善某个用例的同时破坏另一个）。Promptfoo：(1) 定义测试用例和断言（支持 LLM Judge、字符串包含、正则等）；(2) 对多个提示词版本并行运行；(3) 输出对比报告（哪些用例通过/失败，哪个版本总体更好）；(4) 集成 CI/CD 在 PR 时自动运行。

### Q3
**问题**: "对抗性测试"（Adversarial Testing）在 LLM 应用中的主要目标是什么？

- A. 测试 LLM 在低延迟下的性能
- B. 主动构造边界情况和恶意输入，发现模型在安全性、鲁棒性和格式遵循方面的弱点  ✓
- C. 测试 LLM 与竞争对手模型的性能对比
- D. 测试 LLM 在大并发下的稳定性

**解析**: 对抗性测试类型：(1) 安全红队（越狱尝试、有害内容生成）；(2) 提示注入（试图覆盖系统提示）；(3) 边界情况（极长输入、多语言混合、特殊字符）；(4) 格式破坏（期望 JSON 输出但输入会诱导 LLM 不遵循格式）。在发布前系统性进行对抗测试是负责任 AI 工程的基础。

## 参考资料

### 博文/教程
- **[Promptfoo Documentation]** — Promptfoo 官方文档。开源 LLM 测试工具，支持多提示版本并行评测、LLM Judge 断言、CI/CD 集成，是提示词回归测试的实用框架。https://promptfoo.dev/docs/intro
- **[Testing LLM Applications]** — Hamel Husain 博客。系统介绍行为测试、快照测试、对抗测试在 LLM 应用中的实践方法，并给出不同场景的测试策略选择建议。https://hamel.dev/blog/posts/llm-testing/
- **[How to Evaluate, Compare, and Optimize LLM Systems]** — LangChain 博客。介绍如何构建评测数据集、选择合适指标、并在 CI/CD 中自动化 LLM 回归测试的完整工作流。https://blog.langchain.dev/
