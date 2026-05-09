# Lesson-Based Word Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add by-lesson and mixed-grade word selection modes with separate entry points on the main page.

**Architecture:** Extend `WordList` type with lesson metadata, add 29 per-lesson WordList entries (P5×17 + P6×12) via a text-lookup helper, introduce a `LessonSelectorView` screen, and add 4 quick-start entry buttons to the main page. `WordSelectorView` adapts its UI based on a new `mode` prop (`'lesson'` vs `'mixed'`).

**Tech Stack:** React 18, TypeScript, Tailwind CSS, Vite, Vitest

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/types/index.ts` | Modify | Add `lesson?`, `lessonTitle?` to `WordList`; add `'lessonSelector'` to `ViewMode` |
| `src/data/lessonWordLookup.ts` | Create | Exported helper `lessonWords(gradeWords, texts)` |
| `src/data/lessonWordLookup.test.ts` | Create | Unit tests for `lessonWords` |
| `src/data/wordLists.ts` | Modify | Import helper; add 17 P5 lesson lists + 12 P6 lesson lists |
| `src/components/WordSelectorView.tsx` | Modify | Add `mode`/`lessonListId` props; lesson vs mixed UI |
| `src/components/LessonSelectorView.tsx` | Create | Grade tabs + lesson card list |
| `src/App.tsx` | Modify | New state (`selectorMode`, `selectedLessonId`), new nav functions, new view route |
| `src/components/WordListView.tsx` | Modify | 4 quick-start entry buttons; pass new callbacks |

---

### Task 1: Extend Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Add lesson fields to `WordList` and `'lessonSelector'` to `ViewMode`**

Open `src/types/index.ts`. Change:

```ts
export type ViewMode = 'wordlists' | 'wordSelector' | 'dictation' | 'study';
```

to:

```ts
export type ViewMode = 'wordlists' | 'lessonSelector' | 'wordSelector' | 'dictation' | 'study';
```

And add two optional fields to `WordList`:

```ts
export interface WordList {
  id: string;
  name: string;
  subject: Subject;
  grade?: number;
  lesson?: number;        // 1-17 for P5, 1-12 for P6
  lessonTitle?: string;   // e.g. '《到户外去》'
  words: Word[];
  isVirtual?: boolean;
}
```

- [ ] **Step 2: Build the project to confirm no type errors**

```bash
cd /Users/guotiantian/Documents/dictation_star && npm run build 2>&1 | tail -20
```

Expected: build succeeds (0 errors).

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: extend WordList with lesson/lessonTitle fields and add lessonSelector view mode"
```

---

### Task 2: `lessonWords` Utility (with Tests)

**Files:**
- Create: `src/data/lessonWordLookup.ts`
- Create: `src/data/lessonWordLookup.test.ts`

- [ ] **Step 1: Write failing test**

Create `src/data/lessonWordLookup.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { lessonWords } from './lessonWordLookup';
import type { Word } from '../types';

function w(id: string, text: string): Word {
  return { id, text, example: '' };
}

describe('lessonWords', () => {
  const gradeWords = [w('g-001', 'foo'), w('g-002', 'bar'), w('g-003', 'baz')];

  it('returns words in the order of texts array', () => {
    const result = lessonWords(gradeWords, ['bar', 'foo']);
    expect(result.map(x => x.id)).toEqual(['g-002', 'g-001']);
  });

  it('skips texts not found in grade list', () => {
    const result = lessonWords(gradeWords, ['foo', 'missing', 'baz']);
    expect(result).toHaveLength(2);
    expect(result.map(x => x.text)).toEqual(['foo', 'baz']);
  });

  it('returns empty array for empty texts', () => {
    expect(lessonWords(gradeWords, [])).toEqual([]);
  });

  it('returns same Word object (shared reference)', () => {
    const result = lessonWords(gradeWords, ['foo']);
    expect(result[0]).toBe(gradeWords[0]);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/guotiantian/Documents/dictation_star && npx vitest run src/data/lessonWordLookup.test.ts 2>&1 | tail -10
```

Expected: FAIL — `Cannot find module './lessonWordLookup'`

- [ ] **Step 3: Create the implementation**

Create `src/data/lessonWordLookup.ts`:

```ts
import type { Word } from '../types';

export function lessonWords(gradeWords: Word[], texts: string[]): Word[] {
  return texts
    .map(t => gradeWords.find(w => w.text === t))
    .filter((w): w is Word => w !== undefined);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/guotiantian/Documents/dictation_star && npx vitest run src/data/lessonWordLookup.test.ts 2>&1 | tail -10
```

