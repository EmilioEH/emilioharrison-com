import React, { useState } from 'react';
import { Menu, X, Grid, Settings2 } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { themeId } from '../../lib/store';
import { THEMES } from '../../lib/themes';

const Navbar = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const currentThemeId = useStore(themeId);
    const theme = THEMES[currentThemeId];

    const navItems = [
        { path: '/', label: 'Home' },
        { path: '/about', label: 'About' },
        { path: '/fieldnotes', label: 'Notes' },
        { path: '/lab', label: 'Lab' },
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

    const toggleTheme = () => {
        themeId.set(currentThemeId === 'default' ? 'blueprint' : 'default');
    };

    return (
        <header className={`sticky top-0 z-50 ${theme.colors.card} border-b-4 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'}`}>
            <div className="max-w-6xl mx-auto px-4 md:px-8 h-20 flex justify-between items-center relative z-10">
                <a href="/" className={`text-2xl font-black tracking-tighter cursor-pointer hover:${theme.colors.highlight} transition-colors no-underline ${theme.colors.text}`}>EMILIO<span className={theme.colors.highlight}>.</span>HARRISON</a>
                <nav className="hidden md:flex gap-6 items-center">
                    {navItems.map(item => (
                        <a key={item.path} href={item.path} className={`font-bold uppercase tracking-wide text-sm py-2 border-b-2 ${isActive(item.path) ? (theme.id === 'blueprint' ? 'border-blue-200 text-blue-100' : 'border-black text-black') : 'border-transparent opacity-60 hover:opacity-100'} transition-all no-underline ${theme.colors.text}`}>{item.label}</a>
                    ))}
                    <button onClick={toggleTheme} className={`ml-4 p-2 ${theme.border} rounded-full hover:opacity-80 ${theme.colors.text}`} title="Toggle Blueprint Mode">
                        {theme.id === 'default' ? <Grid size={20} /> : <Settings2 size={20} />}
                    </button>
                </nav>
                <button className={`md:hidden ${theme.colors.text}`} onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? <X size={28} /> : <Menu size={28} />}</button>
            </div>
            {mobileMenuOpen && (
                <div className={`md:hidden border-t-2 ${theme.id === 'blueprint' ? 'border-blue-200' : 'border-black'} ${theme.colors.card} absolute w-full shadow-xl`}>
                    {navItems.map(item => (
                        <a key={item.path} href={item.path} onClick={() => setMobileMenuOpen(false)} className={`block w-full text-left px-8 py-4 font-bold uppercase border-b ${theme.id === 'blueprint' ? 'border-blue-800 text-blue-100' : 'border-gray-100 text-black'} no-underline`}>{item.label}</a>
                    ))}
                    <button onClick={toggleTheme} className={`block w-full text-left px-8 py-4 font-bold uppercase border-b ${theme.id === 'blueprint' ? 'border-blue-800 text-blue-100' : 'border-gray-100 text-black'}`}>
                        {theme.id === 'default' ? 'Switch to Blueprint Mode' : 'Switch to Paper Mode'}
                    </button>
                </div>
            )}
        </header>
    );
};

export default Navbar;
