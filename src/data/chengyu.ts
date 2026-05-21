import type { Word } from '../types';

export interface ChengYuExample {
  grade: 3 | 4 | 5 | 6;
  lesson: number;
  sentence: string;
}

export interface ChengYu {
  id: string;
  text: string;
  examples: ChengYuExample[];
}

export function chengyuToWords(list: ChengYu[]): Word[] {
  return list.map(cy => ({
    id: cy.id,
    text: cy.text,
    pinyin: undefined,
    example: cy.examples[0]?.sentence ?? '',
    wordType: 'word' as const,
    isCustom: false,
  }));
}

export function filterChengyuByGrade(
  grade: 3 | 4 | 5 | 6 | 'all',
  list: ChengYu[] = chengyuList,
): ChengYu[] {
  if (grade === 'all') return list;
  return list.filter(cy => cy.examples.some(e => e.grade === grade));
}

export const chengyuList: ChengYu[] = [
  {
    id: "cy-0",
    text: "五颜六色",
    examples: [
      { grade: 3, lesson: 1, sentence: "心愿墙上贴满了五颜六色的卡片，卡片上写着各种各样的愿望。" },
      { grade: 4, lesson: 11, sentence: "观众席上，同学们挥动着五颜六色的小旗。" },
    ],
  },
  {
    id: "cy-1",
    text: "各种各样",
    examples: [
      { grade: 3, lesson: 12, sentence: "新加坡是个美丽的大花园，有各种各样的花草树木。" },
      { grade: 3, lesson: 12, sentence: "餐厅的屋顶和墙壁上种满了各种各样的花草。" },
      { grade: 3, lesson: 13, sentence: "森林里住着各种各样的动物。" },
    ],
  },
  {
    id: "cy-2",
    text: "吞吞吐吐",
    examples: [
      { grade: 3, lesson: 6, sentence: "晶晶吞吞吐吐地说：“我......我还没画完呢。“" },
    ],
  },
  {
    id: "cy-3",
    text: "匆匆忙忙",
    examples: [
      { grade: 3, lesson: 7, sentence: "下雨了，陈阿姨匆匆忙忙地到李太太家收衣服去了。" },
    ],
  },
  {
    id: "cy-4",
    text: "整整齐齐",
    examples: [
      { grade: 3, lesson: 8, sentence: "爸爸折的衣服，整整齐齐的，像店里摆的一样。" },
    ],
  },
  {
    id: "cy-5",
    text: "大吃一惊",
    examples: [
      { grade: 3, lesson: 9, sentence: "小猴子看到河里有个月亮，大吃一惊，叫了起来：“不好了！月亮掉进河里啦！”" },
    ],
  },
  {
    id: "cy-6",
    text: "七嘴八舌",
    examples: [
      { grade: 3, lesson: 9, sentence: "猴子们七嘴八舌地商量怎么把月亮捞上来。" },
      { grade: 5, lesson: 3, sentence: "同学们抬起了头，七嘴八舌地说了起来：“看爸爸妈妈身份证，可以知道他们的生日。”" },
    ],
  },
  {
    id: "cy-7",
    text: "不以为然",
    examples: [
      { grade: 3, lesson: 10, sentence: "少年不以为然地说：“小弟弟，看清楚，我们是在画画！”" },
    ],
  },
  {
    id: "cy-8",
    text: "干干净净",
    examples: [
      { grade: 3, lesson: 10, sentence: "康康和他们一起把墙壁擦得干干净净。" },
      { grade: 5, lesson: 8, sentence: "他开始玩起来，把干活儿的事忘得干干净净。" },
    ],
  },
  {
    id: "cy-9",
    text: "不知不觉",
    examples: [
      { grade: 3, lesson: 11, sentence: "我昨晚看书时，不知不觉睡着了，忘了关灯。" },
      { grade: 5, lesson: 3, sentence: "张先生的泪水不知不觉地流了下来。" },
      { grade: 6, lesson: 2, sentence: "不知不觉地，撑伞的人已经变成了我。" },
      { grade: 6, lesson: 2, sentence: "不知不觉中，我和邻居家的大孩子成了好朋友。" },
      { grade: 6, lesson: 8, sentence: "不知不觉地，香烧完了。" },
      { grade: 5, lesson: 8, sentence: "一闭上眼睛，外婆那瘦弱的身影就浮现在脑海里，眼泪也不知不觉地流下来。" },
    ],
  },
  {
    id: "cy-10",
    text: "自由自在",
    examples: [
      { grade: 3, lesson: 13, sentence: "森林里的动物们在这里自由自在地生活。" },
    ],
  },
  {
    id: "cy-11",
    text: "愁眉苦脸",
    examples: [
      { grade: 3, lesson: 13, sentence: "小松鼠愁眉苦脸地说，“高速公路建好后，我再也见不到你们了。”" },
      { grade: 4, lesson: 14, sentence: "一天，甘罗看见爷爷愁眉苦脸的，就问他发生了什么事。" },
      { grade: 5, lesson: 4, sentence: "“我们在煮石头汤，可是没有调味料，怎么办？”阿福愁眉苦脸地对村民说。" },
      { grade: 5, lesson: 10, sentence: "走进教室，丽晴正在位子上愁眉苦脸地找自己的计算器。" },
    ],
  },
  {
    id: "cy-12",
    text: "一模一样",
    examples: [
      { grade: 3, lesson: 13, sentence: "天桥上面会种满花草树木，跟我们原本住的环境一模一样。" },
      { grade: 6, lesson: 11, sentence: "那个人抬起头，你发现他竟然长得跟你一模一样。" },
    ],
  },
  {
    id: "cy-13",
    text: "热锅上的蚂蚁",
    examples: [
      { grade: 3, lesson: 15, sentence: "他急得像热锅上的蚂蚁。" },
    ],
  },
  {
    id: "cy-14",
    text: "兴高采烈",
    examples: [
      { grade: 3, lesson: 17, sentence: "这次考试我得了一百分，我兴高采烈地跑回家，告诉妈妈这个好消息。" },
    ],
  },
  {
    id: "cy-15",
    text: "津津有味",
    examples: [
      { grade: 4, lesson: 1, sentence: "我打开电视津津有味地看起来。" },
      { grade: 6, lesson: 8, sentence: "来到书摊前，他选了一本书，付了钱，津津有味地读了起来。" },
      { grade: 6, lesson: 11, sentence: "你走进课室时，发现有个人坐在你的座位上，低着头津津有味地看书。" },
    ],
  },
  {
    id: "cy-16",
    text: "乌云密布",
    examples: [
      { grade: 4, lesson: 2, sentence: "天空乌云密布，紧接着下起了倾盆大雨。" },
    ],
  },
  {
    id: "cy-17",
    text: "灵机一动",
    examples: [
      { grade: 4, lesson: 2, sentence: "我忽然灵机一动，拉开外套对姐姐说：“这件外套很大，我们一人穿一半吧。”" },
    ],
  },
  {
    id: "cy-18",
    text: "急急忙忙",
    examples: [
      { grade: 4, lesson: 2, sentence: "妈妈撑着伞，急急忙忙地赶过来给我们送伞。" },
    ],
  },
  {
    id: "cy-19",
    text: "聚精会神",
    examples: [
      { grade: 4, lesson: 2, sentence: "查理在聚精会神地搭木塔。" },
    ],
  },
  {
    id: "cy-20",
    text: "迫不及待",
    examples: [
      { grade: 4, lesson: 2, sentence: "查理一回到家，就迫不及待地玩起了遥控飞机。" },
      { grade: 5, lesson: 7, sentence: "瑞恩刚放学回到家，就迫不及待地向妈妈伸手要钱。" },
      { grade: 5, lesson: 16, sentence: "听到熟悉的声音，老人迫不及待地问：“你到底写了什么？”" },
      { grade: 6, lesson: 3, sentence: "她买到了那对日思夜想的耳环。她迫不及待地戴上它，给妈妈看看，给爸爸看看，觉得自己美极了。" },
    ],
  },
  {
    id: "cy-21",
    text: "无微不至",
    examples: [
      { grade: 4, lesson: 3, sentence: "你出生后，我无微不至地照顾你。" },
    ],
  },
  {
    id: "cy-22",
    text: "闷闷不乐",
    examples: [
      { grade: 4, lesson: 5, sentence: "有几个同学的视力变差了，所以他们闷闷不乐。" },
    ],
  },
  {
    id: "cy-23",
    text: "神神秘秘",
    examples: [
      { grade: 4, lesson: 5, sentence: "我神神秘秘地说：“这不是马铃薯泥，这是仙女国的云朵。”" },
    ],
  },
  {
    id: "cy-24",
    text: "小心翼翼",
    examples: [
      { grade: 4, lesson: 6, sentence: "大家都非常兴奋，小心翼翼地学老师把手抬高，在纸上练习写毛笔字。" },
      { grade: 5, lesson: 10, sentence: "吃午饭时，我总是用手小心翼翼地遮住饭盒，快速地夹起萝卜干和豆芽往嘴里送。" },
    ],
  },
  {
    id: "cy-25",
    text: "手舞足蹈",
    examples: [
      { grade: 4, lesson: 7, sentence: "终于看到企鹅了，他高兴得手舞足蹈。" },
      { grade: 4, lesson: 13, sentence: "孙悟空一见到三丈高，像大柱子一样的金箍棒，就高兴得手舞足蹈。" },
      { grade: 6, lesson: 8, sentence: "阿海兴奋得手舞足蹈。" },
    ],
  },
  {
    id: "cy-26",
    text: "彬彬有礼",
    examples: [
      { grade: 4, lesson: 7, sentence: "小企鹅像一群彬彬有礼的绅士，真有趣。" },
      { grade: 4, lesson: 10, sentence: "小和彬彬有礼地问：“林伯伯，我能跟您借拖把吗？”" },
    ],
  },
  {
    id: "cy-27",
    text: "尽心尽力",
    examples: [
      { grade: 4, lesson: 7, sentence: "他尽心尽力地帮助村民。" },
    ],
  },
  {
    id: "cy-28",
    text: "不顾一切",
    examples: [
      { grade: 4, lesson: 11, sentence: "我赶紧接过接力棒，不顾一切地向前冲去。" },
    ],
  },
  {
    id: "cy-29",
    text: "三步并作两步",
    examples: [
      { grade: 4, lesson: 12, sentence: "我三步并作两步跑上前，给妹妹和天鹅拍照。" },
    ],
  },
  {
    id: "cy-30",
    text: "一鸣惊人",
    examples: [
      { grade: 4, lesson: 12, sentence: "在这次比赛中，朱比赛一鸣惊人，他创作的《前进吧，新加坡》获得了第一名。" },
    ],
  },
  {
    id: "cy-31",
    text: "三更半夜",
    examples: [
      { grade: 4, lesson: 13, sentence: "到了三更半夜，美猴王悄悄地从后门来找老神仙。" },
    ],
  },
  {
    id: "cy-32",
    text: "九牛二虎之力",
    examples: [
      { grade: 4, lesson: 13, sentence: "虾兵蟹将费了九牛二虎之力，抬出了许多兵器，如刀，剑，棍等，让孙悟空挑选。" },
    ],
  },
  {
    id: "cy-33",
    text: "怒气冲冲",
    examples: [
      { grade: 4, lesson: 13, sentence: "“再找，再找！不然，我拆了你的龙宫！”孙悟空怒气冲冲地说。" },
    ],
  },
  {
    id: "cy-34",
    text: "自言自语",
    examples: [
      { grade: 4, lesson: 13, sentence: "“怎么扛走金箍棒呢？”孙悟空摸着金箍棒自言自语。" },
      { grade: 6, lesson: 5, sentence: "”剑明明从这里掉下去的，怎么就捞不到了呢？简直太奇怪了！他自言自语地说。" },
    ],
  },
  {
    id: "cy-35",
    text: "拳打脚踢",
    examples: [
      { grade: 4, lesson: 13, sentence: "孙悟空变成一只虫子，趁铁扇公主喝茶时，钻进她的肚子里拳打脚踢。" },
    ],
  },
  {
    id: "cy-36",
    text: "有样学样",
    examples: [
      { grade: 4, lesson: 13, sentence: "他挥动拳头，猴子也有样学样，挥动拳头。" },
    ],
  },
  {
    id: "cy-37",
    text: "不慌不忙",
    examples: [
      { grade: 4, lesson: 14, sentence: "阿凡提不慌不忙地说：“你们谁也不欠谁的。”" },
      { grade: 6, lesson: 5, sentence: "船夫叫他赶紧下水去捞，他却毫不在意，不慌不忙地从衣袋里拿出一把小刀，在船舷上刻了一个记号。" },
    ],
  },
  {
    id: "cy-38",
    text: "结结实实",
    examples: [
      { grade: 5, lesson: 1, sentence: "我和同伴把脚绑得结结实实的。" },
    ],
  },
  {
    id: "cy-39",
    text: "四脚朝天",
    examples: [
      { grade: 5, lesson: 1, sentence: "我和同伴刚一抬腿，就摔了个四脚朝天。" },
    ],
  },
  {
    id: "cy-40",
    text: "狼吞虎咽",
    examples: [
      { grade: 5, lesson: 1, sentence: "我打开饭盒，不管三七二十一，狼吞虎咽地吃了起来。" },
    ],
  },
  {
    id: "cy-41",
    text: "一望无际",
    examples: [
      { grade: 5, lesson: 1, sentence: "吃过晚餐，我们走到沙滩上。只见大海一望无际。" },
    ],
  },
  {
    id: "cy-42",
    text: "无忧无虑",
    examples: [
      { grade: 5, lesson: 2, sentence: "在大自然的怀抱中，我们都是无忧无虑的孩子。" },
      { grade: 6, lesson: 8, sentence: "他们是早期移民的孩子。塑像表现了他们简单、快乐、无忧无虑的童年生活。" },
    ],
  },
  {
    id: "cy-43",
    text: "异口同声",
    examples: [
      { grade: 5, lesson: 3, sentence: "老师问全班同学：“爸爸妈妈知道你们的生日吗？”“知道！”我们异口同声地回答。" },
    ],
  },
  {
    id: "cy-44",
    text: "左顾右盼",
    examples: [
      { grade: 5, lesson: 3, sentence: "我们都举起了手，有的还神气十足地左顾右盼。" },
    ],
  },
  {
    id: "cy-45",
    text: "鸦雀无声",
    examples: [
      { grade: 5, lesson: 3, sentence: "教室里鸦雀无声。我们都低头沉默着，好像犯了错误似的。" },
    ],
  },
  {
    id: "cy-46",
    text: "语重心长",
    examples: [
      { grade: 5, lesson: 3, sentence: "老师语重心长地说：“父母养育你们不容易。”" },
    ],
  },
  {
    id: "cy-47",
    text: "半信半疑",
    examples: [
      { grade: 5, lesson: 3, sentence: "随着年龄的增长，我开始对圣诞老人的存在半信半疑。" },
    ],
  },
  {
    id: "cy-48",
    text: "迷迷糊糊",
    examples: [
      { grade: 5, lesson: 3, sentence: "迷迷糊糊中，只见他穿着爸爸常穿的衣服，悄悄地把礼物放进我挂在窗口的小袜子里。" },
    ],
  },
  {
    id: "cy-49",
    text: "苦口婆心",
    examples: [
      { grade: 5, lesson: 3, sentence: "张先生苦口婆心地劝儿子改过，但儿子还是一副满不在乎的样子。" },
    ],
  },
  {
    id: "cy-50",
    text: "风雪交加",
    examples: [
      { grade: 5, lesson: 4, sentence: "一个风雪交加的夜晚，克雷司开着车子，行驶在回家的路上。" },
    ],
  },
  {
    id: "cy-51",
    text: "大街小巷",
    examples: [
      { grade: 5, lesson: 4, sentence: "感谢脚踏车带我走过大街小巷，留下了童年的欢笑。" },
    ],
  },
  {
    id: "cy-52",
    text: "争先恐后",
    examples: [
      { grade: 5, lesson: 6, sentence: "几个路人看见了，争先恐后地向钞票飘走的方向跑去。" },
      { grade: 5, lesson: 14, sentence: "老师经常提问，同学们都争先恐后地举手回答。" },
    ],
  },
  {
    id: "cy-53",
    text: "不约而同",
    examples: [
      { grade: 5, lesson: 6, sentence: "不料那几个人不约而同地回来了，他们把捡到的钞票交给老伯伯。" },
      { grade: 5, lesson: 14, sentence: "全班同学纷纷议论，有几个同学不约而同地喊道：“老师，他不会。”" },
    ],
  },
  {
    id: "cy-54",
    text: "喜出望外",
    examples: [
      { grade: 5, lesson: 6, sentence: "老伯伯喜出望外，连声说：“谢谢！麻烦你们了！”" },
    ],
  },
  {
    id: "cy-55",
    text: "历历在目",
    examples: [
      { grade: 5, lesson: 6, sentence: "这件事已经过去很久了，现在回忆起来，仍然历历在目，让我十分难忘。" },
    ],
  },
  {
    id: "cy-56",
    text: "兴致勃勃",
    examples: [
      { grade: 5, lesson: 6, sentence: "他怎么告诉那六个兴致勃勃的小孩，他没有足够的钱买票呢？" },
    ],
  },
  {
    id: "cy-57",
    text: "依依不舍",
    examples: [
      { grade: 5, lesson: 7, sentence: "村民们也挥着手，依依不舍地跟鲸鱼道别，直到它的身影消失在海平面。" },
    ],
  },
  {
    id: "cy-58",
    text: "奄奄一息",
    examples: [
      { grade: 5, lesson: 7, sentence: "小鱼在少得可怜的水里挣扎着，奄奄一息。" },
    ],
  },
  {
    id: "cy-59",
    text: "目不转睛",
    examples: [
      { grade: 5, lesson: 7, sentence: "我停下脚步，目不转睛地注视着小男孩努力救小鱼的动作。" },
    ],
  },
  {
    id: "cy-60",
    text: "光阴似箭",
    examples: [
      { grade: 5, lesson: 8, sentence: "爸爸的话，让我想起了在书上读到的“光阴似箭”这样的词句。" },
    ],
  },
  {
    id: "cy-61",
    text: "井井有条",
    examples: [
      { grade: 5, lesson: 8, sentence: "为了节省时间，我学会了做计划，把事情安排得井井有条。" },
    ],
  },
  {
    id: "cy-62",
    text: "摇摇晃晃",
    examples: [
      { grade: 5, lesson: 10, sentence: "当小种子还住在果实的心里，在枝头摇摇晃晃时，它想着：我将长成一棵漂亮的小树。" },
    ],
  },
  {
    id: "cy-63",
    text: "细声细气",
    examples: [
      { grade: 5, lesson: 10, sentence: "小种子细声细气地对路过的蚯蚓说，“喂，蚯蚓大哥，帮我松松土吧。”" },
    ],
  },
  {
    id: "cy-64",
    text: "普普通通",
    examples: [
      { grade: 5, lesson: 10, sentence: "我在镜子里看到一个普普通通的小孩，可我知道，在我的身体里面，藏着一个更好的自己。" },
    ],
  },
  {
    id: "cy-65",
    text: "五彩缤纷",
    examples: [
      { grade: 5, lesson: 12, sentence: "夜空中燃放出五彩缤纷的烟花，把庆典的欢乐气氛推向高潮。" },
    ],
  },
  {
    id: "cy-66",
    text: "不屈不挠",
    examples: [
      { grade: 5, lesson: 12, sentence: "墙上的凤鸟图和草书对联，描述了先辈们不屈不挠，建设新加坡的奋斗精神。" },
      { grade: 6, lesson: 1, sentence: "不管是烈日当空，还是暴雨倾盆，不管是狂风阵阵，还是大雪纷纷，它都不屈不挠，勇敢、坚强地活着。" },
      { grade: 6, lesson: 1, sentence: "既然是一棵松树，就应该好好地做一棵松树，以坚强的意志和不屈不挠的精神来展示自己。" },
    ],
  },
  {
    id: "cy-67",
    text: "胸有成竹",
    examples: [
      { grade: 5, lesson: 13, sentence: "杨修笑了笑，胸有成竹地说：“你们把门改窄一些就行了。”" },
      { grade: 6, lesson: 1, sentence: "“当然！”我胸有成竹地说，“我连续几周都得了第一。”" },
    ],
  },
  {
    id: "cy-68",
    text: "陆陆续续",
    examples: [
      { grade: 5, lesson: 13, sentence: "放学后，同学们陆陆续续回家了。" },
      { grade: 6, lesson: 11, sentence: "这时，同学们陆陆续续走了进来，他们都被你们俩搞糊涂了。" },
    ],
  },
  {
    id: "cy-69",
    text: "夜深人静",
    examples: [
      { grade: 5, lesson: 15, sentence: "每当夜深人静的时候，老槐树和小槐树就悄悄地说起话来。" },
    ],
  },
  {
    id: "cy-70",
    text: "清清楚楚",
    examples: [
      { grade: 5, lesson: 15, sentence: "这150年里，哪年冷，哪年暖，我都记得清清楚楚。" },
    ],
  },
  {
    id: "cy-71",
    text: "视而不见",
    examples: [
      { grade: 5, lesson: 16, sentence: "尽管街上来来往往的行人众多，但都匆匆而过，对他视而不见。" },
    ],
  },
  {
    id: "cy-72",
    text: "翩翩起舞",
    examples: [
      { grade: 5, lesson: 16, sentence: "蝴蝶在草地上翩翩起舞。" },
    ],
  },
  {
    id: "cy-73",
    text: "冷漠无情",
    examples: [
      { grade: 5, lesson: 16, sentence: "当人们想到这一切时，怎么可能冷漠无情呢？" },
    ],
  },
  {
    id: "cy-74",
    text: "筋疲力尽",
    examples: [
      { grade: 5, lesson: 16, sentence: "他们忙了一整天，弄得筋疲力尽，好不容易才各自捉到两只兔子。" },
      { grade: 6, lesson: 9, sentence: "这时，它已经全身是伤，筋疲力尽了。" },
    ],
  },
  {
    id: "cy-75",
    text: "闪闪发光",
    examples: [
      { grade: 5, lesson: 17, sentence: "灯一开，石像闪闪发光。" },
    ],
  },
  {
    id: "cy-76",
    text: "远道而来",
    examples: [
      { grade: 5, lesson: 17, sentence: "金字塔吸引了多少远道而来的游客。" },
    ],
  },
  {
    id: "cy-77",
    text: "临时抱佛脚",
    examples: [
      { grade: 6, lesson: 1, sentence: "我要和时间赛跑，把大目标分成一个一个小目标，订好复习计划，不要临时抱佛脚。" },
    ],
  },
  {
    id: "cy-78",
    text: "风吹雨打",
    examples: [
      { grade: 6, lesson: 1, sentence: "在高高的山顶上，有一棵不起眼的小松树。不管风吹雨打，还是日晒雨淋，它都快乐地生长着。" },
    ],
  },
  {
    id: "cy-79",
    text: "枝繁叶茂",
    examples: [
      { grade: 6, lesson: 1, sentence: "后来，小松树长成了一棵高大挺拔、枝繁叶茂的大松树。" },
    ],
  },
  {
    id: "cy-80",
    text: "一蹦一跳",
    examples: [
      { grade: 6, lesson: 2, sentence: "我总是一蹦一跳地来到外公身旁，迅速地钻进伞底下，挽起外公的手臂，顽皮地踩着路面的积水，和他一起走进雨的世界。" },
    ],
  },
  {
    id: "cy-81",
    text: "笑而不语",
    examples: [
      { grade: 6, lesson: 2, sentence: "“外公，伞歪了。”" },
    ],
  },
  {
    id: "cy-82",
    text: "遮风挡雨",
    examples: [
      { grade: 6, lesson: 2, sentence: "仍然是雨的世界，仍然是我和外公，仍然是蓝色的大伞为我们遮风挡雨。" },
    ],
  },
  {
    id: "cy-83",
    text: "奇形怪状",
    examples: [
      { grade: 6, lesson: 2, sentence: "外婆捡起这些奇形怪状的蔬菜，说：“开叉的萝卜切成小块，煮出来味道一样。弯曲的小黄瓜做成泡菜，味道也一样。”" },
    ],
  },
  {
    id: "cy-84",
    text: "五花八门",
    examples: [
      { grade: 6, lesson: 3, sentence: "筷子的设计五花八门，它不仅是吃饭夹菜的餐具，也是供人们欣赏、收藏的艺术品。" },
    ],
  },
  {
    id: "cy-85",
    text: "随时随地",
    examples: [
      { grade: 6, lesson: 3, sentence: "现在，我们随时随地都可以吃到鸡饭，但做成饭团的鸡饭已经不多见了。" },
    ],
  },
  {
    id: "cy-86",
    text: "大饱口福",
    examples: [
      { grade: 6, lesson: 3, sentence: "如果你有朋友来新加坡，除了请他们吃鸡饭、沙爹、咖喱鱼头外，别忘了请他们品尝肉骨茶，大饱口福。" },
    ],
  },
  {
    id: "cy-87",
    text: "回味无穷",
    examples: [
      { grade: 6, lesson: 3, sentence: "特别是祖母做的年糕，更是让我回味无穷。" },
    ],
  },
  {
    id: "cy-88",
    text: "自然而然",
    examples: [
      { grade: 6, lesson: 3, sentence: "一看到年糕，心中便自然而然地生出喜庆之意、圆满之感。" },
    ],
  },
  {
    id: "cy-89",
    text: "大功告成",
    examples: [
      { grade: 6, lesson: 3, sentence: "时间到了，祖母看到大功告成的年糕，眉开眼笑地说：“啊，年糕年糕，年年高。”" },
    ],
  },
  {
    id: "cy-90",
    text: "眉开眼笑",
    examples: [
      { grade: 6, lesson: 3, sentence: "时间到了，祖母看到大功告成的年糕，眉开眼笑地说：“啊，年糕年糕，年年高。”" },
    ],
  },
  {
    id: "cy-91",
    text: "诚心诚意",
    examples: [
      { grade: 6, lesson: 3, sentence: "祖母做年糕时那张诚心诚意的脸，却经常浮现在我眼前。" },
    ],
  },
  {
    id: "cy-92",
    text: "不翼而飞",
    examples: [
      { grade: 6, lesson: 3, sentence: "她擦洗干净后，猛然发现项链不翼而飞了。" },
    ],
  },
  {
    id: "cy-93",
    text: "省吃俭用",
    examples: [
      { grade: 6, lesson: 3, sentence: "她省吃俭用，存了半年的钱才给我买的。" },
    ],
  },
  {
    id: "cy-94",
    text: "人非圣贤，谁能无过",
    examples: [
      { grade: 6, lesson: 3, sentence: "“人非圣贤，谁能无过。也许是项链太漂亮了，也许她急着用钱。" },
    ],
  },
  {
    id: "cy-95",
    text: "改过自新",
    examples: [
      { grade: 6, lesson: 3, sentence: "如果我叫保安，女孩就失去了一个改过自新的机会。" },
    ],
  },
  {
    id: "cy-96",
    text: "日思夜想",
    examples: [
      { grade: 6, lesson: 3, sentence: "她买到了那对日思夜想的耳环。她迫不及待地戴上它，给妈妈看看，给爸爸看看，觉得自己美极了。" },
    ],
  },
  {
    id: "cy-97",
    text: "游手好闲",
    examples: [
      { grade: 6, lesson: 5, sentence: "从前有个财主，看到三个儿子整天游手好闲、无所事事，也不会写文章，就从外面请了一位老师来教他们。" },
    ],
  },
  {
    id: "cy-98",
    text: "火冒三丈",
    examples: [
      { grade: 6, lesson: 5, sentence: "财主气得火冒三丈，快步向老二的房间走去。" },
    ],
  },
  {
    id: "cy-99",
    text: "理直气壮",
    examples: [
      { grade: 6, lesson: 5, sentence: "“古人说‘读书破万卷，下笔如有神’，我才撕了几十本书，离万卷还远着呢，当然没办法动笔啦！”老二理直气壮地说。" },
    ],
  },
  {
    id: "cy-100",
    text: "赞不绝口",
    examples: [
      { grade: 6, lesson: 5, sentence: "父亲的朋友都赞不绝口，称他是个神童。" },
    ],
  },
  {
    id: "cy-101",
    text: "得意扬扬",
    examples: [
      { grade: 6, lesson: 5, sentence: "一天，苏东坡得意扬扬地写下一副对联：识遍天下字，读尽人间书。" },
    ],
  },
  {
    id: "cy-102",
    text: "不谋而合",
    examples: [
      { grade: 6, lesson: 6, sentence: "周瑜：我同意，您跟我想的一样，我们不谋而合。" },
    ],
  },
  {
    id: "cy-103",
    text: "足智多谋",
    examples: [
      { grade: 6, lesson: 6, sentence: "您足智多谋，想听听您的建议。" },
    ],
  },
  {
    id: "cy-104",
    text: "神机妙算",
    examples: [
      { grade: 6, lesson: 6, sentence: "鲁肃：（抱拳）先生真是神机妙算啊！佩服，佩服！" },
      { grade: 6, lesson: 6, sentence: "众人听了都很佩服诸葛亮，说他以空城退敌兵，真是足智多谋，神机妙算。" },
    ],
  },
  {
    id: "cy-105",
    text: "不费吹灰之力",
    examples: [
      { grade: 6, lesson: 6, sentence: "诸葛亮不费吹灰之力“造”了十万只箭。周瑜知道了，自叹不如。" },
    ],
  },
  {
    id: "cy-106",
    text: "若无其事",
    examples: [
      { grade: 6, lesson: 6, sentence: "他远远地望过去，果然看见诸葛亮正坐在城楼上若无其事地弹琴，城楼下一些人在打扫街道。" },
    ],
  },
  {
    id: "cy-107",
    text: "心惊胆战",
    examples: [
      { grade: 6, lesson: 6, sentence: "众人心惊胆战，不知如何是好。" },
    ],
  },
  {
    id: "cy-108",
    text: "流连忘返",
    examples: [
      { grade: 6, lesson: 7, sentence: "长江三峡全长约200公里，两岸雄伟的山脉、众多的名胜古迹，让游客流连忘返。" },
    ],
  },
  {
    id: "cy-109",
    text: "左邻右舍",
    examples: [
      { grade: 6, lesson: 8, sentence: "”粪车来了！“ 每当三十二扇门的车子来了，左邻右舍的小孩子很自然地就用手捏住鼻子，一边往屋里跑，一边喊。" },
    ],
  },
  {
    id: "cy-110",
    text: "三三两两",
    examples: [
      { grade: 6, lesson: 8, sentence: "天黑了，人们三三两两地来到河边。" },
    ],
  },
  {
    id: "cy-111",
    text: "栩栩如生",
    examples: [
      { grade: 6, lesson: 8, sentence: "许多重要的历史人物栩栩如生地出现在观众眼前。" },
      { grade: 6, lesson: 9, sentence: "只见四条金龙神态各异，栩栩如生，人们都赞不绝口。" },
    ],
  },
  {
    id: "cy-112",
    text: "不可思议",
    examples: [
      { grade: 6, lesson: 8, sentence: "”真不可思议！“同学们都不停地赞叹。" },
    ],
  },
  {
    id: "cy-113",
    text: "打抱不平",
    examples: [
      { grade: 6, lesson: 9, sentence: "天上有一条黄龙，爱打抱不平，只要看见人间有不合理的事情，一定出来主持公道，帮助弱者。" },
    ],
  },
  {
    id: "cy-114",
    text: "千辛万苦",
    examples: [
      { grade: 6, lesson: 9, sentence: "黄龙按照太上老君的指引，经过千辛万苦，爬到了东海，止住了雨。" },
    ],
  },
  {
    id: "cy-115",
    text: "目瞪口呆",
    examples: [
      { grade: 6, lesson: 9, sentence: "大家吓得目瞪口呆。墙上只剩下两条还没点上眼睛的龙。" },
    ],
  },
  {
    id: "cy-116",
    text: "全神贯注",
    examples: [
      { grade: 6, lesson: 10, sentence: "我踮起脚尖，急忙把书取下来，翻到昨天读到的地方，全神贯注地读起来。一页，两页。" },
    ],
  },
  {
    id: "cy-117",
    text: "有惊无险",
    examples: [
      { grade: 6, lesson: 10, sentence: "他冒出了一身冷汗，但管理员并没发现。这件事就这样有惊无险地过去了。" },
    ],
  },
  {
    id: "cy-118",
    text: "窃窃私语",
    examples: [
      { grade: 6, lesson: 10, sentence: "摇摇头，他瞧见蜜蜂和花朵窃窃私语，它们在说什么悄悄话呢？" },
    ],
  },
  {
    id: "cy-119",
    text: "无精打采",
    examples: [
      { grade: 6, lesson: 11, sentence: "”咦，脑袋出租？“原本无精打采的罗伯特被广告吸引住了。" },
    ],
  },
  {
    id: "cy-120",
    text: "垂头丧气",
    examples: [
      { grade: 6, lesson: 11, sentence: "回家路上，罗伯特垂头丧气地走着。" },
    ],
  },
  {
    id: "cy-121",
    text: "半途而废",
    examples: [
      { grade: 6, lesson: 12, sentence: "你们一定要勇敢前进、坚持到底，要有恒心，绝对不可半途而废！" },
    ],
  },
];