Expected: 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/lessonWordLookup.ts src/data/lessonWordLookup.test.ts
git commit -m "feat: add lessonWords utility with tests"
```

---

### Task 3: P5 Lesson WordLists Data

**Files:**
- Modify: `src/data/wordLists.ts`

- [ ] **Step 1: Import the helper at the top of `wordLists.ts`**

In `src/data/wordLists.ts`, add this import after the existing imports:

```ts
import { lessonWords } from './lessonWordLookup';
```

- [ ] **Step 2: Extract P5 grade words as a constant**

Find the `zh-grade5` entry in `presetWordLists` (around line 146). Cut its entire inline `words: [ ... ]` array (from the opening `[` to the closing `]`) and declare it as a named constant **before** the `presetWordLists` array:

```ts
// Add this BEFORE `export const presetWordLists`
const p5Words: Word[] = [
  // ← paste the cut array contents here (zh5-w001 through zh5-w348)
];
```

Then replace the grade-5 entry's inline words with a reference:

```ts
{
  id: 'zh-grade5',
  name: '五年级',
  subject: 'chinese',
  grade: 5,
  words: p5Words,
},
```

- [ ] **Step 3: Add the 17 P5 lesson WordList entries**

After the `zh-grade5` entry (still inside `presetWordLists`), add:

```ts
  // ── P5 lesson lists ──
  {
    id: 'zh5-lesson01', name: '第一课', lessonTitle: '《到户外去》',
    subject: 'chinese', grade: 5, lesson: 1,
    words: lessonWords(p5Words, ['集合去露营','绑鞋带','防止摔倒','单独行动','贵重物品','一双袜子','感到充实','获得冠军','互相配合','轮流擦窗户','一顿丰富的自助餐','狼吞虎咽','攀岩大比拼','手电筒','一杯椰子汁','齐心协力','竞赛规则','一碗肉骨茶','禁止吸烟','野外探险']),
  },
  {
    id: 'zh5-lesson02', name: '第二课', lessonTitle: '《身体会说话》',
    subject: 'chinese', grade: 5, lesson: 2,
    words: lessonWords(p5Words, ['代表它的号码','电脑测试','昏暗的角落','保持距离','户外活动','圈出正确的答案','放松心情','盯着屏幕','伤害彼此','把一切抛到脑后','改掉坏习惯','一片模糊','觉得头疼','眼睛快瞎了','每隔半小时','惨不忍睹','填在格子里','医疗诊所','视力下降','不停咳嗽']),
  },
  {
    id: 'zh5-lesson03', name: '第三课', lessonTitle: '《懂事的你》',
    subject: 'chinese', grade: 5, lesson: 3,
    words: lessonWords(p5Words, ['异口同声','炒黄瓜','调味料','紫色的帽子','保持沉默','剪成各种形状','朋友聚会','献上祝福','制作贺卡','身份证','消除烦恼','互相安慰','工作劳累','准备材料','搅拌均匀','倒进锅里','加入盐','七嘴八舌','语重心长','知错能改','左顾右盼','爱惜身体','鸦雀无声','神气十足']),
  },
  {
    id: 'zh5-lesson04', name: '第四课', lessonTitle: '《分享是快乐的》',
    subject: 'chinese', grade: 5, lesson: 4,
    words: lessonWords(p5Words, ['捐钱救灾','不同种类','必须齐心协力','感到奇怪','味道鲜美的水饺','打开饼干盒','自私自利','用力敲门','烧菜煮饭','把果汁存放在冰箱里','拒绝好意','一溜烟地跑','愉快地聊天','宁静的夜晚','纷纷出来围观','分享快乐','撒胡椒粉','争相邀请','缺少蔬菜','一副愁眉苦脸的样子']),
  },
  {
    id: 'zh5-lesson05', name: '第五课', lessonTitle: '《我闯祸了》',
    subject: 'chinese', grade: 5, lesson: 5,
    words: lessonWords(p5Words, ['逗人开心','根据内容','进行测验','打招呼','受欢迎的程度','神情严肃','遇到困难','满地碎片','十分愤怒','解决同学之间的矛盾','不禁发抖','呼吸急促','一阵火辣','每分每秒','积极参加','总是抱怨','感到骄傲','当成珍宝','怀疑的目光','到处闯祸']),
  },
  {
    id: 'zh5-lesson06', name: '第六课', lessonTitle: '《我的东西找到了》',
    subject: 'chinese', grade: 5, lesson: 6,
    words: lessonWords(p5Words, ['银色的汽车','联系失主','手机号码','摇晃身体','凉爽的早晨','倒退几步','争先恐后','彩旗飘扬','呆若木鸡','上前阻拦','不约而同','不怕麻烦','回忆往事','不知如何是好','寻人启事','小贩中心','一张车资卡','一叠钞票','几个硬币','站稳脚步']),
  },
  {
    id: 'zh5-lesson07', name: '第七课', lessonTitle: '《一千桶水》',
    subject: 'chinese', grade: 5, lesson: 7,
    words: lessonWords(p5Words, ['在山顶上徘徊','深浅不一','巨大的柱子','一公斤的米','浮现在脑海里','激动得喘不过气来','大概已经死了','衣服湿透了','载我回家','随着音乐起舞','一层厚厚的脂肪','依依不舍','盖上被子','渐渐消失','一波一波的海浪','向他泼水','涨潮退潮','海洋生物','大抽奖','皮肤上的毛细孔']),
  },
  {
    id: 'zh5-lesson08', name: '第八课', lessonTitle: '《和时间赛跑》',
    subject: 'chinese', grade: 5, lesson: 8,
    words: lessonWords(p5Words, ['直到永远','曾经说过','制定计划','不在乎输赢','仍然不悔改','一寸光阴一寸金','从此以后','节省时间','登上陆地','似乎','制造机器','安排得井井有条','未来的世界','书写汉字','感到担忧','留下足迹','电脑网络','上气不接下气','匆匆离开','过度悲伤','光阴似箭','瘦弱的身影','同龄的朋友','一眨眼的功夫']),
  },
  {
    id: 'zh5-lesson09', name: '第九课', lessonTitle: '《很久很久以前》',
    subject: 'chinese', grade: 5, lesson: 9,
    words: lessonWords(p5Words, ['增添乐趣','民众俱乐部','将来','种植兰花','入场免费','女扮男装','代替朋友参赛','当兵打仗','攻打敌兵','孝顺父母','离开家乡','伟大的英雄','烈日炎炎','蚊虫叮咬','价钱便宜','上网订票','一瓶矿泉水','生活艰辛','战胜困难','保家卫国']),
  },
  {
    id: 'zh5-lesson10', name: '第十课', lessonTitle: '《成长的烦恼》',
    subject: 'chinese', grade: 5, lesson: 10,
    words: lessonWords(p5Words, ['比较烦恼','拨打热线电话','嘲笑别人','戴一副眼镜','控制脾气','不停地唠叨','一段难忘的童年往事','遮挡视线','腰酸背痛','拥有房子','感到惭愧','刷洗地板的农夫','珍惜时间','丰盛的晚餐','喜欢恶作剧','小心翼翼','玩游戏上瘾','道理简单','懂得感恩','和同学攀比']),
  },
  {
    id: 'zh5-lesson11', name: '第十一课', lessonTitle: '《同学之间》',
    subject: 'chinese', grade: 5, lesson: 11,
    words: lessonWords(p5Words, ['初级班课程','零起点','基本知识','人数有限','尽早报名','打在胸口上','详细情况','来不及躲闪','扑过去','扭打成一团','狠狠地瞪着','两颗扣子','彼此照顾','怀恨在心','截止日期','从始自终','撕破袖子','露出肩膀','一件衬衫','不顾一切']),
  },
  {
    id: 'zh5-lesson12', name: '第十二课', lessonTitle: '《新加坡，我为你骄傲》',
    subject: 'chinese', grade: 5, lesson: 12,
    words: lessonWords(p5Words, ['感到骄傲','盼望已久','排列队伍','呈献表演','夜幕降临','五彩缤纷','欢乐的气氛','最棒的机场','最佳作品','唯一的愿望','著名作家','刺激的活动','沉浸在回忆中','燃放烟花','滨海湾','大街小巷','感到自豪','宽阔的肩膀','战斗机','轻盈地降落']),
  },
  {
    id: 'zh5-lesson13', name: '第十三课', lessonTitle: '《汉字王国》',
    subject: 'chinese', grade: 5, lesson: 13,
    words: lessonWords(p5Words, ['世界纪录','产生怀疑','古老的甲骨文','包括在内','令人佩服','恍然大悟','不仅如此','访问官员','叹了一口气','窄小的木门','分派礼物','一门独特的艺术','亿万富翁','胸有成竹','成为历史','肯定的答复','统计人数','用笔墨写字','由笔画构成','违抗命令']),
  },
  {
    id: 'zh5-lesson14', name: '第十四课', lessonTitle: '《老师，谢谢您》',
    subject: 'chinese', grade: 5, lesson: 14,
    words: lessonWords(p5Words, ['辛勤工作','甲乙丙丁','顽皮好动','一首诗歌','培育幼苗','犯错误','积极训练','加倍努力','宣布成绩','并且','钻进地洞','委屈涌上心头','性格温柔','恢复自信','崇拜偶像','默默祈祷','混了过去','偏偏','额头发烫','凡是']),
  },
  {
    id: 'zh5-lesson15', name: '第十五课', lessonTitle: '《想当一棵树》',
    subject: 'chinese', grade: 5, lesson: 15,
    words: lessonWords(p5Words, ['宽阔的道路','淡淡的香味','气味浓烈','不可否认','树根腐烂','闲聊','挺起胸','慷慨大方','阴凉的地方','悄悄地溜走','枯枝烂叶','幽默有趣','枝叶茂密','姿态挺拔','栽种树木','把人看扁','乳白色','一颗炮弹','考生编号','体检报告']),
  },
  {
    id: 'zh5-lesson16', name: '第十六课', lessonTitle: '《语言的力量》',
    subject: 'chinese', grade: 5, lesson: 16,
    words: lessonWords(p5Words, ['一滴水','珍惜资源','翻开书本','一粒米','环境污染','和谐共处','博物馆','来去匆匆','淡淡的悲伤','熟悉的身影','迫不及待','大地回春','奇妙的变化','可怜的盲人','繁华的街头','爬上台阶','夕阳西下','叫人陶醉','令人惋惜','冷漠无情']),
  },
  {
    id: 'zh5-lesson17', name: '第十七课', lessonTitle: '《世界那么大》',
    subject: 'chinese', grade: 5, lesson: 17,
    words: lessonWords(p5Words, ['神奇的地区','天寒地冻','冻得发抖','环境恶劣','祖先','身材矮小','阻挡去路','驾驶汽车','春夏秋冬','搭乘地铁','减少伤亡','淹死农民','避免灾害','攻击敌人','根本','坚固的建筑','捕捉野兽','靠打猎为生','天气暖和','即使']),
  },
