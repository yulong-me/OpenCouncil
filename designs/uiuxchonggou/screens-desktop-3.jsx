// OpenCouncil — Improvement flow + Settings (Team / Provider / Skill)

// ============================================================
// 8. 改进反馈弹窗
// ============================================================
function ScreenImprovementFeedback() {
  return (
    <MacChrome title="opencouncil · 提个改进" w={1440} h={900}>
      <LeftRail activeId={1} />
      <main style={{ flex: 1, display: 'flex', minWidth: 0, position: 'relative' }}>
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <RoomHeader title="M3 芯片热管理 · 重构散热模型" team="软件开发 Team" version="v3" />
          <div style={{ flex: 1, padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: 16, opacity: 0.4 }}>
            <UserMsg to="主架构师" time="14:02" body="把 thermal_curve.py 重构成可注入的策略类…" />
            <AgentMsg
              agent={ocAgents[0]}
              time="14:02 · 输出"
              streamLabel="已结束"
              meta="↑2.1k ↓1.8k"
              body={<p style={{margin:0}}>方向 OK。我建议拆 3 层 …</p>}
            />
          </div>
          <Composer placeholder="…" />
        </section>
        <MemberPanel states={{ arch: 'done', chal: 'working', impl: 'idle', rev: 'idle' }} />
        {/* dim */}
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,15,8,0.18)' }} />
        {/* feedback dialog */}
        <div style={{
          position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
          width: 580, background: ocColor('card'),
          borderRadius: 14, border: `1px solid ${ocColor('line')}`,
          boxShadow: '0 30px 80px -10px rgba(20,15,8,0.35)', overflow: 'hidden',
        }}>
          <div style={{ padding: '20px 24px 12px', borderBottom: `1px solid ${ocColor('line')}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h2 style={{ fontFamily: '"Newsreader", serif', fontSize: 22, fontWeight: 500, margin: 0 }}>改进这支 Team</h2>
              <IconBtn ghost hint="关闭"><I d={ICONS.x} size={14} /></IconBtn>
            </div>
            <div style={{ fontSize: 12.5, color: ocColor('ink1'), marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>软件开发 Team</span>
              <Pill tone="soft" size="xs" mono>v3 → v4</Pill>
            </div>
          </div>

          {/* warning: 还有成员在执行 */}
          <div style={{
            margin: '14px 24px 0', padding: '10px 12px', borderRadius: 8,
            background: ocColor('workingSoft'), border: `1px solid ${hexFade('#c08a1f', 0.3)}`,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <span style={{ color: '#c08a1f', flexShrink: 0, marginTop: 2 }}><I d={ICONS.warn} size={14} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, color: '#7a5a16', fontWeight: 500 }}>当前还有 1 位成员在执行</div>
              <div style={{ fontSize: 11.5, color: '#8a6a26', marginTop: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Avatar name="挑战架构师" color="#6b6c2f" size={16} />
                <span>挑战架构师 · 输出中…</span>
              </div>
            </div>
          </div>

          <div style={{ padding: '16px 24px 0' }}>
            <div style={{ fontFamily: '"Newsreader", serif', fontSize: 16, color: ocColor('ink') }}>
              这支 Team <em>下次怎么做</em> 会更好？
            </div>
            <div style={{
              marginTop: 10, padding: 12, borderRadius: 8,
              background: ocColor('bg2'), border: `1px solid ${ocColor('line')}`,
              minHeight: 110, fontSize: 13.5, lineHeight: 1.55, color: ocColor('ink'),
            }}>
              下次先问清楚我的限制条件再开始给方案。这次主架构师直接给了三层方案，但我其实还没说明对回滚的要求；挑战架构师之后才意识到这个缺口。希望下次主架构师先 30 秒澄清 1-2 个边界，再开方案。
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: ocColor('ink2') }}>
              <span>系统会自动结合现场记录归纳出 Team 升级建议</span>
              <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>146 / 600</span>
            </div>
          </div>

          <div style={{
            padding: '14px 24px', borderTop: `1px solid ${ocColor('line')}`, marginTop: 16,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: ocColor('bg2'),
          }}>
            <button style={{ fontSize: 12, color: ocColor('ink1'), background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3, textDecorationColor: ocColor('ink3') }}>
              停止当前执行并生成改进
            </button>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn variant="ghost">取消</Btn>
              <Btn variant="accent" disabled>生成改进建议</Btn>
            </div>
          </div>
        </div>
      </main>
    </MacChrome>
  );
}

// ============================================================
// 9. 升级确认弹窗（按需求：弹窗式，更轻）
// ============================================================
function ScreenUpgradeConfirm() {
  return (
    <MacChrome title="opencouncil · 查看改进建议" w={1440} h={900}>
      <LeftRail activeId={1} />
      <main style={{ flex: 1, display: 'flex', minWidth: 0, position: 'relative' }}>
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <RoomHeader title="M3 芯片热管理 · 重构散热模型" team="软件开发 Team" version="v3" hasProposal />
          <div style={{ flex: 1, padding: 24, opacity: 0.3 }} />
          <Composer placeholder="…" />
        </section>
        <MemberPanel states={{ arch: 'done', chal: 'done', impl: 'done', rev: 'done' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(20,15,8,0.22)' }} />
        {/* dialog */}
        <div style={{
          position: 'absolute', top: 60, left: '50%', transform: 'translateX(-50%)',
          width: 880, background: ocColor('card'),
          borderRadius: 14, border: `1px solid ${ocColor('line')}`,
          boxShadow: '0 30px 80px -10px rgba(20,15,8,0.4)', overflow: 'hidden',
          maxHeight: 800, display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '18px 24px 12px', borderBottom: `1px solid ${ocColor('line')}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h2 style={{ fontFamily: '"Newsreader", serif', fontSize: 22, fontWeight: 500, margin: 0 }}>升级确认</h2>
                <Pill tone="accent" size="xs">软件开发 Team</Pill>
                <Pill tone="soft" size="xs" mono>v3 → v4</Pill>
              </div>
              <div style={{ fontSize: 12.5, color: ocColor('ink1'), marginTop: 6 }}>
                确认后，<b>新任务</b>会使用新版 Team；已有任务记录不受影响。
              </div>
            </div>
            <IconBtn ghost hint="保存并稍后处理"><I d={ICONS.x} size={14} /></IconBtn>
          </div>

          {/* progress bar */}
          <div style={{ padding: '12px 24px', borderBottom: `1px solid ${ocColor('lineSoft')}`, display: 'flex', alignItems: 'center', gap: 12, background: ocColor('bg2') }}>
            <span style={{ fontSize: 11.5, fontFamily: '"IBM Plex Mono", monospace', color: ocColor('ink2'), textTransform: 'uppercase', letterSpacing: '0.06em' }}>已处理 2 / 6</span>
            <div style={{ flex: 1, height: 6, borderRadius: 999, background: ocColor('cardSunk'), overflow: 'hidden' }}>
              <div style={{ width: '33%', height: '100%', background: ocColor('accent'), borderRadius: 999 }} />
            </div>
            <span style={{ fontSize: 11.5, color: ocColor('ink2') }}>已采纳 <b style={{color: ocColor('done')}}>2</b> · 不采纳 <b>0</b> · 待处理 <b>4</b></span>
          </div>

          <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
            {/* left: proposals list */}
            <div style={{ flex: 1, padding: '14px 18px', overflowY: 'hidden', borderRight: `1px solid ${ocColor('line')}` }}>
              <div style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: ocColor('ink2'), marginBottom: 10 }}>逐条处理</div>

              <ProposalCard
                index={1} type="成员提示词" status="adopted"
                title="主架构师在出方案前先做 30 秒澄清"
                rationale="本次任务里你没说回滚要求，主架构师直接给方案；后由挑战架构师补回滚。下一次先澄清边界可以减少返工。"
                before="主架构师 · 收到任务后直接出方案。"
                after="主架构师 · 收到任务后先复述目标 + 列 1-2 个待澄清的边界（限 30 秒），再出方案。"
                refs={3}
              />

              <ProposalCard
                index={2} type="路由策略" status="adopted"
                title="新增「先澄清，再分发」路由"
                rationale="任务开场如果用户没明确边界，应进入澄清子流程，避免直接召唤实现工程师。"
                before="主架构师 → 挑战架构师 → 实现工程师"
                after="（边界不全时）主架构师 → 你 → 主架构师 → 挑战架构师 → 实现工程师"
                refs={2}
              />

              <ProposalCard
                index={3} type="团队记忆" status="pending" current
                title="把「澄清前置」记入 Team 长期记忆"
                rationale="避免下次同类任务又靠现场逐案补救。这条会写进 Team 长期记忆，对所有新任务生效。"
                before="（无）"
                after="长期记忆 +1：用户更看重边界澄清，主架构师启动前必须确认 1-2 项约束。"
                refs={3}
              />

              <ProposalCard index={4} type="效果检查" status="pending" title="每次结束前由 Reviewer 校验目标-边界-交付物三项闭环" />
              <ProposalCard index={5} type="招募成员" status="pending" title="可选招募「需求澄清官」承接边界澄清环节" />
              <ProposalCard index={6} type="团队流程" status="pending" title="挑战架构师在质询时同时给一个最小回滚方案" />
            </div>

            {/* right: confirm console */}
            <aside style={{ width: 320, padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14, background: ocColor('bg2'), overflowY: 'hidden' }}>
              <div>
                <div style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: ocColor('ink2') }}>当前这一条</div>
                <div style={{ fontFamily: '"Newsreader", serif', fontSize: 16, fontWeight: 500, marginTop: 4, lineHeight: 1.35 }}>把「澄清前置」记入 Team 长期记忆</div>
                <div style={{ fontSize: 12, color: ocColor('ink1'), marginTop: 8, lineHeight: 1.55 }}>
                  这条会写入 Team 的 long-term memory，所有用此 Team 的新任务都会受影响。
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <Btn variant="primary" full icon={<I d={ICONS.check} size={12} />}>采纳这条建议</Btn>
                <Btn variant="default" full>不采纳</Btn>
              </div>

              <div style={{ height: 1, background: ocColor('line') }} />

              <div>
                <div style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: ocColor('ink2') }}>升级摘要</div>
                <div style={{ marginTop: 8, fontSize: 12.5, color: ocColor('ink1'), lineHeight: 1.6 }}>
                  当前版本：<span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>v3</span><br />
                  升级到：<span style={{ fontFamily: '"IBM Plex Mono", monospace', color: ocColor('accent'), fontWeight: 500 }}>v4</span><br />
                  生效范围：<b>新任务</b> · 旧记录不受影响<br />
                  你的原始意见：「下次先问清楚限制条件，再开始给方案」
                </div>
              </div>

              <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="ghost" size="sm" full>采纳剩余 4 条</Btn>
                <Btn variant="ghost" size="sm" full>不采纳剩余</Btn>
              </div>

              <div style={{ flex: 1 }} />

              <div style={{ display: 'flex', gap: 6 }}>
                <Btn variant="ghost" size="sm">放弃本次升级</Btn>
                <Btn variant="ghost" size="sm" icon={<I d={ICONS.reload} size={11} />}>重新生成</Btn>
              </div>
              <Btn variant="accent" size="md" full disabled suffix={<I d={ICONS.arrowRight} size={12} />}>
                确认升级 Team · 还需处理 4 条
              </Btn>
            </aside>
          </div>
        </div>
      </main>
    </MacChrome>
  );
}

