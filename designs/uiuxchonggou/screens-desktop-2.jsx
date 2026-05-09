// OpenCouncil — Room screens (空消息态 / 进行中 / 任务结束态)

// ============================================================
// Room layout primitives
// ============================================================

function RoomHeader({ title = '新任务记录', team = '软件开发 Team', version = 'v3', editingTitle = false, hasProposal = false, depth = 2 }) {
  return (
    <div style={{
      padding: '14px 22px', borderBottom: `1px solid ${ocColor('line')}`,
      display: 'flex', alignItems: 'center', gap: 14, background: ocColor('bg'),
      flexShrink: 0,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h1 style={{
            fontFamily: '"Newsreader", serif', fontSize: 18, fontWeight: 500, margin: 0,
            color: title === '新任务记录' ? ocColor('ink2') : ocColor('ink'),
            fontStyle: title === '新任务记录' ? 'italic' : 'normal',
          }}>{title}</h1>
          <button style={{ background: 'none', border: 'none', color: ocColor('ink2'), cursor: 'pointer', padding: 0, display: 'inline-flex' }}><I d={ICONS.edit} size={11} /></button>
          {team && (
            <>
              <span style={{ width: 3, height: 3, borderRadius: '50%', background: ocColor('ink3') }} />
              <span style={{ fontSize: 12, color: ocColor('ink1') }}>{team}</span>
              <Pill tone="soft" size="xs" mono>{version}</Pill>
            </>
          )}
        </div>
        <div style={{ fontSize: 11, color: ocColor('ink2'), marginTop: 3, fontFamily: '"IBM Plex Mono", monospace' }}>
          ~/work/m3-thermal-rebuild · room/8c2f
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <DepthControl depth={depth} />
        <span style={{ width: 1, height: 18, background: ocColor('line'), margin: '0 4px' }} />
        {hasProposal ? (
          <Btn size="sm" variant="accent" icon={<I d={ICONS.flag} size={12} />}>查看改进建议 · 6 条</Btn>
        ) : (
          <Btn size="sm" variant="default" icon={<I d={ICONS.flag} size={12} />}>提个改进</Btn>
        )}
        <Btn size="sm" variant="default" icon={<I d={ICONS.users} size={12} />}>邀请 Agent</Btn>
        <IconBtn hint="收起成员面板"><I d={ICONS.panel} size={13} /></IconBtn>
      </div>
    </div>
  );
}

function DepthControl({ depth = 2 }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 6, background: ocColor('cardSunk'), fontSize: 11.5, color: ocColor('ink1') }}>
      <I d={ICONS.tree} size={11} />
      <span>A2A 接力</span>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, fontFamily: '"IBM Plex Mono", monospace' }}>
        <button style={{ width: 16, height: 16, borderRadius: 4, background: ocColor('card'), border: `1px solid ${ocColor('line')}`, fontSize: 10, color: ocColor('ink1'), cursor: 'pointer', padding: 0 }}>−</button>
        <span style={{ minWidth: 14, textAlign: 'center', fontSize: 11.5 }}>{depth}</span>
        <button style={{ width: 16, height: 16, borderRadius: 4, background: ocColor('card'), border: `1px solid ${ocColor('line')}`, fontSize: 10, color: ocColor('ink1'), cursor: 'pointer', padding: 0 }}>+</button>
      </div>
      <span style={{ color: ocColor('ink3'), fontSize: 10.5 }}>/ 5</span>
    </div>
  );
}

