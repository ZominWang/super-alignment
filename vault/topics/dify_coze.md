---
id: "dify_coze"
name: "Dify与低代码AI平台"
name_en: "Dify and Low-Code AI Platforms"
type: "topic"
level: 3
area: "engineering"
direction: "dev_frameworks"
prerequisites: ["basic_prompting", "llm_capabilities"]
difficulty: 2
importance: 2
status: "unknown"
tags: ["dify", "coze", "low-code", "platform", "rag", "workflow", "ai-application"]
---

低代码AI平台降低了大模型应用开发的门槛，使非技术人员也能快速构建AI应用。Dify是开源的LLM应用开发平台，核心能力包括：可视化工作流编排（拖拽节点构建检索-增强-生成流水线）、RAG流水线配置（文档上传→分段→嵌入→检索）、Prompt IDE（版本化提示词管理与调试）、Agent模式（Function Calling工具链编排）、API一键发布与企业级SSO/权限管理。Coze是字节跳动推出的Bot构建平台，特色包括：多模态Bot创建（文本+图片+语音）、Plugin商店生态、知识库管理、多平台一键分发（Discord/Telegram/Slack等）。两者对比：Dify开源可私有部署（数据安全、可定制），Coze云端闭源（上手快、生态丰富）。适用场景包括非技术人员构建内部AI助手、产品经理快速验证AI方案、轻量RAG应用原型。

## Quiz

### Q1
**问题**: Dify的"知识库"功能中，文档处理的核心流水线是？

- A. 文档直接送入LLM进行分析
- B. 文档上传→分段清洗→元数据提取→嵌入向量化→向量数据库存储，检索时采用混合搜索  ✓
- C. 文档以原始格式存储，检索时全文匹配
- D. 文档手动编写为规则库

**解析**: Dify知识库处理流程：(1) 支持Markdown/PDF/Word/网页等格式上传；(2) 分段模式可选自动分段（按语义边界和最大token数）或自定义分段规则；(3) 可选择Embedding模型（OpenAI/Cohere/本地模型如BGE）；(4) 向量存储支持Qdrant/Weaviate/Milvus等；(5) 检索时支持混合搜索（关键词BM25+向量语义）及Rerank重排序；(6) 分段预览和QA模式自动生成测试集。这套流水线将原本需要数百行代码的RAG系统压缩为可视化配置。

### Q2
**问题**: Dify开源部署相比Coze云端服务，在企业场景中的核心优势是什么？

- A. 功能更丰富
- B. 数据不出企业内网（私有化部署保障数据安全与合规），模型可替换为私有模型，工作流完全可定制  ✓
- C. 免费使用
- D. 社区支持更好

**解析**: 企业AI应用面临的核心痛点是数据安全和合规（如金融/医疗行业数据不能外泄）。Dify通过Docker私有化部署将所有数据锁在企业内网。此外：(1) 支持接入私有部署的开源模型（Llama/Qwen等），避免数据经第三方API；(2) 工作流底层代码开源，可深度定制扩展；(3) SSO/LDAP企业身份认证集成。Coze作为云端服务，数据流经字节跳动服务器，适合个人开发者或对数据安全要求不高的场景。

### Q3
**问题**: 在Dify工作流编排中，一个典型的"智能客服"RAG应用通常包含哪些核心节点？

- A. 只有一个LLM节点
- B. 知识检索节点（从向量库查询相关文档）+ LLM节点（基于检索上下文生成回答）+ 条件分支节点（判断是否需要转人工）+ 代码节点（预处理/后处理）  ✓
- C. 只有API调用节点
- D. 无需编排，Dify自动生成所有逻辑

**解析**: 典型智能客服Dify工作流：(1) 开始节点接收用户query；(2) 条件分支：若为简单问候→直接回复模板；(3) 知识检索节点：query→Embedding→向量库Top-K检索→返回相关文档片段；(4) LLM节点：Prompt="你根据以下知识回答... 知识：{{context}} 问题：{{query}}"，Temperature=0.3确保准确性；(5) 条件分支：LLM输出含"我不知道"→转人工节点；(6) 结束节点输出回复。Dify还支持在节点间添加代码节点做数据转换（如JSON格式化）、HTTP节点调用外部API实现联网搜索补充。

## 参考资料

### 博文/教程
- **[Dify 官方文档]** — Dify.AI。涵盖工作流编排、知识库配置、Agent 模式、API 发布等核心功能的完整说明。https://docs.dify.ai
- **[Coze 官方文档]** — 字节跳动 Coze 平台。介绍 Bot 创建、Plugin 商店、知识库管理和多平台分发的使用指南。https://www.coze.com/docs
- **[Dify vs LangChain: Which LLM Framework Should You Use?]** — Towards Data Science。对比两个框架在易用性、功能覆盖、适用场景上的差异，帮助选型决策。https://towardsdatascience.com/dify-vs-langchain