const TYPE_TO_TONE = { '招募成员': '#3f5c70', '成员提示词': '#b25530', '团队流程': '#6b6c2f', '路由策略': '#7a3d6a', '团队记忆': '#c08a1f', '效果检查': '#5c7a3a' };

function ProposalCard({ index, type, status = 'pending', title, rationale = null, before = null, after = null, refs = 0, current = false }) {
  const statusUI = {
    adopted:  { tone: 'done', label: '已采纳', strike: false, dim: 0.55 },
    rejected: { tone: 'neutral', label: '不采纳', strike: true, dim: 0.45 },
    pending:  { tone: 'soft', label: '待处理', strike: false, dim: 1 },
  }[status];
  const accentColor = TYPE_TO_TONE[type] || '#b25530';
  return (
    <div style={{
      padding: '12px 14px', borderRadius: 9, marginBottom: 8,
      background: current ? ocColor('card') : 'transparent',
      border: current ? `1px solid ${accentColor}` : `1px solid ${ocColor('line')}`,
      borderLeft: `3px solid ${accentColor}`,
      opacity: statusUI.dim,
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono", monospace', color: ocColor('ink2'), letterSpacing: '0.04em' }}>建议 #{String(index).padStart(2, '0')}</span>
        <Pill size="xs" tone="neutral" style={{ borderColor: hexFade(accentColor, 0.4), color: accentColor, background: hexFade(accentColor, 0.08) }}>{type}</Pill>
        {refs > 0 && <Pill tone="soft" size="xs">参考 {refs} 处</Pill>}
        <span style={{ flex: 1 }} />
        <Pill tone={statusUI.tone} size="xs" icon={status === 'adopted' ? <I d={ICONS.check} size={9} /> : null}>{statusUI.label}</Pill>
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 500, color: ocColor('ink'), textDecoration: statusUI.strike ? 'line-through' : 'none', textDecorationColor: ocColor('ink3') }}>{title}</div>
      {rationale && current && (
        <>
          <div style={{ fontSize: 12, color: ocColor('ink1'), marginTop: 6, lineHeight: 1.55 }}>{rationale}</div>
          <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <BeforeAfter label="当前" body={before} dim />
            <BeforeAfter label="调整后" body={after} accent={accentColor} />
          </div>
        </>
      )}
    </div>
  );
}

