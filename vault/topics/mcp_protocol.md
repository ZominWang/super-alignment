---
id: "mcp_protocol"
name: "MCP协议与工具集成"
name_en: "Model Context Protocol (MCP)"
type: "topic"
level: 3
area: "application"
direction: "agent"
prerequisites: ["tool_use", "agent_basics"]
difficulty: 2
importance: 5
status: "unknown"
tags: ["mcp", "tool-integration", "agent", "protocol", "claude", "anthropic"]
---

MCP（Model Context Protocol）是 Anthropic 于 2024 年发布的开放协议，定义了 AI 模型与外部工具、数据源之间的标准通信方式。通过 MCP，Agent 可以安全地接入文件系统、数据库、浏览器、代码执行环境等工具，而无需为每个工具单独开发适配层。它正在成为 AI 工具集成的行业标准。

## Quiz

### Q1
**问题**: MCP（Model Context Protocol）解决的核心问题是什么？

- A. 让 LLM 生成更长的回复
- B. 为 AI 模型与外部工具/数据源之间提供标准化的通信协议，避免每个工具都要单独开发适配层  ✓
- C. 压缩模型推理时的显存占用
- D. 让多个模型同时处理同一个请求

**解析**: MCP 本质上是一个"接口规范"。在 MCP 出现前，每接入一个工具（搜索、数据库、文件系统）都需要为每个模型单独适配。MCP 定义了统一的 Server/Client 架构：工具开发者实现 MCP Server，模型通过 MCP Client 调用，从此工具和模型可以自由组合，极大降低集成成本。

### Q2
**问题**: 在 MCP 架构中，"MCP Server"和"MCP Client"分别是什么角色？

- A. Server 是云端模型，Client 是本地应用
- B. Server 是提供具体工具能力的程序（如文件读写、数据库查询），Client 是 AI 应用（如 Claude Desktop），负责调用 Server 提供的工具  ✓
- C. Server 管理用户权限，Client 管理模型权重
- D. Server 和 Client 都是指 LLM 模型本身的不同组件

**解析**: MCP Server：由工具开发者编写，暴露一组 "Tools" 和 "Resources"。例如一个文件系统 MCP Server 可以提供 read_file、write_file、list_directory 等工具。MCP Client：集成在 AI 应用中（如 Claude Desktop、Claude Code），负责发现 Server 提供了哪些工具，在需要时调用它们，并将结果返回给模型。

### Q3
**问题**: 使用 MCP 接入工具时，下面哪项安全考虑最关键？

- A. MCP 工具调用完全安全，不需要任何权限控制
- B. 要仔细审查 MCP Server 的权限范围，因为 Agent 通过 MCP 可以操作文件、数据库、浏览器等真实系统，错误或恶意的工具调用可能造成不可逆操作  ✓
- C. MCP 只能读取数据，不能修改任何内容
- D. MCP 服务端必须部署在云端才能使用

**解析**: MCP 的强大也带来风险：Agent 通过 MCP 可以真正操作现实世界（删除文件、发送邮件、执行代码）。关键安全原则：①最小权限原则，只给 Agent 需要的工具；②操作前确认，特别是写入、删除类操作；③审查第三方 MCP Server，确保来源可信；④沙箱隔离，文件操作限制在指定目录。理解"Agent 能做什么"和"Agent 应该做什么"的边界至关重要。
