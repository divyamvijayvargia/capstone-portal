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
import { LogOut, CheckCircle2, XCircle, GraduationCap, User, BookOpen } from "lucide-react";

export default function FacultyDashboard() {
  const { user, logout } = useAuth();
  const [applications, setApplications] = useState([]);
  const [studentDetails, setStudentDetails] = useState({});
  const [facultyName, setFacultyName] = useState("");

  useEffect(() => {
    if (!user) return;

    // Fetch faculty name from user document
    const fetchFacultyName = async () => {
      try {
        const facultyDoc = await getDoc(doc(db, "users", user.uid));
        if (facultyDoc.exists()) {
          const facultyData = facultyDoc.data();
          setFacultyName(facultyData.name || user.displayName || user.email);
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
      } catch (error) {
        console.error("Error fetching applications:", error);
        toast.error("Failed to load applications.");
      }
    };

    fetchFacultyName();
    fetchApplications();
  }, [user]);

  const handleApplicationAction = async (appId, status) => {
    try {
      await updateDoc(doc(db, "facultyApplications", appId), { status });

      setApplications(applications.map(app =>
        app.id === appId ? { ...app, status } : app
      ));

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
                onClick={() => handleApplicationAction(application.id, "Accepted")}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Accept
              </Button>
              <Button
                className="flex-1"
                variant="destructive"
                onClick={() => handleApplicationAction(application.id, "Rejected")}
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
            You can accept or reject an application based on their details.
          </p>
        </div>
        <Button variant="destructive" onClick={logout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

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