/**
 * Built-in growth & health guide shown on the timeline.
 *
 * Sources (checked November 2026):
 * - Milestones: CDC "Learn the Signs. Act Early." checklists (2022 revision). Each item is something about
 *   75% of children do by that age, so not having done it yet is common.
 * - US vaccines: AAP Recommended Child and Adolescent Immunization Schedule, United States, 2026
 *   (updated September 2, 2026). The CDC schedule changed in January 2026 and is under a court stay, so the
 *   AAP schedule is used.
 * - China vaccines: 国家免疫规划疫苗儿童免疫程序及说明（2026 年版）.
 * - Health tips: AAP (HealthyChildren.org) unless noted.
 *
 * Ages are in months. Milestones and developmental phases use corrected age for preterm babies;
 * vaccines and checkups follow actual age (both the AAP and the China programme schedule preterm babies by
 * chronological age).
 */
import {tr} from './i18n';

export type Region = 'us' | 'cn';
export type Text = {zh: string; en: string};
export const say = (t: Text) => tr(t.zh, t.en);

export type GuideKind = 'milestone' | 'vaccine' | 'checkup' | 'phase' | 'tip';
export type MilestoneArea = 'social' | 'language' | 'cognitive' | 'movement';
export type VaccineId =
  | 'hepb'
  | 'bcg'
  | 'rsv'
  | 'rv'
  | 'dtap'
  | 'hib'
  | 'pcv'
  | 'polio'
  | 'flu'
  | 'covid'
  | 'mmr'
  | 'var'
  | 'hepa'
  | 'je'
  | 'men';

export type Source = {name: Text; url?: string};
export type GuideItem = {
  key: string;
  kind: GuideKind;
  /** Age in months when the item starts (for milestones: the checklist age). */
  from: number;
  /** Last month of the window; equals `from` when it is a single age. */
  to: number;
  /** Follows corrected age for preterm babies. */
  corrected: boolean;
  title: Text;
  body?: Text;
  source: Source;
  region?: Region;
  /** Milestones picked for the timeline; the rest are in the full checklist. */
  highlight?: boolean;
  area?: MilestoneArea;
  vaccine?: VaccineId;
  /** Safety information that should stand out. */
  important?: boolean;
};

// ---------------------------------------------------------------------------------------------- sources
const cdc = (age: string): Source => ({
  name: {zh: 'CDC 发育里程碑清单', en: 'CDC milestone checklist'},
  url: `https://www.cdc.gov/act-early/milestones/${age}.html`,
});
const hc = (zh: string, en: string, path: string): Source => ({
  name: {zh: `美国儿科学会 AAP · ${zh}`, en: `American Academy of Pediatrics · ${en}`},
  url: `https://www.healthychildren.org/English/${path}`,
});
export const SOURCES = {
  aapSchedule: {
    name: {zh: 'AAP 2026 儿童免疫程序', en: 'AAP 2026 immunization schedule'},
    url: 'https://www.aap.org/ImmunizationSchedule',
  },
  cnSchedule: {
    name: {
      zh: '国家免疫规划疫苗儿童免疫程序及说明（2026 年版）',
      en: 'China National Immunization Program schedule (2026)',
    },
    url: 'https://www.ndcpa.gov.cn/jbkzzx/c100014/2073005020766703616/BXZA3kH5.pdf',
  },
  aapCheckups: {
    name: {zh: 'AAP Bright Futures 体检时间表', en: 'AAP Bright Futures periodicity schedule'},
    url: 'https://www.aap.org/periodicityschedule',
  },
  cnCheckups: {
    name: {
      zh: '国家基本公共卫生服务规范（第三版）· 0–6 岁儿童健康管理',
      en: 'China National Basic Public Health Service Standards (3rd ed.), child health management',
    },
  },
  vaccineSafety: hc('疫苗', 'Immunizations', 'safety-prevention/immunizations/Pages/default.aspx'),
  colic: hc('肠绞痛', 'Colic', 'ages-stages/baby/crying-colic/Pages/Colic.aspx'),
  enoughMilk: hc(
    '宝宝吃够了吗',
    'Is your baby getting enough milk?',
    'ages-stages/baby/breastfeeding/Pages/How-to-Tell-if-Baby-is-Getting-Enough-Milk.aspx',
  ),
  teething: hc('出牙', 'Teething', 'ages-stages/baby/teething-tooth-care/Pages/Teething-Pain.aspx'),
  teeth: hc(
    '预防蛀牙',
    'Preventing tooth decay',
    'ages-stages/baby/teething-tooth-care/Pages/How-to-Prevent-Tooth-Decay-in-Your-Baby.aspx',
  ),
  solids: hc(
    '开始添加辅食',
    'Starting solid foods',
    'ages-stages/baby/feeding-nutrition/Pages/Starting-Solid-Foods.aspx',
  ),
  sleep: hc('安全睡眠', 'Safe sleep', 'ages-stages/baby/sleep/Pages/A-Parents-Guide-to-Safe-Sleep.aspx'),
  fever: hc(
    '发烧何时就医',
    'Fever: when to call',
    'health-issues/conditions/fever/Pages/When-to-Call-the-Pediatrician.aspx',
  ),
  supplements: hc(
    '维生素 D 和铁',
    'Vitamin D & iron',
    'ages-stages/baby/feeding-nutrition/Pages/Vitamin-Iron-Supplements.aspx',
  ),
  jaundice: hc('新生儿黄疸', 'Jaundice', 'ages-stages/baby/Pages/Jaundice.aspx'),
  screening: hc('新生儿筛查', 'Newborn screening', 'ages-stages/baby/Pages/Newborn-Screening-Tests.aspx'),
  botulism: hc('婴儿肉毒中毒', 'Infant botulism', 'health-issues/conditions/infections/Pages/Botulism.aspx'),
  drinks: hc(
    '0–5 岁推荐饮品',
    'Recommended drinks, ages 0–5',
    'healthy-living/nutrition/Pages/Recommended-Drinks-for-Young-Children-Ages-0-5.aspx',
  ),
  separation: hc(
    '8–12 个月的情绪发展',
    'Emotional development, 8–12 months',
    'ages-stages/baby/Pages/Emotional-and-Social-Development-8-12-Months.aspx',
  ),
  cnDiet: {
    name: {zh: '中国居民膳食指南（2022）', en: 'Chinese Dietary Guidelines (2022)'},
    url: 'http://dg.cnsoc.org/',
  },
  common: {
    name: {zh: '育儿常见经验，非医学指南', en: 'Common parenting experience, not a medical guideline'},
  },
} satisfies Record<string, Source>;

