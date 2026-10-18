import { z } from 'zod';

/** mailto: / https: / 이메일 주소 중 하나. 빈 값이면 기본값이 쓰인다. */
export const pushSubjectSchema = z.string().max(255).default('');

export const regenerateKeysSchema = z.object({
  subject: pushSubjectSchema,
  /** 기존 구독이 전부 무효가 된다는 사실을 확인했는지 — 화면에서 명시적으로 받는다. */
  confirmInvalidate: z.boolean().default(false),
});

export const updatePushSettingsSchema = z.object({
  subject: pushSubjectSchema,
});

/**
 * 브라우저 PushSubscription.toJSON() 모양 그대로 받는다.
 * endpoint 는 capability URL 이라 길이가 길 수 있어 상한을 넉넉히 둔다.
 */
export const saveSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(500),
  }),
  platform: z.string().max(40).optional(),
  memberId: z.string().uuid().optional().nullable(),
});

export const unsubscribeSchema = z.object({
  endpoint: z.string().url().max(2000),
});

export const testPushSchema = z.object({
  /** 비우면 그 교회의 활성 구독 전체로 보낸다. */
  endpoint: z.string().url().max(2000).optional(),
  title: z.string().max(100).default('TrueLight 알림 테스트'),
  body: z.string().max(300).default('이 알림이 보이면 푸시 설정이 정상입니다.'),
  url: z.string().max(500).default('/'),
});

export type RegenerateKeysInput = z.infer<typeof regenerateKeysSchema>;
export type SaveSubscriptionInput = z.infer<typeof saveSubscriptionSchema>;
export type TestPushInput = z.infer<typeof testPushSchema>;