function BeforeAfter({ label, body, dim = false, accent = null }) {
  return (
    <div style={{
      padding: '8px 10px', borderRadius: 6,
      background: dim ? ocColor('cardSunk') : hexFade(accent || '#b25530', 0.08),
      border: dim ? `1px solid ${ocColor('line')}` : `1px solid ${hexFade(accent || '#b25530', 0.3)}`,
    }}>
      <div style={{ fontSize: 10, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: dim ? ocColor('ink2') : accent }}>{label}</div>
      <div style={{ fontSize: 11.5, marginTop: 4, color: ocColor('ink1'), lineHeight: 1.5 }}>{body}</div>
    </div>
  );
}

// ============================================================
// 10-12. Settings — Team / Provider / Skill
// ============================================================
function SettingsChrome({ tab, children }) {
  return (
    <MacChrome title={`opencouncil · 设置 · ${tab}`} w={1440} h={900}>
      <LeftRail activeId={null} collapsed />
      <main style={{ flex: 1, display: 'flex', minWidth: 0 }}>
        {/* settings inner sidebar */}
        <aside style={{ width: 220, borderRight: `1px solid ${ocColor('line')}`, padding: '20px 14px', background: ocColor('bg2') }}>
          <div style={{ fontFamily: '"Newsreader", serif', fontSize: 22, fontWeight: 500, padding: '0 6px 14px' }}>设置</div>
          <SettingsNav label="Team" hint="成员、分工、规则" icon={<I d={ICONS.users} size={13} />} active={tab === 'Team'} />
          <SettingsNav label="Provider" hint="CLI 路径、测试" icon={<I d={ICONS.bolt} size={13} />} active={tab === 'Provider'} />
          <SettingsNav label="Skill" hint="可复用能力" icon={<I d={ICONS.layers} size={13} />} active={tab === 'Skill'} />
          <div style={{ height: 14 }} />
          <div style={{ padding: '10px 6px', fontSize: 11, color: ocColor('ink2'), lineHeight: 1.5 }}>
            关闭后回到 <span style={{ fontFamily: '"IBM Plex Mono", monospace' }}>/room/8c2f</span>
          </div>
        </aside>
        {children}
      </main>
    </MacChrome>
  );
}