// ------------------------------------------------------------------------------------------- milestones
type M = [slug: string, area: MilestoneArea, zh: string, en: string, highlight?: true];
const MILESTONES: [months: number, page: string, items: M[]][] = [
  [
    2,
    '2-months',
    [
      ['calms', 'social', '和他说话或抱起来时会安静下来', 'Calms down when spoken to or picked up'],
      ['face', 'social', '会看你的脸', 'Looks at your face'],
      ['happy', 'social', '看到你走近时显得很开心', 'Seems happy to see you when you walk up'],
      [
        'social-smile',
        'social',
        '你对他说话或微笑时，会回以微笑（社会性微笑）',
        'Smiles when you talk to or smile at them (social smile)',
        true,
      ],
      ['sounds', 'language', '除了哭，还会发出别的声音', 'Makes sounds other than crying', true],
      ['loud', 'language', '对大的声音有反应', 'Reacts to loud sounds'],
      ['watches', 'cognitive', '目光会跟着你移动', 'Watches you as you move'],
      ['toy-look', 'cognitive', '会盯着玩具看几秒', 'Looks at a toy for several seconds'],
      ['head-up', 'movement', '趴着时能抬头', 'Holds head up when on tummy', true],
      ['moves', 'movement', '两只胳膊和两条腿都会动', 'Moves both arms and both legs'],
      ['hands-open', 'movement', '会短暂张开小手', 'Opens hands briefly'],
    ],
  ],
  [
    4,
    '4-months',
    [
      ['smile-own', 'social', '会主动微笑来吸引你的注意', 'Smiles on their own to get your attention'],
      [
        'chuckle',
        'social',
        '你逗他时会咯咯笑（还不是大笑）',
        'Chuckles when you try to make them laugh',
        true,
      ],
      [
        'attention',
        'social',
        '会用眼神、动作或声音吸引你的注意',
        'Looks, moves or makes sounds to get your attention',
      ],
      ['coos', 'language', '发出“哦～”“啊～”的声音', 'Coos (“oooo”, “aahh”)', true],
      ['talks-back', 'language', '你说话时，会发声回应', 'Makes sounds back when you talk'],
      ['turns-voice', 'language', '听到你的声音会转头', 'Turns head towards the sound of your voice'],
      [
        'hungry-mouth',
        'cognitive',
        '饿了看到乳房或奶瓶会张嘴',
        'If hungry, opens mouth when seeing breast or bottle',
      ],
      ['hands-look', 'cognitive', '会好奇地看自己的手', 'Looks at their hands with interest'],
      [
        'head-steady',
        'movement',
        '被抱着时，头能稳稳立住',
        'Holds head steady without support when held',
        true,
      ],
      ['holds-toy', 'movement', '玩具放到手里能握住', 'Holds a toy when you put it in their hand'],
      ['swings', 'movement', '会挥动手臂去够玩具', 'Uses an arm to swing at toys'],
      ['hands-mouth', 'movement', '会把手放进嘴里', 'Brings hands to mouth'],
      ['elbows', 'movement', '趴着时能用手肘撑起上身', 'Pushes up onto elbows/forearms when on tummy', true],
    ],
  ],
  [
    6,
    '6-months',
    [
      ['familiar', 'social', '认得熟悉的人', 'Knows familiar people'],
      ['mirror', 'social', '喜欢照镜子', 'Likes to look at self in a mirror'],
      ['laughs', 'social', '会笑出声', 'Laughs', true],
      ['turns', 'language', '会和你一来一回地“对话”', 'Takes turns making sounds with you'],
      ['raspberries', 'language', '会吐舌头吹“噗噗”', 'Blows “raspberries”'],
      ['squeals', 'language', '会发出尖叫声', 'Makes squealing noises'],
      ['mouths', 'cognitive', '会把东西放进嘴里探索', 'Puts things in mouth to explore them'],
      ['reaches', 'cognitive', '会伸手抓想要的玩具', 'Reaches to grab a toy they want', true],
      ['lips', 'cognitive', '不想吃时会闭上嘴', 'Closes lips to show they don’t want more food'],
      ['rolls', 'movement', '能从趴着翻到躺着', 'Rolls from tummy to back', true],
      ['straight-arms', 'movement', '趴着时能用伸直的手臂撑起', 'Pushes up with straight arms when on tummy'],
      ['leans', 'movement', '坐着时会用手撑住自己', 'Leans on hands to support themself when sitting'],
    ],
  ],
  [
    9,
    '9-months',
    [
      [
        'strangers',
        'social',
        '见到陌生人会害羞、黏人或害怕',
        'Is shy, clingy or fearful around strangers',
        true,
      ],
      ['faces', 'social', '会做出开心、难过、生气、惊讶等表情', 'Shows several facial expressions'],
      ['name', 'social', '叫名字会看过来', 'Looks when you call their name', true],
      ['you-leave', 'social', '你离开时会有反应（看你、伸手或哭）', 'Reacts when you leave'],
      ['peekaboo', 'social', '玩躲猫猫时会笑', 'Smiles or laughs at peek-a-boo'],
      [
        'babbles',
        'language',
        '会发出“mamama”“bababa”的声音',
        'Makes sounds like “mamamama” and “babababa”',
        true,
      ],
      ['arms-up', 'language', '会举起双手要抱', 'Lifts arms up to be picked up'],
      ['looks-for', 'cognitive', '东西掉了会去找', 'Looks for objects when dropped out of sight'],
      ['bangs', 'cognitive', '会把两个东西对敲', 'Bangs two things together'],
      ['sits-up', 'movement', '能自己坐起来', 'Gets to a sitting position alone'],
      ['hand-to-hand', 'movement', '能把东西从一只手换到另一只手', 'Moves things from one hand to the other'],
      ['rakes', 'movement', '会用手指把食物扒拉过来', 'Uses fingers to “rake” food towards themself'],
      ['sits', 'movement', '不用扶也能坐稳', 'Sits without support', true],
    ],
  ],
  [
    12,
    '1-year',
    [
      ['pat-a-cake', 'social', '会和你玩拍手游戏', 'Plays games with you, like pat-a-cake'],
      ['waves', 'language', '会挥手“拜拜”', 'Waves “bye-bye”', true],
      [
        'mama',
        'language',
        '会叫“妈妈”“爸爸”或其他专门的称呼',
        'Calls a parent “mama”, “dada” or another special name',
        true,
      ],
      ['no', 'language', '听得懂“不”（会停顿或停下）', 'Understands “no”'],
      ['container', 'cognitive', '会把东西放进容器里', 'Puts something in a container'],
      ['hidden', 'cognitive', '会找你藏起来的东西', 'Looks for things they see you hide'],
      ['pulls-up', 'movement', '能扶着东西站起来', 'Pulls up to stand', true],
      ['cruises', 'movement', '能扶着家具走', 'Walks, holding on to furniture', true],
      ['cup-held', 'movement', '你扶着杯子时，能用无盖杯喝水', 'Drinks from an open cup as you hold it'],
      ['pincer', 'movement', '能用拇指和食指捏起小东西', 'Picks things up between thumb and pointer finger'],
    ],
  ],
  [
    15,
    '15-months',
    [
      ['copies-kids', 'social', '会模仿其他小朋友玩', 'Copies other children while playing'],
      ['shows', 'social', '会把喜欢的东西拿给你看', 'Shows you an object they like'],
      ['claps', 'social', '兴奋时会拍手', 'Claps when excited', true],
      ['hugs-toy', 'social', '会抱毛绒玩具', 'Hugs a stuffed toy'],
      ['affection', 'social', '会抱你、蹭你或亲你', 'Shows you affection (hugs, cuddles or kisses)'],
      [
        'words',
        'language',
        '除了“妈妈”“爸爸”，还会尝试说一两个词',
        'Tries to say one or two words besides “mama” or “dada”',
        true,
      ],
      ['named', 'language', '你说出熟悉物品的名字时会看过去', 'Looks at a familiar object when you name it'],
      [
        'directions-gesture',
        'language',
        '能听懂配合手势的简单指令',
        'Follows directions given with a gesture and words',
      ],
      ['points', 'language', '会用手指着要东西或求助', 'Points to ask for something or to get help', true],
      [
        'uses-right',
        'cognitive',
        '会试着正确使用手机、杯子、书',
        'Tries to use things the right way, like a phone, cup or book',
      ],
      ['stacks', 'cognitive', '能叠起至少两块积木', 'Stacks at least two small objects'],
      ['steps', 'movement', '能自己走几步', 'Takes a few steps on their own', true],
      ['finger-food', 'movement', '会用手指自己抓东西吃', 'Uses fingers to feed themself some food'],
    ],
  ],
  [
    18,
    '18-months',
    [
      [
        'checks-back',
        'social',
        '会走开，但会回头确认你在附近',
        'Moves away from you but looks to make sure you are close',
      ],
      ['points-show', 'social', '会指给你看有趣的东西', 'Points to show you something interesting'],
      ['wash', 'social', '会伸出手让你洗', 'Puts hands out for you to wash them'],
      ['book', 'social', '会和你一起看几页书', 'Looks at a few pages in a book with you'],
      ['dressing', 'social', '穿衣服时会配合伸手、抬脚', 'Helps you dress them'],
      [
        'three-words',
        'language',
        '除了“妈妈”“爸爸”，还会尝试说三个以上的词',
        'Tries to say three or more words besides “mama” or “dada”',
        true,
      ],
      ['one-step', 'language', '不用手势也能听懂一步指令', 'Follows one-step directions without gestures'],
      ['chores', 'cognitive', '会模仿你做家务', 'Copies you doing chores'],
      [
        'simple-play',
        'cognitive',
        '会简单地玩玩具，比如推小车',
        'Plays with toys in a simple way, like pushing a toy car',
      ],
      ['walks', 'movement', '不扶东西也能自己走', 'Walks without holding on to anyone or anything', true],
      ['scribbles', 'movement', '会乱涂乱画', 'Scribbles', true],
      ['open-cup', 'movement', '能用无盖杯喝水（偶尔会洒）', 'Drinks from an open cup, may spill sometimes'],
      ['self-feeds', 'movement', '会用手指自己吃东西', 'Feeds themself with fingers'],
      ['spoon-try', 'movement', '会尝试用勺子', 'Tries to use a spoon', true],
      ['climbs', 'movement', '能自己爬上爬下沙发或椅子', 'Climbs on and off a couch or chair without help'],
    ],
  ],
  [
    24,
    '2-years',
    [
      ['notices-upset', 'social', '别人难过或受伤时会注意到', 'Notices when others are hurt or upset'],
      [
        'checks-face',
        'social',
        '遇到新情况会看你的脸色',
        'Looks at your face to see how to react in a new situation',
      ],
      ['book-point', 'language', '你问“小熊在哪”时会在书上指出来', 'Points to things in a book when you ask'],
      [
        'two-words',
        'language',
        '会说两个词的短句，比如“还要奶”',
        'Says at least two words together, like “More milk”',
        true,
      ],
      [
        'body-parts',
        'language',
        '能指出至少两个身体部位',
        'Points to at least two body parts when asked',
        true,
      ],
      [
        'gestures',
        'language',
        '会用飞吻、点头等更多手势',
        'Uses more gestures, like blowing a kiss or nodding yes',
      ],
      [
        'two-hands',
        'cognitive',
        '能一只手拿东西，另一只手操作',
        'Holds something in one hand while using the other',
      ],
      ['switches', 'cognitive', '会尝试按开关、拧旋钮', 'Tries to use switches, knobs or buttons on a toy'],
      [
        'pretend',
        'cognitive',
        '会同时玩几个玩具，比如把玩具食物放到盘子里',
        'Plays with more than one toy at the same time',
      ],
      ['kicks', 'movement', '会踢球', 'Kicks a ball', true],
      ['runs', 'movement', '会跑', 'Runs', true],
      ['stairs', 'movement', '能走上几级台阶', 'Walks up a few stairs, with or without help'],
      ['spoon', 'movement', '会用勺子吃饭', 'Eats with a spoon'],
    ],
  ],
];
const milestoneItems: GuideItem[] = MILESTONES.flatMap(([months, page, items]) =>
  items.map(([slug, area, zh, en, highlight]) => ({
    key: `m.${months}.${slug}`,
    kind: 'milestone' as const,
    from: months,
    to: months,
    corrected: true,
    title: {zh, en},
    source: cdc(page),
    area,
    ...(highlight ? {highlight: true} : {}),
  })),
);
export const MILESTONE_AGES = MILESTONES.map(([months]) => months);