```

- [ ] **Step 4: Build to confirm no errors**

```bash
cd /Users/guotiantian/Documents/dictation_star && npm run build 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/data/wordLists.ts src/data/lessonWordLookup.ts
git commit -m "feat: add P5 per-lesson WordList entries using lessonWords helper"
```

---

### Task 4: P6 Lesson WordLists Data

**Files:**
- Modify: `src/data/wordLists.ts`

- [ ] **Step 1: Extract P6 grade words as a constant**

Find the `zh-grade6` entry in `presetWordLists` (around line 502 in the original file). Apply the same refactor as Task 3 Step 2: extract the inline words array into a named constant `p6Words: Word[]` before `presetWordLists`, then reference it in the grade-6 entry as `words: p6Words`.

- [ ] **Step 2: Add the 12 P6 lesson WordList entries**

After the `zh-grade6` entry (still inside `presetWordLists`), add:

```ts
  // ── P6 lesson lists ──
  {
    id: 'zh6-lesson01', name: '第一课', lessonTitle: '《加油！加油！》',
    subject: 'chinese', grade: 6, lesson: 1,
    words: lessonWords(p6Words, ['克服困难','要求严格','柔弱的花朵','环境恶劣','实现梦想','颜色鲜艳','坚持到底','锻炼身体','不再懒惰','产生疑问','凭着顽强的意志','成为好榜样','耀眼的阳光','托着托盘','准备测验','每逢周末','埋头阅读','临时抱佛脚','在石缝里扎根','姿态优雅','制订计划']),
  },
  {
    id: 'zh6-lesson02', name: '第二课', lessonTitle: '《祖孙情》',
    subject: 'chinese', grade: 6, lesson: 2,
    words: lessonWords(p6Words, ['祖孙同欢乐','大手牵小手','促进和谐','家庭幸福','拨打电话','倾斜的伞','踩着积水','歪歪斜斜','笑眯眯','鞋子湿透','换衣服','撑伞','传统美德','智能手机','基础班','一蹦一跳','迅速钻进','挽起手臂','灰蒙蒙','感到疑惑','惊讶地发现','脸色苍白','嘴唇抖动']),
  },
  {
    id: 'zh6-lesson03', name: '第三课', lessonTitle: '《美食小侦探》',
    subject: 'chinese', grade: 6, lesson: 3,
    words: lessonWords(p6Words, ['一盘清蒸鱼','脆皮烤鸡','清炒豆苗','苦瓜煎蛋','一碗酸辣汤','皮蛋瘦肉粥','一位科学家','模仿写作技巧','除了','伟大的发明','使劲推门','石头坚硬','大禹治水','人类的智慧','一条毒蛇','争夺财产','头脑敏捷','交通堵塞','赠送礼物','咸菜鸭汤']),
  },
  {
    id: 'zh6-lesson04', name: '第四课', lessonTitle: '《宝贵的礼物》',
    subject: 'chinese', grade: 6, lesson: 4,
    words: lessonWords(p6Words, ['价钱便宜','免费修理','打扰别人休息','样貌普通','珍珠项链','趁人不注意','逛街购物','货品的质量','上一趟洗手间','态度温和','反而','神色慌张','慈祥的笑容','不翼而飞','损坏公物','大小均匀','猛然发现','省吃俭用','销售成绩','商品打折']),
  },
  {
    id: 'zh6-lesson05', name: '第五课', lessonTitle: '《成语故事三则》',
    subject: 'chinese', grade: 6, lesson: 5,
    words: lessonWords(p6Words, ['结构坚固','掩耳盗铃','毫不在意','谎话连篇','选择题','呈现方式','创意无限','十分贪财','用铁锤砸碎花瓶','立即行动','披着外套','不同性别','吹肥皂泡','行动笨拙','捂住耳朵','无法抵挡','放进衣橱','讲述彩虹的传说','目光锐利','装聋作哑','情况糟糕']),
  },
  {
    id: 'zh6-lesson06', name: '第六课', lessonTitle: '《精彩三国》',
    subject: 'chinese', grade: 6, lesson: 6,
    words: lessonWords(p6Words, ['对抗敌军','英俊帅气','甘愿受罚','埋伏','智慧与品德','足够的时间','催人行动','杰出人才','妒忌才能','定罪','遵命','不谋而合','逼迫','向敌人射箭','长江','吩咐做事','绑好绳子','表示忠诚','绝不拖延','一头雾水','神机妙算']),
  },
  {
    id: 'zh6-lesson07', name: '第七课', lessonTitle: '《世界走透透》',
    subject: 'chinese', grade: 6, lesson: 7,
    words: lessonWords(p6Words, ['寒冷的冬季','瀑布倾泻而下','含着眼泪','托着树叶','跨越障碍','流连忘返','治疗疾病','避暑胜地','游览名胜古迹','甚至','一股咸味','痛得厉害','兴致勃勃','雄伟的山脉','最高峰','覆盖细沙','平坦的沙滩','震耳欲聋','名山大川','景色壮观','强劲的浮力']),
  },
  {
    id: 'zh6-lesson08', name: '第八课', lessonTitle: '《新加坡的过去和现在》',
    subject: 'chinese', grade: 6, lesson: 8,
    words: lessonWords(p6Words, ['一幅壁画','抄写信件','赚钱养家','深刻的印象','巨大的贡献','重要的位置','无忧无虑','吊下一个竹篮','津津有味','按照吩咐','租书的摊位','左邻右舍','一根扁担','公共厕所','古老的传说','沿着走廊','娱乐方式','政府大厦','若有所思','捏着鼻子','感到冤枉','市区重建局','孙悟空打妖怪']),
  },
  {
    id: 'zh6-lesson09', name: '第九课', lessonTitle: '《说龙》',
    subject: 'chinese', grade: 6, lesson: 9,
    words: lessonWords(p6Words, ['放风筝','多元种族','拼命挣扎','土地干裂','遭受痛苦','心肠残忍','一副眼镜','燃放爆竹','得到允许','筋疲力尽','暴雨冲毁农田','造型精美的九龙壁壁画','赛龙舟','吉祥如意','装饰皇帝的龙袍','在龙宫里大吼一声','汪洋大海','缓缓前进','权力很大','饿得晕了过去','性格固执','上下翻腾','无辜的老百姓']),
  },
  {
    id: 'zh6-lesson10', name: '第十课', lessonTitle: '《走遍天下书为伴》',
    subject: 'chinese', grade: 6, lesson: 10,
    words: lessonWords(p6Words, ['获得奖品','情况糟糕','几篇文章','家境贫穷','上网申请','多余的钱','全神贯注','目录和页码','总算结束了','得到暂时的休息','打败妖魔鬼怪','书籍知识介绍','书柜间的夹缝','出版社','师徒四人','踮起脚尖','惧怕失败','端起饭碗','调皮捣蛋','浑身轻松','大声朗读','翻译成英文','诱人的香味','复杂的滋味']),
  },
  {
    id: 'zh6-lesson11', name: '第十一课', lessonTitle: '《拥抱未来》',
    subject: 'chinese', grade: 6, lesson: 11,
    words: lessonWords(p6Words, ['变魔术','瞧一瞧','交通堵塞','品尝美食','左右晃荡','垂头丧气','肚子吃胀了','确定计划','一眨眼的功夫','天空飘着雨丝','科学幻想故事','隐形的保护罩','上网搜索','先进技术','触碰开关','窃窃私语','揉揉眼睛','储存信息','恰好遇见','逐渐亮起来','铺路的砖块','飞机航行','舔舔嘴角']),
  },
  {
    id: 'zh6-lesson12', name: '第十二课', lessonTitle: '《再见，亲爱的伙伴》',
    subject: 'chinese', grade: 6, lesson: 12,
    words: lessonWords(p6Words, ['毕业典礼','诚恳地邀请','钢琴独奏','半途而废','长久地守望','实验和研究','公共交通服务','不抱怨不放弃','彻底消灭敌人','稍微有点难过','绝对相信','跨出关键的一步','感恩仪式','忙忙碌碌','诗歌朗诵','温馨提醒','孤单寂寞','再三嘱咐','持之以恒','留下一道痕迹','未来的召唤','第一届写作比赛','前途一片光明']),
  },
