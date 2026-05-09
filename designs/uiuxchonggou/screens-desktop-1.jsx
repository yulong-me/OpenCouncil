// OpenCouncil — Desktop main-line artboards (1-7)
// Home empty / Command palette / Create-task modal (existing) / Create-task modal (generate) /
// Room — empty messages / Room — active messages / Room — done state

// 1. 首页 — 空态启动区 ----------------------------------------------------------
function ScreenHome() {
  return (
    <MacChrome title="opencouncil · 首页" w={1440} h={900}>
      <LeftRail activeId={null} />
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <section style={{ flex: 1, padding: '54px 64px 40px', overflowY: 'hidden', position: 'relative' }}>
          <div style={{ maxWidth: 720 }}>
            <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: ocColor('ink2'), marginBottom: 18 }}>
              · 主线 · 任务 → Team → 现场 → 记录 → 改进
            </div>
            <h1 style={{
              fontFamily: '"Newsreader", serif', fontSize: 52, lineHeight: 1.05,
              fontWeight: 400, letterSpacing: '-0.018em', margin: 0,
            }}>
              发起一个任务，<br />
              <span style={{ fontStyle: 'italic', color: ocColor('accent') }}>交给 Team</span> 协作。
            </h1>
            <p style={{ fontSize: 15, color: ocColor('ink1'), lineHeight: 1.55, marginTop: 16, maxWidth: 540 }}>
              先选择一支 Team，进入协作现场后再告诉它这次要做什么。
              已有任务记录仍在左侧，这里始终保留给下一次协作。
            </p>
          </div>

          {/* 继续上次的协作 */}
          <div style={{ marginTop: 36 }}>
            <SectionLabel left="继续上次的协作" right="3 条进行中" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 10 }}>
              {ocRooms.slice(0, 3).map(r => <ContinueCard key={r.id} room={r} />)}
            </div>
          </div>

          {/* 快速 Team 模板 */}
          <div style={{ marginTop: 32 }}>
            <SectionLabel left="快速 Team 模板" right="点选直接进入协作现场" />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 10 }}>
              <TeamTemplateCard
                name="软件开发 Team"
                tag="开发任务全流程"
                tool="Claude Code · OpenCode · Codex CLI"
                toolStatus="ready"
                members={ocAgents}
                pinned
              />
              <TeamTemplateCard
                name="竞品分析 Team"
                tag="对比表 · 卖点抽取 · 汇报"
                tool="Claude Code"
                toolStatus="ready"
                members={[
                  { name: '产研', color: '#3f5c70' }, { name: '调研', color: '#6b6c2f' },
                  { name: '运营', color: '#b25530' }, { name: '汇报', color: '#7a3d6a' },
                ]}
              />
              <TeamTemplateCard
                name="论文返修 Team"
                tag="审稿意见 · 改稿 · 回应信"
                tool="Codex CLI"
                toolStatus="warn"
                toolStatusLabel="待测试"
                members={[
                  { name: '审', color: '#7a3d6a' }, { name: '改', color: '#b25530' },
                  { name: '验', color: '#3f5c70' },
                ]}
              />
              <TeamTemplateCard
                name="圆桌讨论 Team"
                tag="多视角碰撞 · 共识收敛"
                tool="OpenCode"
                toolStatus="ready"
                members={[
                  { name: 'A', color: '#b25530' }, { name: 'B', color: '#6b6c2f' },
                  { name: 'C', color: '#3f5c70' }, { name: 'D', color: '#7a3d6a' },
                  { name: 'E', color: '#c08a1f' },
                ]}
              />
              <TeamTemplateCard
                name="诉讼策略 Team"
                tag="案由 · 抗辩 · 证据链"
                tool="OpenCode CLI"
                toolStatus="error"
                toolStatusLabel="CLI 未配置"
                members={[
                  { name: '主', color: '#7a3d6a' }, { name: '辩', color: '#b25530' },
                  { name: '证', color: '#3f5c70' },
                ]}
              />
              <NewTeamCard />
            </div>
          </div>

          {/* 主 CTA */}
          <div style={{ marginTop: 32, display: 'flex', alignItems: 'center', gap: 14 }}>
            <Btn variant="accent" size="lg" icon={<I d={ICONS.plus} size={14} />}>发起任务</Btn>
            <span style={{ fontSize: 12.5, color: ocColor('ink2') }}>
              ⌘N 快速发起 · ⌘K 搜索任务记录或操作
            </span>
          </div>
        </section>

        {/* 右侧：未进入任务时无具体成员，给一个柔和的"现场预告" */}
        <aside style={{ width: 320, borderLeft: `1px solid ${ocColor('line')}`, padding: '26px 22px', background: ocColor('bg'), display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: ocColor('ink2') }}>下一次现场</div>
          <div style={{
            marginTop: 12, padding: 16, borderRadius: 12,
            background: ocColor('card'), border: `1px solid ${ocColor('line')}`,
            backgroundImage: `repeating-linear-gradient(135deg, ${ocColor('lineSoft')} 0 1px, transparent 1px 14px)`,
          }}>
            <div style={{ fontFamily: '"Newsreader", serif', fontSize: 18, lineHeight: 1.3 }}>
              没有 Team 在现场。<br />选一支，就开始。
            </div>
            <div style={{ marginTop: 14, height: 1, background: ocColor('line') }} />
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontSize: 12.5, color: ocColor('ink1'), display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
              <li><Pill tone="soft" mono size="xs">@</Pill> <span style={{ marginLeft: 6 }}>用 @ 点名 Team 成员</span></li>
              <li><Pill tone="soft" mono size="xs">⌘↵</Pill> <span style={{ marginLeft: 6 }}>把消息送进现场</span></li>
              <li><Pill tone="soft" mono size="xs">⌥</Pill> <span style={{ marginLeft: 6 }}>悬停成员看上下文遥测</span></li>
            </ul>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ fontSize: 11.5, color: ocColor('ink2'), lineHeight: 1.5 }}>
            协作记录会落在 <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>~/.opencouncil/rooms</span>。任务结束后可以提改进，让 Team 升级。
          </div>
        </aside>
      </main>
    </MacChrome>
  );
}