// --------------------------------------------------------------------------------------------- vaccines
export const VACCINES: Record<VaccineId, {name: Text; prevents: Text; after?: Text}> = {
  hepb: {
    name: {zh: '乙肝疫苗', en: 'Hepatitis B (HepB)'},
    prevents: {
      zh: '预防乙型肝炎。乙肝病毒会长期损伤肝脏，婴儿感染后很容易变成慢性感染。',
      en: 'Protects against hepatitis B, a virus that can damage the liver for life. Babies who catch it often stay infected.',
    },
  },
  bcg: {
    name: {zh: '卡介苗', en: 'BCG (tuberculosis)'},
    prevents: {
      zh: '预防结核病的重症，比如结核性脑膜炎和粟粒性肺结核。',
      en: 'Protects against severe forms of tuberculosis, such as TB meningitis.',
    },
    after: {
      zh: '接种 2 周左右，接种处会出现红肿小结，可能化脓、结痂，最后留下小疤（卡痕），这是正常过程。保持清洁，不要挤压或涂药。',
      en: 'About 2 weeks later a small red bump appears and may form a little pus and scab, leaving a small scar. This is normal: keep it clean and don’t squeeze it.',
    },
  },
  rsv: {
    name: {zh: 'RSV 单克隆抗体', en: 'RSV antibody (nirsevimab / clesrovimab)'},
    prevents: {
      zh: 'RSV 是婴儿细支气管炎和肺炎最常见的原因。这一针打的是现成的抗体，打完就有保护，能明显减少重症住院。',
      en: 'RSV is the most common cause of bronchiolitis and pneumonia in babies. This shot gives ready-made antibodies, so protection starts right away.',
    },
  },
  rv: {
    name: {zh: '轮状病毒疫苗', en: 'Rotavirus (RV)'},
    prevents: {
      zh: '预防轮状病毒腹泻，这是婴幼儿严重腹泻和脱水的常见原因。口服，不打针。',
      en: 'Protects against rotavirus, a common cause of severe diarrhoea and dehydration in babies. Given by mouth.',
    },
    after: {
      zh: '少数宝宝之后几天有点烦躁或轻微腹泻。',
      en: 'A few babies are fussy or have mild diarrhoea for a few days.',
    },
  },
  dtap: {
    name: {zh: '百白破疫苗', en: 'DTaP'},
    prevents: {
      zh: '预防白喉、破伤风和百日咳。百日咳对小婴儿最危险，可能引起呼吸暂停。',
      en: 'Protects against diphtheria, tetanus and whooping cough. Whooping cough is most dangerous for young babies.',
    },
  },
  hib: {
    name: {zh: 'Hib 疫苗', en: 'Hib'},
    prevents: {
      zh: '预防 b 型流感嗜血杆菌感染，它可以引起脑膜炎和肺炎。',
      en: 'Protects against Haemophilus influenzae type b, which can cause meningitis and pneumonia.',
    },
  },
  pcv: {
    name: {zh: '肺炎球菌结合疫苗', en: 'Pneumococcal (PCV)'},
    prevents: {
      zh: '预防肺炎球菌引起的肺炎、脑膜炎、血液感染和中耳炎。',
      en: 'Protects against pneumococcal pneumonia, meningitis, blood infections and ear infections.',
    },
  },
  polio: {
    name: {zh: '脊灰疫苗', en: 'Polio (IPV)'},
    prevents: {
      zh: '预防脊髓灰质炎（小儿麻痹症），它可能导致终身瘫痪。',
      en: 'Protects against polio, which can cause lifelong paralysis.',
    },
  },
  flu: {
    name: {zh: '流感疫苗', en: 'Influenza (flu)'},
    prevents: {
      zh: '预防流感。5 岁以下孩子得流感后更容易出现重症。6 个月起每年秋季接种；第一次接种需要打 2 剂，间隔 4 周。',
      en: 'Protects against flu, which hits children under 5 harder. Given every fall from 6 months; the first season needs 2 doses 4 weeks apart.',
    },
  },
  covid: {
    name: {zh: '新冠疫苗', en: 'COVID-19'},
    prevents: {
      zh: '预防新冠重症。AAP 建议 6–23 个月的宝宝接种。',
      en: 'Protects against severe COVID-19. The AAP recommends it for babies 6–23 months.',
    },
  },
  mmr: {
    name: {zh: '麻腮风疫苗', en: 'MMR'},
    prevents: {
      zh: '预防麻疹、流行性腮腺炎和风疹。麻疹传染性极强，可能引起肺炎和脑炎。',
      en: 'Protects against measles, mumps and rubella. Measles spreads very easily and can cause pneumonia and brain swelling.',
    },
    after: {
      zh: '接种后 1–2 周可能出现发烧或轻微皮疹，通常几天就消退，不会传染。',
      en: '1–2 weeks later there may be a fever or mild rash for a few days. It isn’t contagious.',
    },
  },
  var: {
    name: {zh: '水痘疫苗', en: 'Varicella (chickenpox)'},
    prevents: {
      zh: '预防水痘。',
      en: 'Protects against chickenpox.',
    },
    after: {
      zh: '少数宝宝在接种后几周内出现几个小水疱。',
      en: 'A few children get a handful of small spots in the weeks afterwards.',
    },
  },
  hepa: {
    name: {zh: '甲肝疫苗', en: 'Hepatitis A (HepA)'},
    prevents: {
      zh: '预防甲型肝炎，它通过不洁的食物和水传播。',
      en: 'Protects against hepatitis A, which spreads through contaminated food and water.',
    },
  },
  je: {
    name: {zh: '乙脑疫苗', en: 'Japanese encephalitis (JE)'},
    prevents: {
      zh: '预防流行性乙型脑炎，这是一种由蚊子传播、损伤大脑的疾病。',
      en: 'Protects against Japanese encephalitis, a mosquito-borne brain infection.',
    },
  },
  men: {
    name: {zh: '流脑疫苗', en: 'Meningococcal'},
    prevents: {
      zh: '预防流行性脑脊髓膜炎（流脑），一种起病快、很凶险的细菌感染。',
      en: 'Protects against meningococcal disease, a fast, serious bacterial infection.',
    },
  },
};
/** Shown on every vaccine card. */
export const AFTER_VACCINE: Text = {
  zh: '常见反应：接种处红肿、疼痛，低烧，烦躁或比平时睡得多，通常 1–3 天内消退。高烧不退、持续哭闹 3 小时以上、抽搐，或出现面部肿胀、呼吸困难，要立即就医。',
  en: 'Common reactions: a sore, red spot, a low fever, fussiness or extra sleepiness, usually gone in 1–3 days. Get care right away for a high or lasting fever, crying for 3+ hours, a seizure, or swelling of the face or trouble breathing.',
};

