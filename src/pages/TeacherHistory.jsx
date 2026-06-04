import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'

export default function TeacherHistory() {
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchHistory()
  }, [])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      // Mengambil data absensi yang dibuat oleh guru ini
      // Sekaligus melakukan JOIN ke tabel students, classes, dan subjects
      const { data, error } = await supabase
        .from('attendance_records')
        .select(`
          id,
          attendance_date,
          status,
          approval_status,
          students ( full_name ),
          teaching_schedule (
            classes ( class_name ),
            subjects ( subject_name )
          )
        `)
        .eq('created_by', session.user.id)
        .order('attendance_date', { ascending: false }) // Urutkan dari yang terbaru

      if (error) throw error
      setHistory(data || [])
    } catch (error) {
      console.error('Gagal mengambil riwayat:', error.message)
    } finally {
      setLoading(false)
    }
  }

  // Fungsi untuk memberi warna pada badge status ACC
  const getStatusBadge = (status) => {
    if (status === 'Approved') return <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-xs font-bold">Disetujui</span>
    if (status === 'Rejected') return <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded text-xs font-bold">Ditolak</span>
    return <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-bold">Pending</span>
  }

  // Fungsi untuk memberi warna pada kehadiran siswa
  const getAttendanceBadge = (status) => {
    if (status === 'Hadir') return <span className="text-emerald-600 font-semibold">Hadir</span>
    if (status === 'Alpa') return <span className="text-rose-600 font-semibold">Alpa</span>
    if (status === 'Sakit') return <span className="text-blue-600 font-semibold">Sakit</span>
    return <span className="text-amber-600 font-semibold">{status}</span>
  }

  if (loading) return <div className="p-8 text-slate-500">Memuat riwayat mengajar...</div>

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 min-h-screen">
      <h1 className="text-2xl font-bold text-slate-800 mb-6">Riwayat Mengajar & Absensi</h1>

      {history.length === 0 ? (
        <div className="text-center p-8 bg-slate-50 border border-slate-200 rounded-xl">
          <p className="text-slate-500">Belum ada riwayat absensi yang Anda kirimkan.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-sm text-slate-600">
                <th className="p-4 font-semibold">Tanggal</th>
                <th className="p-4 font-semibold">Kelas & Mapel</th>
                <th className="p-4 font-semibold">Nama Siswa</th>
                <th className="p-4 font-semibold">Kehadiran</th>
                <th className="p-4 font-semibold">Status ACC</th>
              </tr>
            </thead>
            <tbody>
              {history.map((record) => (
                <tr key={record.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors text-sm">
                  <td className="p-4 text-slate-800">{record.attendance_date}</td>
                  <td className="p-4">
                    <div className="font-semibold text-slate-800">{record.teaching_schedule?.classes?.class_name}</div>
                    <div className="text-xs text-slate-500">{record.teaching_schedule?.subjects?.subject_name}</div>
                  </td>
                  <td className="p-4 text-slate-700">{record.students?.full_name}</td>
                  <td className="p-4">{getAttendanceBadge(record.status)}</td>
                  <td className="p-4">{getStatusBadge(record.approval_status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}