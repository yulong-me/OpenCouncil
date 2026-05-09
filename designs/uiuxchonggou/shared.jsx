// OpenCouncil — shared tokens, atoms, demo data, chrome
// Editorial paper-tone aesthetic. All exports go on window so other Babel files see them.

const ocTokens = {
  paper: {
    bg: '#f5f2ea',
    bg2: '#efeadc',
    card: '#faf7f0',
    cardSunk: '#ede7d6',
    rail: '#ece6d4',
    ink: '#1b1813',
    ink1: '#4a443b',
    ink2: '#8a8074',
    ink3: '#b9b1a0',
    line: '#d8d2c1',
    lineSoft: '#e6e0cf',
    accent: '#b25530',
    accentSoft: '#ecd6c6',
    accentInk: '#7a3617',
    working: '#c08a1f',
    workingSoft: '#f1e2b8',
    done: '#5c7a3a',
    doneSoft: '#dde4c5',
    error: '#a8442a',
    errorSoft: '#f1cfc1',
  },
  ink: {
    bg: '#15140f',
    bg2: '#1b1a14',
    card: '#1f1d16',
    cardSunk: '#181712',
    rail: '#1a1913',
    ink: '#f3ecdb',
    ink1: '#c8c0ac',
    ink2: '#8c8472',
    ink3: '#5a5447',
    line: '#2c2a21',
    lineSoft: '#23211a',
    accent: '#d27244',
    accentSoft: '#3a261a',
    accentInk: '#f0c9ab',
    working: '#d6a23a',
    workingSoft: '#3a2e15',
    done: '#92b063',
    doneSoft: '#26301a',
    error: '#d77258',
    errorSoft: '#3a2018',
  },
};

// Pull active theme tokens from CSS vars set on <body>
function ocColor(key) { return `var(--oc-${key})`; }

// ============================================================
// Atoms
// ============================================================

function Avatar({ name, color = '#b25530', size = 28, mono = false, ring = false, status = null }) {
  const initials = name ? name.slice(0, 1) : '?';
  const ringStyle = ring ? `0 0 0 2px ${ocColor('card')}, 0 0 0 ${size > 30 ? 3 : 2.5}px ${color}` : 'none';
  const dot = status ? (
    <span style={{
      position: 'absolute', right: -1, bottom: -1,
      width: size > 30 ? 9 : 7, height: size > 30 ? 9 : 7,
      borderRadius: '50%', background: status === 'working' ? ocColor('working') : status === 'done' ? ocColor('done') : ocColor('ink2'),
      boxShadow: `0 0 0 1.5px ${ocColor('card')}`,
    }} />
  ) : null;
  return (
    <span style={{
      position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: '50%',
      background: hexFade(color, 0.18),
      color: color,
      fontFamily: mono ? '"IBM Plex Mono", monospace' : '"Newsreader", serif',
      fontSize: size * 0.46, fontWeight: 500,
      letterSpacing: '0.02em',
      flexShrink: 0,
      boxShadow: ring ? ringStyle : 'none',
    }}>
      {initials}
      {dot}
    </span>
  );
}

function hexFade(hex, alpha) {
  // simple #rrggbb -> rgba
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function Pill({ children, tone = 'neutral', size = 'sm', icon = null, mono = false, style = {} }) {
  const tones = {
    neutral: { bg: ocColor('cardSunk'), fg: ocColor('ink1'), bd: ocColor('line') },
    soft:    { bg: 'transparent',       fg: ocColor('ink2'), bd: ocColor('line') },
    accent:  { bg: ocColor('accentSoft'), fg: ocColor('accentInk'), bd: 'transparent' },
    working: { bg: ocColor('workingSoft'), fg: '#7a5a16', bd: 'transparent' },
    done:    { bg: ocColor('doneSoft'), fg: '#3e5527', bd: 'transparent' },
    error:   { bg: ocColor('errorSoft'), fg: ocColor('error'), bd: 'transparent' },
    ink:     { bg: ocColor('ink'), fg: ocColor('card'), bd: ocColor('ink') },
  };
  const t = tones[tone] || tones.neutral;
  const sz = size === 'lg' ? { px: 12, py: 5, fs: 13 } : size === 'xs' ? { px: 6, py: 1, fs: 10.5 } : { px: 8, py: 3, fs: 11.5 };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: `${sz.py}px ${sz.px}px`, borderRadius: 999,
      background: t.bg, color: t.fg,
      border: `1px solid ${t.bd}`,
      fontSize: sz.fs, fontWeight: 500,
      fontFamily: mono ? '"IBM Plex Mono", monospace' : 'inherit',
      letterSpacing: mono ? '0' : '0.005em',
      lineHeight: 1, whiteSpace: 'nowrap',
      ...style,
    }}>
      {icon}
      {children}
    </span>
  );
}

