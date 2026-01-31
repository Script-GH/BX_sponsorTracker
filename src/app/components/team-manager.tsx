import { useState } from 'react';
import { Plus, Users } from 'lucide-react';

export interface Team {
    id: string;
    name: string;
    members: string[];
}

interface TeamManagerProps {
    teams: Team[];
    onAddTeam: (team: Omit<Team, 'id'>) => Promise<void>;
}

export function TeamManager({ teams, onAddTeam }: TeamManagerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamMembers, setNewTeamMembers] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTeamName.trim()) return;

        setIsSubmitting(true);
        try {
            const members = newTeamMembers
                .split(',')
                .map(m => m.trim())
                .filter(m => m.length > 0);

            await onAddTeam({
                name: newTeamName,
                members
            });

            setNewTeamName('');
            setNewTeamMembers('');
            setIsOpen(false);
        } catch (error) {
            console.error('Error adding team:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    Teams
                </h2>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                    {isOpen ? 'Cancel' : '+ Add New Team'}
                </button>
            </div>

            {isOpen && (
                <form onSubmit={handleSubmit} className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Team Name
                            </label>
                            <input
                                type="text"
                                value={newTeamName}
                                onChange={(e) => setNewTeamName(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. Alpha Squad"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Members (comma separated)
                            </label>
                            <input
                                type="text"
                                value={newTeamMembers}
                                onChange={(e) => setNewTeamMembers(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g. John, Sarah, Mike"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Adding...' : 'Add Team'}
                        </button>
                    </div>
                </form>
            )}

            {teams.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No teams created yet.</p>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {teams.map((team) => (
                        <div key={team.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50">
                            <div className="font-medium text-slate-900">{team.name}</div>
                            <div className="text-xs text-slate-600 mt-1">
                                {team.members.length > 0 ? team.members.join(', ') : 'No members'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
