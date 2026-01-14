import { Sponsor, SponsorStatus } from '@/app/App';
import { Mail, Phone, MapPin, Edit2, Trash2, FileText } from 'lucide-react';

interface SponsorListProps {
  sponsors: Sponsor[];
  onEdit: (sponsor: Sponsor) => void;
  onDelete: (id: string) => void;
}

const statusColors: Record<SponsorStatus, { bg: string; text: string; border: string }> = {
  'In Progress': {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200'
  },
  'Contacted': {
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200'
  },
  'Completed': {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200'
  },
  'Follow-up Required': {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200'
  }
};

function StatusBadge({ status }: { status: SponsorStatus }) {
  const colors = statusColors[status];
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}>
      {status}
    </span>
  );
}

export function SponsorList({ sponsors, onEdit, onDelete }: SponsorListProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Company
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Location
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-slate-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-slate-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {sponsors.map((sponsor) => (
              <tr key={sponsor.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-900">{sponsor.companyName}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-600">{sponsor.companyEmail}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-900">{sponsor.contactPerson}</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span className="text-xs text-slate-600">{sponsor.phoneNumber}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-700">{sponsor.location}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={sponsor.status} />
                  {sponsor.notes && (
                    <div className="flex items-start gap-1 mt-2 text-xs text-slate-600">
                      <FileText className="w-3 h-3 text-slate-400 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{sponsor.notes}</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => onEdit(sponsor)}
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit sponsor"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDelete(sponsor.id)}
                      className="p-2 text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete sponsor"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
