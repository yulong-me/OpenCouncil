// OpenCouncil — main canvas mount

const { useEffect } = React;

// Inject global theme CSS (defined in shared.jsx as ocGlobalCSS)
if (typeof document !== 'undefined' && !document.getElementById('oc-globals') && typeof ocGlobalCSS === 'string') {
  const s = document.createElement('style');
  s.id = 'oc-globals';
  s.textContent = ocGlobalCSS;
  document.head.appendChild(s);
}

function App() {
  const [t, setTweak] = useTweaks(/*EDITMODE-BEGIN*/{
    "theme": "paper",
    "accent": "#b25530",
    "density": "comfortable"
  }/*EDITMODE-END*/);

  useEffect(() => {
    document.body.setAttribute('data-oc-theme', t.theme);
    document.documentElement.style.setProperty('--oc-accent', t.accent);
  }, [t.theme, t.accent]);

  return (
    <>
      <DesignCanvas
        intro={
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, fontFamily: '"Newsreader", serif', fontSize: 18, fontWeight: 500 }}>OpenCouncil · 主线原型</div>
            <div style={{ fontSize: 12.5, color: 'rgba(60,50,40,0.75)', lineHeight: 1.55 }}>
              基于你的产品规格做的高保真静态设计。三组画板：
              <b>桌面 · 主线</b>（首页 → 发起任务 → 协作 → 结束 → 改进），
              <b>桌面 · 设置</b>（Team / Provider / Skill），
              <b>移动端</b>（折叠版主流程）。
              用工具栏 <b>Tweaks</b> 切换 <i>纸 / 墨</i> 两套主题、强调色与密度。
              点任意画板进入沉浸视图，或拖动表头重新排序。
            </div>
          </div>
        }
      >
        <DCSection id="desktop-mainline" title="桌面 · 主线" subtitle="任务 → Team → 现场 → 记录 → 改进">
          <DCArtboard id="home" label="① 首页 · 空态启动区" width={1440} height={900}><ScreenHome /></DCArtboard>
          <DCArtboard id="cmdk" label="② 命令面板 · ⌘K" width={1440} height={900}><ScreenCommandPalette /></DCArtboard>
          <DCArtboard id="create-existing" label="③ 发起任务 · 选择已有 Team" width={1440} height={900}><ScreenCreateTaskExisting /></DCArtboard>
          <DCArtboard id="create-generate" label="④ 发起任务 · 生成新 Team" width={1440} height={900}><ScreenCreateTaskGenerate /></DCArtboard>
          <DCArtboard id="room-empty" label="⑤ 协作现场 · 空消息态" width={1440} height={900}><ScreenRoomEmpty /></DCArtboard>
          <DCArtboard id="room-active" label="⑥ 协作现场 · 进行中（A2A 接力）" width={1440} height={1180}><ScreenRoomActive /></DCArtboard>
          <DCArtboard id="room-done" label="⑦ 协作现场 · 任务结束态" width={1440} height={900}><ScreenRoomDone /></DCArtboard>
          <DCArtboard id="improve-feedback" label="⑧ 改进 · 反馈弹窗" width={1440} height={900}><ScreenImprovementFeedback /></DCArtboard>
          <DCArtboard id="improve-confirm" label="⑨ 改进 · 升级确认（轻弹窗式）" width={1440} height={900}><ScreenUpgradeConfirm /></DCArtboard>
        </DCSection>

        <DCSection id="desktop-settings" title="桌面 · 设置" subtitle="复用 SettingsModal 的路由形式 · 三个 Tab">
          <DCArtboard id="settings-team" label="⑩ 设置 · Team" width={1440} height={900}><ScreenSettingsTeam /></DCArtboard>
          <DCArtboard id="settings-provider" label="⑪ 设置 · Provider" width={1440} height={900}><ScreenSettingsProvider /></DCArtboard>
          <DCArtboard id="settings-skill" label="⑫ 设置 · Skill" width={1440} height={900}><ScreenSettingsSkill /></DCArtboard>
        </DCSection>

        <DCSection id="mobile" title="移动端" subtitle="折叠版主线 · 375 视宽">
          <DCArtboard id="m-home" label="① 移动 · 首页" width={380} height={800}><ScreenMobileHome /></DCArtboard>
          <DCArtboard id="m-room" label="② 移动 · 协作现场" width={380} height={800}><ScreenMobileRoom /></DCArtboard>
          <DCArtboard id="m-members" label="③ 移动 · 成员抽屉" width={380} height={800}><ScreenMobileMembers /></DCArtboard>
          <DCArtboard id="m-improve" label="④ 移动 · 改进 Bottom Sheet" width={380} height={800}><ScreenMobileImprove /></DCArtboard>
        </DCSection>
      </DesignCanvas>

      <TweaksPanel title="Tweaks">
        <TweakSection title="主题">
          <TweakRadio
            value={t.theme}
            onChange={(v) => setTweak('theme', v)}
            options={[
              { value: 'paper', label: '纸本' },
              { value: 'ink', label: '墨夜' },
            ]}
          />
        </TweakSection>
        <TweakSection title="强调色">
          <TweakColor
            value={t.accent}
            onChange={(v) => setTweak('accent', v)}
            options={['#b25530', '#7a5a16', '#3f5c70', '#5c7a3a', '#7a3d6a']}
          />
        </TweakSection>
        <TweakSection title="UX 备注">
          <div style={{ fontSize: 11.5, color: 'rgba(60,50,40,0.75)', lineHeight: 1.55 }}>
            原系统 UX 已在以下位置加强：
            <ul style={{ margin: '6px 0 0 16px', padding: 0 }}>
              <li>首页给出明确的开场建议文案，避免空白焦虑</li>
              <li>消息接力用细线轨道 + 「由 @X 召唤」pill 显示</li>
              <li>结束态用专卡替代输入框，下一步动作更聚焦</li>
              <li>升级确认改为轻弹窗 + 进度条 + 当前条聚焦面板</li>
              <li>命令面板支持搜索结果中的术语高亮 + 操作 / 任务 / 消息分组</li>
            </ul>
          </div>
        </TweakSection>
      </TweaksPanel>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
