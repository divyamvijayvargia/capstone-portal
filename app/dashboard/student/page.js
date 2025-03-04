'use client';
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import { collection, getDocs } from "firebase/firestore";
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

  // Prevent SSR mismatches by ensuring the component renders only on the client
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!user || !isClient) return;
    const fetchFaculties = async () => {
      try {
        const facultySnapshot = await getDocs(collection(db, "users"));
        const facultyList = facultySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(user => user.role === "faculty");

        setFaculties(facultyList);

        // Extract unique domains
        const uniqueDomains = new Set();
        facultyList.forEach(faculty => {
          faculty.facultyDomains?.forEach(domain => uniqueDomains.add(domain));
        });
        setDomains([...uniqueDomains]);
      } catch (error) {
        console.error("Error fetching faculties:", error);
        toast.error("Failed to load faculty profiles.");
      } finally {
        setLoading(false);
      }
    };
    fetchFaculties();
  }, [user, isClient]);

  // Ensure rendering happens only on the client
  if (!isClient) return null;

  // Filter faculties based on search and domain selection
  const filteredFaculties = faculties.filter(faculty => 
    (selectedDomain === "all" || faculty.facultyDomains?.includes(selectedDomain)) &&
    (faculty.name?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
        <Select value={selectedDomain || "all"} onValueChange={setSelectedDomain}>
          <SelectTrigger className="md:w-1/2">
            <SelectValue placeholder="Filter by domain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Domains</SelectItem>
            {domains.length > 0 && domains.map((domain, index) => (
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
                <Button className="mt-4" onClick={() => console.log("Apply to", faculty.id)}>Apply</Button>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}