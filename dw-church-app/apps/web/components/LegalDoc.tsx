'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

/**
 * Bilingual (KO/EN) legal document renderer for Terms & Privacy.
 * NOTE: good-faith drafts, NOT legal advice — have a Georgia attorney review.
 * For the Terms, the Korean version is the governing text (per the client's
 * provided contract); the English version is a convenience translation. The
 * Privacy Policy still treats English as governing.
 */
type Lang = 'ko' | 'en';
type Section = { h: string; body?: string[]; list?: string[] };
type Doc = { title: string; updated: string; intro: string[]; sections: Section[]; govern: string };

const FAITH_LIST_EN = [
  'One God, eternally existing in three persons: Father, Son, and Holy Spirit (the Trinity);',
  'The full deity and humanity of our Lord Jesus Christ, His virgin birth, His substitutionary death, and His bodily resurrection, recognizing no other "Christ," second-coming savior, or messiah;',
  'Salvation solely by grace through faith in Jesus Christ alone;',
  'Acceptance of the 66 books of the Old and New Testaments as the fully inspired, infallible, and final authority of the Word of God, rejecting any new revelations or additional scriptures;',
  'The personal, bodily, and visible future return of Jesus Christ.',
];
const FAITH_LIST_KO = [
  '성부·성자·성령, 삼위로 영원히 존재하시는 한 분 하나님(삼위일체);',
  '주 예수 그리스도의 완전한 신성과 인성, 동정녀 탄생, 대속의 죽음과 육체적 부활을 믿으며, 그분 외의 다른 "그리스도", 재림주, 메시아를 인정하지 않음;',
  '오직 은혜와 오직 믿음으로 받는 구원;',
  '구약과 신약 66권을 하나님의 완전하고 권위 있는 말씀이자 최종 권위로 받아들이며, 어떠한 새 계시나 추가 경전도 인정하지 않음;',
  '예수 그리스도의 인격적이고 육체적이며 가시적인 재림.',
];

