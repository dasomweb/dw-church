import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDWChurchClient } from '@dw-church/api-client';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '../components';

// ─── Block visual preview components ────────────────────────

interface BlockProps { props: Record<string, unknown> }

function HeroBannerPreview({ props }: BlockProps) {
  return (
    <div className="bg-gradient-to-br from-indigo-600 to-purple-700 text-white rounded-lg px-8 py-12 text-center">
      <h2 className="text-2xl font-bold">{String(props.title || '히어로 배너')}</h2>
      {props.subtitle && <p className="text-sm opacity-80 mt-2">{String(props.subtitle)}</p>}
    </div>
  );
}

function TextImagePreview({ props }: BlockProps) {
  return (
    <div className="flex gap-4 items-start p-4 bg-white border rounded-lg">
      <div className="flex-1">
        <h3 className="text-sm font-bold text-gray-800">{String(props.title || '제목')}</h3>
        <p className="text-xs text-gray-500 mt-1 line-clamp-3">{String(props.content || '텍스트 내용이 여기에 표시됩니다.')}</p>
      </div>
      <div className="w-24 h-16 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center text-gray-400 text-xs">이미지</div>
    </div>
  );
}

function TextOnlyPreview({ props }: BlockProps) {
  return (
    <div className="p-4 bg-white border rounded-lg">
      <h3 className="text-sm font-bold text-gray-800">{String(props.title || '제목')}</h3>
      <p className="text-xs text-gray-500 mt-1 line-clamp-3">{String(props.content || '텍스트 내용이 여기에 표시됩니다.')}</p>
    </div>
  );
}

function PastorMessagePreview({ props }: BlockProps) {
  return (
    <div className="flex gap-4 items-start p-4 bg-white border rounded-lg">
      <div className="w-16 h-20 bg-gray-200 rounded flex-shrink-0 flex items-center justify-center text-gray-400 text-[10px]">사진</div>
      <div className="flex-1">
        <h3 className="text-sm font-bold text-gray-800">{String(props.title || '담임목사 인사말')}</h3>
        {props.name && <p className="text-xs text-purple-600 font-medium">{String(props.name)}</p>}
        <p className="text-xs text-gray-500 mt-1 line-clamp-3">{String(props.message || props.content || '인사말 내용')}</p>
      </div>
    </div>
  );
}

function WorshipTimesPreview({ props }: BlockProps) {
  const services = (props.services as { name: string; time?: string; day?: string }[]) || [];
  return (
    <div className="p-4 bg-white border rounded-lg">
      <h3 className="text-sm font-bold text-gray-800 mb-2">{String(props.title || '예배 시간')}</h3>
      <div className="space-y-1">
        {services.slice(0, 5).map((s, i) => (
          <div key={i} className="flex justify-between text-xs">
            <span className="text-gray-700">{s.name}</span>
            <span className="text-gray-400">{s.day} {s.time}</span>
          </div>
        ))}
        {services.length === 0 && <p className="text-xs text-gray-400">예배 시간이 여기에 표시됩니다</p>}
      </div>
    </div>
  );
}

function GridPreview({ props, label }: BlockProps & { label: string }) {
  const limit = Number(props.limit) || 4;
  const cols = String(props.variant || '').includes('4') ? 4 : String(props.variant || '').includes('2') ? 2 : 3;
  return (
    <div className="p-4 bg-white border rounded-lg">
      <h3 className="text-sm font-bold text-gray-800 mb-2">{String(props.title || label)}</h3>
      <div className={`grid gap-2 grid-cols-${cols}`}>
        {Array.from({ length: Math.min(limit, 8) }).map((_, i) => (
          <div key={i} className="bg-gray-100 rounded h-12 flex items-center justify-center text-[10px] text-gray-400">{label} {i + 1}</div>
        ))}
      </div>
    </div>
  );
}

function LocationPreview({ props }: BlockProps) {
  return (
    <div className="p-4 bg-white border rounded-lg">
      <h3 className="text-sm font-bold text-gray-800 mb-2">{String(props.title || '오시는 길')}</h3>
      <div className="bg-gray-200 rounded h-24 flex items-center justify-center text-xs text-gray-400">Google Maps</div>
      {props.address && <p className="text-xs text-gray-500 mt-2">{String(props.address)}</p>}
    </div>
  );
}

