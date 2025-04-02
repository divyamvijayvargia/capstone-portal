// app/dashboard/student/profile/page.js
'use client';
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../../context/AuthContext";
import { db } from "../../../../firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Users, Save } from "lucide-react";

export default function ProfileSettings() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [registrationError, setRegistrationError] = useState("");
  const [studentType, setStudentType] = useState("");
  const [bio, setBio] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [cgpaError, setCgpaError] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Team member states
  const [teamSize, setTeamSize] = useState(1);
  const [teamMembers, setTeamMembers] = useState([
    { name: "", registrationNumber: "", regError: "" }
  ]);

  useEffect(() => {
    if (!user) return;

    const fetchUserProfile = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setName(data.name || "");
          setEmail(data.email || "");
          setRegistrationNumber(data.registrationNumber || "");
          setStudentType(data.studentType || "");
          setBio(data.bio || "");
          setCgpa(data.cgpa || "");
          
          // Load team information if available
          if (data.teamSize) {
            setTeamSize(data.teamSize);
          }
          
          if (data.teamMembers && data.teamMembers.length > 0) {
            setTeamMembers(data.teamMembers);
            
            // If teamMembers exists but doesn't match the teamSize, adjust it
            if (data.teamSize > data.teamMembers.length) {
              const newMembers = [...data.teamMembers];
              for (let i = data.teamMembers.length; i < data.teamSize; i++) {
                newMembers.push({ name: "", registrationNumber: "", regError: "" });
              }
              setTeamMembers(newMembers);
            } else {
              setTeamMembers(data.teamMembers.slice(0, data.teamSize));
            }
          } else if (data.teamSize > 1) {
            // Create empty team members if size is set but no members exist
            const newMembers = [];
            for (let i = 0; i < data.teamSize; i++) {
              newMembers.push({ name: "", registrationNumber: "", regError: "" });
            }
            setTeamMembers(newMembers);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
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
      return "CGPA must be a number between 0 and 10";
    }
    return "";
  };

  const handleRegistrationChange = (e) => {
    const value = e.target.value;
    setRegistrationNumber(value);
    setRegistrationError(validateRegistrationNumber(value));
  };

  const handleCgpaChange = (e) => {
    const value = e.target.value;
    setCgpa(value);
    setCgpaError(validateCgpa(value));
  };

  // Handle change in team size
  const handleTeamSizeChange = (value) => {
    const size = parseInt(value);
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
    
    if (teamSize <= 1) return true;
    
    const updatedMembers = teamMembers.slice(1).map((member, idx) => {
      const memberIndex = idx + 1;
      if (!member.name || !member.registrationNumber) {
        isValid = false;
        return member;
      }
      
      const regError = validateRegistrationNumber(member.registrationNumber);
      if (regError) {
        isValid = false;
        return { ...member, regError };
      }
      
      return member;
    });
    
    // Update the team members with validation errors
    if (!isValid) {
      const newMembers = [...teamMembers];
      updatedMembers.forEach((member, idx) => {
        newMembers[idx + 1] = member;
      });
      setTeamMembers(newMembers);
    }
    
    return isValid;
  };

  const handleUpdate = async () => {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }
    
    const regError = validateRegistrationNumber(registrationNumber);
    if (regError) {
      setRegistrationError(regError);
      toast.error(regError);
      return;
    }
    
    const cgpaError = validateCgpa(cgpa);
    if (cgpaError) {
      setCgpaError(cgpaError);
      toast.error(cgpaError);
      return;
    }
    
    // Validate team members if team size > 1
    if (teamSize > 1 && !validateTeamMembers()) {
      toast.error("Please fill all team member details correctly.");
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        name,
        registrationNumber,
        studentType,
        bio,
        cgpa,
        teamSize,
        teamMembers: teamSize > 1 ? teamMembers : [],
      });
      toast.success("Profile updated!");
      router.push("/dashboard/student");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Update failed.");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="text-xl">Profile Settings</CardTitle>
          <CardDescription>Update your personal information and team details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              placeholder="Enter your name" 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              disabled={loading} 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="Enter your email" 
              value={email} 
              disabled 
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="regNo">Registration Number</Label>
            <Input 
              id="regNo" 
              placeholder="Enter your registration number" 
              value={registrationNumber} 
              onChange={handleRegistrationChange}
              maxLength={9}
              disabled={loading} 
            />
            {registrationError && (
              <p className="text-sm text-red-500 mt-1">{registrationError}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="studentType">Student Type</Label>
            <Select onValueChange={setStudentType} value={studentType} disabled={loading}>
              <SelectTrigger id="studentType">
                <SelectValue placeholder="Select student type" />
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
              disabled={loading}
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
              placeholder="Enter your CGPA" 
              value={cgpa} 
              onChange={handleCgpaChange}
              disabled={loading} 
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
                onValueChange={handleTeamSizeChange}
                disabled={loading}
              >
                <SelectTrigger id="teamSize">
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
                          disabled={loading}
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
                          disabled={loading}
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

          <Button onClick={handleUpdate} className="w-full gap-2" disabled={loading}>
            <Save className="h-4 w-4" />
            {loading ? "Loading..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}