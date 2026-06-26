'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  MessageSquare,
  Trash2,
  Inbox
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Link from 'next/link';
import { useShift } from '@/components/providers/ShiftProvider';
import { useAuth } from '@/components/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export default function NotificationsPage() {
  const { theme } = useShift();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifs = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('system_notifications')
          .select('*')
          .eq('receiver_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNotifications(data || []);

        // Mark all as read
        if (data && data.some(n => !n.is_read)) {
           await supabase
             .from('system_notifications')
             .update({ is_read: true })
             .eq('receiver_id', user.id)
             .eq('is_read', false);
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifs();
  }, [user?.id]);

  const handleDelete = async (id: string) => {
    try {
      await supabase.from('system_notifications').delete().eq('id', id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {}
  };

  return (
    <div className={cn("min-h-screen p-5 pb-32 transition-colors duration-500", theme === 'dark' ? "bg-[#0a0a0a]" : "bg-gray-50")}>
      {/* Header */}
      <div className="max-w-md mx-auto mb-8 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/operador">
            <button className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-90", theme === 'dark' ? "bg-zinc-900/80 border border-white/5 text-white" : "bg-white border border-gray-100 text-gray-900")}>
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div>
            <h1 className={cn("text-xl font-black uppercase tracking-tighter italic", theme === 'dark' ? "text-white" : "text-gray-900")}>Buzón</h1>
            <p className="text-[11px] font-black text-primary uppercase tracking-[0.2em] mt-0.5">Mensajes de Gestión</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto space-y-4">
        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto mb-4" />
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notif, i) => (
            <motion.div
              key={notif.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Card className={cn(
                "p-5 border-none shadow-xl relative overflow-hidden group",
                theme === 'dark' ? "bg-zinc-900/60 backdrop-blur-md" : "bg-white",
                !notif.is_read && "ring-2 ring-primary/20"
              )}>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-1.5 rounded-lg",
                      notif.type === 'emergency' ? "bg-red-500/10 text-red-500" :
                      notif.type === 'command' ? "bg-blue-500/10 text-blue-500" : "bg-primary/10 text-primary"
                    )}>
                      {notif.type === 'command' ? <ShieldAlert size={14} /> : <MessageSquare size={14} />}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                      {notif.title}
                    </span>
                  </div>
                  <button onClick={() => handleDelete(notif.id)} className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 size={14} />
                  </button>
                </div>

                <p className={cn(
                  "text-sm font-medium leading-relaxed mb-3",
                  theme === 'dark' ? "text-gray-200" : "text-gray-800"
                )}>
                  {notif.message}
                </p>

                <div className="flex items-center gap-4 text-[9px] font-bold text-gray-500 uppercase tracking-tight">
                  <div className="flex items-center gap-1">
                    <Clock size={10} />
                    {new Date(notif.created_at).toLocaleString('es-AR')}
                  </div>
                  {notif.is_read && (
                    <div className="flex items-center gap-1 text-green-500">
                      <CheckCircle2 size={10} />
                      Leído
                    </div>
                  )}
                </div>
              </Card>
            </motion.div>
          ))
        ) : (
          <div className="py-24 text-center space-y-4">
            <Inbox size={48} className="text-gray-300 mx-auto opacity-20" />
            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest italic">No hay mensajes nuevos</p>
          </div>
        )}
      </div>
    </div>
  );
}
