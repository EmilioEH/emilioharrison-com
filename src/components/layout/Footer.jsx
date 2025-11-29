import React from 'react';
import Button from '../ui/Button';

const Footer = () => {
    return (
        <footer className="bg-black text-white py-16 px-4 text-center relative z-10 mt-16">
            <div className="max-w-2xl mx-auto mb-16">
                <h3 className="font-black text-3xl mb-2">Join the email list</h3>
                <p className="text-gray-400 mb-6">Get updates</p>
                <form className="flex gap-2 max-w-md mx-auto" onSubmit={(e) => e.preventDefault()}>
                    <input
                        type="email"
                        placeholder="email address"
                        className="flex-1 bg-white text-black px-4 py-3 font-bold border-2 border-transparent focus:border-mustard focus:outline-none"
                    />
                    <Button
                        type="submit"
                        intent="secondary"
                    >
                        Submit
                    </Button>
                </form>
            </div>

            <div className="mb-12">
                <p className="text-gray-500 text-sm max-w-lg mx-auto leading-relaxed">
                    Built with AI assistance. Writing, code, and design refined through testing and iteration.
                    <a href="#" className="block mt-2 text-gray-400 hover:text-white underline decoration-gray-700 underline-offset-4 hover:decoration-white transition-all">
                        Curious about my process? →
                    </a>
                </p>
            </div>

            <div className="text-gray-600 text-sm font-bold">
                © 2025 Emilio Harrison
            </div>
        </footer>
    );
};

export default Footer;