function StatusDot({ tone = 'working', label = null, size = 6 }) {
  const map = { working: ocColor('working'), done: ocColor('done'), error: ocColor('error'), idle: ocColor('ink3') };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: ocColor('ink2'), fontSize: 11.5 }}>
      <span style={{
        width: size, height: size, borderRadius: '50%', background: map[tone] || map.idle,
        boxShadow: tone === 'working' ? `0 0 0 3px ${hexFade('#c08a1f', 0.18)}` : 'none',
        animation: tone === 'working' ? 'oc-pulse 1.6s ease-in-out infinite' : 'none',
      }} />
      {label}
    </span>
  );
}

function IconBtn({ children, ghost = false, hint = null, active = false, size = 28 }) {
  return (
    <button title={hint} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: size, height: size, borderRadius: 7, padding: 0,
      background: active ? ocColor('cardSunk') : ghost ? 'transparent' : ocColor('card'),
      color: ocColor('ink1'),
      border: ghost ? '1px solid transparent' : `1px solid ${ocColor('line')}`,
      cursor: 'pointer',
    }}>
      {children}
    </button>
  );
}

function Btn({ children, variant = 'default', size = 'md', icon = null, suffix = null, disabled = false, full = false, style = {} }) {
  const v = {
    default: { bg: ocColor('card'), fg: ocColor('ink'), bd: ocColor('line') },
    primary: { bg: ocColor('ink'), fg: ocColor('card'), bd: ocColor('ink') },
    accent:  { bg: ocColor('accent'), fg: '#fff8ef', bd: ocColor('accent') },
    ghost:   { bg: 'transparent', fg: ocColor('ink1'), bd: 'transparent' },
    soft:    { bg: ocColor('cardSunk'), fg: ocColor('ink'), bd: 'transparent' },
    danger:  { bg: 'transparent', fg: ocColor('error'), bd: ocColor('line') },
  }[variant];
  const sz = { sm: { px: 10, py: 5, fs: 12 }, md: { px: 14, py: 8, fs: 13 }, lg: { px: 18, py: 11, fs: 14 } }[size];
  return (
    <button disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      padding: `${sz.py}px ${sz.px}px`, borderRadius: 8,
      background: v.bg, color: v.fg, border: `1px solid ${v.bd}`,
      fontSize: sz.fs, fontWeight: 500, fontFamily: 'inherit',
      letterSpacing: '0.005em',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.45 : 1,
      width: full ? '100%' : 'auto',
      ...style,
    }}>
      {icon}{children}{suffix}
    </button>
  );
}

