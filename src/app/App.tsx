import { useState, useEffect } from 'react';
import { SponsorList } from '@/app/components/sponsor-list';
import { SponsorFormModal } from '@/app/components/sponsor-form-modal';
import { UploadConfirmationDialog } from '@/app/components/UploadConfirmationDialog';
import { TeamManager, Team } from '@/app/components/team-manager';
import { Skeleton } from '@/app/components/ui/skeleton';
import { Search, Plus } from 'lucide-react';

export type SponsorStatus = 'In Progress' | 'Contacted' | 'Completed' | 'Follow-up Required' | 'Not Interested' | 'Cold Mail' | 'Cold Call';

export interface Sponsor {
  id: string;
  companyName: string;
  sector: string;
  companyEmail: string;
  contactPerson: string;
  poc?: string;
  phoneNumber: string;
  location: string;
  notes: string;
  status: SponsorStatus;
  assignedTeam?: Team | string;
}

export default function App() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<SponsorStatus | 'All'>('All');
  const [teamFilter, setTeamFilter] = useState<'All' | 'Unassigned' | string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);

  const [isUploadConfirmOpen, setIsUploadConfirmOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchSponsors(), fetchTeams()]);
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const fetchSponsors = async () => {
    try {
      const res = await fetch('/api/sponsors');
      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();
      if (Array.isArray(data)) {
        setSponsors(data);
      } else {
        console.error('Received non-array data:', data);
        setSponsors([]);
      }
    } catch (err) {
      console.error('Error fetching sponsors:', err);
      setSponsors([]);
    }
  };

  const fetchTeams = async () => {
    try {
      const res = await fetch('/api/teams');
      const data = await res.json();
      if (Array.isArray(data)) setTeams(data);
    } catch (err) {
      console.error('Error fetching teams:', err);
    }
  };

  // ... (rest of the handlers: handleAddSponsor, handleEditSponsor, handleDeleteSponsor, handleAddTeam, handleAssignTeam, openEditModal, closeModal, filteredSponsors, handleFileSelect, handleConfirmImport) 

  const handleAddSponsor = async (sponsor: Omit<Sponsor, 'id'>) => {
    try {
      const response = await fetch('/api/sponsors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sponsor),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to add sponsor');
      }
      const newSponsor = await response.json();
      // Ensure we don't duplicate (though typically we append)
      // Re-fetch to accept any population logic or just append
      setSponsors([...sponsors, newSponsor]);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error adding sponsor:', error);
      alert(`Error: ${error.message || 'Failed to add sponsor'}. Make sure the backend is running and connected to MongoDB.`);
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

  const handleAddTeam = async (team: Omit<Team, 'id'>) => {
    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(team),
      });
      if (!response.ok) throw new Error('Failed to add team');
      const newTeam = await response.json();
      setTeams([...teams, newTeam]);
    } catch (error) {
      console.error('Error adding team:', error);
      alert('Failed to add team');
    }
  };

  const handleAssignTeam = async (sponsorId: string) => {
    if (teams.length === 0) {
      alert("No teams available. Please add a team to the manager first.");
      return;
    }

    const randomTeam = teams[Math.floor(Math.random() * teams.length)];

    try {
      const response = await fetch(`/api/sponsors/${sponsorId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTeam: randomTeam.id }),
      });

      if (!response.ok) throw new Error('Failed to assign team');

      const updatedSponsor = await response.json();
      setSponsors(sponsors.map(s => s.id === sponsorId ? updatedSponsor : s));
    } catch (error) {
      console.error('Error assigning team:', error);
      alert('Failed to assign team');
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

    let matchesTeam = true;
    if (teamFilter !== 'All') {
      if (teamFilter === 'Unassigned') {
        matchesTeam = !sponsor.assignedTeam;
      } else {
        matchesTeam = typeof sponsor.assignedTeam !== 'string' && sponsor.assignedTeam?.id === teamFilter;
      }
    }

    return matchesSearch && matchesStatus && matchesTeam;
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setIsUploadConfirmOpen(true);
    }
    // Reset input so same file can be selected again if needed
    e.target.value = '';
  };

  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    setIsUploadConfirmOpen(false);

    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();

      reader.onload = async (evt) => {
        try {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: 'binary' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const data = XLSX.utils.sheet_to_json(ws);

          const sponsorsToImport: any[] = [];

          for (const row of data as any[]) {
            const companyName = row['Company Name'] || row['Name'] || row['Company'];
            if (!companyName) continue;

            sponsorsToImport.push({
              companyName: companyName,
              sector: row['Sector'] || row['Industry'] || 'Unknown',
              companyEmail: row['Email'] || row['Company Email'] || '',
              contactPerson: row['Contact Person'] || row['Contact'] || row['Name'] || row['Full Name'] || row['Name of contact'] || '',
              phoneNumber: row['Phone'] || row['Mobile'] || row['Phone number'] || row['Phone Number'] || '',
              location: row['Location'] || row['City'] || '',
              notes: row['Notes'] || '',
              status: 'In Progress' as SponsorStatus
            });
          }

          let addedCount = 0;
          let skippedCount = 0;

          if (sponsorsToImport.length > 0) {
            const response = await fetch('/api/sponsors/bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(sponsorsToImport),
            });

            if (response.ok) {
              const result = await response.json();
              addedCount = result.added;
              skippedCount = result.skipped;
            }
          }

          // Refresh list from backend to ensure consistency
          await fetchSponsors();

          setSelectedFile(null); // Clear file after success

        } catch (err) {
          console.error("Error processing excel:", err);
          alert("Error processing Excel file.");
        }
      };
      reader.readAsBinaryString(selectedFile);
    } catch (err) {
      console.error("Error importing xlsx:", err);
      alert("Failed to load Excel parser.");
    }
  };

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
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                disabled={isLoading}
              >
                <Plus className="w-5 h-5" />
                Add Sponsor
              </button>
              <div className="relative">
                <input
                  type="file"
                  accept=".xlsx, .xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="excel-upload"
                  disabled={isLoading}
                />
                <label
                  htmlFor="excel-upload"
                  className={`inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M8 13h8" /><path d="M8 17h8" /><path d="M10 9h4" /></svg>
                  Import Excel
                </label>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="space-y-8">
            {/* Skeleton for Team Manager */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-8 w-24" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>

            {/* Skeleton for Search/Filter */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Skeleton className="h-10 flex-1" />
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-32" />
            </div>

            {/* Skeleton for List */}
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ) : (
          <>
            {/* Team Manager Section */}
            <TeamManager teams={teams} onAddTeam={handleAddTeam} />

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
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              >
                <option value="All">All Teams</option>
                <option value="Unassigned">Unassigned</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
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
                <option value="Not Interested">Not Interested</option>
                <option value="Cold Mail">Cold Mail</option>
                <option value="Cold Call">Cold Call</option>
              </select>
            </div>

            {/* Sponsors List */}
            <SponsorList
              sponsors={filteredSponsors}
              onEdit={openEditModal}
              onDelete={handleDeleteSponsor}
              onAssignTeam={handleAssignTeam}
            />

            {/* Empty State */}
            {filteredSponsors.length === 0 && (
              <div className="text-center py-12">
                <p className="text-slate-500">No sponsors found matching your criteria</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Add/Edit Modal */}
      <SponsorFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={editingSponsor ? handleEditSponsor : handleAddSponsor}
        sponsor={editingSponsor}
      />
      <UploadConfirmationDialog
        isOpen={isUploadConfirmOpen}
        onClose={() => { setIsUploadConfirmOpen(false); setSelectedFile(null); }}
        onConfirm={handleConfirmImport}
        fileName={selectedFile?.name || null}
        fileSize={selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : null}
      />
    </div>
  );
}
