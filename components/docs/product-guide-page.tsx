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
      <section className="overflow-hidden rounded-[32px] border border-[#ddcfbf] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(253,248,241,0.98)_40%,rgba(245,235,225,0.95))] shadow-[0_28px_72px_-46px_rgba(35,24,21,0.42)]">
        <div className="border-b border-[#ead9c7] px-6 py-7 sm:px-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#e6d4c2] bg-white/75 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-[#8e6e54]">
            <ShieldCheck className="h-3.5 w-3.5" />
            Product Guide
          </div>
          <h2 className="mt-4 font-heading text-4xl leading-tight text-[#231815]">
            一套面向红娘与婚恋服务机构的
            <br className="hidden sm:block" />
            AI 客户工作台
          </h2>
          <p className="mt-4 max-w-4xl text-base leading-8 text-[#655246]">
            Matchmaking Studio 不是传统意义上的表格型 CRM，也不是只会聊天的 AI 机器人。
            它的核心目标，是把红娘最耗时、最容易遗漏、最依赖人工整理的客户录音建档流程，
            变成一条稳定、可追踪、可持续更新的工作流。
          </p>
        </div>

        <div className="grid gap-5 px-6 py-6 sm:px-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[28px] border border-[#ead9c7] bg-white/82 p-5 shadow-[0_22px_52px_-42px_rgba(35,24,21,0.38)]">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#8e6e54]">Why It Exists</div>
            <h3 className="mt-3 font-heading text-2xl text-[#231815]">这个系统为什么存在</h3>
            <div className="mt-4 space-y-3">
              {PAIN_POINTS.map((item) => (
                <div key={item} className="flex gap-3 rounded-[20px] border border-[#f0e5d8] bg-[#fffaf4] px-4 py-3 text-sm leading-7 text-[#6a574a]">
                  <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-[#a2493d]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[28px] border border-[#ead9c7] bg-[linear-gradient(180deg,rgba(143,60,50,0.08),rgba(255,255,255,0.82))] p-5 shadow-[0_22px_52px_-42px_rgba(35,24,21,0.38)]">
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#8e6e54]">What It Changes</div>
            <h3 className="mt-3 font-heading text-2xl text-[#231815]">系统带来的改变</h3>
            <div className="mt-4 space-y-4 text-sm leading-7 text-[#645145]">
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
            <div className="mt-6 rounded-[24px] border border-[#e7d0c0] bg-white/85 p-4">
              <div className="text-[11px] uppercase tracking-[0.2em] text-[#8e6e54]">一句话介绍</div>
              <p className="mt-3 text-sm leading-7 text-[#59483d]">
                Matchmaking Studio 帮助红娘把客户沟通录音自动转成文字稿，再把文字稿转成结构化客户信息，
                持续更新客户档案、匹配进度和后续补问。
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[32px] border border-[#ddcfbf] bg-white/86 px-6 py-7 shadow-[0_24px_64px_-46px_rgba(35,24,21,0.38)] sm:px-8">
        <div className="text-[11px] uppercase tracking-[0.2em] text-[#8e6e54]">Core Workflow</div>
        <h3 className="mt-3 font-heading text-3xl text-[#231815]">它是怎么工作的</h3>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[#6a574a]">
          当前版本最重要的不是更多功能，而是把这条主工作流做稳：
          上传录音、转录、结构化提取、写入数据库。
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-5">
          {WORKFLOW.map((item, index) => {
            const Icon = item.icon
            return (
              <div key={item.title} className="relative rounded-[26px] border border-[#ead9c7] bg-[linear-gradient(180deg,#fffdf9,#fcf6ee)] p-5 shadow-[0_18px_40px_-36px_rgba(35,24,21,0.3)]">
                <div className="flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] border border-[#efd8c7] bg-white text-[#944739] shadow-[0_16px_30px_-24px_rgba(143,60,50,0.55)]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#9a7a64]">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </div>
                <h4 className="mt-5 text-lg font-medium text-[#231815]">{item.title}</h4>
                <p className="mt-3 text-sm leading-7 text-[#675447]">{item.description}</p>
              </div>
            )
          })}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {OUTCOMES.map((group) => (
          <div
            key={group.title}
            className="rounded-[30px] border border-[#ddcfbf] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(251,245,238,0.95))] px-6 py-7 shadow-[0_24px_64px_-46px_rgba(35,24,21,0.35)]"
          >
            <div className="text-[11px] uppercase tracking-[0.2em] text-[#8e6e54]">Outcome</div>
            <h3 className="mt-3 font-heading text-3xl text-[#231815]">{group.title}</h3>
            <div className="mt-5 space-y-3">
              {group.bullets.map((item) => (
                <div key={item} className="flex gap-3 rounded-[20px] border border-[#efe3d7] bg-white/80 px-4 py-3 text-sm leading-7 text-[#665347]">
                  <Building2 className="mt-1 h-4 w-4 shrink-0 text-[#a2493d]" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-[30px] border border-[#ddcfbf] bg-white/88 px-6 py-7 shadow-[0_24px_64px_-46px_rgba(35,24,21,0.35)]">
          <div className="text-[11px] uppercase tracking-[0.2em] text-[#8e6e54]">Current Focus</div>
          <h3 className="mt-3 font-heading text-3xl text-[#231815]">当前版本重点</h3>
          <div className="mt-5 space-y-4 text-sm leading-7 text-[#675447]">
            {BOUNDARIES.map((item) => (
              <div key={item} className="rounded-[20px] border border-[#efe2d3] bg-[#fff9f2] px-4 py-3">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[30px] border border-[#ddcfbf] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,239,231,0.96))] px-6 py-7 shadow-[0_24px_64px_-46px_rgba(35,24,21,0.35)]">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-[#8e6e54]">
            <CircleHelp className="h-3.5 w-3.5" />
            FAQ
          </div>
          <h3 className="mt-3 font-heading text-3xl text-[#231815]">常见问题</h3>
          <div className="mt-5 space-y-3">
            {FAQ.map((item) => (
              <div key={item.question} className="rounded-[22px] border border-[#e9dccf] bg-white/82 p-4">
                <h4 className="text-sm font-medium text-[#231815]">{item.question}</h4>
                <p className="mt-2 text-sm leading-7 text-[#685449]">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