function SettingsNav({ icon, label, hint, active }) {
  return (
    <button style={{
      width: '100%', padding: '8px 10px', borderRadius: 7, marginBottom: 2,
      background: active ? ocColor('card') : 'transparent',
      border: active ? `1px solid ${ocColor('line')}` : '1px solid transparent',
      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
      fontFamily: 'inherit', textAlign: 'left',
    }}>
      <span style={{ color: active ? ocColor('accent') : ocColor('ink1') }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: ocColor('ink') }}>{label}</div>
        <div style={{ fontSize: 11, color: ocColor('ink2'), marginTop: 1 }}>{hint}</div>
      </div>
      {active && <I d={ICONS.chevR} size={12} />}
    </button>
  );
}

function ScreenSettingsTeam() {
  return (
    <SettingsChrome tab="Team">
      {/* team list */}
      <aside style={{ width: 250, borderRight: `1px solid ${ocColor('line')}`, padding: '18px 12px', background: ocColor('bg') }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px 8px' }}>
          <span style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: ocColor('ink2') }}>Team · 5</span>
          <IconBtn ghost hint="新建" size={22}><I d={ICONS.plus} size={11} /></IconBtn>
        </div>
        {ocTeams.map((t, i) => (
          <button key={t.key} style={{
            width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 7, marginBottom: 2,
            background: i === 0 ? ocColor('card') : 'transparent',
            border: i === 0 ? `1px solid ${ocColor('line')}` : '1px solid transparent',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 13, fontWeight: i === 0 ? 500 : 400 }}>{t.name}</span>
              <Pill tone="soft" size="xs" mono>{t.version}</Pill>
            </div>
            <div style={{ fontSize: 11, color: ocColor('ink2'), marginTop: 3 }}>{t.members} 成员 · 上次更新 5 月 7 日</div>
          </button>
        ))}
      </aside>

      {/* main editor */}
      <section style={{ flex: 1, padding: '24px 32px', overflowY: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontFamily: '"Newsreader", serif', fontSize: 28, fontWeight: 500, margin: 0 }}>软件开发 Team</h2>
              <Pill tone="accent" size="xs" mono>v3</Pill>
              <span style={{ fontSize: 11, color: ocColor('ink2'), fontFamily: '"IBM Plex Mono", monospace' }}>4 成员 · max-A2A 2</span>
            </div>
            <div style={{ fontSize: 12.5, color: ocColor('ink1'), marginTop: 6 }}>架构改造、棘手 bug 排查、复盘、开发任务全流程。</div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <Btn size="sm" variant="default" icon={<I d={ICONS.copy} size={11} />}>克隆为新 Team</Btn>
            <Btn size="sm" variant="default" icon={<I d={ICONS.bolt} size={11} />}>把当前 Provider 应用到全员</Btn>
          </div>
        </div>

        {/* tabs */}
        <div style={{ display: 'flex', gap: 18, borderBottom: `1px solid ${ocColor('line')}`, marginTop: 18, fontSize: 13 }}>
          <SubTab active>成员（4）</SubTab>
          <SubTab>分工 & 规则</SubTab>
          <SubTab>长期记忆</SubTab>
          <SubTab>历史版本</SubTab>
        </div>

        {/* members list */}
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <MemberEditor active agent={ocAgents[0]} duty="抓主线、出三层架构方案" when="新需求开场 / 重大变更" tools="Claude Code" skills={['code-review', 'arch-decision']} />
          <MemberEditor agent={ocAgents[1]} duty="挑战方案、找潜在缺陷" when="主架构师出方案后" tools="OpenCode" skills={['critique', 'risk-scan']} />
          <MemberEditor agent={ocAgents[2]} duty="实现确认过的方案" when="方案达成一致后" tools="Codex CLI" skills={['code-write', 'cli-runner']} />
          <MemberEditor agent={ocAgents[3]} duty="质量门禁、最终把关" when="实现完成、上线前" tools="Claude Code" skills={['code-review', 'test-coverage']} />
        </div>
      </section>
    </SettingsChrome>
  );
}

