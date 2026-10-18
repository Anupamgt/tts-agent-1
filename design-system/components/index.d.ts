import type * as React from 'react';

/** 'hi' switches a component's text to the Hindi type styles (hi-body, hi-label ...) and sets lang="hi". */
export type Lang = 'en' | 'hi';
export type GlyphName = 'check' | 'clock' | 'alert' | 'up' | 'phone' | 'dot' | 'pause' | 'arrow';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** secondary is the default. One primary per view; danger only for destructive steps (cancel a booking, refund). */
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  /** lg = 48px tall, for phones and the doctor view. */
  size?: 'md' | 'lg';
  icon?: GlyphName;
  lang?: Lang;
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): React.ReactElement;

export interface CallNextButtonProps {
  /** Name of the next patient in the queue. Empty = nobody waiting (the button is disabled). */
  nextName?: string;
  /** e.g. "482 915 6 · arrived 5:42 pm · priority" */
  nextMeta?: string;
  nextLabel?: string;
  label?: string;
  emptyText?: string;
  /** e.g. "Last called 5:51 pm by Dr Kaur" */
  footer?: string;
  disabled?: boolean;
  onClick?: () => void;
  lang?: Lang;
}
export declare function CallNextButton(props: CallNextButtonProps): React.ReactElement;

export interface DeskSwitchProps {
  /** true = a person is at the desk, so the agent may transfer calls. */
  on: boolean;
  onChange?: (on: boolean) => void;
  label?: string;
  onText?: string;
  offText?: string;
  lang?: Lang;
}
export declare function DeskSwitch(props: DeskSwitchProps): React.ReactElement;

export type Tone = 'neutral' | 'info' | 'ok' | 'attention' | 'emergency' | 'priority' | 'held';
export interface StatusBadgeProps {
  tone?: Tone;
  /** Defaults per tone: ok check, attention and emergency alert, priority up, info dot, held clock. null hides it. */
  icon?: GlyphName | null;
  lang?: Lang;
  className?: string;
  children?: React.ReactNode;
}
export declare function StatusBadge(props: StatusBadgeProps): React.ReactElement;

export interface PriorityMarkProps {
  /** P1 = !!! (emergency fill), P2 = !! (attention fill), P3 = ! (neutral). */
  level: 'P1' | 'P2' | 'P3';
  /** A P1 that is acknowledged and not overdue: emergency text on emergency-soft instead of the solid red fill. */
  quiet?: boolean;
}
export declare function PriorityMark(props: PriorityMarkProps): React.ReactElement;

export interface DoctorChipProps {
  name: string;
  /** Minutes behind the window plan. */
  delayMin?: number;
  /** live = from next-patient taps; schedule = no taps yet, estimate from the plan only. */
  basis?: 'live' | 'schedule';
  /** The session status vocabulary. 'running' is accepted as an alias of 'started'. Default 'started'. */
  status?: 'planned' | 'started' | 'paused' | 'ended' | 'cancelled';
  /** Shown when status is planned, e.g. "5:00 pm". */
  startsAt?: string;
  /** Minutes late at which the chip turns to the attention fill. Clinic setting, default 20. */
  threshold?: number;
  title?: string;
}
export declare function DoctorChip(props: DoctorChipProps): React.ReactElement;

export interface WindowBlockProps {
  /** Planned window, e.g. "5:30–6:00 pm". */
  label: string;
  /** The window after the doctor's delay, e.g. "5:55–6:25 pm". The planned time is then struck through. */
  shifted?: string;
  note?: string;
  /** Total places, priority places included. Default 4. */
  capacity?: number;
  /** Places kept for paid priority visits (specialists only). Default 0. */
  priorityPlaces?: number;
  taken?: number;
  priorityTaken?: number;
  /** The window the doctor is in now. */
  isNow?: boolean;
  /** PatientCards. */
  children?: React.ReactNode;
}
export declare function WindowBlock(props: WindowBlockProps): React.ReactElement;

export type BookingStatus = 'held' | 'booked' | 'arrived' | 'in_consult' | 'done' | 'no_show' | 'cancelled' | 'rescheduled';
export interface PatientCardProps {
  name: string;
  /** Spoken-friendly 7-digit ID grouped 3-3-1, e.g. "482 915 6". */
  patientId?: string;
  age?: number;
  status?: BookingStatus;
  statusLabel?: string;
  /** e.g. "2 delay SMS sent" or "arrived 5:42 pm". */
  statusNote?: string;
  priority?: boolean;
  priorityLabel?: string;
  anyDoctor?: boolean;
  anyDoctorLabel?: string;
  source?: 'agent' | 'walk_in' | 'console';
  sourceLabel?: string;
  /** Booked by a relative in limited mode. */
  relative?: boolean;
  relativeLabel?: string;
  fee?: { state: 'due' | 'paid'; amount: number; label?: string };
  note?: string;
  action?: { label: string; onClick?: () => void; variant?: ButtonProps['variant'] };
  lang?: Lang;
}
export declare function PatientCard(props: PatientCardProps): React.ReactElement;

export interface EmergencyBannerProps {
  kind?: 'medical' | 'self_harm';
  title?: string;
  /** e.g. "5:47 pm" */
  time?: string;
  /** Caller's number, formatted "+91 98111 11111". */
  number?: string;
  /** What the caller said, from the transcript. Rendered as plain text, never as HTML. */
  snippet?: string;
  /** What the agent did, e.g. "Agent told caller to dial 112". */
  agentNote?: string;
  /** Pulse the icon until acknowledged (not under reduced motion). */
  isNew?: boolean;
  onAcknowledge?: () => void;
  onCallBack?: () => void;
  ackLabel?: string;
  callLabel?: string;
}
export declare function EmergencyBanner(props: EmergencyBannerProps): React.ReactElement;

export interface CallbackRowProps {
  priority: 'P1' | 'P2' | 'P3';
  caller?: string;
  number?: string;
  /** Language of the call, e.g. "Hinglish". */
  language?: string;
  verified?: boolean;
  reason: string;
  /** Language of the reason text, when it is Hindi. */
  lang?: Lang;
  /** e.g. "due in 12 min", "overdue 8 min". */
  dueText: string;
  overdue?: boolean;
  dueSoon?: boolean;
  /** Not yet acknowledged. A P1 keeps its solid red mark only while new or overdue. */
  isNew?: boolean;
  /** The caller asked to be called on another number: staff confirm before dialling. */
  differsFromCaller?: boolean;
  onCall?: () => void;
  callLabel?: string;
}
export declare function CallbackRow(props: CallbackRowProps): React.ReactElement;

export interface GlyphProps { name: GlyphName; size?: number; className?: string }
export declare function Glyph(props: GlyphProps): React.ReactElement | null;

declare global {
  interface Window {
    Bolnai: {
      Button: typeof Button; CallNextButton: typeof CallNextButton; DeskSwitch: typeof DeskSwitch;
      StatusBadge: typeof StatusBadge; PriorityMark: typeof PriorityMark; DoctorChip: typeof DoctorChip;
      WindowBlock: typeof WindowBlock; PatientCard: typeof PatientCard;
      EmergencyBanner: typeof EmergencyBanner; CallbackRow: typeof CallbackRow; Glyph: typeof Glyph;
    };
  }
}
