'use client';
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import { collection, getDocs, updateDoc, doc, getDoc } from "firebase/firestore";
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

  useEffect(() => {
    if (!user) return;
    const fetchApplications = async () => {
      const applicationsSnapshot = await getDocs(collection(db, "facultyApplications"));
      const facultyApps = applicationsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(app => app.facultyId === user.uid);
      setApplications(facultyApps);
    };
    fetchApplications();
  }, [user]);

  useEffect(() => {
    const fetchStudentDetails = async () => {
      const details = { ...studentDetails };
      for (const app of applications) {
        if (!details[app.studentId]) {
          const docSnap = await getDoc(doc(db, "users", app.studentId));
          if (docSnap.exists()) {
            details[app.studentId] = docSnap.data();
          }
        }
      }
      setStudentDetails(details);
    };
    if (applications.length > 0) {
      fetchStudentDetails();
    }
  }, [applications]);

  const acceptApplication = async (appId) => {
    try {
      await updateDoc(doc(db, "facultyApplications", appId), { status: "Accepted" });
      setApplications(applications.map(app => app.id === appId ? { ...app, status: "Accepted" } : app));
      toast.success("Application accepted successfully!");
    } catch (error) {
      toast.error("Error accepting application.");
    }
  };

  const rejectApplication = async (appId) => {
    try {
      await updateDoc(doc(db, "facultyApplications", appId), { status: "Rejected" });
      setApplications(applications.map(app => app.id === appId ? { ...app, status: "Rejected" } : app));
      toast.success("Application rejected successfully!");
    } catch (error) {
      toast.error("Error rejecting application.");
    }
  };

  const pendingApps = applications.filter(app => app.status === "Pending");
  const acceptedApps = applications.filter(app => app.status === "Accepted");
  const rejectedApps = applications.filter(app => app.status === "Rejected");

  const ApplicationCard = ({ application, showActions = false }) => {
    const student = studentDetails[application.studentId];
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
              application.status === "Pending" ? "warning" :
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
          <div className="space-y-2">
            <div className="text-sm font-medium">Reason for Application:</div>
            <p className="text-sm text-muted-foreground">{application.reason}</p>
          </div>
          
          {showActions && (
            <div className="flex space-x-2 pt-2">
              <Button
                className="flex-1"
                variant="default"
                onClick={() => acceptApplication(application.id)}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Accept
              </Button>
              <Button
                className="flex-1"
                variant="destructive"
                onClick={() => rejectApplication(application.id)}
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
          <h1 className="text-3xl font-bold tracking-tight">Faculty Dashboard</h1>
          <p className="text-muted-foreground">
            Manage student applications and research projects
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
                <ApplicationCard key={app.id} application={app} showActions />
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
                <ApplicationCard key={app.id} application={app} />
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
                <ApplicationCard key={app.id} application={app} />
              ))
            )}
          </TabsContent>
        </ScrollArea>
      </Tabs>
    </div>
  );
}