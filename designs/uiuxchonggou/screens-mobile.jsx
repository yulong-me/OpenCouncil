// OpenCouncil — Mobile artboards (375 × 812)

function PhoneFrame({ title = 'opencouncil', children, dim = false }) {
  return (
    <div style={{
      width: 380, height: 800,
      background: ocColor('bg'), borderRadius: 30, overflow: 'hidden',
      border: `1px solid ${ocColor('line')}`,
      boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 30px 60px -30px rgba(20,15,8,0.18)',
      position: 'relative', display: 'flex', flexDirection: 'column',
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      color: ocColor('ink'),
    }}>
      {/* status bar */}
      <div style={{ height: 36, padding: '0 22px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: '"IBM Plex Mono", monospace', fontSize: 11.5, color: ocColor('ink'), flexShrink: 0 }}>
        <span style={{ fontWeight: 500 }}>9:41</span>
        <span style={{ display: 'flex', gap: 5 }}>
          <span>•••</span>
          <span>◀</span>
          <span>▮</span>
        </span>
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
        {children}
      </div>
      {/* home indicator */}
      <div style={{ height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ width: 110, height: 4, borderRadius: 4, background: ocColor('ink'), opacity: 0.85 }} />
      </div>
    </div>
  );
}

function MobileTopBar({ left, title, right }) {
  return (
    <div style={{ padding: '8px 14px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${ocColor('lineSoft')}`, flexShrink: 0 }}>
      <div style={{ width: 28 }}>{left}</div>
      <div style={{ flex: 1, textAlign: 'center', fontFamily: '"Newsreader", serif', fontSize: 15, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
      <div style={{ width: 28, display: 'flex', justifyContent: 'flex-end' }}>{right}</div>
    </div>
  );
}

// ============================================================
// Mobile 1 — 首页
// ============================================================
function ScreenMobileHome() {
  return (
    <PhoneFrame>
      <MobileTopBar
        left={<IconBtn ghost size={28}><I d={ICONS.menu} size={14} /></IconBtn>}
        title={<BrandMark mini={false} />}
        right={<IconBtn ghost size={28}><I d={ICONS.cog} size={14} /></IconBtn>}
      />
      <div style={{ flex: 1, padding: '20px 18px', overflowY: 'hidden' }}>
        <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: ocColor('ink2') }}>· 主线 ·</div>
        <h1 style={{ fontFamily: '"Newsreader", serif', fontSize: 30, lineHeight: 1.1, fontWeight: 400, letterSpacing: '-0.012em', margin: '8px 0 0' }}>
          发起一个任务，<br />
          <span style={{ fontStyle: 'italic', color: ocColor('accent') }}>交给 Team</span> 协作。
        </h1>
        <p style={{ fontSize: 12.5, color: ocColor('ink1'), lineHeight: 1.55, marginTop: 12 }}>
          先选 Team，进入现场后再说要做什么。
        </p>

        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: ocColor('ink2') }}>继续上次的协作</div>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <MobileContinueRow room={ocRooms[0]} />
            <MobileContinueRow room={ocRooms[1]} />
          </div>
        </div>

        <div style={{ marginTop: 18 }}>
          <div style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: ocColor('ink2') }}>快速 Team</div>
          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <MobileTeamCard name="软件开发" tag="开发全流程" status="ready" />
            <MobileTeamCard name="竞品分析" tag="对比 · 卖点" status="ready" />
            <MobileTeamCard name="论文返修" tag="改稿 · 回应信" status="warn" />
            <MobileTeamCard name="生成新 Team" tag="描述擅长的事" status="new" />
          </div>
        </div>
      </div>
      {/* sticky CTA */}
      <div style={{ padding: '12px 14px 14px', borderTop: `1px solid ${ocColor('line')}`, background: ocColor('bg2'), flexShrink: 0 }}>
        <Btn variant="accent" full size="md" icon={<I d={ICONS.plus} size={13} />}>发起任务</Btn>
      </div>
    </PhoneFrame>
  );
}