function MemberPanel({ states = {} }) {
  // states: { arch: 'idle' | 'working' | 'waiting' | 'done', ... }
  return (
    <aside style={{
      width: 308, borderLeft: `1px solid ${ocColor('line')}`,
      background: ocColor('bg2'), display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ padding: '14px 18px', borderBottom: `1px solid ${ocColor('lineSoft')}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: ocColor('ink2') }}>Team 成员 · 4</span>
        <IconBtn ghost hint="刷新遥测" size={22}><I d={ICONS.reload} size={11} /></IconBtn>
      </div>
      <div style={{ overflowY: 'hidden', padding: '6px 10px' }}>
        {ocAgents.map((a, i) => <MemberCard key={a.key} agent={a} state={states[a.key] || 'idle'} host={i === 0} />)}
      </div>
      {/* Workspace + Skill summary */}
      <div style={{ borderTop: `1px solid ${ocColor('lineSoft')}`, padding: '14px 18px' }}>
        <div style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: ocColor('ink2') }}>WORKSPACE</div>
        <div style={{
          marginTop: 8, padding: '10px 12px', borderRadius: 8,
          background: ocColor('card'), border: `1px solid ${ocColor('line')}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
            <I d={ICONS.folder} size={12} />
            <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>~/work/m3-thermal-rebuild</span>
          </div>
          <div style={{ fontSize: 11, color: ocColor('ink2'), marginTop: 4, display: 'flex', gap: 10 }}>
            <span>main · 2 untracked</span>
            <span>Δ 7 文件</span>
          </div>
        </div>
        <div style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: ocColor('ink2'), marginTop: 14 }}>SKILL · 本任务生效</div>
        <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          <Pill tone="neutral" size="xs">code-review</Pill>
          <Pill tone="neutral" size="xs">cli-runner</Pill>
          <Pill tone="neutral" size="xs">git-aware</Pill>
          <Pill tone="soft" size="xs">+4 全局</Pill>
        </div>
      </div>
    </aside>
  );
}

function MemberCard({ agent, state = 'idle', host = false }) {
  const stateMap = {
    idle:    { label: '待命', tone: 'neutral' },
    waiting: { label: '等待中', tone: 'soft' },
    working: { label: '执行中', tone: 'working' },
    done:    { label: '已结束', tone: 'done' },
    stopping:{ label: '停止中…', tone: 'error' },
  };
  const s = stateMap[state];
  const showStop = state === 'working' && !host;
  const showCtx = state === 'working' || state === 'done';
  return (
    <div style={{
      padding: 10, borderRadius: 9, marginBottom: 4,
      background: state === 'working' ? ocColor('card') : 'transparent',
      border: state === 'working' ? `1px solid ${ocColor('line')}` : '1px solid transparent',
      display: 'flex', alignItems: 'flex-start', gap: 10, position: 'relative',
    }}>
      <Avatar name={agent.name} color={agent.color} size={32} ring status={state === 'working' ? 'working' : state === 'done' ? 'done' : null} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{agent.name}</span>
          {host && <Pill tone="ink" size="xs">主持</Pill>}
        </div>
        <div style={{ fontSize: 11.5, color: ocColor('ink2'), marginTop: 2 }}>{agent.role}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
          <Pill tone={s.tone} size="xs">{s.label}</Pill>
          {showCtx && <ContextRing percent={state === 'working' ? 0.62 : 0.38} />}
          {state === 'working' && <span style={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono", monospace', color: ocColor('ink2') }}>↑1.4k ↓820</span>}
        </div>
      </div>
      {showStop && (
        <button title="停止" style={{
          width: 22, height: 22, borderRadius: 5,
          background: 'transparent', border: `1px solid ${ocColor('line')}`,
          color: ocColor('error'), cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0,
        }}><I d={ICONS.stop} size={9} /></button>
      )}
    </div>
  );
}

function ContextRing({ percent = 0.5, size = 16 }) {
  const r = (size - 2) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - percent);
  const tone = percent > 0.85 ? ocColor('error') : percent > 0.7 ? ocColor('working') : ocColor('done');
  return (
    <span title={`上下文剩余 ${Math.round((1 - percent) * 100)}%`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10.5, color: ocColor('ink2') }}>
      <svg width={size} height={size} style={{ display: 'block' }}>
        <circle cx={size/2} cy={size/2} r={r} stroke={ocColor('line')} strokeWidth="2" fill="none" />
        <circle
          cx={size/2} cy={size/2} r={r}
          stroke={tone} strokeWidth="2" fill="none"
          strokeDasharray={c} strokeDashoffset={offset}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          strokeLinecap="round"
        />
      </svg>
      <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>{Math.round(percent * 100)}%</span>
    </span>
  );
}

