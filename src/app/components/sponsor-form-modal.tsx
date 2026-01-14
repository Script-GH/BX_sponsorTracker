import { useState, useEffect } from 'react';
import { Sponsor, SponsorStatus } from '@/app/App';
import { X } from 'lucide-react';

interface SponsorFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sponsor: Omit<Sponsor, 'id'> | Sponsor) => void;
  sponsor?: Sponsor | null;
}

export function SponsorFormModal({ isOpen, onClose, onSubmit, sponsor }: SponsorFormModalProps) {
  const [formData, setFormData] = useState({
    companyName: '',
    companyEmail: '',
    contactPerson: '',
    phoneNumber: '',
    location: '',
    notes: '',
    status: 'In Progress' as SponsorStatus
  });

  useEffect(() => {
    if (sponsor) {
      setFormData({
        companyName: sponsor.companyName,
        companyEmail: sponsor.companyEmail,
        contactPerson: sponsor.contactPerson,
        phoneNumber: sponsor.phoneNumber,
        location: sponsor.location,
        notes: sponsor.notes,
        status: sponsor.status
      });
    } else {
      setFormData({
        companyName: '',
        companyEmail: '',
        contactPerson: '',
        phoneNumber: '',
        location: '',
        notes: '',
        status: 'In Progress'
      });
    }
  }, [sponsor, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (sponsor) {
      onSubmit({ ...formData, id: sponsor.id });
    } else {
      onSubmit(formData);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">
            {sponsor ? 'Edit Sponsor' : 'Add New Sponsor'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Company Name */}
            <div className="md:col-span-2">
              <label htmlFor="companyName" className="block text-sm font-medium text-slate-700 mb-1">
                Company Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="companyName"
                required
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Tech Innovations Inc"
              />
            </div>

            {/* Company Email */}
            <div>
              <label htmlFor="companyEmail" className="block text-sm font-medium text-slate-700 mb-1">
                Company Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                id="companyEmail"
                required
                value={formData.companyEmail}
                onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="hello@company.com"
              />
            </div>

            {/* Contact Person */}
            <div>
              <label htmlFor="contactPerson" className="block text-sm font-medium text-slate-700 mb-1">
                Contact Person <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="contactPerson"
                required
                value={formData.contactPerson}
                onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., John Smith"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                id="phoneNumber"
                required
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-1">
                Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="location"
                required
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., San Francisco, CA"
              />
            </div>

            {/* Status */}
            <div className="md:col-span-2">
              <label htmlFor="status" className="block text-sm font-medium text-slate-700 mb-1">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                id="status"
                required
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as SponsorStatus })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="In Progress">In Progress</option>
                <option value="Contacted">Contacted</option>
                <option value="Completed">Completed</option>
                <option value="Follow-up Required">Follow-up Required</option>
              </select>
            </div>

            {/* Notes */}
            <div className="md:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
                Additional Contact Notes
              </label>
              <textarea
                id="notes"
                rows={4}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                placeholder="Add any relevant notes about this sponsor..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {sponsor ? 'Update Sponsor' : 'Add Sponsor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
