"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import { collection, getDocs, doc, setDoc, query, where } from "firebase/firestore";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Settings } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [domains, setDomains] = useState([]);
  const [appliedFaculties, setAppliedFaculties] = useState(new Set());

  // Ensure component renders only on the client
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!user || !isClient) return;

    const fetchData = async () => {
      try {
        // ✅ Fetch faculty users directly using Firestore query
        const facultyQuery = query(collection(db, "users"), where("role", "==", "faculty"));
        const facultySnapshot = await getDocs(facultyQuery);
        
        const facultyList = facultySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFaculties(facultyList);

        // ✅ Extract unique domains
        const uniqueDomains = new Set();
        facultyList.forEach(faculty => {
          faculty.facultyDomains?.forEach(domain => uniqueDomains.add(domain));
        });
        setDomains([...uniqueDomains]);

        // ✅ Fetch applied faculties (Fix: Using "facultyApplications" collection)
        const applicationsSnapshot = await getDocs(collection(db, "facultyApplications"));
        const appliedSet = new Set();
        
        applicationsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.studentId === user.uid) {
            appliedSet.add(data.facultyId);
          }
        });

        setAppliedFaculties(appliedSet);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Failed to load faculty profiles.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user, isClient]);

  if (!isClient) return null;

  // ✅ Filter faculties based on search and domain selection
  const filteredFaculties = faculties.filter(faculty =>
    (selectedDomain === "all" || faculty.facultyDomains?.includes(selectedDomain)) &&
    (faculty.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // ✅ Apply to Faculty (Fix: Using correct collection "facultyApplications")
  const handleApply = async (faculty) => {
    if (!user) {
      toast.error("You must be logged in to apply.");
      return;
    }

    if (appliedFaculties.has(faculty.id)) {
      toast.error("You have already applied to this faculty.");
      return;
    }

    try {
      const applicationRef = doc(db, "facultyApplications", `${user.uid}_${faculty.id}`);
      await setDoc(applicationRef, {
        studentId: user.uid,
        facultyId: faculty.id,
        facultyName: faculty.name,
        studentName: user.displayName || "Student",
        status: "pending",
        appliedAt: new Date(),
      });

      setAppliedFaculties(prev => new Set([...prev, faculty.id]));
      toast.success(`Application sent to ${faculty.name}`);

    } catch (error) {
      console.error("Error applying:", error);
      toast.error("Failed to apply. Try again later.");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header Section */}
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

      {/* Search and Filter Section */}
      <div className="flex flex-col md:flex-row gap-4">
        <Input
          placeholder="Search faculty by name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="md:w-1/2"
        />
        <Select value={selectedDomain} onValueChange={setSelectedDomain}>
          <SelectTrigger className="md:w-1/2">
            <SelectValue placeholder="Filter by domain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Domains</SelectItem>
            {domains.map((domain, index) => (
              <SelectItem key={index} value={domain}>{domain}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Faculty List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p>Loading faculties...</p>
        ) : filteredFaculties.length === 0 ? (
          <p>No faculties found.</p>
        ) : (
          filteredFaculties.map(faculty => (
            <Card key={faculty.id} className="p-4">
              <CardHeader>
                <CardTitle>{faculty.name || "Faculty"}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Domains: {faculty.facultyDomains?.join(", ") || "N/A"}</p>
                <Button
                  className="mt-4"
                  disabled={appliedFaculties.has(faculty.id)}
                  onClick={() => handleApply(faculty)}
                >
                  {appliedFaculties.has(faculty.id) ? "Applied" : "Apply"}
                </Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}