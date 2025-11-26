import React, { useState } from 'react';
import { Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import BrutalButton from './ui/BrutalButton';

const NewsletterSignup = ({ theme }) => {
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // idle, loading, success, error
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');
        setMessage('');

        try {
            const response = await fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    access_key: '3e8f45b6-e931-4476-b671-e25163ebd962',
                    email: email,
                    subject: 'New Newsletter Subscriber',
                    message: `New subscriber: ${email}`,
                    from_name: 'Newsletter Signup',
                }),
            });

            const result = await response.json();

            if (result.success) {
                setStatus('success');
                setMessage("You're on the list! Talk soon.");
                setEmail('');
            } else {
                throw new Error('Submission failed');
            }
        } catch (error) {
            setStatus('error');
            setMessage('Something went wrong. Please try again.');
        }
    };

    return (
        <div className={`${theme.colors.dark} text-white p-8 md:p-12 border-t-4 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'} relative z-10`}>
            <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="md:w-1/2">
                    <h3 className={`text-2xl font-black mb-2 ${theme.id === 'blueprint' ? 'text-[#ffd700]' : 'text-[#e9c46a]'}`}>
                        JOIN THE MAILING LIST
                    </h3>
                    <p className="text-gray-200">
                        Get weekly thoughts on UX research, code, and creative experiments.
                    </p>
                </div>

                <div className="md:w-1/2 w-full">
                    {status === 'success' ? (
                        <div className={`p-4 border-2 ${theme.id === 'blueprint' ? 'border-green-400 bg-green-900/50 text-green-100' : 'border-green-500 bg-green-800 text-white'} flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2`}>
                            <CheckCircle size={24} className="flex-shrink-0" />
                            <p className="font-bold text-lg">{message}</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                            <div className="flex gap-4">
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    disabled={status === 'loading'}
                                    required
                                    className={`flex-grow p-3 border-2 ${theme.id === 'blueprint' ? 'border-blue-200 bg-blue-900 text-white placeholder-blue-300' : 'border-black text-black'} font-medium focus:outline-none disabled:opacity-50`}
                                />
                                <BrutalButton
                                    theme={theme}
                                    color={theme.colors.secondary}
                                    className="text-white min-w-[100px] justify-center"
                                    type="submit"
                                    disabled={status === 'loading'}
                                >
                                    {status === 'loading' ? <Loader2 size={20} className="animate-spin" /> : 'Join'}
                                </BrutalButton>
                            </div>
                            {status === 'error' && (
                                <div className="flex items-center gap-2 text-red-300 text-sm font-bold animate-in fade-in">
                                    <AlertCircle size={16} />
                                    <span>{message}</span>
                                </div>
                            )}
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewsletterSignup;
