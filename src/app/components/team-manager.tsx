import { useState } from 'react';
import { Plus, Users, Pencil, Trash2, X, Check } from 'lucide-react';

export interface Team {
    id: string;
    name: string;
    members: string[];
}

interface TeamManagerProps {
    teams: Team[];
    onAddTeam: (team: Omit<Team, 'id'>) => Promise<void>;
    onEditTeam: (team: Team) => Promise<void>;
    onDeleteTeam: (id: string) => Promise<void>;
}

export function TeamManager({ teams, onAddTeam, onEditTeam, onDeleteTeam }: TeamManagerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [newTeamName, setNewTeamName] = useState('');
    const [newTeamMembers, setNewTeamMembers] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Edit state
    const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editMembers, setEditMembers] = useState('');

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

    const startEditing = (team: Team) => {
        setEditingTeamId(team.id);
        setEditName(team.name);
        setEditMembers(team.members.join(', '));
    };

    const cancelEditing = () => {
        setEditingTeamId(null);
        setEditName('');
        setEditMembers('');
    };

    const saveEdit = async (id: string) => {
        if (!editName.trim()) return;

        try {
            const members = editMembers
                .split(',')
                .map(m => m.trim())
                .filter(m => m.length > 0);

            await onEditTeam({
                id,
                name: editName,
                members
            });
            setEditingTeamId(null);
        } catch (error) {
            console.error('Error updating team:', error);
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
                        <div key={team.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50 group hover:border-blue-200 transition-colors">
                            {editingTeamId === team.id ? (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500"
                                        placeholder="Team Name"
                                    />
                                    <input
                                        type="text"
                                        value={editMembers}
                                        onChange={(e) => setEditMembers(e.target.value)}
                                        className="w-full px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:border-blue-500"
                                        placeholder="Members (comma separated)"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={cancelEditing}
                                            className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded"
                                            title="Cancel"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => saveEdit(team.id)}
                                            className="p-1 text-green-600 hover:text-green-700 hover:bg-green-100 rounded"
                                            title="Save"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="flex justify-between items-start">
                                        <div className="font-medium text-slate-900">{team.name}</div>
                                        <div className="flex gap-1 opacity-100 transition-opacity">
                                            <button
                                                onClick={() => startEditing(team)}
                                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                title="Edit Team"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => onDeleteTeam(team.id)}
                                                className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                                title="Delete Team"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-600 mt-1">
                                        {team.members.length > 0 ? team.members.join(', ') : 'No members'}
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

