import { describe, it, expect } from 'vitest';
import {
  saveSubscriptionSchema, unsubscribeSchema, testPushSchema, regenerateKeysSchema,
  savePrefsSchema,
} from '../../modules/push/schema.js';
import {
  PUSH_CATEGORIES, PUSH_CATEGORY_KEYS, SMALL_GROUP_CATEGORY_KEYS,
  groupedCategories, isPushCategory,
} from '../../modules/push/categories.js';
import { normalizeSubject } from '../../config/web-push.js';

/**
 * 웹 푸시 입력 검증.
 *
 * endpoint 는 capability URL(그 값만 알면 해당 기기로 발송 가능)이라 형태를
 * 느슨하게 받으면 안 되고, subject 는 RFC 8292 가 mailto:/https: 를 요구한다.
 */
describe('saveSubscriptionSchema', () => {
  const valid = {
    endpoint: 'https://fcm.googleapis.com/wp/abc123',
    keys: { p256dh: 'BExamplePublicKey', auth: 'authSecret' },
  };

  it('브라우저 PushSubscription.toJSON() 모양을 그대로 받는다', () => {
    const r = saveSubscriptionSchema.parse(valid);
    expect(r.endpoint).toBe(valid.endpoint);
    expect(r.keys.p256dh).toBe('BExamplePublicKey');
  });

  it('endpoint 가 URL 이 아니면 거부한다', () => {
    expect(() => saveSubscriptionSchema.parse({ ...valid, endpoint: 'not-a-url' })).toThrow();
  });

  it('키가 비면 거부한다', () => {
    expect(() => saveSubscriptionSchema.parse({ ...valid, keys: { p256dh: '', auth: 'x' } })).toThrow();
    expect(() => saveSubscriptionSchema.parse({ ...valid, keys: { p256dh: 'x', auth: '' } })).toThrow();
  });

  it('memberId 는 선택이고, 값이 있으면 uuid 여야 한다', () => {
    expect(saveSubscriptionSchema.parse(valid).memberId).toBeUndefined();
    expect(() => saveSubscriptionSchema.parse({ ...valid, memberId: 'nope' })).toThrow();
  });

  it('platform 은 선택', () => {
    expect(saveSubscriptionSchema.parse({ ...valid, platform: 'ios' }).platform).toBe('ios');
  });
});

describe('unsubscribeSchema', () => {
  it('endpoint URL 만 받는다', () => {
    expect(unsubscribeSchema.parse({ endpoint: 'https://a.example/b' }).endpoint).toBe('https://a.example/b');
    expect(() => unsubscribeSchema.parse({ endpoint: '' })).toThrow();
  });
});

describe('testPushSchema', () => {
  it('비워도 기본 문구로 채워진다', () => {
    const r = testPushSchema.parse({});
    expect(r.title.length).toBeGreaterThan(0);
    expect(r.body.length).toBeGreaterThan(0);
    expect(r.url).toBe('/');
  });
  it('endpoint 를 주면 그 기기에만 보낸다', () => {
    expect(testPushSchema.parse({ endpoint: 'https://a.example/b' }).endpoint).toBe('https://a.example/b');
  });
});

describe('regenerateKeysSchema', () => {
  it('confirmInvalidate 기본값은 false — 실수로 기존 구독을 날리지 않는다', () => {
    expect(regenerateKeysSchema.parse({}).confirmInvalidate).toBe(false);
  });
  it('명시하면 true 로 통과', () => {
    expect(regenerateKeysSchema.parse({ confirmInvalidate: true }).confirmInvalidate).toBe(true);
  });
});

describe('normalizeSubject (RFC 8292 sub 클레임)', () => {
  it('mailto:/https: 는 그대로 둔다', () => {
    expect(normalizeSubject('mailto:a@b.com')).toBe('mailto:a@b.com');
    expect(normalizeSubject('https://truelight.app')).toBe('https://truelight.app');
  });
  it('이메일만 주면 mailto: 를 붙인다', () => {
    expect(normalizeSubject('support@truelight.app')).toBe('mailto:support@truelight.app');
  });
  it('비었거나 형식이 아니면 기본 연락처로 떨어진다', () => {
    expect(normalizeSubject('')).toBe('mailto:support@truelight.app');
    expect(normalizeSubject('   ')).toBe('mailto:support@truelight.app');
    expect(normalizeSubject('그냥 글자')).toBe('mailto:support@truelight.app');
  });
});

describe('PUSH_CATEGORIES (알림 항목)', () => {
  it('소그룹예배는 가정·직장·목장 세 갈래로 각각 켜고 끈다', () => {
    const sg = PUSH_CATEGORIES.filter((c) => c.group === '소그룹예배');
    expect(sg.map((c) => c.label)).toEqual(['가정', '직장', '목장']);
    expect(SMALL_GROUP_CATEGORY_KEYS).toHaveLength(3);
  });

  it('키가 중복되지 않는다', () => {
    expect(new Set(PUSH_CATEGORY_KEYS).size).toBe(PUSH_CATEGORY_KEYS.length);
  });

  it('모든 항목이 발송 소스를 가진다 (스케줄러가 어디서 읽을지 알아야 함)', () => {
    for (const c of PUSH_CATEGORIES) expect(c.source.length).toBeGreaterThan(0);
  });

  it('기본 발송 시각은 비었거나 HH:MM', () => {
    for (const c of PUSH_CATEGORIES) {
      expect(c.defaultTime).toMatch(/^$|^([01]\d|2[0-3]):[0-5]\d$/);
    }
  });

  it('groupedCategories 는 순서를 지키며 묶는다', () => {
    const g = groupedCategories();
    const sg = g.find((x) => x.group === '소그룹예배');
    expect(sg?.items).toHaveLength(3);
    // 소그룹 묶음은 한 덩어리로만 나와야 한다(쪼개지면 화면이 두 번 그려짐).
    expect(g.filter((x) => x.group === '소그룹예배')).toHaveLength(1);
  });

  it('isPushCategory 는 모르는 키를 거부한다', () => {
    expect(isPushCategory('small_group_home')).toBe(true);
    expect(isPushCategory('group_worship')).toBe(false); // 이전 이름 — 더는 없음
  });
});

describe('savePrefsSchema', () => {
  it('HH:MM 이 아니면 거부한다', () => {
    const base = { endpoint: 'https://a.example/b', prefs: [{ category: 'daily_verse', enabled: true }] };
    expect(() => savePrefsSchema.parse({ ...base, prefs: [{ ...base.prefs[0], sendTime: '25:00' }] })).toThrow();
    expect(() => savePrefsSchema.parse({ ...base, prefs: [{ ...base.prefs[0], sendTime: '6:30' }] })).toThrow();
    expect(savePrefsSchema.parse({ ...base, prefs: [{ ...base.prefs[0], sendTime: '06:30' }] }).prefs[0]!.sendTime).toBe('06:30');
  });
  it('빈 시각은 "설정 안 함"으로 허용', () => {
    const r = savePrefsSchema.parse({ endpoint: 'https://a.example/b', prefs: [{ category: 'notice', enabled: false, sendTime: '' }] });
    expect(r.prefs[0]!.sendTime).toBe('');
  });
});
