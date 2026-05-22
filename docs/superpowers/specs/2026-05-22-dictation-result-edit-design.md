# Design: 听写结果可修改

**Date:** 2026-05-22  
**Status:** Approved

---

## Overview

将听写打分从"即时写入"改为"草稿模式"：每次点 ✓/✗ 只更新内存中的临时草稿，整轮听写内可随时修改；点"完成听写"时才一次性写入 localStorage。提交后按钮禁用，结果锁定。

---

## 1. 数据流

**改前：**
```
用户点 ✓/✗ → saveAttempt() 写入 localStorage → 更新历史记录点
```

**改后：**
```
用户点 ✓/✗ → 更新 sessionMarks Map（内存）→ 可随时修改
点"完成听写" → 遍历 sessionMarks → saveAttempt() 一次性写入 → 显示弹窗 → 锁定
```

---

## 2. DictationView 变化

### 移除的 state

```typescript
// 以下三个 state 全部移除
const [sessionCorrect, setSessionCorrect] = useState(0);
const [sessionTotal, setSessionTotal] = useState(0);
const [sessionWrongWords, setSessionWrongWords] = useState<Word[]>([]);
```

### 新增的 state

```typescript
const [sessionMarks, setSessionMarks] = useState<Map<string, boolean>>(new Map());
```

### 新增的 handler

```typescript
function handleMark(word: Word, correct: boolean) {
  setSessionMarks(prev => {
    const next = new Map(prev);
    next.set(word.id, correct);
    return next;
  });
}
```

点击同一个按钮两次（当前已是该答案）不做任何操作——由 WordCard 负责过滤。

### 统计数据改为从 Map 推导

```typescript
// 在 JSX 或 useMemo 中实时推导，不再用 state
const sessionTotal = sessionMarks.size;
const sessionCorrect = [...sessionMarks.values()].filter(Boolean).length;
const sessionWrongWords = filteredWords.filter(w => sessionMarks.get(w.id) === false);
```

### 提交逻辑

点"完成听写"按钮时（`onClick`）：
1. 遍历 `sessionMarks`，对每条记录调用 `saveAttempt(wordId, correct)`
2. 调用 `setShowCompletion(true)` 显示弹窗

```typescript
function handleComplete() {
  sessionMarks.forEach((correct, wordId) => {
    saveAttempt(wordId, correct);
  });
  setShowCompletion(true);
}
```

### 重置进度时同步清空草稿

```typescript
function handleClearAll() {
  // 现有的清除存储逻辑不变
  if (sessionConfig) {
    clearWordsRecords(sessionConfig.words.map(w => w.id));
  } else {
    clearAllRecords();
  }
  setCleared(c => !c);
  setConfirmClear(false);
  setSessionMarks(new Map()); // 新增：清空草稿
}
```

### 传给 WordCard 的新 prop

```tsx
<WordCard
  key={word.id}
  word={word}
  index={index}
  dictationMode={dictationMode}
  subject={subject}
  pendingResult={sessionMarks.get(word.id) ?? null}  // 新增
  locked={showCompletion}                             // 新增
  onMark={handleMark}                                 // 改名（原 onAttempt）
/>
```

---

## 3. WordCard 变化

### Props 变化

```typescript
interface WordCardProps {
  word: Word;
  index: number;
  dictationMode: DictationMode;
  subject: Subject;
  pendingResult: boolean | null;  // 新增：当前草稿答案，null = 未打分
  locked?: boolean;               // 新增：提交后禁用按钮
  onMark?: (word: Word, correct: boolean) => void;  // 原 onAttempt，语义改为草稿更新
}
```

### 移除即时写入

```typescript
// 移除：
saveAttempt(word.id, correct);
setStatsVersion(v => v + 1);

// 保留：
playSound(correct ? 'correct' : 'wrong');
onMark?.(localWord, correct);
```

注：`statsVersion` 相关逻辑保留，历史记录点在提交前只显示旧数据，提交后由 `saveAttempt` 触发更新。提交后页面已导航离开，无需手动刷新。

### 点击逻辑

```typescript
const handleMark = useCallback((correct: boolean) => {
  if (locked) return;
  if (pendingResult === correct) return; // 已是该答案，不重复操作
  playSound(correct ? 'correct' : 'wrong');
  onMark?.(localWord, correct);
}, [locked, pendingResult, localWord, onMark]);
```

### 按钮视觉状态

未打分（`pendingResult === null`）：✓ 和 ✗ 均为普通样式（现有样式不变）。

已选 ✓（`pendingResult === true`）：
- ✓ 按钮：实心深绿，字体加粗（高亮选中）
- ✗ 按钮：白底红色描边，字体正常（未选中）

已选 ✗（`pendingResult === false`）：
- ✓ 按钮：白底绿色描边，字体正常（未选中）
- ✗ 按钮：实心深红，字体加粗（高亮选中）

禁用状态（`locked === true`）：两个按钮均加 `opacity-50 cursor-not-allowed`，`onClick` 无效。

```tsx
<div className="flex gap-2">
  <button
    onClick={() => handleMark(true)}
    disabled={locked}
    className={`flex-1 py-2.5 rounded-xl font-bold text-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
      pendingResult === true
        ? 'bg-[#4A8842] text-white'           // 选中
        : 'bg-white border-2 border-[#90BE88] text-[#4A8842]'  // 未选中
    }`}
  >✓</button>
  <button
    onClick={() => handleMark(false)}
    disabled={locked}
    className={`flex-1 py-2.5 rounded-xl font-bold text-xl transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
      pendingResult === false
        ? 'bg-[#B05860] text-white'           // 选中
        : 'bg-white border-2 border-[#D09098] text-[#B05860]'  // 未选中
    }`}
  >✗</button>
</div>
```

---

## 4. 边界情况

- **未打分的词**：提交时不调用 `saveAttempt`，不写入记录，不计入统计。与现有行为一致（`sessionTotal === 0` 时弹窗显示"本次未打分"）。
- **student 模式**：先点眼睛显示答案再打分，逻辑不变。`locked` 优先于"先点眼睛"的提示——如果已锁定，直接禁用。
- **重置进度**：`handleClearAll` 清空存储的同时清空 `sessionMarks`，词卡回到未打分状态。
- **随机听写（handleStartRandom）**：重新挂载 DictationView（key 变化），草稿自动重置。
- **retry（再练错误的词）**：同上，重新挂载，草稿重置。

---

## 5. 文件清单

| 文件 | 改动 |
|------|------|
| `src/components/DictationView.tsx` | 移除三个 session state，新增 `sessionMarks` Map，`handleMark`，`handleComplete`，传新 props 给 WordCard |
| `src/components/WordCard.tsx` | 新增 `pendingResult`/`locked` props，移除 `saveAttempt` 即时调用，按钮高亮逻辑，点击去重 |

---

## 6. 不变的部分

- `saveAttempt` 函数本身不变
- 历史记录点（`.recentAttempts`）逻辑不变，只是写入时机延后到提交
- 完成弹窗的 UI 不变（统计数字来源变为从 Map 推导，但展示内容相同）
- App.tsx / storage.ts / types 无需改动
