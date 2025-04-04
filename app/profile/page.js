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
import { GraduationCap, Briefcase, Save, Plus, Trash2, Users } from "lucide-react";

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
  const [ugLimit, setUgLimit] = useState("");
  const [pgLimit, setPgLimit] = useState("");
  const [mastersLimit, setMastersLimit] = useState("");
  
  // New state variables for team members
  const [teamSize, setTeamSize] = useState(1);
  const [teamMembers, setTeamMembers] = useState([
    { name: "", registrationNumber: "", regError: "" }
  ]);

  useEffect(() => {
    const fetchLists = async () => {
      const deptSnapshot = await getDocs(collection(db, "departments"));
      setDepartments(deptSnapshot.docs.map(doc => doc.data().name));

      const domainSnapshot = await getDocs(collection(db, "domains"));
      setDomains(domainSnapshot.docs.map(doc => doc.data().name));
    };
    fetchLists();
  }, [user]);

  const validateRegistrationNumber = (regNo) => {
    if (regNo.length !== 9) {
      return "Registration number must be exactly 9 characters";
    }
    return "";
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
    setRegistrationError(validateRegistrationNumber(value));
  };

  const handleCgpaChange = (e) => {
    const value = e.target.value;
    setCgpa(value);
    validateCgpa(value);
  };

  // Handle change in team size
  const handleTeamSizeChange = (e) => {
    const size = parseInt(e.target.value);
    setTeamSize(size);
    
    // Adjust team members array based on new size
    if (size > teamMembers.length) {
      // Add more empty team member objects
      const newMembers = [...teamMembers];
      for (let i = teamMembers.length; i < size; i++) {
        newMembers.push({ name: "", registrationNumber: "", regError: "" });
      }
      setTeamMembers(newMembers);
    } else if (size < teamMembers.length) {
      // Remove excess team members
      setTeamMembers(teamMembers.slice(0, size));
    }
  };

  // Handle team member information changes
  const handleTeamMemberChange = (index, field, value) => {
    const updatedMembers = [...teamMembers];
    
    if (field === "registrationNumber") {
      const regError = validateRegistrationNumber(value);
      updatedMembers[index] = {
        ...updatedMembers[index],
        [field]: value,
        regError
      };
    } else {
      updatedMembers[index] = {
        ...updatedMembers[index],
        [field]: value
      };
    }
    
    setTeamMembers(updatedMembers);
  };

  const validateTeamMembers = () => {
    let isValid = true;
    const updatedMembers = teamMembers.map(member => {
      // Skip validation for empty members if they're beyond the team size
      if (teamSize > 1) {
        const regError = validateRegistrationNumber(member.registrationNumber);
        if (regError || !member.name) {
          isValid = false;
        }
        return { ...member, regError };
      }
      return member;
    });
    
    setTeamMembers(updatedMembers);
    return isValid;
  };

  const handleSubmit = async () => {
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
      if (registrationError) {
        toast.error(registrationError);
        return;
      }

      // Validate CGPA
      if (!validateCgpa(cgpa)) {
        toast.error(cgpaError);
        return;
      }

      // Validate team members if team size is greater than 1
      if (teamSize > 1 && !validateTeamMembers()) {
        toast.error("Please fill all team member details correctly.");
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
        ugLimit: role === "faculty" ? ugLimit : "",
        pgLimit: role === "faculty" ? pgLimit : "",
        mastersLimit: role === "faculty" ? mastersLimit : "",
        // Add team information for students
        teamSize: role === "student" ? teamSize : 1,
        teamMembers: role === "student" && teamSize > 1 ? teamMembers : [],
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
              
              {/* Team Information Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <h3 className="text-lg font-medium">Team Information</h3>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="teamSize">Team Size (including yourself)</Label>
                  <Select 
                    value={teamSize.toString()} 
                    onValueChange={(val) => handleTeamSizeChange({ target: { value: val } })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select team size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Just me (1)</SelectItem>
                      <SelectItem value="2">2 members</SelectItem>
                      <SelectItem value="3">3 members</SelectItem>
                      <SelectItem value="4">4 members</SelectItem>
                      <SelectItem value="5">5 members</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {teamSize > 1 && (
                  <div className="space-y-4">
                    <Label>Team Member Details (excluding yourself)</Label>
                    
                    {teamMembers.slice(1).map((member, index) => (
                      <Card key={index} className="p-4">
                        <div className="space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium">Team Member {index + 1}</span>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`member-${index}-name`}>Full Name</Label>
                            <Input
                              id={`member-${index}-name`}
                              placeholder="Enter team member's full name"
                              value={member.name}
                              onChange={(e) => handleTeamMemberChange(index + 1, "name", e.target.value)}
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`member-${index}-regNo`}>Registration Number</Label>
                            <Input
                              id={`member-${index}-regNo`}
                              placeholder="Enter registration number (9 characters)"
                              value={member.registrationNumber}
                              onChange={(e) => handleTeamMemberChange(index + 1, "registrationNumber", e.target.value)}
                              maxLength={9}
                            />
                            {member.regError && (
                              <p className="text-sm text-red-500 mt-1">{member.regError}</p>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
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

              <div className="space-y-4">
                <Label>Category-wise Student Intake Limits</Label>
                <div className="grid grid-cols-1 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ugLimit">Undergraduate (UG) Limit</Label>
                    <Input
                      id="ugLimit"
                      type="number"
                      min="0"
                      placeholder="Enter UG student limit"
                      value={ugLimit}
                      onChange={(e) => setUgLimit(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pgLimit">Postgraduate (PG) Limit</Label>
                    <Input
                      id="pgLimit"
                      type="number"
                      min="0"
                      placeholder="Enter PG student limit"
                      value={pgLimit}
                      onChange={(e) => setPgLimit(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mastersLimit">Master's Limit</Label>
                    <Input
                      id="mastersLimit"
                      type="number"
                      min="0"
                      placeholder="Enter Master's student limit"
                      value={mastersLimit}
                      onChange={(e) => setMastersLimit(e.target.value)}
                    />
                  </div>
                </div>
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