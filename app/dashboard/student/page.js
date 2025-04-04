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
import { LogOut, Settings, Trash2, ChevronDown, ChevronUp, User } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const [maxApplications] = useState(5); // Maximum allowed applications
  const [facultyLimits, setFacultyLimits] = useState({});
  const [expandedFaculty, setExpandedFaculty] = useState(null);

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
          const data = userDoc.data();
          setUserData(data);
          
          // If student is already accepted, don't show any available faculties
          if (data.isAccepted) {
            setFaculties([]);
            
            // If accepted, fetch only the accepted application
            if (data.acceptedFacultyId) {
              const acceptedAppQuery = query(
                collection(db, "facultyApplications"),
                where("studentId", "==", user.uid),
                where("facultyId", "==", data.acceptedFacultyId),
                where("status", "==", "Accepted")
              );
              const acceptedAppSnapshot = await getDocs(acceptedAppQuery);
              
              if (!acceptedAppSnapshot.empty) {
                const acceptedAppDoc = acceptedAppSnapshot.docs[0];
                const applicationData = { id: acceptedAppDoc.id, ...acceptedAppDoc.data() };
                const facultyDoc = await getDoc(doc(db, "users", applicationData.facultyId));
                
                setAppliedFaculties([{
                  ...applicationData,
                  facultyDetails: facultyDoc.exists() ? facultyDoc.data() : null
                }]);
              } else {
                setAppliedFaculties([]);
              }
            }
            
            return;
          }
        }

        // Fetch faculty users and their accepted applications count
        const facultyQuery = query(collection(db, "users"), where("role", "==", "faculty"));
        const facultySnapshot = await getDocs(facultyQuery);
        const facultyList = facultySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Fetch all faculty applications to count accepted students
        const allApplicationsQuery = query(collection(db, "facultyApplications"), where("status", "==", "Accepted"));
        const allApplicationsSnapshot = await getDocs(allApplicationsQuery);
        const acceptedApplications = allApplicationsSnapshot.docs.map(doc => doc.data());

        // Calculate accepted counts for each faculty
        const facultyAcceptedCounts = {};
        acceptedApplications.forEach(app => {
          if (!facultyAcceptedCounts[app.facultyId]) {
            facultyAcceptedCounts[app.facultyId] = { ug: 0, pg: 0, masters: 0 };
          }
          // Get student type from the application or fetch it if needed
          const studentType = app.studentType?.toLowerCase() || "unknown";
          if (studentType in facultyAcceptedCounts[app.facultyId]) {
            facultyAcceptedCounts[app.facultyId][studentType]++;
          }
        });

        setFacultyLimits(facultyAcceptedCounts);
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
  const filteredFaculties = faculties.filter(faculty => {
    // Check if faculty has reached their limit for the student's category
    const studentType = userData?.studentType?.toLowerCase() || "unknown";
    const facultyAcceptedCount = facultyLimits[faculty.id]?.[studentType] || 0;
    const facultyLimit = parseInt(faculty[`${studentType}Limit`]) || 0;
    const isLimitReached = facultyLimit > 0 && facultyAcceptedCount >= facultyLimit;

    return (
    (selectedDomain === "all" || faculty.facultyDomains?.includes(selectedDomain)) &&
    (faculty.name?.toLowerCase().includes(searchTerm.toLowerCase())) &&
      !appliedFaculties.some(app => app.facultyId === faculty.id) &&
      !isLimitReached
  );
  });

  // Add this after the filteredFaculties definition
  const remainingSlots = maxApplications - appliedFaculties.length;

  // Modify the handleApply function
  const handleApply = async (faculty) => {
    if (!user) {
      toast.error("You must be logged in to apply.");
      return;
    }

    if (userData?.isAccepted) {
      toast.error("You have already been accepted by a faculty. You cannot apply to others.");
      return;
    }

    if (appliedFaculties.length >= maxApplications) {
      toast.error(`You can only apply to ${maxApplications} faculties at a time. Please withdraw some applications first.`);
      return;
    }

    try {
      const applicationRef = doc(db, "facultyApplications", `${user.uid}_${faculty.id}`);
      await setDoc(applicationRef, {
        studentId: user.uid,
        facultyId: faculty.id,
        facultyName: faculty.name,
        studentName: userData?.name || "Student",
        studentType: userData?.studentType || "unknown",
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
    // Get the application to check its status
    const applicationToWithdraw = appliedFaculties.find(app => app.id === applicationId);
    
    // Prevent withdrawing an accepted application
    if (applicationToWithdraw?.status === "Accepted" || userData?.isAccepted) {
      toast.error("You cannot withdraw an accepted application.");
      return;
    }
    
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

  // Update the getStatusStyles function for better contrast
  const getStatusStyles = (status) => {
    return {
      row: 'bg-slate-100 hover:bg-slate-200 border-b border-slate-300',
      expanded: 'bg-slate-200 border-t border-slate-300',
      text: 'text-slate-900'
    };
  };

  if (userData?.isAccepted) {
    return (
      <div className="min-h-screen bg-background p-6 space-y-6">
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

        <Card className="bg-green-50 border-green-200">
          <CardHeader>
            <CardTitle className="text-green-700">Congratulations!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-green-600">
              You have been accepted by a faculty. Your application has been confirmed and all other applications have been automatically removed.
            </p>
          </CardContent>
        </Card>

        {/* Show only the Accepted Faculty section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Your Accepted Faculty</h2>
          {appliedFaculties.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Faculty Name</TableHead>
                  <TableHead>Domains</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appliedFaculties.map(application => (
                  <TableRow 
                    key={application.id}
                    className="cursor-pointer bg-slate-100 hover:bg-slate-200 border-b border-slate-300"
                  >
                    <TableCell className="flex items-center gap-2 text-slate-900">
                      <User className="h-4 w-4 text-slate-700" />
                      {application.facultyDetails?.name || "Faculty"}
                    </TableCell>
                    <TableCell className="text-slate-900">
                      {application.facultyDetails?.facultyDomains?.join(", ") || "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="success" className="text-white bg-green-600 hover:bg-green-700">
                        Accepted
                      </Badge>
                    </TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Card>
              <CardContent className="p-4">
                <p className="text-muted-foreground">Your accepted faculty information is loading...</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

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

      {/* Application Slots Counter */}
      <div className="bg-slate-200 border border-slate-400 rounded-lg p-4 mb-4">
        <h3 className="text-lg font-semibold mb-2 text-slate-900">Application Slots</h3>
        <div className="flex items-center justify-between">
          <p className="text-slate-900 font-medium">Available Slots: {remainingSlots} of {maxApplications}</p>
          <Badge variant="secondary" className="bg-slate-300 text-slate-900 border border-slate-400">
            {remainingSlots > 0 ? "Slots Available" : "No Slots Available"}
                  </Badge>
        </div>
      </div>

      {/* Available Faculties Section */}
      <div className="w-full">
        <h2 className="text-2xl font-semibold mb-4">Available Faculties</h2>
          {loading ? (
            <p>Loading faculties...</p>
          ) : filteredFaculties.length === 0 ? (
            <p>No faculties available.</p>
          ) : (
          <div className="rounded-md border border-slate-300 bg-slate-100 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-200 border-b border-slate-300">
                  <TableHead className="w-[40%] font-semibold text-slate-900">Faculty Name</TableHead>
                  <TableHead className="w-[40%] font-semibold text-slate-900">Domains</TableHead>
                  <TableHead className="w-[20%] font-semibold text-slate-900">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFaculties.map(faculty => (
                  <>
                    <TableRow 
                      key={faculty.id}
                      className="cursor-pointer bg-slate-100 hover:bg-slate-200 border-b border-slate-300"
                      onClick={() => setExpandedFaculty(expandedFaculty === faculty.id ? null : faculty.id)}
                    >
                      <TableCell className="flex items-center gap-2 text-slate-900">
                        <User className="h-4 w-4 text-slate-700" />
                        {faculty.name || "Faculty"}
                        {expandedFaculty === faculty.id ? (
                          <ChevronUp className="h-4 w-4 text-slate-700" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-700" />
                        )}
                      </TableCell>
                      <TableCell className="text-slate-900">
                        {faculty.facultyDomains?.join(", ") || "N/A"}
                      </TableCell>
                      <TableCell>
                  <Button
                          size="sm"
                          variant="secondary"
                          className="hover:bg-slate-300"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApply(faculty);
                          }}
                  >
                    Apply
                  </Button>
                      </TableCell>
                    </TableRow>
                    {expandedFaculty === faculty.id && (
                      <TableRow className="bg-slate-200 border-b border-slate-300">
                        <TableCell colSpan={3}>
                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-2 text-slate-900">Department(s)</h4>
                                <p className="text-slate-800">{faculty.facultyDepartment?.join(", ") || "N/A"}</p>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2 text-slate-900">Employee ID</h4>
                                <p className="text-slate-800">{faculty.empId || "N/A"}</p>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2 text-slate-900">Student Intake Limits</h4>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <p className="text-sm text-slate-800">UG Students</p>
                                  <p className="text-slate-800">{faculty.ugLimit || "Not specified"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-slate-800">PG Students</p>
                                  <p className="text-slate-800">{faculty.pgLimit || "Not specified"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-slate-800">Master's Students</p>
                                  <p className="text-slate-800">{faculty.mastersLimit || "Not specified"}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
        </div>
        )}
      </div>

      {/* Applied Faculties Section - Also convert to table format */}
      {appliedFaculties.length > 0 && (
        <div className="w-full">
          <h2 className="text-2xl font-semibold mb-4">Applied Faculties</h2>
          <div className="rounded-md border border-slate-300 bg-slate-100 shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-200 border-b border-slate-300">
                  <TableHead className="w-[35%] font-semibold text-slate-900">Faculty Name</TableHead>
                  <TableHead className="w-[35%] font-semibold text-slate-900">Domains</TableHead>
                  <TableHead className="w-[15%] font-semibold text-slate-900">Status</TableHead>
                  <TableHead className="w-[15%] font-semibold text-slate-900">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appliedFaculties.map(application => (
                  <>
                    <TableRow 
                      key={application.id}
                      className="cursor-pointer bg-slate-100 hover:bg-slate-200 border-b border-slate-300"
                      onClick={() => setExpandedFaculty(expandedFaculty === application.id ? null : application.id)}
                    >
                      <TableCell className="flex items-center gap-2 text-slate-900">
                        <User className="h-4 w-4 text-slate-700" />
                        {application.facultyDetails?.name || "Faculty"}
                        {expandedFaculty === application.id ? (
                          <ChevronUp className="h-4 w-4 text-slate-700" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-slate-700" />
                        )}
                      </TableCell>
                      <TableCell className="text-slate-900">
                        {application.facultyDetails?.facultyDomains?.join(", ") || "N/A"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-slate-900 bg-slate-200 hover:bg-slate-300">
                          {application.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleWithdraw(application.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedFaculty === application.id && (
                      <TableRow className="bg-slate-200 border-b border-slate-300">
                        <TableCell colSpan={4}>
                          <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-medium mb-2 text-slate-900">Department(s)</h4>
                                <p className="text-slate-800">{application.facultyDetails?.facultyDepartment?.join(", ") || "N/A"}</p>
                              </div>
                              <div>
                                <h4 className="font-medium mb-2 text-slate-900">Employee ID</h4>
                                <p className="text-slate-800">{application.facultyDetails?.empId || "N/A"}</p>
                              </div>
                            </div>
                            <div>
                              <h4 className="font-medium mb-2 text-slate-900">Student Intake Limits</h4>
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <p className="text-sm text-slate-800">UG Students</p>
                                  <p className="text-slate-800">{application.facultyDetails?.ugLimit || "Not specified"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-slate-800">PG Students</p>
                                  <p className="text-slate-800">{application.facultyDetails?.pgLimit || "Not specified"}</p>
                                </div>
                                <div>
                                  <p className="text-sm text-slate-800">Master's Students</p>
                                  <p className="text-slate-800">{application.facultyDetails?.mastersLimit || "Not specified"}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}