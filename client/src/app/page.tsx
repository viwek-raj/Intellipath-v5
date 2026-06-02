'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Navbar } from '@/components/navbar';
import { 
    ArrowRight, Brain, Sparkles, BookOpen, 
    Video, Users, Trophy, Target, Star, CheckCircle2,
    Search, PlayCircle, Heart, Clock, Play,
    Code, Palette, Database, LineChart, Globe, Cpu, Layout, Smartphone, Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import React from 'react';
import { authApi, publicApi } from '@/lib/api';

export default function Home() {
    const { user, isLoading } = useAuth();
    const router = useRouter();

    const [subscribeEmail, setSubscribeEmail] = useState('');
    const [subscribeLoading, setSubscribeLoading] = useState(false);
    const [subscribeMessage, setSubscribeMessage] = useState('');
    const [stats, setStats] = useState({ students: 0, instructors: 0, batches: 0 });
    const [featuredBatches, setFeaturedBatches] = useState<any[]>([]);

    useEffect(() => {
        const fetchPublicData = async () => {
            try {
                const [statsRes, batchesRes] = await Promise.all([
                    publicApi.getLandingPageStats(),
                    publicApi.getFeaturedBatches()
                ]);
                setStats(statsRes.data);
                setFeaturedBatches(batchesRes.data);
            } catch (error) {
                console.error('Failed to fetch public data', error);
            }
        };
        fetchPublicData();
    }, []);

    const handleSubscribe = async () => {
        if (!subscribeEmail) return;
        setSubscribeLoading(true);
        setSubscribeMessage('');
        try {
            await authApi.subscribe(subscribeEmail);
            setSubscribeMessage('🎉 Subscribed successfully! Check your email.');
            setSubscribeEmail('');
        } catch (error: any) {
            setSubscribeMessage(error.response?.data?.message || 'Failed to subscribe');
        } finally {
            setSubscribeLoading(false);
        }
    };

    useEffect(() => {
        if (!isLoading && user) {
            if (user.accountStatus === 'dismissed') {
                router.push('/dismissed');
            } else if (user.accountStatus === 'pending') {
                router.push('/pending');
            } else if (user.role === 'admin') {
                router.push('/admin');
            } else if (user.role === 'instructor') {
                router.push('/instructor');
            } else {
                router.push('/dashboard');
            }
        }
    }, [user, isLoading, router]);

    if (isLoading || user) {
        return null; 
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#f8fafc] font-sans selection:bg-purple-500/30">
            <Navbar />
             
            {/* HERO SECTION */}
            <section className="relative bg-slate-950 overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32 min-h-[90vh] flex flex-col justify-center">
                {/* Dynamic Glowing Background Orbs */}
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-fuchsia-600/30 rounded-full blur-[128px] animate-pulse"></div>
                <div className="absolute bottom-0 right-1/4 w-[30rem] h-[30rem] bg-cyan-600/20 rounded-full blur-[128px] animate-pulse delay-1000"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-violet-600/20 rounded-full blur-[128px]"></div>
                
                {/* Grid Pattern */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>

                <div className="container px-4 md:px-6 mx-auto relative z-10 pt-10 pb-24">
                    <div className="flex flex-col lg:flex-row items-center gap-12">
                        {/* Left Content */}
                        <div className="flex-1 space-y-8 text-center lg:text-left">
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }} 
                                animate={{ opacity: 1, scale: 1 }} 
                                transition={{ duration: 0.5 }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-cyan-400 font-medium text-sm shadow-xl"
                            >
                                <Sparkles className="w-4 h-4" />
                                <span>Intellipath v5 is now live!</span>
                            </motion.div>
                            
                            <motion.h1 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-5xl md:text-7xl font-extrabold text-white leading-[1.1] tracking-tight"
                            >
                                Unlock Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-400 via-violet-400 to-cyan-400">Potential</span> With 
                                <br /> AI-Powered Learning
                            </motion.h1>
                            
                            <motion.p 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-lg md:text-xl text-slate-300 leading-relaxed max-w-2xl font-light mx-auto lg:mx-0"
                            >
                                Join the next generation of education. Learn from industry experts, engage in interactive live batches, and accelerate your career with AI-assisted courses.
                            </motion.p>

                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="max-w-md mx-auto lg:mx-0 bg-white rounded-full p-2 flex items-center shadow-2xl shadow-black/20"
                            >
                                <div className="pl-4 text-gray-400">
                                    <Search className="w-5 h-5" />
                                </div>
                                <input 
                                    type="text" 
                                    placeholder="What do you want to learn today?" 
                                    className="flex-1 bg-transparent border-none outline-none px-4 text-gray-800 placeholder-gray-400"
                                />
                                <Link href="/register">
                                    <Button className="rounded-full bg-violet-600 hover:bg-violet-700 text-white px-8 h-12">
                                        Search
                                    </Button>
                                </Link>
                            </motion.div>
                        </div>

                        {/* Right Content / Image Area */}
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="flex-1 relative hidden md:block"
                        >
                            <div className="relative w-full max-w-lg mx-auto aspect-square">
                                <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-500/20 to-cyan-500/20 rounded-full blur-3xl"></div>
                                <div className="absolute inset-4 rounded-[2rem] bg-white/5 backdrop-blur-xl border border-white/20 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
                                    <Users className="w-32 h-32 text-fuchsia-300/80 mb-6" />
                                    <div className="flex -space-x-4 mb-4">
                                        {[1,2,3,4].map(i => (
                                            <div key={i} className="w-12 h-12 rounded-full border-2 border-violet-800 bg-gradient-to-br from-fuchsia-400 to-cyan-400"></div>
                                        ))}
                                    </div>
                                    <p className="font-medium text-lg">Join {stats.students > 0 ? stats.students.toLocaleString() : '10,000'}+ Learners</p>
                                </div>
                                
                                {/* Floating Badges */}
                                <div className="absolute -left-8 top-20 bg-white text-violet-900 px-6 py-3 rounded-2xl shadow-xl font-bold flex items-center gap-2">
                                    <Video className="w-5 h-5 text-fuchsia-500" /> Live Classes
                                </div>
                                <div className="absolute -right-4 bottom-32 bg-white text-violet-900 px-6 py-3 rounded-2xl shadow-xl font-bold flex items-center gap-2">
                                    <Brain className="w-5 h-5 text-cyan-500" /> AI Courses
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>

                {/* Brands/Logos Band */}
                <div className="bg-black/10 backdrop-blur-sm border-t border-white/10 py-6 relative z-10">
                    <div className="container mx-auto px-4 flex flex-wrap justify-center gap-8 md:gap-20 opacity-70">
                        <div className="text-xl font-bold flex items-center gap-2"><Globe className="w-6 h-6"/> GlobalTech</div>
                        <div className="text-xl font-bold flex items-center gap-2"><Cpu className="w-6 h-6"/> Innovate AI</div>
                        <div className="text-xl font-bold flex items-center gap-2"><Layout className="w-6 h-6"/> DesignPro</div>
                        <div className="text-xl font-bold flex items-center gap-2"><Database className="w-6 h-6"/> DataCorp</div>
                    </div>
                </div>
            </section>

            {/* FEATURED COURSES */}
            <section className="py-24 bg-[#f8fafc]">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h3 className="text-violet-600 font-bold tracking-wider uppercase text-sm mb-2">Featured Learning</h3>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900">Discover our premier batches & courses</h2>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {featuredBatches.length > 0 ? (
                            featuredBatches.map((batch, index) => {
                                const gradients = [
                                    "from-blue-500 to-cyan-400", 
                                    "from-fuchsia-500 to-pink-500", 
                                    "from-violet-500 to-purple-500", 
                                    "from-amber-400 to-orange-500", 
                                    "from-emerald-400 to-teal-500", 
                                    "from-indigo-400 to-blue-600"
                                ];
                                const icons = [
                                    <Code className="w-12 h-12 text-white" />,
                                    <Palette className="w-12 h-12 text-white" />,
                                    <Brain className="w-12 h-12 text-white" />,
                                    <Database className="w-12 h-12 text-white" />,
                                    <LineChart className="w-12 h-12 text-white" />,
                                    <Smartphone className="w-12 h-12 text-white" />
                                ];
                                return (
                                    <CourseCard 
                                        key={batch._id}
                                        title={batch.title}
                                        category="Live Batch"
                                        price="Enroll Now"
                                        rating="5.0"
                                        students={`${batch.studentCount || 0}`}
                                        gradient={gradients[index % gradients.length]}
                                        icon={icons[index % icons.length]}
                                    />
                                );
                            })
                        ) : (
                            <>
                                <CourseCard 
                                    title="Advanced Web Development Cohort"
                                    category="Live Batch"
                                    price="Free"
                                    rating="4.9"
                                    students="1.2k"
                                    gradient="from-blue-500 to-cyan-400"
                                    icon={<Code className="w-12 h-12 text-white" />}
                                />
                                <CourseCard 
                                    title="Complete UI/UX Design Masterclass"
                                    category="Live Batch"
                                    price="Free"
                                    rating="4.8"
                                    students="850"
                                    gradient="from-fuchsia-500 to-pink-500"
                                    icon={<Palette className="w-12 h-12 text-white" />}
                                />
                                <CourseCard 
                                    title="Machine Learning Basics (AI Gen)"
                                    category="AI Course"
                                    price="Free"
                                    rating="4.7"
                                    students="3.4k"
                                    gradient="from-violet-500 to-purple-500"
                                    icon={<Brain className="w-12 h-12 text-white" />}
                                />
                                <CourseCard 
                                    title="Data Structures & Algorithms"
                                    category="Live Batch"
                                    price="Free"
                                    rating="4.9"
                                    students="2.1k"
                                    gradient="from-amber-400 to-orange-500"
                                    icon={<Database className="w-12 h-12 text-white" />}
                                />
                                <CourseCard 
                                    title="Financial Trading Strategies"
                                    category="AI Course"
                                    price="Free"
                                    rating="4.6"
                                    students="920"
                                    gradient="from-emerald-400 to-teal-500"
                                    icon={<LineChart className="w-12 h-12 text-white" />}
                                />
                                <CourseCard 
                                    title="Mobile App Dev with React Native"
                                    category="Live Batch"
                                    price="Free"
                                    rating="4.8"
                                    students="1.5k"
                                    gradient="from-indigo-400 to-blue-600"
                                    icon={<Smartphone className="w-12 h-12 text-white" />}
                                />
                            </>
                        )}
                    </div>
                    
                    <div className="text-center mt-12">
                        <Link href="/register">
                            <Button className="bg-violet-600 hover:bg-violet-700 text-white rounded-full px-8 py-6 text-lg shadow-lg shadow-violet-200">
                                Explore All Courses
                            </Button>
                        </Link>
                    </div>
                </div>
            </section>

            {/* WHY LEARN WITH US BANNER */}
            <section className="py-20 bg-gradient-to-r from-violet-700 to-indigo-800 text-white relative overflow-hidden">
                <div className="absolute left-0 top-0 w-64 h-64 border-[40px] border-white/5 rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute right-0 bottom-0 w-96 h-96 border-[60px] border-white/5 rounded-full translate-x-1/3 translate-y-1/3"></div>
                
                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Why <span className="text-fuchsia-300">learn</span> with Intellipath?</h2>
                        <p className="text-blue-100 max-w-2xl mx-auto">We combine the structure of expert-led cohorts with the infinite flexibility of AI generation.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-white/20">
                        <div className="flex flex-col items-center p-6">
                            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-sm">
                                <Video className="w-10 h-10 text-fuchsia-300" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Live Expert Batches</h3>
                            <p className="text-blue-100">Join real-time video lectures, engage with peers, and get direct mentorship.</p>
                        </div>
                        <div className="flex flex-col items-center p-6">
                            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-sm">
                                <Brain className="w-10 h-10 text-cyan-300" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">Instant AI Courses</h3>
                            <p className="text-blue-100">Want to learn something niche right now? Our AI generates a full curriculum in seconds.</p>
                        </div>
                        <div className="flex flex-col items-center p-6">
                            <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mb-6 backdrop-blur-sm">
                                <Users className="w-10 h-10 text-amber-300" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">1-on-1 Query Rooms</h3>
                            <p className="text-blue-100">Stuck on a problem? Raise a query and instantly jump into a private meet with your tutor.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* TOP CATEGORIES */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">Top Categories</h2>
                        <p className="text-slate-500">Explore our most popular learning paths</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        <CategoryCard title="Web Dev" count="120 Courses" icon={<Code />} color="bg-rose-500" />
                        <CategoryCard title="Data Science" count="85 Courses" icon={<Database />} color="bg-blue-500" />
                        <CategoryCard title="Design" count="60 Courses" icon={<Palette />} color="bg-fuchsia-500" />
                        <CategoryCard title="Marketing" count="45 Courses" icon={<LineChart />} color="bg-amber-500" />
                        <CategoryCard title="Business" count="90 Courses" icon={<Globe />} color="bg-emerald-500" />
                        <CategoryCard title="AI & ML" count="150 Courses" icon={<Cpu />} color="bg-violet-500" />
                    </div>
                </div>
            </section>

            {/* NEWSLETTER / SUBSCRIBE */}
            <section className="py-12 bg-white">
                <div className="container mx-auto px-4">
                    <div className="bg-gradient-to-r from-fuchsia-500 via-purple-500 to-violet-600 rounded-[2.5rem] p-10 md:p-16 relative overflow-hidden text-center text-white shadow-2xl">
                        {/* Floating elements */}
                        <div className="absolute top-10 left-10 w-12 h-12 bg-white/20 rounded-full backdrop-blur-md flex items-center justify-center"><Star className="w-6 h-6"/></div>
                        <div className="absolute bottom-10 right-10 w-16 h-16 bg-white/20 rounded-full backdrop-blur-md flex items-center justify-center"><Heart className="w-8 h-8"/></div>
                        
                        <div className="relative z-10 max-w-2xl mx-auto space-y-6">
                            <h2 className="text-3xl md:text-5xl font-bold">Subscribe To Get Updates On Every New Course</h2>
                            <p className="text-purple-100 text-lg">Join {stats.students > 0 ? stats.students.toLocaleString() : '20k'}+ students who receive our weekly learning resources.</p>
                            
                            <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto pt-4 relative">
                                <input 
                                    type="email" 
                                    placeholder="Enter your email address" 
                                    value={subscribeEmail}
                                    onChange={(e) => setSubscribeEmail(e.target.value)}
                                    disabled={subscribeLoading}
                                    className="flex-1 rounded-full px-6 py-4 text-slate-900 outline-none shadow-inner disabled:opacity-50"
                                />
                                <Button 
                                    onClick={handleSubscribe}
                                    disabled={subscribeLoading || !subscribeEmail}
                                    className="rounded-full bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 h-auto text-lg font-medium shadow-lg"
                                >
                                    {subscribeLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Subscribe'}
                                </Button>
                                {subscribeMessage && (
                                    <p className="absolute -bottom-8 left-0 right-0 text-sm font-medium text-purple-200">
                                        {subscribeMessage}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* VIDEO SECTION */}
            <section className="py-20 bg-[#f8fafc]">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto relative group cursor-pointer">
                        {/* Decorative Geometry */}
                        <div className="absolute -left-12 -top-12 w-24 h-24 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 group-hover:opacity-100 transition-opacity"></div>
                        <div className="absolute -right-12 -bottom-12 w-24 h-24 bg-fuchsia-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="relative aspect-video bg-slate-800 rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white">
                            {/* Fake Video Thumbnail */}
                            <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2000&q=80')] bg-cover bg-center opacity-50 mix-blend-overlay"></div>
                            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
                            
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-24 h-24 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center group-hover:scale-110 group-hover:bg-fuchsia-500/90 transition-all duration-300">
                                    <Play className="w-10 h-10 text-white ml-2" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* TESTIMONIALS */}
            <section className="py-24 bg-white">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-20">
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">Testimonials</h2>
                        <p className="text-slate-500">What our students say about us</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 px-4 md:px-0 mt-12">
                        <TestimonialCard 
                            name="Sarah Jenkins"
                            role="Frontend Developer"
                            quote="The live batches are incredible. Being able to ask questions during the live lectures and get immediate help from the instructor changed everything."
                            delay={0.1}
                        />
                        <TestimonialCard 
                            name="Michael Torres"
                            role="Data Science Student"
                            quote="I used the AI generator to learn Rust over the weekend. The personalized pacing and instant quizzes kept me engaged the entire time."
                            delay={0.2}
                            featured
                        />
                        <TestimonialCard 
                            name="Elena Rodriguez"
                            role="Product Manager"
                            quote="Finally, a platform that gives me the best of both worlds. Structured learning when I need a guide, and instant AI courses when I'm exploring on my own."
                            delay={0.3}
                        />
                    </div>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="bg-violet-900 text-violet-200 py-16 border-t border-violet-800">
                <div className="container mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-white">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-fuchsia-400 to-violet-500 flex items-center justify-center font-bold text-2xl shadow-lg shadow-fuchsia-500/20">I</div>
                                <span className="font-bold text-2xl tracking-tight">Intellipath</span>
                            </div>
                            <p className="text-violet-300 mt-4 leading-relaxed max-w-xs">
                                Good learning is good teaching & nothing else. Join our community today.
                            </p>
                        </div>
                        
                        <div>
                            <h4 className="text-white font-bold mb-6 text-lg">Classes</h4>
                            <ul className="space-y-3">
                                <li><Link href="#" className="hover:text-white transition-colors">Featured Courses</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">Web Development</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">Graphic Design</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">Data Science</Link></li>
                            </ul>
                        </div>
                        
                        <div>
                            <h4 className="text-white font-bold mb-6 text-lg">Community</h4>
                            <ul className="space-y-3">
                                <li><Link href="#" className="hover:text-white transition-colors">Learner Forums</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">Instructor Portal</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">Events</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">FAQ</Link></li>
                            </ul>
                        </div>
                        
                        <div>
                            <h4 className="text-white font-bold mb-6 text-lg">Quick Links</h4>
                            <ul className="space-y-3">
                                <li><Link href="#" className="hover:text-white transition-colors">About Us</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">Terms of Service</Link></li>
                                <li><Link href="#" className="hover:text-white transition-colors">Contact Support</Link></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-violet-800 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p>© 2024 Intellipath Learning Platform. All rights reserved.</p>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-violet-800 flex items-center justify-center hover:bg-fuchsia-500 transition-colors cursor-pointer text-white">X</div>
                            <div className="w-10 h-10 rounded-full bg-violet-800 flex items-center justify-center hover:bg-fuchsia-500 transition-colors cursor-pointer text-white">In</div>
                            <div className="w-10 h-10 rounded-full bg-violet-800 flex items-center justify-center hover:bg-fuchsia-500 transition-colors cursor-pointer text-white">Fb</div>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}

function CourseCard({ title, category, price, rating, students, gradient, icon }: any) {
    return (
        <motion.div 
            whileHover={{ y: -8 }}
            className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-200/50 border border-slate-100 flex flex-col group cursor-pointer transition-all"
        >
            <div className={`w-full aspect-[4/3] rounded-2xl bg-gradient-to-br ${gradient} mb-6 flex items-center justify-center shadow-inner relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/10"></div>
                <motion.div group-hover={{ scale: 1.1 }} className="relative z-10 transition-transform duration-500">
                    {icon}
                </motion.div>
            </div>
            
            <div className="flex items-center justify-between mb-3 text-sm font-medium">
                <span className="text-violet-600 bg-violet-50 px-3 py-1 rounded-full">{category}</span>
                <span className="text-slate-400 flex items-center gap-1"><Clock className="w-4 h-4"/> 12 Hrs</span>
            </div>
            
            <h3 className="text-xl font-bold text-slate-900 mb-2 leading-tight group-hover:text-violet-600 transition-colors">{title}</h3>
            
            <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                <div className="flex items-center gap-1"><Star className="w-4 h-4 fill-amber-400 text-amber-400"/> <span className="font-bold text-slate-700">{rating}</span></div>
                <div className="flex items-center gap-1"><Users className="w-4 h-4"/> {students}</div>
            </div>
            
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-slate-100">
                <span className="text-xl font-bold text-slate-900">{price}</span>
                <button className="w-10 h-10 rounded-full bg-slate-50 hover:bg-violet-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">
                    <Heart className="w-5 h-5" />
                </button>
            </div>
        </motion.div>
    );
}

function CategoryCard({ title, count, icon, color }: any) {
    return (
        <motion.div 
            whileHover={{ y: -5 }}
            className="bg-white rounded-2xl p-6 shadow-lg shadow-slate-100 border border-slate-100 flex flex-col items-center text-center cursor-pointer group"
        >
            <div className={`w-16 h-16 rounded-2xl ${color} text-white flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <h4 className="font-bold text-slate-900 mb-1">{title}</h4>
            <p className="text-sm text-slate-500">{count}</p>
        </motion.div>
    );
}

function TestimonialCard({ name, role, quote, delay, featured }: any) {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay }}
            className={`relative bg-white p-8 rounded-3xl border border-slate-100 shadow-xl mt-8 ${featured ? 'shadow-violet-200 md:-translate-y-4' : 'shadow-slate-200/50'}`}
        >
            {/* Floating Avatar */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-gradient-to-br from-fuchsia-400 to-violet-500 flex items-center justify-center font-bold text-xl text-white shadow-lg border-4 border-white">
                {name[0]}
            </div>
            
            <div className="text-center pt-6">
                <p className="text-slate-600 italic mb-6 leading-relaxed">"{quote}"</p>
                <div className="flex justify-center gap-1 mb-4">
                    {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400"/>)}
                </div>
                <h4 className="font-bold text-slate-900">{name}</h4>
                <p className="text-sm text-slate-500">{role}</p>
            </div>
        </motion.div>
    );
}