type V = [vaccine: VaccineId, dose: number, from: number, to: number, body?: Text, title?: Text];
const dose = (n: number): Text => ({zh: `第 ${n} 剂`, en: `dose ${n}`});
function vaccineItems(region: Region, list: V[]): GuideItem[] {
  return list.map(([vaccine, n, from, to, body, title]) => ({
    key: `v.${region}.${vaccine}.${n}`,
    kind: 'vaccine' as const,
    from,
    to,
    corrected: false,
    title: title ?? {
      zh: `${VACCINES[vaccine].name.zh} ${dose(n).zh}`,
      en: `${VACCINES[vaccine].name.en} · ${dose(n).en}`,
    },
    ...(body ? {body} : {}),
    source: region === 'us' ? SOURCES.aapSchedule : SOURCES.cnSchedule,
    region,
    vaccine,
  }));
}
const US_VACCINES = vaccineItems('us', [
  [
    'rsv',
    1,
    0,
    8,
    {
      zh: 'RSV 季节（通常 10 月到次年 3 月）出生或进入第一个 RSV 季节的宝宝打 1 剂；妈妈孕期接种过 RSV 疫苗且至少 14 天的宝宝，一般不需要。',
      en: '1 dose for babies born during, or entering, their first RSV season (usually Oct–Mar), unless mom got the RSV vaccine in pregnancy at least 14 days before birth.',
    },
    {zh: 'RSV 单克隆抗体', en: 'RSV antibody'},
  ],
  ['hepb', 1, 0, 0, {zh: '出生后 24 小时内。', en: 'Within 24 hours of birth.'}],
  ['hepb', 2, 1, 2],
  ['hepb', 3, 6, 18],
  ['rv', 1, 2, 2],
  ['rv', 2, 4, 4],
  [
    'rv',
    3,
    6,
    6,
    {zh: '只有三剂型（RotaTeq）需要第 3 剂。', en: 'Only needed for the 3-dose brand (RotaTeq).'},
  ],
  ['dtap', 1, 2, 2],
  ['dtap', 2, 4, 4],
  ['dtap', 3, 6, 6],
  ['dtap', 4, 15, 18],
  ['dtap', 5, 48, 72],
  ['hib', 1, 2, 2],
  ['hib', 2, 4, 4],
  [
    'hib',
    3,
    6,
    6,
    {zh: '是否需要第 3 剂取决于疫苗品牌。', en: 'Whether a 3rd dose is needed depends on the brand.'},
  ],
  ['hib', 4, 12, 15],
  ['pcv', 1, 2, 2],
  ['pcv', 2, 4, 4],
  ['pcv', 3, 6, 6],
  ['pcv', 4, 12, 15],
  ['polio', 1, 2, 2],
  ['polio', 2, 4, 4],
  ['polio', 3, 6, 18],
  ['polio', 4, 48, 72],
  ['flu', 1, 6, 6, {zh: '每年秋季接种。', en: 'Given each fall.'}],
  [
    'flu',
    2,
    7,
    7,
    {
      zh: '第一次接种流感疫苗的那一季，第 1 剂后 4 周打。',
      en: '4 weeks after dose 1, in the first flu season only.',
    },
  ],
  ['covid', 1, 6, 6],
  ['covid', 2, 7, 8, {zh: '第 1 剂后 4–8 周。', en: '4–8 weeks after dose 1.'}],
  ['mmr', 1, 12, 15],
  ['mmr', 2, 48, 72],
  ['var', 1, 12, 15],
  ['var', 2, 48, 72],
  ['hepa', 1, 12, 23],
  ['hepa', 2, 18, 23, {zh: '第 1 剂后至少 6 个月。', en: 'At least 6 months after dose 1.'}],
]);
const CN_VACCINES = vaccineItems('cn', [
  ['hepb', 1, 0, 0, {zh: '出生后 24 小时内。', en: 'Within 24 hours of birth.'}],
  [
    'bcg',
    1,
    0,
    0,
    {zh: '出生时，最晚 3 月龄前完成。', en: 'At birth, by 3 months at the latest.'},
    {zh: '卡介苗', en: 'BCG'},
  ],
  ['hepb', 2, 1, 1],
  ['polio', 1, 2, 2, undefined, {zh: '脊灰灭活疫苗（IPV）第 1 剂', en: 'Polio (IPV) · dose 1'}],
  ['dtap', 1, 2, 2],
  ['polio', 2, 3, 3, undefined, {zh: '脊灰灭活疫苗（IPV）第 2 剂', en: 'Polio (IPV) · dose 2'}],
  [
    'polio',
    3,
    4,
    4,
    {zh: '口服。', en: 'Given by mouth.'},
    {zh: '脊灰减毒活疫苗（bOPV）第 3 剂', en: 'Polio (bOPV, oral) · dose 3'},
  ],
  ['dtap', 2, 4, 4],
  ['hepb', 3, 6, 6],
  ['dtap', 3, 6, 6],
  ['men', 1, 6, 6, undefined, {zh: 'A 群流脑多糖疫苗 第 1 剂', en: 'Meningococcal A · dose 1'}],
  ['mmr', 1, 8, 8],
  [
    'je',
    1,
    8,
    8,
    {
      zh: '减毒活疫苗共 2 剂；如选灭活疫苗，8 月龄打 2 剂（间隔 7–10 天），2 岁、6 岁各 1 剂。',
      en: 'Live vaccine: 2 doses. With the inactivated vaccine: 2 doses at 8 months (7–10 days apart), then at 2 and 6 years.',
    },
  ],
  ['men', 2, 9, 9, undefined, {zh: 'A 群流脑多糖疫苗 第 2 剂', en: 'Meningococcal A · dose 2'}],
  ['dtap', 4, 18, 18],
  ['mmr', 2, 18, 18],
  [
    'hepa',
    1,
    18,
    18,
    {zh: '减毒活疫苗只需 1 剂；灭活疫苗共 2 剂。', en: 'Live vaccine: 1 dose. Inactivated vaccine: 2 doses.'},
  ],
  ['je', 2, 24, 24],
  ['hepa', 2, 24, 24, {zh: '只有甲肝灭活疫苗需要第 2 剂。', en: 'Only for the inactivated vaccine.'}],
  ['men', 3, 36, 36, undefined, {zh: 'A 群 C 群流脑多糖疫苗 第 3 剂', en: 'Meningococcal A+C · dose 3'}],
  [
    'polio',
    4,
    48,
    48,
    {zh: '口服。', en: 'Given by mouth.'},
    {zh: '脊灰减毒活疫苗（bOPV）第 4 剂', en: 'Polio (bOPV, oral) · dose 4'},
  ],
  ['dtap', 5, 72, 72],
  ['men', 4, 72, 72, undefined, {zh: 'A 群 C 群流脑多糖疫苗 第 4 剂', en: 'Meningococcal A+C · dose 4'}],
]);

