'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Bilingual (KO/EN) legal document renderer for Terms & Privacy.
 * NOTE: good-faith drafts, NOT legal advice — have a Georgia attorney review.
 * The English version is the governing text (stated below); Korean is provided
 * for convenience.
 */
type Lang = 'ko' | 'en';
type Section = { h: string; body?: string[]; list?: string[] };
type Doc = { title: string; updated: string; intro: string[]; sections: Section[]; govern: string };

const FAITH_LIST_EN = [
  'One God, eternally existing in three persons — Father, Son, and Holy Spirit (the Trinity);',
  'The full deity and humanity of Jesus Christ, His virgin birth, atoning death, and bodily resurrection;',
  'Salvation by grace through faith in Jesus Christ;',
  'The divine inspiration, inerrancy, and final authority of the Holy Bible — the sixty-six (66) books of the Old and New Testaments — as the complete and authoritative Word of God, which we receive as the canon of Scripture;',
  'The bodily return of Jesus Christ.',
];
const FAITH_LIST_KO = [
  '성부·성자·성령, 삼위로 영원히 존재하시는 한 분 하나님(삼위일체);',
  '예수 그리스도의 완전한 신성과 인성, 동정녀 탄생, 대속의 죽음과 육체적 부활;',
  '오직 예수 그리스도를 믿는 믿음과 은혜로 받는 구원;',
  '성경의 신적 영감과 무오성(無誤性), 그리고 최종 권위 — 구약과 신약 66권을 하나님의 완전하고 권위 있는 말씀이자 정경(正經)으로 받아들임;',
  '예수 그리스도의 육체적 재림.',
];

