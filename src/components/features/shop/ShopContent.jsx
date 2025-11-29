import React from 'react';
import SectionTitle from '../../ui/SectionTitle';
import Button from '../../ui/Button';
import ContentBlock from '../../ui/ContentBlock';
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
                <ContentBlock color="bg-white" pin rotate={1} padding="p-8" className="mb-12">
                    <p className="text-xl font-bold mb-6">
                        I'm building a suite of AI tools designed specifically for UX researchers.
                    </p>
                    <p className="text-lg">
                        Not ready yet, but getting close.
                    </p>
                </ContentBlock>

                <ContentBlock
                    color="bg-white"
                    padding="p-8"
                    className="mb-12 transform -rotate-1"
                    pin
                >
                    <h3 className="text-2xl font-black mb-4">Want to know when it launches?</h3>
                    <p className="text-lg font-bold">Join the email list below.</p>
                </ContentBlock>

                <div>
                    <h3 className="text-xl font-black mb-6 uppercase tracking-wider">In the meantime:</h3>
                    <div className="flex flex-wrap gap-4">
                        <Button href="/fieldnotes" intent="secondary">
                            <BookOpen size={20} /> Read Field Notes
                        </Button>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShopContent;
