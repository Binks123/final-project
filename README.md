# 智能烹饪助手

一个基于大型语言模型（LLM）的智能做菜推荐系统，利用 HowToCook 开源菜谱库，为用户提供个性化的菜单推荐、购物清单生成和做菜流程规划、做菜步骤，达到小白都知道“吃什么、怎么做”的目标。

### 数据流

```mermaid
graph LR
    A[HowToCook MD文件] --> B[RecipeParser]
    B --> C[RawRecipe JSON]
    C --> D[LLM智能打标]
    D --> E[ProcessedRecipe]
    E --> F[双文件存储]
    F --> G[KnowledgeBase]
    G --> H[AI Agents]
    H --> I[CLI界面]
```

### 环境要求

- Node.js >= 16.0.0
- npm 或 yarn 包管理器
- Lora
- Python>=11.0

### 🔧 安装步骤

1. **克隆项目**
   
   ```bash
   git clone <repository-url>
   cd CookBookAgent
   ```

2. **安装依赖**
   
   ```bash
   npm install
   ```

3. **配置环境变量**
   
   ```bash
   cp .env.example .env
   ```

编辑 `.env` 文件，配置你的 API 设置：

```env
# OpenAI 配置
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1  # 自定义API端点，需要服务器开放模型接口
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_TEMPERATURE=0.3

# 数据处理配置
OPENAI_MAX_TOKENS=2048
BATCH_SIZE=10
REQUEST_DELAY_MS=1000
```

**启动应用**

```bash
# 开发模式（推荐）
npm run dev
```

# 或编译后启动

```
npm run build
npm start
```

```
## 📖 使用指南

### 💭 **对话示例**
```

您: 我们家三口人想吃点辣的菜，有小孩不要太辣

 CookingAgent: 🎯 根据您的需求，我为您推荐以下菜单：

1. **微辣宫保鸡丁**
   适合家庭聚餐，微辣口感小朋友也能接受

2. **清炒时蔬**
   清爽素菜，平衡荤腥，提供丰富维生素

3. **紫菜蛋花汤**
   温和汤品，有助消化，丰富用餐层次

您可以:
• 输入"确认"接受这个菜单
• 输入"换掉[菜名]"来替换某道菜
• 告诉我您的具体要求来调整菜单

```
### 🎛️ **命令行选项**

- **退出程序**: 输入 `退出`、`quit` 或 `exit`
- **重新开始**: 输入 `重新开始` 或 `重新规划`
- **菜品替换**: `换掉[菜名]` 或 `不要[菜名]`
- **确认菜单**: `确认`、`好的`、`就这些`

## 🛠️ 开发指南

### 📁 **项目结构**
```

```
CookBookAgent/
├── src/ # 源代码
│ ├── agents/ # AI 智能体
│ ├── lib/ # 核心库
│ ├── components/ # 相关组件
│ └── types/ # 类型定义
├── scripts/ # 数据处理脚本
│ └── data-processing/ # 数据处理模块
├── data/ # 处理后的菜谱数据
├── docs/ # 项目文档
└── HowToCook/ # 外部数据源（需单独获取）

├── results/ 训练曲线图
├── model/ # 模型checkpoint
```