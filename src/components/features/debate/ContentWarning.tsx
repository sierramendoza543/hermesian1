import { ContentWarningType } from '@/services/contentFilter'

interface ContentWarningProps {
  warnings: ContentWarningType[]
  onProceed: () => void
  onCancel: () => void
}

export default function ContentWarning({ warnings, onProceed, onCancel }: ContentWarningProps) {
  if (warnings.length === 0) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-xl font-bold text-red-600 mb-4">Content Warning</h3>
        <div className="mb-6">
          {warnings.map((warning, index) => (
            <p key={index} className="text-gray-700 mb-2">
              {warning.message}
            </p>
          ))}
          <p className="text-sm text-gray-500 mt-4">
            Please ensure you are comfortable with this content before proceeding.
          </p>
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onProceed}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Proceed
          </button>
        </div>
      </div>
    </div>
  )
} 