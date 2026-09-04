"use client";
import { useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import { PageHeader, Card, Modal } from "@/components/shared";
import { cn, ROLE_COLOR, ROLE_LABEL } from "@/lib/utils";
import { toast } from "sonner";

interface User { id: string; name: string; email: string; role: string; createdAt: string; }
const ROLES = ["admin","sales","ticket_admin","logistics","finance","operations","founder"];

export default function UsersPage() {
  const [users,setUsers]=useState<User[]>([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState(false);
  const [saving,setSaving]=useState(false);
  const [form,setForm]=useState({name:"",email:"",password:"demo@123",role:"sales"});

  useEffect(()=>{
    fetch("/api/users").then(r=>r.json()).then(j=>setUsers(j.data??[])).finally(()=>setLoading(false));
  },[]);

  async function addUser(e: React.FormEvent){
    e.preventDefault();setSaving(true);
    try{
      const res=await fetch("/api/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      const j=await res.json();
      if(!res.ok){toast.error(j.error??"Failed");return;}
      toast.success(`${form.name} added!`);
      setUsers(p=>[j.data,...p]);setModal(false);
      setForm({name:"",email:"",password:"demo@123",role:"sales"});
    }catch{toast.error("Failed");}
    finally{setSaving(false);}
  }

  return (
    <div className="space-y-5">
      <PageHeader title="User Management" subtitle={`${users.length} users`} breadcrumb="Admin"
        action={<button onClick={()=>setModal(true)} className="btn-primary"><Plus className="w-4 h-4"/> Add User</button>}
      />
      <Card noPad>
        {loading?<div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-[#0F4C81]/20 border-t-[#0F4C81] rounded-full animate-spin"/></div>:
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr>{["Name","Email","Role","Created"].map(h=><th key={h} className="th">{h}</th>)}</tr></thead>
            <tbody>
              {users.map(u=>(
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="td font-medium text-slate-900">{u.name}</td>
                  <td className="td text-sm text-slate-500">{u.email}</td>
                  <td className="td"><span className={cn("badge text-xs",ROLE_COLOR[u.role])}>{ROLE_LABEL[u.role]??u.role}</span></td>
                  <td className="td text-xs text-slate-400">{new Date(u.createdAt).toLocaleDateString("en-IN")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </Card>
      <Modal open={modal} onClose={()=>setModal(false)} title="Add User">
        <form onSubmit={addUser} className="space-y-4">
          {[["name","Full Name","text"],["email","Email","email"],["password","Password","password"]].map(([k,l,t])=>(
            <div key={k}><label className="block text-xs font-medium text-slate-600 mb-1">{l} *</label>
              <input type={t} value={(form as Record<string,string>)[k]} onChange={e=>setForm(p=>({...p,[k]:e.target.value}))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[#0F4C81]/20" required/>
            </div>
          ))}
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Role</label>
            <select value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} className="w-full border border-[#E2E8F0] rounded-xl px-3 py-2.5 text-sm outline-none">
              {ROLES.map(r=><option key={r} value={r}>{ROLE_LABEL[r]??r}</option>)}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={()=>setModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving?"Saving...":"Add User"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}