function MobileContinueRow({ room }) {
  return (
    <div style={{
      padding: 11, borderRadius: 10, background: ocColor('card'),
      border: `1px solid ${ocColor('line')}`, display: 'flex', gap: 10, alignItems: 'center',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Pill tone={room.status === 'working' ? 'working' : 'soft'} size="xs">{room.status === 'working' ? '协作中' : '待续'}</Pill>
          <span style={{ fontSize: 10.5, color: ocColor('ink2'), fontFamily: '"IBM Plex Mono", monospace' }}>{room.team.split(' · ')[1]}</span>
        </div>
        <div style={{ fontSize: 13, fontWeight: 500, marginTop: 5, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.title}</div>
      </div>
      <I d={ICONS.arrowRight} size={14} />
    </div>
  );
}

function MobileTeamCard({ name, tag, status }) {
  if (status === 'new') {
    return (
      <div style={{
        padding: '12px 11px', borderRadius: 10, background: 'transparent',
        border: `1px dashed ${ocColor('line')}`,
        display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start',
      }}>
        <I d={ICONS.wand} size={14} />
        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{name}</span>
        <span style={{ fontSize: 10.5, color: ocColor('ink2') }}>{tag}</span>
      </div>
    );
  }
  const cfg = { ready: { tone: 'done', label: '可用' }, warn: { tone: 'working', label: '待测试' } }[status];
  return (
    <div style={{
      padding: '12px 11px', borderRadius: 10, background: ocColor('card'),
      border: `1px solid ${ocColor('line')}`,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ fontSize: 13, fontWeight: 500, fontFamily: '"Newsreader", serif' }}>{name}</div>
      <div style={{ fontSize: 10.5, color: ocColor('ink2') }}>{tag}</div>
      <Pill tone={cfg.tone} size="xs">{cfg.label}</Pill>
    </div>
  );
}

// ============================================================
// Mobile 2 — 协作现场
// ============================================================
function ScreenMobileRoom() {
  return (
    <PhoneFrame>
      <div style={{ padding: '6px 14px 10px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${ocColor('lineSoft')}`, flexShrink: 0 }}>
        <IconBtn ghost size={26}><I d={ICONS.arrowLeft} size={13} /></IconBtn>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, fontFamily: '"Newsreader", serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>M3 芯片热管理 · 散热模型</div>
          <div style={{ fontSize: 10.5, color: ocColor('ink2'), display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
            <span>软件开发 Team</span>
            <Pill tone="soft" size="xs" mono>v3</Pill>
          </div>
        </div>
        <IconBtn ghost size={26}><I d={ICONS.users} size={13} /></IconBtn>
      </div>

      <div style={{ flex: 1, overflowY: 'hidden', padding: '14px 14px 8px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* user msg */}
        <div style={{ alignSelf: 'flex-end', maxWidth: '82%' }}>
          <div style={{ fontSize: 10.5, color: ocColor('ink2'), marginBottom: 3, textAlign: 'right', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
            <span>你 →</span>
            <span style={{ color: ocColor('accent') }}>@主架构师</span>
          </div>
          <div style={{ padding: '9px 11px', borderRadius: '12px 12px 4px 12px', background: ocColor('ink'), color: '#fbf6e9', fontSize: 12.5, lineHeight: 1.5 }}>
            把 thermal_curve.py 重构成可注入的策略类。目标减少 if/else，边界保现有阈值。
          </div>
        </div>

        {/* arch reply */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <Avatar name={ocAgents[0].name} color={ocAgents[0].color} size={26} ring />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: ocColor('ink2'), marginBottom: 3, display: 'flex', gap: 5, alignItems: 'center' }}>
              <span style={{ fontWeight: 500, color: ocColor('ink') }}>主架构师</span>
              <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>14:02</span>
            </div>
            <div style={{ padding: '9px 11px', borderRadius: '4px 12px 12px 12px', background: ocColor('card'), border: `1px solid ${ocColor('line')}`, fontSize: 12.5, lineHeight: 1.55 }}>
              方向 OK。我建议拆 3 层：Curve / Strategy / Selector，把 if/else 收口到 Selector。边界保留 fan_min/max 不变。
            </div>
            <div style={{ marginTop: 5, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10.5, color: ocColor('ink2') }}>接力 →</span>
              <Pill tone="accent" size="xs" icon={<I d={ICONS.mention} size={9} />}>@挑战架构师</Pill>
            </div>
          </div>
        </div>

        {/* challenge reply, indented */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginLeft: 18, position: 'relative' }}>
          <div style={{ position: 'absolute', left: -10, top: -6, width: 10, height: 24, borderLeft: `1px solid ${ocColor('line')}`, borderBottom: `1px solid ${ocColor('line')}`, borderBottomLeftRadius: 8 }} />
          <Avatar name={ocAgents[1].name} color={ocAgents[1].color} size={26} ring status="working" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: ocColor('ink2'), marginBottom: 3, display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 500, color: ocColor('ink') }}>挑战架构师</span>
              <Pill tone="soft" size="xs" icon={<I d={ICONS.mention} size={8} />}>由 @主架构师 召唤</Pill>
            </div>
            <div style={{ padding: '9px 11px', borderRadius: '4px 12px 12px 12px', background: ocColor('card'), border: `1px solid ${ocColor('line')}`, fontSize: 12.5, lineHeight: 1.55 }}>
              三层 OK，但 <span style={{ background: ocColor('errorSoft'), color: ocColor('error'), padding: '0 3px', borderRadius: 2 }}>HystereticCurve</span> 的 dead-band 写死在常量里，重启会跳 — 建议参数化。回滚策略也没看到 ▍
            </div>
            <div style={{ marginTop: 4, fontSize: 10, fontFamily: '"IBM Plex Mono", monospace', color: ocColor('ink3') }}>输出中… ↑3.0k ↓620</div>
          </div>
        </div>
      </div>

      {/* mobile composer */}
      <div style={{ padding: '8px 12px 10px', borderTop: `1px solid ${ocColor('line')}`, background: ocColor('bg'), flexShrink: 0 }}>
        <div style={{ background: ocColor('card'), border: `1px solid ${ocColor('line')}`, borderRadius: 18, padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <I d={ICONS.mention} size={13} />
          <span style={{ flex: 1, fontSize: 12.5, color: ocColor('ink2') }}>同意，先补回滚策略…</span>
          <button style={{ width: 28, height: 28, borderRadius: '50%', background: ocColor('accent'), color: '#fff8ef', border: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <I d={ICONS.send2} size={13} />
          </button>
        </div>
      </div>
    </PhoneFrame>
  );
}

// ============================================================
// Mobile 3 — 成员抽屉
// ============================================================
function ScreenMobileMembers() {
  return (
    <PhoneFrame>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {/* bg dimmed room */}
        <div style={{ position: 'absolute', inset: 0, background: ocColor('bg'), padding: '14px 14px', opacity: 0.45 }}>
          <div style={{ fontSize: 12, color: ocColor('ink1') }}>···</div>
          <div style={{ marginTop: 16, height: 60, background: ocColor('card'), borderRadius: 10 }} />
          <div style={{ marginTop: 10, height: 80, background: ocColor('card'), borderRadius: 10 }} />
        </div>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,15,8,0.32)' }} />
        {/* drawer */}
        <div style={{
          position: 'absolute', right: 0, top: 0, bottom: 0, width: 320,
          background: ocColor('bg2'), borderLeft: `1px solid ${ocColor('line')}`,
          display: 'flex', flexDirection: 'column',
          boxShadow: '-30px 0 60px -10px rgba(20,15,8,0.4)',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${ocColor('line')}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 500, fontFamily: '"Newsreader", serif' }}>Team 成员</div>
              <div style={{ fontSize: 10.5, color: ocColor('ink2'), marginTop: 2, fontFamily: '"IBM Plex Mono", monospace' }}>软件开发 · v3 · 4 人</div>
            </div>
            <IconBtn ghost size={26}><I d={ICONS.x} size={12} /></IconBtn>
          </div>
          <div style={{ flex: 1, overflowY: 'hidden', padding: '8px 10px' }}>
            <MemberCard agent={ocAgents[0]} state="done" host />
            <MemberCard agent={ocAgents[1]} state="working" />
            <MemberCard agent={ocAgents[2]} state="waiting" />
            <MemberCard agent={ocAgents[3]} state="idle" />
          </div>
          <div style={{ padding: '12px 14px', borderTop: `1px solid ${ocColor('line')}` }}>
            <Btn variant="default" size="sm" full icon={<I d={ICONS.users} size={11} />}>邀请 Agent 参与任务</Btn>
          </div>
        </div>
      </div>
      <div style={{ height: 22 }} />
    </PhoneFrame>
  );
}

// ============================================================
// Mobile 4 — 改进弹窗
// ============================================================
function ScreenMobileImprove() {
  return (
    <PhoneFrame>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,15,8,0.28)' }} />
        <div style={{
          position: 'absolute', left: 0, right: 0, bottom: 0,
          background: ocColor('card'), borderRadius: '16px 16px 0 0',
          padding: '14px 16px 18px',
          boxShadow: '0 -20px 60px -10px rgba(20,15,8,0.4)',
          maxHeight: '80%', display: 'flex', flexDirection: 'column',
        }}>
          {/* drag handle */}
          <div style={{ width: 36, height: 4, borderRadius: 4, background: ocColor('line'), alignSelf: 'center' }} />
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: '"Newsreader", serif', fontSize: 18, fontWeight: 500 }}>改进这支 Team</div>
              <div style={{ fontSize: 11, color: ocColor('ink2'), marginTop: 3 }}>软件开发 Team · <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>v3 → v4</span></div>
            </div>
            <IconBtn ghost size={24}><I d={ICONS.x} size={11} /></IconBtn>
          </div>
          <div style={{ marginTop: 12, fontSize: 13.5, fontFamily: '"Newsreader", serif' }}>这支 Team <em>下次怎么做</em> 会更好？</div>
          <div style={{
            marginTop: 8, padding: '10px 12px', borderRadius: 8,
            background: ocColor('bg2'), border: `1px solid ${ocColor('line')}`,
            minHeight: 90, fontSize: 12.5, lineHeight: 1.55,
          }}>
            下次先问清楚我的限制条件，再开始给方案。
          </div>
          <div style={{ marginTop: 6, fontSize: 10.5, color: ocColor('ink2'), display: 'flex', justifyContent: 'space-between' }}>
            <span>系统会结合现场记录归纳建议</span>
            <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>26 / 600</span>
          </div>

          <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: ocColor('workingSoft'), border: `1px solid ${hexFade('#c08a1f', 0.3)}`, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <span style={{ color: '#c08a1f' }}><I d={ICONS.warn} size={12} /></span>
            <div style={{ flex: 1, fontSize: 11.5, color: '#7a5a16' }}>
              <div style={{ fontWeight: 500 }}>1 位成员仍在执行</div>
              <div style={{ marginTop: 2 }}>挑战架构师 · 输出中</div>
            </div>
          </div>

          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Btn variant="accent" full disabled>生成改进建议</Btn>
            <button style={{ background: 'none', border: 'none', color: ocColor('ink1'), fontSize: 12, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, textDecorationColor: ocColor('ink3') }}>
              停止当前执行并生成
            </button>
          </div>
        </div>
      </div>
      <div style={{ height: 22 }} />
    </PhoneFrame>
  );
}

Object.assign(window, {
  ScreenMobileHome, ScreenMobileRoom, ScreenMobileMembers, ScreenMobileImprove,
  PhoneFrame,
});
