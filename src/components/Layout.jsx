import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Menu, X, Grid, Settings2 } from 'lucide-react';
import BrutalButton from './ui/BrutalButton';
import NewsletterSignup from './NewsletterSignup';

const Layout = ({ children, theme, setThemeId }) => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const navItems = [
        { path: '/', label: 'Home' },
        { path: '/about', label: 'About' },
        { path: '/fieldnotes', label: 'Notes' },
        { path: '/lab', label: 'Lab' },
        { path: '/shop', label: 'Shop' },
        { path: '/contact', label: 'Contact' }
    ];

    const isActive = (path) => {
        if (path === '/' && location.pathname !== '/') return false;
        return location.pathname.startsWith(path);
    };

    return (
        <div className={`min-h-screen ${theme.colors.bg} ${theme.colors.text} ${theme.font} transition-colors duration-500 overflow-hidden relative`}>

            {theme.id === 'blueprint' && (
                <div className="fixed inset-0 pointer-events-none opacity-10 z-0" style={{ backgroundImage: 'linear-gradient(#4db8ff 1px, transparent 1px), linear-gradient(90deg, #4db8ff 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            )}

            <header className={`sticky top-0 z-50 ${theme.colors.card} border-b-4 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'}`}>
                <div className="max-w-6xl mx-auto px-4 md:px-8 h-20 flex justify-between items-center relative z-10">
                    <div onClick={() => navigate('/')} className={`text-2xl font-black tracking-tighter cursor-pointer hover:${theme.colors.highlight} transition-colors`}>EMILIO<span className={theme.colors.highlight}>.</span>HARRISON</div>
                    <nav className="hidden md:flex gap-6 items-center">
                        {navItems.map(item => (
                            <button key={item.path} onClick={() => navigate(item.path)} className={`font-bold uppercase tracking-wide text-sm py-2 border-b-2 ${isActive(item.path) ? (theme.id === 'blueprint' ? 'border-blue-200 text-blue-100' : 'border-black text-black') : 'border-transparent opacity-60 hover:opacity-100'} transition-all`}>{item.label}</button>
                        ))}
                        <button onClick={() => setThemeId(theme.id === 'default' ? 'blueprint' : 'default')} className={`ml-4 p-2 ${theme.border} rounded-full hover:opacity-80`} title="Toggle Blueprint Mode">
                            {theme.id === 'default' ? <Grid size={20} /> : <Settings2 size={20} />}
                        </button>
                    </nav>
                    <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}</button>
                </div>
                {mobileMenuOpen && (
                    <div className={`md:hidden border-t-2 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'} ${theme.colors.card} absolute w-full shadow-xl`}>
                        {navItems.map(item => (
                            <button key={item.path} onClick={() => { navigate(item.path); setMobileMenuOpen(false); }} className={`block w-full text-left px-8 py-4 font-bold uppercase border-b ${theme.id === 'blueprint' ? 'border-blue-800' : 'border-gray-100'}`}>{item.label}</button>
                        ))}
                        <button onClick={() => setThemeId(theme.id === 'default' ? 'blueprint' : 'default')} className={`block w-full text-left px-8 py-4 font-bold uppercase border-b ${theme.id === 'blueprint' ? 'border-blue-800' : 'border-gray-100'}`}>
                            {theme.id === 'default' ? 'Switch to Blueprint Mode' : 'Switch to Paper Mode'}
                        </button>
                    </div>
                )}
            </header>

            <main className="max-w-6xl mx-auto px-4 md:px-8 py-12 min-h-[60vh] relative z-10">
                {children}
            </main>

            <NewsletterSignup theme={theme} />
            <footer className="bg-black text-white py-12 px-4 text-center relative z-10"><div className="font-bold text-2xl tracking-tighter mb-4">EMILIOHARRISON.COM</div><p className="text-gray-500 text-sm">© {new Date().getFullYear()} Emilio Harrison. Built with React & Tailwind.</p></footer>
        </div>
    );
};

export default Layout;