function SubTab({ active = false, children }) {
  return (
    <button style={{
      padding: '8px 0', background: 'none', border: 'none',
      borderBottom: active ? `2px solid ${ocColor('accent')}` : '2px solid transparent',
      color: active ? ocColor('ink') : ocColor('ink2'),
      fontWeight: active ? 500 : 400, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
    }}>{children}</button>
  );
}

function MemberEditor({ active = false, agent, duty, when, tools, skills }) {
  return (
    <div style={{
      padding: '14px 16px', borderRadius: 10,
      background: active ? ocColor('card') : ocColor('bg2'),
      border: `1px solid ${active ? ocColor('line') : ocColor('lineSoft')}`,
      display: 'flex', gap: 14,
    }}>
      <Avatar name={agent.name} color={agent.color} size={38} ring />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{agent.name}</span>
          <I d={ICONS.edit} size={11} />
          <span style={{ fontSize: 11, color: ocColor('ink2') }}>{agent.role}</span>
        </div>
        <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 12 }}>
          <Field label="负责什么" value={duty} />
          <Field label="什么时候用它" value={when} />
        </div>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 14, fontSize: 12, color: ocColor('ink1') }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.06em', color: ocColor('ink2') }}>执行工具</span>
            <Pill tone="neutral" size="xs">{tools}</Pill>
          </span>
          <span style={{ width: 1, height: 14, background: ocColor('line') }} />
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.06em', color: ocColor('ink2') }}>Skill</span>
            {skills.map(s => <Pill key={s} tone="soft" size="xs">{s}</Pill>)}
            <button style={{ background: 'none', border: `1px dashed ${ocColor('line')}`, color: ocColor('ink2'), fontSize: 11, padding: '1px 6px', borderRadius: 4, cursor: 'pointer' }}>+ 添加</button>
          </span>
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        <button style={{ background: 'none', border: 'none', color: ocColor('ink2'), cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, padding: 0 }}>
          <I d={ICONS.edit} size={11} />详细工作说明
        </button>
        <button style={{ background: 'none', border: 'none', color: ocColor('error'), cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, padding: 0 }}>
          <I d={ICONS.trash} size={11} />移除
        </button>
      </div>
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.06em', color: ocColor('ink2') }}>{label}</div>
      <div style={{ fontSize: 12.5, color: ocColor('ink'), marginTop: 4, lineHeight: 1.5 }}>{value}</div>
    </div>
  );
}

