import React from 'react';

const Footer = () => {
    return (
        <footer className="bg-black text-white py-12 px-4 text-center relative z-10 mt-16">
            <div className="font-bold text-2xl tracking-tighter mb-4">EMILIOHARRISON.COM</div>
            <p className="text-gray-500 text-sm">© {new Date().getFullYear()} Emilio Harrison. Built with Astro, React & Tailwind.</p>
        </footer>
    );
};

export default Footer;
