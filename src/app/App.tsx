import { useState } from 'react';
import { SponsorList } from '@/app/components/sponsor-list';
import { SponsorFormModal } from '@/app/components/sponsor-form-modal';
import { Search, Plus } from 'lucide-react';

export type SponsorStatus = 'In Progress' | 'Contacted' | 'Completed' | 'Follow-up Required';

export interface Sponsor {
  id: string;
  companyName: string;
  companyEmail: string;
  contactPerson: string;
  phoneNumber: string;
  location: string;
  notes: string;
  status: SponsorStatus;
}

export default function App() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SponsorStatus | 'All'>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);

  const handleAddSponsor = (sponsor: Omit<Sponsor, 'id'>) => {
    const newSponsor: Sponsor = {
      ...sponsor,
      id: Date.now().toString()
    };
    setSponsors([...sponsors, newSponsor]);
    setIsModalOpen(false);
  };

  const handleEditSponsor = (sponsor: Sponsor) => {
    setSponsors(sponsors.map(s => s.id === sponsor.id ? sponsor : s));
    setIsModalOpen(false);
    setEditingSponsor(null);
  };

  const handleDeleteSponsor = (id: string) => {
    setSponsors(sponsors.filter(s => s.id !== id));
  };

  const openEditModal = (sponsor: Sponsor) => {
    setEditingSponsor(sponsor);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSponsor(null);
  };

  const filteredSponsors = sponsors.filter(sponsor => {
    const matchesSearch = sponsor.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sponsor.contactPerson.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || sponsor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl text-slate-900">Event Sponsors</h1>
              <p className="mt-1 text-sm text-slate-600">Manage and track your event sponsorship partnerships</p>
            </div>
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Sponsor
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by company or contact name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SponsorStatus | 'All')}
            className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="All">All Statuses</option>
            <option value="In Progress">In Progress</option>
            <option value="Contacted">Contacted</option>
            <option value="Completed">Completed</option>
            <option value="Follow-up Required">Follow-up Required</option>
          </select>
        </div>

        {/* Sponsors List */}
        <SponsorList
          sponsors={filteredSponsors}
          onEdit={openEditModal}
          onDelete={handleDeleteSponsor}
        />

        {/* Empty State */}
        {filteredSponsors.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">No sponsors found matching your criteria</p>
          </div>
        )}
      </main>

      {/* Add/Edit Modal */}
      <SponsorFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={editingSponsor ? handleEditSponsor : handleAddSponsor}
        sponsor={editingSponsor}
      />
    </div>
  );
}