function SectionLabel({ left, right }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 12.5, fontWeight: 500 }}>{left}</span>
      <span style={{ fontSize: 11.5, color: ocColor('ink2') }}>{right}</span>
    </div>
  );
}

function ContinueCard({ room }) {
  return (
    <div style={{
      padding: 14, borderRadius: 10,
      background: ocColor('card'), border: `1px solid ${ocColor('line')}`,
      display: 'flex', flexDirection: 'column', gap: 10, cursor: 'pointer',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Pill tone={room.status === 'working' ? 'working' : 'neutral'} size="xs">
          {room.status === 'working' ? '协作中' : '待续'}
        </Pill>
        <span style={{ color: ocColor('ink2') }}><I d={ICONS.arrowRight} size={14} /></span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, lineHeight: 1.35 }}>{room.title}</div>
      <div style={{ fontSize: 11.5, color: ocColor('ink2'), display: 'flex', gap: 6, alignItems: 'center' }}>
        <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>{room.team}</span>
        <span style={{ width: 2, height: 2, borderRadius: '50%', background: ocColor('ink3') }} />
        <span>{room.members} 成员</span>
      </div>
      <div style={{ display: 'flex', gap: -6, marginTop: 2 }}>
        {ocAgents.map((a, i) => (
          <span key={a.key} style={{ marginLeft: i ? -6 : 0 }}>
            <Avatar name={a.name} color={a.color} size={22} ring />
          </span>
        ))}
      </div>
    </div>
  );
}

