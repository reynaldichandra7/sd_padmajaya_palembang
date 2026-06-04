import { supabase } from './supabaseClient';

export const logActivity = async (userId, activity, targetTable = null, targetId = null) => {
  try {
    let clientIp = 'Unknown IP';
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      if (response.ok) {
        const data = await response.json();
        clientIp = data.ip;
      }
    } catch (ipError) {
      console.warn("Gagal mengambil IP, melanjutkan log tanpa IP publik.");
    }

    const userAgent = navigator.userAgent;

    const { error } = await supabase.from("activity_logs").insert([
      {
        user_id: userId,
        activity: activity,
        target_table: targetTable,
        target_id: targetId,
        ip_address: clientIp,
        user_agent: userAgent, 
      }
    ]);

    if (error) throw error;
    
  } catch (error) {
    console.error("Gagal mencatat log aktivitas:", error.message);
  }
};