function ScreenSettingsProvider() {
  return (
    <SettingsChrome tab="Provider">
      <aside style={{ width: 250, borderRight: `1px solid ${ocColor('line')}`, padding: '18px 12px', background: ocColor('bg') }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px 8px' }}>
          <span style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: ocColor('ink2') }}>Provider · 3</span>
          <IconBtn ghost hint="新建" size={22}><I d={ICONS.plus} size={11} /></IconBtn>
        </div>
        <ProviderListItem name="Claude Code" key_="claude-code" status="ready" active />
        <ProviderListItem name="OpenCode" key_="opencode" status="ready" />
        <ProviderListItem name="Codex CLI" key_="codex-cli" status="warn" />
      </aside>

      <section style={{ flex: 1, padding: '24px 32px', overflowY: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h2 style={{ fontFamily: '"Newsreader", serif', fontSize: 28, fontWeight: 500, margin: 0 }}>Claude Code</h2>
          <Pill tone="done" size="xs" icon={<I d={ICONS.check} size={9} />}>Ready</Pill>
          <span style={{ fontSize: 11, color: ocColor('ink2'), fontFamily: '"IBM Plex Mono", monospace' }}>claude-code</span>
        </div>
        <div style={{ fontSize: 12.5, color: ocColor('ink1'), marginTop: 6 }}>本地 CLI · Anthropic 模型 · 上次测试 5 分钟前</div>

        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <FormBlock label="CLI 路径">
            <CLIInput value="/usr/local/bin/claude" />
            <div style={{ fontSize: 10.5, fontFamily: '"IBM Plex Mono", monospace', color: ocColor('ink2'), marginTop: 6 }}>resolved · 0.4.18 · arm64-darwin</div>
          </FormBlock>
          <FormBlock label="Context Window">
            <CLIInput value="200,000 tokens" suffix={<span style={{ fontSize: 11, color: ocColor('ink2') }}>预设 · 可覆盖</span>} />
            <div style={{ fontSize: 10.5, color: ocColor('ink2'), marginTop: 6 }}>越大并发越受限。建议设为模型上限。</div>
          </FormBlock>
        </div>

        {/* test */}
        <div style={{ marginTop: 18, padding: 16, borderRadius: 10, background: ocColor('bg2'), border: `1px solid ${ocColor('line')}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: '"Newsreader", serif', fontSize: 16, fontWeight: 500 }}>连通性测试</span>
            <Btn size="sm" variant="default" icon={<I d={ICONS.play} size={10} />}>测试 Provider</Btn>
          </div>
          <div style={{ marginTop: 10, padding: 12, borderRadius: 7, background: ocColor('ink'), color: ocColor('card'), fontFamily: '"IBM Plex Mono", monospace', fontSize: 11.5, lineHeight: 1.7 }}>
            <div><span style={{ color: '#9bbf6e' }}>$</span> claude --version</div>
            <div style={{ color: '#c8c0ac' }}>0.4.18 (build 2026.05.07)</div>
            <div><span style={{ color: '#9bbf6e' }}>$</span> claude --probe</div>
            <div style={{ color: '#c8c0ac' }}>roundtrip · 312 ms · model: claude-opus-x</div>
            <div><span style={{ color: '#d27244' }}>OK ✓</span> ready for Team</div>
          </div>
        </div>

        {/* team architect provider */}
        <div style={{ marginTop: 16, padding: 16, borderRadius: 10, background: ocColor('card'), border: `1px solid ${ocColor('line')}` }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: '"Newsreader", serif', fontSize: 16, fontWeight: 500 }}>Team Architect Provider</span>
                <Pill tone="accent" size="xs">仅影响"生成 Team 方案"</Pill>
              </div>
              <div style={{ fontSize: 12, color: ocColor('ink1'), marginTop: 4 }}>选择哪个工具来生成新 Team 方案。已有 Team 成员的 Provider 不会被改动。</div>
            </div>
            <SelectField value={<><span style={{ fontWeight: 500 }}>Claude Code</span><Pill tone="done" size="xs">Ready</Pill></>} />
          </div>
        </div>
      </section>
    </SettingsChrome>
  );
}

function ProviderListItem({ name, key_, status, active = false }) {
  const cfg = { ready: { tone: 'done', label: 'Ready' }, warn: { tone: 'working', label: '待测试' }, error: { tone: 'error', label: 'CLI 未配置' } }[status];
  return (
    <button style={{
      width: '100%', textAlign: 'left', padding: '9px 10px', borderRadius: 7, marginBottom: 2,
      background: active ? ocColor('card') : 'transparent',
      border: active ? `1px solid ${ocColor('line')}` : '1px solid transparent',
      cursor: 'pointer', fontFamily: 'inherit',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, fontWeight: active ? 500 : 400 }}>{name}</span>
        <Pill tone={cfg.tone} size="xs">{cfg.label}</Pill>
      </div>
      <div style={{ fontSize: 10.5, color: ocColor('ink2'), marginTop: 3, fontFamily: '"IBM Plex Mono", monospace' }}>{key_}</div>
    </button>
  );
}

function FormBlock({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: ocColor('ink2'), marginBottom: 6 }}>{label}</div>
      {children}
    </div>
  );
}
function CLIInput({ value, suffix }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center',
      padding: '10px 12px', borderRadius: 8,
      background: ocColor('card'), border: `1px solid ${ocColor('line')}`,
      fontFamily: '"IBM Plex Mono", monospace', fontSize: 12.5,
    }}>
      <span style={{ flex: 1 }}>{value}</span>
      {suffix}
    </div>
  );
}

function ScreenSettingsSkill() {
  return (
    <SettingsChrome tab="Skill">
      <aside style={{ width: 250, borderRight: `1px solid ${ocColor('line')}`, padding: '18px 12px', background: ocColor('bg') }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px 8px' }}>
          <span style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: ocColor('ink2') }}>Managed · 6</span>
          <div style={{ display: 'flex', gap: 4 }}>
            <IconBtn ghost hint="导入文件夹" size={22}><I d={ICONS.folder} size={11} /></IconBtn>
            <IconBtn ghost hint="新建" size={22}><I d={ICONS.plus} size={11} /></IconBtn>
          </div>
        </div>
        <SkillListItem name="code-review" type="managed" enabled active />
        <SkillListItem name="cli-runner" type="managed" enabled />
        <SkillListItem name="critique" type="managed" enabled />
        <SkillListItem name="risk-scan" type="managed" enabled={false} />
        <SkillListItem name="test-coverage" type="managed" enabled />
        <SkillListItem name="arch-decision" type="managed" enabled />
        <div style={{ height: 12 }} />
        <div style={{ padding: '0 6px 6px', fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: ocColor('ink2') }}>Global · 12</div>
        <SkillListItem name="git-aware" type="global" />
        <SkillListItem name="search-web" type="global" />
        <SkillListItem name="diagram" type="global" />
      </aside>

      <section style={{ flex: 1, padding: '24px 32px', overflowY: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <h2 style={{ fontFamily: '"Newsreader", serif', fontSize: 28, fontWeight: 500, margin: 0 }}>code-review</h2>
          <Pill tone="accent" size="xs">managed</Pill>
          <Pill tone="done" size="xs">已启用</Pill>
        </div>
        <div style={{ fontSize: 12.5, color: ocColor('ink1'), marginTop: 6 }}>结构化代码审查 · 给出 must-fix / nit / question 三类标注</div>

        <div style={{ marginTop: 18 }}>
          <FormBlock label="描述">
            <textarea rows={2} defaultValue="对一段代码做严格 review：先指出可能引入 bug 的地方，再列出风格 nit，最后留下不确定的问题。" style={{
              width: '100%', padding: '10px 12px', borderRadius: 8,
              background: ocColor('card'), border: `1px solid ${ocColor('line')}`,
              fontFamily: 'inherit', fontSize: 13, lineHeight: 1.55, resize: 'vertical', color: ocColor('ink'),
            }} />
          </FormBlock>

          <div style={{ marginTop: 14 }}>
            <FormBlock label="SKILL.md">
              <div style={{
                background: ocColor('ink'), color: '#fbf6e9',
                borderRadius: 8, padding: '12px 14px',
                fontFamily: '"IBM Plex Mono", monospace', fontSize: 11.5, lineHeight: 1.7,
              }}>
                <div style={{ color: '#d27244' }}># code-review</div>
                <div style={{ color: '#c8c0ac' }}>category: review</div>
                <div style={{ color: '#c8c0ac' }}>triggers: ["review", "审视", "找问题"]</div>
                <div></div>
                <div style={{ color: '#9bbf6e' }}>## How to use</div>
                <div>1. 先读 diff，标记出新增/修改的逻辑边界。</div>
                <div>2. 按 must-fix / nit / question 三类列出问题。</div>
                <div>3. <span style={{ color: '#d6a23a' }}>重要：</span>不要把 nit 当 must-fix 来阻塞 PR。</div>
                <div>4. 末尾给出 1 句话裁决：approve / request-changes。</div>
                <div style={{ color: '#5a5447' }}>// ... 共 47 行</div>
              </div>
            </FormBlock>
          </div>

          <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
            <FormBlock label="启用状态">
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Toggle on />
                <span style={{ fontSize: 12.5 }}>已启用 · 4 个成员引用</span>
              </div>
            </FormBlock>
            <span style={{ width: 1, height: 32, background: ocColor('line'), alignSelf: 'flex-end', marginBottom: 6 }} />
            <FormBlock label="使用情况">
              <div style={{ fontSize: 12, color: ocColor('ink1') }}>过去 30 天 · <b>87 次</b> 调用 · 平均节省 12s/次</div>
            </FormBlock>
          </div>

          <div style={{ marginTop: 24, display: 'flex', justifyContent: 'space-between' }}>
            <Btn size="sm" variant="danger" icon={<I d={ICONS.trash} size={11} />}>删除 Skill</Btn>
            <div style={{ display: 'flex', gap: 8 }}>
              <Btn size="sm" variant="ghost">放弃修改</Btn>
              <Btn size="sm" variant="primary" icon={<I d={ICONS.check} size={11} />}>保存</Btn>
            </div>
          </div>
        </div>
      </section>
    </SettingsChrome>
  );
}

function SkillListItem({ name, type, enabled = true, active = false }) {
  return (
    <button style={{
      width: '100%', textAlign: 'left', padding: '7px 10px', borderRadius: 6, marginBottom: 1,
      background: active ? ocColor('card') : 'transparent',
      border: active ? `1px solid ${ocColor('line')}` : '1px solid transparent',
      cursor: 'pointer', fontFamily: 'inherit',
      display: 'flex', alignItems: 'center', gap: 8,
      opacity: enabled ? 1 : 0.55,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: enabled ? ocColor('done') : ocColor('ink3') }} />
      <span style={{ fontSize: 12.5, fontFamily: '"IBM Plex Mono", monospace', flex: 1 }}>{name}</span>
      {type === 'global' && <Pill tone="soft" size="xs">global</Pill>}
    </button>
  );
}
function Toggle({ on = false }) {
  return (
    <span style={{
      width: 30, height: 18, borderRadius: 999,
      background: on ? ocColor('accent') : ocColor('cardSunk'),
      border: `1px solid ${on ? ocColor('accent') : ocColor('line')}`,
      position: 'relative', display: 'inline-block', cursor: 'pointer',
    }}>
      <span style={{
        width: 14, height: 14, borderRadius: '50%', background: '#fff8ef',
        position: 'absolute', top: 1, left: on ? 14 : 1,
        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
      }} />
    </span>
  );
}

Object.assign(window, {
  ScreenImprovementFeedback, ScreenUpgradeConfirm,
  ScreenSettingsTeam, ScreenSettingsProvider, ScreenSettingsSkill,
});
