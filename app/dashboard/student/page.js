// app/dashboard/student/page.js
'use client';
import { useEffect, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { db } from "../../../firebase";
import { collection, getDocs, addDoc, deleteDoc, doc } from "firebase/firestore";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { LogOut, Search, Trash2, BookOpen } from "lucide-react";

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [faculties, setFaculties] = useState([]);
  const [domains, setDomains] = useState([]);
  const [selectedDomain, setSelectedDomain] = useState("all");
  const [search, setSearch] = useState("");
  const [applications, setApplications] = useState([]);
  const [reason, setReason] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  useEffect(() => {
    if (!user) return; // Ensure user exists before fetching data
    const fetchData = async () => {
      // Fetch all faculty users
      const facultySnapshot = await getDocs(collection(db, "users"));
      const facultyList = facultySnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.role === "faculty");
      setFaculties(facultyList);

      // Fetch available domains
      const domainSnapshot = await getDocs(collection(db, "domains"));
      setDomains(domainSnapshot.docs.map(doc => doc.data().name));

      // Fetch student's existing applications
      const applicationsSnapshot = await getDocs(collection(db, "facultyApplications"));
      const userApplications = applicationsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(app => app.studentId === user.uid);
      setApplications(userApplications);
    };
    fetchData();
  }, [user]);

  const handleApplyClick = (faculty) => {
    setSelectedFaculty(faculty);
    setReason("");
    setIsModalOpen(true);
  };

  const applyToFaculty = async (facultyId) => {
    // Check if the student has already applied to this faculty
    if (applications.some(app => app.facultyId === facultyId)) {
      toast.error("You have already applied to this faculty. Please delete your existing application to apply again.");
      return;
    }

    // Check maximum limit
    if (applications.length >= 5) {
      toast.error("You can only apply to 5 faculties at a time.");
      return;
    }

    const newApplication = {
      studentId: user.uid,
      facultyId,
      reason,
      status: "Pending",
      createdAt: new Date().toISOString(),
    };

    try {
      const docRef = await addDoc(collection(db, "facultyApplications"), newApplication);
      toast.success("Application submitted successfully!");
      // Update local state with the new application
      setApplications([...applications, { id: docRef.id, ...newApplication }]);
    } catch (error) {
      console.error("Error submitting application:", error);
      toast.error("Error submitting application.");
    }
  };

  const handleSubmitApplication = async () => {
    if (!reason.trim()) {
      toast.error("Please provide a reason for your application");
      return;
    }

    await applyToFaculty(selectedFaculty.uid);
    setIsModalOpen(false);
    setReason("");
    setSelectedFaculty(null);
  };

  const deleteApplication = async (id) => {
    try {
      await deleteDoc(doc(db, "facultyApplications", id));
      setApplications(applications.filter(app => app.id !== id));
      toast.success("Application deleted successfully!");
    } catch (error) {
      console.error("Error deleting application:", error);
      toast.error("Error deleting application.");
    }
  };

  const filteredFaculties = faculties.filter(faculty =>
    (selectedDomain && selectedDomain !== 'all' ? faculty.facultyDomains?.includes(selectedDomain) : true) &&
    (search ? faculty.name.toLowerCase().includes(search.toLowerCase()) : true)
  );

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'bg-yellow-500/10 text-yellow-500';
      case 'accepted': return 'bg-green-500/10 text-green-500';
      case 'rejected': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Student Dashboard</h1>
        <Button variant="destructive" onClick={logout} className="gap-2">
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Faculty by Name"
            className="pl-9"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select onValueChange={setSelectedDomain} value={selectedDomain}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by Domain" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Domains</SelectItem>
            {domains.map(domain => (
              <SelectItem key={domain} value={domain}>{domain}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredFaculties.map(faculty => (
          <Card key={faculty.uid} className="overflow-hidden">
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl">{faculty.name}</CardTitle>
              <div className="flex flex-wrap gap-2">
                {faculty.facultyDomains?.map(domain => (
                  <Badge key={domain} variant="secondary">
                    {domain}
                  </Badge>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <Button
                className="w-full gap-2"
                onClick={() => handleApplyClick(faculty)}
                disabled={applications.some(app => app.facultyId === faculty.uid)}
              >
                <BookOpen className="h-4 w-4" />
                {applications.some(app => app.facultyId === faculty.uid)
                  ? 'Already Applied'
                  : 'Apply'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">My Applications</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {applications.map(app => (
            <Card key={app.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  {faculties.find(f => f.uid === app.facultyId)?.name || 'Faculty'}
                </CardTitle>
                <Badge className={getStatusColor(app.status)}>
                  {app.status}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{app.reason}</p>
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => deleteApplication(app.id)}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Application
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Apply to Work with {selectedFaculty?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Why do you want to work with this faculty?"
              className="min-h-[150px]"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitApplication}>
              Submit Application
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}