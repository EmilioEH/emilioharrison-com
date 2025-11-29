import React from 'react';
import { Briefcase, BookOpen, Sparkles, Award, Music, ArrowRight, Mail } from 'lucide-react';
import SectionTitle from '../../ui/SectionTitle';
import BrutalCard from '../../ui/BrutalCard';
import BrutalButton from '../../ui/BrutalButton';
import { useTheme } from '../../../hooks/useTheme';

const AboutContent = () => {
    const theme = useTheme();

    return (
        <div className="animate-in fade-in duration-700 space-y-16">
            <SectionTitle theme={theme}>About</SectionTitle>

            {/* Main Content - Story */}
            <div className="max-w-3xl">
                <p className="text-xl md:text-2xl font-medium leading-relaxed mb-8">
                    I got into UX research because I wanted to understand why people do confusing things with technology. Turns out, the technology is usually the confusing part.
                </p>
                <div className="space-y-6 text-lg leading-relaxed text-gray-800">
                    <p>
                        For years, that meant running usability tests, conducting interviews, and translating what people actually need into what product teams could build. Standard UX research work. Good work.
                    </p>
                    <p>
                        Then LLMs showed up and everyone started calling them "game-changers" while simultaneously having no idea how to use them responsibly. I watched people ship AI features that looked impressive in demos and failed immediately in real use. I watched companies panic-adopt AI without asking if it solved actual problems.
                    </p>
                    <p>
                        I also felt that panic myself. The "what if I'm obsolete" dread that comes with every new technology wave.
                    </p>
                    <p>
                        So I did what I always do with confusing things: I started taking them apart to see how they work.
                    </p>
                    <p>
                        I built my first LLM tool for heuristic evaluation at JP Morgan Chase. Then a thematic analysis assistant. Both got rolled out company-wide to UX professionals. Not because they were clever AI demos, but because I tested them until I knew they actually worked.
                    </p>
                    <p>
                        That's when I realized: the skill isn't using AI. The skill is knowing when something's ready to ship and when you're just hoping it works.
                    </p>
                    <p className="font-bold">
                        Now I build AI tools for real problems, write about what I'm learning, and try to start conversations about what's actually worth building. I'm puzzle-obsessed, testing-obsessed, and probably more fun at dinner parties than this bio makes me sound.
                    </p>
                </div>
            </div>

            {/* What I Do */}
            <div>
                <h2 className="text-3xl font-black mb-8 border-b-4 border-black pb-2 inline-block">What I Do</h2>
                <BrutalCard theme={theme} className="p-8">
                    <div className="flex items-start gap-4 mb-6">
                        <Briefcase className="text-black mt-1" size={32} />
                        <div>
                            <h3 className="text-2xl font-black mb-1">JP Morgan Chase</h3>
                            <p className="font-bold text-lg text-gray-700">UX Research Strategist, Operations Team</p>
                            <p className="text-sm text-gray-500 font-bold uppercase tracking-wider">January 2023 - Present | Austin, TX</p>
                        </div>
                    </div>
                    <div className="space-y-4 text-lg border-l-4 border-black pl-6">
                        <p>
                            I pioneered the firm's AI adoption strategy for UX research. That meant building specialized LLM tools for Thematic Analysis, Heuristic Evaluation, and Fraud Detection, then deploying them to UX professionals across the organization.
                        </p>
                        <p>
                            The work isn't just building tools. It's proving they actually work before anyone uses them. I developed the 5×5 testing framework: 5 runs for consistency, 5 scenarios for accuracy. It's simple, but it's the difference between "this looks good" and "I know this works."
                        </p>
                        <p>
                            I also led design system validation research—stakeholder interviews and 30+ hours of user testing that resulted in 50% faster task completion and measurably improved user confidence.
                        </p>
                    </div>
                </BrutalCard>
            </div>

            {/* How I Work */}
            <div>
                <h2 className="text-3xl font-black mb-8 border-b-4 border-black pb-2 inline-block">How I Work</h2>
                <div className="grid grid-cols-1 gap-8">
                    <BrutalCard theme={theme} className="p-8 bg-mustard">
                        <p className="text-xl font-bold mb-6">
                            I'm not interested in building AI tools that look impressive. I'm interested in building tools that actually solve problems.
                        </p>
                        <p className="mb-6">
                            That means asking "what job needs doing?" before writing any code. It means testing obsessively before shipping. It means admitting when something doesn't work instead of convincing myself it's "good enough."
                        </p>

                        <div className="space-y-6">
                            <div className="bg-white p-6 border-2 border-black shadow-hard-sm">
                                <h3 className="text-xl font-black mb-2">Context engineering over prompt engineering.</h3>
                                <p>You don't need the perfect prompt. You need the right information. I'd rather spend 10 minutes finding good documentation than an hour trying to word a request perfectly.</p>
                            </div>

                            <div className="bg-white p-6 border-2 border-black shadow-hard-sm">
                                <h3 className="text-xl font-black mb-2">Test everything, trust nothing (at first).</h3>
                                <p>The 5×5 framework exists because I refuse to ship things based on hope. 5 runs to check consistency. 5 scenarios to verify accuracy. Simple, repeatable, effective.</p>
                            </div>

                            <div className="bg-white p-6 border-2 border-black shadow-hard-sm">
                                <h3 className="text-xl font-black mb-2">Learn publicly, build openly.</h3>
                                <p>I write about what I'm stuck on, not just what I've figured out. The shift from "wanting to be right" to "wanting to get it right" changed how I work. I'd rather admit I don't know something than perform expertise I don't have.</p>
                            </div>
                        </div>

                        <p className="mt-6 font-bold text-lg border-t-2 border-black pt-4">
                            The puzzle is the point. Solving it obsessively is just how I work.
                        </p>
                    </BrutalCard>
                </div>
            </div>

            {/* Before This */}
            <div>
                <h2 className="text-3xl font-black mb-8 border-b-4 border-black pb-2 inline-block">Before This</h2>
                <div className="space-y-6">
                    <BrutalCard theme={theme} className="p-6">
                        <h3 className="text-xl font-black mb-1">Charles Schwab</h3>
                        <p className="font-bold text-gray-700">Lead UX Researcher</p>
                        <p className="text-sm text-gray-500 mb-4 font-bold uppercase">2020-2022 | Austin, TX</p>
                        <p>Led usability evaluations and content research that improved user understanding and accelerated content-first design. Identified friction points in client verification that resulted in a +90% fraud prevention rate and $26M quarterly cost avoidance.</p>
                    </BrutalCard>

                    <BrutalCard theme={theme} className="p-6">
                        <h3 className="text-xl font-black mb-1">HEB</h3>
                        <p className="font-bold text-gray-700">Customer Experience Manager</p>
                        <p className="text-sm text-gray-500 mb-4 font-bold uppercase">2017-2020 | Austin, TX</p>
                        <p>Managed customer experience initiatives and knowledge transfer across the organization.</p>
                    </BrutalCard>
                </div>
            </div>

            {/* Education & Certifications */}
            <div>
                <h2 className="text-3xl font-black mb-8 border-b-4 border-black pb-2 inline-block">Education & Certifications</h2>
                <BrutalCard theme={theme} className="p-8">
                    <ul className="space-y-4">
                        {[
                            "AI Fluency: Framework & Foundations — Anthropic",
                            "Certificate of Persuasive Communication — eCornell",
                            "Certificate of Statistics — eCornell",
                            "Enterprise Design Thinking Co-Creator — IBM",
                            "AAS in UX Design — Austin Community College"
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-3 font-bold text-lg">
                                <Award className="flex-shrink-0 mt-1 text-gray-500" size={20} />
                                <span>{item}</span>
                            </li>
                        ))}
                    </ul>
                </BrutalCard>
            </div>

            {/* Outside of Work */}
            <div>
                <h2 className="text-3xl font-black mb-8 border-b-4 border-black pb-2 inline-block">Outside of Work</h2>
                <BrutalCard theme={theme} className="p-8 bg-black text-white">
                    <div className="flex flex-col md:flex-row gap-8 items-center">
                        <div className="flex-1">
                            <p className="text-xl font-bold mb-6">
                                When I'm not building AI tools or writing about UX research, I make music.
                            </p>
                            <a
                                href="https://youtu.be/Sg3xcHx-RRI?si=WaVnEWyDgUySVlug"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 font-black uppercase tracking-wider hover:bg-gray-200 transition-colors"
                            >
                                <Music size={20} /> Listen here <ArrowRight size={20} />
                            </a>
                        </div>
                    </div>
                </BrutalCard>
            </div>

            {/* What's Next */}
            <div className="py-12 border-t-4 border-black">
                <h2 className="text-3xl font-black mb-6">What's Next</h2>
                <p className="text-xl mb-8 max-w-2xl">
                    I'm building tools for UX practitioners, writing about what actually works, and figuring out how to teach this stuff without adding to the AI hype noise.
                </p>

                <div className="space-y-6">
                    <div>
                        <p className="font-bold mb-3 uppercase tracking-wider text-sm text-gray-500">Want to see what I'm working on?</p>
                        <div className="flex flex-wrap gap-4">
                            <BrutalButton theme={theme} href="/fieldnotes">
                                <BookOpen size={20} /> Read Field Notes
                            </BrutalButton>
                            <BrutalButton theme={theme} href="/lab" color={theme.colors.secondary}>
                                <Sparkles size={20} /> Explore the Lab
                            </BrutalButton>
                        </div>
                    </div>

                    <div>
                        <p className="font-bold mb-3 uppercase tracking-wider text-sm text-gray-500">Looking to collaborate?</p>
                        <BrutalButton theme={theme} href="/contact" color={theme.colors.accent}>
                            <Mail size={20} /> Get in touch
                        </BrutalButton>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutContent;

