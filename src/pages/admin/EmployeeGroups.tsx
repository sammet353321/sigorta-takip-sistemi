import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Plus, Trash2, Users, UserPlus, X, Briefcase } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface EmployeeGroup {
    id: string;
    name: string;
    member_count?: number;
}

interface Employee {
    id: string;
    name: string;
    email: string;
}

export default function EmployeeGroupsManagement() {
    const [groups, setGroups] = useState<EmployeeGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [newGroupName, setNewGroupName] = useState('');
    const [selectedGroup, setSelectedGroup] = useState<EmployeeGroup | null>(null);

    useEffect(() => {
        fetchGroups();
    }, []);

    async function fetchGroups() {
        try {
            const { data, error } = await supabase
                .from('employee_groups')
                .select('*, employee_group_members(count)');
            
            if (error) throw error;
            
            setGroups(data?.map(g => ({
                ...g,
                member_count: g.employee_group_members?.[0]?.count || 0
            })) || []);
        } catch (error) {
            console.error('Error fetching employee groups:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleAddGroup(e: React.FormEvent) {
        e.preventDefault();
        if (!newGroupName.trim()) return;

        try {
            const { error } = await supabase.from('employee_groups').insert([{ name: newGroupName }]);
            if (error) throw error;
            setNewGroupName('');
            fetchGroups();
        } catch (error) {
            console.error('Error adding group:', error);
            alert('Grup eklenirken hata oluştu.');
        }
    }

    async function handleDeleteGroup(id: string) {
        if (!confirm('Bu grubu ve tüm üyelerini silmek istediğinize emin misiniz?')) return;

        try {
            const { error } = await supabase.from('employee_groups').delete().eq('id', id);
            if (error) throw error;
            fetchGroups();
            if (selectedGroup?.id === id) setSelectedGroup(null);
        } catch (error) {
            console.error('Error deleting group:', error);
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800">Çalışan Grupları</h3>
            </div>

            <form onSubmit={handleAddGroup} className="flex gap-4">
                <input 
                    type="text" 
                    placeholder="Grup Adı (Örn: A Grubu, B Grubu)" 
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                />
                <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 flex items-center">
                    <Plus size={18} className="mr-2" /> Ekle
                </button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {groups.map(group => (
                    <div 
                        key={group.id} 
                        onClick={() => setSelectedGroup(group)}
                        className="flex justify-between items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer bg-white group"
                    >
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                                <Briefcase size={20} />
                            </div>
                            <div>
                                <span className="font-medium text-gray-800 block">{group.name}</span>
                                <span className="text-xs text-gray-500">{group.member_count} Çalışan</span>
                            </div>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteGroup(group.id); }}
                            className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                        >
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
                {groups.length === 0 && (
                    <div className="col-span-full text-center py-8 text-gray-500">
                        Henüz çalışan grubu oluşturulmamış.
                    </div>
                )}
            </div>

            {selectedGroup && (
                <GroupMembersModal 
                    group={selectedGroup} 
                    onClose={() => { setSelectedGroup(null); fetchGroups(); }} 
                />
            )}
        </div>
    );
}

function GroupMembersModal({ group, onClose }: { group: EmployeeGroup; onClose: () => void }) {
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [memberIds, setMemberIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [group.id]);

    async function fetchData() {
        try {
            // Fetch all employees
            const { data: users } = await supabase
                .from('users')
                .select('id, name, email')
                .eq('role', 'employee')
                .order('name');
            setEmployees(users || []);

            // Fetch current members
            const { data: members } = await supabase
                .from('employee_group_members')
                .select('user_id')
                .eq('group_id', group.id);
            setMemberIds(members?.map(m => m.user_id) || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    }

    async function toggleMember(userId: string) {
        const isMember = memberIds.includes(userId);

        try {
            if (isMember) {
                // Remove
                await supabase
                    .from('employee_group_members')
                    .delete()
                    .match({ group_id: group.id, user_id: userId });
                setMemberIds(prev => prev.filter(id => id !== userId));
            } else {
                // Add
                await supabase
                    .from('employee_group_members')
                    .insert({ group_id: group.id, user_id: userId });
                setMemberIds(prev => [...prev, userId]);
            }
        } catch (error) {
            console.error('Error toggling member:', error);
            toast.error('İşlem sırasında hata oluştu.');
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="font-bold text-lg">{group.name}</h3>
                        <p className="text-sm text-gray-500">Grup Üyelerini Yönet</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {loading ? (
                        <div className="text-center py-4">Yükleniyor...</div>
                    ) : (
                        <>
                            {employees.map(emp => (
                                <div 
                                    key={emp.id} 
                                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer" 
                                    onClick={() => toggleMember(emp.id)}
                                >
                                    <div className="flex items-center space-x-3">
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${memberIds.includes(emp.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                                            {memberIds.includes(emp.id) && <span className="text-white text-xs">✓</span>}
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-800">{emp.name}</p>
                                            <p className="text-xs text-gray-500">{emp.email}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {employees.length === 0 && <p className="text-center text-gray-500">Sistemde kayıtlı çalışan bulunamadı.</p>}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
