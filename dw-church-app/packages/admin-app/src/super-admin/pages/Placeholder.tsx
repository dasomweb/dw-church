/**
 * Generic placeholder for super-admin tenant sections that haven't been
 * built yet. Each future phase replaces a specific instance via the App
 * router. Keeping all 13 stubs as one component avoids 13 throwaway
 * files cluttering the tree.
 */
interface PlaceholderProps { label: string; phase: string }

export default function Placeholder({ label, phase }: PlaceholderProps) {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="rounded-xl border border-dashed border-gray-300 p-12 text-center bg-white">
        <div className="text-4xl mb-3">🚧</div>
        <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
        <p className="mt-2 text-sm text-gray-500">
          이 섹션은 <code className="px-1.5 py-0.5 bg-gray-100 rounded text-xs">{phase}</code> 에서 완성됩니다.
        </p>
      </div>
    </div>
  );
}
