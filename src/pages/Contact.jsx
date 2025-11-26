import React, { useState } from 'react';
import { Mail, Linkedin, Music, Send, CheckCircle, AlertCircle } from 'lucide-react';
import SectionTitle from '../components/ui/SectionTitle';
import BrutalCard from '../components/ui/BrutalCard';
import BrutalButton from '../components/ui/BrutalButton';

const Contact = ({ theme }) => {
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
        } catch (error) {
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
        },
        {
            name: 'Music',
            url: 'https://youtu.be/Sg3xcHx-RRI?si=WaVnEWyDgUySVlug',
            icon: Music,
            description: 'Personal creative work'
        }
    ];

    const inputClasses = `w-full px-4 py-3 font-medium ${theme.border} ${theme.id === 'blueprint'
        ? 'bg-blue-950 border-blue-200 text-blue-100 placeholder-blue-400'
        : 'bg-white border-black text-gray-900 placeholder-gray-400'
        } focus:outline-none focus:ring-4 ${theme.id === 'blueprint' ? 'focus:ring-blue-400' : 'focus:ring-yellow-200'
        }`;

    return (
        <div className="animate-in fade-in duration-700">
            <SectionTitle theme={theme}>Get in Touch</SectionTitle>

            <p className={`text-xl mb-12 max-w-2xl ${theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-600'}`}>
                Have a question about UX research, AI tools, or just want to connect? I'd love to hear from you.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Contact Form */}
                <div className="md:col-span-7">
                    <BrutalCard theme={theme} className="p-8">
                        <h2 className="text-2xl font-black mb-6">Send a Message</h2>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block font-bold mb-2">
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
                                <label htmlFor="email" className="block font-bold mb-2">
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
                                <label htmlFor="subject" className="block font-bold mb-2">
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
                                <label htmlFor="message" className="block font-bold mb-2">
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
                                <div className={`p-4 ${theme.border} flex items-start gap-3 ${status.type === 'success'
                                    ? theme.id === 'blueprint' ? 'bg-green-950 border-green-400 text-green-100' : 'bg-green-100 border-green-600 text-green-800'
                                    : theme.id === 'blueprint' ? 'bg-red-950 border-red-400 text-red-100' : 'bg-red-100 border-red-600 text-red-800'
                                    }`}>
                                    {status.type === 'success' ? (
                                        <CheckCircle size={20} className="flex-shrink-0 mt-0.5" />
                                    ) : (
                                        <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
                                    )}
                                    <p className="font-medium">{status.message}</p>
                                </div>
                            )}

                            <BrutalButton
                                theme={theme}
                                color={theme.colors.primary}
                                type="submit"
                                disabled={isSubmitting}
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
                            </BrutalButton>
                        </form>
                    </BrutalCard>
                </div>

                {/* Contact Info & Social Links */}
                <div className="md:col-span-5 space-y-6">
                    {/* Direct Contact */}
                    <BrutalCard theme={theme} className="p-6">
                        <div className="flex items-start gap-4 mb-4">
                            <Mail className={theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'} size={28} />
                            <div>
                                <h3 className="text-xl font-black mb-2">Direct Email</h3>
                                <a
                                    href="mailto:contact@emilioharrison.com"
                                    className={`font-bold hover:underline ${theme.id === 'blueprint' ? 'text-blue-300' : 'text-gray-700'
                                        }`}
                                >
                                    contact@emilioharrison.com
                                </a>
                                <p className={`text-sm mt-2 ${theme.id === 'blueprint' ? 'text-blue-400' : 'text-gray-500'}`}>
                                    I typically respond within 24-48 hours.
                                </p>
                            </div>
                        </div>
                    </BrutalCard>

                    {/* Social Links */}
                    <BrutalCard theme={theme} className="p-6">
                        <h3 className="text-xl font-black mb-4">Connect Elsewhere</h3>
                        <div className="space-y-3">
                            {socialLinks.map((link) => {
                                const Icon = link.icon;
                                return (
                                    <a
                                        key={link.name}
                                        href={link.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={`flex items-center gap-3 p-3 ${theme.border} ${theme.id === 'blueprint'
                                            ? 'bg-blue-950 border-blue-300 hover:bg-blue-900'
                                            : 'bg-gray-50 border-black hover:bg-yellow-100'
                                            } transition-colors group`}
                                    >
                                        <Icon size={24} className={theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'} />
                                        <div className="flex-grow">
                                            <p className="font-bold group-hover:underline">{link.name}</p>
                                            <p className={`text-sm ${theme.id === 'blueprint' ? 'text-blue-400' : 'text-gray-500'}`}>
                                                {link.description}
                                            </p>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    </BrutalCard>

                    {/* Quick Note */}
                    <div className={`p-4 border-l-4 ${theme.id === 'blueprint' ? 'border-blue-200 bg-blue-950/30' : 'border-black bg-gray-100'}`}>
                        <p className={`text-sm italic ${theme.id === 'blueprint' ? 'text-blue-200' : 'text-gray-700'}`}>
                            Whether you're interested in collaborating, have questions about my work, or just want to chat about UX research and AI—don't hesitate to reach out.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Contact;
