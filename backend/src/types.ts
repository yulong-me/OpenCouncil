export type DiscussionState = 'INIT' | 'RESEARCH' | 'DEBATE' | 'CONVERGING' | 'DONE';
export type AgentRole = 'HOST' | 'AGENT';
export type MessageType = 'system' | 'statement' | 'question' | 'rebuttal' | 'summary' | 'report';

export interface Agent {
  id: string;
  role: AgentRole;
  /** Agent persona name, e.g. "司马迁", "马斯克", "主持人" */
  name: string;
  /** Domain label for persona lookup */
  domainLabel: string;
  status: 'idle' | 'thinking' | 'waiting' | 'done';
}

export interface Message {
  id: string;
  agentRole: AgentRole | 'USER';
  agentName: string;
  content: string;
  timestamp: number;
  type: MessageType;
}

export interface DiscussionRoom {
  id: string;
  topic: string;
  state: DiscussionState;
  agents: Agent[];
  messages: Message[];
  report?: string;
  createdAt: number;
  updatedAt: number;
}
