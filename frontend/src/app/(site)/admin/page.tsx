'use client';
import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Cpu, Activity, AlertTriangle, Settings, Shield, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { MACHINES } from '@/lib/constants';

const tabs = [
  { id: 'machines', label: 'Machine Registry', icon: Cpu },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'streams', label: 'Stream Health', icon: Activity },
  { id: 'alerts', label: 'Alert Logs', icon: AlertTriangle },
  { id: 'metrics', label: 'System Metrics', icon: BarChart3 },
  { id: 'permissions', label: 'Permissions', icon: Shield },
];

const mockUsers = [
  { name: 'Nischay Sai D R', email: 'nischay@logicweavers.ai', role: 'Admin', status: 'Active', last: '2m ago' },
  { name: 'Rishika J R', email: 'rishika@logicweavers.ai', role: 'Engineer', status: 'Active', last: '5m ago' },
  { name: 'Noti Gayatri', email: 'gayatri@logicweavers.ai', role: 'Data Scientist', status: 'Active', last: '1h ago' },
  { name: 'Operator A', email: 'op.a@facility.com', role: 'Viewer', status: 'Inactive', last: '3d ago' },
];

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('machines');
  const streamLatencyByMachine = useMemo(() => {
    return Object.fromEntries(
      MACHINES.map((machine, idx) => [machine.id, 12 + ((idx * 7 + machine.id.length * 3) % 26)])
    ) as Record<string, number>;
  }, []);

  return (
    <div className="pt-16 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-5 h-5 text-cyan-400" />
              <span className="font-orbitron font-bold text-xl text-white">Admin Control Center</span>
            </div>
            <p className="text-slate-500 text-sm font-mono">System management & monitoring</p>
          </div>
          <Link href="/dashboard">
            <button className="btn-neon text-xs">← Live Dashboard</button>
          </Link>
        </div>

        {/* System Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Active Streams', value: '4/4', color: '#10b981' },
            { label: 'Alerts Today', value: '12', color: '#ef4444' },
            { label: 'Suppressed', value: '7', color: '#f59e0b' },
            { label: 'Uptime', value: '99.8%', color: '#00f5ff' },
          ].map(m => (
            <div key={m.label} className="glass-card p-4">
              <div className="font-orbitron font-black text-2xl" style={{ color: m.color }}>{m.value}</div>
              <div className="text-slate-600 text-xs font-mono mt-1">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-orbitron whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30'
                  : 'text-slate-600 hover:text-slate-400 border border-transparent'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'machines' && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 font-orbitron font-bold text-white text-sm">Machine Registry</div>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Machine ID</th><th>Type</th><th>Location</th><th>Stream</th><th>Status</th><th>Last Reading</th>
                  </tr>
                </thead>
                <tbody>
                  {MACHINES.map(m => (
                    <tr key={m.id}>
                      <td className="font-mono text-cyan-400 font-bold">{m.id}</td>
                      <td>{m.type}</td>
                      <td className="text-slate-600">{m.location}</td>
                      <td><span className="badge badge-safe">LIVE</span></td>
                      <td><span className="badge badge-safe">OPERATIONAL</span></td>
                      <td className="text-slate-600 font-mono text-xs">Just now</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="glass-card overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 font-orbitron font-bold text-white text-sm">User Management</div>
              <table className="data-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last Active</th></tr>
                </thead>
                <tbody>
                  {mockUsers.map(u => (
                    <tr key={u.email}>
                      <td className="text-white font-medium">{u.name}</td>
                      <td className="font-mono text-xs text-slate-500">{u.email}</td>
                      <td><span className={`badge ${u.role === 'Admin' ? 'badge-critical' : u.role === 'Engineer' ? 'badge-info' : 'badge-safe'}`}>{u.role}</span></td>
                      <td><span className={`badge ${u.status === 'Active' ? 'badge-safe' : 'badge-warning'}`}>{u.status}</span></td>
                      <td className="font-mono text-xs text-slate-600">{u.last}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'streams' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {MACHINES.map(m => (
                <div key={m.id} className="glass-card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-orbitron font-bold text-white">{m.id}</span>
                    <span className="badge badge-safe">● LIVE</span>
                  </div>
                  <div className="space-y-2 text-sm font-mono text-slate-500">
                    <div className="flex justify-between"><span>Frequency</span><span className="text-cyan-400">1 Hz</span></div>
                    <div className="flex justify-between"><span>Latency</span><span className="text-green-400">{streamLatencyByMachine[m.id]}ms</span></div>
                    <div className="flex justify-between"><span>Packets Lost</span><span className="text-green-400">0</span></div>
                    <div className="flex justify-between"><span>Reconnects</span><span className="text-slate-400">0</span></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {(activeTab === 'alerts' || activeTab === 'metrics' || activeTab === 'permissions') && (
            <div className="glass-card p-12 text-center border border-cyan-500/10">
              <div className="text-slate-600 font-orbitron text-sm">
                {activeTab === 'alerts' ? 'Alert log history available in the Live Dashboard' :
                  activeTab === 'metrics' ? 'Full metrics telemetry — Enterprise feature' :
                    'Role-based permission management — Enterprise feature'}
              </div>
              <Link href="/pricing" className="text-cyan-400 text-xs font-mono hover:underline mt-2 block">
                Upgrade to Enterprise →
              </Link>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