function ContactPreview({ props }: BlockProps) {
  return (
    <div className="p-4 bg-white border rounded-lg">
      <h3 className="text-sm font-bold text-gray-800 mb-2">{String(props.title || '연락처')}</h3>
      <div className="space-y-1 text-xs text-gray-500">
        {props.phone && <p>{String(props.phone)}</p>}
        {props.email && <p>{String(props.email)}</p>}
        {props.address && <p>{String(props.address)}</p>}
      </div>
    </div>
  );
}

function BoardPreview({ props }: BlockProps) {
  return (
    <div className="p-4 bg-white border rounded-lg">
      <h3 className="text-sm font-bold text-gray-800 mb-2">{String(props.title || '게시판')}</h3>
      <div className="space-y-1">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex justify-between text-xs border-b border-gray-50 py-1">
            <span className="text-gray-500">게시글 {i}</span>
            <span className="text-gray-300">2026.04.0{i}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DividerPreview() {
  return <div className="border-t border-gray-200 my-2" />;
}

function QuotePreview({ props }: BlockProps) {
  return (
    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center">
      <p className="text-xs text-amber-800 italic line-clamp-2">{String(props.content || '성경구절이 여기에 표시됩니다')}</p>
      {props.title && <p className="text-[10px] text-amber-600 mt-1">— {String(props.title)}</p>}
    </div>
  );
}

function GenericPreview({ props, blockType }: BlockProps & { blockType: string }) {
  return (
    <div className="p-3 bg-gray-50 border border-dashed border-gray-300 rounded-lg">
      <span className="text-[10px] font-mono text-gray-400">{blockType}</span>
      {props.title && <p className="text-xs text-gray-600 mt-1">{String(props.title)}</p>}
    </div>
  );
}

// ─── Block preview router ───────────────────────────────────

function BlockPreview({ blockType, props }: { blockType: string; props: Record<string, unknown> }) {
  switch (blockType) {
    case 'hero_banner': case 'hero_full_width': return <HeroBannerPreview props={props} />;
    case 'text_image': case 'church_intro': case 'mission_vision': case 'newcomer_info': return <TextImagePreview props={props} />;
    case 'text_only': return <TextOnlyPreview props={props} />;
    case 'pastor_message': return <PastorMessagePreview props={props} />;
    case 'worship_times': case 'worship_schedule': return <WorshipTimesPreview props={props} />;
    case 'recent_sermons': return <GridPreview props={props} label="설교" />;
    case 'recent_bulletins': return <GridPreview props={props} label="주보" />;
    case 'recent_columns': return <GridPreview props={props} label="칼럼" />;
    case 'album_gallery': return <GridPreview props={props} label="앨범" />;
    case 'staff_grid': return <GridPreview props={props} label="교역자" />;
    case 'event_grid': return <GridPreview props={props} label="행사" />;
    case 'history_timeline': return <GridPreview props={props} label="연혁" />;
    case 'location_map': case 'map_embed': return <LocationPreview props={props} />;
    case 'contact_info': case 'address_info': return <ContactPreview props={props} />;
    case 'board': return <BoardPreview props={props} />;
    case 'divider': return <DividerPreview />;
    case 'quote_block': return <QuotePreview props={props} />;
    default: return <GenericPreview props={props} blockType={blockType} />;
  }
}

// ─── Wizard categories ──────────────────────────────────────

const CATEGORIES = [
  { icon: '⛪', title: '교회 안내', color: 'blue', pages: [
    { label: '인사말', desc: '담임목사 인사말과 비전', prompt: '담임목사 인사말 페이지를 만들어줘. 담임목사 프로필 사진과 인사말, 비전/사명 선언문을 포함해줘' },
    { label: '교회 소개', desc: '교회 소개, 비전, 표어', prompt: '교회 소개 페이지를 만들어줘. 교회 소개 텍스트와 이미지, 비전/미션, 교회 표어 성경구절을 포함해줘' },
    { label: '교회 역사', desc: '연혁 타임라인', prompt: '교회 역사 페이지를 만들어줘. 연도별 타임라인과 교회 사진을 포함해줘' },
    { label: '교역자 소개', desc: '교역자 그리드', prompt: '교역자 소개 페이지를 만들어줘. 교역자 그리드(4열)를 포함해줘' },
    { label: '신앙고백', desc: '신앙고백, 핵심가치', prompt: '신앙고백과 비전 페이지를 만들어줘. 신앙고백 본문, 핵심가치, 비전 성경구절을 포함해줘' },
    { label: '오시는 길', desc: '지도, 주차, 교통', prompt: '오시는 길 페이지를 만들어줘. 구글맵 지도, 주소, 연락처, 주차 안내를 포함해줘' },
  ]},
  { icon: '🙏', title: '예배 및 모임', color: 'purple', pages: [
    { label: '예배 시간표', desc: '예배 종류별 시간/장소', prompt: '예배 안내 페이지를 만들어줘. 예배 시간표(주일1부, 주일2부, 수요예배, 금요기도), 특별예배 공지를 포함해줘' },
    { label: '주보', desc: '주보 PDF 목록', prompt: '주보 페이지를 만들어줘. 주보 목록(12개, 4열 그리드)을 포함해줘' },
    { label: '새가족 안내', desc: '환영, 등록, 안내', prompt: '새가족 안내 페이지를 만들어줘. 환영 메시지, 등록 절차, 예배 시간, 오시는 길을 포함해줘' },
  ]},
  { icon: '👥', title: '사역 부서', color: 'green', pages: [
    { label: '아동부/주일학교', desc: '교육철학, 일정, 등록', prompt: '아동부/주일학교 소개 페이지를 만들어줘. 교육철학, 행사 일정, 등록 게시판을 포함해줘' },
    { label: '청년부', desc: '소개, 갤러리, 게시판', prompt: '청년부 소개 페이지를 만들어줘. 부서 소개, 활동 사진 갤러리, 게시판을 포함해줘' },
    { label: '장년부/구역', desc: '구역 목록, 성경공부', prompt: '장년부/구역 소개 페이지를 만들어줘. 구역 목록, 성경공부 일정, 게시판을 포함해줘' },
    { label: '선교부', desc: '선교지, 후원, 소식', prompt: '선교부 페이지를 만들어줘. 선교지 현황, 후원 안내, 소식 게시판을 포함해줘' },
  ]},
  { icon: '📺', title: '미디어', color: 'red', pages: [
    { label: '설교 영상', desc: 'YouTube 설교 목록', prompt: '설교 영상 페이지를 만들어줘. 설교 목록(12개, 4열 그리드)을 포함해줘' },
    { label: '갤러리', desc: '앨범 사진 목록', prompt: '갤러리 페이지를 만들어줘. 앨범 목록(12개, 4열 그리드)을 포함해줘' },
    { label: '찬양/악보', desc: '악보 PDF 게시판', prompt: '찬양과 악보 페이지를 만들어줘. 찬양 목록 게시판을 포함해줘' },
    { label: '목회칼럼', desc: '칼럼 목록', prompt: '목회칼럼 페이지를 만들어줘. 칼럼 목록(12개, 3열 그리드)을 포함해줘' },
  ]},
  { icon: '🤝', title: '공동체', color: 'yellow', pages: [
    { label: '공지사항', desc: '공지 게시판', prompt: '공지사항 페이지를 만들어줘. 공지 게시판을 포함해줘' },
    { label: '교회 소식', desc: '소식 카드 목록', prompt: '교회 소식 페이지를 만들어줘. 소식 목록(12개, 3열 카드)을 포함해줘' },
    { label: '기도 요청', desc: '기도 요청 게시판', prompt: '기도 요청 페이지를 만들어줘. 안내 텍스트와 기도 요청 게시판을 포함해줘' },
    { label: '새가족 등록', desc: '등록 안내, 이중 언어', prompt: '새가족 등록 페이지를 만들어줘. 환영 메시지, 등록 절차, 예배시간, 오시는 길을 포함해줘' },
  ]},
  { icon: '💝', title: '연락/헌금', color: 'pink', pages: [
    { label: '연락처', desc: '교회 정보, 지도', prompt: '연락처 페이지를 만들어줘. 교회 정보, 구글맵 지도, 문의 안내를 포함해줘' },
    { label: '온라인 헌금', desc: 'Zelle/Venmo/Check', prompt: '온라인 헌금 페이지를 만들어줘. 헌금 종류, Zelle/Venmo/Check 안내를 포함해줘' },
  ]},
];

type WizardStep = 'select' | 'preview' | 'creating';

// ═══════════════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════════════

export default function PageWizard() {
  const navigate = useNavigate();
  const { slug = '' } = useParams<{ slug: string }>();
  const apiClient = useDWChurchClient();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [step, setStep] = useState<WizardStep>('select');
  const [loading, setLoading] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [customPrompt, setCustomPrompt] = useState('');
  const [preview, setPreview] = useState<{ title: string; slug: string; blocks: { blockType: string; props: Record<string, unknown> }[] } | null>(null);

  const handleSelect = async (prompt: string, label: string) => {
    setSelectedPrompt(prompt);
    setSelectedLabel(label);
    setLoading(true);
    setStep('preview');
    try {
      const res = await apiClient.adapter.post<{ data: { title: string; slug: string; blocks: { blockType: string; props: Record<string, unknown> }[] } }>('/ai/generate-page/preview', { prompt });
      setPreview(res.data);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'AI 생성 실패');
      setStep('select');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    setStep('creating');
    setLoading(true);
    try {
      const res = await apiClient.adapter.post<{ data: { page: { id: string; title: string; slug: string }; sections: number } }>('/ai/generate-page', { prompt: selectedPrompt });
      showToast('success', `"${res.data.page.title}" 페이지가 생성되었습니다`);
      queryClient.invalidateQueries({ queryKey: ['pages'] });
      navigate(`/t/${slug}/pages`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : '페이지 생성 실패');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  const handleCustom = async () => {
    if (!customPrompt.trim()) return;
    await handleSelect(customPrompt, '커스텀 페이지');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">페이지 마법사</h1>
        <p className="text-sm text-gray-500 mt-1">
          {step === 'select' && '추가할 페이지를 선택하세요. AI가 블록을 자동 구성합니다.'}
          {step === 'preview' && '블록 구성을 확인하고 생성하세요.'}
          {step === 'creating' && '페이지를 생성하고 있습니다...'}
        </p>
      </div>

      {/* Step: Select */}
      {step === 'select' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CATEGORIES.map((cat) => (
              <div key={cat.title} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b">
                  <h3 className="text-sm font-bold text-gray-800">{cat.icon} {cat.title}</h3>
                </div>
                <div className="p-2">
                  {cat.pages.map((pg) => (
                    <button
                      key={pg.label}
                      onClick={() => handleSelect(pg.prompt, pg.label)}
                      disabled={loading}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-purple-50 transition-colors group disabled:opacity-50"
                    >
                      <span className="text-sm font-medium text-gray-800 group-hover:text-purple-700">{pg.label}</span>
                      <p className="text-xs text-gray-400 mt-0.5">{pg.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Custom prompt */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-bold text-gray-800 mb-2">직접 설명하기</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="원하는 페이지를 자유롭게 설명하세요..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                onKeyDown={(e) => { if (e.key === 'Enter') handleCustom(); }}
              />
              <button
                onClick={handleCustom}
                disabled={loading || !customPrompt.trim()}
                className="bg-purple-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                생성
              </button>
            </div>
          </div>
        </>
      )}

      {/* Step: Preview — visual block mockup */}
      {step === 'preview' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => { setStep('select'); setPreview(null); }} className="text-sm text-gray-500 hover:text-gray-700">&larr; 다시 선택</button>
            <span className="text-sm text-gray-400">|</span>
            <span className="text-sm font-medium text-purple-600">{selectedLabel}</span>
          </div>

          {loading ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <div className="w-8 h-8 border-3 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-gray-500">AI가 블록을 구성하고 있습니다...</p>
            </div>
          ) : preview ? (
            <>
              {/* Visual page preview */}
              <div className="bg-gray-100 rounded-xl border border-gray-300 overflow-hidden">
                {/* Browser frame */}
                <div className="bg-gray-200 px-4 py-2 flex items-center gap-2 border-b">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-white rounded px-3 py-0.5 text-xs text-gray-400 text-center">
                    yourchurch.truelight.app/{preview.slug}
                  </div>
                </div>

                {/* Page content preview */}
                <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
                  <div className="text-center mb-2">
                    <h2 className="text-lg font-bold text-gray-800">{preview.title}</h2>
                  </div>
                  {preview.blocks.map((block, i) => (
                    <BlockPreview key={i} blockType={block.blockType} props={block.props} />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => handleSelect(selectedPrompt, selectedLabel)}
                  disabled={loading}
                  className="px-4 py-2.5 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 disabled:opacity-50"
                >
                  다시 생성
                </button>
                <button
                  onClick={handleCreate}
                  disabled={loading}
                  className="flex-1 bg-purple-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-purple-700 disabled:opacity-50"
                >
                  이 구성으로 페이지 생성
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Step: Creating */}
      {step === 'creating' && (
        <div className="bg-white rounded-xl border p-12 text-center">
          <div className="w-10 h-10 border-3 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h3 className="text-base font-bold text-gray-800">페이지를 생성하고 있습니다</h3>
          <p className="text-sm text-gray-500 mt-1">블록을 등록하고 페이지를 구성 중입니다...</p>
        </div>
      )}
    </div>
  );
}
