# 按课/混合词语选择功能设计

**日期**: 2026-05-10  
**状态**: 待实现

---

## 背景

当前 `WordSelectorView` 将五年级和六年级词语以平铺大列表展示，用户无法按具体课次选词。新加坡华文教材以课为单位组织词语，学生通常需要针对单课备考，同时也需要跨年级混合练习。

---

## 目标

在主页新增四种"快速听写"入口：

1. **按课听写** — 选年级 → 选课 → 进入词语列表（默认全选）→ 开始
2. **五年级混合** — 直接进入五年级全部词语的选词界面
3. **六年级混合** — 直接进入六年级全部词语的选词界面
4. **全部混合** — 五六年级词语合并的选词界面

---

## 数据层设计

### 类型变更（`src/types/index.ts`）

```ts
export type ViewMode = 'wordlists' | 'lessonSelector' | 'wordSelector' | 'dictation' | 'study';

export interface WordList {
  // 现有字段不变 ...
  lesson?: number;       // 课次编号，1-17 (P5), 1-12 (P6)
  lessonTitle?: string;  // 课题，如《到户外去》
}
```

### 新增 WordList 条目（`src/data/wordLists.ts`）

每课一个 `WordList` 条目，Word 对象 **复用现有 ID**（如 `zh5-w001`），保证统计数据共享。

**五年级共 17 课：**

| 课次 | 标题 | txt 词语数 |
|------|------|-----------|
| 1 | 《到户外去》 | 20 |
| 2 | 《身体会说话》 | 20 |
| 3 | 《懂事的你》 | 24 |
| 4 | 《分享是快乐的》 | 20 |
| 5 | 《我闯祸了》 | 20 |
| 6 | 《我的东西找到了》 | 20 |
| 7 | 《一千桶水》 | 20 |
| 8 | 《和时间赛跑》 | 24 |
| 9 | 《很久很久以前》 | 20 |
| 10 | 《成长的烦恼》 | 20 |
| 11 | 《同学之间》 | 20 |
| 12 | 《新加坡，我为你骄傲》 | 20 |
| 13 | 《汉字王国》 | 20 |
| 14 | 《老师，谢谢您》 | 20 |
| 15 | 《想当一棵树》 | 20 |
| 16 | 《语言的力量》 | 20 |
| 17 | 《世界那么大》 | 20 |

**六年级共 12 课：**

| 课次 | 标题 | 词语数 |
|------|------|--------|
| 1 | 《加油！加油！》 | 21 |
| 2 | 《祖孙情》 | 23 |
| 3 | 《美食小侦探》 | 20 |
| 4 | 《宝贵的礼物》 | 20 |
| 5 | 《成语故事三则》 | 21 |
| 6 | 《精彩三国》 | 21 |
| 7 | 《世界走透透》 | 21 |
| 8 | 《新加坡的过去和现在》 | 23 |
| 9 | 《说龙》 | 23 |
| 10 | 《走遍天下书为伴》 | 24 |
| 11 | 《拥抱未来》 | 23 |
| 12 | 《再见，亲爱的伙伴》 | 23 |

条目 ID 格式：`zh5-lesson01`…`zh5-lesson17`，`zh6-lesson01`…`zh6-lesson12`。

> **注意**：`wordLists.ts` 生成时，跨课重复词（如"感到骄傲"出现在P5第5课和第12课）在平铺列表中只保留一次。因此每课 WordList 的词语需要**按 txt 文件中的课次文字内容**查找对应的 Word 对象 ID，而非简单按顺序截取 ID 区间。某些词的 ID 会跨课共享（stats 天然共享，符合预期）。

现有平铺列表 `zh-grade5` / `zh-grade6` **保留**，供混合模式使用。

---

## 导航设计

### 新 ViewMode：`lessonSelector`

```
WordListView (主页)
  ├── 快速练习区
  │     ├── "按课听写" → view='lessonSelector'
  │     ├── "五年级混合" → view='wordSelector', grade=5, mode='mixed'
  │     ├── "六年级混合" → view='wordSelector', grade=6, mode='mixed'
  │     └── "全部混合" → view='wordSelector', grade='all', mode='mixed'
  └── 词单管理区 (现有列表 + 先学习 / 开始听写，不变)

LessonSelectorView (新)
  ├── 年级 tab: 五年级 | 六年级
  └── 课次卡片 → view='wordSelector', mode='lesson', lessonListId='zh5-lesson01'

WordSelectorView (扩展)
  ├── lesson 模式 (按课)
  └── mixed 模式 (混合，现有行为)
```

### `App.tsx` 新增状态

```ts
const [selectorMode, setSelectorMode] = useState<'lesson' | 'mixed'>('mixed');
const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
```

新增函数：
- `openLessonSelector()` — 跳转到 `lessonSelector` 视图
- `openMixedSelector(grade: GradeFilter)` — 直接进 `wordSelector`（mixed）
- `openLessonDictation(lessonId: string)` — 从课程列表进 `wordSelector`（lesson）

---

## 组件设计

### `WordListView` 变更

顶部保留年级 tab + 新建/加词按钮。

新增**快速练习区**（4 个网格卡片）：

```
[ 按课听写 ]  [ 五年级混合 ]
[ 六年级混合 ] [ 全部混合  ]
```

保留现有**词单管理区**及底部"先学习 | 开始听写"按钮（Study 路径不变）。

### `LessonSelectorView`（新建）

Props:
```ts
interface LessonSelectorViewProps {
  onSelectLesson: (lessonId: string) => void;
}
```

- 顶部年级 tab：五年级 / 六年级
- 课次卡片列表：课次 + 标题 + 词语数量
- 点击卡片 → 调用 `onSelectLesson`

### `WordSelectorView` 扩展

新增 props:
```ts
interface WordSelectorViewProps {
  // 现有 grade, dictationMode, onStart
  mode: 'lesson' | 'mixed';
  lessonListId?: string;  // mode='lesson' 时有值
}
```

**lesson 模式差异：**
- 词语来源：`lessonListId` 对应的 WordList
- 默认全部选中
- Session size 选项：`全部` `5` `10`
- 智能选词区改为两个快捷键按钮：`错误最多前5` `错误最多前10`（点击后覆盖当前勾选）
- 不显示"最久未练"和"近期错误率"规则按钮

**mixed 模式**（现有行为）：
- Session size 选项：`10` `15` `20` `25` `30`
- 保留三个自动选词规则按钮

---

## 错误处理

- 按课模式下若 `lessonListId` 对应 WordList 不存在，显示"暂无词语"空态
- 快速练习区入口对所有用户始终可见（不依赖 grade filter 状态）

---

## 受影响文件清单

| 文件 | 变更类型 |
|------|---------|
| `src/types/index.ts` | 扩展 `WordList`、`ViewMode` |
| `src/data/wordLists.ts` | 新增 29 个课次 WordList 条目 |
| `src/App.tsx` | 新增状态、函数、视图路由 |
| `src/components/WordListView.tsx` | 新增快速练习区 4 个入口 |
| `src/components/LessonSelectorView.tsx` | 新建组件 |
| `src/components/WordSelectorView.tsx` | 扩展 props，按模式渲染不同 UI |
