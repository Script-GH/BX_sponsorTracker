import { useState, useEffect } from 'react';
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

  useEffect(() => {
    fetch('/api/sponsors')
      .then(res => res.json())
      .then(data => setSponsors(data))
      .catch(err => console.error('Error fetching sponsors:', err));
  }, []);

  const handleAddSponsor = async (sponsor: Omit<Sponsor, 'id'>) => {
    try {
      const response = await fetch('/api/sponsors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sponsor),
      });
      if (!response.ok) throw new Error('Failed to add sponsor');
      const newSponsor = await response.json();
      setSponsors([...sponsors, newSponsor]);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error adding sponsor:', error);
      alert('Failed to add sponsor');
    }
  };

  const handleEditSponsor = async (sponsor: Sponsor) => {
    try {
      const response = await fetch(`/api/sponsors/${sponsor.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sponsor),
      });
      if (!response.ok) throw new Error('Failed to update sponsor');
      const updatedSponsor = await response.json();
      setSponsors(sponsors.map(s => s.id === sponsor.id ? updatedSponsor : s));
      setIsModalOpen(false);
      setEditingSponsor(null);
    } catch (error) {
      console.error('Error updating sponsor:', error);
      alert('Failed to update sponsor');
    }
  };

  const handleDeleteSponsor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this sponsor?')) return;
    try {
      const response = await fetch(`/api/sponsors/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete sponsor');
      setSponsors(sponsors.filter(s => s.id !== id));
    } catch (error) {
      console.error('Error deleting sponsor:', error);
      alert('Failed to delete sponsor');
    }
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
