import { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function AdminMaster() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("siswa");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({
    show: false,
    message: "",
    type: "success",
  });

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("");
  const [searchTeacherQuery, setSearchTeacherQuery] = useState("");
  const [searchScheduleQuery, setSearchScheduleQuery] = useState("");
  const [selectedDayScheduleFilter, setSelectedDayScheduleFilter] =
    useState("");
  const [selectedClassScheduleFilter, setSelectedClassScheduleFilter] =
    useState("");
  const [selectedScheduleIds, setSelectedScheduleIds] = useState([]);

  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({
    id: null,
    name: "",
    table: "",
  });

  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editStudentData, setEditStudentData] = useState(null);

  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showEditTeacherModal, setShowEditTeacherModal] = useState(false);
  const [editTeacherData, setEditTeacherData] = useState(null);

  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [showEditScheduleModal, setShowEditScheduleModal] = useState(false);
  const [editScheduleData, setEditScheduleData] = useState(null);

  const [newStudent, setNewStudent] = useState({
    full_name: "",
    nis: "",
    class_id: "",
    gender: "",
  });
  const [newTeacher, setNewTeacher] = useState({
    full_name: "",
    email: "",
    username: "",
    password: "",
    roles: "teacher",
  });
  const [newSubject, setNewSubject] = useState({ subject_name: "" });
  const [newSchedule, setNewSchedule] = useState({
    teacher_id: "",
    class_id: "",
    subject_id: "",
    day_name: "",
    session_order: "",
    start_time: "",
    end_time: "",
  });

  const tabs = [
    { id: "siswa", label: "Data Siswa" },
    { id: "guru", label: "Data Guru" },
    { id: "mapel", label: "Mata Pelajaran" },
    { id: "jadwal", label: "Jadwal Mengajar" },
  ];

  const filteredStudents = students.filter((student) => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      student.full_name?.toLowerCase().includes(searchLower) ||
      student.nis?.toString().includes(searchLower);
    const matchesClass =
      selectedClassFilter === "" ||
      student.class_id?.toString() === selectedClassFilter.toString();
    return matchesSearch && matchesClass;
  });

  const filteredTeachers = teachers.filter((teacher) => {
    const searchLower = searchTeacherQuery.toLowerCase();
    return (
      teacher.full_name?.toLowerCase().includes(searchLower) ||
      teacher.username?.toLowerCase().includes(searchLower) ||
      teacher.roles?.toString().toLowerCase().includes(searchLower)
    );
  });

  const filteredSchedules = schedules.filter((sch) => {
    const searchLower = searchScheduleQuery.toLowerCase();
    const mapelDasar = [
      "matematika",
      "mtk",
      "bahasa indonesia",
      "b indo",
      "ipa",
      "ips",
      "pancasila",
      "pkn",
      "seni budaya",
    ];
    const namaMapel = sch.subjects?.subject_name?.toLowerCase() || "";
    const apakahMapelDasar = mapelDasar.some((mapel) =>
      namaMapel.includes(mapel),
    );
    const namaGuru = apakahMapelDasar
      ? sch.classes?.profiles?.full_name || ""
      : sch.profiles?.full_name || "";

    const matchesSearch =
      sch.subjects?.subject_name?.toLowerCase().includes(searchLower) ||
      sch.classes?.class_name?.toLowerCase().includes(searchLower) ||
      namaGuru.toLowerCase().includes(searchLower);

    const matchesDay =
      selectedDayScheduleFilter === "" ||
      sch.day_name === selectedDayScheduleFilter;
    const matchesClass =
      selectedClassScheduleFilter === "" ||
      sch.class_id?.toString() === selectedClassScheduleFilter.toString();

    return matchesSearch && matchesDay && matchesClass;
  });

  useEffect(() => {
    fetchActiveTabData();
  }, [activeTab]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(
      () => setToast({ show: false, message: "", type: "success" }),
      3000,
    );
  };

  const fetchActiveTabData = async () => {
    setLoading(true);
    try {
      if (activeTab === "siswa") {
        const { data: std } = await supabase
          .from("students")
          .select("*, classes(class_name)")
          .order("full_name");
        const { data: cls } = await supabase
          .from("classes")
          .select("*")
          .order("class_name");
        setStudents(std || []);
        setClasses(cls || []);
      } else if (activeTab === "guru") {
        const { data: tch } = await supabase
          .from("profiles")
          .select("id, full_name, email, username, roles")
          .overlaps("roles", ["teacher", "homeroom", "headmaster"]);
        const sortedTeachers = (tch || []).sort((a, b) => {
          const getRank = (roles) => {
            if (roles?.includes("headmaster")) return 1;
            if (roles?.includes("homeroom")) return 2;
            return 3;
          };
          const rankA = getRank(a.roles);
          const rankB = getRank(b.roles);
          if (rankA !== rankB) return rankA - rankB;
          return a.full_name.localeCompare(b.full_name);
        });
        setTeachers(sortedTeachers);
      } else if (activeTab === "mapel") {
        const { data: sub } = await supabase
          .from("subjects")
          .select("*")
          .order("subject_name");
        setSubjects(sub || []);
      } else if (activeTab === "jadwal") {
        const { data: sch } = await supabase
          .from("teaching_schedule")
          .select(
            "*, profiles(full_name), classes(class_name, profiles(full_name)), subjects(subject_name)",
          );
        const { data: cls } = await supabase
          .from("classes")
          .select("*")
          .order("class_name");
        const { data: sub } = await supabase
          .from("subjects")
          .select("*")
          .order("subject_name");
        const { data: tch } = await supabase
          .from("profiles")
          .select("id, full_name")
          .contains("roles", ["teacher"]);

        const sortedSch = (sch || []).sort((a, b) => {
          const dayOrder = {
            Senin: 1,
            Selasa: 2,
            Rabu: 3,
            Kamis: 4,
            Jumat: 5,
            Sabtu: 6,
            Minggu: 7,
          };
          const orderA = dayOrder[a.day_name] || 99;
          const orderB = dayOrder[b.day_name] || 99;
          if (orderA !== orderB) return orderA - orderB;

          const timeA = a.start_time || "";
          const timeB = b.start_time || "";
          if (timeA !== timeB) return timeA.localeCompare(timeB);

          const classA = a.classes?.class_name || "";
          const classB = b.classes?.class_name || "";
          return classA.localeCompare(classB, undefined, {
            numeric: true,
            sensitivity: "base",
          });
        });

        setSchedules(sortedSch);
        setClasses(cls || []);
        setSubjects(sub || []);
        setTeachers(tch || []);
      }
    } catch (err) {
      showToast("Gagal mengambil data: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAddData = async (table, payload, resetFn) => {
    try {
      const { error } = await supabase.from(table).insert([payload]);
      if (error) throw error;
      resetFn();
      fetchActiveTabData();
      showToast("Data berhasil ditambahkan!");
    } catch (e) {
      showToast("Gagal menambah data: " + e.message, "error");
    }
  };

  const handleDelete = async (table, id, skipConfirm = false) => {
    if (!skipConfirm && !window.confirm("Yakin ingin menghapus data ini?"))
      return;
    try {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      fetchActiveTabData();
      showToast("Data berhasil dihapus!");
    } catch (e) {
      showToast("Gagal menghapus: " + e.message, "error");
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("students")
        .update({
          full_name: editStudentData.full_name,
          nis: editStudentData.nis,
          class_id: editStudentData.class_id,
          gender: editStudentData.gender,
        })
        .eq("id", editStudentData.id);

      if (error) throw error;

      setShowEditStudentModal(false);
      setEditStudentData(null);
      fetchActiveTabData();
      showToast("Data Siswa berhasil diperbarui!");
    } catch (error) {
      showToast("Gagal memperbarui data siswa: " + error.message, "error");
    }
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editTeacherData.full_name,
          username: editTeacherData.username,
          roles: [editTeacherData.roles],
        })
        .eq("id", editTeacherData.id);

      if (error) throw error;

      setShowEditTeacherModal(false);
      setEditTeacherData(null);
      fetchActiveTabData();
      showToast("Data Guru berhasil diperbarui!");
    } catch (error) {
      showToast("Gagal memperbarui data guru: " + error.message, "error");
    }
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from("teaching_schedule")
        .update({
          teacher_id: editScheduleData.teacher_id,
          class_id: editScheduleData.class_id,
          subject_id: editScheduleData.subject_id,
          day_name: editScheduleData.day_name,
          session_order: editScheduleData.session_order,
          start_time: editScheduleData.start_time,
          end_time: editScheduleData.end_time,
        })
        .eq("id", editScheduleData.id);

      if (error) throw error;

      setShowEditScheduleModal(false);
      setEditScheduleData(null);
      fetchActiveTabData();
      showToast("Jadwal berhasil diperbarui!");
    } catch (error) {
      showToast("Gagal memperbarui jadwal: " + error.message, "error");
    }
  };

  const handleToggleSelectSchedule = (id) => {
    setSelectedScheduleIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleToggleSelectAllSchedules = () => {
    if (selectedScheduleIds.length === filteredSchedules.length) {
      setSelectedScheduleIds([]);
    } else {
      setSelectedScheduleIds(filteredSchedules.map((sch) => sch.id));
    }
  };

  const handleBulkDeleteSchedules = async () => {
    if (selectedScheduleIds.length === 0) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("teaching_schedule")
        .delete()
        .in("id", selectedScheduleIds);
      if (error) throw error;
      setSelectedScheduleIds([]);
      setShowBulkDeleteModal(false);
      fetchActiveTabData();
      showToast(
        `${selectedScheduleIds.length} Jadwal berhasil dihapus massal!`,
      );
    } catch (e) {
      showToast("Gagal menghapus massal: " + e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const splitArray = (arr) => {
    const half = Math.ceil(arr.length / 2);
    return [arr.slice(0, half), arr.slice(half)];
  };

  return (
    <div className="relative bg-white dark:bg-[#172033] p-4 md:p-6 lg:p-8 rounded-[24px] md:rounded-[28px] shadow-sm border border-slate-200 dark:border-slate-800/80 transition-colors duration-300 min-h-[80vh]">
      <button
        onClick={() => navigate("/admin")}
        className="group flex items-center gap-3 text-sm font-bold text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors mb-6 md:mb-8"
      >
        <div className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 group-hover:bg-indigo-100 dark:group-hover:bg-indigo-500/20 transition-colors">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </div>
        Kembali ke Dashboard
      </button>

      {toast.show && (
        <div
          className={`fixed top-8 right-4 left-4 md:left-auto md:right-8 z-50 px-6 py-4 rounded-2xl font-bold text-white shadow-2xl flex items-center gap-3 transition-all duration-300 transform translate-y-0 opacity-100 ${toast.type === "success" ? "bg-emerald-500 shadow-emerald-500/20" : "bg-rose-500 shadow-rose-500/20"}`}
        >
          {toast.type === "success" ? (
            <svg
              className="w-6 h-6 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-6 h-6 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          )}
          <span className="text-sm md:text-base">{toast.message}</span>
        </div>
      )}

      {/* TAB MENU DENGAN OVERFLOW-X-AUTO AGAR BISA DIGESER DI HP */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 mb-6 md:mb-8 overflow-x-auto whitespace-nowrap gap-4 lg:gap-6 pb-2 scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm font-bold transition-all relative ${activeTab === tab.id ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-[-2px] left-0 w-full h-[3px] bg-indigo-600 dark:bg-indigo-500 rounded-t-full"></span>
            )}
          </button>
        ))}
      </div>

      <div className="py-2">
        {loading && (
          <p className="text-slate-500 dark:text-slate-400 italic mb-4 animate-pulse text-sm md:text-base">
            Memuat data sinkronisasi...
          </p>
        )}

        {/* TAB SISWA */}
        {activeTab === "siswa" && (
          <section className="animate-fadeIn">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6 bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm w-full">
              <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto flex-1 max-w-2xl">
                <div className="relative w-full sm:w-48 shrink-0">
                  <select
                    value={selectedClassFilter}
                    onChange={(e) => setSelectedClassFilter(e.target.value)}
                    className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] dark:text-white pl-4 pr-10 py-3 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-colors appearance-none cursor-pointer text-slate-700 dark:text-slate-200"
                  >
                    <option value="">Semua Kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.class_name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>

                <div className="relative w-full flex-1">
                  <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 text-base">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Cari nama siswa atau NIS..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-11 pr-10 py-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] dark:text-white rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-colors placeholder:text-slate-400 text-slate-900"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full md:w-auto shrink-0">
                <button
                  onClick={() => setShowStudentsModal(true)}
                  className="w-full md:w-auto bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] whitespace-nowrap"
                >
                  + Tambah Siswa
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800/60 rounded-2xl">
              <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-[#0F172A] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800/60">
                  <tr>
                    <th className="p-4 font-bold">Nama Siswa</th>
                    <th className="p-4 font-bold text-center">NIS</th>
                    <th className="p-4 font-bold text-center">Gender</th>
                    <th className="p-4 font-bold">Kelas</th>
                    <th className="p-4 font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="p-8 text-center text-slate-400 font-medium italic"
                      >
                        Siswa tidak ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredStudents.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-[#1E293B]/50 transition"
                      >
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                          {s.full_name}
                        </td>
                        <td className="p-4 text-center text-slate-500 dark:text-slate-400 font-mono">
                          {s.nis}
                        </td>
                        <td className="p-4 text-center">
                          <span
                            className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${s.gender === "L" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" : "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400"}`}
                          >
                            {s.gender === "L"
                              ? "L"
                              : s.gender === "P"
                                ? "P"
                                : "-"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-600 dark:text-slate-300 font-medium">
                          {s.classes?.class_name}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => {
                                setEditStudentData({
                                  id: s.id,
                                  full_name: s.full_name,
                                  nis: s.nis,
                                  class_id: s.class_id,
                                  gender: s.gender,
                                });
                                setShowEditStudentModal(true);
                              }}
                              className="text-amber-500 dark:text-amber-400 font-bold hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget({
                                  id: s.id,
                                  name: s.full_name,
                                  table: "students",
                                });
                                setShowDeleteModal(true);
                              }}
                              className="text-rose-600 dark:text-rose-400 font-bold hover:underline"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB GURU */}
        {activeTab === "guru" && (
          <section className="animate-fadeIn">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-6 bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm w-full">
              <div className="relative w-full md:w-auto flex-1 max-w-xl">
                <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 text-base">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Cari nama guru, username, atau jabatan..."
                  value={searchTeacherQuery}
                  onChange={(e) => setSearchTeacherQuery(e.target.value)}
                  className="w-full pl-11 pr-10 py-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] dark:text-white rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 transition-colors placeholder:text-slate-400 text-slate-900"
                />
                {searchTeacherQuery && (
                  <button
                    onClick={() => setSearchTeacherQuery("")}
                    className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="w-full md:w-auto shrink-0">
                <button
                  onClick={() => setShowTeacherModal(true)}
                  className="w-full md:w-auto bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98] whitespace-nowrap"
                >
                  + Tambah Guru
                </button>
              </div>
            </div>
            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800/60 rounded-2xl">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-[#1E293B]/50 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="p-4">Nama Lengkap</th>
                    <th className="p-4 text-left">Posisi / Role</th>
                    <th className="p-4 text-left">Email</th>
                    <th className="p-4 text-left">Username</th>
                    <th className="p-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTeachers.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="p-8 text-center text-slate-400 font-medium italic"
                      >
                        Guru tidak ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredTeachers.map((t) => (
                      <tr
                        key={t.id}
                        className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-[#1E293B]/50 transition-colors"
                      >
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-200">
                          {t.full_name}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-md text-[11px] font-black uppercase tracking-wider">
                            {t.roles === "homeroom" ||
                            t.roles?.includes("homeroom")
                              ? "Wali Kelas"
                              : t.roles === "headmaster" ||
                                  t.roles?.includes("headmaster")
                                ? "Kepala Sekolah"
                                : t.roles === "admin" ||
                                    t.roles?.includes("admin")
                                  ? "Admin"
                                  : "Guru"}
                          </span>
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 text-sm">
                          {t.email || "-"}
                        </td>
                        <td className="p-4 text-slate-500 dark:text-slate-400 font-mono text-sm">
                          {t.username}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => {
                                setEditTeacherData({
                                  id: t.id,
                                  full_name: t.full_name,
                                  username: t.username,
                                  roles: Array.isArray(t.roles)
                                    ? t.roles[0]
                                    : t.roles,
                                  email: t.email,
                                });
                                setShowEditTeacherModal(true);
                              }}
                              className="text-amber-500 dark:text-amber-400 font-bold hover:underline text-sm"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget({
                                  id: t.id,
                                  name: t.full_name,
                                  table: "profiles",
                                });
                                setShowDeleteModal(true);
                              }}
                              className="text-rose-600 dark:text-rose-400 font-bold hover:underline text-sm"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* TAB MAPEL */}
        {activeTab === "mapel" &&
          (() => {
            const [colLeft, colRight] = splitArray(subjects);
            return (
              <section className="animate-fadeIn">
                {/* INI BAGIAN UTAMA YANG DIPERBAIKI (FLEX-COL KE FLEX-ROW) */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleAddData("subjects", newSubject, () =>
                      setNewSubject({ subject_name: "" }),
                    );
                  }}
                  className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6 md:mb-8 bg-slate-50 dark:bg-[#0F172A] p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/60"
                >
                  <input
                    placeholder="Nama Mata Pelajaran"
                    className="w-full border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#1E293B] dark:text-white p-3.5 md:p-3 rounded-xl flex-1 text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
                    value={newSubject.subject_name}
                    onChange={(e) =>
                      setNewSubject({ subject_name: e.target.value })
                    }
                    required
                  />
                  <button className="w-full md:w-auto bg-indigo-600 text-white px-8 py-3.5 md:py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-500/30 whitespace-nowrap text-sm md:text-base">
                    + Tambah Mapel
                  </button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-6">
                  <div className="flex flex-col gap-3">
                    {colLeft.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-center bg-white dark:bg-[#1E293B] shadow-sm"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-300 text-sm md:text-base">
                          {sub.subject_name}
                        </span>
                        <button
                          onClick={() => {
                            setDeleteTarget({
                              id: sub.id,
                              name: sub.subject_name,
                              table: "subjects",
                            });
                            setShowDeleteModal(true);
                          }}
                          className="text-rose-600 dark:text-rose-400 font-bold hover:underline text-sm md:text-base"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-3">
                    {colRight.map((sub) => (
                      <div
                        key={sub.id}
                        className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-center bg-white dark:bg-[#1E293B] shadow-sm"
                      >
                        <span className="font-medium text-slate-700 dark:text-slate-300 text-sm md:text-base">
                          {sub.subject_name}
                        </span>
                        <button
                          onClick={() => {
                            setDeleteTarget({
                              id: sub.id,
                              name: sub.subject_name,
                              table: "subjects",
                            });
                            setShowDeleteModal(true);
                          }}
                          className="text-rose-600 dark:text-rose-400 font-bold hover:underline text-sm md:text-base"
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          })()}

        {/* TAB JADWAL */}
        {activeTab === "jadwal" && (
          <section className="animate-fadeIn">
            <div className="flex flex-col xl:flex-row gap-4 items-center justify-between mb-6 bg-white dark:bg-[#0F172A] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/60 shadow-sm w-full">
              <div className="flex flex-col sm:flex-row gap-3 items-center w-full xl:w-auto flex-1 max-w-3xl">
                <div className="relative w-full sm:w-40 shrink-0">
                  <select
                    value={selectedDayScheduleFilter}
                    onChange={(e) => {
                      setSelectedDayScheduleFilter(e.target.value);
                      setSelectedScheduleIds([]);
                    }}
                    className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] dark:text-white pl-4 pr-10 py-3 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="">Semua Hari</option>
                    {["Senin", "Selasa", "Rabu", "Kamis", "Jumat"].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
                <div className="relative w-full sm:w-40 shrink-0">
                  <select
                    value={selectedClassScheduleFilter}
                    onChange={(e) => {
                      setSelectedClassScheduleFilter(e.target.value);
                      setSelectedScheduleIds([]);
                    }}
                    className="w-full border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] dark:text-white pl-4 pr-10 py-3 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 appearance-none cursor-pointer"
                  >
                    <option value="">Semua Kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.class_name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 text-xs">
                    ▼
                  </div>
                </div>
                <div className="relative w-full flex-1">
                  <span className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 text-base">
                    🔍
                  </span>
                  <input
                    type="text"
                    placeholder="Cari guru, kelas..."
                    value={searchScheduleQuery}
                    onChange={(e) => {
                      setSearchScheduleQuery(e.target.value);
                      setSelectedScheduleIds([]);
                    }}
                    className="w-full pl-11 pr-10 py-3 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#1E293B] dark:text-white rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 text-slate-900"
                  />
                  {searchScheduleQuery && (
                    <button
                      onClick={() => setSearchScheduleQuery("")}
                      className="absolute inset-y-0 right-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* ACTION BUTTONS (Dibuat tumpuk di HP agar rapi) */}
              <div className="w-full xl:w-auto shrink-0 flex flex-col sm:flex-row items-center gap-2">
                {selectedScheduleIds.length > 0 && (
                  <>
                    {selectedScheduleIds.length === 1 && (
                      <button
                        onClick={() => {
                          const target = schedules.find(
                            (s) => s.id === selectedScheduleIds[0],
                          );
                          if (target) {
                            setEditScheduleData({
                              id: target.id,
                              teacher_id: target.teacher_id || "",
                              class_id: target.class_id || "",
                              subject_id: target.subject_id || "",
                              day_name: target.day_name || "",
                              session_order: target.session_order || "",
                              start_time: target.start_time || "",
                              end_time: target.end_time || "",
                            });
                            setShowEditScheduleModal(true);
                          }
                        }}
                        className="w-full sm:w-auto bg-amber-500 text-white px-5 py-3 rounded-xl font-black text-sm hover:bg-amber-600 transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        ✏️ Edit
                      </button>
                    )}
                    <button
                      onClick={handleBulkDeleteSchedules}
                      className="w-full sm:w-auto bg-rose-600 text-white px-5 py-3 rounded-xl font-black text-sm hover:bg-rose-700 transition-all shadow-lg flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      🗑️ Hapus ({selectedScheduleIds.length})
                    </button>
                  </>
                )}
                <button
                  onClick={() => setShowAddScheduleModal(true)}
                  className="w-full sm:w-auto bg-indigo-600 text-white px-6 py-3 rounded-xl md:rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg whitespace-nowrap"
                >
                  + Tambah Jadwal
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800/60 rounded-2xl">
              <table className="w-full text-sm text-left border-collapse whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-[#0F172A] text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800/60">
                  <tr>
                    <th className="p-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredSchedules.length > 0 &&
                          selectedScheduleIds.length ===
                            filteredSchedules.length
                        }
                        onChange={handleToggleSelectAllSchedules}
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                      />
                    </th>
                    <th className="p-4 font-bold">Hari</th>
                    <th className="p-4 font-bold">Kelas & Mapel</th>
                    <th className="p-4 font-bold">Guru Pengajar</th>
                    <th className="p-4 font-bold text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSchedules.length === 0 ? (
                    <tr>
                      <td
                        colSpan="5"
                        className="p-8 text-center text-slate-400 italic font-medium"
                      >
                        Jadwal mengajar tidak ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredSchedules.map((sch) => (
                      <tr
                        key={sch.id}
                        className={`border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-[#1E293B]/50 transition-colors ${selectedScheduleIds.includes(sch.id) ? "bg-indigo-50/40 dark:bg-indigo-950/20" : ""}`}
                      >
                        <td className="p-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedScheduleIds.includes(sch.id)}
                            onChange={() => handleToggleSelectSchedule(sch.id)}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                          />
                        </td>
                        <td className="p-4 font-black text-indigo-600 dark:text-indigo-400">
                          {sch.day_name}
                          <span className="block text-[11px] font-bold text-slate-400 dark:text-slate-500 mt-0.5">
                            Sesi {sch.session_order || "-"}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-slate-800 dark:text-white bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded mr-2">
                            {sch.classes?.class_name}
                          </span>
                          <span className="font-medium text-slate-600 dark:text-slate-400">
                            {sch.subjects?.subject_name}
                          </span>
                          <span className="block text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-mono">
                            ⏱️ {sch.start_time?.substring(0, 5) || "--:--"} -{" "}
                            {sch.end_time?.substring(0, 5) || "--:--"} WIB
                          </span>
                        </td>
                        <td className="p-4 font-medium text-slate-700 dark:text-slate-300">
                          {(() => {
                            const mapelDasar = [
                              "matematika",
                              "mtk",
                              "bahasa indonesia",
                              "b indo",
                              "ipa",
                              "ips",
                              "pancasila",
                              "pkn",
                              "seni budaya",
                            ];
                            const namaMapel =
                              sch.subjects?.subject_name?.toLowerCase() || "";
                            if (
                              mapelDasar.some((mapel) =>
                                namaMapel.includes(mapel),
                              )
                            )
                              return (
                                sch.classes?.profiles?.full_name ||
                                "- (Wali Kelas Belum Diatur)"
                              );
                            return sch.profiles?.full_name || "-";
                          })()}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-3">
                            <button
                              onClick={() => {
                                setEditScheduleData({
                                  id: sch.id,
                                  teacher_id: sch.teacher_id || "",
                                  class_id: sch.class_id || "",
                                  subject_id: sch.subject_id || "",
                                  day_name: sch.day_name || "",
                                  session_order: sch.session_order || "",
                                  start_time: sch.start_time || "",
                                  end_time: sch.end_time || "",
                                });
                                setShowEditScheduleModal(true);
                              }}
                              className="text-amber-500 dark:text-amber-400 font-bold hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget({
                                  id: sch.id,
                                  name: `Jadwal ${sch.subjects?.subject_name} - ${sch.classes?.class_name}`,
                                  table: "teaching_schedule",
                                });
                                setShowDeleteModal(true);
                              }}
                              className="text-rose-600 dark:text-rose-400 font-bold hover:underline"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* MODAL HAPUS */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm"
              onClick={() => setShowDeleteModal(false)}
            ></div>
            <div className="relative w-full max-w-md transform overflow-hidden rounded-[24px] bg-white dark:bg-[#1E293B] p-6 text-center shadow-2xl border border-slate-100 dark:border-slate-800 animate-fadeInFast">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-500/10 mb-4 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/40">
                <svg
                  className="h-7 w-7"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Hapus Data
              </h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Apakah Anda yakin ingin menghapus <b>{deleteTarget.name}</b>?
              </p>
              <div className="mt-6 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(false)}
                  className="w-full rounded-xl bg-slate-100 dark:bg-slate-800 py-3 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await handleDelete(
                      deleteTarget.table,
                      deleteTarget.id,
                      true,
                    );
                    setShowDeleteModal(false);
                  }}
                  className="w-full rounded-xl bg-rose-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-rose-700 transition-all"
                >
                  Ya, Hapus
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL TAMBAH SISWA */}
        {showStudentsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="p-6 md:p-8 rounded-[24px] md:rounded-[32px] w-full max-w-md shadow-2xl bg-white dark:bg-[#0F172A] border dark:border-slate-800 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl md:text-2xl font-black mb-6 text-slate-800 dark:text-white">
                Tambah Siswa Baru
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddData("students", newStudent, () => {
                    setNewStudent((prev) => ({
                      full_name: "",
                      nis: "",
                      class_id: prev.class_id,
                      gender: "",
                    }));
                    setShowStudentsModal(false);
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Pilih Kelas
                  </label>
                  <select
                    required
                    className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newStudent.class_id}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, class_id: e.target.value })
                    }
                  >
                    <option value="">Pilih Kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.class_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    required
                    placeholder="Misal: Siswa"
                    className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border font-bold text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newStudent.full_name}
                    onChange={(e) =>
                      setNewStudent({
                        ...newStudent,
                        full_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    NISN/NIS
                  </label>
                  <input
                    required
                    placeholder="Misal: 1000"
                    className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border font-bold text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newStudent.nis}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, nis: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Gender
                  </label>
                  <select
                    required
                    className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={newStudent.gender}
                    onChange={(e) =>
                      setNewStudent({ ...newStudent, gender: e.target.value })
                    }
                  >
                    <option value="">Gender</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div className="flex gap-4 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowStudentsModal(false)}
                    className="w-1/3 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black shadow-lg text-sm"
                  >
                    Simpan Data
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL EDIT SISWA */}
        {showEditStudentModal && editStudentData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="p-6 md:p-8 rounded-[24px] md:rounded-[32px] w-full max-w-md shadow-2xl bg-white dark:bg-[#0F172A] border dark:border-slate-800 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl md:text-2xl font-black mb-6 text-slate-800 dark:text-white">
                Edit Data Siswa
              </h2>
              <form onSubmit={handleUpdateStudent} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Pilih Kelas
                  </label>
                  <select
                    required
                    className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editStudentData.class_id}
                    onChange={(e) =>
                      setEditStudentData({
                        ...editStudentData,
                        class_id: e.target.value,
                      })
                    }
                  >
                    <option value="">Pilih Kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.class_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    required
                    className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border font-bold text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editStudentData.full_name}
                    onChange={(e) =>
                      setEditStudentData({
                        ...editStudentData,
                        full_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    NISN/NIS
                  </label>
                  <input
                    required
                    className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border font-bold text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 font-mono focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editStudentData.nis}
                    onChange={(e) =>
                      setEditStudentData({
                        ...editStudentData,
                        nis: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Gender
                  </label>
                  <select
                    required
                    className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={editStudentData.gender}
                    onChange={(e) =>
                      setEditStudentData({
                        ...editStudentData,
                        gender: e.target.value,
                      })
                    }
                  >
                    <option value="">Gender</option>
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </div>
                <div className="flex gap-4 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowEditStudentModal(false)}
                    className="w-1/3 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 md:py-4 bg-amber-500 text-white rounded-xl md:rounded-2xl font-black shadow-lg text-sm"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL TAMBAH GURU */}
        {showTeacherModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="p-6 md:p-8 rounded-[24px] md:rounded-[32px] w-full max-w-md shadow-2xl bg-white dark:bg-[#0F172A] border dark:border-slate-800 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl md:text-2xl font-black mb-6 text-slate-800 dark:text-white">
                Tambah Guru Baru
              </h2>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    const { data: authData, error: authError } =
                      await supabase.auth.signUp({
                        email: newTeacher.email,
                        password: newTeacher.password,
                      });
                    if (authError) throw authError;
                    handleAddData(
                      "profiles",
                      {
                        id: authData.user.id,
                        full_name: newTeacher.full_name,
                        username: newTeacher.username,
                        email: newTeacher.email,
                        roles: [newTeacher.roles],
                      },
                      () => {
                        setNewTeacher({
                          full_name: "",
                          username: "",
                          email: "",
                          password: "",
                          roles: "teacher",
                        });
                        setShowTeacherModal(false);
                      },
                    );
                  } catch (error) {
                    alert("Gagal mendaftarkan guru: " + error.message);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    required
                    placeholder="Misal: Guru, S.Pd"
                    className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border font-bold text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newTeacher.full_name}
                    onChange={(e) =>
                      setNewTeacher({
                        ...newTeacher,
                        full_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Username
                  </label>
                  <input
                    required
                    placeholder="Misal: Guru"
                    className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border font-bold text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newTeacher.username}
                    onChange={(e) =>
                      setNewTeacher({ ...newTeacher, username: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Email
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="Misal: guru@padmajaya.sch.id"
                    className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border font-bold text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newTeacher.email}
                    onChange={(e) =>
                      setNewTeacher({ ...newTeacher, email: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Password
                  </label>
                  <input
                    required
                    type="password"
                    placeholder="Minimal 6 karakter"
                    className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border font-bold text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newTeacher.password}
                    onChange={(e) =>
                      setNewTeacher({ ...newTeacher, password: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Role / Jabatan
                  </label>
                  <select
                    required
                    className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={newTeacher.roles}
                    onChange={(e) =>
                      setNewTeacher({ ...newTeacher, roles: e.target.value })
                    }
                  >
                    <option value="teacher">Guru Pengajar</option>
                    <option value="homeroom">Wali Kelas</option>
                    <option value="admin">Admin Master</option>
                  </select>
                </div>
                <div className="flex gap-4 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowTeacherModal(false)}
                    className="w-1/3 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 md:py-4 bg-indigo-600 text-white rounded-xl md:rounded-2xl font-black shadow-lg text-sm"
                  >
                    Simpan Data
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL EDIT GURU */}
        {showEditTeacherModal && editTeacherData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="p-6 md:p-8 rounded-[24px] md:rounded-[32px] w-full max-w-md shadow-2xl bg-white dark:bg-[#0F172A] border dark:border-slate-800 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl md:text-2xl font-black mb-6 text-slate-800 dark:text-white">
                Edit Data Guru
              </h2>
              <form onSubmit={handleUpdateTeacher} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    required
                    className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border font-bold text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editTeacherData.full_name}
                    onChange={(e) =>
                      setEditTeacherData({
                        ...editTeacherData,
                        full_name: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Username
                  </label>
                  <input
                    required
                    className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border font-bold text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editTeacherData.username}
                    onChange={(e) =>
                      setEditTeacherData({
                        ...editTeacherData,
                        username: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Email (Hanya Dilihat)
                  </label>
                  <input
                    disabled
                    type="email"
                    className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border font-bold text-sm bg-slate-100 text-slate-500 dark:bg-[#1E293B] dark:border-slate-800 cursor-not-allowed"
                    value={editTeacherData.email}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Role / Jabatan
                  </label>
                  <select
                    required
                    className="w-full p-3.5 md:p-4 rounded-xl md:rounded-2xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none focus:ring-2 focus:ring-indigo-500"
                    value={editTeacherData.roles}
                    onChange={(e) =>
                      setEditTeacherData({
                        ...editTeacherData,
                        roles: e.target.value,
                      })
                    }
                  >
                    <option value="teacher">Guru Pengajar</option>
                    <option value="homeroom">Wali Kelas</option>
                    <option value="admin">Admin Master</option>
                  </select>
                </div>
                <div className="flex gap-4 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowEditTeacherModal(false)}
                    className="w-1/3 py-3 md:py-4 rounded-xl md:rounded-2xl font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 md:py-4 bg-amber-500 text-white rounded-xl md:rounded-2xl font-black shadow-lg text-sm"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL TAMBAH JADWAL */}
        {showAddScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="p-6 md:p-8 rounded-[24px] md:rounded-[32px] w-full max-w-2xl shadow-2xl bg-white dark:bg-[#0F172A] border dark:border-slate-800 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl md:text-2xl font-black mb-6 text-slate-800 dark:text-white">
                Tambah Jadwal
              </h2>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleAddData("teaching_schedule", newSchedule, () => {
                    setNewSchedule({
                      teacher_id: "",
                      class_id: "",
                      subject_id: "",
                      day_name: "",
                      session_order: "",
                      start_time: "",
                      end_time: "",
                    });
                    setShowAddScheduleModal(false);
                  });
                }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Guru
                  </label>
                  <select
                    className="w-full p-3.5 md:p-4 rounded-xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none"
                    value={newSchedule.teacher_id}
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        teacher_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Pilih Guru</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Kelas
                  </label>
                  <select
                    className="w-full p-3.5 md:p-4 rounded-xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none"
                    value={newSchedule.class_id}
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        class_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Pilih Kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.class_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Mapel
                  </label>
                  <select
                    className="w-full p-3.5 md:p-4 rounded-xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none"
                    value={newSchedule.subject_id}
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        subject_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Pilih Mapel</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subject_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Hari
                  </label>
                  <select
                    className="w-full p-3.5 md:p-4 rounded-xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none"
                    value={newSchedule.day_name}
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        day_name: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Pilih Hari</option>
                    {["Senin", "Selasa", "Rabu", "Kamis", "Jumat"].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Sesi Ke-
                  </label>
                  <select
                    className="w-full p-3.5 md:p-4 rounded-xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none"
                    value={newSchedule.session_order}
                    onChange={(e) =>
                      setNewSchedule({
                        ...newSchedule,
                        session_order: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Pilih Sesi</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => (
                      <option key={num} value={num}>
                        Sesi {num}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Mulai
                    </label>
                    <input
                      type="time"
                      className="w-full p-3.5 md:p-4 rounded-xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none"
                      value={newSchedule.start_time}
                      onChange={(e) =>
                        setNewSchedule({
                          ...newSchedule,
                          start_time: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Selesai
                    </label>
                    <input
                      type="time"
                      className="w-full p-3.5 md:p-4 rounded-xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none"
                      value={newSchedule.end_time}
                      onChange={(e) =>
                        setNewSchedule({
                          ...newSchedule,
                          end_time: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="sm:col-span-2 flex gap-4 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowAddScheduleModal(false)}
                    className="w-1/3 py-3 md:py-4 rounded-xl font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 md:py-4 bg-indigo-600 text-white rounded-xl font-black shadow-lg text-sm"
                  >
                    Simpan Data
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL EDIT JADWAL */}
        {showEditScheduleModal && editScheduleData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="p-6 md:p-8 rounded-[24px] md:rounded-[32px] w-full max-w-2xl shadow-2xl bg-white dark:bg-[#0F172A] border dark:border-slate-800 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl md:text-2xl font-black mb-6 text-slate-800 dark:text-white">
                Edit Jadwal
              </h2>
              <form
                onSubmit={handleUpdateSchedule}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Guru
                  </label>
                  <select
                    className="w-full p-3.5 md:p-4 rounded-xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none"
                    value={editScheduleData.teacher_id}
                    onChange={(e) =>
                      setEditScheduleData({
                        ...editScheduleData,
                        teacher_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Pilih Guru</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.full_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Kelas
                  </label>
                  <select
                    className="w-full p-3.5 md:p-4 rounded-xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none"
                    value={editScheduleData.class_id}
                    onChange={(e) =>
                      setEditScheduleData({
                        ...editScheduleData,
                        class_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Pilih Kelas</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.class_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Mapel
                  </label>
                  <select
                    className="w-full p-3.5 md:p-4 rounded-xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none"
                    value={editScheduleData.subject_id}
                    onChange={(e) =>
                      setEditScheduleData({
                        ...editScheduleData,
                        subject_id: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Pilih Mapel</option>
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.subject_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Hari
                  </label>
                  <select
                    className="w-full p-3.5 md:p-4 rounded-xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none"
                    value={editScheduleData.day_name}
                    onChange={(e) =>
                      setEditScheduleData({
                        ...editScheduleData,
                        day_name: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Pilih Hari</option>
                    {["Senin", "Selasa", "Rabu", "Kamis", "Jumat"].map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Sesi Ke-
                  </label>
                  <select
                    className="w-full p-3.5 md:p-4 rounded-xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none"
                    value={editScheduleData.session_order}
                    onChange={(e) =>
                      setEditScheduleData({
                        ...editScheduleData,
                        session_order: e.target.value,
                      })
                    }
                    required
                  >
                    <option value="">Pilih Sesi</option>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => (
                      <option key={num} value={num}>
                        Sesi {num}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Mulai
                    </label>
                    <input
                      type="time"
                      className="w-full p-3.5 md:p-4 rounded-xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none"
                      value={editScheduleData.start_time}
                      onChange={(e) =>
                        setEditScheduleData({
                          ...editScheduleData,
                          start_time: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Selesai
                    </label>
                    <input
                      type="time"
                      className="w-full p-3.5 md:p-4 rounded-xl border font-black text-sm bg-slate-50 dark:bg-[#020617] dark:text-white dark:border-slate-700 outline-none"
                      value={editScheduleData.end_time}
                      onChange={(e) =>
                        setEditScheduleData({
                          ...editScheduleData,
                          end_time: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="sm:col-span-2 flex gap-4 pt-4 mt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowEditScheduleModal(false)}
                    className="w-1/3 py-3 md:py-4 rounded-xl font-bold bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 md:py-4 bg-amber-500 text-white rounded-xl font-black shadow-lg text-sm"
                  >
                    Simpan
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
