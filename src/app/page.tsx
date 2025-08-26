import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Zap, Users, ArrowRight } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="w-full">
      <section className="relative w-full pt-24 pb-12 md:pt-32 lg:pt-40 bg-background">
        <div className="absolute top-0 left-0 w-full h-full bg-grid-slate-900/[0.04] dark:bg-grid-slate-400/[0.05]"></div>
        <div className="container mx-auto px-4 md:px-6 text-center relative">
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                Squadify
              </h1>
              <p className="max-w-[600px] mx-auto text-muted-foreground md:text-xl">
                The ultimate tool for building balanced and effective teams. Define roles, manage players, and create your perfect lineup with a simple drag & drop.
              </p>
            </div>
            <div className="w-full max-w-sm mx-auto space-x-4">
              <Link href="/register">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="w-full py-12 md:py-24 lg:py-32">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center">
            <div className="space-y-2">
              <div className="inline-block rounded-lg bg-muted px-3 py-1 text-sm">Key Features</div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Everything You Need to Build Winning Teams</h2>
              <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Squadify provides a complete suite of tools to streamline your team creation process, from player management to final export.
              </p>
            </div>
          </div>
          <div className="mx-auto grid max-w-5xl items-start gap-8 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:max-w-none mt-12">
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6 grid gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Player Management</h3>
                </div>
                <p className="text-muted-foreground">
                  Easily add, edit, and delete players. Keep your squad list organized and up-to-date with all necessary details like gender and skills.
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6 grid gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Drag & Drop Builder</h3>
                </div>
                <p className="text-muted-foreground">
                  Intuitively form your teams by dragging players from your squad and dropping them into team cards. Swap players between teams effortlessly.
                </p>
              </CardContent>
            </Card>
            <Card className="hover:shadow-lg transition-shadow duration-300">
              <CardContent className="p-6 grid gap-4">
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                     <Image src="/custom-rules.svg" alt="Custom Rules" width={24} height={24} className="text-primary"/>
                  </div>
                  <h3 className="text-xl font-bold">Custom Rules & Validation</h3>
                </div>
                <p className="text-muted-foreground">
                  Define team size, required roles, and other conditions. Get real-time feedback to ensure every team meets your specific requirements.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="w-full py-6 px-4 md:px-6 border-t">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:flex-row">
            <p className="text-sm text-muted-foreground">&copy; 2024 Squadify. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
