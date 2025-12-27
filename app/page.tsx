import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  FolderIcon,
  File01Icon,
  BubbleChatIcon,
  Comment01Icon,
} from "@hugeicons/core-free-icons";

const features = [
  {
    name: "Project Management",
    description:
      "Organize and manage your projects efficiently. Track progress, assign tasks, and collaborate with your team.",
    icon: FolderIcon,
    href: "/projects",
  },
  {
    name: "File Management",
    description:
      "Upload, organize, and share files seamlessly. Keep all your documents in one place with easy access.",
    icon: File01Icon,
    href: "/files",
  },
  {
    name: "Chat",
    description:
      "Communicate with your team in real-time. Share ideas, get instant feedback, and stay connected.",
    icon: BubbleChatIcon,
    href: "/chat",
  },
  {
    name: "Comments",
    description:
      "Add comments and feedback on projects and files. Collaborate effectively with contextual discussions.",
    icon: Comment01Icon,
    href: "/comments",
  },
];

export default function Page() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Welcome to <span className="text-primary">Aldi App</span>
          </h1>
          <p className="mt-6 text-lg leading-8 text-muted-foreground sm:text-xl">
            Your all-in-one platform for project management, file organization,
            team communication, and collaboration. Streamline your workflow and
            boost productivity.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/projects">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/files">Explore Files</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything you need to manage your work
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Powerful features designed to help you and your team work more
            efficiently together.
          </p>
        </div>

        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <Card
                key={feature.name}
                className="group hover:shadow-lg transition-shadow"
              >
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
                    <HugeiconsIcon icon={feature.icon} className="h-6 w-6" />
                  </div>
                  <CardTitle>{feature.name}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild variant="ghost" className="w-full">
                    <Link href={feature.href}>Learn more →</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl text-center">
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-2xl">Ready to get started?</CardTitle>
              <CardDescription className="text-base">
                Start managing your projects, files, and team communication
                today.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg">
                  <Link href="/projects">Start Managing Projects</Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/chat">Open Chat</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
