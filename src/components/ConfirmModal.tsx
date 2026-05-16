'use client';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  type?: 'delete' | 'add' | 'confirm';
}

export default function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel, loading, type = 'delete' }: Props) {
  const config = {
    delete: {
      icon: '🗑️',
      defaultLabel: 'Delete',
      loadingLabel: 'Deleting...',
      buttonColor: '#e63946',
      borderColor: '#fecaca'
    },
    add: {
      icon: '➕',
      defaultLabel: 'Add',
      loadingLabel: 'Adding...',
      buttonColor: '#2a9d8f',
      borderColor: '#99f6e4'
    },
    confirm: {
      icon: '✓',
      defaultLabel: 'Confirm',
      loadingLabel: 'Processing...',
      buttonColor: '#457b9d',
      borderColor: '#bfdbfe'
    }
  };

  const cfg = config[type];
  const label = confirmLabel || cfg.defaultLabel;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{ background: 'rgba(15,23,42,0.6)' }}
      onClick={onCancel}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        style={{ border: `1.5px solid ${cfg.borderColor}` }}
        onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">{cfg.icon}</div>
          <h3 className="font-black text-lg mb-2" style={{ color: '#1d3557' }}>{title}</h3>
          <p className="text-sm" style={{ color: '#6b7a8d' }}>{message}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white hover:opacity-90 disabled:opacity-50 transition"
            style={{ background: cfg.buttonColor }}>
            {loading ? cfg.loadingLabel : label}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition"
            style={{ color: '#6b7a8d', border: '1.5px solid #d0dce8' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
