import React, { useState } from 'react';
import { Mail, Linkedin, Send, CheckCircle, AlertCircle } from 'lucide-react';
import SectionTitle from '../../ui/SectionTitle';
import StickyNote from '../../ui/StickyNote';
import TapeButton from '../../ui/TapeButton';

const ContactContent = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: ''
    });
    const [status, setStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setStatus({ type: '', message: '' });

        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    access_key: '3e8f45b6-e931-4476-b671-e25163ebd962',
                    name: formData.name,
                    email: formData.email,
                    subject: formData.subject,
                    message: formData.message,
                    from_name: formData.name,
                    to_email: 'contact@emilioharrison.com'
                }),
            });

            const result = await response.json();

            if (result.success) {
                setStatus({
                    type: 'success',
                    message: "Thanks for reaching out! I'll get back to you soon."
                });
                setFormData({ name: '', email: '', subject: '', message: '' });
            } else {
                throw new Error('Form submission failed');
            }
        } catch {
            setStatus({
                type: 'error',
                message: 'Something went wrong. Please try emailing me directly at contact@emilioharrison.com'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const socialLinks = [
        {
            name: 'LinkedIn',
            url: 'https://www.linkedin.com/in/emilio-harrison/',
            icon: Linkedin,
            description: 'Professional network'
        }
    ];

    const inputClasses = "w-full px-4 py-3 font-medium bg-white border-2 border-black text-ink placeholder-gray-400 focus:outline-none focus:ring-4 focus:ring-mustard shadow-hard-sm transition-shadow";

    return (
        <div className="animate-in fade-in duration-700 relative z-10">
            <SectionTitle>Get in Touch</SectionTitle>

            <div className="mb-12 max-w-3xl pl-4 border-l-4 border-black space-y-4">
                <p className="text-xl text-gray-600">
                    I'm always interested in talking with people who are building things worth building—whether that's a collaboration, a consulting project, a speaking opportunity, or just a conversation about AI tools and UX research.
                </p>
                <p className="text-xl text-gray-600">
                    If you're working on something interesting, or you're curious about testing frameworks, context engineering, or how to avoid shipping AI slop, I'd love to hear from you.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Contact Form */}
                <div className="md:col-span-7">
                    <StickyNote color="bg-white" className="p-8" rotate={-1}>
                        <h2 className="text-2xl font-black mb-6 text-ink">Send a Message</h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block font-bold mb-2 text-ink">
                                    Name *
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    required
                                    className={inputClasses}
                                    placeholder="Your name"
                                />
                            </div>

                            <div>
                                <label htmlFor="email" className="block font-bold mb-2 text-ink">
                                    Email *
                                </label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    required
                                    className={inputClasses}
                                    placeholder="your.email@example.com"
                                />
                            </div>

                            <div>
                                <label htmlFor="subject" className="block font-bold mb-2 text-ink">
                                    Subject *
                                </label>
                                <input
                                    type="text"
                                    id="subject"
                                    name="subject"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    required
                                    className={inputClasses}
                                    placeholder="What's this about?"
                                />
                            </div>

                            <div>
                                <label htmlFor="message" className="block font-bold mb-2 text-ink">
                                    Message *
                                </label>
                                <textarea
                                    id="message"
                                    name="message"
                                    value={formData.message}
                                    onChange={handleChange}
                                    required
                                    rows="6"
                                    className={inputClasses}
                                    placeholder="Tell me what's on your mind..."
                                />
                            </div>

                            {status.message && (
                                <div className={`p-4 border-2 border-black flex items-start gap-3 ${status.type === 'success'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-red-100 text-red-800'
                                    }`}>
                                    {status.type === 'success' ? (
                                        <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                                    )}
                                    <p className="font-medium">{status.message}</p>
                                </div>
                            )}

                            <TapeButton
                                color="bg-coral"
                                type="submit"
                                className="w-full"
                            >
                                {isSubmitting ? (
                                    <>Sending...</>
                                ) : (
                                    <>
                                        <Send size={20} />
                                        Send Message
                                    </>
                                )}
                            </TapeButton>
                        </form>
                    </StickyNote>
                </div>

                {/* Contact Info & Social Links */}
                <div className="md:col-span-5 space-y-8">
                    {/* Direct Contact */}
                    <StickyNote color="bg-teal" className="p-6 text-white" rotate={2}>
                        <div className="flex items-start gap-4 mb-4">
                            <Mail className="text-white" size={28} />
                            <div>
                                <h3 className="text-xl font-black mb-2">Send an email</h3>
                                <a
                                    href="mailto:contact@emilioharrison.com"
                                    className="font-bold hover:underline text-white"
                                >
                                    contact@emilioharrison.com
                                </a>
                                <p className="text-sm mt-2 text-white/80">
                                    I usually respond within a day or two. If it takes longer, I'm probably stuck on a puzzle.
                                </p>
                            </div>
                        </div>
                    </StickyNote>

                    {/* Social Links */}
                    <StickyNote color="bg-mustard" className="p-6" rotate={-1}>
                        <h3 className="text-xl font-black mb-4 text-black">Connect Elsewhere</h3>
                        <div className="space-y-3">
                            {socialLinks.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <a
                                        key={link.name}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-3 p-3 bg-white border-2 border-black hover:bg-gray-50 transition-colors group shadow-hard-sm"
                                    >
                                        <Icon size={24} className="text-black" />
                                        <div className="flex-grow">
                                            <p className="font-bold group-hover:underline text-black">{link.name}</p>
                                            <p className="text-sm text-gray-600">
                                                {link.description}
                                            </p>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    </StickyNote>

                    {/* Quick Note */}
                    <div className="p-4 border-l-4 border-black bg-gray-100">
                        <p className="text-sm italic text-gray-700">
                            Whether you're interested in collaborating, have questions about my work, or just want to chat about UX research and AI—don't hesitate to reach out.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactContent;