// ============================================================
// 5. Room — 空消息态
// ============================================================
function ScreenRoomEmpty() {
  return (
    <MacChrome title="opencouncil · 协作现场" w={1440} h={900}>
      <LeftRail activeId={1} />
      <main style={{ flex: 1, display: 'flex', minWidth: 0 }}>
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <RoomHeader title="新任务记录" team="软件开发 Team" version="v3" />
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 40, overflow: 'hidden' }}>
            <div style={{ maxWidth: 560, textAlign: 'center' }}>
              <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: ocColor('ink2'), marginBottom: 14 }}>· 现场已就绪 ·</div>
              <h2 style={{ fontFamily: '"Newsreader", serif', fontSize: 36, fontWeight: 400, letterSpacing: '-0.012em', margin: 0, lineHeight: 1.15 }}>
                从 <span style={{ color: ocColor('accent'), fontStyle: 'italic' }}>@一位专家</span> 开始
              </h2>
              <p style={{ fontSize: 14, color: ocColor('ink1'), lineHeight: 1.6, marginTop: 14, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
                每条消息都需要明确收件人。软件开发任务建议先找 <strong style={{ fontWeight: 500 }}>主架构师</strong> 出方案，再让 <strong style={{ fontWeight: 500 }}>挑战架构师</strong> 找茬收敛；达成一致后交给 <strong style={{ fontWeight: 500 }}>实现工程师</strong>，最后由 <strong style={{ fontWeight: 500 }}>Reviewer</strong> 做质量门禁。
              </p>
              {/* role pills */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 22, flexWrap: 'wrap' }}>
                {ocAgents.map(a => (
                  <button key={a.key} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 7,
                    padding: '7px 12px 7px 7px', borderRadius: 999,
                    background: ocColor('card'), border: `1px solid ${ocColor('line')}`,
                    fontFamily: 'inherit', fontSize: 12.5, color: ocColor('ink'), cursor: 'pointer',
                  }}>
                    <Avatar name={a.name} color={a.color} size={20} />
                    <span style={{ fontFamily: '"IBM Plex Mono", monospace', color: ocColor('ink2') }}>@</span>{a.name}
                  </button>
                ))}
              </div>
              {/* recipe hint */}
              <div style={{
                marginTop: 28, padding: '14px 18px', borderRadius: 10,
                background: ocColor('bg2'), border: `1px dashed ${ocColor('line')}`,
                fontSize: 12.5, color: ocColor('ink1'), textAlign: 'left', lineHeight: 1.55,
              }}>
                <span style={{ fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', fontSize: 10.5, letterSpacing: '0.08em', color: ocColor('ink2') }}>建议这样开场</span>
                <div style={{ marginTop: 6 }}>
                  <span style={{ color: ocColor('accent'), fontWeight: 500 }}>@主架构师</span> 我们要把 thermal_curve.py 重构成可注入的策略类，
                  目标：减少散热 if/else 嵌套；交付：方案文档 + 关键接口；边界：保持现有热阈值不变。
                </div>
              </div>
            </div>
          </div>
          <Composer placeholder="@主架构师 我们要重构 thermal_curve.py …" />
        </section>
        <MemberPanel states={{ arch: 'idle', chal: 'idle', impl: 'idle', rev: 'idle' }} />
      </main>
    </MacChrome>
  );
}

