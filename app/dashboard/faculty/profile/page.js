'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../context/AuthContext";
import { db } from "../../../../firebase";
import { doc, getDoc, updateDoc, collection, getDocs } from "firebase/firestore";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save } from "lucide-react";

export default function FacultyProfileSettings() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [empId, setEmpId] = useState("");
  const [departments, setDepartments] = useState([]);
  const [domains, setDomains] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [ugLimit, setUgLimit] = useState("");
  const [pgLimit, setPgLimit] = useState("");
  const [mastersLimit, setMastersLimit] = useState("");
  const [bio, setBio] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchUserProfile = async () => {
      try {
        // Fetch faculty data
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setName(data.name || "");
          setEmail(data.email || "");
          setEmpId(data.empId || "");
          setSelectedDepartments(data.facultyDepartment || []);
          setSelectedDomains(data.facultyDomains || []);
          setUgLimit(data.ugLimit || "");
          setPgLimit(data.pgLimit || "");
          setMastersLimit(data.mastersLimit || "");
          setBio(data.bio || "");
        }

        // Fetch departments and domains lists
        const deptSnapshot = await getDocs(collection(db, "departments"));
        setDepartments(deptSnapshot.docs.map(doc => doc.data().name));

        const domainSnapshot = await getDocs(collection(db, "domains"));
        setDomains(domainSnapshot.docs.map(doc => doc.data().name));
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleDepartmentToggle = (department) => {
    setSelectedDepartments(prev =>
      prev.includes(department) ? prev.filter(d => d !== department) : [...prev, department]
    );
  };

  const handleDomainToggle = (domain) => {
    setSelectedDomains(prev =>
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    );
  };

  const handleUpdate = async () => {
    if (!name.trim() || !empId.trim()) {
      toast.error("Name and Employee ID are required.");
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        name,
        empId,
        facultyDepartment: selectedDepartments,
        facultyDomains: selectedDomains,
        ugLimit,
        pgLimit,
        mastersLimit,
        bio,
      });
      toast.success("Profile updated successfully!");
      router.push("/dashboard/faculty");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile.");
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Faculty Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled />
          </div>

          <div className="space-y-2">
            <Label htmlFor="empId">Employee ID</Label>
            <Input
              id="empId"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              placeholder="Enter your employee ID"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio & Research Interests</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about your research interests and expertise..."
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-4">
            <Label>Category-wise Student Intake Limits</Label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ugLimit">UG Students Limit</Label>
                <Input
                  id="ugLimit"
                  type="number"
                  min="0"
                  value={ugLimit}
                  onChange={(e) => setUgLimit(e.target.value)}
                  placeholder="Enter limit"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pgLimit">PG Students Limit</Label>
                <Input
                  id="pgLimit"
                  type="number"
                  min="0"
                  value={pgLimit}
                  onChange={(e) => setPgLimit(e.target.value)}
                  placeholder="Enter limit"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mastersLimit">Master's Students Limit</Label>
                <Input
                  id="mastersLimit"
                  type="number"
                  min="0"
                  value={mastersLimit}
                  onChange={(e) => setMastersLimit(e.target.value)}
                  placeholder="Enter limit"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Departments</Label>
            <ScrollArea className="h-[100px] border rounded-md p-4">
              <div className="flex flex-wrap gap-2">
                {departments.map((dept) => (
                  <Badge
                    key={dept}
                    onClick={() => handleDepartmentToggle(dept)}
                    className={`cursor-pointer ${
                      selectedDepartments.includes(dept)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {dept}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <Label>Domains</Label>
            <ScrollArea className="h-[100px] border rounded-md p-4">
              <div className="flex flex-wrap gap-2">
                {domains.map((domain) => (
                  <Badge
                    key={domain}
                    onClick={() => handleDomainToggle(domain)}
                    className={`cursor-pointer ${
                      selectedDomains.includes(domain)
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {domain}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </div>

          <Button onClick={handleUpdate} className="w-full gap-2">
            <Save className="h-4 w-4" />
            Save Changes
          </Button>
        </CardContent>
      </Card>
    </div>
  );
} 