// --------------------------------------------------------------------------------------------- checkups
const US_CHECKUP_BODY: Text = {
  zh: '测体重、身长和头围，检查发育情况，并接种这个月龄的疫苗。可以提前写下想问医生的问题。',
  en: 'Weight, length and head size, a development check, and any vaccines due. Jot down questions for the doctor beforehand.',
};
const usCheckups: GuideItem[] = (
  [
    [0.15, {zh: '新生儿体检（出生后 3–5 天）', en: 'Newborn checkup (3–5 days)'}],
    [1, {zh: '1 月龄体检', en: '1-month checkup'}],
    [2, {zh: '2 月龄体检', en: '2-month checkup'}],
    [4, {zh: '4 月龄体检', en: '4-month checkup'}],
    [6, {zh: '6 月龄体检', en: '6-month checkup'}],
    [9, {zh: '9 月龄体检', en: '9-month checkup'}],
    [12, {zh: '12 月龄体检', en: '12-month checkup'}],
    [15, {zh: '15 月龄体检', en: '15-month checkup'}],
    [18, {zh: '18 月龄体检', en: '18-month checkup'}],
    [24, {zh: '2 岁体检', en: '2-year checkup'}],
  ] as [number, Text][]
).map(([at, title]) => ({
  key: `c.us.${at === 0.15 ? 'newborn' : at}`,
  kind: 'checkup' as const,
  from: at,
  to: at,
  corrected: false,
  title,
  body: US_CHECKUP_BODY,
  source: SOURCES.aapCheckups,
  region: 'us' as const,
}));
const CN_CHECKUP_BODY: Text = {
  zh: '在社区卫生服务中心或乡镇卫生院免费做儿童保健：测量生长、评估发育，并给出喂养和护理建议。',
  en: 'Free child health check at the community health centre: growth, development and feeding advice.',
};
const cnCheckups: GuideItem[] = (
  [
    [
      'visit',
      0.15,
      {zh: '新生儿家庭访视（出院后 1 周内）', en: 'Newborn home visit (within a week of discharge)'},
    ],
    ['1', 0.95, {zh: '满月健康检查（出生后 28–30 天）', en: '1-month health check (28–30 days)'}],
    ['3', 3, {zh: '3 月龄儿童保健', en: '3-month child health check'}],
    ['6', 6, {zh: '6 月龄儿童保健', en: '6-month child health check'}],
    ['8', 8, {zh: '8 月龄儿童保健', en: '8-month child health check'}],
    ['12', 12, {zh: '12 月龄儿童保健', en: '12-month child health check'}],
    ['18', 18, {zh: '18 月龄儿童保健', en: '18-month child health check'}],
    ['24', 24, {zh: '24 月龄儿童保健', en: '24-month child health check'}],
  ] as [string, number, Text][]
).map(([slug, at, title]) => ({
  key: `c.cn.${slug}`,
  kind: 'checkup' as const,
  from: at,
  to: at,
  corrected: false,
  title,
  body: CN_CHECKUP_BODY,
  source: SOURCES.cnCheckups,
  region: 'cn' as const,
}));

