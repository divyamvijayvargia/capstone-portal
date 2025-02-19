import React from 'react';
import { cn } from "@/lib/utils";
import { 
  Search,
  Users,
  BookOpen,
  GraduationCap,
  Lightbulb,
  MessageSquare,
  Trophy,
  Heart
} from "lucide-react";

const features = [
  {
    title: "Smart Project Matching",
    description: "Our intelligent algorithm matches students with the perfect faculty advisor based on interests and expertise.",
    icon: <Search className="h-6 w-6" />,
  },
  {
    title: "Collaborative Workspace",
    description: "A dedicated space for teams to collaborate, share resources, and track project progress.",
    icon: <Users className="h-6 w-6" />,
  },
  {
    title: "Knowledge Repository",
    description: "Access a comprehensive library of past projects and research papers for inspiration.",
    icon: <BookOpen className="h-6 w-6" />,
  },
  {
    title: "Academic Excellence",
    description: "Partner with experienced faculty members to achieve your academic goals.",
    icon: <GraduationCap className="h-6 w-6" />,
  },
  {
    title: "Innovation Hub",
    description: "Transform your creative ideas into impactful capstone projects.",
    icon: <Lightbulb className="h-6 w-6" />,
  },
  {
    title: "Mentorship Support",
    description: "Get guidance from industry experts and experienced academicians.",
    icon: <MessageSquare className="h-6 w-6" />,
  },
  {
    title: "Project Showcase",
    description: "Showcase your work to potential employers and academic community.",
    icon: <Trophy className="h-6 w-6" />,
  },
  {
    title: "Community Driven",
    description: "Join a thriving community of passionate students and dedicated faculty.",
    icon: <Heart className="h-6 w-6" />,
  },
];

export function FeatureSection() {
  return (
    <section className="py-16 px-4 md:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Powerful Features for Success</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 relative z-10">
          {features.map((feature, index) => (
            <Feature key={feature.title} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

const Feature = ({ title, description, icon, index }) => {
  return (
    <div
      className={cn(
        "flex flex-col lg:border-r border-muted py-10 relative group/feature",
        (index === 0 || index === 4) && "lg:border-l",
        index < 4 && "lg:border-b"
      )}
    >
      {index < 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-t from-muted to-transparent pointer-events-none" />
      )}
      {index >= 4 && (
        <div className="opacity-0 group-hover/feature:opacity-100 transition duration-200 absolute inset-0 h-full w-full bg-gradient-to-b from-muted to-transparent pointer-events-none" />
      )}
      <div className="mb-4 relative z-10 px-10 text-muted-foreground">
        {icon}
      </div>
      <div className="text-lg font-bold mb-2 relative z-10 px-10">
        <div className="absolute left-0 inset-y-0 h-6 group-hover/feature:h-8 w-1 rounded-tr-full rounded-br-full bg-muted-foreground/30 group-hover/feature:bg-primary transition-all duration-200 origin-center" />
        <span className="group-hover/feature:translate-x-2 transition duration-200 inline-block">
          {title}
        </span>
      </div>
      <p className="text-sm text-muted-foreground max-w-xs relative z-10 px-10">
        {description}
      </p>
    </div>
  );
};

export default FeatureSection;