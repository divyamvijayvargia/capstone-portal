'use client';

import { useAuth } from "../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronRight, Laptop, Users, BookOpen, GraduationCap } from "lucide-react";
import { FeatureSection } from "@/components/FeatureSection";
import Robot from "@/components/Robot";

export default function Landing() {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Connect and Create with
              <span className="text-primary block">Capstone Portal</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Bridge the gap between students and faculty. Find the perfect project match and bring your ideas to life.
            </p>
            <Button onClick={login} size="lg" className="mt-8">
              Get Started with Google <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>



      <section className="py-12 px-4 md:px-6 lg:px-8 bg-muted/50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">
            Why Choose Capstone Portal?
          </h2>
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Left Column: Three Cards */}
            <div className="flex-1 space-y-6">
              <Card className="bg-card">
                <CardHeader>
                  <Laptop className="h-12 w-12 text-primary mb-2" />
                  <CardTitle>Smart Matching</CardTitle>
                  <CardDescription>
                    Our intelligent system pairs students with faculty based on interests and expertise.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-card">
                <CardHeader>
                  <Users className="h-12 w-12 text-primary mb-2" />
                  <CardTitle>Collaboration Hub</CardTitle>
                  <CardDescription>
                    Connect with peers and mentors in a dedicated space for project collaboration.
                  </CardDescription>
                </CardHeader>
              </Card>
              <Card className="bg-card">
                <CardHeader>
                  <BookOpen className="h-12 w-12 text-primary mb-2" />
                  <CardTitle>Project Library</CardTitle>
                  <CardDescription>
                    Browse through past projects for inspiration and learning opportunities.
                  </CardDescription>
                </CardHeader>
              </Card>
            </div>
            {/* Right Column: Robot Component */}
            <div className="flex-1 relative">
              <div className="absolute bottom-0 right-0">
                <Robot className="w-full max-w-sm" />
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Statistics Section */}
      <section className="py-16 px-4 md:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <GraduationCap className="h-8 w-8 mx-auto text-primary" />
              <h3 className="text-3xl font-bold">500+</h3>
              <p className="text-muted-foreground">Students Connected</p>
            </div>
            <div className="space-y-2">
              <Users className="h-8 w-8 mx-auto text-primary" />
              <h3 className="text-3xl font-bold">50+</h3>
              <p className="text-muted-foreground">Faculty Members</p>
            </div>
            <div className="space-y-2">
              <Laptop className="h-8 w-8 mx-auto text-primary" />
              <h3 className="text-3xl font-bold">200+</h3>
              <p className="text-muted-foreground">Projects Completed</p>
            </div>
          </div>
        </div>
      </section>

      <FeatureSection />

    </div>
  );
}