```

- [ ] **Step 3: Build to confirm no errors**

```bash
cd /Users/guotiantian/Documents/dictation_star && npm run build 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/data/wordLists.ts
git commit -m "feat: add P6 per-lesson WordList entries"
```

---

### Task 5: `WordSelectorView` Lesson Mode

**Files:**
- Modify: `src/components/WordSelectorView.tsx`

- [ ] **Step 1: Update props interface and add new constants**

In `src/components/WordSelectorView.tsx`, change the props interface and add constants:

```ts
// Replace the existing SESSION_SIZES constant and props interface with:

const SESSION_SIZES_MIXED = [10, 15, 20, 25, 30];
// 0 = 全部 (all selected words)
const SESSION_SIZES_LESSON = [0, 5, 10];
const SESSION_SIZE_LABELS: Record<number, string> = { 0: '全部' };

interface WordSelectorViewProps {
  grade: GradeFilter;
  dictationMode: DictationMode;
  onStart: (config: SessionConfig) => void;
  mode: 'lesson' | 'mixed';
  lessonListId?: string;
}
```

- [ ] **Step 2: Update the `allWords` memo to handle lesson mode, and initialize `selectedIds` for lesson mode**

Replace the existing `allWords` useMemo and `selectedIds` useState:

```ts
export default function WordSelectorView({
  grade, dictationMode: _dictationMode, onStart, mode, lessonListId,
}: WordSelectorViewProps) {
  const [activeRule, setActiveRule] = useState<AutoSelectRule | null>(null);
  const [statsVersion, setStatsVersion] = useState(0);

  useEffect(() => {
    setStatsVersion(v => v + 1);
  }, []);

  // Resolve the lesson list once on mount (for lesson mode)
  const lessonList = useMemo(() => {
    if (mode !== 'lesson' || !lessonListId) return null;
    return presetWordLists.find(l => l.id === lessonListId) ?? null;
  }, [mode, lessonListId]);

  const allWords = useMemo((): Word[] => {
    if (mode === 'lesson') {
      if (!lessonList) return [];
      return applyOverridesAndFilter(lessonList.words);
    }
    // mixed mode — same as before, but exclude lesson sub-lists
    const hiddenListIds = new Set(getHiddenListIds());
    const presetWords = presetWordLists
      .filter(l =>
        l.subject === 'chinese' &&
        SHOWN_GRADES.has(l.grade ?? -1) &&
        l.lesson === undefined &&       // exclude per-lesson lists
        (grade === 'all' || l.grade === grade) &&
        !hiddenListIds.has(l.id),
      )
      .flatMap(l => applyOverridesAndFilter(l.words));
    const customWords = getCustomLists('chinese')
      .filter(l => grade === 'all' || l.grade === grade)
      .flatMap(l => getCustomWordsForList(l.id));
    const seen = new Set<string>();
    return [...presetWords, ...customWords].filter(w =>
      seen.has(w.id) ? false : (seen.add(w.id), true),
    );
  }, [grade, mode, lessonList]);

  // Lesson mode: default all selected (lazy initializer avoids first-render flash).
  // Mixed mode: default empty.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (mode === 'lesson' && lessonListId) {
      const list = presetWordLists.find(l => l.id === lessonListId);
      return new Set((list?.words ?? []).map(w => w.id));
    }
    return new Set();
  });

  // session size: 0 means "全部" in lesson mode
  const defaultSize = mode === 'lesson' ? 0 : 10;
  const [sessionSize, setSessionSize] = useState(defaultSize);
