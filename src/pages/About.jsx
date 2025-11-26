import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Briefcase, BookOpen, Sparkles, Award, Code, Users } from 'lucide-react';
import SectionTitle from '../components/ui/SectionTitle';
import BrutalCard from '../components/ui/BrutalCard';
import BrutalButton from '../components/ui/BrutalButton';

const About = ({ theme }) => {
    const navigate = useNavigate();

    const skills = {
        research: ['Generative Research', 'Usability Testing', 'Card Sorting', 'Guerrilla Research', 'Heuristic Evaluation', 'Thematic Analysis', 'Surveys', 'Contextual Inquiry'],
        ai: ['OpenAI Studio', 'Claude', 'GitHub Copilot', 'Microsoft Copilot', 'Cursor', 'Windsurf', 'LLM Prompt Engineering', 'Context Engineering', 'Generative AI'],
        tools: ['Figma', 'Sketch', 'UserZoom', 'dscout', 'Optimal Workshop', 'Maze', 'Qualtrics', 'Survey Monkey', 'Adobe Creative Suite'],
        technical: ['React', 'JavaScript', 'HTML/CSS', 'Vite', 'Git', 'Confluence', 'Jira', 'WebEx', 'MS Teams']
    };

    const certifications = [
        { name: 'AI Fluency: Framework & Foundations', org: 'Anthropic', year: '2025' },
        { name: 'Certificate of Persuasive Communication', org: 'eCornell', year: '2025' },
        { name: 'Certificate of Statistics', org: 'eCornell', year: '2024' },
        { name: 'Enterprise Design Thinking Co-Creator', org: 'IBM', year: '2019' },
        { name: 'AAS in UX Design', org: 'Austin Community College', year: '2017-2019' }
    ];

    const expertise = [
        {
            icon: Briefcase,
            title: 'UX Research Leadership',
            description: 'Leading cross-functional research initiatives, developing research strategies aligned with business goals, and mentoring junior researchers.'
        },
        {
            icon: Sparkles,
            title: 'AI Tools & Innovation',
            description: 'Pioneered AI adoption strategy for UX at JP Morgan Chase. Built LLM-powered tools for heuristic evaluation and thematic analysis, rolled out company-wide.'
        },
        {
            icon: Code,
            title: 'Testing Frameworks',
            description: 'Developed rigorous testing protocols for AI outputs, including the 5×5 methodology: consistency testing across runs and accuracy validation across scenarios.'
        },
        {
            icon: Users,
            title: 'Design System Validation',
            description: 'Spearheaded validation research measuring component effectiveness. Led stakeholder interviews and 30-hour user testing resulting in 50% faster task completion.'
        }
    ];

    return (
        <div className="animate-in fade-in duration-700">
            <SectionTitle theme={theme}>About</SectionTitle>

            {/* Hero Section */}
            <div className="mb-16">
                <div className={`inline-block ${theme.border} ${theme.colors.accent} px-3 py-1 font-bold text-sm mb-4 transform -rotate-1 text-black`}>
                    UX RESEARCHER × AI BUILDER × CREATIVE TECHNOLOGIST
                </div>
                <p className={`text-2xl md:text-3xl font-bold leading-relaxed mb-6 ${theme.id === 'blueprint' ? 'text-blue-100' : 'text-gray-900'}`}>
                    I'm <span className={theme.colors.highlight}>Emilio Harrison</span>, a UX Researcher specializing in bridging human-centered design with AI innovation.
                </p>
                <p className={`text-lg md:text-xl leading-relaxed border-l-4 pl-6 mb-4 ${theme.id === 'blueprint' ? 'border-blue-200 text-blue-200' : 'border-black text-gray-700'}`}>
                    I believe in building <strong>utility-focused tools</strong> that solve real problems, testing rigorously instead of shipping "good enough," and learning authentically rather than performing expertise.
                </p>
            </div>

            {/* Current Work */}
            <BrutalCard theme={theme} className="mb-12 p-8">
                <div className="flex items-start gap-4 mb-4">
                    <Briefcase className={theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'} size={32} />
                    <div>
                        <h3 className="text-2xl font-black mb-1">JP Morgan Chase</h3>
                        <p className={`font-bold ${theme.id === 'blueprint' ? 'text-blue-300' : 'text-gray-600'}`}>UX Research Strategist Operations Team</p>
                        <p className={`text-sm ${theme.id === 'blueprint' ? 'text-blue-400' : 'text-gray-500'}`}>January 2023 - Present | Austin, TX</p>
                    </div>
                </div>
                <div className={`border-l-4 pl-4 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-gray-300'}`}>
                    <p className={`mb-3 ${theme.id === 'blueprint' ? 'text-blue-100' : 'text-gray-700'}`}>
                        <strong>Pioneered the firm's AI adoption strategy for UX.</strong> Developed specialized LLM task models for Thematic Analysis, Heuristic Evaluation, and Fraud Detection, deployed to UX professionals across the organization.
                    </p>
                    <p className={`mb-3 ${theme.id === 'blueprint' ? 'text-blue-100' : 'text-gray-700'}`}>
                        Led a 3-sprint mixed-method study with 32 participants across 4 studies to assess cognitive load and contextual consistency. Created research strategies working directly with product owners, managers, and designers across cross-functional UX areas.
                    </p>
                    <p className={`${theme.id === 'blueprint' ? 'text-blue-100' : 'text-gray-700'}`}>
                        Spearheaded design system strategy and validation research, leading stakeholder interviews and 30-hour user testing with participants to measure component effectiveness, resulting in <strong>50% faster task completion</strong> and improved user confidence.
                    </p>
                </div>
            </BrutalCard>

            {/* Expertise Areas */}
            <div className="mb-12">
                <h2 className={`text-3xl font-black mb-6 border-b-4 pb-2 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'}`}>Expertise</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {expertise.map((item, index) => (
                        <BrutalCard key={index} theme={theme} className="p-6">
                            <item.icon className={`mb-3 ${theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'}`} size={28} />
                            <h3 className="text-xl font-black mb-2">{item.title}</h3>
                            <p className={theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'}>{item.description}</p>
                        </BrutalCard>
                    ))}
                </div>
            </div>

            {/* Philosophy */}
            <BrutalCard theme={theme} className="mb-12 p-8">
                <div className="flex items-start gap-4 mb-4">
                    <BookOpen className={theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'} size={32} />
                    <h2 className="text-3xl font-black">Philosophy</h2>
                </div>
                <div className="space-y-4">
                    <div className={`border-l-4 pl-4 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-gray-300'}`}>
                        <p className={`italic text-lg mb-2 ${theme.id === 'blueprint' ? 'text-blue-100' : 'text-gray-700'}`}>
                            "Context engineering over prompt engineering. You don't need to memorize the recipe—you just need to know where the cookbook is."
                        </p>
                        <p className={`text-sm ${theme.id === 'blueprint' ? 'text-blue-400' : 'text-gray-500'}`}>— From "Context is King"</p>
                    </div>
                    <p className={theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'}>
                        I focus on building tools that scale beyond demos. That means rigorous testing frameworks, like my <strong>5×5 protocol</strong> (5 runs for consistency, 5 scenarios for accuracy) to validate AI outputs before shipping.
                    </p>
                    <div className={`border-l-4 pl-4 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-gray-300'}`}>
                        <p className={`italic text-lg mb-2 ${theme.id === 'blueprint' ? 'text-blue-100' : 'text-gray-700'}`}>
                            "The big shift is from wanting to 'be right' to wanting to 'get it right.'"
                        </p>
                        <p className={`text-sm ${theme.id === 'blueprint' ? 'text-blue-400' : 'text-gray-500'}`}>— Brené Brown, quoted in "The AI Expert in the Room"</p>
                    </div>
                    <p className={theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'}>
                        I believe in learning publicly, admitting what I don't know, and building real capability instead of performing expertise. The work speaks louder than the posturing.
                    </p>
                </div>
            </BrutalCard>

            {/* Skills */}
            <div className="mb-12">
                <h2 className={`text-3xl font-black mb-6 border-b-4 pb-2 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'}`}>Skills & Tools</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <BrutalCard theme={theme} className="p-6">
                        <h3 className="text-xl font-black mb-3">Research Methods</h3>
                        <div className="flex flex-wrap gap-2">
                            {skills.research.map((skill, index) => (
                                <span key={index} className={`${theme.border} ${theme.colors.card} px-3 py-1 text-sm font-bold ${theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'}`}>
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </BrutalCard>

                    <BrutalCard theme={theme} className="p-6">
                        <h3 className="text-xl font-black mb-3">Artificial Intelligence</h3>
                        <div className="flex flex-wrap gap-2">
                            {skills.ai.map((skill, index) => (
                                <span key={index} className={`${theme.border} ${theme.colors.card} px-3 py-1 text-sm font-bold ${theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'}`}>
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </BrutalCard>

                    <BrutalCard theme={theme} className="p-6">
                        <h3 className="text-xl font-black mb-3">Research Tools</h3>
                        <div className="flex flex-wrap gap-2">
                            {skills.tools.map((skill, index) => (
                                <span key={index} className={`${theme.border} ${theme.colors.card} px-3 py-1 text-sm font-bold ${theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'}`}>
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </BrutalCard>

                    <BrutalCard theme={theme} className="p-6">
                        <h3 className="text-xl font-black mb-3">Technical</h3>
                        <div className="flex flex-wrap gap-2">
                            {skills.technical.map((skill, index) => (
                                <span key={index} className={`${theme.border} ${theme.colors.card} px-3 py-1 text-sm font-bold ${theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'}`}>
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </BrutalCard>
                </div>
            </div>

            {/* Education & Certifications */}
            <div className="mb-12">
                <h2 className={`text-3xl font-black mb-6 border-b-4 pb-2 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'}`}>Education & Certifications</h2>
                <BrutalCard theme={theme} className="p-6">
                    <div className="space-y-4">
                        {certifications.map((cert, index) => (
                            <div key={index} className={`flex items-start gap-4 pb-4 ${index !== certifications.length - 1 ? 'border-b-2' : ''} ${theme.id === 'blueprint' ? 'border-blue-800' : 'border-gray-200'}`}>
                                <Award className={`mt-1 flex-shrink-0 ${theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'}`} size={24} />
                                <div className="flex-grow">
                                    <h3 className="font-black text-lg">{cert.name}</h3>
                                    <p className={`font-bold ${theme.id === 'blueprint' ? 'text-blue-300' : 'text-gray-600'}`}>{cert.org}</p>
                                </div>
                                <span className={`text-sm font-bold ${theme.id === 'blueprint' ? 'text-blue-400' : 'text-gray-500'}`}>{cert.year}</span>
                            </div>
                        ))}
                    </div>
                </BrutalCard>
            </div>

            {/* Previous Experience Highlight */}
            <BrutalCard theme={theme} className="mb-12 p-6">
                <h3 className="text-xl font-black mb-3">Previous Experience</h3>
                <div className={`space-y-3 ${theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'}`}>
                    <div>
                        <p className="font-bold">Lead UX Researcher, Charles Schwab</p>
                        <p className="text-sm">2020-2022 | Austin, TX</p>
                        <p className="mt-2">Led comprehensive usability evaluations on key account types. Utilized content evaluation methods that improved user understanding and accelerated content-first design by 10%. Identified user guides and pain points for enhanced client verification, resulting in +90% fraud prevention rate and $26M quarterly cost avoidance.</p>
                    </div>
                    <div>
                        <p className="font-bold">Customer Experience Manager, HEB</p>
                        <p className="text-sm">2017-2020 | Austin, TX</p>
                        <p className="mt-2">Managed customer experience initiatives and fostered knowledge transfer across the organization.</p>
                    </div>
                </div>
            </BrutalCard>

            {/* Call to Action */}
            <div className="flex flex-wrap gap-4 justify-center">
                <BrutalButton theme={theme} color={theme.colors.primary} onClick={() => navigate('/lab')}>
                    <Sparkles size={20} /> View Experiments
                </BrutalButton>
                <BrutalButton theme={theme} onClick={() => navigate('/fieldnotes')}>
                    <BookOpen size={20} /> Read Field Notes
                </BrutalButton>
            </div>
        </div>
    );
};

export default About;