const CONTENT: Record<'terms' | 'privacy', Record<Lang, Doc>> = {
  terms: {
    en: {
      title: 'Terms of Service',
      updated: 'Last updated: June 2026',
      govern: 'This English version is the governing text. The Korean translation is provided for convenience; in case of any conflict, the English version controls.',
      intro: [
        'These Terms of Service ("Terms") govern your access to and use of the websites, software, and services (the "Service") provided by TRUE LIGHT ("we," "us," or "our"). By submitting an application, creating an account, or using the Service, you (the "Customer" or the "Church") agree to these Terms.',
      ],
      sections: [
        { h: '1. The Service', body: ['TRUE LIGHT is a church online-ministry solution that provides a hosted church website together with content and ministry tools. We set up and configure each site; the Customer manages its own content thereafter.'] },
        { h: '2. Eligibility & Statement of Faith', body: ['The Service is offered to Christian churches and ministries that affirm the historic Christian faith summarized in the Apostles’ and Nicene Creeds (the "Statement of Faith"), namely:'], list: FAITH_LIST_EN },
        { h: '', body: ['By submitting an application and using the Service, you represent and warrant that (a) your church affirms this Statement of Faith, and (b) you are authorized to accept these Terms on behalf of your church. Churches of any recognized denomination as well as independent / non-denominational churches that affirm the Statement of Faith are eligible. Because building and hosting a church website is expressive work carried out in furtherance of our religious mission, we serve churches aligned with this Statement of Faith and may, in our sole discretion, decline, suspend, or discontinue the Service where this eligibility requirement is not met. These eligibility decisions are based on doctrinal alignment and the expressive nature of our work, and are not based on any characteristic protected under applicable federal or Georgia law.'] },
        { h: '3. Accounts & Responsibilities', body: ['You are responsible for the accuracy of the information you provide, for keeping your credentials confidential, and for all activity under your account. You agree to provide accurate information and to keep it current.'] },
        { h: '4. Fees & Billing', body: ['The Service is offered in tiered plans billed monthly or annually, plus a one-time setup fee covering initial design, build, and (where applicable) content migration. Recurring fees are billed in advance and are non-refundable except as required by law. The setup fee is non-refundable once setup work has begun. Payments are processed by third-party processors; you authorize us and our processors to charge your selected payment method.'] },
        { h: '5. Your Content & Ownership', body: ['You retain ownership of all content you upload, and you are solely responsible for it. You represent that you have the rights to all content you upload and that it does not infringe any third party’s rights. You grant us a limited, non-exclusive license to host, store, and display it solely to operate the Service. You may export your content at any time.'] },
        { h: '6. Acceptable Use', body: ['You agree not to use the Service to upload unlawful, infringing, or harmful content, to violate others’ rights, to distribute malware, or to disrupt or gain unauthorized access to the Service. We may remove content or suspend accounts that violate these Terms.'] },
        { h: '7. Intellectual Property', body: ['The Service, including its software, designs, and templates, is owned by TRUE LIGHT and protected by law. Except for your own content, no rights are granted other than the limited right to use the Service under these Terms.'] },
        { h: '8. Third-Party Services', body: ['The Service relies on third-party providers (for example, payment processing, hosting, email, and analytics). Your use of those providers may be subject to their own terms, and we are not responsible for third-party services. Domain registration is the Customer’s responsibility.'] },
        { h: '9. Service Availability & Modifications', body: ['We strive to keep the Service available but do not guarantee uninterrupted or error-free operation. We may modify, add, or discontinue features of the Service from time to time. We will use reasonable efforts to provide notice of material changes that adversely affect your use.'] },
        { h: '10. Termination', body: ['You may cancel at any time, effective at the end of the current billing period. We may suspend or terminate the Service for violation of these Terms or as described in Section 2. Upon termination, you may export your content for a reasonable period before it is removed. Sections that by their nature should survive termination (including ownership, disclaimers, limitation of liability, indemnification, and dispute resolution) will survive.'] },
        { h: '11. Disclaimers & Limitation of Liability', body: ['THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, TO THE FULLEST EXTENT PERMITTED BY LAW. TO THE MAXIMUM EXTENT PERMITTED BY LAW, TRUE LIGHT WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF DATA, REVENUE, OR PROFITS. OUR TOTAL LIABILITY ARISING OUT OF OR RELATING TO THE SERVICE WILL NOT EXCEED THE AMOUNTS YOU PAID US IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.'] },
        { h: '12. Indemnification', body: ['You agree to indemnify and hold harmless TRUE LIGHT and its officers, employees, and contractors from any claims, damages, liabilities, and expenses (including reasonable attorneys’ fees) arising out of your content, your use of the Service, or your violation of these Terms or of any law or third-party right.'] },
        { h: '13. Governing Law, Dispute Resolution & Class-Action Waiver', body: [
          'These Terms are governed by the laws of the State of Georgia, USA, without regard to its conflict-of-laws rules.',
          'Before initiating any arbitration or lawsuit, the parties agree to first attempt in good faith to resolve any dispute through informal negotiation and, if needed, mediation, for a period of at least thirty (30) days from the date written notice of the dispute is given. If the dispute is not resolved within that 30-day period, it shall be resolved in the state or federal courts located in Georgia, and the parties consent to the jurisdiction of those courts.',
          'TO THE EXTENT PERMITTED BY LAW, ANY DISPUTE WILL BE RESOLVED ON AN INDIVIDUAL BASIS ONLY, AND YOU AND TRUE LIGHT EACH WAIVE ANY RIGHT TO PARTICIPATE IN A CLASS, COLLECTIVE, OR REPRESENTATIVE ACTION.',
        ] },
        { h: '14. Changes to These Terms', body: ['We may update these Terms; material changes are posted with a new "Last updated" date. Continued use after changes take effect constitutes acceptance.'] },
        { h: '15. Miscellaneous', body: ['These Terms (together with the Privacy Policy) are the entire agreement between you and TRUE LIGHT regarding the Service and supersede prior agreements. If any provision is held unenforceable, the remaining provisions remain in effect. You may not assign these Terms without our consent; we may assign them in connection with a merger, acquisition, or sale of assets. Our failure to enforce a provision is not a waiver. Neither party is liable for delays or failures caused by events beyond its reasonable control (force majeure).'] },
        { h: '16. Contact', body: ['Questions: info@dasomweb.com. Support: support@dasomweb.com.'] },
      ],
    },
    ko: {
      title: '이용약관',
      updated: '최종 수정일: 2026년 6월',
      govern: '본 약관은 영문본이 정본(governing text)이며, 한국어 번역은 편의를 위한 것입니다. 해석상 충돌이 있을 경우 영문본이 우선합니다.',
      intro: [
        '본 이용약관("약관")은 TRUE LIGHT("당사")가 제공하는 웹사이트·소프트웨어·서비스("서비스")의 이용에 적용됩니다. 신청서를 제출하거나 계정을 생성하거나 서비스를 이용함으로써, 귀하("고객" 또는 "교회")는 본 약관에 동의하게 됩니다.',
      ],
      sections: [
        { h: '1. 서비스', body: ['TRUE LIGHT는 교회 홈페이지와 콘텐츠·사역 도구를 함께 제공하는 교회 온라인 사역 솔루션입니다. 당사가 각 사이트를 셋업·구성하며, 이후 콘텐츠는 고객이 직접 관리합니다.'] },
        { h: '2. 자격 요건 및 신앙고백', body: ['본 서비스는 사도신경·니케아 신경으로 요약되는 정통 기독교 신앙("신앙고백")을 고백하는 교회를 대상으로 합니다. 구체적으로:'], list: FAITH_LIST_KO },
        { h: '', body: ['신청서를 제출하고 서비스를 이용함으로써, 귀하는 (a) 귀 교회가 위 신앙고백에 동의하며, (b) 귀 교회를 대표하여 본 약관에 동의할 권한이 있음을 진술·보증합니다. 인정 교단 소속 교회는 물론, 신앙고백에 동의하는 무교단·독립교회도 신청할 수 있습니다. 교회 홈페이지를 제작·호스팅하는 일은 당사의 종교적 사명 수행으로서의 표현 활동이므로, 당사는 본 신앙고백에 부합하는 교회를 대상으로 서비스하며 본 자격 요건이 충족되지 않는 경우 당사의 재량으로 서비스 제공을 거절·정지·중단할 수 있습니다. 이러한 결정은 교리적 부합성과 당사 업무의 표현적 성격에 근거하며, 연방법 또는 조지아주법상 보호되는 특성에 근거하지 않습니다.'] },
        { h: '3. 계정 및 책임', body: ['귀하는 제공하는 정보의 정확성, 계정 정보의 보안 유지, 계정에서 발생하는 모든 활동에 대해 책임을 집니다. 정확한 정보를 제공하고 이를 최신으로 유지하기로 합니다.'] },
        { h: '4. 요금 및 결제', body: ['서비스는 월간 또는 연간으로 청구되는 단계별 요금제와, 초기 디자인·구축 및 (해당 시) 콘텐츠 이전을 포함하는 1회성 셋업비로 제공됩니다. 정기 요금은 선불 청구되며 법이 요구하는 경우를 제외하고 환불되지 않습니다. 셋업비는 셋업 작업이 시작된 후에는 환불되지 않습니다. 결제는 제3자 결제 처리업체를 통해 처리되며, 귀하는 당사 및 처리업체가 선택한 결제수단으로 청구하는 것에 동의합니다.'] },
        { h: '5. 콘텐츠 및 소유권', body: ['귀하가 업로드한 모든 콘텐츠의 소유권은 귀하에게 있으며, 그에 대한 책임도 전적으로 귀하에게 있습니다. 귀하는 업로드하는 모든 콘텐츠에 대한 권리를 보유하며 제3자의 권리를 침해하지 않음을 진술합니다. 귀하는 서비스 운영을 위한 범위에서 당사가 이를 호스팅·저장·표시할 수 있는 제한적·비독점적 라이선스를 부여합니다. 콘텐츠는 언제든 내보내기(Export)할 수 있습니다.'] },
        { h: '6. 이용 제한', body: ['불법·침해·유해 콘텐츠 업로드, 타인의 권리 침해, 악성코드 배포, 서비스 방해 또는 무단 접근 등에 본 서비스를 사용하지 않기로 합니다. 당사는 본 약관을 위반하는 콘텐츠를 삭제하거나 계정을 정지할 수 있습니다.'] },
        { h: '7. 지식재산권', body: ['소프트웨어·디자인·템플릿을 포함한 서비스의 지식재산권은 TRUE LIGHT에 있으며 법으로 보호됩니다. 귀하의 콘텐츠를 제외하고, 본 약관에 따른 제한적 이용권 외의 권리는 부여되지 않습니다.'] },
        { h: '8. 제3자 서비스', body: ['서비스는 제3자 제공업체(예: 결제 처리, 호스팅, 이메일, 분석)에 의존합니다. 해당 제공업체 이용에는 그들의 약관이 적용될 수 있으며, 당사는 제3자 서비스에 대해 책임지지 않습니다. 도메인 등록은 고객의 책임입니다.'] },
        { h: '9. 서비스 가용성 및 변경', body: ['당사는 서비스를 가용하게 유지하고자 노력하나, 중단 없는 또는 오류 없는 운영을 보증하지 않습니다. 당사는 수시로 서비스의 기능을 수정·추가·중단할 수 있습니다. 귀하의 이용에 불리한 중대한 변경에 대해서는 합리적으로 통지하도록 노력합니다.'] },
        { h: '10. 해지', body: ['귀하는 언제든 해지할 수 있으며, 해지는 현재 청구 주기 종료 시 효력이 발생합니다. 당사는 본 약관 위반 또는 제2조에 따른 경우 서비스를 정지·해지할 수 있습니다. 해지 시 삭제 전 합리적 기간 동안 콘텐츠를 내보낼 수 있습니다. 성격상 존속되어야 하는 조항(소유권, 면책, 책임 제한, 면책보상, 분쟁 해결 등)은 해지 후에도 존속합니다.'] },
        { h: '11. 면책 및 책임의 제한', body: ['서비스는 법이 허용하는 최대 범위에서 명시적·묵시적 어떠한 보증도 없이 "있는 그대로(as is)" 및 "이용 가능한 상태로(as available)" 제공됩니다. 법이 허용하는 최대 범위에서 TRUE LIGHT는 간접·부수적·특별·결과적·징벌적 손해, 또는 데이터·수익·이익의 손실에 대해 책임지지 않습니다. 서비스와 관련한 당사의 총 책임은 청구 발생 직전 12개월간 귀하가 당사에 지불한 금액을 초과하지 않습니다.'] },
        { h: '12. 면책보상(Indemnification)', body: ['귀하는 귀하의 콘텐츠, 서비스 이용, 또는 본 약관·법령·제3자 권리 위반으로 인해 발생하는 모든 청구·손해·책임·비용(합리적 변호사 비용 포함)으로부터 TRUE LIGHT 및 그 임직원·계약자를 면책하고 손해를 보상하기로 합니다.'] },
        { h: '13. 준거법, 분쟁 해결 및 집단소송 포기', body: [
          '본 약관은 미국 조지아주 법을 준거법으로 하며, 그 국제사법 원칙은 적용하지 않습니다.',
          '중재 또는 소송을 제기하기 전에, 당사자들은 분쟁의 서면 통지일로부터 최소 30일간 비공식 협의 및 (필요 시) 조정을 통해 성실히 분쟁을 해결하기로 합의합니다. 해당 30일 이내에 해결되지 않으면, 분쟁은 조지아주 소재 주 법원 또는 연방 법원에서 해결하며, 당사자들은 그 관할에 동의합니다.',
          '법이 허용하는 범위에서, 모든 분쟁은 개별적으로만 해결되며, 귀하와 TRUE LIGHT는 집단·대표·단체 소송에 참여할 권리를 포기합니다.',
        ] },
        { h: '14. 약관의 변경', body: ['당사는 약관을 변경할 수 있으며, 중요한 변경은 새로운 "최종 수정일"과 함께 게시됩니다. 변경 효력 발생 후 계속 이용하면 변경에 동의한 것으로 봅니다.'] },
        { h: '15. 일반 조항', body: ['본 약관은 (개인정보처리방침과 함께) 서비스에 관한 귀하와 TRUE LIGHT 간의 완전한 합의이며 이전 합의를 대체합니다. 어느 조항이 집행 불가능하더라도 나머지 조항은 유효합니다. 귀하는 당사 동의 없이 본 약관을 양도할 수 없으며, 당사는 합병·인수·자산 양도와 관련하여 이를 양도할 수 있습니다. 당사가 어느 조항을 집행하지 않더라도 이는 권리 포기가 아닙니다. 어느 당사자도 합리적 통제를 벗어난 사유(불가항력)로 인한 지연·불이행에 대해 책임지지 않습니다.'] },
        { h: '16. 문의', body: ['문의: info@dasomweb.com · 고객지원: support@dasomweb.com'] },
      ],
    },
  },
  privacy: {
    en: {
      title: 'Privacy Policy',
      updated: 'Last updated: June 2026',
      govern: 'This English version is the governing text; the Korean translation is for convenience.',
      intro: ['This Privacy Policy explains how TRUE LIGHT collects, uses, and protects information in connection with our church online-ministry service (the "Service").'],
      sections: [
        { h: '1. Information We Collect', list: [
          'Application information: church name, contact name, email, phone, church address, denomination, plan interest, and any message you provide.',
          'Account information: login credentials and administrator details.',
          'Content you upload: sermons, bulletins, photos, staff information, and similar materials.',
          'Usage information: basic technical and log data needed to operate and secure the Service.',
        ] },
        { h: '2. How We Use Information', body: ['We use information to review applications, provide and maintain the Service, set up and support your site, process payments, communicate with you, and meet legal obligations. We do not sell your personal information.'] },
        { h: '3. How We Share Information', body: ['We share information only with service providers that help operate the Service (e.g., hosting and payment processing), bound by confidentiality and security obligations, or when required by law. We do not sell or rent personal information.'] },
        { h: '4. Data Retention, Export & Deletion', body: ['We retain information while your account is active or as needed to provide the Service and meet legal requirements. You may export your church’s content at any time and may request deletion; we will delete it except where retention is legally required.'] },
        { h: '5. Security', body: ['We use reasonable administrative, technical, and physical safeguards. No method of transmission or storage is completely secure.'] },
        { h: '6. Cookies', body: ['The Service uses cookies necessary for authentication, preferences, and basic analytics. You can control cookies via your browser settings.'] },
        { h: '7. Children’s Privacy', body: ['The Service is intended for churches and their administrators, not children. We do not knowingly collect personal information directly from children.'] },
        { h: '8. Governing Law', body: ['This Policy is governed by the laws of the State of Georgia, USA, and is subject to the dispute-resolution process in our Terms (including a 30-day good-faith negotiation/mediation period).'] },
        { h: '9. Changes', body: ['We may update this Policy; material changes are posted with a new "Last updated" date.'] },
        { h: '10. Contact', body: ['Privacy questions: info@dasomweb.com. Support: support@dasomweb.com.'] },
      ],
    },
    ko: {
      title: '개인정보처리방침',
      updated: '최종 수정일: 2026년 6월',
      govern: '본 방침은 영문본이 정본이며, 한국어 번역은 편의를 위한 것입니다.',
      intro: ['본 개인정보처리방침은 TRUE LIGHT의 교회 온라인 사역 서비스("서비스")와 관련하여 당사가 정보를 수집·이용·보호하는 방식을 설명합니다.'],
      sections: [
        { h: '1. 수집하는 정보', list: [
          '신청 정보: 교회 이름, 담당자 이름, 이메일, 연락처, 교회 주소, 소속 교단, 관심 플랜, 작성하신 메시지.',
          '계정 정보: 로그인 자격 증명 및 관리자 정보.',
          '업로드 콘텐츠: 설교, 주보, 사진, 교역자 정보 등.',
          '이용 정보: 서비스 운영·보안에 필요한 기본 기술·로그 데이터.',
        ] },
        { h: '2. 정보의 이용', body: ['신청서 검토, 서비스 제공·유지, 사이트 셋업·지원, 결제 처리, 고객 응대, 법적 의무 준수를 위해 정보를 이용합니다. 당사는 개인정보를 판매하지 않습니다.'] },
        { h: '3. 정보의 제공', body: ['서비스 운영을 돕는 제공업체(예: 호스팅, 결제 처리)에 한해, 기밀·보안 의무를 전제로 정보를 공유하거나 법이 요구하는 경우에만 공유합니다. 개인정보를 판매·대여하지 않습니다.'] },
        { h: '4. 보관, 내보내기 및 삭제', body: ['계정이 활성 상태인 동안 또는 서비스 제공·법적 요구에 필요한 동안 정보를 보관합니다. 교회의 콘텐츠는 언제든 내보낼 수 있고 삭제를 요청할 수 있으며, 법적으로 보관이 요구되는 경우를 제외하고 삭제합니다.'] },
        { h: '5. 보안', body: ['합리적인 관리적·기술적·물리적 보호조치를 사용합니다. 다만 어떠한 전송·저장 방식도 완전히 안전하지는 않습니다.'] },
        { h: '6. 쿠키', body: ['서비스는 인증·환경설정·기본 분석에 필요한 쿠키를 사용합니다. 브라우저 설정으로 쿠키를 제어할 수 있습니다.'] },
        { h: '7. 아동의 개인정보', body: ['본 서비스는 교회와 관리자를 위한 것이며 아동을 대상으로 하지 않습니다. 당사는 아동으로부터 직접 개인정보를 수집하지 않습니다.'] },
        { h: '8. 준거법', body: ['본 방침은 미국 조지아주 법을 준거법으로 하며, 당사 약관의 분쟁 해결 절차(30일 성실 협의·조정 기간 포함)를 따릅니다.'] },
        { h: '9. 변경', body: ['당사는 본 방침을 변경할 수 있으며, 중요한 변경은 새로운 "최종 수정일"과 함께 게시됩니다.'] },
        { h: '10. 문의', body: ['개인정보 문의: info@dasomweb.com · 고객지원: support@dasomweb.com'] },
      ],
    },
  },
};

