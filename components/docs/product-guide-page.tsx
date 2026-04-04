import { AudioLines, Building2, CircleHelp, DatabaseZap, Ear, HeartHandshake, ShieldCheck, Sparkles } from 'lucide-react'

const PAIN_POINTS = [
  '客户信息长期散落在微信、录音、聊天记录和红娘个人记忆里，很难形成持续更新的统一档案。',
  '红娘大量时间被消耗在回听录音、手工整理资料、补写字段和核对旧信息上，而不是放在判断和推进关系上。',
  '录音里有很多最真实的客户表达，但传统系统很难把这些内容转成真正可用的结构化信息。',
  '客户不是一次性填表完成，而是在多次沟通中逐渐补全资料，没有持续更新机制，档案很快会过时。',
]

const WORKFLOW = [
  {
    title: '上传客户录音',
    description: '红娘把一段具体沟通录音挂到某个客户名下，系统先确保音频安全入库并进入后续处理链。',
    icon: AudioLines,
  },
  {
    title: '系统转成文字稿',
    description: '录音自动转录成文字稿，红娘不需要反复回听，也能快速看到完整沟通内容。',
    icon: Ear,
  },
  {
    title: 'AI 提取关键信息',
    description: '系统从文字稿中提取年龄、城市、学历、职业、收入、婚恋目标、接受边界、顾虑与偏好等关键信息。',
    icon: Sparkles,
  },
  {
    title: '自动更新客户档案',
    description: '新信息会增量写回客户资料，让档案随着每次沟通持续变完整，而不是每次重建一份新表单。',
    icon: DatabaseZap,
  },
  {
    title: '红娘继续补问与推进',
    description: '系统保留未确认缺口和后续建议，让红娘把精力放在判断、沟通和推进关系上。',
    icon: HeartHandshake,
  },
]

const OUTCOMES = [
  {
    title: '对红娘',
    bullets: [
      '少做重复整理，不再反复回听同一段录音。',
      '更容易看懂客户当前状态，知道下一轮该问什么。',
      '在多个客户之间切换时，不容易丢失上下文。',
    ],
  },
  {
    title: '对机构',
    bullets: [
      '建档效率更高，录音真正变成可复用资产。',
      '客户资料沉淀更完整，重要信息不容易遗漏。',
      '服务流程更连续，客户数量变多时也更容易保持质量。',
    ],
  },
]

const BOUNDARIES = [
  '当前版本最优先保证的是：上传录音、转录、结构化提取、写入数据库这条主工作流。',
  '这不是一个公开交友平台，也不是用户完全自助的婚恋产品，而是一套给红娘和机构使用的工作台。',
  '系统的目标不是替红娘做所有判断，而是先完成基础整理，把人力留给真正需要经验和判断的环节。',
]

const FAQ = [
  {
    question: '为什么这套系统要从录音开始？',
    answer: '因为婚恋客户最真实、最完整的信息通常出现在自然沟通里，而不是一次性表单里。录音是最接近真实服务过程的资料来源。',
  },
  {
    question: '为什么系统不能自动替我决定一切？',
    answer: '系统适合做整理、提取、更新和提示，但最终的关系判断、边界确认和推进节奏，仍然需要红娘来把握。',
  },
  {
    question: '为什么有些字段还是待确认？',
    answer: '因为真实沟通里并不是每个信息都说得足够明确。系统会优先自动整理明确事实，把仍需确认的内容留给下一轮更自然的沟通。',
  },
]

