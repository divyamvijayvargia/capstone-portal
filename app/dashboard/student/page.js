"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import { collection, getDocs, doc, setDoc, query, where, deleteDoc, getDoc } from "firebase/firestore"; // Added getDoc import
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Settings, Trash2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [faculties, setFaculties] = useState([]);
  const [appliedFaculties, setAppliedFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [domains, setDomains] = useState([]);
  const [userData, setUserData] = useState(null);

  // Ensure component renders only on the client
  const [isClient, setIsClient] = useState(false);
  useEffect(() => setIsClient(true), []);

  useEffect(() => {
    if (!user || !isClient) return;

    const fetchData = async () => {
      try {
        // Fetch current user data
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data());
        }

        // Fetch faculty users
        const facultyQuery = query(collection(db, "users"), where("role", "==", "faculty"));
        const facultySnapshot = await getDocs(facultyQuery);

        const facultyList = facultySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setFaculties(facultyList);

        // Extract unique domains
        const uniqueDomains = new Set();
        facultyList.forEach(faculty => {
          faculty.facultyDomains?.forEach(domain => uniqueDomains.add(domain));
        });
        setDomains([...uniqueDomains]);

        // Fetch applied faculties
        const applicationsSnapshot = await getDocs(
          query(collection(db, "facultyApplications"), where("studentId", "==", user.uid))
        );
        const appliedList = await Promise.all(
          applicationsSnapshot.docs.map(async (appDoc) => {
            const applicationData = { id: appDoc.id, ...appDoc.data() };

            // Fetch full faculty details
            const facultyDoc = await getDoc(doc(db, "users", applicationData.facultyId));
            return {
              ...applicationData,
              facultyDetails: facultyDoc.exists() ? facultyDoc.data() : null
            };
          })
        );
        setAppliedFaculties(appliedList);
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

  // Filter faculties based on search and domain selection
  const filteredFaculties = faculties.filter(faculty =>
    (selectedDomain === "all" || faculty.facultyDomains?.includes(selectedDomain)) &&
    (faculty.name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    !appliedFaculties.some(app => app.facultyId === faculty.id)
  );

  // Apply to Faculty
  const handleApply = async (faculty) => {
    if (!user) {
      toast.error("You must be logged in to apply.");
      return;
    }

    try {
      const applicationRef = doc(db, "facultyApplications", `${user.uid}_${faculty.id}`);
      await setDoc(applicationRef, {
        studentId: user.uid,
        facultyId: faculty.id,
        facultyName: faculty.name,
        studentName: userData?.name || "Student", // Use the user's actual name
        status: "pending",
        appliedAt: new Date(),
      });

      // Refetch applied faculties to update the list
      const applicationsSnapshot = await getDocs(
        query(collection(db, "facultyApplications"), where("studentId", "==", user.uid))
      );
      const appliedList = await Promise.all(
        applicationsSnapshot.docs.map(async (appDoc) => {
          const applicationData = { id: appDoc.id, ...appDoc.data() };

          const facultyDoc = await getDoc(doc(db, "users", applicationData.facultyId));
          return {
            ...applicationData,
            facultyDetails: facultyDoc.exists() ? facultyDoc.data() : null
          };
        })
      );
      setAppliedFaculties(appliedList);

      toast.success(`Application sent to ${faculty.name}`);
    } catch (error) {
      console.error("Error applying:", error);
      toast.error("Failed to apply. Try again later.");
    }
  };

  // Withdraw Application
  const handleWithdraw = async (applicationId) => {
    try {
      await deleteDoc(doc(db, "facultyApplications", applicationId));

      // Update applied faculties list
      const updatedAppliedFaculties = appliedFaculties.filter(app => app.id !== applicationId);
      setAppliedFaculties(updatedAppliedFaculties);

      toast.success("Application withdrawn successfully.");
    } catch (error) {
      console.error("Error withdrawing application:", error);
      toast.error("Failed to withdraw application.");
    }
  };

  // Helper function to determine badge styling based on status
  const getBadgeVariant = (status) => {
    switch (status.toLowerCase()) {
      case 'accepted':
        return "success";
      case 'rejected':
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Hello, {userData?.name || "Student"}</h1>
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

      {/* Applied Faculties Section - Now FULL WIDTH */}
      {appliedFaculties.length > 0 && (
        <div className="w-full">
          <h2 className="text-2xl font-semibold mb-4">Applied Faculties</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {appliedFaculties.map(application => (
              <Card key={application.id} className="p-4">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>
                    {application.facultyDetails?.name || "Faculty"}
                  </CardTitle>
                  <Badge variant={getBadgeVariant(application.status)}>
                    {application.status}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <p>Domains: {application.facultyDetails?.facultyDomains?.join(", ") || "N/A"}</p>
                  <div className="flex justify-between items-center mt-4">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleWithdraw(application.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Withdraw
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available Faculties Section */}
      <div className="w-full">
        <h2 className="text-2xl font-semibold mb-4">Available Faculties</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <p>Loading faculties...</p>
          ) : filteredFaculties.length === 0 ? (
            <p>No faculties available.</p>
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
                    onClick={() => handleApply(faculty)}
                  >
                    Apply
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}