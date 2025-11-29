import React from 'react';
import SectionTitle from '../../ui/SectionTitle';
import Button from '../../ui/Button';
import { BookOpen, Sparkles } from 'lucide-react';
import { useStore } from '@nanostores/react';
import { themeId } from '../../../lib/store';
import { THEMES } from '../../../lib/themes';

const ShopContent = () => {
    const currentThemeId = useStore(themeId);
    const theme = THEMES[currentThemeId];

    return (
        <div className="animate-in fade-in duration-700">
            <SectionTitle theme={theme}>Shop</SectionTitle>

            <div className="max-w-3xl">
                <p className="text-xl md:text-2xl font-medium leading-relaxed mb-8">
                    I'm building tools for UX practitioners—masterclasses, LLM prompts, and a custom AI assistant for UX research and design work.
                </p>
                <p className="text-xl md:text-2xl font-bold mb-12">
                    Not ready yet, but getting close.
                </p>

                <div className="bg-mustard p-8 border-4 border-black shadow-hard mb-12 transform -rotate-1">
                    <h3 className="text-2xl font-black mb-4">Want to know when it launches?</h3>
                    <p className="text-lg font-bold">Join the email list below.</p>
                </div>

                <div>
                    <h3 className="text-xl font-black mb-6 uppercase tracking-wider">In the meantime:</h3>
                    <div className="flex flex-wrap gap-4">
                        <Button href="/fieldnotes" intent="secondary">
                            <BookOpen size={20} /> Read Field Notes
                        </Button>
                        <Button href="/lab" intent="secondary">
                            <Sparkles size={20} /> Explore the Lab
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShopContent;
