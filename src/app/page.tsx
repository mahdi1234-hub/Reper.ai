"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  BarChart3,
  Target,
  Users,
  Zap,
  Shield,
  Globe,
  MessageSquare,
  Search,
  FileText,
  Calendar,
  Mail,
  CheckCircle,
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI-Powered CRM Agent",
    description: "Chat with your CRM data naturally. Ask questions, create records, and get insights through conversational AI.",
  },
  {
    icon: Target,
    title: "Real-Time Lead Finder",
    description: "Search and discover leads from multiple sources. Filter by industry, location, company size, and more.",
  },
  {
    icon: BarChart3,
    title: "Smart Analytics",
    description: "Get instant insights on your pipeline, deal stages, and revenue forecasts through AI-powered analysis.",
  },
  {
    icon: Mail,
    title: "Google Workspace Integration",
    description: "Full access to Gmail, Calendar, Drive, Contacts, and more. Your AI agent works across all your tools.",
  },
  {
    icon: FileText,
    title: "Document Intelligence",
    description: "Upload documents and let AI extract key information. Build a searchable knowledge base automatically.",
  },
  {
    icon: Shield,
    title: "AI Memory & Context",
    description: "Your AI agent remembers every conversation and document. Multi-tenant memory with per-user namespaces.",
  },
];

const integrations = [
  { name: "Gmail", icon: Mail },
  { name: "Calendar", icon: Calendar },
  { name: "Drive", icon: FileText },
  { name: "Contacts", icon: Users },
  { name: "Sheets", icon: BarChart3 },
  { name: "Docs", icon: FileText },
];

export default function LandingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  const handleGetStarted = () => {
    if (session) {
      router.push("/chat");
    } else {
      signIn("google", { callbackUrl: "/chat" });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">R</span>
            </div>
            <span className="font-bold text-lg text-slate-800">Reper<span className="text-emerald-500">.ai</span></span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Features</a>
            <a href="#integrations" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">Integrations</a>
            <a href="#about" className="text-sm text-slate-600 hover:text-slate-900 transition-colors">About</a>
          </div>
          <div className="flex items-center gap-3">
            {session ? (
              <button
                onClick={() => router.push("/chat")}
                className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
              >
                Open App
              </button>
            ) : (
              <>
                <button
                  onClick={() => signIn("google", { callbackUrl: "/chat" })}
                  className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
                >
                  Sign In
                </button>
                <button
                  onClick={handleGetStarted}
                  className="px-4 py-2 bg-emerald-500 text-white text-sm font-medium rounded-lg hover:bg-emerald-600 transition-colors"
                >
                  Get Started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-32 pb-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/50 via-white to-white" />
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-emerald-100/30 rounded-full blur-3xl" />

        <motion.div
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative max-w-5xl mx-auto px-6 text-center"
        >
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-medium mb-6">
              <Zap size={12} />
              AI-Powered CRM Platform
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6">
              Your CRM,{" "}
              <span className="text-emerald-500">powered by AI</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Reper is an AI-powered CRM that understands your business. Chat with your data,
              find leads in real-time, and let AI handle the busy work across all your Google Workspace tools.
            </p>

            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={handleGetStarted}
                className="px-8 py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                Get Started Free
                <ArrowRight size={18} />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-3 bg-white text-slate-700 font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
              >
                Watch Demo
              </motion.button>
            </div>
          </motion.div>

          {/* Hero Image/Preview */}
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="mt-16 relative"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden mx-4">
              <div className="flex">
                {/* Mini Sidebar Preview */}
                <div className="w-48 bg-slate-50 border-r border-slate-200 p-4 hidden md:block">
                  <div className="flex items-center gap-2 mb-6">
                    <div className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">R</span>
                    </div>
                    <span className="text-xs font-semibold text-slate-700">Reper</span>
                  </div>
                  {["Home", "Reper AI", "Lead Finder", "Companies", "Deals", "Tasks"].map(
                    (item, i) => (
                      <div
                        key={item}
                        className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs mb-1 ${
                          i === 1
                            ? "bg-slate-200 text-slate-900 font-medium"
                            : "text-slate-500"
                        }`}
                      >
                        <div className="w-3 h-3 rounded bg-slate-300" />
                        {item}
                      </div>
                    )
                  )}
                </div>

                {/* Chat Preview */}
                <div className="flex-1 p-6">
                  <div className="flex flex-col items-center py-8">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                      <div className="w-6 h-6 bg-emerald-300 rounded-full" />
                    </div>
                    <p className="text-lg font-semibold text-slate-800 mb-6">
                      How can I <span className="text-emerald-500">help</span>?
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mb-6">
                      {["What can you do?", "Show my deals", "Find leads"].map((q) => (
                        <span
                          key={q}
                          className="px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-600"
                        >
                          {q}
                        </span>
                      ))}
                    </div>
                    <div className="w-full max-w-md">
                      <div className="flex items-center border border-slate-200 rounded-xl px-4 py-2.5">
                        <span className="text-xs text-slate-400 flex-1">
                          Ask Reper questions about your customers and deals
                        </span>
                        <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                          <ArrowRight size={12} className="text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Everything you need to close more deals
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Reper combines AI intelligence with powerful CRM tools to help you manage relationships and grow revenue.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-6 rounded-2xl border border-slate-200 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5 transition-all group"
              >
                <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
                  <feature.icon size={24} className="text-emerald-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section id="integrations" className="py-24 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Connected to your entire Google Workspace
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Your AI agent has full access to Gmail, Calendar, Drive, Contacts, Sheets, and Docs.
              All scopes enabled for complete workspace integration.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {integrations.map((integration, i) => (
              <motion.div
                key={integration.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="flex flex-col items-center gap-3 p-6 bg-white rounded-xl border border-slate-200 hover:border-emerald-200 transition-colors"
              >
                <integration.icon size={28} className="text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">{integration.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              How Reper works
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Sign in with Google", desc: "Connect your Google Workspace with one click. All tools are instantly available to your AI agent." },
              { step: "02", title: "Chat with your CRM", desc: "Ask questions, create deals, find leads, and manage your pipeline through natural conversation." },
              { step: "03", title: "Let AI do the work", desc: "Your AI agent remembers everything, learns your preferences, and proactively helps you close deals." },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="text-center"
              >
                <div className="text-5xl font-bold text-emerald-100 mb-4">{item.step}</div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-white to-emerald-50">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Ready to transform your CRM?
            </h2>
            <p className="text-lg text-slate-600 mb-8">
              Join thousands of teams using AI to close more deals and build better relationships.
            </p>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleGetStarted}
              className="px-8 py-3 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors flex items-center gap-2 mx-auto shadow-lg shadow-emerald-500/20"
            >
              Get Started Free
              <ArrowRight size={18} />
            </motion.button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer id="about" className="py-12 px-6 border-t border-slate-200">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xs">R</span>
            </div>
            <span className="font-semibold text-slate-800">Reper.ai</span>
          </div>
          <p className="text-sm text-slate-500">
            AI-powered CRM platform. Built with Next.js, Cerebras AI, and Pinecone.
          </p>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-700">Privacy</a>
            <a href="#" className="hover:text-slate-700">Terms</a>
            <a href="#" className="hover:text-slate-700">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