// ------------------------------------------------------------------------------------ phases and tips
const phases: GuideItem[] = [
  {
    key: 'p.weight',
    kind: 'phase',
    from: 0,
    to: 0.5,
    corrected: false,
    title: {zh: '体重先降后升', en: 'Weight dips, then comes back'},
    body: {
      zh: '出生后头几天体重下降很常见，母乳喂养的宝宝通常不超过出生体重的 7–10%，一般 10–14 天内回到出生体重。',
      en: 'Most babies lose some weight in the first days (breastfed babies usually under 7–10% of birth weight) and are back to birth weight by 10–14 days.',
    },
    source: SOURCES.enoughMilk,
  },
  {
    key: 'p.crying',
    kind: 'phase',
    from: 0.5,
    to: 4,
    corrected: false,
    title: {zh: '哭闹高峰 / 肠胀气', en: 'Peak crying / colic'},
    body: {
      zh: '很多宝宝 2–3 周起哭闹变多，6 周左右最明显，3–4 个月后逐渐好转。健康的宝宝每天哭超过 3 小时、每周超过 3 天，通常称为肠绞痛（俗称肠胀气）。抱着轻摇、包裹、白噪音可能有帮助；如果发烧、吃奶变差或哭声和平时很不一样，要就医。',
      en: 'Crying often picks up around 2–3 weeks, peaks near 6 weeks and eases by 3–4 months. Crying 3+ hours a day, 3+ days a week in a healthy baby is called colic. Rocking, swaddling and white noise may help; see a doctor for fever, poor feeding or crying that sounds different.',
    },
    source: SOURCES.colic,
  },
  ...(
    [
      ['p.spurt.3w', 0.5, {zh: '猛长期（约 2–3 周）', en: 'Growth spurt (around 2–3 weeks)'}],
      ['p.spurt.6w', 1.4, {zh: '猛长期（约 6 周）', en: 'Growth spurt (around 6 weeks)'}],
      ['p.spurt.3m', 3, {zh: '猛长期（约 3 个月）', en: 'Growth spurt (around 3 months)'}],
      ['p.spurt.6m', 6, {zh: '猛长期（约 6 个月）', en: 'Growth spurt (around 6 months)'}],
    ] as [string, number, Text][]
  ).map(([key, at, title]) => ({
    key,
    kind: 'phase' as const,
    from: at,
    to: at + 0.25,
    corrected: false,
    title,
    body: {
      zh: '有几天突然特别频繁地要奶（密集喂奶）很常见。按需喂就好，一般几天后会恢复原来的节奏。',
      en: 'A few days of very frequent feeding (cluster feeding) are common. Feed on demand; the usual rhythm returns in a few days.',
    },
    source: SOURCES.common,
  })),
  {
    key: 'p.sleep4m',
    kind: 'phase',
    from: 3,
    to: 5,
    corrected: true,
    title: {zh: '4 个月左右的睡眠变化', en: 'Sleep changes around 4 months'},
    body: {
      zh: '这个阶段睡眠周期变得更像大人，夜里醒来可能变多。固定的睡前流程会有帮助，一般几周后会好转。',
      en: 'Sleep cycles become more adult-like and night waking may increase for a while. A steady bedtime routine helps; it usually settles within weeks.',
    },
    source: SOURCES.common,
  },
  {
    key: 'p.teething',
    kind: 'phase',
    from: 4,
    to: 12,
    corrected: true,
    title: {zh: '出牙', en: 'Teething'},
    body: {
      zh: '第一颗牙多在 6 个月左右长出，4–12 个月都很常见。流口水、爱啃东西、牙龈肿是常见表现；出牙一般不会引起高烧或腹泻。可以给冷藏（不是冷冻）的牙胶，不要用含苯佐卡因的凝胶或出牙项链。',
      en: 'The first tooth usually arrives around 6 months, anywhere from 4–12 months is common. Drooling, chewing and sore gums are typical; teething doesn’t cause high fever or diarrhoea. A chilled (not frozen) teether helps; avoid benzocaine gels and teething necklaces.',
    },
    source: SOURCES.teething,
  },
  {
    key: 'p.separation',
    kind: 'phase',
    from: 8,
    to: 12,
    corrected: true,
    title: {zh: '怕生和分离焦虑', en: 'Stranger and separation anxiety'},
    body: {
      zh: '8–10 个月前后，很多宝宝开始怕生，你离开时会哭。这说明宝宝知道你是谁、也知道你不在了，是正常的发展。简短地告别、按时回来会让他更安心。',
      en: 'Around 8–10 months many babies become wary of strangers and cry when you leave. It means they know who you are and notice you’ve gone. Short goodbyes and coming back when you said help.',
    },
    source: SOURCES.separation,
  },
];
const tips: GuideItem[] = [
  {
    key: 't.screening',
    kind: 'tip',
    from: 0,
    to: 0.15,
    corrected: false,
    title: {zh: '新生儿筛查', en: 'Newborn screening'},
    body: {
      zh: '出生后 1–2 天内，医院会做足跟血筛查和听力筛查（美国还会做心脏血氧筛查），用来尽早发现少见但可以治疗的疾病。结果需要复查时医院会通知你。',
      en: 'In the first 1–2 days the hospital does a heel-prick blood test and a hearing test (and a pulse-oximetry heart screen in the US) to catch rare, treatable conditions early. You’ll be contacted if anything needs a repeat test.',
    },
    source: SOURCES.screening,
  },
  {
    key: 't.jaundice',
    kind: 'tip',
    from: 0,
    to: 0.5,
    corrected: false,
    title: {zh: '留意黄疸', en: 'Watch for jaundice'},
    body: {
      zh: '很多新生儿出生后 2–4 天皮肤和眼白发黄。如果黄色越来越深、蔓延到肚子或腿，或者宝宝特别嗜睡、吃奶差，要尽快联系医生。',
      en: 'Many newborns look yellow around days 2–4. Call the doctor soon if the yellow deepens or spreads to the belly or legs, or if your baby is very sleepy or feeding poorly.',
    },
    source: SOURCES.jaundice,
  },
  {
    key: 't.fever',
    kind: 'tip',
    from: 0,
    to: 3,
    corrected: false,
    important: true,
    title: {zh: '3 个月以下发烧要立即就医', en: 'Fever under 3 months: call right away'},
    body: {
      zh: '3 个月以下的宝宝，体温达到 38.0°C（100.4°F，肛温）或更高，要立即联系医生或就医。不要先自己给退烧药。',
      en: 'For babies under 3 months, a temperature of 100.4°F (38.0°C, rectal) or higher means call the doctor or get care right away. Don’t give fever medicine first.',
    },
    source: SOURCES.fever,
  },
  {
    key: 't.sleep',
    kind: 'tip',
    from: 0,
    to: 12,
    corrected: false,
    important: true,
    title: {zh: '安全睡眠', en: 'Safe sleep'},
    body: {
      zh: '每次睡觉都让宝宝仰睡，睡在平整、硬实、独立的床面上；床上不放枕头、被子、毛绒玩具和床围。建议同屋不同床，至少前 6 个月。',
      en: 'Every sleep: on the back, on a flat, firm, separate surface with no pillows, blankets, soft toys or bumpers. Share a room, not a bed, for at least the first 6 months.',
    },
    source: SOURCES.sleep,
  },
  {
    key: 't.vitd',
    kind: 'tip',
    from: 0,
    to: 12,
    corrected: false,
    title: {zh: '维生素 D', en: 'Vitamin D'},
    body: {
      zh: '母乳喂养或混合喂养的宝宝，从出生后几天起每天补充 400 IU 维生素 D。主要喝配方奶、而且每天喝够量的宝宝，一般不用额外补。具体请听医生建议。',
      en: 'Breastfed and partly breastfed babies need 400 IU of vitamin D a day, starting in the first days. Babies drinking enough formula usually don’t need extra. Check with your pediatrician.',
    },
    source: SOURCES.supplements,
  },
  {
    key: 't.honey',
    kind: 'tip',
    from: 0,
    to: 12,
    corrected: false,
    title: {zh: '1 岁前不要喂蜂蜜', en: 'No honey before age 1'},
    body: {
      zh: '蜂蜜可能含有肉毒杆菌芽孢，会让 1 岁以下的宝宝发生肉毒中毒。也不要用蜂蜜蘸安抚奶嘴。',
      en: 'Honey can carry botulism spores that can make babies under 1 seriously ill. That includes honey on a pacifier.',
    },
    source: SOURCES.botulism,
  },
  {
    key: 't.iron',
    kind: 'tip',
    from: 4,
    to: 6,
    corrected: true,
    region: 'us',
    title: {zh: '补铁', en: 'Iron'},
    body: {
      zh: '纯母乳或以母乳为主的宝宝，AAP 建议从 4 个月起每天补铁（每公斤体重 1 mg），直到开始吃富含铁的辅食。喝强化铁配方奶的宝宝一般不需要。',
      en: 'For babies fed only or mostly breast milk, the AAP advises an iron supplement (1 mg/kg a day) from 4 months until they eat iron-rich foods. Iron-fortified formula usually covers it.',
    },
    source: SOURCES.supplements,
  },
  {
    key: 't.solids',
    kind: 'tip',
    from: 6,
    to: 6,
    corrected: true,
    title: {zh: '开始添加辅食', en: 'Starting solid foods'},
    body: {
      zh: '6 个月左右，宝宝能坐稳、头稳、对食物感兴趣、不再把勺子顶出来时，可以开始添加辅食。优先选富含铁的食物，比如强化铁米粉和肉泥；常见易过敏食物（如鸡蛋、花生制品）不必刻意推迟。',
      en: 'Around 6 months, once your baby sits up with little or no support, holds their head steady and shows interest in food, you can start solids. Lead with iron-rich foods like iron-fortified cereal and puréed meat; there’s no need to delay common allergens like egg and peanut.',
    },
    source: SOURCES.solids,
  },
  {
    key: 't.teeth',
    kind: 'tip',
    from: 6,
    to: 12,
    corrected: true,
    title: {zh: '长牙后开始刷牙', en: 'Brush from the first tooth'},
    body: {
      zh: '长出第一颗牙后，每天刷两次，用米粒大小的含氟牙膏。1 岁前（或第一颗牙长出后）看一次牙医。',
      en: 'From the first tooth, brush twice a day with a rice-grain smear of fluoride toothpaste. See a dentist by the first birthday.',
    },
    source: SOURCES.teeth,
  },
  {
    key: 't.milk.us',
    kind: 'tip',
    from: 12,
    to: 12,
    corrected: false,
    region: 'us',
    title: {zh: '1 岁后可以改喝全脂牛奶', en: 'Whole milk from 12 months'},
    body: {
      zh: '1 岁起可以把配方奶换成全脂牛奶，每天约 2–3 杯（16–24 oz）。不需要专门的“幼儿配方奶”。母乳可以继续喂。',
      en: 'At 12 months you can switch formula to plain whole milk, about 2–3 cups (16–24 oz) a day. “Toddler formula” isn’t needed. Breastfeeding can continue.',
    },
    source: SOURCES.drinks,
  },
  {
    key: 't.milk.cn',
    kind: 'tip',
    from: 12,
    to: 12,
    corrected: false,
    region: 'cn',
    title: {zh: '1 岁后的奶类', en: 'Milk after 12 months'},
    body: {
      zh: '母乳可以继续喂到 2 岁或更久。1 岁后可以逐步引入鲜奶、酸奶、奶酪等奶制品，每天保证适量奶类。',
      en: 'Breastfeeding can continue to age 2 or beyond. From 12 months you can add dairy such as milk, yoghurt and cheese every day.',
    },
    source: SOURCES.cnDiet,
  },
];

const ALL: GuideItem[] = [
  ...milestoneItems,
  ...US_VACCINES,
  ...CN_VACCINES,
  ...usCheckups,
  ...cnCheckups,
  ...phases,
  ...tips,
];
const byKey = new Map(ALL.map(item => [item.key, item]));
export const guideItem = (key: string | null | undefined) => (key ? byKey.get(key) : undefined);
/** Guide items that apply to a region (shared items have no region). */
export const guideFor = (region: Region) => ALL.filter(item => !item.region || item.region === region);
/** Items a family can tick off as done. */
export const loggable = (item: GuideItem) =>
  item.kind === 'milestone' || item.kind === 'vaccine' || item.kind === 'checkup';
