import type { CreateFormInput, CreateFormFieldInput } from '@dw-church/api-client';

// 폼 빌더 프리셋 — 원클릭으로 자주 쓰는 폼을 필드까지 생성.
// slug가 이미 있으면 서버가 자동으로 _2, _3 … 을 붙인다.
export interface FormPreset {
  key: string;
  label: string;
  description: string;
  form: CreateFormInput;
  fields: CreateFormFieldInput[];
}

export const FORM_PRESETS: FormPreset[] = [
  {
    key: 'contact',
    label: '문의하기',
    description: '방문자 문의를 받는 기본 폼',
    form: { name: '문의하기', slug: 'contact', submitLabel: '보내기', successMessage: '문의가 접수되었습니다. 감사합니다.' },
    fields: [
      { fieldKey: 'name', fieldType: 'text', label: '이름', isRequired: true },
      { fieldKey: 'phone', fieldType: 'phone', label: '연락처' },
      { fieldKey: 'email', fieldType: 'email', label: '이메일' },
      { fieldKey: 'subject', fieldType: 'text', label: '제목' },
      { fieldKey: 'message', fieldType: 'textarea', label: '문의 내용', isRequired: true },
    ],
  },
  {
    key: 'newcomer',
    label: '새가족 등록',
    description: '처음 오신 분의 정보를 등록',
    form: { name: '새가족 등록', slug: 'newcomer', submitLabel: '등록하기', successMessage: '등록해 주셔서 감사합니다. 곧 연락드리겠습니다.' },
    fields: [
      { fieldKey: 'name', fieldType: 'text', label: '이름', isRequired: true },
      { fieldKey: 'phone', fieldType: 'phone', label: '연락처' },
      { fieldKey: 'email', fieldType: 'email', label: '이메일' },
      { fieldKey: 'address', fieldType: 'text', label: '주소' },
      { fieldKey: 'birth_date', fieldType: 'date', label: '생년월일' },
      { fieldKey: 'gender', fieldType: 'select', label: '성별', options: [{ value: 'male', label: '남' }, { value: 'female', label: '여' }] },
      { fieldKey: 'prev_church', fieldType: 'text', label: '이전 교회' },
      { fieldKey: 'visit_path', fieldType: 'text', label: '방문 경로', placeholder: '지인 소개, 검색, 이사 등' },
      { fieldKey: 'faith_status', fieldType: 'select', label: '신앙 상태', options: [{ value: 'new', label: '초신자' }, { value: 'believer', label: '기신자' }, { value: 'transfer', label: '수평이동' }] },
      { fieldKey: 'prayer_request', fieldType: 'textarea', label: '기도 제목' },
    ],
  },
  {
    key: 'cell_report',
    label: '목장 보고서',
    description: '목장 인도자가 주간 사역을 보고',
    form: { name: '목장 보고서', slug: 'cell_report', submitLabel: '제출', successMessage: '보고해 주셔서 감사합니다.' },
    fields: [
      { fieldKey: 'cell_name', fieldType: 'text', label: '목장 이름', isRequired: true },
      { fieldKey: 'leader_name', fieldType: 'text', label: '인도자' },
      { fieldKey: 'meeting_date', fieldType: 'date', label: '모임 날짜' },
      { fieldKey: 'attendee_count', fieldType: 'number', label: '참석 인원' },
      { fieldKey: 'visitors', fieldType: 'text', label: '새가족 / 방문자' },
      { fieldKey: 'offering', fieldType: 'number', label: '헌금' },
      { fieldKey: 'prayer_request', fieldType: 'textarea', label: '기도 제목' },
      { fieldKey: 'report', fieldType: 'textarea', label: '나눔 및 보고' },
    ],
  },
];
