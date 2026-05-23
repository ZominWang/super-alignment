---
id: "self_rag"
name: "Self-RAG自反思检索"
name_en: "Self-RAG - Self-Reflective RAG"
type: "topic"
level: 3
area: "application"
direction: "rag"
prerequisites: ["rag_basics", "advanced_rag"]
difficulty: 4
importance: 3
status: "unknown"
tags: ["self-rag", "reflection", "retrieval", "critique", "quality"]
---

Self-RAG（Self-Reflective Retrieval-Augmented Generation）由 Akari Asai 等人于 2023 年提出，核心理念是训练 LLM 在生成过程中自主输出"反思 Token"（Special Reflection Tokens）来控制检索行为并评估生成质量，实现了检索决策的智能化。反思 Token 有三类：(1) Retrieve 判定——每个段落生成前，模型先输出 <Retrieve> 或 <NoRetrieve>，决定是否需要检索外部知识；(2) ISREL（Is Relevant）——对检索到的每个文档片段判断其是否与问题相关；(3) ISSUP（Is Supported）——检查生成的句子是否被检索文档支撑；(4) ISUSE（Is Useful）——判断生成内容整体是否有用。这些 Token 的预测能力通过在标注数据上微调获得——训练数据来自 GPT-4 对模型原始输出进行批判性标注。Self-RAG 的工作流：收到问题 → 模型先决定是否检索 → 若检索，将检索结果插入上下文，模型逐句生成并标注 ISREL/ISSUP → 每次生成一段后重新评估 → 若 ISSUP 反馈低则重新检索并改写相关段落。与标准 RAG 的对比：(1) 标准 RAG "总是检索"——对于"1+1 等于几"这类闭卷问题也白白检索，浪费延迟和成本；(2) 标准 RAG "检索完了就用"——即使返回了不相关的文档，LLM 也被动嵌入答案，容易产生基于错误上下文的幻觉；(3) 标准 RAG "没有质量把控"——生成后无法判断回答是否基于检索内容。Self-RAG 通过反思 Token 将检索从"外挂"提升为"内建能力"。与 Agentic RAG 的关系：两者都是智能检索，但 Self-RAG 通过模型内部 Token 实现反射式控制，Agentic RAG 通过外部循环和工具调用实现决策——前者更高效（一次生成中完成），后者更灵活（可组合多种检索策略）。

## Quiz

### Q1
**问题**: Self-RAG 中的"训练模型输出反思 Token"与传统方法（如 prompt 工程引导模型自评）相比，根本区别是什么？

- A. 反思 Token 用起来更简单，不需要写 prompt
- B. 反思 Token 通过微调内化为模型的原生生成行为，在推理时以固定位置自动触发且可被程序解析，而非依赖 prompt 引导的不可靠自然语言输出 ✓
- C. 反思 Token 只对特定领域有效
- D. 反思 Token 不需要任何训练数据

**解析**: prompt 工程做法：在系统提示中告诉模型"请在回答前判断是否需要检索。如果需要，输出 [RETRIEVE]"，但 LLM 可能不听话（漏掉标记、用自然语言而非标记、忘记判断）。反思 Token 通过收集标注数据（模型原始输出 → 人工/GPT-4 判定每个位置该输出什么 Token → 建立训练对）进行微调，将反思行为写入模型权重。推理时，这些 Token 像语言模型中的标点符号一样自然出现，且输出位置固定可被解析器可靠截获。这是一种"编译式"而非"解释式"的反思实现。

### Q2
**问题**: Self-RAG 的 "ISSUP"（Is Supported）Token 和一般 RAG 系统中的"引用/溯源"机制有什么本质不同？

- A. 两者完全相同，只是名称不同
- B. ISSUP 在生成过程中实时逐句判断——一边写一边自我核查"我说的这句话在检索文档中有根据吗"，如果发现没有支撑就触发纠正行为（重新检索/重写）；引用溯源只在生成完成后标注来源，不具有反馈控制作用 ✓
- C. ISSUP 需要外部知识库支持，引用溯源不需要
- D. ISSUP 比引用溯源需要更多 GPU 内存

**解析**: 传统 RAG 的引用溯源是"事后标注"：LLM 生成完整答案后再回头标注哪些部分来自哪些文档。这有两个问题：(1) 如果中间某句话是幻觉，生成已完成，覆水难收；(2) 标注过程可能不可靠，模型可能把幻觉内容也"引用"到无关文档。ISSUP 实现了"过程控制"：模型在生成第 k 句话后立即输出 <ISSUP> 或 <NOTSUP>，若为 NOTSUP，触发器可以指示模型"最后这句话没有来源支撑，请查阅文档重新表述"。这是一种类似人类写作中"写一句、检查一句"的质量控制闭环。

### Q3
**问题**: 以下哪种场景中，Self-RAG 相比标准 RAG（总是检索）的优势最明显？

- A. 回答所有关于公司内部知识库的问题，因为总能检索到相关内容
- B. 回答用户的闲聊或常识性问题（如"今天天气真好，你觉得呢"），Self-RAG 通过 <NoRetrieve> 跳过不必要的检索，既节省延迟又避免无关检索内容污染回答 ✓
- C. 回答需要引用特定法律条款的精确法律问题
- D. 生成需要大量上下文的长篇小说续写

**解析**: 标准 RAG 对每个问题都执行检索→嵌入查询→向量搜索→排序→构建提示，这个流程至少增加 200-500ms 延迟和额外的 token 消耗。当用户说"你好"或"今天天气怎么样"时，检索出的文档片段（如关于晴天气象学的技术文章）不仅多余，还可能误导 LLM 生成不恰当的回答（如把聊天变成科普讲座）。Self-RAG 模型学到这类问题不需要检索（训练数据中标注员标记为 <NoRetrieve>），直接快速回答。同理，像数学计算、翻译、简单常识等闭卷任务也能智能跳过检索步骤。

## 参考资料

### 论文
- **[Self-RAG: Learning to Retrieve, Generate, and Critique through Self-Reflection]** (Asai et al., 2024) — 训练 LLM 在生成过程中自主输出反思 Token 来控制检索行为并评估生成质量。https://arxiv.org/abs/2310.11511
- **[Corrective Retrieval Augmented Generation]** (Yan et al., 2024) — 提出纠正性检索增强生成，在检索结果不相关时自动纠正检索方向。https://arxiv.org/abs/2401.15884
