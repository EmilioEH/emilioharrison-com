import React, { useState } from 'react';
import { Menu, X, Grid } from 'lucide-react';
import { useTheme } from '../../hooks/useTheme';
import { Label } from '../ui/Typography';

const Navbar = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const theme = useTheme();

    const navItems = [
        { path: '/', label: 'Home' },
        { path: '/about', label: 'About' },
        { path: '/fieldnotes', label: 'Notes' },
        { path: '/shop', label: 'Shop' },
        { path: '/contact', label: 'Contact' }
    ];

    // Simple check for active link since we don't have useLocation
    // In a real Astro app, we might pass the current path as a prop
    const isActive = (path) => {
        if (typeof window === 'undefined') return false;
        if (path === '/' && window.location.pathname !== '/') return false;
        return window.location.pathname.startsWith(path);
    };



    return (
        <header className={`sticky top-0 z-50 ${theme.colors.card} border-b-4 border-black`}>
            <div className="max-w-6xl mx-auto px-4 md:px-8 h-20 flex justify-between items-center relative z-10">
                <a href="/" className={`text-2xl font-display font-black tracking-tighter cursor-pointer hover:${theme.colors.highlight} transition-colors no-underline ${theme.colors.text}`}>EMILIO<span className={theme.colors.highlight}>.</span>HARRISON</a>
                <nav className="hidden md:flex gap-6 items-center">
                    {navItems.map(item => (
                        <a key={item.path} href={item.path} className={`border-b-2 ${isActive(item.path) ? 'border-black text-black' : 'border-transparent opacity-60 hover:opacity-100'} transition-all no-underline ${theme.colors.text}`}>
                            <Label variant="eyebrow" className="cursor-pointer">{item.label}</Label>
                        </a>
                    ))}
                </nav>
                <button className={`md:hidden ${theme.colors.text}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}</button>
            </div>
            {mobileMenuOpen && (
                <div className={`md:hidden border-t-2 border-black ${theme.colors.card} absolute w-full shadow-xl`}>
                    {navItems.map(item => (
                        <a key={item.path} href={item.path} onClick={() => setMobileMenuOpen(false)} className={`block w-full text-left px-8 py-4 border-b border-gray-100 text-black no-underline`}>
                            <Label variant="eyebrow">{item.label}</Label>
                        </a>
                    ))}
                </div>
            )}
        </header>
    );
};

export default Navbar;
