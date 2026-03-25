'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Navbar } from '@/components/navbar';
import { ArrowRight, Brain, Sparkles, BookOpen, Laptop, Zap, Target, Star, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!isLoading && user) {
            router.push('/dashboard');
        }
    }, [user, isLoading, router]);

    if (isLoading || user) {
        return null; 
    }

    return (
        <div className="min-h-screen flex flex-col bg-background font-sans selection:bg-primary/20">
             <Navbar />
             
             {/* Hero Section */}
             <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                <div className="container px-4 md:px-6 mx-auto relative z-10">
                    <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5 }}
                            className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary shadow-sm backdrop-blur-sm"
                        >
                            <Sparkles className="mr-2 h-4 w-4" />
                            <span className="bg-gradient-to-r from-primary to-green-600 bg-clip-text text-transparent font-bold">New: AI Course Generator 2.0</span>
                        </motion.div>
                        
                        <motion.h1 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1]"
                        >
                            Learn anything. <br />
                            <span className="bg-gradient-to-r from-primary via-green-500 to-teal-500 bg-clip-text text-transparent">Instantly.</span>
                        </motion.h1>

                        <motion.p 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
                        >
                            Stop searching for tutorials. Intellipath  uses AI to generate comprehensive, personalized courses for you in seconds.
                        </motion.p>

                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="flex flex-col sm:flex-row gap-4 w-full justify-center pt-4"
                        >
                            <Link href="/register">
                                <Button size="lg" className="rounded-full h-14 px-8 text-lg w-full sm:w-auto shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:scale-105 transition-all duration-300">
                                    Get Started for Free
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            </Link>
                            <Link href="/login">
                                <Button variant="outline" size="lg" className="rounded-full h-14 px-8 text-lg w-full sm:w-auto border-2 hover:bg-muted/50 transition-all">
                                    View Demo
                                </Button>
                            </Link>
                        </motion.div>
                    </div>
                </div>

                {/* Decorative Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/10 blur-[120px]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-green-500/10 blur-[120px]" />
                </div>
             </section>

             {/* Social Proof */}
             <section className="py-12 border-y bg-muted/20">
                <div className="container px-4 mx-auto text-center">
                    <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-8">Trusted by learners from top companies</p>
                    <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                         {/* Mock Logos - Replace with Image components or SVGs if available. Using text for now as per constraints */}
                         <div className="text-xl font-bold flex items-center gap-2"><div className="h-6 w-6 bg-foreground rounded-full"></div> Acme Corp</div>
                         <div className="text-xl font-bold flex items-center gap-2"><div className="h-6 w-6 bg-foreground rounded-md"></div> GlobalTech</div>
                         <div className="text-xl font-bold flex items-center gap-2"><div className="h-6 w-6 bg-foreground rounded-sm"></div> Innovate</div>
                         <div className="text-xl font-bold flex items-center gap-2"><div className="h-6 w-6 bg-foreground rounded-full"></div> FutureScale</div>
                    </div>
                </div>
             </section>

             {/* Features Grid */}
             <section className="py-24 md:py-32 relative">
                <div className="container px-4 md:px-6 mx-auto">
                    <div className="text-center space-y-4 mb-20">
                        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">The Future of Learning</h2>
                        <p className="mx-auto max-w-2xl text-muted-foreground text-lg">
                            Traditional courses are static. Intellipath  adapts to you, building a unique curriculum based on your goals and pace.
                        </p>
                    </div>
                    <div className="grid gap-8 md:grid-cols-3">
                        <FeatureCard 
                            icon={<Brain className="h-8 w-8 text-primary" />}
                            title="AI-Driven Curriculum"
                            description="Our advanced LLM analyzes your topic to create a structured, academic-grade syllabus instantly."
                            delay={0.1}
                        />
                         <FeatureCard 
                            icon={<Target className="h-8 w-8 text-green-500" />}
                            title="Personalized Pacing"
                            description="Whether you have 5 minutes or 5 hours, the content adjusts to fit your schedule and level."
                            delay={0.2}
                        />
                         <FeatureCard 
                            icon={<Zap className="h-8 w-8 text-amber-500" />}
                            title="Interactive Assessments"
                            description="Generated quizzes ensure you master each concept before moving on. Real-time feedback included."
                            delay={0.3}
                        />
                    </div>
                </div>
             </section>

            {/* Testimonials */}
            <section className="py-24 bg-primary/5">
                <div className="container px-4 mx-auto">
                    <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">What Learners Are Saying</h2>
                    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                        <TestimonialCard 
                            name="Sarah J."
                            role="Software Engineer"
                            quote="I needed to learn Rust for a new job. Intellipath  generated a perfect roadmap and I was coding in a week."
                        />
                        <TestimonialCard 
                            name="Michael T."
                            role="Student"
                            quote="The quizzes are a game changer. It actually forces me to understand the material, not just skim it."
                        />
                        <TestimonialCard 
                            name="Elena R."
                            role="Product Manager"
                            quote="Finally, a way to learn specific topics without buying a 40-hour course. The AI explanations are spot on."
                        />
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-primary -skew-y-3 origin-bottom-right transform scale-110 z-0"></div>
                <div className="container px-4 relative z-10 text-center space-y-8 mx-auto">
                    <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-primary-foreground">Ready to start?</h2>
                    <p className="mx-auto max-w-2xl text-primary-foreground/90 text-xl font-medium">
                        Join the learning revolution. Generate your first course for free today.
                    </p>
                    <Link href="/register">
                         <Button size="lg" variant="secondary" className="rounded-full h-16 px-12 text-xl font-bold shadow-2xl hover:shadow-white/20 hover:scale-105 transition-all">
                            Start Learning Now
                        </Button>
                    </Link>
                    <p className="text-primary-foreground/70 text-sm mt-4">No credit card required • Cancel anytime</p>
                </div>
            </section>

            <footer className="py-12 bg-background border-t">
                <div className="container px-4 mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                         <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">E</div>
                         <span className="font-bold text-xl">Intellipath </span>
                    </div>
                    <div className="flex gap-8 text-sm text-muted-foreground">
                        <Link href="#" className="hover:text-primary transition-colors">Privacy</Link>
                        <Link href="#" className="hover:text-primary transition-colors">Terms</Link>
                        <Link href="#" className="hover:text-primary transition-colors">Contact</Link>
                    </div>
                    <p className="text-sm text-muted-foreground">© 2024 Intellipath  AI</p>
                </div>
            </footer>
        </div>
    );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay }}
            className="group flex flex-col p-8 bg-card rounded-[2rem] border shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
        >
            <div className="mb-6 p-4 rounded-2xl bg-secondary/50 h-14 w-14 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                {icon}
            </div>
            <h3 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">{title}</h3>
            <p className="text-muted-foreground leading-relaxed text-lg">{description}</p>
        </motion.div>
    )
}

function TestimonialCard({ name, role, quote }: { name: string, role: string, quote: string }) {
    return (
        <div className="p-8 bg-background rounded-2xl border shadow-sm">
            <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
            </div>
            <p className="text-lg font-medium italic mb-6 text-foreground/80">"{quote}"</p>
            <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-secondary-foreground">
                    {name[0]}
                </div>
                <div>
                    <div className="font-bold">{name}</div>
                    <div className="text-xs text-muted-foreground">{role}</div>
                </div>
            </div>
        </div>
    )
}
