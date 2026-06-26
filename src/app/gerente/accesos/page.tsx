'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Shield, 
  Plus, 
  Search, 
  Mail, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  X,
  UserCheck,
  UserMinus,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function AuthorizedUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('operador');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('authorized_users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      console.error('Error fetching authorized users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail) return;

    try {
      const { error } = await supabase
        .from('authorized_users')
        .insert({
          email: newEmail.toLowerCase().trim(),
          role: newRole,
          status: 'approved',
          approved_at: new Date().toISOString(),
        });

      if (error) throw error;

      setNewEmail('');
      setIsAdding(false);
      setStatusMsg({ type: 'success', text: 'Usuario autorizado con éxito' });
      fetchUsers();
      
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Error al autorizar usuario' });
    }
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'approved' ? 'revoked' : 'approved';
    const approvedAt = newStatus === 'approved' ? new Date().toISOString() : null;

    // Optimistic update
    const previousUsers = [...users];
    setUsers(prev => prev.map(u => u.id === id ? { ...u, status: newStatus, approved_at: approvedAt } : u));

    try {
      const { error } = await supabase
        .from('authorized_users')
        .update({ status: newStatus, approved_at: approvedAt })
        .eq('id', id);

      if (error) {
        setUsers(previousUsers); // Rollback
        throw error;
      }
      
      setStatusMsg({ 
        type: 'success', 
        text: `Acceso ${newStatus === 'approved' ? 'HABILITADO' : 'SUSPENDIDO'} correctamente` 
      });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      alert('Error updating status: ' + err.message);
      fetchUsers();
    }
  };

  const deleteUser = async (id: string) => {
    if (!confirm('¿Seguro que desea eliminar esta autorización? El usuario ya no podrá ingresar.')) return;

    // Optimistic update
    const previousUsers = [...users];
    setUsers(prev => prev.filter(u => u.id !== id));

    try {
      const { error } = await supabase
        .from('authorized_users')
        .delete()
        .eq('id', id);

      if (error) {
        setUsers(previousUsers); // Rollback
        throw error;
      }

      setStatusMsg({ type: 'success', text: 'Autorización eliminada correctamente' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err: any) {
      alert('Error deleting user: ' + err.message);
      fetchUsers();
    }
  };

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
              <Shield size={24} />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase italic">Control de Accesos</h1>
          </div>
          <p className="text-gray-500 text-sm font-medium mt-2">Whitelist de personal autorizado para ingresar a la plataforma.</p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setIsAdding(true)}
          className="h-12 px-6 rounded-2xl shadow-lg shadow-primary/20 uppercase font-black text-xs tracking-widest gap-2"
        >
          <Plus size={18} /> Autorizar Email
        </Button>
      </div>

      {statusMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "p-4 rounded-xl border flex items-center gap-3 text-sm font-bold",
            statusMsg.type === 'success' ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-700"
          )}
        >
          {statusMsg.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          {statusMsg.text}
        </motion.div>
      )}

      {/* Main Content */}
      <Card className="border-none shadow-2xl shadow-gray-200/50 overflow-hidden">
        <div className="p-4 border-b border-gray-50 flex items-center gap-3">
          <Search size={18} className="text-gray-400" />
          <input 
            type="text"
            placeholder="Buscar por email..."
            className="flex-1 bg-transparent border-none focus:outline-none text-sm placeholder:text-gray-300 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="divide-y divide-gray-50">
          {loading ? (
             <div className="p-20 flex flex-col items-center justify-center gap-4">
                <div className="w-10 h-10 border-3 border-gray-100 border-t-primary rounded-full animate-spin" />
                <p className="text-xs font-bold text-gray-300 uppercase tracking-widest">Sincronizando Whitelist...</p>
             </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-20 text-center space-y-4">
               <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center mx-auto text-gray-200">
                  <Shield size={32} />
               </div>
               <p className="text-gray-400 font-medium">No hay usuarios autorizados que coincidan con la búsqueda.</p>
            </div>
          ) : (
            filteredUsers.map((user, i) => (
              <motion.div 
                key={user.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="p-5 flex flex-col sm:flex-row items-center gap-4 hover:bg-gray-50/50 transition-colors"
              >
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                  user.status === 'approved' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                )}>
                  <Mail size={20} />
                </div>
                
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <p className="text-sm font-black text-gray-900 truncate">{user.email}</p>
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                    <span className="px-2 py-0.5 bg-gray-100 text-[10px] font-black text-gray-500 uppercase rounded-md tracking-tighter">
                      {user.role}
                    </span>
                    <span className="text-gray-300">•</span>
                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                      <Clock size={12} />
                      Desde {new Date(user.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 mt-4 sm:mt-0">
                  <button 
                    onClick={() => toggleStatus(user.id, user.status)}
                    className={cn(
                      "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border-2",
                      user.status === 'approved' 
                        ? "border-green-100 bg-green-50 text-green-700 hover:bg-green-100" 
                        : "border-gray-100 bg-white text-gray-400 hover:bg-gray-50"
                    )}
                  >
                    {user.status === 'approved' ? <UserCheck size={14} /> : <UserMinus size={14} />}
                    {user.status === 'approved' ? 'Habilitado' : 'Suspensión'}
                  </button>
                  
                  <button 
                    onClick={() => deleteUser(user.id)}
                    className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </Card>

      {/* Add User Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               onClick={() => setIsAdding(false)}
               className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 lg:p-12 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-primary" />
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic">Autorizar Acceso</h3>
                  <p className="text-sm text-gray-400 font-medium">Habilitar email corporativo o personal.</p>
                </div>
                <button onClick={() => setIsAdding(false)} className="p-2 text-gray-300 hover:text-gray-500 rounded-full">
                   <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Email de Usuario</label>
                   <Input 
                    type="email" 
                    placeholder="nombre@gmail.com" 
                    required
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="h-14 rounded-2xl text-sm"
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Nivel de Operación</label>
                   <select 
                    className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold uppercase tracking-tight focus:outline-none focus:ring-2 focus:ring-primary/20 appearance-none"
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%23a1a1aa\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1rem' }}
                   >
                     <option value="operador">OPERADOR (RONDÍN / INCIDENCIAS)</option>
                     <option value="gerente">GERENTE (TOTAL CONTROL)</option>
                     <option value="cliente">CLIENTE (V.I.P. MONITORING)</option>
                   </select>
                </div>

                <div className="pt-4 flex gap-3">
                   <Button 
                    type="button" 
                    variant="ghost" 
                    className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400"
                    onClick={() => setIsAdding(false)}
                   >
                     Cancelar
                   </Button>
                   <Button 
                    type="submit" 
                    className="flex-1 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
                   >
                     Confirmar Alta
                   </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