// inline icons — minimal stroke set
function I({ d, size = 14, sw = 1.6 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
const ICONS = {
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM21 21l-4.35-4.35',
  plus: 'M12 5v14M5 12h14',
  arrowRight: 'M5 12h14M13 6l6 6-6 6',
  arrowLeft: 'M19 12H5M11 6l-6 6 6 6',
  send: 'M3 11l18-8-8 18-2-8-8-2z',
  send2: 'M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z',
  mention: 'M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0zM16 12v1.5a2.5 2.5 0 0 0 5 0V12a9 9 0 1 0-3.5 7.1',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  menu: 'M4 6h16M4 12h16M4 18h16',
  x: 'M6 6l12 12M18 6L6 18',
  check: 'M5 12l5 5L20 7',
  chevR: 'M9 6l6 6-6 6',
  chevD: 'M6 9l6 6 6-6',
  chevU: 'M6 15l6-6 6 6',
  cmd: 'M9 6a3 3 0 1 0-3 3h12a3 3 0 1 0-3-3v12a3 3 0 1 0 3-3H6a3 3 0 1 0 3 3V6z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  cog: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1.04H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h0a1.7 1.7 0 0 0 1.04-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v0a1.7 1.7 0 0 0 1.55 1.04H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1.04z',
  trash: 'M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6',
  spark: 'M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1',
  wand: 'M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M15.2 6.2 14 5M15.2 11.8 14 13M17.8 6.2 19 5M3 21l9-9',
  bolt: 'M13 2 3 14h9l-1 8 10-12h-9l1-8z',
  folder: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z',
  file: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM14 2v6h6',
  layers: 'M12 2 2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  panel: 'M3 5h18v14H3zM9 5v14',
  reload: 'M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5',
  copy: 'M8 4h10a2 2 0 0 1 2 2v10M16 8H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2z',
  stop: 'M6 6h12v12H6z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  play: 'M5 3l14 9-14 9V3z',
  edit: 'M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z',
  flag: 'M4 22V4M4 4h12l-2 4 2 4H4',
  arch: 'M3 21V8l9-6 9 6v13M9 21v-7h6v7',
  shield: 'M12 2 4 5v7a10 10 0 0 0 8 10 10 10 0 0 0 8-10V5l-8-3z',
  hammer: 'M14 7l-7 7 4 4 7-7M14 7l4-4 4 4-4 4M9 18l-5 5',
  eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7zM12 9a3 3 0 1 1 0 6 3 3 0 0 1 0-6z',
  brain: 'M9 3a3 3 0 0 0-3 3v0a3 3 0 0 0-3 3v3a3 3 0 0 0 3 3v0a3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3zM15 3a3 3 0 0 1 3 3v0a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3v0a3 3 0 0 1-3 3 3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z',
  pin: 'M12 22s-8-7.58-8-13a8 8 0 1 1 16 0c0 5.42-8 13-8 13zM12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  inbox: 'M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z',
  bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0',
  doc: 'M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM14 3v5h5M9 13h6M9 17h4',
  sliders: 'M21 4H14M10 4H3M21 12h-9M8 12H3M21 20h-7M10 20H3M14 2v4M8 10v4M14 18v4',
  warn: 'M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01',
  tree: 'M6 3v18M6 9h6a3 3 0 0 1 3 3v9M6 15h6',
  hash: 'M4 9h16M4 15h16M10 3 8 21M16 3l-2 18',
};

// ============================================================
// Demo data — 软件开发 Team
// ============================================================

const ocAgents = [
  { key: 'arch', name: '主架构师', role: '出方案 · 抓主线', color: '#b25530', tool: 'Claude Code' },
  { key: 'chal', name: '挑战架构师', role: '找茬 · 收敛风险', color: '#6b6c2f', tool: 'OpenCode' },
  { key: 'impl', name: '实现工程师', role: '动手实现 · 落地', color: '#3f5c70', tool: 'Codex CLI' },
  { key: 'rev',  name: 'Reviewer',    role: '质量门禁 · 审视', color: '#7a3d6a', tool: 'Claude Code' },
];

const ocRooms = [
  { id: 1, title: 'M3 芯片热管理 · 重构散热模型', team: '软件开发 Team · v3', status: 'working', time: '刚刚', preview: '@实现工程师 已开始改 thermal_curve.py 中的拐点计算…', members: 4, active: true },
  { id: 2, title: '把 invoice 流程拆出独立服务', team: '软件开发 Team · v2', status: 'working', time: '12 分钟前', preview: '@挑战架构师 在质询第 3 步的回滚策略', members: 4 },
  { id: 3, title: '上线前那次复盘 · 抓 P0', team: '软件开发 Team · v3', status: 'idle', time: '今天 10:14', preview: '已暂停，等待你的反馈', members: 4 },
  { id: 4, title: 'webhook 重试逻辑收口', team: '软件开发 Team · v2', status: 'idle', time: '昨天', preview: '@Reviewer 提出 4 处修改建议', members: 4 },
  { id: 5, title: '搜索改版 A/B 实验设计', team: '软件开发 Team · v2', status: 'idle', time: '5 月 6 日', preview: '@主架构师 给出三种切分方式', members: 4 },
];

const ocArchive = [
  { id: 91, title: 'OAuth 回调超时排查', team: '软件开发 Team · v2', status: 'done', time: '5 月 5 日', preview: '已交付：在 gateway 增加 5s 退避重试。', members: 4 },
  { id: 92, title: '把日志切到 OTLP', team: '软件开发 Team · v1', status: 'done', time: '4 月 28 日', preview: '已交付：补充 collector 配置示例 3 处。', members: 4 },
];

const ocTeams = [
  { key: 'sw', name: '软件开发 Team', version: 'v3', members: 4, summary: '适合：架构改造、棘手 bug 排查、复盘抓 P0、开发任务全流程。', tool: 'Claude Code · OpenCode · Codex CLI' },
  { key: 'lit', name: '论文返修 Team', version: 'v2', members: 5, summary: '适合：审稿意见拆解、改稿、对照实验补全、回应信草拟。', tool: 'Claude Code' },
  { key: 'mkt', name: '竞品分析 Team', version: 'v4', members: 6, summary: '适合：定位、价格带、卖点抽取、对比表生成、汇报材料。', tool: 'Claude Code · OpenCode' },
  { key: 'law', name: '诉讼策略 Team', version: 'v2', members: 5, summary: '适合：案由拆解、证据链构建、抗辩思路、起诉/答辩状骨架。', tool: 'Claude Code' },
  { key: 'rt',  name: '圆桌讨论 Team', version: 'v1', members: 6, summary: '适合：开放议题深度讨论、多视角碰撞、共识收敛。', tool: 'OpenCode' },
];

// ============================================================
// Page-level chrome — desktop window + sidebar layouts
// ============================================================

function MacChrome({ title = 'opencouncil', children, w = 1440, h = 900 }) {
  return (
    <div style={{
      width: w, height: h, background: ocColor('bg'),
      borderRadius: 14, overflow: 'hidden',
      boxShadow: '0 1px 0 rgba(0,0,0,0.04), 0 30px 60px -30px rgba(20,15,8,0.18)',
      border: `1px solid ${ocColor('line')}`,
      display: 'flex', flexDirection: 'column',
      fontFamily: '"IBM Plex Sans", system-ui, sans-serif',
      color: ocColor('ink'),
      position: 'relative',
    }}>
      <div style={{
        height: 32, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 6,
        borderBottom: `1px solid ${ocColor('line')}`, background: ocColor('bg2'),
      }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#dcc6a8', border: `1px solid ${ocColor('line')}` }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#dccba8', border: `1px solid ${ocColor('line')}` }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#cdd6b6', border: `1px solid ${ocColor('line')}` }} />
        <div style={{ flex: 1, textAlign: 'center', fontSize: 11.5, color: ocColor('ink2'), fontFamily: '"IBM Plex Mono", monospace', letterSpacing: '0.04em' }}>{title}</div>
        <span style={{ width: 11 }} />
      </div>
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>{children}</div>
    </div>
  );
}

function LeftRail({ activeId = null, collapsed = false }) {
  if (collapsed) {
    return (
      <aside style={{ width: 56, background: ocColor('bg2'), borderRight: `1px solid ${ocColor('line')}`, padding: '14px 8px', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
        <BrandMark mini />
        <div style={{ height: 12 }} />
        <IconBtn hint="搜索"><I d={ICONS.search} /></IconBtn>
        <IconBtn hint="发起任务"><I d={ICONS.plus} /></IconBtn>
        <div style={{ flex: 1 }} />
        <IconBtn hint="设置"><I d={ICONS.cog} /></IconBtn>
      </aside>
    );
  }
  return (
    <aside style={{
      width: 280, background: ocColor('bg2'), borderRight: `1px solid ${ocColor('line')}`,
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ padding: '16px 16px 10px' }}>
        <BrandMark />
      </div>
      <div style={{ padding: '4px 12px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        <button style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px', borderRadius: 8,
          background: ocColor('card'), border: `1px solid ${ocColor('line')}`,
          color: ocColor('ink2'), fontSize: 12.5, fontFamily: 'inherit', cursor: 'text',
          textAlign: 'left',
        }}>
          <I d={ICONS.search} size={13} />
          <span style={{ flex: 1 }}>搜索任务记录、消息或操作</span>
          <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10.5, padding: '1px 5px', borderRadius: 4, background: ocColor('cardSunk'), color: ocColor('ink2') }}>⌘K</span>
        </button>
        <button style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
          padding: '8px 10px', borderRadius: 8,
          background: 'transparent', border: `1px dashed ${ocColor('line')}`,
          color: ocColor('ink1'), fontSize: 12.5, fontFamily: 'inherit', cursor: 'pointer',
          textAlign: 'left',
        }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><I d={ICONS.plus} size={13} /> 发起任务</span>
          <span style={{ color: ocColor('ink2'), fontSize: 11 }}>选 Team · 进入现场</span>
        </button>
      </div>
      <div style={{ padding: '8px 18px 4px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: ocColor('ink2') }}>任务记录</span>
        <span style={{ fontSize: 11, color: ocColor('ink2') }}>{ocRooms.filter(r => r.status === 'working' || r.status === 'idle').length} 进行中 · {ocArchive.length} 已归档</span>
      </div>
      <div style={{ flex: 1, overflowY: 'hidden', padding: '4px 8px 8px' }}>
        {ocRooms.map(r => <RoomItem key={r.id} room={r} active={activeId === r.id} />)}
        <div style={{ padding: '14px 10px 6px', fontSize: 11, fontFamily: '"IBM Plex Mono", monospace', textTransform: 'uppercase', letterSpacing: '0.08em', color: ocColor('ink2') }}>已归档</div>
        {ocArchive.map(r => <RoomItem key={r.id} room={r} dim />)}
      </div>
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${ocColor('line')}`, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar name="Y" color="#5c7a3a" size={26} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 500 }}>You</div>
          <div style={{ fontSize: 11, color: ocColor('ink2') }}>本地工作区 · ~/work</div>
        </div>
        <IconBtn hint="设置" size={26}><I d={ICONS.cog} size={13} /></IconBtn>
      </div>
    </aside>
  );
}

function BrandMark({ mini = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <div style={{
        width: 26, height: 26, borderRadius: 7, background: ocColor('ink'),
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={ocColor('card')} strokeWidth="2.4" strokeLinecap="round">
          <circle cx="6" cy="6" r="2.2" />
          <circle cx="18" cy="6" r="2.2" />
          <circle cx="12" cy="18" r="2.2" />
          <path d="M6 8.5 11 16M18 8.5 13 16M8 6h8" />
        </svg>
      </div>
      {!mini && (
        <div>
          <div style={{ fontFamily: '"Newsreader", serif', fontSize: 17, fontWeight: 500, lineHeight: 1, letterSpacing: '-0.005em' }}>OpenCouncil</div>
          <div style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 9.5, color: ocColor('ink2'), letterSpacing: '0.16em', marginTop: 2 }}>OPEN · TEAM · COUNCIL</div>
        </div>
      )}
    </div>
  );
}

function RoomItem({ room, active = false, dim = false }) {
  const tone = room.status === 'working' ? 'working' : room.status === 'done' ? 'done' : 'idle';
  return (
    <div style={{
      padding: '9px 10px', borderRadius: 8, marginBottom: 2,
      background: active ? ocColor('card') : 'transparent',
      border: active ? `1px solid ${ocColor('line')}` : '1px solid transparent',
      cursor: 'pointer', position: 'relative',
      opacity: dim ? 0.65 : 1,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 4, height: 4, borderRadius: '50%', background: tone === 'working' ? ocColor('working') : tone === 'done' ? ocColor('done') : ocColor('ink3') }} />
        <span style={{ fontSize: 12.8, fontWeight: active ? 500 : 450, color: ocColor('ink'), flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.title}</span>
        <span style={{ fontSize: 10.5, color: ocColor('ink2'), fontFamily: '"IBM Plex Mono", monospace' }}>{room.time}</span>
      </div>
      <div style={{ marginTop: 4, marginLeft: 12, fontSize: 11.5, color: ocColor('ink2'), display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontFamily: '"IBM Plex Mono", monospace', fontSize: 10.5 }}>{room.team.split(' · ')[1] || ''}</span>
        <span style={{ width: 2, height: 2, borderRadius: '50%', background: ocColor('ink3') }} />
        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.preview}</span>
      </div>
    </div>
  );
}

// global keyframes via <style>
const ocGlobalCSS = `
  @import url('https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
  body[data-oc-theme="paper"] {
    --oc-bg: ${ocTokens.paper.bg}; --oc-bg2: ${ocTokens.paper.bg2};
    --oc-card: ${ocTokens.paper.card}; --oc-cardSunk: ${ocTokens.paper.cardSunk};
    --oc-rail: ${ocTokens.paper.rail};
    --oc-ink: ${ocTokens.paper.ink}; --oc-ink1: ${ocTokens.paper.ink1};
    --oc-ink2: ${ocTokens.paper.ink2}; --oc-ink3: ${ocTokens.paper.ink3};
    --oc-line: ${ocTokens.paper.line}; --oc-lineSoft: ${ocTokens.paper.lineSoft};
    --oc-accent: ${ocTokens.paper.accent}; --oc-accentSoft: ${ocTokens.paper.accentSoft};
    --oc-accentInk: ${ocTokens.paper.accentInk};
    --oc-working: ${ocTokens.paper.working}; --oc-workingSoft: ${ocTokens.paper.workingSoft};
    --oc-done: ${ocTokens.paper.done}; --oc-doneSoft: ${ocTokens.paper.doneSoft};
    --oc-error: ${ocTokens.paper.error}; --oc-errorSoft: ${ocTokens.paper.errorSoft};
  }
  body[data-oc-theme="ink"] {
    --oc-bg: ${ocTokens.ink.bg}; --oc-bg2: ${ocTokens.ink.bg2};
    --oc-card: ${ocTokens.ink.card}; --oc-cardSunk: ${ocTokens.ink.cardSunk};
    --oc-rail: ${ocTokens.ink.rail};
    --oc-ink: ${ocTokens.ink.ink}; --oc-ink1: ${ocTokens.ink.ink1};
    --oc-ink2: ${ocTokens.ink.ink2}; --oc-ink3: ${ocTokens.ink.ink3};
    --oc-line: ${ocTokens.ink.line}; --oc-lineSoft: ${ocTokens.ink.lineSoft};
    --oc-accent: ${ocTokens.ink.accent}; --oc-accentSoft: ${ocTokens.ink.accentSoft};
    --oc-accentInk: ${ocTokens.ink.accentInk};
    --oc-working: ${ocTokens.ink.working}; --oc-workingSoft: ${ocTokens.ink.workingSoft};
    --oc-done: ${ocTokens.ink.done}; --oc-doneSoft: ${ocTokens.ink.doneSoft};
    --oc-error: ${ocTokens.ink.error}; --oc-errorSoft: ${ocTokens.ink.errorSoft};
  }
  @keyframes oc-pulse {
    0%, 100% { box-shadow: 0 0 0 3px rgba(192,138,31,0.18); }
    50% { box-shadow: 0 0 0 6px rgba(192,138,31,0.05); }
  }
  * { box-sizing: border-box; }
  button { font-family: inherit; }
`;

Object.assign(window, {
  ocTokens, ocColor, ocAgents, ocRooms, ocArchive, ocTeams,
  Avatar, Pill, StatusDot, IconBtn, Btn, I, ICONS, hexFade,
  MacChrome, LeftRail, BrandMark, RoomItem, ocGlobalCSS,
});
