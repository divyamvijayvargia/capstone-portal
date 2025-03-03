// app/dashboard/student/page.js
'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation"; 
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import { collection, getDocs, addDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Settings } from "lucide-react";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter(); 
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchFaculties = async () => {
      try {
        const facultySnapshot = await getDocs(collection(db, "users"));
        const facultyList = facultySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(user => user.role === "faculty");
        setFaculties(facultyList);
      } catch (error) {
        console.error("Error fetching faculties:", error);
        toast.error("Failed to load faculty profiles.");
      } finally {
        setLoading(false);
      }
    };
    fetchFaculties();
  }, [user]);

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Student Dashboard</h1>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => router.push("/dashboard/student/profile")} className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button variant="destructive" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p>Loading faculties...</p>
        ) : (
          faculties.map(faculty => (
            <Card key={faculty.id} className="p-4">
              <CardHeader>
                <CardTitle>{faculty.name || "Faculty"}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Domains: {faculty.facultyDomains?.join(", ") || "N/A"}</p>
                <Button className="mt-4" onClick={() => console.log("Apply to", faculty.id)}>Apply</Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}