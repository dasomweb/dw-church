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

  if (services.length === 0) return null;

  return (
    <section className="px-6 py-16">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-8 text-center text-3xl font-bold font-heading">예배 안내</h2>
        <div className="overflow-hidden rounded-xl border border-gray-200">
          <table className="w-full">
            <thead>
              <tr style={{ backgroundColor: 'var(--dw-primary)' }}>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">예배</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">시간</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-white">장소</th>
              </tr>
            </thead>
            <tbody>
              {services.map((service, idx) => (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
                >
                  <td className="px-6 py-4 text-sm font-medium">{service.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{service.time}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{service.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