function TeamTemplateCard({ name, tag, tool, toolStatus = 'ready', toolStatusLabel = '可用', members = [], pinned = false }) {
  const map = { ready: { tone: 'done', label: '可用' }, warn: { tone: 'working', label: toolStatusLabel || '待测试' }, error: { tone: 'error', label: toolStatusLabel || 'CLI 未配置' } };
  const m = map[toolStatus];
  return (
    <div style={{
      padding: 14, borderRadius: 10,
      background: ocColor('card'), border: `1px solid ${ocColor('line')}`,
      cursor: 'pointer', position: 'relative',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {pinned && <div style={{ position: 'absolute', top: 12, right: 12, color: ocColor('accent') }}><I d={ICONS.pin} size={12} /></div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontFamily: '"Newsreader", serif', fontSize: 16, fontWeight: 500 }}>{name}</span>
      </div>
      <div style={{ fontSize: 12, color: ocColor('ink1') }}>{tag}</div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
        <div style={{ display: 'flex' }}>
          {members.slice(0, 4).map((mem, i) => (
            <span key={i} style={{ marginLeft: i ? -6 : 0 }}>
              <Avatar name={mem.name} color={mem.color} size={22} ring />
            </span>
          ))}
          {members.length > 4 && <span style={{ marginLeft: -6, width: 22, height: 22, borderRadius: '50%', background: ocColor('cardSunk'), border: `2px solid ${ocColor('card')}`, fontSize: 10, color: ocColor('ink1'), display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>+{members.length - 4}</span>}
        </div>
        <Pill tone={m.tone} size="xs">{m.label}</Pill>
      </div>
      <div style={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono", monospace', color: ocColor('ink2'), letterSpacing: '0.02em', borderTop: `1px dashed ${ocColor('line')}`, paddingTop: 8 }}>{tool}</div>
    </div>
  );
}

function NewTeamCard() {
  return (
    <div style={{
      padding: 14, borderRadius: 10,
      background: 'transparent', border: `1px dashed ${ocColor('line')}`,
      cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 10,
      alignItems: 'center', justifyContent: 'center', textAlign: 'center', minHeight: 132,
      color: ocColor('ink1'),
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: ocColor('cardSunk'), display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}><I d={ICONS.wand} size={16} /></div>
      <div style={{ fontFamily: '"Newsreader", serif', fontSize: 15 }}>生成新 Team</div>
      <div style={{ fontSize: 11.5, color: ocColor('ink2') }}>描述长期擅长的任务类型</div>
    </div>
  );
}

// 2. 命令面板 ------------------------------------------------------------------
function ScreenCommandPalette() {
  return (
    <MacChrome title="opencouncil · ⌘K" w={1440} h={900}>
      <LeftRail activeId={null} />
      <main style={{ flex: 1, padding: '54px 64px', position: 'relative' }}>
        {/* dim背景 */}
        <div style={{ opacity: 0.3, pointerEvents: 'none', filter: 'blur(0px)' }}>
          <h1 style={{ fontFamily: '"Newsreader", serif', fontSize: 52, fontWeight: 400, letterSpacing: '-0.018em', margin: 0 }}>
            发起一个任务，<span style={{ fontStyle: 'italic', color: ocColor('accent') }}>交给 Team</span> 协作。
          </h1>
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,15,8,0.18)', backdropFilter: 'blur(2px)' }} />
        <div style={{
          position: 'absolute', top: 100, left: '50%', transform: 'translateX(-50%)',
          width: 640, background: ocColor('card'),
          borderRadius: 14, border: `1px solid ${ocColor('line')}`,
          boxShadow: '0 30px 80px -10px rgba(20,15,8,0.35)', overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: `1px solid ${ocColor('line')}` }}>
            <I d={ICONS.search} size={15} />
            <div style={{ flex: 1, fontSize: 15, color: ocColor('ink') }}>thermal</div>
            <span style={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono", monospace', color: ocColor('ink2'), padding: '2px 6px', borderRadius: 4, background: ocColor('cardSunk') }}>ESC 关闭</span>
          </div>
          <div style={{ maxHeight: 460, overflow: 'hidden' }}>
            <CmdSection label="操作">
              <CmdItem icon={<I d={ICONS.plus} size={13} />} title="发起任务" hint="选择 Team 进入协作现场" kbd="N" />
              <CmdItem icon={<I d={ICONS.cog} size={13} />} title="打开设置" hint="管理 Team / Provider / Skill" kbd="," />
            </CmdSection>
            <CmdSection label="任务记录 · 3 条匹配">
              <CmdItem
                icon={<span style={{ width: 6, height: 6, borderRadius: '50%', background: ocColor('working'), boxShadow: `0 0 0 3px ${hexFade('#c08a1f', 0.18)}`, marginLeft: 4, marginRight: 4 }} />}
                title={<span><strong style={{ background: ocColor('accentSoft'), color: ocColor('accentInk'), padding: '0 2px', borderRadius: 2 }}>thermal</strong>_curve.py 拐点重算</span>}
                hint="软件开发 Team · v3 · 2 分钟前 · @实现工程师 已开始改…"
                active
              />
              <CmdItem
                icon={<I d={ICONS.doc} size={13} />}
                title={<span>M3 芯片热管理 · 重构散热模型</span>}
                hint="软件开发 Team · v3 · 刚刚"
              />
              <CmdItem
                icon={<I d={ICONS.doc} size={13} />}
                title={<span>thermal 上线后报警阈值</span>}
                hint="软件开发 Team · v2 · 5 月 5 日 · 已归档"
              />
            </CmdSection>
            <CmdSection label="消息预览">
              <CmdItem
                icon={<Avatar name="实" color="#3f5c70" size={20} mono />}
                title={<span>… 拐点温度从 78°C 调到 <strong style={{ background: ocColor('accentSoft'), color: ocColor('accentInk'), padding: '0 2px', borderRadius: 2 }}>thermal</strong>_max - 6 …</span>}
                hint="实现工程师 · M3 芯片热管理"
              />
            </CmdSection>
          </div>
          <div style={{ padding: '10px 18px', display: 'flex', justifyContent: 'space-between', borderTop: `1px solid ${ocColor('line')}`, fontSize: 11, color: ocColor('ink2') }}>
            <span style={{ display: 'flex', gap: 12 }}>
              <KbdHint k="↑↓">浏览</KbdHint>
              <KbdHint k="↵">打开</KbdHint>
              <KbdHint k="⌘↵">在新窗口打开</KbdHint>
            </span>
            <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>4 项</span>
          </div>
        </div>
      </main>
    </MacChrome>
  );
}

function CmdSection({ label, children }) {
  return (
    <div style={{ padding: '10px 0' }}>
      <div style={{ padding: '4px 18px', fontSize: 10.5, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.1em', color: ocColor('ink2') }}>{label}</div>
      <div>{children}</div>
    </div>
  );
}
function CmdItem({ icon, title, hint, kbd, active = false }) {
  return (
    <div style={{
      padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 10,
      background: active ? ocColor('cardSunk') : 'transparent',
      borderLeft: active ? `2px solid ${ocColor('accent')}` : '2px solid transparent',
    }}>
      <span style={{ width: 22, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: ocColor('ink1') }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: ocColor('ink') }}>{title}</div>
        <div style={{ fontSize: 11.5, color: ocColor('ink2'), marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hint}</div>
      </div>
      {kbd && <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10.5, color: ocColor('ink2'), padding: '2px 6px', borderRadius: 4, background: ocColor('cardSunk') }}>⌘{kbd}</span>}
    </div>
  );
}
function KbdHint({ k, children }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, padding: '1px 5px', borderRadius: 3, background: ocColor('cardSunk'), border: `1px solid ${ocColor('line')}` }}>{k}</span>
      <span>{children}</span>
    </span>
  );
}

// 3. 发起任务 — 选择已有 Team --------------------------------------------------
function ScreenCreateTaskExisting() {
  return (
    <MacChrome title="opencouncil · 发起任务" w={1440} h={900}>
      <LeftRail activeId={null} />
      <main style={{ flex: 1, padding: '24px 40px', position: 'relative' }}>
        <div style={{ opacity: 0.4 }}>
          <h1 style={{ fontFamily: '"Newsreader", serif', fontSize: 52, fontWeight: 400, letterSpacing: '-0.018em', margin: 0 }}>
            发起一个任务，<span style={{ fontStyle: 'italic', color: ocColor('accent') }}>交给 Team</span> 协作。
          </h1>
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,15,8,0.16)' }} />
        <div style={{
          position: 'absolute', top: 56, left: '50%', transform: 'translateX(-50%)',
          width: 720, background: ocColor('card'),
          borderRadius: 14, border: `1px solid ${ocColor('line')}`,
          boxShadow: '0 30px 80px -10px rgba(20,15,8,0.35)', overflow: 'hidden',
          maxHeight: 760,
        }}>
          {/* header */}
          <div style={{ padding: '20px 24px 14px', borderBottom: `1px solid ${ocColor('line')}` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: '"Newsreader", serif', fontSize: 24, fontWeight: 500, margin: 0 }}>发起任务</h2>
              <IconBtn ghost hint="关闭"><I d={ICONS.x} size={14} /></IconBtn>
            </div>
            <p style={{ fontSize: 13, color: ocColor('ink1'), margin: '6px 0 0' }}>选择一支 Team，进入协作现场后再输入这次要做的事。</p>
          </div>
          {/* mode tabs */}
          <div style={{ padding: '14px 24px 0', display: 'flex', gap: 4 }}>
            <ModeTab active>选择已有 Team</ModeTab>
            <ModeTab>生成新 Team</ModeTab>
          </div>
          <div style={{ padding: '18px 24px 6px' }}>
            <Label>Team</Label>
            <SelectField
              value={
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
                  <span style={{ fontFamily: '"Newsreader", serif', fontSize: 15, fontWeight: 500 }}>软件开发 Team</span>
                  <Pill tone="soft" size="xs" mono>v3</Pill>
                  <span style={{ fontSize: 11.5, color: ocColor('ink2') }}>4 成员</span>
                </div>
              }
            />
            {/* selected team summary */}
            <div style={{
              marginTop: 12, padding: 14, borderRadius: 10,
              background: ocColor('bg2'), border: `1px solid ${ocColor('line')}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                <Pill tone="accent" size="xs">当前版本</Pill>
                <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>v3</span>
                <span style={{ color: ocColor('ink3') }}>·</span>
                <span style={{ color: ocColor('ink2') }}>4 成员</span>
              </div>
              <div style={{ fontSize: 13, color: ocColor('ink1'), marginTop: 8, lineHeight: 1.5 }}>
                <span style={{ color: ocColor('ink2') }}>适合：</span>
                架构改造、棘手 bug 排查、复盘抓 P0、开发任务全流程。先让主架构师给方案，挑战架构师找茬，达成一致再交给实现工程师，最后由 Reviewer 做质量门禁。
              </div>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: ocColor('ink2'), textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: '"IBM Plex Mono", monospace' }}>主要成员</span>
                <div style={{ display: 'flex' }}>
                  {ocAgents.map((a, i) => (
                    <span key={a.key} style={{ marginLeft: i ? -6 : 0 }}>
                      <Avatar name={a.name} color={a.color} size={26} ring />
                    </span>
                  ))}
                </div>
                <span style={{ fontSize: 11.5, color: ocColor('ink2') }}>主架构师 · 挑战架构师 · 实现工程师 · Reviewer</span>
              </div>
            </div>

            {/* tool status */}
            <div style={{ marginTop: 14 }}>
              <Label>执行工具</Label>
              <div style={{ marginTop: 6, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <ToolStatusRow name="Claude Code" status="ready" path="/usr/local/bin/claude" />
                <ToolStatusRow name="OpenCode" status="ready" path="~/.opencode/bin/opencode" />
                <ToolStatusRow name="Codex CLI" status="warn" path="待测试" />
              </div>
            </div>

            {/* workspace collapsed */}
            <div style={{ marginTop: 14 }}>
              <button style={{
                display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: ocColor('ink1'),
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              }}>
                <I d={ICONS.chevR} size={12} />
                <I d={ICONS.folder} size={13} />
                工作目录（可选）
                <span style={{ color: ocColor('ink2') }}>留空则用默认临时工作区</span>
              </button>
            </div>
          </div>

          <div style={{
            padding: '14px 24px', borderTop: `1px solid ${ocColor('line')}`,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: ocColor('bg2'),
          }}>
            <span style={{ fontSize: 12, color: ocColor('ink2') }}>
              <Pill tone="done" size="xs">通过</Pill>
              <span style={{ marginLeft: 8 }}>room preflight · 没有阻塞</span>
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost">取消</Btn>
              <Btn variant="accent" suffix={<I d={ICONS.arrowRight} size={13} />}>进入协作现场</Btn>
            </div>
          </div>
        </div>
      </main>
    </MacChrome>
  );
}

function ModeTab({ active = false, children }) {
  return (
    <button style={{
      padding: '8px 14px', borderRadius: '8px 8px 0 0',
      background: active ? ocColor('bg2') : 'transparent',
      border: `1px solid ${active ? ocColor('line') : 'transparent'}`,
      borderBottom: 'none',
      fontSize: 12.5, fontWeight: active ? 500 : 400,
      color: active ? ocColor('ink') : ocColor('ink1'),
      cursor: 'pointer', fontFamily: 'inherit',
      position: 'relative', top: 1,
    }}>{children}</button>
  );
}
function Label({ children, hint = null }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 }}>
      <span style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: ocColor('ink2') }}>{children}</span>
      {hint && <span style={{ fontSize: 11, color: ocColor('ink2') }}>{hint}</span>}
    </div>
  );
}
function SelectField({ value }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 12px', borderRadius: 8,
      background: ocColor('card'), border: `1px solid ${ocColor('line')}`,
      cursor: 'pointer',
    }}>
      {value}
      <I d={ICONS.chevD} size={13} />
    </div>
  );
}
function ToolStatusRow({ name, status, path }) {
  const cfg = { ready: { tone: 'done', label: 'Ready' }, warn: { tone: 'working', label: '待测试' }, error: { tone: 'error', label: 'CLI 未配置' } }[status];
  return (
    <div style={{
      padding: '10px 12px', borderRadius: 8,
      background: ocColor('card'), border: `1px solid ${ocColor('line')}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{name}</span>
        <Pill tone={cfg.tone} size="xs">{cfg.label}</Pill>
      </div>
      <div style={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono", monospace', color: ocColor('ink2'), marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{path}</div>
    </div>
  );
}

// 4. 发起任务 — 生成新 Team ----------------------------------------------------
function ScreenCreateTaskGenerate() {
  return (
    <MacChrome title="opencouncil · Team Architect" w={1440} h={900}>
      <LeftRail activeId={null} />
      <main style={{ flex: 1, padding: '24px 40px', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,15,8,0.16)' }} />
        <div style={{
          position: 'absolute', top: 36, left: '50%', transform: 'translateX(-50%)',
          width: 760, background: ocColor('card'),
          borderRadius: 14, border: `1px solid ${ocColor('line')}`,
          boxShadow: '0 30px 80px -10px rgba(20,15,8,0.35)',
          maxHeight: 800, overflow: 'hidden',
        }}>
          <div style={{ padding: '20px 24px 14px', borderBottom: `1px solid ${ocColor('line')}` }}>
            <h2 style={{ fontFamily: '"Newsreader", serif', fontSize: 24, fontWeight: 500, margin: 0 }}>发起任务</h2>
            <p style={{ fontSize: 13, color: ocColor('ink1'), margin: '6px 0 0' }}>描述你想让这支 Team 长期擅长什么，下面会给出一份可审阅的方案。</p>
          </div>
          <div style={{ padding: '14px 24px 0', display: 'flex', gap: 4 }}>
            <ModeTab>选择已有 Team</ModeTab>
            <ModeTab active>生成新 Team</ModeTab>
          </div>
          <div style={{ padding: '18px 24px' }}>
            <Label>这支 Team 擅长哪类事</Label>
            <div style={{
              padding: 12, borderRadius: 8, background: ocColor('bg2'),
              border: `1px solid ${ocColor('line')}`, fontSize: 13.5, lineHeight: 1.5,
              color: ocColor('ink'),
            }}>
              长期帮我做小红书选题、脚本、复盘和账号改进。我做美妆类，平均一周想出 5 条选题，需要兼顾平台调性和我的人设。
            </div>
            {/* generated proposal */}
            <div style={{
              marginTop: 14, padding: 16, borderRadius: 10,
              background: ocColor('card'), border: `1px solid ${ocColor('line')}`,
              backgroundImage: `linear-gradient(${ocColor('bg2')}, ${ocColor('card')})`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Pill tone="accent" size="xs" icon={<I d={ICONS.spark} size={10} />}>Team 方案</Pill>
                  <span style={{ fontSize: 12, color: ocColor('ink2') }}>由 Team Architect · Claude Code 生成</span>
                </div>
                <button style={{ fontSize: 11.5, color: ocColor('ink1'), background: 'none', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <I d={ICONS.reload} size={11} />重新生成
                </button>
              </div>
              <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: '"Newsreader", serif', fontSize: 22, fontWeight: 500 }}>美妆内容工作室</span>
                <I d={ICONS.edit} size={12} />
              </div>
              <div style={{ fontSize: 12.5, color: ocColor('ink1'), marginTop: 6, lineHeight: 1.55 }}>
                <span style={{ color: ocColor('ink2') }}>使命：</span>
                让你的小红书账号在选题、脚本、复盘、改进上稳定输出，每周 5 条选题，每月一次复盘升级。
              </div>

              <div style={{ marginTop: 14, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <ProposedMember name="选题策划" role="找出本周值得做的 5 个选题" color="#b25530" />
                <ProposedMember name="人设顾问" role="对照你的人设过滤选题" color="#7a3d6a" />
                <ProposedMember name="脚本写手" role="把选题写成可拍的脚本" color="#3f5c70" />
                <ProposedMember name="复盘官" role="每月梳理表现 + 改进点" color="#6b6c2f" />
                <ProposedMember name="平台校准" role="对照小红书最新调性" color="#c08a1f" />
              </div>

              <details style={{ marginTop: 12 }}>
                <summary style={{ fontSize: 12.5, color: ocColor('ink1'), cursor: 'pointer' }}>协作方式 · 分工规则 · 检查方式</summary>
              </details>
            </div>
          </div>
          <div style={{
            padding: '12px 24px', borderTop: `1px solid ${ocColor('line')}`,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: ocColor('bg2'),
          }}>
            <span style={{ fontSize: 11.5, color: ocColor('ink2') }}>方案确认后会创建 Team v1，并立即进入协作现场</span>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost">取消</Btn>
              <Btn variant="accent" suffix={<I d={ICONS.arrowRight} size={13} />}>创建 Team 并进入现场</Btn>
            </div>
          </div>
        </div>
      </main>
    </MacChrome>
  );
}

function ProposedMember({ name, role, color }) {
  return (
    <div style={{
      padding: 10, borderRadius: 8, background: ocColor('bg2'),
      border: `1px solid ${ocColor('line')}`,
      display: 'flex', alignItems: 'flex-start', gap: 10, position: 'relative',
    }}>
      <Avatar name={name} color={color} size={28} ring />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.8, fontWeight: 500 }}>{name}</div>
        <div style={{ fontSize: 11.5, color: ocColor('ink2'), marginTop: 2, lineHeight: 1.4 }}>{role}</div>
      </div>
      <button style={{ background: 'none', border: 'none', color: ocColor('ink2'), cursor: 'pointer', padding: 0 }}><I d={ICONS.x} size={12} /></button>
    </div>
  );
}

Object.assign(window, { ScreenHome, ScreenCommandPalette, ScreenCreateTaskExisting, ScreenCreateTaskGenerate });