export function ProductGuidePage() {
  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-border/80 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(247,250,255,0.98)_40%,rgba(244,247,252,0.95))] shadow-[0_28px_72px_-46px_rgba(15,23,42,0.18)]">
        <div className="border-b border-border/80 px-6 py-7 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-white/75 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Product Guide
          </div>
          <h2 className="mt-4 font-heading text-4xl leading-tight text-foreground">
            一套面向红娘与婚恋服务机构的
            <br className="hidden sm:block" />
            AI 客户工作台
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-8 text-muted-foreground">
            Matchmaking Studio 不是传统意义上的表格型 CRM，也不是只会聊天的 AI 机器人。
            它的核心目标，是把红娘最耗时、最容易遗漏、最依赖人工整理的客户录音建档流程，
            变成一条稳定、可追踪、可持续更新的工作流。
          </p>
        </div>

        <div className="grid gap-5 px-6 py-6 sm:px-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-border/80 bg-white/82 p-5 shadow-[0_22px_52px_-42px_rgba(15,23,42,0.16)]">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Why It Exists</div>
            <h3 className="mt-3 font-heading text-2xl text-foreground">这个系统为什么存在</h3>
            <div className="mt-4 space-y-3">
              {PAIN_POINTS.map((item) => (
                <div key={item} className="flex gap-3 rounded-[20px] border border-border/70 bg-white/92 px-4 py-3 text-sm leading-7 text-muted-foreground">
                  <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-border/80 bg-[linear-gradient(180deg,rgba(241,247,255,0.88),rgba(255,255,255,0.92))] p-5 shadow-[0_22px_52px_-42px_rgba(15,23,42,0.16)]">
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">What It Changes</div>
            <h3 className="mt-3 font-heading text-2xl text-foreground">系统带来的改变</h3>
            <div className="mt-4 space-y-4 text-sm leading-7 text-muted-foreground">
              <p>
                它把“客户录音”从一个很难复用的附件，变成可以持续驱动客户档案更新的资料来源。
              </p>
              <p>
                它让系统先完成基础整理、转录和字段提取，把红娘从重复记录中解放出来。
              </p>
              <p>
                它不是替代判断，而是帮助红娘把精力重新放回理解客户、筛选人选和推进关系。
              </p>
            </div>
            <div className="mt-6 rounded-[24px] border border-border/80 bg-white/85 p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">一句话介绍</div>
              <p className="mt-3 text-sm leading-7 text-foreground/80">
                Matchmaking Studio 帮助红娘把客户沟通录音自动转成文字稿，再把文字稿转成结构化客户信息，
                持续更新客户档案、匹配进度和后续补问。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-border/80 bg-white/88 px-6 py-7 shadow-[0_24px_64px_-46px_rgba(15,23,42,0.16)] sm:px-8">
        <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Core Workflow</div>
        <h3 className="mt-3 font-heading text-3xl text-foreground">它是怎么工作的</h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          当前版本最重要的不是更多功能，而是把这条主工作流做稳：
          上传录音、转录、结构化提取、写入数据库。
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {WORKFLOW.map((item, index) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="relative rounded-[26px] border border-border/80 bg-[linear-gradient(180deg,#ffffff,#f6f9ff)] p-5 shadow-[0_18px_40px_-36px_rgba(15,23,42,0.14)]">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-primary/10 bg-primary/8 text-primary shadow-[0_16px_30px_-24px_rgba(59,130,246,0.18)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h4 className="mt-5 text-lg font-medium text-foreground">{item.title}</h4>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">{item.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {OUTCOMES.map((group) => (
          <div
            key={group.title}
            className="rounded-[30px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,250,255,0.95))] px-6 py-7 shadow-[0_24px_64px_-46px_rgba(15,23,42,0.14)]"
          >
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Outcome</div>
            <h3 className="mt-3 font-heading text-3xl text-foreground">{group.title}</h3>
            <div className="mt-5 space-y-3">
              {group.bullets.map((item) => (
                <div key={item} className="flex gap-3 rounded-[20px] border border-border/70 bg-white/80 px-4 py-3 text-sm leading-7 text-muted-foreground">
                  <Building2 className="mt-1 h-4 w-4 shrink-0 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[30px] border border-border/80 bg-white/88 px-6 py-7 shadow-[0_24px_64px_-46px_rgba(15,23,42,0.14)]">
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Current Focus</div>
          <h3 className="mt-3 font-heading text-3xl text-foreground">当前版本重点</h3>
          <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground">
            {BOUNDARIES.map((item) => (
              <div key={item} className="rounded-[20px] border border-border/70 bg-white/84 px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-border/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(246,249,253,0.96))] px-6 py-7 shadow-[0_24px_64px_-46px_rgba(15,23,42,0.14)]">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            <CircleHelp className="h-3.5 w-3.5 text-primary/80" />
            FAQ
          </div>
          <h3 className="mt-3 font-heading text-3xl text-foreground">常见问题</h3>
          <div className="mt-5 space-y-3">
            {FAQ.map((item) => (
              <div key={item.question} className="rounded-[22px] border border-border/70 bg-white/82 p-4">
                <h4 className="text-sm font-medium text-foreground">{item.question}</h4>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