function Composer({ placeholder = '说清楚目标、交付物、边界。⌘↵ 发送', queue = [], hint = null }) {
  return (
    <div style={{ padding: '14px 22px 18px', borderTop: `1px solid ${ocColor('line')}`, background: ocColor('bg') }}>
      {queue.length > 0 && (
        <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {queue.map((q, i) => (
            <div key={i} style={{
              padding: '6px 10px', borderRadius: 8,
              background: ocColor('cardSunk'), border: `1px dashed ${ocColor('line')}`,
              fontSize: 12, color: ocColor('ink1'), display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <Pill tone="soft" size="xs">排队</Pill>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q}</span>
              <button style={{ background: 'none', border: 'none', color: ocColor('ink2'), cursor: 'pointer' }}><I d={ICONS.x} size={11} /></button>
            </div>
          ))}
        </div>
      )}
      <div style={{
        background: ocColor('card'), border: `1px solid ${ocColor('line')}`, borderRadius: 12,
        padding: '10px 12px',
      }}>
        <div style={{ minHeight: 50, fontSize: 14, color: ocColor('ink2'), lineHeight: 1.5 }}>{placeholder}</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 6 }}>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <IconBtn ghost hint="@点名" size={26}><I d={ICONS.mention} size={12} /></IconBtn>
            <IconBtn ghost hint="附件" size={26}><I d={ICONS.file} size={12} /></IconBtn>
            <IconBtn ghost hint="Skill" size={26}><I d={ICONS.bolt} size={12} /></IconBtn>
            <span style={{ fontSize: 11, color: ocColor('ink3'), marginLeft: 4 }}>{hint || '⌘↵ 发送 · ⇧↵ 换行'}</span>
          </div>
          <Btn variant="accent" size="sm" icon={<I d={ICONS.send2} size={12} />}>发送</Btn>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// 6. Room — 进行中（消息流主秀）
// ============================================================
function ScreenRoomActive() {
  return (
    <MacChrome title="opencouncil · 协作现场 · 进行中" w={1440} h={1180}>
      <LeftRail activeId={1} />
      <main style={{ flex: 1, display: 'flex', minWidth: 0 }}>
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <RoomHeader title="M3 芯片热管理 · 重构散热模型" team="软件开发 Team" version="v3" depth={2} />
          <div style={{ flex: 1, padding: '20px 28px 12px', overflowY: 'hidden', display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* User msg */}
            <UserMsg
              to="主架构师"
              time="14:02"
              body={<>把 <code>thermal_curve.py</code> 重构成可注入的策略类。目标：减少散热 if/else 嵌套；交付：方案文档 + 关键接口；边界：现有热阈值不变。</>}
            />

            {/* Architect reply */}
            <AgentMsg
              agent={ocAgents[0]}
              time="14:02 · 思考 18s · 输出"
              streamLabel="已结束"
              meta="↑2.1k ↓1.8k · 12s"
              body={
                <>
                  <p style={{ margin: '0 0 10px' }}>方向 OK。我建议拆 3 层：</p>
                  <ol style={{ margin: '0 0 10px 18px', paddingLeft: 0, lineHeight: 1.65 }}>
                    <li><b>Curve 层</b>：把当前 5 段 if/else 抽成 <code>ThermalCurve(Protocol)</code>，提供 <code>load(temp) → fanRPM</code> 单一入口。</li>
                    <li><b>Strategy 层</b>：<code>LinearCurve</code>、<code>StepCurve</code>、<code>HystereticCurve</code>，注入即可。</li>
                    <li><b>Selector 层</b>：根据 <code>thermal_max</code> 与负载历史选具体 strategy，原 if/else 收口在这里。</li>
                  </ol>
                  <p style={{ margin: 0 }}>边界保留：<code>fan_min/max</code> 与 <code>thermal_max</code> 的现值不动。</p>
                </>
              }
              tools={[{ name: 'read', label: 'thermal_curve.py · 218 行', dur: '0.2s' }]}
              mention="挑战架构师"
              mentionText="麻烦你过一遍这个分层，特别是 hysteresis 边界。"
            />

            {/* Challenge reply (depth 1) */}
            <AgentMsg
              indent={1}
              calledBy={ocAgents[0]}
              agent={ocAgents[1]}
              time="14:03 · 思考 22s · 输出"
              streamLabel="输出中"
              streaming
              meta="↑3.0k ↓620 · 实时"
              body={
                <>
                  <p style={{ margin: '0 0 8px' }}>三层我没有意见，但 <span style={{ background: ocColor('errorSoft'), color: ocColor('error'), padding: '0 4px', borderRadius: 3, fontWeight: 500 }}>HystereticCurve</span> 这一项有问题：</p>
                  <ul style={{ margin: '0 0 8px 18px', lineHeight: 1.65 }}>
                    <li>目前阈值之间的 dead-band 写在常量里，热历史会被丢掉，重启后会跳；</li>
                    <li>我建议把 dead-band 也参数化，放在 strategy 内部，而不是 Selector。</li>
                  </ul>
                  <p style={{ margin: 0 }}>另外我没看到回滚策略——如果新 Selector 误判，能不能 1 秒内退回旧 if/else？▍</p>
                </>
              }
            />

            {/* User interjection (queued) */}
            <UserMsg
              queued
              to="主架构师"
              time="待发送"
              body="同意挑战架构师。先把回滚策略补到方案里。"
            />
          </div>
          <Composer
            placeholder="@主架构师 同意挑战架构师，先补回滚策略 …"
            queue={["@实现工程师 等方案定稿后再开工，先别动代码。"]}
          />
        </section>
        <MemberPanel states={{ arch: 'done', chal: 'working', impl: 'waiting', rev: 'idle' }} />
      </main>
    </MacChrome>
  );
}

function UserMsg({ to, time, body, queued = false }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', maxWidth: 720, marginLeft: 'auto', opacity: queued ? 0.6 : 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: ocColor('ink2'), marginBottom: 4 }}>
        {queued && <Pill tone="soft" size="xs">排队中</Pill>}
        <span>你</span>
        <I d={ICONS.arrowRight} size={11} />
        <span style={{ color: ocColor('accent') }}>@{to}</span>
        <span style={{ width: 2, height: 2, borderRadius: '50%', background: ocColor('ink3') }} />
        <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>{time}</span>
      </div>
      <div style={{
        padding: '10px 14px', borderRadius: '12px 12px 4px 12px',
        background: ocColor('ink'), color: ocColor('card'),
        fontSize: 13.5, lineHeight: 1.55,
        border: queued ? `1px dashed ${ocColor('ink2')}` : 'none',
        background: queued ? 'transparent' : ocColor('ink'),
        color: queued ? ocColor('ink1') : '#fbf6e9',
      }}>{body}</div>
    </div>
  );
}

function AgentMsg({ agent, time, body, streamLabel, streaming = false, meta = null, tools = [], mention = null, mentionText = null, calledBy = null, indent = 0 }) {
  return (
    <div style={{ display: 'flex', gap: 12, marginLeft: indent * 32, position: 'relative' }}>
      {/* indentation rail */}
      {indent > 0 && (
        <div style={{ position: 'absolute', left: -22, top: -10, bottom: 0, width: 22 }}>
          <svg width="22" height="40" style={{ position: 'absolute', top: 0, left: 0 }}>
            <path d="M0 0 V18 Q0 30 12 30 H22" fill="none" stroke={ocColor('line')} strokeWidth="1.4" />
          </svg>
        </div>
      )}
      <Avatar name={agent.name} color={agent.color} size={34} ring />
      <div style={{ flex: 1, minWidth: 0, maxWidth: 760 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 500 }}>{agent.name}</span>
          {calledBy && <Pill tone="soft" size="xs" icon={<I d={ICONS.mention} size={9} />}>由 @{calledBy.name} 召唤</Pill>}
          <span style={{ fontSize: 11, color: ocColor('ink2'), fontFamily: '"IBM Plex Mono", monospace' }}>{time}</span>
          {streaming && <StatusDot tone="working" label="输出中…" />}
        </div>
        {/* tool calls */}
        {tools.length > 0 && (
          <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {tools.map((t, i) => (
              <div key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '5px 9px', borderRadius: 6, fontSize: 11.5,
                background: ocColor('cardSunk'), border: `1px solid ${ocColor('line')}`,
                color: ocColor('ink1'), width: 'fit-content',
                fontFamily: '"IBM Plex Mono", monospace',
              }}>
                <I d={ICONS.bolt} size={10} />
                <span style={{ color: ocColor('accent') }}>{t.name}</span>
                <span style={{ color: ocColor('ink3') }}>·</span>
                <span>{t.label}</span>
                <span style={{ color: ocColor('ink3') }}>·</span>
                <span style={{ color: ocColor('done') }}>✓ {t.dur}</span>
              </div>
            ))}
          </div>
        )}
        {/* body bubble */}
        <div style={{
          padding: '12px 16px', borderRadius: '4px 12px 12px 12px',
          background: ocColor('card'), border: `1px solid ${ocColor('line')}`,
          fontSize: 13.5, lineHeight: 1.6, color: ocColor('ink'),
        }}>{body}</div>
        {/* mention cta */}
        {mention && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 11.5, color: ocColor('ink2') }}>接力 →</span>
            <Pill tone="accent" size="sm" icon={<I d={ICONS.mention} size={10} />}>@{mention}</Pill>
            <span style={{ fontSize: 11.5, color: ocColor('ink2'), fontStyle: 'italic' }}>「{mentionText}」</span>
          </div>
        )}
        {/* meta */}
        {meta && (
          <div style={{ marginTop: 6, fontSize: 10.5, fontFamily: '"IBM Plex Mono", monospace', color: ocColor('ink3'), display: 'flex', gap: 10 }}>
            <span>{streamLabel}</span><span>·</span><span>{meta}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// 7. Room — 任务结束态
// ============================================================
function ScreenRoomDone() {
  return (
    <MacChrome title="opencouncil · 协作现场 · 已结束" w={1440} h={900}>
      <LeftRail activeId={3} />
      <main style={{ flex: 1, display: 'flex', minWidth: 0 }}>
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <RoomHeader title="上线前那次复盘 · 抓 P0" team="软件开发 Team" version="v3" />
          <div style={{ flex: 1, padding: '20px 28px 12px', overflowY: 'hidden', display: 'flex', flexDirection: 'column', gap: 18 }}>
            <AgentMsg
              agent={ocAgents[3]}
              time="15:48 · 输出"
              streamLabel="已结束"
              meta="↑1.7k ↓2.2k · 22s"
              body={
                <>
                  <p style={{ margin: '0 0 8px' }}>P0 收口 3 条：</p>
                  <ol style={{ margin: '0 0 8px 18px', lineHeight: 1.7 }}>
                    <li>gateway 在 5xx 时漏了 OTLP traceId 透传，导致排查链断在网关。</li>
                    <li>thermal 重启后 dead-band 历史不持久化（已在本次重构里修）。</li>
                    <li>上线脚本对回滚 hash 没有校验。</li>
                  </ol>
                  <p style={{ margin: 0 }}>非 P0 6 条整理在 <code>~/work/p0-review/notes.md</code>。</p>
                </>
              }
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: ocColor('ink2'), padding: '8px 0' }}>
              <div style={{ flex: 1, height: 1, background: ocColor('line') }} />
              <span style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.12em' }}>· 任务结束 · 15:52 ·</span>
              <div style={{ flex: 1, height: 1, background: ocColor('line') }} />
            </div>
          </div>

          {/* Done card replaces composer */}
          <div style={{ padding: '14px 22px 22px', borderTop: `1px solid ${ocColor('line')}`, background: ocColor('bg') }}>
            <div style={{
              padding: '18px 20px', borderRadius: 12,
              background: ocColor('card'), border: `1px solid ${ocColor('line')}`,
              backgroundImage: `linear-gradient(135deg, ${ocColor('doneSoft')} 0%, ${ocColor('card')} 50%)`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Pill tone="done" size="sm" icon={<I d={ICONS.check} size={10} />}>任务已结束</Pill>
                    <span style={{ fontSize: 12.5, color: ocColor('ink1') }}>共 <b>34</b> 条消息 · <b>4</b> 位成员参与</span>
                  </div>
                  <div style={{ fontFamily: '"Newsreader", serif', fontSize: 18, marginTop: 8, fontWeight: 500 }}>
                    下次让 Team 做得更好 — 提一条改进意见。
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <Btn size="md" variant="accent" icon={<I d={ICONS.flag} size={12} />}>提一条改进意见</Btn>
                  <Btn size="md" variant="default" icon={<I d={ICONS.plus} size={12} />}>以这次为起点开新任务</Btn>
                  <button style={{ background: 'none', border: 'none', color: ocColor('ink2'), fontSize: 11.5, cursor: 'not-allowed', padding: 0, textAlign: 'right' }} title="结论摘要需要独立总结入口，当前版本暂不自动生成">
                    让 Team 总结一份结论 <span style={{ marginLeft: 4 }}>·</span> <i>暂未启用</i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
        <MemberPanel states={{ arch: 'done', chal: 'done', impl: 'done', rev: 'done' }} />
      </main>
    </MacChrome>
  );
}

Object.assign(window, {
  ScreenRoomEmpty, ScreenRoomActive, ScreenRoomDone,
  RoomHeader, MemberPanel, MemberCard, ContextRing, Composer,
  UserMsg, AgentMsg, DepthControl,
});
