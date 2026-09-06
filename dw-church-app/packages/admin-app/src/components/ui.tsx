import { forwardRef } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

/**
 * 원자 컴포넌트 레이어 (Design System 02 Components) — 디자인 토큰을 소비하는
 * 유일한 통로. 페이지가 bg-blue-600/px-5/rounded-lg 를 직접 하드코딩하지 않고
 * 이 컴포넌트만 쓰면, 토큰(색·radius·간격)을 바꿔도 전 화면이 자동 반영된다.
 * 색은 tailwind.config 에서 브랜드 토큰으로 매핑된 blue/gray 스케일을 사용한다.
 */

// cx — 조건부 클래스 병합(의존성 없이).
function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

// ── Button ────────────────────────────────────────────────
type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

const BTN_BASE = 'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40';
const BTN_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700',
  secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  outline: 'border border-gray-200 text-gray-700 bg-white hover:bg-gray-50',
  ghost: 'text-gray-600 hover:bg-gray-100',
  danger: 'text-red-600 border border-red-100 bg-white hover:bg-red-50',
};
const BTN_SIZE: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-sm',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', block, className, type = 'button', ...rest }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cx(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], block && 'w-full', className)}
      {...rest}
    />
  ),
);
Button.displayName = 'Button';

// ── Card ──────────────────────────────────────────────────
type CardPad = 'none' | 'sm' | 'md' | 'lg';
const CARD_PAD: Record<CardPad, string> = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  pad?: CardPad;
  children?: ReactNode;
}

export function Card({ pad = 'md', className, children, ...rest }: CardProps) {
  return (
    <div className={cx('bg-white border border-gray-200 rounded-xl shadow-sm', CARD_PAD[pad], className)} {...rest}>
      {children}
    </div>
  );
}

// ── Badge (상태 pill) ─────────────────────────────────────
type BadgeTone = 'neutral' | 'brand' | 'success' | 'warn' | 'danger';
const BADGE_TONE: Record<BadgeTone, string> = {
  neutral: 'bg-gray-100 text-gray-600',
  brand: 'bg-blue-50 text-blue-700',
  success: 'bg-emerald-50 text-emerald-700',
  warn: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-600',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children?: ReactNode;
}

export function Badge({ tone = 'neutral', className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx('inline-flex items-center gap-1 text-[11px] font-medium rounded-full px-2 py-0.5', BADGE_TONE[tone], className)} {...rest}>
      {children}
    </span>
  );
}
