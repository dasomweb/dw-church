interface Service {
  name: string;
  time: string;
  location: string;
}

interface WorshipScheduleBlockProps {
  props: Record<string, unknown>;
  slug: string;
}

export function WorshipScheduleBlock({ props }: WorshipScheduleBlockProps) {
  const services = (props.services as Service[]) ?? [];
  const title = (props.title as string) || '예배 안내';

  if (services.length === 0) {
    return (
      <section className="px-4 py-10 sm:px-6 sm:py-16">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold font-heading">{title}</h2>
          <p className="text-gray-400 text-sm">예배 시간이 등록되지 않았습니다.</p>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">{title}</h2>
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[480px]">
            <thead>
              <tr style={{ backgroundColor: 'var(--dw-primary)' }}>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white sm:px-6 sm:py-4">예배</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white sm:px-6 sm:py-4">시간</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-white sm:px-6 sm:py-4">장소</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service, idx) => (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-4 py-3 text-sm font-medium sm:px-6 sm:py-4">{service.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 sm:px-6 sm:py-4">{service.time}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 sm:px-6 sm:py-4">{service.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
