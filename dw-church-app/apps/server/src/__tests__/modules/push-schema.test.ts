import { describe, it, expect } from 'vitest';
import {
  saveSubscriptionSchema, unsubscribeSchema, testPushSchema, regenerateKeysSchema,
} from '../../modules/push/schema.js';
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
