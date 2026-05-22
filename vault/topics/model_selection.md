---
id: "model_selection"
name: "模型选型与能力对比"
name_en: "Model Selection & Capability Comparison"
type: "topic"
level: 3
area: "engineering"
direction: "dev_frameworks"
prerequisites: ["llm_capabilities", "openai_api"]
difficulty: 2
importance: 5
status: "unknown"
tags: ["model-selection", "gpt", "claude", "gemini", "llama", "cost", "benchmark", "engineering"]
---

面对 GPT-4o、Claude Sonnet、Gemini、Llama 等众多模型，如何选择适合具体场景的模型是工程实践的关键决策。选型维度包括：任务类型（推理/代码/多语言）、上下文窗口大小、响应速度、调用成本、数据隐私要求以及是否需要本地部署。没有"最好的模型"，只有"最适合当前需求的模型"。

## Quiz

### Q1
**问题**: 构建一个需要处理100页PDF报告、进行深度分析的应用，以下哪个模型特性最关键？

- A. 模型的参数量越大越好
- B. 超长上下文窗口（如 128K+ tokens），使模型能在单次请求中处理完整文档  ✓
- C. 模型的响应速度越快越好
- D. 模型的训练数据集越新越好

**解析**: 处理长文档的核心瓶颈是上下文窗口大小。100页PDF约15-25万字（7-12万tokens），如果上下文窗口不够，就只能分块处理，丢失跨段落关联信息。Claude系列和Gemini 1.5系列提供超长上下文（100K-200K tokens）。参数量大不代表上下文长，GPT-3.5参数多但上下文窗口小；响应速度和训练数据新鲜度在此场景是次要因素。

### Q2
**问题**: 一家初创公司需要为用户提供实时聊天支持，每天处理约10万次对话，成本控制严格。以下哪个模型选型策略最合理？

- A. 直接使用最强的旗舰模型（如 GPT-4o 或 Claude Opus）以确保质量
- B. 用小型/中型模型（如 GPT-4o-mini、Claude Haiku、Gemini Flash）处理常见问题，仅对复杂问题路由到旗舰模型  ✓
- C. 使用开源模型（如 Llama）自己部署，彻底避免 API 费用
- D. 每次请求都让多个模型投票，取最优结果

**解析**: 成本敏感场景应使用模型路由策略。小型模型（GPT-4o-mini约$0.15/M tokens vs GPT-4o约$5/M tokens，差33倍）能处理大多数日常对话。对复杂、高价值的请求再调用旗舰模型。自部署开源模型能省API费但有运维成本和技术门槛；多模型投票成本翻倍且延迟高。路由策略是工业界常见最优解。

### Q3
**问题**: 以下哪个场景最适合考虑使用开源模型（如 Llama、Qwen、Mistral）自部署？

- A. 需要最快速开发上线，团队没有ML运维能力
- B. 处理高度敏感的用户数据（如医疗记录），数据不能离开公司内网，且团队有GPU资源和运维能力  ✓
- C. 需要最强的推理和编码能力，不在意成本
- D. 产品处于早期验证阶段，用户量很小

**解析**: 开源模型自部署的核心优势是：数据完全留在自己控制的环境中（不发往任何第三方API）。在医疗、金融、政府等对数据隐私有严格要求的领域，这往往是硬性需求。但前提是有GPU资源和团队有能力维护推理服务（vLLM、Ollama等）。快速开发、强能力需求、早期验证这三种场景更适合用托管API——省掉运维开销，专注产品。
