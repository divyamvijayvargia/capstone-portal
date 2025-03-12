'use client';
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import { collection, getDocs, updateDoc, doc, getDoc, query, where } from "firebase/firestore";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut, CheckCircle2, XCircle, GraduationCap, User, BookOpen, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

export default function FacultyDashboard() {
  const { user, logout } = useAuth();
  const [applications, setApplications] = useState([]);
  const [studentDetails, setStudentDetails] = useState({});
  const [facultyName, setFacultyName] = useState("");
  const [facultyLimits, setFacultyLimits] = useState({
    ug: 0,
    pg: 0,
    masters: 0
  });
  const [acceptedCounts, setAcceptedCounts] = useState({
    ug: 0,
    pg: 0,
    masters: 0
  });
  const router = useRouter();

  useEffect(() => {
    if (!user) return;

    const fetchFacultyData = async () => {
      try {
        const facultyDoc = await getDoc(doc(db, "users", user.uid));
        if (facultyDoc.exists()) {
          const facultyData = facultyDoc.data();
          setFacultyName(facultyData.name || user.displayName || user.email);
          setFacultyLimits({
            ug: parseInt(facultyData.ugLimit) || 0,
            pg: parseInt(facultyData.pgLimit) || 0,
            masters: parseInt(facultyData.mastersLimit) || 0
          });
        } else {
          setFacultyName(user.displayName || user.email);
        }
      } catch (error) {
        console.error("Error fetching faculty details:", error);
        setFacultyName(user.displayName || user.email);
      }
    };

    const fetchApplications = async () => {
      try {
        const applicationsQuery = query(
          collection(db, "facultyApplications"),
          where("facultyId", "==", user.uid)
        );
        const applicationsSnapshot = await getDocs(applicationsQuery);

        const facultyApps = await Promise.all(
          applicationsSnapshot.docs.map(async (appDoc) => {
            const applicationData = { id: appDoc.id, ...appDoc.data() };

            // Fetch student details
            const studentDoc = await getDoc(doc(db, "users", applicationData.studentId));
            if (studentDoc.exists()) {
              applicationData.studentDetails = studentDoc.data();
            }

            return applicationData;
          })
        );

        setApplications(facultyApps);

        // Calculate accepted counts
        const counts = facultyApps.reduce((acc, app) => {
          if (app.status === "Accepted" && app.studentDetails?.studentType) {
            acc[app.studentDetails.studentType]++;
          }
          return acc;
        }, { ug: 0, pg: 0, masters: 0 });

        setAcceptedCounts(counts);
      } catch (error) {
        console.error("Error fetching applications:", error);
        toast.error("Failed to load applications.");
      }
    };

    fetchFacultyData();
    fetchApplications();
  }, [user]);

  const handleApplicationAction = async (appId, status, studentType) => {
    if (status === "Accepted") {
      const newCount = acceptedCounts[studentType] + 1;
      const limit = facultyLimits[studentType];
      
      if (newCount > limit) {
        toast.error(`Cannot accept more ${studentType.toUpperCase()} students. Limit reached.`);
        return;
      }
    }

    try {
      await updateDoc(doc(db, "facultyApplications", appId), { status });

      setApplications(applications.map(app =>
        app.id === appId ? { ...app, status } : app
      ));

      if (status === "Accepted") {
        setAcceptedCounts({
          ...acceptedCounts,
          [studentType]: acceptedCounts[studentType] + 1
        });
      }

      toast.success(`Application ${status.toLowerCase()} successfully!`);
    } catch (error) {
      console.error(`Error ${status.toLowerCase()}ing application:`, error);
      toast.error(`Failed to ${status.toLowerCase()} application.`);
    }
  };

  const pendingApps = applications.filter(app => app.status === "pending");
  const acceptedApps = applications.filter(app => app.status === "Accepted");
  const rejectedApps = applications.filter(app => app.status === "Rejected");

  const ApplicationCard = ({ application, showActions = false }) => {
    const student = application.studentDetails;
    const studentType = student?.studentType || "unknown";

    return (
      <Card className="mb-4">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">
                {student?.name || "Loading..."}
              </CardTitle>
            </div>
            <Badge variant={
              application.status === "pending" ? "warning" :
                application.status === "Accepted" ? "success" :
                  "destructive"
            }>
              {application.status}
            </Badge>
          </div>
          {student?.registrationNumber && (
            <CardDescription>
              Reg. No: {student.registrationNumber}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {student?.cgpa && (
            <div className="flex items-center space-x-2">
              <GraduationCap className="h-4 w-4 text-muted-foreground" />
              <span>CGPA: {student.cgpa}</span>
            </div>
          )}
          {student?.bio && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Bio:</div>
              <p className="text-sm text-muted-foreground">{student.bio}</p>
            </div>
          )}

          {showActions && (
            <div className="flex space-x-2 pt-2">
              <Button
                className="flex-1"
                variant="default"
                onClick={() => handleApplicationAction(application.id, "Accepted", studentType)}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Accept
              </Button>
              <Button
                className="flex-1"
                variant="destructive"
                onClick={() => handleApplicationAction(application.id, "Rejected", studentType)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">
            Hello, {facultyName || "Faculty"}</h1>
          <p className="text-muted-foreground">
            You can accept or reject applications based on their details.
          </p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => router.push("/dashboard/faculty/profile")} className="gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
          <Button variant="destructive" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Add Category Limits Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Category-wise Student Intake Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="font-medium">Undergraduate (UG)</p>
              <div className="flex justify-between items-center">
                <span>Accepted: {acceptedCounts.ug}</span>
                <span>Limit: {facultyLimits.ug}</span>
                <Badge variant={acceptedCounts.ug < facultyLimits.ug ? "success" : "destructive"}>
                  {acceptedCounts.ug < facultyLimits.ug ? "Slots Available" : "Full"}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Postgraduate (PG)</p>
              <div className="flex justify-between items-center">
                <span>Accepted: {acceptedCounts.pg}</span>
                <span>Limit: {facultyLimits.pg}</span>
                <Badge variant={acceptedCounts.pg < facultyLimits.pg ? "success" : "destructive"}>
                  {acceptedCounts.pg < facultyLimits.pg ? "Slots Available" : "Full"}
                </Badge>
              </div>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Master's</p>
              <div className="flex justify-between items-center">
                <span>Accepted: {acceptedCounts.masters}</span>
                <span>Limit: {facultyLimits.masters}</span>
                <Badge variant={acceptedCounts.masters < facultyLimits.masters ? "success" : "destructive"}>
                  {acceptedCounts.masters < facultyLimits.masters ? "Slots Available" : "Full"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            <BookOpen className="h-4 w-4" />
            Pending ({pendingApps.length})
          </TabsTrigger>
          <TabsTrigger value="accepted" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Accepted ({acceptedApps.length})
          </TabsTrigger>
          <TabsTrigger value="rejected" className="gap-2">
            <XCircle className="h-4 w-4" />
            Rejected ({rejectedApps.length})
          </TabsTrigger>
        </TabsList>

        <ScrollArea className="h-[calc(100vh-220px)]">
          <TabsContent value="pending" className="space-y-4">
            {pendingApps.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No pending applications
                </CardContent>
              </Card>
            ) : (
              pendingApps.map(app => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                  showActions={true}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="accepted" className="space-y-4">
            {acceptedApps.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No accepted applications
                </CardContent>
              </Card>
            ) : (
              acceptedApps.map(app => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                />
              ))
            )}
          </TabsContent>

          <TabsContent value="rejected" className="space-y-4">
            {rejectedApps.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No rejected applications
                </CardContent>
              </Card>
            ) : (
              rejectedApps.map(app => (
                <ApplicationCard
                  key={app.id}
                  application={app}
                />
              ))
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}