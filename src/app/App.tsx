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
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SponsorStatus | 'All'>('All');
  const [teamFilter, setTeamFilter] = useState<'All' | 'Unassigned' | string>('All');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [itemsPerPage] = useState(20);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<Sponsor | null>(null);

  const [isUploadConfirmOpen, setIsUploadConfirmOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isDbConnected, setIsDbConnected] = useState<boolean>(true); // Default to true, update on fetch

  // Debounce Search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on search change
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, teamFilter]);

  // Fetch Data when dependencies change
  useEffect(() => {
    const loadData = async () => {
      // Only set loading on initial load to avoid flicker during search/filter
      if (sponsors.length === 0 && !debouncedSearch && statusFilter === 'All' && teamFilter === 'All') {
        setIsLoading(true);
      }

      try {
        await Promise.all([fetchSponsors(), fetchTeams()]);
        fetchHealth();
      } catch (error) {
        console.error("Error loading data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [currentPage, debouncedSearch, statusFilter, teamFilter]);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setIsDbConnected(data.mongoConnected);
    } catch (e) {
      console.error("Health check failed", e);
      setIsDbConnected(false);
    }
  }

  const fetchSponsors = async (overrides?: { page?: number, search?: string, status?: string, team?: string }) => {
    try {
      // Use overrides if provided, otherwise use current state
      const page = overrides?.page !== undefined ? overrides.page : currentPage;
      const search = overrides?.search !== undefined ? overrides.search : debouncedSearch;
      const status = overrides?.status !== undefined ? overrides.status : statusFilter;
      const team = overrides?.team !== undefined ? overrides.team : teamFilter;

      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        search: search,
        status: status,
        team: team
      });

      const res = await fetch(`/api/sponsors?${params.toString()}`);

      // Check for DB connection header
      const dbHeader = res.headers.get('X-Database-Connected');
      if (dbHeader) {
        setIsDbConnected(dbHeader === 'true');
      }

      if (!res.ok) throw new Error('Network response was not ok');
      const data = await res.json();

      // Handle Paginated Response
      if (data.pagination) {
        setSponsors(data.sponsors);
        setTotalPages(data.pagination.pages);
        setTotalItems(data.pagination.total);
      } else if (Array.isArray(data)) {
        // Fallback for old API style (shouldn't happen with new backend)
        setSponsors(data);
        setTotalPages(1);
      } else {
        console.error('Received unexpected data format:', data);
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
      await response.json();

      // Clear filters and reset to page 1 to ensure the new sponsor is visible
      setSearchQuery('');
      setStatusFilter('All');
      setTeamFilter('All');
      setCurrentPage(1);

      // Explicitly fetch with cleaned parameters to avoid race conditions with state updates
      await fetchSponsors({ page: 1, search: '', status: 'All', team: 'All' });

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
      await response.json();

      // Fetch latest data to reflect changes
      await fetchSponsors();

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

      // Fetch latest data to fill the gap
      await fetchSponsors();
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

  // Client-side filtering removed - handled by backend
  // const filteredSponsors = ...

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
              alert(`Import successful! Added ${addedCount} sponsors. Skipped ${skippedCount}.`);
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
    <div className="min-h-screen bg-slate-50" >
      {/* Header */}
      < header className="bg-white border-b border-slate-200" >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl text-slate-900">Event Sponsors</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm text-slate-600">Manage and track your event sponsorship partnerships</p>
                {!isDbConnected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </span>
                    Offline Mode (Using Local Data)
                  </span>
                )}
                {isDbConnected && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                    Online
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-slate-500">
                Total Sponsors: <span className="text-slate-900">{totalItems}</span>
              </span>
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
      </header >

      {/* Main Content */}
      < main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" >
        {
          isLoading ? (
            <div className="space-y-8" >
              {/* Skeleton for Team Manager */}
              < div className="space-y-4" >
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
              < div className="flex flex-col sm:flex-row gap-4" >
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-32" />
              </div >

              {/* Skeleton for List */}
              < div className="space-y-4" >
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div >
            </div >
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
                sponsors={sponsors}
                onEdit={openEditModal}
                onDelete={handleDeleteSponsor}
                onAssignTeam={handleAssignTeam}
              />

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="relative ml-3 inline-flex items-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-700">
                          Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                        </p>
                        <select
                          value={currentPage}
                          onChange={(e) => setCurrentPage(Number(e.target.value))}
                          className="ml-2 block w-20 rounded-md border-0 py-1.5 pl-3 pr-8 text-gray-900 ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-indigo-600 sm:text-sm sm:leading-6"
                        >
                          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                            <option key={page} value={page}>
                              {page}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Previous</span>
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-slate-400 ring-1 ring-inset ring-slate-300 hover:bg-slate-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Next</span>
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {sponsors.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-slate-500">No sponsors found matching your criteria</p>
                </div>
              )}
            </>
          )
        }
      </main >

      {/* Add/Edit Modal */}
      < SponsorFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={(data) => {
          if ('id' in data) {
            handleEditSponsor(data as Sponsor);
          } else {
            handleAddSponsor(data);
          }
        }}
        sponsor={editingSponsor}
      />
      <UploadConfirmationDialog
        isOpen={isUploadConfirmOpen}
        onClose={() => { setIsUploadConfirmOpen(false); setSelectedFile(null); }}
        onConfirm={handleConfirmImport}
        fileName={selectedFile?.name || null}
        fileSize={selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : null}
      />
    </div >
  );
}
