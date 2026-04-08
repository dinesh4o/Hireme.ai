import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useMotionTemplate } from 'framer-motion';
import { Sparkles, ArrowRight, Bot, LineChart, Shield, Play, Cpu, Mic, BrainCircuit } from 'lucide-react';
import { useRef, useState } from 'react';


const SpotlightCard = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: React.MouseEvent) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={`group relative rounded-[2rem] border border-white/[0.05] bg-[#050505] overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-0 transition duration-300 group-hover:opacity-100 z-10"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              400px circle at ${mouseX}px ${mouseY}px,
              rgba(255,255,255,0.08),
              transparent 80%
            )
          `,
        }}
      />
      {children}
    </div>
  );
};

export default function LandingPage() {
  const navigate = useNavigate();
  const heroRef = useRef<HTMLDivElement>(null);

  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  return (
    <div 
      className="min-h-screen bg-[#050505] text-[#FAFAFA] font-sans selection:bg-white/20 overflow-x-hidden"
      onMouseMove={(e) => setMousePosition({ x: e.clientX, y: e.clientY })}
    >
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div 
          animate={{ 
            x: mousePosition.x * 0.05, 
            y: mousePosition.y * 0.05 
          }}
          transition={{ type: 'spring', stiffness: 50, damping: 20 }}
          className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[140px] rounded-full mix-blend-screen" 
        />
        <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[20%] w-[60%] h-[60%] bg-indigo-500/10 blur-[130px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 opacity-[0.15] mix-blend-overlay [background-image:radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:3px_3px]" />
      </div>

      <main className="relative z-10 w-full overflow-hidden">
        
        {/* Superior Hero Section */}
        <section ref={heroRef} className="pt-40 pb-32 px-6 max-w-7xl mx-auto flex flex-col items-center text-center relative">
          <motion.div
            initial={{ opacity: 0, scale: 0.8, filter: 'blur(10px)' }}
            animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.03] border border-white/[0.08] text-[11px] font-mono uppercase tracking-widest text-zinc-300 mb-8 backdrop-blur-md"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            New Gen AI Evaluation Partner
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-[90px] font-bold tracking-tighter max-w-5xl leading-[1.05] mb-8 text-white relative"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-[200px] h-[200px] bg-white/10 blur-[100px] rounded-full pointer-events-none" />
            Automate Smarter. <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-white/90 via-white/50 to-white/20 italic font-serif font-light flex items-center justify-center gap-4 mt-2">
              Grow Faster.
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-lg md:text-xl text-white/40 max-w-2xl mb-12 font-light leading-relaxed"
          >
            Evaluate candidates perfectly, every time. Our AI understands deep contexts, tests technical abilities, and scores fairly with unparalleled precision.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto relative z-20"
          >
            <button 
              onClick={() => navigate('/workspace')}
              className="group relative px-8 py-4 bg-white text-black rounded-full font-semibold text-sm w-full sm:w-auto overflow-hidden shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_50px_rgba(255,255,255,0.4)] transition-shadow duration-500"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
              <span className="relative flex items-center justify-center gap-2">
                Initialize Uplink <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </button>
            <button className="px-8 py-4 bg-white/[0.03] border border-white/[0.08] rounded-full font-medium text-sm hover:bg-white/[0.08] transition-colors w-full sm:w-auto flex items-center justify-center gap-2 backdrop-blur-md text-white/80 hover:text-white">
              <Play className="w-4 h-4 text-indigo-400" /> View Architecture
            </button>
          </motion.div>

          
          {/* Floating Spotlight UI Mockup Enhanced */}
          <motion.div
            initial={{ opacity: 0, y: 100, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.4, duration: 1.2, type: "spring", bounce: 0.2 }}
            style={{ perspective: 1000 }}
            className="w-full max-w-4xl mx-auto mt-20 relative z-20"
          >
            <SpotlightCard className="!rounded-[2rem] border-white/[0.1] bg-[#050505]/80 backdrop-blur-2xl shadow-[0_0_80px_rgba(255,255,255,0.05)]">
              {/* Glowing top border beam */}
              <motion.div 
                 animate={{ x: ['-100%', '200%'] }} 
                 transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
                 className="absolute top-0 w-1/3 h-[1px] bg-gradient-to-r from-transparent via-white/50 to-transparent z-30" 
               />
              <div className="p-8 flex flex-col md:flex-row gap-6 md:h-[400px] relative z-20">
                <div className="w-full md:w-1/3 flex flex-col gap-4">
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.02]">
                    <div className="h-2 w-1/2 bg-white/20 rounded-full mb-3" />
                    <div className="h-2 w-3/4 bg-white/10 rounded-full" />
                  </div>
                  <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.02]">
                    <div className="h-2 w-2/3 bg-white/20 rounded-full mb-3" />
                    <div className="h-2 w-full bg-white/10 rounded-full" />
                  </div>
                  <div className="mt-auto pt-4 border-t border-white/[0.05]">
                     <div className="flex items-center gap-3">
                       <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center relative shadow-[0_0_15px_rgba(255,255,255,0.4)]">
                         <Mic className="w-4 h-4 text-black relative z-10" />
                         <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-20" />
                       </div>
                       <div className="h-2 w-20 bg-white/20 rounded-full animate-pulse" />
                     </div>
                  </div>
                </div>
                <div className="flex-1 bg-[#030303] rounded-2xl border border-white/[0.05] p-6 font-mono text-[12px] text-gray-500 flex flex-col relative overflow-hidden shadow-inner">
                  <div className="absolute top-0 right-0 p-4 opacity-20 hidden sm:block">
                     <BrainCircuit className="w-24 h-24 text-white" />
                  </div>
                  <div className="flex gap-4">
                    <span className="text-gray-700 select-none">1</span>
                    <span className="text-white">package main</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-gray-700 select-none">2</span>
                    <span>import "fmt"</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-gray-700 select-none">3</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-gray-700 select-none">4</span>
                    <span>func analyzeComplexity() &#123;</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-gray-700 select-none">5</span>
                    <span className="pl-4">fmt.Println("O(n) complexity detected")</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-gray-700 select-none">6</span>
                    <span>&#125;</span>
                  </div>
                  <div className="mt-auto flex items-center gap-2 text-indigo-400 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                     <Bot className="w-4 h-4" />
                     <span>Agent: Memory leak potential on line 42...</span>
                  </div>
                </div>
              </div>
            </SpotlightCard>
          </motion.div>

        </section>

        {/* High-End Bento Grid Services */}
        <section id="features" className="py-24 px-6 max-w-7xl mx-auto z-10 relative">
          <div className="text-center mb-20">
             <motion.div 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                className="inline-block px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-[10px] font-mono uppercase tracking-[0.2em] text-white/50 mb-6"
             >
               Architectural Superiority
             </motion.div>
             <motion.h2 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ delay: 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tighter text-white mb-6 leading-tight"
             >
               Smarter Pipelines, <br className="hidden sm:block"/><span className="italic text-white/40 font-serif font-light">Built with Agentic AI</span>
             </motion.h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 auto-rows-[360px]">
            
            {/* Large Card 1 */}
            <motion.div 
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true, margin: "-50px" }}
               transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
               className="md:col-span-4 rounded-[32px] border border-white/[0.06] bg-[#0A0A0A] p-10 flex flex-col justify-between group overflow-hidden relative"
            >
               <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] to-transparent z-0 relative transition-opacity duration-700 opacity-50 group-hover:opacity-100" />
               <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full translate-x-1/3 -translate-y-1/3 group-hover:bg-indigo-500/20 transition-colors duration-700" />
               
               <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-translate-y-2 transition-all duration-500 ease-[0.16,1,0.3,1] shadow-xl">
                 <Cpu className="w-7 h-7 text-white/90" />
               </div>
               <div className="relative z-10 max-w-md">
                 <h3 className="text-3xl font-bold text-white/90 mb-4 tracking-tight">Autonomous Evaluation Engines.</h3>
                 <p className="text-white/40 text-sm leading-relaxed font-light">Deploy intelligent virtual interviewers that adapt dynamically to candidate responses, diving deep into technical concepts seamlessly.</p>
               </div>
               
               {/* Decorative background element showing process rings */}
               <div className="absolute -right-12 -bottom-12 opacity-30 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none scale-150 transform origin-bottom-right">
                  <div className="w-64 h-64 border border-white/5 rounded-full flex items-center justify-center relative">
                     <div className="w-2 h-2 rounded-full bg-white/20 absolute top-0 -translate-y-1/2" />
                     <div className="w-48 h-48 border border-white/10 rounded-full flex items-center justify-center">
                        <div className="w-32 h-32 border border-white/10 rounded-full bg-[#050505] shadow-[0_0_50px_rgba(0,0,0,1)]" />
                     </div>
                  </div>
               </div>
            </motion.div>

            {/* Small Card 1 */}
            <motion.div 
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true, margin: "-50px" }}
               transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
               className="md:col-span-2 rounded-[32px] border border-white/[0.06] bg-[#0A0A0A] p-8 flex flex-col justify-between group overflow-hidden relative"
            >
               <div className="absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent z-0 transition-opacity duration-700 opacity-50 group-hover:opacity-100" />
               <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
               
               <div className="relative z-10 w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:-translate-y-2 transition-transform duration-500 ease-[0.16,1,0.3,1] shadow-xl">
                 <LineChart className="w-6 h-6 text-white/80" />
               </div>
               <div className="relative z-10">
                 <h3 className="text-2xl font-bold text-white/90 mb-3 tracking-tight">Live Telemetry.</h3>
                 <p className="text-white/40 text-sm leading-relaxed font-light">Track performance, detect anomalies, and process analytical volume in real-time.</p>
               </div>
            </motion.div>

            {/* Small Card 2 */}
            <motion.div 
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true, margin: "-50px" }}
               transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
               className="md:col-span-3 rounded-[32px] border border-white/[0.06] bg-[#0A0A0A] p-10 flex flex-col justify-between group overflow-hidden relative"
            >
               <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] to-white/[0.04] z-0 transition-opacity duration-700 opacity-50 group-hover:opacity-100" />
               
               <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] group-hover:bg-white/10 transition-all duration-500 shadow-xl">
                 <Bot className="w-7 h-7 text-white/90" />
               </div>
               <div className="relative z-10">
                 <h3 className="text-2xl font-bold text-white/90 mb-3 tracking-tight">Cognitive Depth.</h3>
                 <p className="text-white/40 text-sm leading-relaxed font-light max-w-[300px]">Engineer bespoke intelligence configurations engineered aggressively to test architecture efficiently.</p>
               </div>
            </motion.div>

            {/* Small Card 3 */}
            <motion.div 
               initial={{ opacity: 0, y: 30 }}
               whileInView={{ opacity: 1, y: 0 }}
               viewport={{ once: true, margin: "-50px" }}
               transition={{ duration: 0.7, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
               className="md:col-span-3 rounded-[32px] border border-white/[0.06] bg-[#0A0A0A] p-10 flex flex-col justify-between group overflow-hidden relative"
            >
               <div className="absolute inset-0 bg-gradient-to-t from-white/[0.01] to-white/[0.04] z-0 transition-opacity duration-700 opacity-50 group-hover:opacity-100" />
               <div className="absolute right-0 bottom-0 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full translate-x-1/2 translate-y-1/2 group-hover:bg-emerald-500/20 transition-colors" />
               
               <div className="relative z-10 w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-6 group-hover:rotate-[15deg] transition-transform duration-[800ms] ease-out shadow-xl">
                 <Shield className="w-7 h-7 text-white/90" />
               </div>
               <div className="relative z-10">
                 <h3 className="text-2xl font-bold text-white/90 mb-3 tracking-tight">Enterprise Security.</h3>
                 <p className="text-white/40 text-sm leading-relaxed font-light max-w-[300px]">Military-grade isolation. End-to-end encrypted tunnels shielding proprietary questions from exfiltration securely.</p>
               </div>
            </motion.div>

          </div>
        </section>

        {/* Action Call / Footer CTA */}
        <section className="py-40 relative overflow-hidden border-t border-white/5 bg-[#030303] mt-24">
          <div className="absolute inset-0 opacity-[0.05] z-0 pointer-events-none mix-blend-overlay [background-image:radial-gradient(rgba(255,255,255,0.1)_1px,transparent_1px)] [background-size:3px_3px]" />
          <div className="absolute bottom-[-50%] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-500/15 blur-[150px] rounded-[100%] pointer-events-none z-0" />
          
          <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-150px" }}
              transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            >
              <h2 className="text-5xl md:text-7xl font-bold tracking-tighter text-white mb-6 leading-tight">
                 Ready to Automate <br/><span className="italic text-white/50 font-serif font-light">Your Tech Hiring?</span>
              </h2>
              <p className="text-white/40 text-lg mb-12 max-w-xl mx-auto font-light leading-relaxed">
                 Deploy an intelligent architect into your pipeline today. Scale your technical evaluations without compromising quality or fairness.
              </p>
              <button 
                onClick={() => navigate('/workspace')}
                className="group relative px-10 py-5 bg-white text-black rounded-full font-bold text-sm w-full sm:w-auto overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.15)] hover:shadow-[0_0_80px_rgba(255,255,255,0.3)] transition-all mx-auto flex items-center justify-center gap-3"
              >
                 <div className="absolute inset-0 bg-zinc-200 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
                 <span className="relative flex items-center gap-2">Initialize Core Telemetry <Sparkles className="w-4 h-4" /></span>
              </button>
            </motion.div>
          </div>
        </section>

        {/* Minimum Refined Footer */}
        <footer className="py-10 border-t border-white/[0.08] bg-[#000000] relative z-10">
           <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-xs font-mono tracking-widest text-white/30 uppercase">
             <div>© 2026 Hireme.ai</div>
             <div className="flex gap-8">
               <a href="#" className="hover:text-white/80 transition-colors">Privacy</a>
               <a href="#" className="hover:text-white/80 transition-colors">Terms</a>
               <a href="#" className="hover:text-white/80 transition-colors">System Status</a>
             </div>
           </div>
        </footer>

      </main>
    </div>
  );
}
