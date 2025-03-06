"use client";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { collection, getDocs, doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GraduationCap, Briefcase, Save } from "lucide-react";

export default function ProfileSetup() {
  const { user } = useAuth();
  const router = useRouter();

  // State Variables
  const [role, setRole] = useState("");
  const [studentType, setStudentType] = useState("");
  const [departments, setDepartments] = useState([]);
  const [domains, setDomains] = useState([]);
  const [selectedDepartments, setSelectedDepartments] = useState([]);
  const [selectedDomains, setSelectedDomains] = useState([]);
  const [name, setName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [empId, setEmpId] = useState("");
  const [bio, setBio] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [cgpaError, setCgpaError] = useState("");
  // const [emailError, setEmailError] = useState(""); First line of email verification

  useEffect(() => {
    const fetchLists = async () => {
      const deptSnapshot = await getDocs(collection(db, "departments"));
      setDepartments(deptSnapshot.docs.map(doc => doc.data().name));

      const domainSnapshot = await getDocs(collection(db, "domains"));
      setDomains(domainSnapshot.docs.map(doc => doc.data().name));
    };
    fetchLists();

    // Check if user's email is a VIT email
    // if (user && user.email) {  Second line of email verification
    //   validateEmail(user.email);
    // }
  }, [user]);

  // const validateEmail = (email) => { Third line of email verification
  //   if (!email.endsWith("@vitstudent.ac.in")) {
  //     setEmailError("You must use a VIT email ending with @vitstudent.ac.in");
  //     return false;
  //   }
  //   setEmailError("");
  //   return true;
  // };

  const validateRegistrationNumber = (regNo) => {
    if (regNo.length !== 9) {
      setRegistrationError("Registration number must be exactly 9 characters");
      return false;
    }
    setRegistrationError("");
    return true;
  };

  const validateCgpa = (value) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue < 0 || numValue > 10) {
      setCgpaError("CGPA must be a number between 0 and 10");
      return false;
    }
    setCgpaError("");
    return true;
  };

  const handleRegistrationChange = (e) => {
    const value = e.target.value;
    setRegistrationNumber(value);
    validateRegistrationNumber(value);
  };

  const handleCgpaChange = (e) => {
    const value = e.target.value;
    setCgpa(value);
    validateCgpa(value);
  };

  const handleSubmit = async () => {
    // Check email validation first
    // if (emailError) { Fourth line of email verification
    //   toast.error(emailError);
    //   return;
    // }

    // Validate all required fields based on role
    if (!role || !name) {
      toast.error("Please fill all required fields.");
      return;
    }

    if (role === "student") {
      if (!registrationNumber || !bio || !cgpa || !studentType) {
        toast.error("Please fill all required fields for student profile.");
        return;
      }

      // Validate registration number format
      if (!validateRegistrationNumber(registrationNumber)) {
        toast.error(registrationError);
        return;
      }

      // Validate CGPA
      if (!validateCgpa(cgpa)) {
        toast.error(cgpaError);
        return;
      }
    }

    if (role === "faculty" && (!empId || selectedDepartments.length === 0 || selectedDomains.length === 0)) {
      toast.error("Please fill all required fields for faculty profile.");
      return;
    }

    // Save user profile to Firestore
    try {
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        role,
        name,
        registrationNumber: role === "student" ? registrationNumber : "",
        studentType: role === "student" ? studentType : "",
        empId: role === "faculty" ? empId : "",
        bio: role === "student" ? bio : "",
        cgpa: role === "student" ? cgpa : "",
        facultyDepartment: role === "faculty" ? selectedDepartments : null,
        facultyDomains: role === "faculty" ? selectedDomains : null,
      });

      toast.success("Profile saved successfully!");
      router.push(role === "student" ? "/dashboard/student" : "/dashboard/faculty");
    } catch (error) {
      toast.error("Error saving profile: " + error.message);
    }
  };

  const handleDomainToggle = (domain) => {
    setSelectedDomains(prev =>
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    );
  };

  const handleDepartmentToggle = (department) => {
    setSelectedDepartments(prev =>
      prev.includes(department) ? prev.filter(d => d !== department) : [...prev, department]
    );
  };

  // If there's an email error, show it prominently
  // if (emailError) { Fifth line of email verification
  //   return (
  //     <div className="min-h-screen bg-background p-6 flex items-center justify-center">
  //       <Card className="max-w-md w-full">
  //         <CardHeader>
  //           <CardTitle className="text-2xl text-red-500">Email Restriction</CardTitle>
  //           <CardDescription>
  //             Access Denied
  //           </CardDescription>
  //         </CardHeader>
  //         <CardContent>
  //           <p className="text-red-500 mb-4">{emailError}</p>
  //           <p>Please sign in with your VIT email address to continue.</p>
  //         </CardContent>
  //       </Card>
  //     </div>
  //   );
  // }

  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
          <CardDescription>
            Please provide your information to get started.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select your role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="student">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Student
                  </div>
                </SelectItem>
                <SelectItem value="faculty">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Faculty
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {role === "student" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="regNo">Registration Number</Label>
                <Input
                  id="regNo"
                  placeholder="Enter your registration number (9 characters)"
                  value={registrationNumber}
                  onChange={handleRegistrationChange}
                  maxLength={9}
                />
                {registrationError && (
                  <p className="text-sm text-red-500 mt-1">{registrationError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentType">Student Type</Label>
                <Select onValueChange={setStudentType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your student type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ug">Undergraduate</SelectItem>
                    <SelectItem value="pg">Postgraduate</SelectItem>
                    <SelectItem value="masters">Master's</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell us about yourself"
                  className="min-h-[100px]"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cgpa">CGPA</Label>
                <Input
                  id="cgpa"
                  type="number"
                  step="0.10"
                  min="0"
                  max="10"
                  placeholder="Enter your CGPA (0-10)"
                  value={cgpa}
                  onChange={handleCgpaChange}
                />
                {cgpaError && (
                  <p className="text-sm text-red-500 mt-1">{cgpaError}</p>
                )}
              </div>
            </div>
          )}

          {role === "faculty" && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="empId">Employee ID</Label>
                <Input
                  id="empId"
                  placeholder="Enter your employee ID"
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Departments</Label>
                <ScrollArea className="h-[100px] border rounded-md p-4 flex flex-wrap gap-2">
                  {departments.length > 0 ? (
                    departments.map((dept) => (
                      <Badge
                        key={dept}
                        onClick={() => handleDepartmentToggle(dept)}
                        className={`cursor-pointer ${selectedDepartments.includes(dept)
                          ? "bg-primary text-white"
                          : "bg-gray-200 text-black"
                          }`}
                      >
                        {dept}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-gray-500">No departments found.</p>
                  )}
                </ScrollArea>
              </div>

              <div className="space-y-2">
                <Label>Domains</Label>
                <ScrollArea className="h-[100px] border rounded-md p-4 flex flex-wrap gap-2">
                  {domains.length > 0 ? (
                    domains.map((domain) => (
                      <Badge
                        key={domain}
                        onClick={() => handleDomainToggle(domain)}
                        className={`cursor-pointer ${selectedDomains.includes(domain)
                          ? "bg-primary text-white"
                          : "bg-gray-200 text-black"
                          }`}
                      >
                        {domain}
                      </Badge>
                    ))
                  ) : (
                    <p className="text-gray-500">No domains found.</p>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}

          <Button onClick={handleSubmit} className="w-full gap-2">
            <Save className="h-4 w-4" />
            Save & Proceed
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}