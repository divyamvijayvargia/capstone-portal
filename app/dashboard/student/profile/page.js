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
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default function ProfileSettings() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [studentType, setStudentType] = useState("");
  const [bio, setBio] = useState("");
  const [cgpa, setCgpa] = useState("");
  const [loading, setLoading] = useState(true);

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

  const handleUpdate = async () => {
    if (!name.trim()) {
      toast.error("Name is required.");
      return;
    }

    try {
      await updateDoc(doc(db, "users", user.uid), {
        name,
        registrationNumber,
        studentType,
        bio,
        cgpa,
      });
      toast.success("Profile updated!");
      router.push("/dashboard/student");
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Update failed.");
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 flex justify-center items-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-xl">Profile Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Enter your name" value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
          <Input type="email" placeholder="Enter your email" value={email} disabled />
          <Input placeholder="Enter your registration number" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} disabled={loading} />
          <Select onValueChange={setStudentType} value={studentType}>
            <SelectTrigger>
              <SelectValue placeholder="Select student type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ug">Undergraduate</SelectItem>
              <SelectItem value="pg">Postgraduate</SelectItem>
              <SelectItem value="masters">Master's</SelectItem>
            </SelectContent>
          </Select>
          <Textarea placeholder="Tell us about yourself" className="min-h-[100px]" value={bio} onChange={(e) => setBio(e.target.value)} />
          <Input type="number" step="0.01" min="0" max="10" placeholder="Enter your CGPA" value={cgpa} onChange={(e) => setCgpa(e.target.value)} />
          <Button onClick={handleUpdate} className="w-full" disabled={loading}>
            {loading ? "Loading..." : "Save Changes"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
