import fs from "fs";
import path from "path";
import { supabase } from "./supabaseClient";

export interface SessionData {
  id: string;
  date: string;
  studentName: string;
  metrics: {
    totalExamDurationSeconds: number;
    tabSwitches: number;
    offScreenGazeSeconds: number;
    multipleFacesSeconds: number;
    abnormalAudioSeconds: number;
    totalBlinks: number;
    avgEAR: number;
    finalRiskScore: number;
  };
  timeline: {
    timestamp: string;
    event: string;
    details: string;
  }[];
  aiReport?: string | null;
}

const DB_DIR = path.join(process.cwd(), "src", "db");
const DB_FILE = path.join(DB_DIR, "sessions.json");

// Local fallback initialization
function initializeLocalDb() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

// Read sessions from the local JSON file
function getLocalSessions(): SessionData[] {
  initializeLocalDb();
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Failed to read local database file:", err);
    return [];
  }
}

/**
 * Returns all sessions registered in Supabase or falls back to local storage.
 */
export async function getAllSessions(): Promise<SessionData[]> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .order("date", { ascending: false });

      if (error) throw error;

      if (data) {
        return data
          .filter(row => !row.metrics || row.metrics.deleted !== true)
          .map(row => ({
            id: row.id,
            date: new Date(row.date).toLocaleString(),
            studentName: row.student_name,
            metrics: row.metrics,
            timeline: row.timeline,
            aiReport: row.ai_report,
          }));
      }
    } catch (err) {
      console.warn("Supabase fetch failed. Falling back to local file storage.", err);
    }
  }

  return getLocalSessions().filter(s => !s.metrics || (s.metrics as any).deleted !== true);
}

/**
 * Finds a specific session by its unique ID.
 */
export async function getSessionById(id: string): Promise<SessionData | null> {
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        return {
          id: data.id,
          date: new Date(data.date).toLocaleString(),
          studentName: data.student_name,
          metrics: data.metrics,
          timeline: data.timeline,
          aiReport: data.ai_report,
        };
      }
    } catch (err) {
      console.warn("Supabase getById failed. Falling back to local storage.", err);
    }
  }

  const sessions = getLocalSessions();
  return sessions.find(s => s.id === id) || null;
}

/**
 * Inserts or updates a session log.
 */
export async function insertSession(session: Omit<SessionData, "date">): Promise<SessionData> {
  const dateStr = new Date().toISOString();
  
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("sessions")
        .upsert({
          id: session.id,
          date: dateStr,
          student_name: session.studentName,
          metrics: session.metrics,
          timeline: session.timeline,
          ai_report: session.aiReport || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        return {
          id: data.id,
          date: new Date(data.date).toLocaleString(),
          studentName: data.student_name,
          metrics: data.metrics,
          timeline: data.timeline,
          aiReport: data.ai_report,
        };
      }
    } catch (err) {
      console.warn("Supabase upsert failed. Saving to local storage.", err);
    }
  }

  // Local fallback persistence
  initializeLocalDb();
  const sessions = getLocalSessions();
  
  const newSession: SessionData = {
    ...session,
    date: new Date().toLocaleString()
  };

  const existingIdx = sessions.findIndex(s => s.id === session.id);
  if (existingIdx !== -1) {
    sessions[existingIdx] = newSession;
  } else {
    sessions.push(newSession);
  }

  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(sessions, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to local database file:", err);
  }

  return newSession;
}

/**
 * Verifies student Roll No and DOB against Supabase database or local JSON file fallback.
 */
export async function verifyStudent(
  rollNo: string,
  dob: string
): Promise<{ success: boolean; name?: string; error?: string }> {
  // Convert DOB from DDMMYYYY format to YYYY-MM-DD format if needed (e.g. 12042005 to 2005-04-12)
  let formattedDob = dob.trim();
  if (/^\d{8}$/.test(formattedDob)) {
    const day = formattedDob.substring(0, 2);
    const month = formattedDob.substring(2, 4);
    const year = formattedDob.substring(4, 8);
    formattedDob = `${year}-${month}-${day}`;
  }

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("students")
        .select("name")
        .eq("roll_no", rollNo)
        .eq("dob", formattedDob)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return { success: false, error: "Invalid Roll Number or Password (DOB)." };
        }
        throw error;
      }

      if (data) {
        return { success: true, name: data.name };
      }
    } catch (err) {
      console.warn("Supabase student verification failed. Falling back to local verification.", err);
    }
  }

  // Local Fallback
  try {
    const studentsPath = path.join(process.cwd(), "src", "db", "students.json");
    if (fs.existsSync(studentsPath)) {
      const studentsData = fs.readFileSync(studentsPath, "utf-8");
      const students = JSON.parse(studentsData);
      
      const found = students.find(
        (s: any) => s.roll_no.toLowerCase() === rollNo.toLowerCase() && s.dob === formattedDob
      );

      if (found) {
        return { success: true, name: found.name };
      }
    }
  } catch (err) {
    console.error("Local student verification failed:", err);
  }

  return { success: false, error: "Invalid Roll Number or Password (DOB)." };
}