export function LegalDoc({ kind }: { kind: 'terms' | 'privacy' }) {
  const [lang, setLang] = useState<Lang>('ko');
  useEffect(() => {
    try {
      const saved = localStorage.getItem('tl_lang');
      if (saved === 'ko' || saved === 'en') setLang(saved);
    } catch { /* ignore */ }
  }, []);
  const switchLang = (l: Lang) => { setLang(l); try { localStorage.setItem('tl_lang', l); } catch { /* ignore */ } };
  const doc = CONTENT[kind][lang];

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <span className="text-sm font-bold text-white">T</span>
            </div>
            <span className="text-lg font-bold tracking-tight text-gray-900">TRUE <span className="text-blue-600">LIGHT</span></span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-lg border border-gray-200 p-0.5 text-xs font-medium">
              <button onClick={() => switchLang('ko')} className={`rounded-md px-2 py-1 ${lang === 'ko' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}>한국어</button>
              <button onClick={() => switchLang('en')} className={`rounded-md px-2 py-1 ${lang === 'en' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-900'}`}>EN</button>
            </div>
            <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">{lang === 'ko' ? '홈' : 'Home'}</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="mb-2 text-3xl font-bold text-gray-900">{doc.title}</h1>
        <p className="mb-8 text-sm text-gray-500">{doc.updated}</p>
        <div className="space-y-6 text-sm leading-relaxed text-gray-700">
          {doc.intro.map((p, i) => <p key={`intro-${i}`}>{p}</p>)}
          {doc.sections.map((s, i) => (
            <section key={i}>
              {s.h && <h2 className="mb-2 text-lg font-bold text-gray-900">{s.h}</h2>}
              {s.body?.map((p, j) => <p key={j} className="mb-2">{p}</p>)}
              {s.list && (
                <ul className="list-disc space-y-1 pl-5">
                  {s.list.map((li, k) => <li key={k}>{li}</li>)}
                </ul>
              )}
            </section>
          ))}
          <p className="border-t border-gray-100 pt-6 text-xs text-gray-400">{doc.govern}</p>
        </div>
      </main>

      <footer className="border-t border-gray-200 py-8 text-center text-xs text-gray-400">
        &copy; {new Date().getFullYear()} TRUE LIGHT by DASOMWEB. All rights reserved.
      </footer>
    </div>
  );
}