```

- [ ] **Step 3: Update auto-select handlers for lesson mode**

Replace `applyRule`, `handleRuleClick`, `handleSizeClick`:

```ts
  function applyRule(rule: AutoSelectRule, size: number) {
    const selected = autoSelectWords(sortedWords, rule, size);
    setSelectedIds(new Set(selected.map(w => w.id)));
  }

  function handleRuleClick(rule: AutoSelectRule) {
    if (activeRule === rule) {
      setActiveRule(null);
      if (mode === 'lesson') {
        setSelectedIds(new Set(allWords.map(w => w.id)));
      } else {
        setSelectedIds(new Set());
      }
    } else {
      setActiveRule(rule);
      const size = mode === 'lesson' ? (sessionSize === 0 ? allWords.length : sessionSize) : sessionSize;
      applyRule(rule, size);
    }
  }

  function handleLessonSmartSelect(n: number) {
    const selected = autoSelectWords(sortedWords, 'most-errors', n);
    setSelectedIds(new Set(selected.map(w => w.id)));
    setActiveRule('most-errors');
  }

  function handleSizeClick(size: number) {
    setSessionSize(size);
    if (activeRule && mode === 'mixed') applyRule(activeRule, size);
  }
```

- [ ] **Step 4: Update `handleStart` to cap words in lesson mode**

```ts
  function handleStart() {
    const selectedWords = sortedWords.filter(w => selectedIds.has(w.id));
    const wordsToStart =
      mode === 'lesson' && sessionSize > 0
        ? selectedWords.slice(0, sessionSize)
        : selectedWords;
    const gradeLabel =
      mode === 'lesson'
        ? `${lessonList?.name ?? ''}${lessonList?.lessonTitle ?? ''}`
        : (GRADE_LABEL[String(grade)] ?? '全部');
    onStart({ words: wordsToStart, grade: gradeLabel });
  }