const CONTENT: Record<'terms' | 'privacy', Record<Lang, Doc>> = {
  terms: {
    en: {
      title: 'Terms of Service',
      updated: 'Last Updated: June 2026',
      govern: 'The original Korean version is the governing text and controls the legal relationship between the parties. This English translation is provided for convenience; in case of any conflict or dispute, the Korean version shall control.',
      intro: [
        'These Terms of Service ("Terms") govern the use of the website, software, hosting, and related services ("Services") provided by TRUE LIGHT ("Company"), a Georgia limited liability company. By submitting an application, creating an account, or using the Services, you ("Customer" or "Church") legally agree to be bound by these Terms. In the event that a translation of these Terms is provided, the original Korean version shall control and govern the legal relationship between the parties in case of any conflict or dispute.',
      ],
      sections: [
        { h: '1. Definition and Scope of Services', body: ['The Company provides church website development and online ministry solutions. The Company’s role is strictly limited to initial setup, system configuration, template provision, and hosting environment management. Following the completion of the initial setup, the Customer bears sole responsibility for the operation, management, and all content (including but not limited to text, images, and videos) uploaded to the website. The Company has no obligation to monitor the Customer’s website content.'] },
        { h: '2. Religious Qualification & Discretion', body: ['The Services are offered to churches that profess and practice the historic orthodox Christian faith ("Confession of Faith"). This applies across denominations and traditions — Presbyterian, Baptist, Methodist, Holiness, Pentecostal, and others — and turns not on formal subscription to any particular creed, but on agreement with the substance of the core doctrines below. Specifically, the doctrinal standards include:'], list: FAITH_LIST_EN },
        { h: '', body: [
          'By submitting an application and using the Services, you REPRESENT AND WARRANT that (a) your Church fully agrees to the Confession of Faith, and (b) you have the proper legal authority to bind your Church to these Terms. Non-denominational and independent churches that agree to the Confession of Faith are eligible to apply.',
          'The production and hosting of church websites constitute an exercise of the Company’s religious mission and qualify as an expressive activity protected under the First Amendment of the United States Constitution. Therefore, the Company provides Services exclusively to churches that align with this Confession of Faith. If the Company determines, in its SOLE DISCRETION, that these qualifications are not met or have been violated, the Company reserves the right to refuse, suspend, discontinue, or terminate the Services without prior notice. Such decisions are based entirely on doctrinal alignment and the expressive nature of the Company’s work, and are not based on any protected characteristics under federal or Georgia state law (such as race, national origin, or gender).',
          'If any representation made by you—including adherence to the Confession of Faith or any provided information—is found to be false, inaccurate, or incomplete, the Company may immediately terminate the Services, and all fees paid up to that date shall be strictly non-refundable.',
        ] },
        { h: '3. Account and Management Responsibility', body: ['You are entirely responsible for maintaining the security and confidentiality of your account credentials. All activities occurring under your account (including unauthorized access) and all content uploaded shall be deemed your own acts. The Company shall not be liable for any losses or damages arising from your failure to safeguard your account information.'] },
        { h: '4. Fees, Billing, and Payments', body: [
          'Fee Structure: Service fees consist of recurring subscription charges (monthly or annual) and a one-time setup fee covering initial design, construction, and content migration (if applicable).',
          'Non-Refundable Policy: ALL RECURRING FEES ARE BILLED IN ADVANCE AND ARE STRICTLY NON-REFUNDABLE UNLESS OTHERWISE REQUIRED BY APPLICABLE LAW. THE ONE-TIME SETUP FEE IS STRICTLY NON-REFUNDABLE ONCE THE COMPANY HAS COMMENCED DESIGN OR DEVELOPMENT WORK.',
          'Payment Processing: Payments are processed via a third-party payment processor. In the event of a payment failure, the Company reserves the right to immediately restrict access to the Services.',
        ] },
        { h: '5. Content Ownership and License', body: ['The Customer retains all intellectual property rights in the content uploaded by the Customer. However, you grant the Company a worldwide, royalty-free, non-exclusive, limited license to host, store, display, transmit, and distribute such content solely for the purpose of operating and providing the Services. The Customer may export content only through the designated features provided within the Services and shall not extract, reverse engineer, or claim ownership over the Company’s system architecture or source code.'] },
        { h: '6. Prohibited Conduct', body: ['You agree not to use the Services for any unlawful activities, infringement of third-party intellectual property rights, distribution of malware, generation of excessive server loads, or any ministry activities that defame the reputation of the Company. The Company reserves the right to remove non-compliant content or suspend accounts immediately without prior notice.'] },
        { h: '7. Intellectual Property Rights of the Company', body: ['All intellectual property rights, including software, designs, templates, source code, and trademarks related to the Services, remain the sole and exclusive property of TRUE LIGHT. The Customer is granted only a limited, revocable right to use the Services in accordance with these Terms, and no ownership interest or title is transferred to the Customer.'] },
        { h: '8. Third-Party Services and Independent Contractor Status', body: [
          'The Company relies on third-party infrastructure and providers (e.g., AWS for hosting, Stripe for payment processing). THE COMPANY SHALL NOT BE LIABLE FOR ANY DAMAGES, DISRUPTIONS, ERRORS, DATA LOSS, OR POLICY CHANGES ARISING FROM OR RELATED TO SUCH THIRD-PARTY SERVICES. Domain registration, renewal, and management remain the sole responsibility of the Customer.',
          'The Company and the Customer are INDEPENDENT CONTRACTORS. Nothing in these Terms shall be construed to create a partnership, joint venture, employment, or agency relationship between the parties. The Company assumes no liability or joint responsibility for any acts, omissions, or disputes involving the Customer and third parties.',
        ] },
        { h: '9. Modifications and Limitation of Availability', body: ['While the Company endeavors to maintain stable operations, the Services are provided on an "AS IS" and "AS AVAILABLE" basis. The Company disclaims all liability for service interruptions caused by unscheduled system maintenance, infrastructure failures, or force majeure. The Company reserves the right to modify, add, or discontinue features or technical specifications of the Services at any time.'] },
        { h: '10. Termination and Data Deletion', body: [
          'Customer Termination: The Customer may request termination at any time through the account settings. Termination will take effect at the end of the current billing cycle.',
          'Company Termination: The Company may terminate the Services immediately upon a breach of these Terms or a failure to meet the religious qualifications specified in Section 2.',
          'Data Deletion: Upon termination, the Company may permanently delete all Customer data immediately or within a reasonable timeframe. The Company shall not be liable for any failure to preserve or back up data post-termination. Provisions that by their nature should survive termination (including indemnification, limitation of liability, and jurisdiction) shall remain in full force and effect.',
        ] },
        { h: '11. LIMITATION OF LIABILITY', body: ['TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL TRUE LIGHT, ITS OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, LOSS OF DATA, OR BUSINESS INTERRUPTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OF THE SERVICES. REGARDLESS OF THE THEORY OF LIABILITY—WHETHER IN CONTRACT, TORT, OR OTHERWISE—THE COMPANY’S TOTAL CUMULATIVE LIABILITY UNDER THESE TERMS SHALL NOT EXCEED THE TOTAL AMOUNT ACTUALLY PAID BY YOU TO THE COMPANY DURING THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.'] },
        { h: '12. INDEMNIFICATION', body: ['YOU AGREE TO DEFEND, INDEMNIFY, AND HOLD HARMLESS TRUE LIGHT, ITS OFFICERS, DIRECTORS, EMPLOYEES, AND CONTRACTORS FROM AND AGAINST ANY AND ALL CLAIMS, DAMAGES, LOSSES, LIABILITIES, COSTS, AND EXPENSES (INCLUDING REASONABLE ATTORNEYS\' FEES) ARISING FROM OR RELATED TO YOUR CONTENT, YOUR USE OF THE SERVICES, YOUR VIOLATION OF THESE TERMS OR APPLICABLE LAW, OR YOUR INFRINGEMENT OF ANY THIRD-PARTY RIGHTS, INCLUDING INTELLECTUAL PROPERTY AND PRIVACY RIGHTS.'] },
        { h: '13. Governing Law, Jurisdiction, and Class Action Waiver', body: [
          'Governing Law: These Terms shall be governed by and construed in accordance with the laws of the State of Georgia, USA, without regard to its conflict of law principles.',
          'Dispute Resolution: Prior to initiating any formal legal action, the parties agree to attempt to resolve any dispute through good-faith informal negotiations for a minimum period of thirty (30) days following written notice of the dispute. If the dispute is not resolved within thirty (30) days, any legal action must be filed exclusively in the state courts of Gwinnett County, Georgia, or the applicable federal courts in the State of Georgia. The parties hereby consent to the exclusive personal jurisdiction of such courts.',
          'CLASS ACTION WAIVER: TO THE MAXIMUM EXTENT PERMITTED BY LAW, ALL CLAIMS MUST BE BROUGHT SOLELY IN AN INDIVIDUAL CAPACITY. YOU HEREBY WAIVE ANY RIGHT TO PARTICIPATE AS A PLAINTIFF OR CLASS MEMBER IN ANY CLASS ACTION, REPRESENTATIVE PROCEEDING, OR MULTI-PLAINTIFF LAWSUIT AGAINST THE COMPANY.',
        ] },
        { h: '14. Changes to Terms', body: ['The Company reserves the right to modify these Terms at its sole discretion. When changes are made, the "Last Updated" date at the top of these Terms will be revised. Continued use of the Services after the effective date of any modifications constitutes your formal acceptance of the revised Terms.'] },
        { h: '15. Miscellaneous', body: ['These Terms, together with the Privacy Policy, constitute the entire agreement between the Company and the Customer regarding the Services and supersede all prior agreements. The failure of the Company to enforce any right or provision of these Terms shall not constitute a waiver of such right. If any provision of these Terms is held to be invalid or unenforceable by a court of competent jurisdiction, the remaining provisions shall remain in full force and effect.'] },
        { h: '16. Contact Information', body: ['Official Inquiries: info@dasomweb.com', 'Customer Support: support@dasomweb.com'] },
      ],
    },
    ko: {
      title: 'TRUE LIGHT 이용약관',
      updated: '최종 수정일: 2026년 6월',
      govern: '본 약관은 한글 원본이 정본(governing text)이며, 영문 번역은 편의를 위해 제공됩니다. 분쟁 발생 시에는 본 한글 원본 약관이 최종적인 법적 권위를 가집니다.',
      intro: [
        '본 이용약관("약관")은 미국 조지아주 법인인 TRUE LIGHT("당사")가 제공하는 웹사이트, 소프트웨어, 호스팅 및 관련 서비스("서비스")의 이용에 적용됩니다. 신청서를 제출하거나, 계정을 생성하거나, 서비스를 이용함으로써 귀하("고객" 또는 "교회")는 본 약관의 모든 조항에 법적으로 동의하게 됩니다. 본 약관의 영문 번역본이 제공되는 경우라 하더라도, 분쟁 발생 시에는 본 한글 원본 약관이 최종적인 법적 권위를 가집니다.',
      ],
      sections: [
        { h: '1. 서비스 정의 및 범위', body: ['당사는 교회 홈페이지 구축 및 온라인 사역 솔루션을 제공합니다. 당사의 역할은 초기 셋업, 시스템 구성, 템플릿 제공 및 호스팅 환경 관리에 국한됩니다. 초기 구축 완료 이후 웹사이트에 업로드되는 모든 텍스트, 이미지, 영상 등의 콘텐츠 및 운영 관리는 전적으로 고객의 책임입니다. 당사는 고객 웹사이트의 콘텐츠를 상시 모니터링할 의무가 없습니다.'] },
        { h: '2. 자격 요건 및 신앙고백 (Religious Qualification & Discretion)', body: ['본 서비스는 역사적 정통 기독교 신앙("신앙고백")을 고백하고 실천하는 교회를 대상으로 제공됩니다. 장로교·침례교·감리교·성결교·오순절 등 교단과 전통을 막론하고 적용되며, 특정 신경(信經)에 대한 형식적 가입 여부가 아니라 아래 핵심 교리의 내용에 동의하는지를 기준으로 합니다. 구체적인 교리적 기준은 다음과 같습니다:'], list: FAITH_LIST_KO },
        { h: '', body: [
          '신청서를 제출하고 서비스를 이용함으로써 귀하는 (a) 귀 교회가 위 신앙고백에 완전히 동의하며, (b) 귀 교회를 대표하여 본 약관에 동의할 적법한 권한이 있음을 진술하고 보증(Represent and Warrant)합니다. 신앙고백에 동의하는 무교단·독립교회도 신청할 수 있습니다.',
          '교회 홈페이지를 제작하고 호스팅하는 행위는 당사의 종교적 사명 수행이자 미국 수정헌법 제1조(First Amendment)에 의해 보호되는 표현 활동(Expressive Activity)입니다. 따라서 당사는 본 신앙고백에 부합하는 교회만을 대상으로 서비스하며, 본 자격 요건이 충족되지 않거나 위배된다고 판단되는 경우, 당사의 독자적인 재량(Sole Discretion)으로 사전 통지 없이 서비스 제공을 거절, 정지, 중단 또는 해지할 수 있습니다. 이러한 결정은 오직 교리적 부합성과 당사 업무의 표현적 성격에만 근거하며, 연방법 또는 조지아주법상 보호되는 특성(인종, 국적, 성별 등)에 근거한 차별이 아님을 명시합니다.',
          '귀하가 행한 진술(신앙고백 동의 및 제공 정보 포함)이 사실과 다르거나 부정확함이 확인될 경우, 당사는 즉시 서비스를 해지할 수 있으며 이 경우 기 지불된 요금은 일체 환불되지 않습니다.',
        ] },
        { h: '3. 계정 및 관리 책임', body: ['귀하는 계정 자격 증명의 보안을 유지할 전적인 책임이 있습니다. 귀하의 계정 하에서 발생하는 모든 활동(무단 접근 포함) 및 콘텐츠 업로드 행위는 귀하의 행위로 간주됩니다. 당사는 계정 관리 소홀로 인해 발생하는 어떠한 손해에 대해서도 책임을 지지 않습니다.'] },
        { h: '4. 요금, 청구 및 결제', body: [
          '요금 구조: 서비스 요금은 정기 요금(월간/연간)과 1회성 초기 셋업비로 구성됩니다.',
          '환불 불가 원칙: 모든 정기 요금은 선불로 청구되며, 관련 법령에서 강제하지 않는 한 환불이 불가능(NON-REFUNDABLE)합니다. 초기 셋업비는 당사가 디자인 및 구축 작업을 시작한 직후부터 어떠한 경우에도 환불되지 않습니다.',
          '결제 처리: 결제는 제3자 결제 처리업체를 통해 수행되며, 결제 실패 시 당사는 즉시 서비스 이용을 제한할 수 있습니다.',
        ] },
        { h: '5. 콘텐츠 소유권 및 라이선스', body: ['고객이 업로드한 모든 콘텐츠의 지식재산권은 고객에게 귀속됩니다. 다만, 귀하는 당사에게 서비스를 운영, 호스팅, 저장, 표시, 전송 및 배포할 수 있는 범위 내에서 전 세계적이고, 무상이며, 비독점적인 제한적 라이선스를 부여합니다. 고객은 본 서비스가 제공하는 기능을 통해서만 콘텐츠를 내보내기(Export) 할 수 있으며, 당사의 시스템 아키텍처나 소스 코드 자체를 추출하거나 소유할 수는 없습니다.'] },
        { h: '6. 이용 제한 행위', body: ['귀하는 본 서비스를 불법 행위, 제3자의 지식재산권 침해, 악성코드 배포, 서버 부하 유발, 또는 당사의 명예를 훼손하는 사역 활동에 사용할 수 없습니다. 당사는 위반 소지가 있는 콘텐츠를 사전 통지 없이 즉시 삭제하거나 계정을 폐쇄할 권리를 가집니다.'] },
        { h: '7. 당사의 지식재산권 소유', body: ['서비스와 관련된 모든 소프트웨어, 디자인, 템플릿, 소스 코드, 상표 및 지식재산권은 전적으로 TRUE LIGHT의 소유입니다. 고객에게는 본 약관에 따른 제한적이고 취소 가능한 서비스 이용권만 부여되며, 서비스 자체에 대한 어떠한 권리나 소유권도 이전되지 않습니다.'] },
        { h: '8. 제3자 서비스 및 독립 계약자 규정', body: [
          '당사는 인프라 운영을 위해 제3자 제공업체(AWS 등 호스팅, Stripe 등 결제 모듈 등)에 의존합니다. 당사는 제3자 서비스의 중단, 오류, 데이터 유실 또는 해당 업체의 정책 변경으로 인해 발생하는 손해에 대해 어떠한 법적 책임도 지지 않습니다. 도메인 구매 및 갱신 관리 책임은 전적으로 고객에게 있습니다.',
          '당사와 고객은 상호 독립된 계약자(Independent Contractors)이며, 본 계약은 양 당사자 간의 파트너십, 합작 투자(Joint Venture), 고용 관계 또는 대리인 관계를 형성하지 않습니다. 고객 교회의 행위나 제3자와의 분쟁에 대해 당사는 아무런 연대 책임을 지지 않습니다.',
        ] },
        { h: '9. 서비스의 변경 및 가용성 제한', body: ['당사는 상시 안정적인 서비스를 제공하고자 노력하나, 본 서비스는 "있는 그대로(AS IS)" 및 "이용 가능한 상태로(AS AVAILABLE)" 제공됩니다. 당사는 예고 없는 시스템 점검, 인프라 장애 등으로 인한 서비스 중단에 대해 책임을 지지 않습니다. 당사는 서비스의 기능이나 디자인 스펙을 수시로 변경할 수 있습니다.'] },
        { h: '10. 해지 및 콘텐츠 백업 기간', body: [
          '고객 해지: 고객은 언제든지 계정 내 설정을 통해 해지 신청을 할 수 있으며, 해지 효력은 당해 청구 주기의 종료일에 발생합니다.',
          '당사 해지: 약관 위반 또는 제2조의 교리적 불합치 발생 시 당사는 즉시 서비스를 해지할 수 있습니다.',
          '데이터 삭제: 서비스 해지 후 당사는 고객 데이터를 즉시 또는 합리적 기간 내에 영구 삭제할 수 있으며, 해지 이후의 데이터 보존이나 백업 실패에 대한 책임을 지지 않습니다. 성격상 존속되어야 하는 면책, 책임 제한, 관할 합의 조항은 계약 해지 후에도 유효합니다.',
        ] },
        { h: '11. 책임의 제한 (LIMITATION OF LIABILITY)', body: ['법이 허용하는 최대 범위 내에서, 어떠한 경우에도 TRUE LIGHT, 그 임직원, 이사 또는 대리인은 본 서비스 이용으로 인해 발생하는 간접적, 부수적, 특별, 결과적, 또는 징벌적 손해(이익 손실, 데이터 유실, 비즈니스 중단 등을 포함하되 이에 제한되지 않음)에 대해 책임을 지지 않습니다. 본 약관과 관련하여 계약, 불법행위 또는 기타 책임 이론에 관계없이 당사가 부담하는 총 누적 책임은 청구 발생 직전 12개월 동안 귀하가 당사에 실제로 지불한 금액을 초과할 수 없습니다.'] },
        { h: '12. 면책보상 (INDEMNIFICATION)', body: ['귀하는 귀하가 업로드한 콘텐츠, 귀하의 서비스 이용 행위, 본 약관 또는 법령 위반, 또는 제3자의 권리(지식재산권 및 프라이버시권 포함) 침해로 인해 발생하는 모든 종류의 청구, 손해, 손실, 책임, 비용 및 비용(합리적인 변호사 비용 포함)으로부터 TRUE LIGHT와 그 임직원 및 하청업체를 완전히 면책하고 방어하며 손해를 보상하기로 합의합니다.'] },
        { h: '13. 준거법, 관할법원 및 집단소송 포기', body: [
          '준거법: 본 약관은 미국 조지아주(State of Georgia) 법률을 준거법으로 하며, 국제사법 원칙은 적용되지 않습니다.',
          '분쟁 해결 절차: 분쟁 발생 시 당사자들은 소송을 제기하기 전 30일 동안 성실히 비공식 협의를 진행해야 합니다. 합의에 도달하지 못할 경우, 모든 법적 소송은 조지아주 귀네트 카운티(Gwinnett County, Georgia) 소재 주 법원 또는 해당 관할 연방법원에만 제기할 수 있으며, 양 당사자는 해당 법원의 전속적 관할권에 동의합니다.',
          '집단소송 포기 (CLASS ACTION WAIVER): 법이 허용하는 범위 내에서 모든 청구는 개별적으로만 제기되어야 하며, 귀하는 당사를 상대로 집단소송(Class Action), 대표소송 또는 다수당사자 소송의 원고나 집단 구성원으로서 참여할 권리를 영구히 포기합니다.',
        ] },
        { h: '14. 약관의 변경', body: ['당사는 재량으로 본 약관을 수시로 변경할 수 있습니다. 약관이 변경되는 경우 최상단의 최종 수정일을 갱신하여 게시합니다. 약관 변경 효력 발생일 이후에도 서비스를 계속 이용하는 것은 수정된 약관에 동의한 것으로 간주됩니다.'] },
        { h: '15. 일반 조항', body: ['본 약관은 개인정보처리방침과 함께 당사와 고객 간의 완전한 합의(Entire Agreement)를 구성합니다. 당사가 본 약관의 특정 권리나 조항을 행사하지 않더라도 이는 해당 권리의 포기로 해석되지 않습니다. 본 약관의 일부 조항이 법원에 의해 무효로 판정되더라도, 나머지 조항들의 유효성은 그대로 유지됩니다.'] },
        { h: '16. 문의 및 연락처', body: ['공식 문의: info@dasomweb.com', '고객 지원: support@dasomweb.com'] },
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