```

- [ ] **Step 5: Update the JSX — bottom bar and start button**

Replace the bottom bar (from `{/* ── Auto-select bar + slider ── */}` to the end):

```tsx
      {/* ── Bottom bar (mode-specific) ── */}
      <div className="bg-stone-50 border-t border-stone-100 px-4 py-3 flex flex-col gap-2">

        {mode === 'lesson' ? (
          <>
            {/* Smart-select shortcuts for lesson mode */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 flex-shrink-0">智能选词</span>
              <div className="flex gap-1.5 flex-1">
                {[5, 10].map(n => (
                  <button
                    key={n}
                    onClick={() => handleLessonSmartSelect(n)}
                    className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition border bg-white border-stone-200 text-stone-400 active:opacity-70"
                  >
                    错误最多前{n}
                  </button>
                ))}
              </div>
              <span className="text-xs text-stone-500 font-medium flex-shrink-0 w-12 text-right">
                已选 {selectedIds.size} 个
              </span>
            </div>
            {/* Session size for lesson mode */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 flex-shrink-0">听写</span>
              <div className="flex gap-1.5 flex-1">
                {SESSION_SIZES_LESSON.map(n => (
                  <button
                    key={n}
                    onClick={() => handleSizeClick(n)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                      sessionSize === n
                        ? 'bg-[#8090C0] text-white border-[#8090C0]'
                        : 'bg-white border-stone-200 text-stone-400'
                    }`}
                  >
                    {SESSION_SIZE_LABELS[n] ?? `${n}个`}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Rule buttons for mixed mode */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 flex-shrink-0">智能选词</span>
              <div className="flex gap-1.5 flex-1">
                {AUTO_RULES.map(({ rule, label }) => (
                  <button
                    key={rule}
                    onClick={() => handleRuleClick(rule)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                      activeRule === rule
                        ? 'bg-[#F0F2FB] border-[#B0BCDC] text-[#5868A8]'
                        : 'bg-white border-stone-200 text-stone-400'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-stone-500 font-medium flex-shrink-0 w-12 text-right">
                已选 {selectedIds.size} 个
              </span>
            </div>
            {/* Session size for mixed mode */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 flex-shrink-0">每次</span>
              <div className="flex gap-1.5 flex-1">
                {SESSION_SIZES_MIXED.map(n => (
                  <button
                    key={n}
                    onClick={() => handleSizeClick(n)}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition border ${
                      sessionSize === n
                        ? 'bg-[#8090C0] text-white border-[#8090C0]'
                        : 'bg-white border-stone-200 text-stone-400'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <span className="text-xs text-stone-400 flex-shrink-0">个词</span>
            </div>
          </>
        )}
      </div>

      {/* ── Start button ── */}
      <div className="bg-white border-t border-stone-100 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 py-4">
        <button
          disabled={selectedIds.size === 0}
          onClick={handleStart}
          className="w-full py-3 rounded-2xl text-white font-bold text-base shadow-md active:scale-[0.98] transition bg-gradient-to-r from-[#7888C8] to-[#A8B8DC] disabled:opacity-40"
        >
          {selectedIds.size > 0
            ? `开始听写 · ${mode === 'lesson' && sessionSize > 0 ? Math.min(selectedIds.size, sessionSize) : selectedIds.size} 个词 →`
            : '请选择词语'}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Build to confirm no errors**

```bash
cd /Users/guotiantian/Documents/dictation_star && npm run build 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/WordSelectorView.tsx
git commit -m "feat: WordSelectorView supports lesson and mixed modes with different session sizes"
```

---

### Task 6: `LessonSelectorView` Component

**Files:**
- Create: `src/components/LessonSelectorView.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/LessonSelectorView.tsx`:

```tsx
import { useState, useMemo } from 'react';
import { presetWordLists } from '../data/wordLists';
import { getWordStats } from '../utils/storage';

interface LessonSelectorViewProps {
  onSelectLesson: (lessonId: string) => void;
}

const GRADE_TABS = [
  { value: 5, label: '五年级' },
  { value: 6, label: '六年级' },
] as const;

export default function LessonSelectorView({ onSelectLesson }: LessonSelectorViewProps) {
  const [gradeTab, setGradeTab] = useState<5 | 6>(5);

  const lessonLists = useMemo(() => {
    return presetWordLists
      .filter(l => l.subject === 'chinese' && l.grade === gradeTab && l.lesson !== undefined)
      .sort((a, b) => (a.lesson ?? 0) - (b.lesson ?? 0));
  }, [gradeTab]);

  return (
    <div className="flex flex-col h-full">

      {/* Grade tabs */}
      <div className="bg-stone-50 px-4 pt-3 pb-2 border-b border-stone-100 flex gap-2">
        {GRADE_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setGradeTab(tab.value)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
              gradeTab === tab.value
                ? 'bg-[#8090C0] text-white shadow-sm'
                : 'bg-stone-100 text-stone-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lesson cards */}
      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
        {lessonLists.map(list => {
          const total = list.words.length;
          const practiced = list.words.filter(w => getWordStats(w.id).total > 0).length;
          const pct = total > 0 ? Math.round((practiced / total) * 100) : 0;

          return (
            <button
              key={list.id}
              onClick={() => onSelectLesson(list.id)}
              className="w-full rounded-2xl p-4 text-left border-2 border-stone-200 bg-white active:scale-[0.98] transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-stone-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-stone-500">
                    {list.lesson}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-stone-800">
                    {list.name} {list.lessonTitle}
                  </div>
                  <div className="text-xs text-stone-400 mt-0.5">{total} 个词语</div>
                  {total > 0 && (
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="flex-1 h-1 bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#8090C0] rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-stone-400 flex-shrink-0">{practiced}/{total}</span>
                    </div>
                  )}
                </div>
                <div className="text-stone-300 text-lg">›</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Build to confirm no errors**

```bash
cd /Users/guotiantian/Documents/dictation_star && npm run build 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/LessonSelectorView.tsx
git commit -m "feat: add LessonSelectorView with grade tabs and lesson card list"
```

---

### Task 7: Wire Up App.tsx and WordListView

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/WordListView.tsx`

- [ ] **Step 1: Update `App.tsx`**

Replace the full `src/App.tsx` with:

```tsx
import { useState } from 'react';
import { ViewMode, DictationMode, FilterMode, WordList, GradeFilter, SessionConfig } from './types';
import Header from './components/Header';
import WordListView from './components/WordListView';
import LessonSelectorView from './components/LessonSelectorView';
import WordSelectorView from './components/WordSelectorView';
import DictationView from './components/DictationView';
import StudyView from './components/StudyView';
import SearchModal from './components/SearchModal';

export default function App() {
  const [view, setView] = useState<ViewMode>('wordlists');
  const [showSearch, setShowSearch] = useState(false);
  const [selectedList, setSelectedList] = useState<WordList | null>(null);
  const [dictationMode, setDictationMode] = useState<DictationMode>('parent');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [selectorGrade, setSelectorGrade] = useState<GradeFilter>('all');
  const [selectorMode, setSelectorMode] = useState<'lesson' | 'mixed'>('mixed');
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [sessionConfig, setSessionConfig] = useState<SessionConfig | null>(null);

  function openWordSelector(grade: GradeFilter, mode: DictationMode) {
    setSelectorGrade(grade);
    setDictationMode(mode);
    setSelectorMode('mixed');
    setSelectedLessonId(null);
    setView('wordSelector');
  }

  function openMixedSelector(grade: GradeFilter, mode: DictationMode) {
    setSelectorGrade(grade);
    setDictationMode(mode);
    setSelectorMode('mixed');
    setSelectedLessonId(null);
    setView('wordSelector');
  }

  function openLessonSelector(mode: DictationMode) {
    setDictationMode(mode);
    setView('lessonSelector');
  }

  function openLessonDictation(lessonId: string) {
    setSelectedLessonId(lessonId);
    setSelectorMode('lesson');
    setView('wordSelector');
  }

  function startFromSelector(config: SessionConfig) {
    setSessionConfig(config);
    setView('dictation');
  }

  function startStudy(list: WordList, mode: DictationMode, filter: FilterMode) {
    setSelectedList(list);
    setDictationMode(mode);
    setFilterMode(filter);
    setView('study');
  }

  function handleBack() {
    if (view === 'wordSelector' && selectorMode === 'lesson') {
      setView('lessonSelector');
    } else {
      setSessionConfig(null);
      setView('wordlists');
    }
  }

  const headerTitle =
    view === 'wordlists' ? '听写小状元'
    : view === 'lessonSelector' ? '选择课次'
    : view === 'wordSelector' ? '选择词语'
    : view === 'study' ? `学习：${selectedList?.name ?? ''}`
    : sessionConfig ? `听写 · ${sessionConfig.grade}`
    : selectedList?.name ?? '听写';

  const headerBack =
    view === 'dictation' || view === 'study' || view === 'wordSelector' || view === 'lessonSelector'
      ? handleBack
      : undefined;

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col max-w-2xl mx-auto">
      <Header
        onBack={headerBack}
        title={headerTitle}
        onSearch={view === 'wordlists' ? () => setShowSearch(true) : undefined}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {view === 'wordlists' && (
          <WordListView
            onOpenSelector={openWordSelector}
            onOpenMixedSelector={openMixedSelector}
            onOpenLessonSelector={openLessonSelector}
            onStudy={startStudy}
          />
        )}
        {view === 'lessonSelector' && (
          <LessonSelectorView onSelectLesson={openLessonDictation} />
        )}
        {view === 'wordSelector' && (
          <WordSelectorView
            grade={selectorGrade}
            dictationMode={dictationMode}
            onStart={startFromSelector}
            mode={selectorMode}
            lessonListId={selectedLessonId ?? undefined}
          />
        )}
        {view === 'study' && selectedList && (
          <StudyView
            wordList={selectedList}
            filterMode={filterMode}
            subject="chinese"
            dictationMode={dictationMode}
            onStartDictation={() => setView('dictation')}
          />
        )}
        {view === 'dictation' && (sessionConfig || selectedList) && (
          <DictationView
            wordList={selectedList ?? { id: '', name: '', subject: 'chinese', words: [] }}
            dictationMode={dictationMode}
            filterMode={filterMode}
            subject="chinese"
            sessionConfig={sessionConfig ?? undefined}
          />
        )}
      </main>

      {showSearch && <SearchModal onClose={() => setShowSearch(false)} />}
    </div>
  );
}
```

- [ ] **Step 2: Update `WordListView` props interface and add quick-start section**

In `src/components/WordListView.tsx`, add two new callbacks to `WordListViewProps`:

```ts
interface WordListViewProps {
  onOpenSelector: (grade: GradeFilter, mode: DictationMode) => void;
  onOpenMixedSelector: (grade: GradeFilter, mode: DictationMode) => void;
  onOpenLessonSelector: (mode: DictationMode) => void;
  onStudy: (list: WordList, mode: DictationMode, filter: FilterMode) => void;
}
```

And update the component signature to destructure them:

```ts
export default function WordListView({ onOpenSelector, onOpenMixedSelector, onOpenLessonSelector, onStudy }: WordListViewProps) {
```

- [ ] **Step 3: Add the quick-start section to `WordListView` JSX**

In `WordListView`, add this section immediately after the grade-tabs bar (after the closing `</div>` of the `{/* ── Grade tabs + actions ── */}` block):

```tsx
      {/* ── Quick-start section ── */}
      <div className="px-4 pt-3 pb-1">
        <div className="text-xs text-stone-400 font-medium mb-2">快速练习</div>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onOpenLessonSelector(dictationMode)}
            className="rounded-2xl px-4 py-3 text-left border-2 border-[#B0BCDC] bg-[#F0F2FB] active:scale-[0.98] transition"
          >
            <div className="text-sm font-bold text-[#5868A8]">按课听写</div>
            <div className="text-xs text-[#8090C0] mt-0.5">选年级→选课</div>
          </button>
          <button
            onClick={() => onOpenMixedSelector(5, dictationMode)}
            className="rounded-2xl px-4 py-3 text-left border-2 border-stone-200 bg-white active:scale-[0.98] transition"
          >
            <div className="text-sm font-bold text-stone-700">五年级混合</div>
            <div className="text-xs text-stone-400 mt-0.5">全部五年级词语</div>
          </button>
          <button
            onClick={() => onOpenMixedSelector(6, dictationMode)}
            className="rounded-2xl px-4 py-3 text-left border-2 border-stone-200 bg-white active:scale-[0.98] transition"
          >
            <div className="text-sm font-bold text-stone-700">六年级混合</div>
            <div className="text-xs text-stone-400 mt-0.5">全部六年级词语</div>
          </button>
          <button
            onClick={() => onOpenMixedSelector('all', dictationMode)}
            className="rounded-2xl px-4 py-3 text-left border-2 border-stone-200 bg-white active:scale-[0.98] transition"
          >
            <div className="text-sm font-bold text-stone-700">全部混合</div>
            <div className="text-xs text-stone-400 mt-0.5">五六年级一起</div>
          </button>
        </div>
      </div>

      {/* ── 词单管理 header ── */}
      <div className="px-4 pt-3 pb-1">
        <div className="text-xs text-stone-400 font-medium">词单管理</div>
      </div>
```

- [ ] **Step 4: Build to confirm no errors**

```bash
cd /Users/guotiantian/Documents/dictation_star && npm run build 2>&1 | tail -10
```

Expected: 0 errors.

- [ ] **Step 5: Run all tests**

```bash
cd /Users/guotiantian/Documents/dictation_star && npm test 2>&1 | tail -20
```

Expected: all tests PASS.

- [ ] **Step 6: Start dev server and manually verify the feature**

```bash
cd /Users/guotiantian/Documents/dictation_star && npm run dev
```

Verify in browser:
1. Main page shows 4 quick-start buttons in a 2×2 grid
2. "按课听写" → grade tabs → lesson cards with progress bars → tapping a lesson opens WordSelectorView with all words pre-selected
3. Session sizes in lesson mode are 全部/5/10; smart-select buttons appear as "错误最多前5" and "错误最多前10"
4. "五年级混合" → WordSelectorView with grade=5 mixed mode; session sizes 10/15/20/25/30; 3 auto-select rules present
5. Back button from lesson WordSelectorView returns to LessonSelectorView (not main page)
6. Back button from LessonSelectorView returns to main page
7. Existing "开始听写" button in bottom panel still works

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/components/WordListView.tsx
git commit -m "feat: wire up lesson selector and mixed selector entry points on main page"
```
